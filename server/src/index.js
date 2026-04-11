import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

const DEMO_MODE = !process.env.SUPABASE_URL;

let supabase = null;
if (!DEMO_MODE) {
  const { createClient } = await import('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export { supabase };

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', demo: DEMO_MODE, service: 'himbyte-api', timestamp: new Date().toISOString() });
});

if (DEMO_MODE) {
  const { default: demoRouter } = await import('./routes/demo.js');
  app.use('/api', demoRouter);
  console.log('⚠ Running in DEMO mode (no Supabase configured)');
} else {
  const { default: restaurantRoutes } = await import('./routes/restaurants.js');
  const { default: menuRoutes } = await import('./routes/menu.js');
  const { default: orderRoutes } = await import('./routes/orders.js');
  const { default: adminRoutes } = await import('./routes/admin.js');
  app.use('/api/restaurants', restaurantRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/admin', adminRoutes);
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Himbyte API running on port ${PORT}`);
});
