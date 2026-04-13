import { supabase } from '../supabaseClient.js';

/**
 * @typedef {{ subscription_status?: string, trial_ends_at?: string | null }} RestaurantSubRow
 */

export function isSubscriptionActive(row) {
  if (!row) return false;
  const status = String(row.subscription_status || 'trial').toLowerCase();
  const now = Date.now();

  if (status === 'active') return true;
  if (status === 'trial') {
    if (!row.trial_ends_at) return true;
    return new Date(row.trial_ends_at).getTime() > now;
  }
  return false;
}

/**
 * Load subscription fields for a restaurant. If columns are missing, returns active (fail-open).
 */
export async function getRestaurantSubscription(restaurantId) {
  if (!restaurantId) return { active: true, row: null };

  const { data, error } = await supabase
    .from('restaurants')
    .select('id, subscription_status, trial_ends_at')
    .eq('id', restaurantId)
    .maybeSingle();

  if (error) {
    console.warn('[subscription] fetch failed:', error.message);
    return { active: true, row: null };
  }

  const active = isSubscriptionActive(data);
  return { active, row: data };
}

export async function assertGuestRestaurantActive(restaurantId) {
  const { active } = await getRestaurantSubscription(restaurantId);
  if (!active) {
    const err = new Error('This venue is temporarily unavailable. Please contact the restaurant.');
    err.code = 'SUBSCRIPTION_INACTIVE';
    err.status = 403;
    throw err;
  }
}
