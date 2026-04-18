import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { DEMO_MODE } from '../lib/supabase';
import MandalaBackground from '../components/patterns/MandalaBackground';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const { signIn } = useAuthStore();
  const navigate   = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 sm:p-6 safe-area-pb relative overflow-hidden">
      <MandalaBackground opacity={0.05} className="z-0" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm min-w-0 relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/assets/himbyte-logo.png" alt="Himbyte" className="w-14 h-14 rounded-2xl mx-auto mb-4 shadow-xl object-cover" />
          <h1 className="text-2xl font-black text-ink">Himbyte OS</h1>
          <p className="text-sm text-muted mt-1">Staff & Admin Portal</p>
        </div>

        {/* Demo mode notice */}
        {DEMO_MODE && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-gold/10 border border-gold/20 text-sm text-gold-dark flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>Running in <strong>demo mode</strong> — no Supabase connection required. You'll be redirected automatically.</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card border border-border p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourrestaurant.com"
              required={!DEMO_MODE}
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-sm text-ink
                         placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required={!DEMO_MODE}
                className="w-full px-4 py-3 pr-11 rounded-xl border border-border bg-canvas text-sm text-ink
                           placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-xl">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2
                       hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-6 space-y-2">
          <span className="block">
            New restaurant?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">Create your venue</Link>
          </span>
          <span className="block">
            Customer menu?{' '}
            <a href="/" className="text-primary font-semibold hover:underline">Back to home</a>
          </span>
        </p>
      </motion.div>
    </div>
  );
}
