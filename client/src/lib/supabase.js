import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const DEMO_MODE = !supabaseUrl;

export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function getSessionId() {
  let sessionId = sessionStorage.getItem('himbyte_session');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('himbyte_session', sessionId);
  }
  return sessionId;
}
