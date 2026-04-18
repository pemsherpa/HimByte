import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { encryptRegistrationSecret } from '../lib/registrationEncryption.js';
import { slugify } from '../lib/onboardingProvision.js';

const router = Router();

const registerOwnerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts from this address. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Self-serve signup: stores an encrypted password + details for super-admin approval.
 * No auth user or restaurant row is created until approved in Himbyte HQ.
 */
router.post('/register-owner', registerOwnerLimiter, async (req, res) => {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return res.status(501).json({
      error:
        'Restaurant self-signup requires SUPABASE_SERVICE_ROLE_KEY on the server. Add it in .env (Supabase Dashboard → Settings → API → service_role).',
    });
  }

  const {
    email,
    password,
    restaurant_name,
    slug: slugInput,
    owner_name,
    venue_type,
    phone,
    address,
    vat_pan_number,
  } = req.body;
  if (!email || !password || !restaurant_name || !owner_name || !phone) {
    return res.status(400).json({
      error: 'email, password, restaurant_name, owner_name, and phone are required',
    });
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const slug = slugify(slugInput || restaurant_name);
  const vt = String(venue_type || 'restaurant').toLowerCase();
  const venueType = vt === 'hotel' ? 'hotel' : 'restaurant';

  let password_encrypted;
  try {
    password_encrypted = encryptRegistrationSecret(password);
  } catch {
    return res.status(500).json({ error: 'Could not secure your application. Try again.' });
  }

  const { data, error } = await admin
    .from('venue_registration_requests')
    .insert({
      email: String(email).trim().toLowerCase(),
      password_encrypted,
      restaurant_name: String(restaurant_name).trim(),
      slug,
      owner_name: String(owner_name).trim(),
      venue_type: venueType,
      phone: String(phone).trim(),
      address: address != null && String(address).trim() ? String(address).trim() : null,
      vat_pan_number:
        vat_pan_number != null && String(vat_pan_number).trim()
          ? String(vat_pan_number).trim()
          : null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505' || String(error.message).includes('duplicate')) {
      return res.status(409).json({
        error:
          'You already have a pending application with this email. We will notify you when it is reviewed.',
      });
    }
    if (String(error.message).includes('venue_registration_requests') || String(error.message).includes('phone')) {
      return res.status(501).json({
        error:
          'Database migration missing: apply supabase/migrations/017 and 018 (venue_registration_requests) to your project.',
      });
    }
    return res.status(400).json({ error: error.message });
  }

  res.status(202).json({
    id: data.id,
    message:
      'Application received. Our team will review it shortly. You will get an email when your venue is approved — then you can sign in.',
  });
});

export default router;
