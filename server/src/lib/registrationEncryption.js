import crypto from 'node:crypto';

/** 32-byte key for AES-256-GCM. Set VENUE_REQ_ENCRYPTION_KEY to 64 hex chars in production. */
function getKey() {
  const hex = String(process.env.VENUE_REQ_ENCRYPTION_KEY || '').trim();
  if (hex.length >= 64) {
    const buf = Buffer.from(hex.slice(0, 64), 'hex');
    if (buf.length === 32) return buf;
  }
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'himbyte-dev-only';
  return crypto.createHash('sha256').update(String(raw), 'utf8').digest();
}

export function encryptRegistrationSecret(plain) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptRegistrationSecret(b64) {
  const buf = Buffer.from(String(b64), 'base64');
  if (buf.length < 28) throw new Error('invalid_payload');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const key = getKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
