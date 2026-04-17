/**
 * Canonical origin for guest-facing links (QR codes, printed URLs).
 * - Production: set `VITE_APP_URL` on Cloudflare Pages to a full URL, e.g. `https://himbyte.pages.dev`
 *   (never paste the literal text `window.location.origin` — env vars are strings, not JavaScript).
 * - Local dev: falls back to `window.location.origin` when unset or invalid.
 */
function isSafeHttpOrigin(value) {
  const s = String(value || '').trim();
  if (!s) return false;
  if (/window\.location|location\.origin/i.test(s)) return false;
  try {
    const u = new URL(s);
    return (u.protocol === 'http:' || u.protocol === 'https:') && Boolean(u.hostname);
  } catch {
    return false;
  }
}

export function getPublicAppUrl() {
  const raw = String(import.meta.env.VITE_APP_URL || '').trim().replace(/\/$/, '');
  if (raw && isSafeHttpOrigin(raw)) return raw;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

/** Stable guest entry: /scan?r=<slug>&loc=<tables_rooms.id> */
export function buildQrScanUrl(slug, locationId) {
  const base = getPublicAppUrl();
  if (!slug || !locationId) return base;
  return `${base}/scan?r=${encodeURIComponent(slug)}&loc=${encodeURIComponent(locationId)}`;
}
