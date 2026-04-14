import nodemailer from 'nodemailer';

function boolEnv(name, fallback = false) {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).trim().toLowerCase());
}

function intEnv(name, fallback) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

export function isEmailConfigured() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  );
}

let cachedTransport = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = intEnv('SMTP_PORT', 465);
  const secure = boolEnv('SMTP_SECURE', port === 465);
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return cachedTransport;
}

export async function sendGuestEmail({ to, subject, text, html }) {
  if (!to) return { ok: false, skipped: true, reason: 'missing_to' };
  if (!isEmailConfigured()) return { ok: false, skipped: true, reason: 'smtp_not_configured' };

  const from = String(process.env.SMTP_FROM || '').trim();
  const transporter = getTransport();

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }

  return { ok: true };
}

