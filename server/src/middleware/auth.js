import { createClient } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient.js';

/**
 * Create a Supabase client scoped to a specific user's JWT.
 * Needed when the server uses the anon key so RLS resolves auth.uid() correctly.
 */
function getUserScopedClient(token) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return supabase;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const client = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabase : getUserScopedClient(token);

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  const { data: profile } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  req.user = user;
  req.profile = profile;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile?.role || !roles.includes(req.profile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireRestaurant(req, res, next) {
  const restaurantId = req.params.restaurantId || req.body.restaurant_id || req.query.restaurant_id;
  if (!restaurantId) return res.status(400).json({ error: 'Restaurant ID required' });

  if (req.profile?.role !== 'super_admin' && req.profile?.restaurant_id !== restaurantId) {
    return res.status(403).json({ error: 'Access denied to this restaurant' });
  }

  req.restaurantId = restaurantId;
  next();
}

/** Vendor due report, payroll — restaurant owner or super admin only (not staff). */
export function requireOwnerOrSuper(req, res, next) {
  if (req.profile?.role === 'super_admin' || req.profile?.role === 'restaurant_admin') return next();
  return res.status(403).json({ error: 'Owner access required' });
}
