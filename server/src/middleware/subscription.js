import { getRestaurantSubscription } from '../lib/subscription.js';

/**
 * After requireAuth: block staff/owner if their restaurant subscription is inactive.
 * Super admins always pass.
 */
export async function requireActiveStaffSubscription(req, res, next) {
  if (req.profile?.role === 'super_admin') return next();

  const rid = req.profile?.restaurant_id;
  if (!rid) return next();

  const { active } = await getRestaurantSubscription(rid);
  if (!active) {
    return res.status(402).json({
      error: 'Your venue subscription is inactive or the trial has ended. Please contact Himbyte support.',
      code: 'SUBSCRIPTION_INACTIVE',
    });
  }
  next();
}
