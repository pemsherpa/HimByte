import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { DEMO_MODE, getSupabaseEnvStatus, SUPABASE_URL, supabase } from './supabaseClient.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = (process.env.CLIENT_URL || '').split(',').filter(Boolean);
    if (allowed.length && allowed.includes(origin)) return cb(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) {
      return cb(null, true);
    }
    cb(null, true);
  },
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '12mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    demo: DEMO_MODE,
    service: 'himbyte-api',
    timestamp: new Date().toISOString(),
    supabase: DEMO_MODE
      ? { configured: false }
      : {
          configured: true,
          url: SUPABASE_URL || null,
          ...getSupabaseEnvStatus(),
        },
  });
});

if (DEMO_MODE) {
  const { default: demoRouter } = await import('./routes/demo.js');
  app.use('/api', demoRouter);
  console.log('⚠  Running in DEMO mode (no Supabase URL configured)');
} else {
  app.get('/api/me', requireAuth, async (req, res) => {
    let profile = req.profile;
    const email = req.user?.email ? String(req.user.email).trim().toLowerCase() : null;
    if (email && profile?.id) {
      const { data: updated, error: syncErr } = await supabase
        .from('profiles')
        .update({ email })
        .eq('id', req.user.id)
        .select()
        .maybeSingle();
      if (!syncErr && updated) profile = updated;
      else if (profile) profile = { ...profile, email };
    }
    res.json({
      user: { id: req.user.id, email: req.user.email },
      profile,
    });
  });

  const { default: restaurantRoutes } = await import('./routes/restaurants.js');
  const { default: menuRoutes } = await import('./routes/menu.js');
  const { default: orderRoutes } = await import('./routes/orders.js');
  const { default: adminRoutes } = await import('./routes/admin.js');
  const { default: onboardingRoutes } = await import('./routes/onboarding.js');
  const { default: serviceRequestRoutes } = await import('./routes/service-requests.js');
  const { default: tableRoutes } = await import('./routes/tables.js');
  const { default: receiptRoutes } = await import('./routes/receipts.js');
  const { default: billingRoutes } = await import('./routes/billing.js');
  const { default: ownerOpsRoutes } = await import('./routes/owner-ops.js');
  app.use('/api/restaurants', restaurantRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/service-requests', serviceRequestRoutes);
  app.use('/api/tables', tableRoutes);
  app.use('/api/receipts', receiptRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api', ownerOpsRoutes);
  console.log(`✓  Supabase connected → ${SUPABASE_URL}`);
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Himbyte API running on port ${PORT}`);
});
