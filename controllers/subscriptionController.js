import { Subscription, University } from "../models/index.js";

const MAX_FOLLOWED = 50;
const PUBLIC_UNIVERSITY = { verified: true, isArchived: false };

export async function listSubscriptions(req, res, next) {
  try {
    const subscriptions = await Subscription.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: "university",
        match: PUBLIC_UNIVERSITY, // universities that were hidden since are dropped
        select: "name shortName slug state city admissionStatus admissionUrl lastVerifiedAt",
      })
      .lean();

    const following = subscriptions
      .filter((s) => s.university)
      .map((s) => ({ followedAt: s.createdAt, university: s.university }));

    return res.status(200).json({ success: true, data: { following } });
  } catch (error) {
    next(error);
  }
}

export async function subscribe(req, res, next) {
  try {
    const { universityId } = req.body;
    const user = req.user._id;

    const university = await University.exists({ _id: universityId, ...PUBLIC_UNIVERSITY });
    if (!university) {
      return res.status(404).json({ success: false, message: "University not found." });
    }

    const alreadyFollowing = () =>
      res.status(200).json({ success: true, message: "You already follow this university." });

    if (await Subscription.exists({ user, university: universityId })) return alreadyFollowing();

    if ((await Subscription.countDocuments({ user })) >= MAX_FOLLOWED) {
      return res.status(400).json({
        success: false,
        message: `You can follow up to ${MAX_FOLLOWED} universities. Unfollow one first.`,
      });
    }

    try {
      await Subscription.create({ user, university: universityId });
    } catch (error) {
      if (error.code === 11000) return alreadyFollowing(); // two taps at once
      throw error;
    }

    return res.status(201).json({ success: true, message: "You are now following this university." });
  } catch (error) {
    next(error);
  }
}

export async function unsubscribe(req, res, next) {
  try {
    await Subscription.deleteOne({ user: req.user._id, university: req.params.universityId });
    return res.status(200).json({ success: true, message: "You no longer follow this university." });
  } catch (error) {
    next(error);
  }
}
