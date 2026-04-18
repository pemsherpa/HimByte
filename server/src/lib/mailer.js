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

/** Branded HTML shell for transactional guest emails */
function guestEmailShell(title, innerHtml) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;font-family:Inter,system-ui,-apple-system,sans-serif;background:#F4F8FB;color:#0F172A;padding:24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;border:1px solid #CBD5E1;overflow:hidden;">
    <tr>
      <td style="padding:24px 24px 8px 24px;background:#0D2540;color:#F4F8FB;">
        <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">Himbyte</p>
        <h1 style="margin:8px 0 0 0;font-size:18px;font-weight:800;line-height:1.3;">${escapeHtml(title)}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;font-size:14px;line-height:1.6;color:#334155;">
        ${innerHtml}
        <p style="margin:24px 0 0 0;font-size:12px;color:#64748B;">This message was sent by your restaurant&apos;s ordering system. Please do not reply directly to this email.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Notify guest: order received (pending staff approval). */
export function guestOrderPlacedContent({ orderId, total, currencyLabel = 'Rs.' }) {
  const sub = `Order ${String(orderId).slice(0, 8)}…`;
  const text = [
    'Your order has been received.',
    '',
    `Reference: ${orderId}`,
    `Amount: ${currencyLabel} ${Number(total || 0).toLocaleString('en-NP')}`,
    '',
    'The kitchen will start preparing after the venue confirms your order. You can keep this page open for live updates.',
  ].join('\n');
  const html = guestEmailShell('Order received', `
    <p style="margin:0 0 12px 0;">Thank you for ordering with us.</p>
    <p style="margin:0 0 12px 0;">We have received your order and it is <strong>waiting for staff confirmation</strong>.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#64748B;">Reference</td><td style="padding:8px 0;text-align:right;font-family:ui-monospace,monospace;">${escapeHtml(orderId)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748B;">Amount</td><td style="padding:8px 0;text-align:right;font-weight:700;">${escapeHtml(currencyLabel)} ${escapeHtml(Number(total || 0).toLocaleString('en-NP'))}</td></tr>
    </table>
    <p style="margin:0;">You will receive another email when your order is <strong>ready for pickup or service</strong>.</p>
  `);
  return { subject: `${sub} — received`, text, html };
}

/** Notify guest: order ready. */
export function guestOrderReadyContent({ orderId, total, currencyLabel = 'Rs.' }) {
  const sub = `Order ${String(orderId).slice(0, 8)}…`;
  const text = [
    'Your order is ready.',
    '',
    `Reference: ${orderId}`,
    `Amount: ${currencyLabel} ${Number(total || 0).toLocaleString('en-NP')}`,
    '',
    'Please collect it from the staff or wait for service as arranged by the venue.',
  ].join('\n');
  const html = guestEmailShell('Order ready', `
    <p style="margin:0 0 12px 0;">Great news — your order is <strong>ready</strong>.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#64748B;">Reference</td><td style="padding:8px 0;text-align:right;font-family:ui-monospace,monospace;">${escapeHtml(orderId)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748B;">Amount</td><td style="padding:8px 0;text-align:right;font-weight:700;">${escapeHtml(currencyLabel)} ${escapeHtml(Number(total || 0).toLocaleString('en-NP'))}</td></tr>
    </table>
    <p style="margin:0;">Please follow the venue&apos;s instructions for pickup or in-room service.</p>
  `);
  return { subject: `${sub} — ready`, text, html };
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

  const subject = `[Himbyte Lead] ${restaurant_name}`;
  const text = [
    'Sales lead — demo / walkthrough request (himbyte.com)',
    `Venue: ${restaurant_name}`,
    `Contact: ${owner_name} <${owner_email}>`,
    `Phone: ${country_code} ${mobile}`,
    `City: ${city || '—'}`,
    `Address: ${address || '—'}`,
    '',
    'Reply to the contact email to schedule.',
  ].join('\n');

  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;font-size:14px;color:#0F172A;max-width:560px;">
      <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#64748B;">Himbyte · inbound lead</p>
      <h2 style="margin:0 0 16px 0;font-size:18px;">Demo request</h2>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;vertical-align:top;">Restaurant</td><td style="font-weight:700;">${escapeHtml(restaurant_name)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Contact</td><td>${escapeHtml(owner_name)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Email</td><td><a href="mailto:${escapeHtml(owner_email)}">${escapeHtml(owner_email)}</a></td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Mobile</td><td>${escapeHtml(country_code)} ${escapeHtml(mobile)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;">City</td><td>${escapeHtml(city || '—')}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;vertical-align:top;">Address</td><td>${escapeHtml(address || '—').replace(/\n/g, '<br/>')}</td></tr>
      </table>
    </div>
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

