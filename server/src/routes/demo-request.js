import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sendDemoRequestNotification } from '../lib/mailer.js';

const router = Router();

const demoRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

function sanitize(str, max = 500) {
  if (str == null) return '';
  return String(str).trim().slice(0, max);
}

router.post('/demo-request', demoRequestLimiter, async (req, res) => {
  const restaurant_name = sanitize(req.body.restaurant_name, 200);
  const owner_name = sanitize(req.body.owner_name, 200);
  const owner_email = sanitize(req.body.owner_email, 200).toLowerCase();
  const country_code = sanitize(req.body.country_code, 12) || '+977';
  const mobile = sanitize(req.body.mobile, 30);
  const city = sanitize(req.body.city, 120);
  const address = sanitize(req.body.address, 800);

  if (!restaurant_name || !owner_name || !owner_email || !mobile) {
    return res.status(400).json({
      error: 'Restaurant name, owner name, owner email, and mobile number are required.',
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner_email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const r = await sendDemoRequestNotification({
    restaurant_name,
    owner_name,
    owner_email,
    country_code,
    mobile,
    city,
    address,
  });

  if (r.skipped) {
    return res.status(503).json({
      error:
        'Email is not configured on this server yet. Please write to ptssherpa5@gmail.com or thapakashchitbikram@gmail.com directly.',
    });
  }
  if (!r.ok) {
    console.error('[demo-request]', r.error);
    return res.status(500).json({
      error: 'We could not send your request. Please try again or email us directly.',
    });
  }

  return res.json({ ok: true });
});

export default router;
