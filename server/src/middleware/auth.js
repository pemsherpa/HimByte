import { supabase } from '../index.js';

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  req.user = { ...user, profile };
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.profile?.role || !roles.includes(req.user.profile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireRestaurant(req, res, next) {
  const restaurantId = req.params.restaurantId || req.body.restaurant_id || req.query.restaurant_id;
  if (!restaurantId) return res.status(400).json({ error: 'Restaurant ID required' });

  if (req.user?.profile?.role !== 'super_admin' && req.user?.profile?.restaurant_id !== restaurantId) {
    return res.status(403).json({ error: 'Access denied to this restaurant' });
  }

  req.restaurantId = restaurantId;
  next();
}
