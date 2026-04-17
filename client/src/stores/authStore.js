import { create } from 'zustand';
import { API_BASE } from '../lib/api';
import { supabase, DEMO_MODE } from '../lib/supabase';
import { DEMO_RESTAURANT_ID } from '../lib/constants';

/** Old seed/docs used `.com`; live demo users are `@*.np`. */
function normalizeLoginEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  if (email.endsWith('@tashidelek.com')) return email.replace(/@tashidelek\.com$/i, '@tashidelek.np');
  if (email.endsWith('@ohanacafe.com')) return email.replace(/@ohanacafe\.com$/i, '@ohanacafe.np');
  return email;
}

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,

  restaurantId: DEMO_MODE ? DEMO_RESTAURANT_ID : null,

  init: async () => {
    if (DEMO_MODE) {
      set({ loading: false, restaurantId: DEMO_RESTAURANT_ID });
      return;
    }

    if (!supabase) {
      set({ loading: false, user: null, profile: null, session: null, restaurantId: null });
      return;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) console.warn('Auth session:', error.message);
      if (session) await get().loadProfile(session);
      else {
        set({ user: null, profile: null, session: null, restaurantId: null });
        localStorage.removeItem('himbyte_token');
      }
    } catch (e) {
      console.warn('Auth init failed:', e);
      set({ user: null, profile: null, session: null, restaurantId: null });
    } finally {
      set({ loading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) await get().loadProfile(session);
      else {
        set({ user: null, profile: null, session: null, restaurantId: null });
        localStorage.removeItem('himbyte_token');
      }
    });
  },

  loadProfile: async (session) => {
    if (!session?.user) return;
    if (session.access_token) {
      localStorage.setItem('himbyte_token', session.access_token);
    }

    if (!DEMO_MODE) {
      try {
        const res = await fetch(`${API_BASE}/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const { profile } = await res.json();
          set({
            user: session.user,
            session,
            profile,
            restaurantId: DEMO_MODE ? DEMO_RESTAURANT_ID : (profile?.restaurant_id || null),
          });
          return;
        }
      } catch (e) {
        console.warn('Profile via /api/me failed:', e);
      }
    }

    let profile = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (error) console.warn('Profile fetch:', error.message);
        else profile = data;
      } catch (e) {
        console.warn('Profile fetch failed:', e);
      }
    }

    set({
      user: session.user,
      session,
      profile,
      restaurantId: DEMO_MODE ? DEMO_RESTAURANT_ID : (profile?.restaurant_id || null),
    });
  },

  signIn: async (email, password) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const normalized = normalizeLoginEmail(email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });
    if (error) throw error;
    if (data.session) await get().loadProfile(data.session);
    return data;
  },

  signOut: async () => {
    try {
      if (supabase) await supabase.auth.signOut();
    } catch (e) {
      console.warn('signOut:', e);
    }
    localStorage.removeItem('himbyte_token');
    sessionStorage.removeItem('himbyte_current_order');
    set({ user: null, profile: null, session: null, restaurantId: null, loading: false });
  },

  isAuthenticated: () => {
    const state = get();
    return DEMO_MODE || !!state.user;
  },

  isRole: (...roles) => {
    const state = get();
    if (DEMO_MODE) return true;
    return roles.includes(state.profile?.role);
  },
}));

export default useAuthStore;
