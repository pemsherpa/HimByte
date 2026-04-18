import { createClient } from '@supabase/supabase-js';

export function slugify(s) {
  return (
    String(s || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'restaurant'
  );
}

/**
 * Creates auth user + restaurant + restaurant_admin profile.
 * @returns {{ restaurant: object, userId: string } | { error: string }}
 */
export async function provisionRestaurantOwner({
  supabaseUrl,
  serviceKey,
  email,
  password,
  restaurant_name,
  slugInput,
  owner_name,
  venue_type,
  phone,
  address,
  vat_pan_number,
}) {
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

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
  if (authErr) return { error: authErr.message };

  const userId = authData.user.id;

  const vt = String(venue_type || 'restaurant').toLowerCase();
  const venueType = vt === 'hotel' ? 'hotel' : 'restaurant';

  const phoneTrim = phone != null && String(phone).trim() ? String(phone).trim() : null;
  const addrTrim = address != null && String(address).trim() ? String(address).trim() : null;
  const panTrim = vat_pan_number != null && String(vat_pan_number).trim() ? String(vat_pan_number).trim() : null;

  const { data: restaurant, error: rErr } = await admin
    .from('restaurants')
    .insert({
      name: String(restaurant_name).trim(),
      slug,
      is_active: true,
      venue_type: venueType,
      phone: phoneTrim,
      address: addrTrim,
      vat_pan_number: panTrim,
    })
    .select()
    .single();

  if (rErr) {
    await admin.auth.admin.deleteUser(userId);
    return { error: rErr.message };
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
    return { error: pErr.message };
  }

  return { restaurant, userId };
}
