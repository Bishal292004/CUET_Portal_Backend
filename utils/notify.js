import { Update, University, Subscription, User, Notification } from "../models/index.js";

// Decides what notification each student gets. Pure function: no database access.
export function planNotifications({ update, university, users }) {
  return users.map((u) => ({
    user: u._id,
    university: university._id,
    update: update._id,
    title: update.title,
    message: update.summary,
    link: `/universities/${university._id}`,
    // Emails are only for students who want them. Sending itself comes later.
    emailStatus: u.emailNotifications && u.emailVerified ? "QUEUED" : "NOT_REQUIRED",
  }));
}

// A retry can hit the unique (user, update) index for students already notified: that is fine
const onlyDuplicates = (e) =>
  e?.code === 11000 ||
  (Array.isArray(e?.writeErrors) &&
    e.writeErrors.length > 0 &&
    e.writeErrors.every((w) => (w.code ?? w.err?.code) === 11000));

// Creates one in-app notification per matching subscriber. Safe to run twice for the same update.
export async function notifySubscribers(update) {
  const university = await University.findById(update.university).select("name");
  if (!university) throw new Error("University for this update no longer exists.");

  const subscriptions = await Subscription.find({ university: update.university })
    .select("user")
    .lean();

  // Students who follow the university; for a course-specific update, only those
  // who are interested in that course
  const filter = { _id: { $in: subscriptions.map((s) => s.user) }, isActive: true };
  if (update.course) filter.interestedCourses = update.course;

  const users = await User.find(filter).select("emailNotifications emailVerified").lean();
  const docs = planNotifications({ update, university, users });

  if (docs.length) {
    try {
      await Notification.insertMany(docs, { ordered: false });
    } catch (error) {
      if (!onlyDuplicates(error)) throw error;
    }
  }

  await Update.updateOne({ _id: update._id }, { $set: { notificationsQueued: true } });
  return docs.length;
}
