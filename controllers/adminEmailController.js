import { Notification } from "../models/index.js";
import { EMAIL_CONFIG } from "../jobs/emailWorker.js";

const STATUSES = ["QUEUED", "SENDING", "SENT", "FAILED", "NOT_REQUIRED"];
const DAY = 24 * 60 * 60 * 1000;

// GET /api/admin/email/status
export async function emailStatus(req, res, next) {
  try {
    const now = Date.now();

    const [counts, sentLast24h, oldestQueued, recentFailures] = await Promise.all([
      Promise.all(STATUSES.map((s) => Notification.countDocuments({ emailStatus: s }))),
      Notification.countDocuments({ emailSentAt: { $gte: new Date(now - DAY) } }),
      Notification.findOne({ emailStatus: "QUEUED" }).sort({ createdAt: 1 }).select("createdAt").lean(),
      Notification.find({ emailStatus: "FAILED" })
        .sort({ updatedAt: -1 })
        .limit(20)
        .select("title emailError emailAttempts createdAt university")
        .populate("university", "name")
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        counts: Object.fromEntries(STATUSES.map((s, i) => [s, counts[i]])),
        sentLast24h,
        dailyLimit: EMAIL_CONFIG.dailyLimit,
        oldestQueuedAt: oldestQueued?.createdAt ?? null,
        recentFailures,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/admin/email/retry-failed  (for example after fixing the mail settings)
export async function retryFailed(req, res, next) {
  try {
    // Only emails still young enough to be worth sending
    const result = await Notification.updateMany(
      { emailStatus: "FAILED", createdAt: { $gte: new Date(Date.now() - EMAIL_CONFIG.maxAgeMs) } },
      { $set: { emailStatus: "QUEUED", emailAttempts: 0 }, $unset: { emailError: 1, emailNextAttemptAt: 1 } }
    );

    return res.status(200).json({
      success: true,
      message: "Failed emails from the last 24 hours were queued again.",
      data: { requeued: result.modifiedCount },
    });
  } catch (error) {
    next(error);
  }
}
