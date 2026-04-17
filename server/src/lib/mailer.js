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

const DEFAULT_DEMO_REQUEST_RECIPIENTS = 'ptssherpa5@gmail.com,thapakashchitbikram@gmail.com';

/**
 * Notify Pema & Kashchit when someone requests a live demo from the marketing site.
 */
export async function sendDemoRequestNotification(payload) {
  if (!isEmailConfigured()) return { ok: false, skipped: true, reason: 'smtp_not_configured' };

  const raw = String(process.env.DEMO_REQUEST_TO || DEFAULT_DEMO_REQUEST_RECIPIENTS).trim();
  const to = raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
  if (to.length === 0) return { ok: false, skipped: true, reason: 'no_recipients' };

  const from = String(process.env.SMTP_FROM || '').trim();
  const transporter = getTransport();

  const {
    restaurant_name,
    owner_name,
    owner_email,
    country_code,
    mobile,
    city,
    address,
  } = payload;

  const subject = `[Himbyte] Demo request — ${restaurant_name}`;
  const text = [
    'New demo request from the Himbyte website',
    '',
    `Restaurant: ${restaurant_name}`,
    `Owner: ${owner_name}`,
    `Email: ${owner_email}`,
    `Mobile: ${country_code} ${mobile}`,
    `City: ${city || '—'}`,
    `Address: ${address || '—'}`,
    '',
    'Reply to the owner email above to schedule the demo.',
  ].join('\n');

  const html = `
    <h2 style="font-family:system-ui,sans-serif;">New demo request</h2>
    <table style="font-family:system-ui,sans-serif;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Restaurant</td><td><strong>${escapeHtml(restaurant_name)}</strong></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Owner</td><td>${escapeHtml(owner_name)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Email</td><td><a href="mailto:${escapeHtml(owner_email)}">${escapeHtml(owner_email)}</a></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Mobile</td><td>${escapeHtml(country_code)} ${escapeHtml(mobile)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748B;">City</td><td>${escapeHtml(city || '—')}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748B;vertical-align:top;">Address</td><td>${escapeHtml(address || '—').replace(/\n/g, '<br/>')}</td></tr>
    </table>
  `;

  try {
    await transporter.sendMail({
      from,
      to,
      replyTo: owner_email,
      subject,
      text,
      html,
    });
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }

  return { ok: true };
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

