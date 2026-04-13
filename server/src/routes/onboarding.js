import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

function slugify(s) {
  return (
    String(s || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'restaurant'
  );
}

/**
 * Self-serve restaurant owner signup (requires service role on the server).
 * Creates auth user + restaurant + profile (restaurant_admin).
 */
router.post('/register-owner', async (req, res) => {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return res.status(501).json({
      error:
        'Restaurant self-signup requires SUPABASE_SERVICE_ROLE_KEY on the server. Add it in .env (Supabase Dashboard → Settings → API → service_role).',
    });
  }

  const { email, password, restaurant_name, slug: slugInput, owner_name, venue_type } = req.body;
  if (!email || !password || !restaurant_name || !owner_name) {
    return res.status(400).json({ error: 'email, password, restaurant_name, and owner_name are required' });
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const baseSlug = slugify(slugInput || restaurant_name);
  let slug = baseSlug;
  for (let i = 0; i < 30; i++) {
    const { data: clash } = await admin.from('restaurants').select('id').eq('slug', slug).maybeSingle();
    if (!clash?.id) break;
    slug = `${baseSlug}-${i + 2}`;
  }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: String(email).trim().toLowerCase(),
    password: String(password),
    email_confirm: true,
    user_metadata: { full_name: String(owner_name).trim() },
  });
  if (authErr) return res.status(400).json({ error: authErr.message });

  const userId = authData.user.id;

  const vt = String(venue_type || 'restaurant').toLowerCase();
  const venueType = vt === 'hotel' ? 'hotel' : 'restaurant';

  const { data: restaurant, error: rErr } = await admin
    .from('restaurants')
    .insert({
      name: String(restaurant_name).trim(),
      slug,
      is_active: true,
      venue_type: venueType,
    })
    .select()
    .single();

  if (rErr) {
    await admin.auth.admin.deleteUser(userId);
    return res.status(400).json({ error: rErr.message });
  }

  const ownerEmail = String(email).trim().toLowerCase();
  const { error: pErr } = await admin.from('profiles').insert({
    id: userId,
    restaurant_id: restaurant.id,
    full_name: String(owner_name).trim(),
    role: 'restaurant_admin',
    email: ownerEmail,
  });

  if (pErr) {
    await admin.from('restaurants').delete().eq('id', restaurant.id);
    await admin.auth.admin.deleteUser(userId);
    return res.status(400).json({ error: pErr.message });
  }

  res.status(201).json({ restaurant, message: 'Account created. You can sign in now.' });
});

export default router;
