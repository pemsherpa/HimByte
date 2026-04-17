/**
 * Canonical origin for guest-facing links (QR codes, printed URLs).
 * - Production: set `VITE_APP_URL` on Cloudflare Pages (e.g. https://himbyte.pages.dev) so QR codes
 *   stay correct even if staff preview on another host.
 * - Local dev: falls back to `window.location.origin` when unset.
 */
export function getPublicAppUrl() {
  const raw = String(import.meta.env.VITE_APP_URL || '').trim();
  if (raw) return raw.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

/** Stable guest entry: /scan?r=<slug>&loc=<tables_rooms.id> */
export function buildQrScanUrl(slug, locationId) {
  const base = getPublicAppUrl();
  if (!slug || !locationId) return base;
  return `${base}/scan?r=${encodeURIComponent(slug)}&loc=${encodeURIComponent(locationId)}`;
}
