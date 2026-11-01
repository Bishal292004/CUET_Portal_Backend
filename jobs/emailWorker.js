import { Notification, User, University, Update } from "../models/index.js";
import { sendEmail } from "../utils/email.js";
import { buildNotificationEmail } from "../utils/notificationEmail.js";

const HOUR = 60 * 60 * 1000;

export const EMAIL_CONFIG = {
  intervalMs: Number(process.env.EMAIL_WORKER_INTERVAL_MS) || 15 * 1000, // how often to look for work
  batchSize: 20, // emails per round
  sendDelayMs: Number(process.env.EMAIL_SEND_DELAY_MS) || 500, // pause between emails
  dailyLimit: Number(process.env.EMAIL_DAILY_LIMIT) || 400, // stays under typical Gmail limits
  maxAttempts: 3,
  retryDelaysMs: [2 * 60 * 1000, 10 * 60 * 1000], // wait before the 2nd and 3rd try
  stuckAfterMs: 5 * 60 * 1000, // a SENDING email this old was probably lost in a crash
  maxAgeMs: 24 * HOUR, // an announcement email is useless a day later
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The mail service itself is unavailable or rejects our login: not the recipient's fault
const PROVIDER_ERRORS = ["EAUTH", "ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS", "ECONNREFUSED"];
const isProviderProblem = (e) => PROVIDER_ERRORS.includes(e?.code) || e?.responseCode === 421;

// The address itself was refused (does not exist, mailbox full, blocked...)
const isPermanent = (e) => e?.code === "EENVELOPE" || (e?.responseCode >= 550 && e?.responseCode <= 559);

const shortError = (e) => String(e?.message ?? e).slice(0, 300);

async function recoverStuck(now) {
  await Notification.updateMany(
    { emailStatus: "SENDING", emailClaimedAt: { $lte: new Date(now - EMAIL_CONFIG.stuckAfterMs) } },
    { $set: { emailStatus: "QUEUED" } }
  );
}

async function expireOld(now) {
  await Notification.updateMany(
    { emailStatus: "QUEUED", createdAt: { $lt: new Date(now - EMAIL_CONFIG.maxAgeMs) } },
    { $set: { emailStatus: "FAILED", emailError: "Expired before it could be sent." } }
  );
}

// Takes the oldest email that is ready. One database operation, so two workers can never take the same one.
function claimNext(now) {
  return Notification.findOneAndUpdate(
    {
      emailStatus: "QUEUED",
      createdAt: { $gte: new Date(now - EMAIL_CONFIG.maxAgeMs) },
      $or: [{ emailNextAttemptAt: { $exists: false } }, { emailNextAttemptAt: { $lte: new Date(now) } }],
    },
    { $set: { emailStatus: "SENDING", emailClaimedAt: new Date(now) }, $inc: { emailAttempts: 1 } },
    { sort: { createdAt: 1 }, returnDocument: "after" }
  );
}

async function markDone(id, fields, alsoRemove = {}) {
  await Notification.updateOne(
    { _id: id },
    { $set: fields, $unset: { emailClaimedAt: 1, emailNextAttemptAt: 1, ...alsoRemove } }
  );
}

async function handleFailure(n, error, now) {
  if (isProviderProblem(error)) {
    // Give the email back untouched and stop this round: it will be tried again later
    await Notification.updateOne(
      { _id: n._id },
      {
        $set: { emailStatus: "QUEUED", emailNextAttemptAt: new Date(now + 60 * 1000), emailError: shortError(error) },
        $inc: { emailAttempts: -1 },
        $unset: { emailClaimedAt: 1 },
      }
    );
    return "provider";
  }

  if (isPermanent(error) || n.emailAttempts >= EMAIL_CONFIG.maxAttempts) {
    await markDone(n._id, { emailStatus: "FAILED", emailError: shortError(error) });
    return "failed";
  }

  const wait = EMAIL_CONFIG.retryDelaysMs[Math.min(n.emailAttempts - 1, EMAIL_CONFIG.retryDelaysMs.length - 1)];
  await Notification.updateOne(
    { _id: n._id },
    {
      $set: { emailStatus: "QUEUED", emailNextAttemptAt: new Date(now + wait), emailError: shortError(error) },
      $unset: { emailClaimedAt: 1 },
    }
  );
  return "retry";
}

async function deliver(n, now) {
  const [user, university, update] = await Promise.all([
    User.findById(n.user).select("name email emailNotifications emailVerified isActive").lean(),
    University.findById(n.university).select("name").lean(),
    n.update ? Update.findById(n.update).select("sourceUrl").lean() : null,
  ]);

  // They may have switched emails off, or been deactivated, since this was queued
  if (!user || !user.isActive || !user.emailNotifications || !user.emailVerified || !university) {
    await markDone(n._id, { emailStatus: "NOT_REQUIRED" });
    return "skipped";
  }

  const message = buildNotificationEmail({
    user,
    university,
    notification: n,
    update,
    siteUrl: process.env.FRONTEND_ORIGIN,
  });

  try {
    await sendEmail({ to: user.email, ...message });
  } catch (error) {
    return handleFailure(n, error, now);
  }

  await markDone(n._id, { emailStatus: "SENT", emailSentAt: new Date() }, { emailError: 1 });
  return "sent";
}

// One round of work. Exported so it can be tested and run by hand.
export async function runEmailBatch(now = Date.now()) {
  const summary = { sent: 0, failed: 0, retry: 0, skipped: 0, stopped: null };

  await recoverStuck(now);
  await expireOld(now);

  const sentToday = await Notification.countDocuments({ emailSentAt: { $gte: new Date(now - 24 * HOUR) } });
  let budget = EMAIL_CONFIG.dailyLimit - sentToday;

  for (let i = 0; i < EMAIL_CONFIG.batchSize; i++) {
    if (budget <= 0) {
      summary.stopped = "daily limit reached";
      break;
    }

    const n = await claimNext(now);
    if (!n) break;

    const outcome = await deliver(n, now);
    if (outcome === "provider") {
      summary.stopped = "mail service unavailable";
      break;
    }

    summary[outcome] += 1;
    if (outcome === "sent") {
      budget -= 1;
      await sleep(EMAIL_CONFIG.sendDelayMs);
    }
  }

  return summary;
}

let timer = null;
let running = false;

async function tick() {
  if (running) return; // never two rounds at once
  running = true;
  try {
    const s = await runEmailBatch();
    if (s.sent || s.failed || s.retry || s.skipped || s.stopped) {
      console.log(
        `Email worker: ${s.sent} sent, ${s.retry} to retry, ${s.failed} failed, ${s.skipped} skipped` +
          (s.stopped ? ` (stopped: ${s.stopped})` : "")
      );
    }
  } catch (error) {
    console.error("Email worker error:", error.message);
  } finally {
    running = false;
  }
}

export function startEmailWorker() {
  if (process.env.EMAIL_WORKER_ENABLED === "false") {
    console.log("Email worker is switched off (EMAIL_WORKER_ENABLED=false).");
    return;
  }
  if (timer) return;
  timer = setInterval(tick, EMAIL_CONFIG.intervalMs);
  timer.unref?.();
  setTimeout(tick, 2000).unref?.(); // first round shortly after start
  console.log(`Email worker started (checks every ${EMAIL_CONFIG.intervalMs / 1000}s).`);
}

export async function stopEmailWorker() {
  clearInterval(timer);
  timer = null;
  while (running) await sleep(100); // let the current email finish
}
