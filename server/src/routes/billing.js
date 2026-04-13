import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

/**
 * Placeholder for Stripe / payment provider integration.
 * Set STRIPE_SECRET_KEY and implement checkout session creation when you connect billing.
 */
const router = Router();

router.post('/checkout-placeholder', requireAuth, (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(501).json({
      error: 'Online billing is not configured. Contact Himbyte for manual invoicing or set STRIPE_SECRET_KEY.',
      code: 'BILLING_NOT_CONFIGURED',
    });
  }
  res.status(501).json({ error: 'Stripe checkout not implemented in this build.' });
});

export default router;
