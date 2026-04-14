export function extractEsewaDataFromUrl(urlString) {
  const raw = String(urlString || '');

  // Try normal parsing first
  try {
    const u = new URL(raw, window.location.origin);
    const direct = u.searchParams.get('data');
    if (direct) return direct;
  } catch {
    // ignore
  }

  // eSewa (or intermediaries) sometimes append `?data=...` into an existing query value,
  // resulting in a URL that contains `%3Fdata%3D...` or `?data=` inside another param.
  // Decode once and search for `data=...`.
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { /* ignore */ }

  const m = decoded.match(/(?:\?|&|\\u003f|%3F)data=([^&]+)/i);
  if (m && m[1]) return m[1];

  // Sometimes it appears as `?data%3D...` (missing '=' after decoding)
  const m2 = decoded.match(/data%3D([^&]+)/i);
  if (m2 && m2[1]) return m2[1];

  return null;
}

