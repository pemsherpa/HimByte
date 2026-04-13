import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

/** Normalize env on process (trim whitespace from dashboard copy/paste) */
for (const k of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) {
  if (typeof process.env[k] === 'string') process.env[k] = process.env[k].trim();
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const DEMO_MODE = !SUPABASE_URL;

let supabase = null;

if (!DEMO_MODE) {
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (!key) {
    console.error('⚠  No Supabase key found. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.');
    process.exit(1);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠  Using ANON key — create a user-scoped client per request for RLS-protected routes.');
  }
  supabase = createClient(SUPABASE_URL, key);
}

/**
 * Returns the service-role client if available, otherwise creates a
 * user-scoped client using the request's Bearer token so RLS works correctly.
 */
export function getSupabaseEnvStatus() {
  return {
    has_supabase_url: !!SUPABASE_URL,
    has_server_anon_key: !!SUPABASE_ANON_KEY,
    has_service_role_key: !!SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function getClient(req) {
  if (!supabase) return null;
  if (SUPABASE_SERVICE_ROLE_KEY) return supabase;
  const token = req?.headers?.authorization?.replace('Bearer ', '');
  if (token && SUPABASE_ANON_KEY) {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }
  return supabase;
}

export { supabase, SUPABASE_URL };
