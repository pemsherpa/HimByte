import crypto from 'node:crypto';
import { Router } from 'express';
import { getClient, supabase, DEMO_MODE } from '../supabaseClient.js';
import { requireAuth } from '../middleware/auth.js';
import { requireActiveStaffSubscription } from '../middleware/subscription.js';
import { signEsewaRequest, verifyEsewaResponseSignature } from '../lib/esewa.js';

const router = Router();

/** In-memory pending eSewa intents (restart clears; use DB in production if needed). */
const pendingByTransactionUuid = new Map();

function pickEsewaReturnData(req) {
  const q = req?.query?.data;
  if (q && typeof q === 'string') return q;
  const b = req?.body?.data;
  if (b && typeof b === 'string') return b;
  // Some eSewa configurations return fields directly (not wrapped in base64 `data`).
  // If we have a transaction_uuid, synthesize the expected base64 JSON payload.
  const merged = { ...(req?.query || {}), ...(req?.body || {}) };
  const tx = merged?.transaction_uuid;
  if (typeof tx !== 'string' || !tx) return null;
  const payload = {};
  const allowed = [
    'status',
    'total_amount',
    'transaction_uuid',
    'product_code',
    'signed_field_names',
    'signature',
    'transaction_code',
  ];
  for (const k of allowed) {
    const v = merged?.[k];
    if (v !== undefined && v !== null) payload[k] = String(v);
  }
  try {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  } catch {
    return null;
  }
}

function decodeEsewaReturnPayload(data) {
  try {
    const json = Buffer.from(String(data), 'base64').toString('utf8');
    const body = JSON.parse(json);
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

function appConfiguredFrontendBaseUrl() {
  const raw = process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  return normalizeBaseUrl(raw);
}

function frontendBaseUrlFromEsewaReturn(data) {
  const body = data ? decodeEsewaReturnPayload(data) : null;
  const uuid = body?.transaction_uuid ? String(body.transaction_uuid) : '';
  if (uuid) {
    const pending = pendingByTransactionUuid.get(uuid);
    if (pending?.returnBase) return normalizeBaseUrl(pending.returnBase);
  }
  return appConfiguredFrontendBaseUrl();
}

function cleanupPending() {
  const maxAge = 25 * 60 * 1000;
  const now = Date.now();
  for (const [id, row] of pendingByTransactionUuid) {
    if (now - row.createdAt > maxAge) pendingByTransactionUuid.delete(id);
  }
}

function normalizeBaseUrl(raw) {
  return String(raw || '').trim().replace(/\/$/, '');
}

function appPublicBaseUrlFromRequest(req) {
  const origin = req?.headers?.origin;
  if (origin) return normalizeBaseUrl(origin);

  const xfProto = req?.headers?.['x-forwarded-proto'];
  const xfHost = req?.headers?.['x-forwarded-host'];
  if (xfProto && xfHost) {
    const proto = String(xfProto).split(',')[0].trim();
    const host = String(xfHost).split(',')[0].trim();
    if (proto && host) return normalizeBaseUrl(`${proto}://${host}`);
  }

  const host = req?.headers?.host;
  if (host) {
    const proto = (req?.protocol || 'http').trim();
    return normalizeBaseUrl(`${proto}://${host}`);
  }

  const raw = process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  return normalizeBaseUrl(raw);
}

function esewaFormUrl() {
  return (
    process.env.ESEWA_FORM_URL?.trim() || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
  );
}

function esewaSecret() {
  return process.env.ESEWA_SECRET_KEY?.trim() || '';
}

function esewaProductCode() {
  return process.env.ESEWA_PRODUCT_CODE?.trim() || 'EPAYTEST';
}

function buildReceiptLinesFromOrders(orders) {
  const lines = [];
  for (const o of orders || []) {
    for (const oi of o.order_items || []) {
      const name = oi.menu_items?.name || 'Item';
      const qty = Number(oi.quantity || 0);
      const unit = Number(oi.price_at_time || 0);
      const lineTotal = Math.round(unit * qty * 100) / 100;
      lines.push({ name, quantity: qty, unit_price: unit, line_total: lineTotal, order_id: o.id });
    }
  }
  return lines;
}

async function insertReceiptSafe(db, row) {
  // Attempt insert with optional newer columns; fallback if DB is missing them.
  const attempt = async (payload) =>
    db.from('receipts').insert(payload).select().single();

  const payload = { ...row };
  let { data, error } = await attempt(payload);
  if (!error) return { data, error: null };

  // Remove optional columns if migration not applied yet.
  const slim = { ...row };
  delete slim.table_room_id;
  delete slim.payment_method;
  delete slim.payment_ref;
  ({ data, error } = await attempt(slim));
  return { data, error };
}

async function markTablePaidSafe(db, tableId, restaurantId, fields) {
  const payload = { ...fields };
  let { error } = await db
    .from('tables_rooms')
    .update(payload)
    .eq('id', tableId)
    .eq('restaurant_id', restaurantId);
  if (!error) return null;

  // Fallback if migration not applied.
  const slim = { ...fields };
  delete slim.last_paid_at;
  delete slim.last_payment_method;
  delete slim.last_payment_ref;
  ({ error } = await db
    .from('tables_rooms')
    .update(slim)
    .eq('id', tableId)
    .eq('restaurant_id', restaurantId));
  return error || null;
}

async function snapshotTableForReceipt(db, restaurantId, tableRoomId) {
  const { data: rest } = await db
    .from('restaurants')
    .select('vat_pan_number')
    .eq('id', restaurantId)
    .maybeSingle();

  const { data: orders } = await db
    .from('orders')
    .select('id, status, session_id, order_items(quantity, price_at_time, menu_items(name))')
    .eq('restaurant_id', restaurantId)
    .eq('table_room_id', tableRoomId)
    .in('status', ['approved', 'preparing', 'ready', 'served']);

  const lines = buildReceiptLinesFromOrders(orders || []);
  const subtotal = Math.round(lines.reduce((s, l) => s + l.line_total, 0) * 100) / 100;
  const session_id = (orders || []).find((o) => o.session_id)?.session_id || null;
  return { lines, subtotal, pan_display: rest?.vat_pan_number || null, session_id };
}

async function settleTableCheck(db, table) {
  const ts = new Date().toISOString();
  const { error: ordErr } = await db
    .from('orders')
    .update({ status: 'served', table_room_id: null, updated_at: ts })
    .eq('table_room_id', table.id)
    .eq('restaurant_id', table.restaurant_id)
    .neq('status', 'cancelled');
  if (ordErr) throw new Error(ordErr.message);

  const { error: canErr } = await db
    .from('orders')
    .update({ table_room_id: null, updated_at: ts })
    .eq('table_room_id', table.id)
    .eq('restaurant_id', table.restaurant_id)
    .eq('status', 'cancelled');
  if (canErr) throw new Error(canErr.message);

  const { error: rtErr } = await db
    .from('tables_rooms')
    .update({ running_total: 0 })
    .eq('id', table.id)
    .eq('restaurant_id', table.restaurant_id);
  if (rtErr) throw new Error(rtErr.message);
}

/** Staff: build signed ePay v2 form fields for table running_total (pay at counter). */
router.post('/esewa/table-bill/init', requireAuth, requireActiveStaffSubscription, async (req, res) => {
  cleanupPending();

  const tableRoomId = req.body.table_room_id;
  if (!tableRoomId) return res.status(400).json({ error: 'table_room_id is required' });

  const secret = esewaSecret();
  const productCode = esewaProductCode();
  if (!secret) {
    return res.status(503).json({ error: 'eSewa is not configured. Set ESEWA_SECRET_KEY in environment.' });
  }

  const db = getClient(req);
  const { data: table, error: tErr } = await db
    .from('tables_rooms')
    .select('id, restaurant_id, running_total, identifier')
    .eq('id', tableRoomId)
    .single();

  if (tErr || !table) return res.status(404).json({ error: 'Table not found' });
  if (req.profile.role !== 'super_admin' && table.restaurant_id !== req.profile.restaurant_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const running = Number(table.running_total || 0);
  if (running <= 0) {
    return res.status(400).json({ error: 'No running bill to pay (approved total is zero).' });
  }

  const amountStr = running.toFixed(2);
  const tax_amount = '0.00';
  const product_service_charge = '0.00';
  const product_delivery_charge = '0.00';
  const total_amount = (
    Number(amountStr) +
    Number(tax_amount) +
    Number(product_service_charge) +
    Number(product_delivery_charge)
  ).toFixed(2);

  const transaction_uuid = crypto.randomUUID();
  const signature = signEsewaRequest(total_amount, transaction_uuid, productCode, secret);

  const base = appPublicBaseUrlFromRequest(req);
  // Use backend endpoints to capture POST return payloads, then redirect to SPA with ?data=...
  const success_url = `${base}/api/payments/esewa/staff/success`;
  const failure_url = `${base}/api/payments/esewa/staff/failure`;
  const signed_field_names = 'total_amount,transaction_uuid,product_code';

  pendingByTransactionUuid.set(transaction_uuid, {
    kind: 'staff',
    tableRoomId: table.id,
    restaurantId: table.restaurant_id,
    amountExpected: Number(total_amount),
    returnBase: base,
    createdAt: Date.now(),
  });

  const fields = {
    amount: amountStr,
    tax_amount,
    total_amount,
    transaction_uuid,
    product_code: productCode,
    product_service_charge,
    product_delivery_charge,
    success_url,
    failure_url,
    signed_field_names,
    signature,
  };

  res.json({
    formUrl: esewaFormUrl(),
    fields,
    return_urls: { success_url, failure_url },
    transaction_uuid,
    total_amount,
    table_label: table.identifier,
  });
});

/**
 * Staff: verify Base64 `data` from eSewa success redirect, then close the table check (same as Settle).
 * @see https://developer.esewa.com.np/pages/Epay-V2 — response signed_field_names verification
 */
router.post('/esewa/verify', requireAuth, requireActiveStaffSubscription, async (req, res) => {
  const data = req.body.data;
  if (!data || typeof data !== 'string') {
    return res.status(400).json({ error: 'data (base64 JSON from eSewa) is required' });
  }

  const secret = esewaSecret();
  const productCode = esewaProductCode();
  if (!secret) {
    return res.status(503).json({ error: 'eSewa is not configured' });
  }

  let body;
  try {
    const json = Buffer.from(data, 'base64').toString('utf8');
    body = JSON.parse(json);
  } catch {
    return res.status(400).json({ error: 'Invalid base64 payment payload' });
  }

  if (!verifyEsewaResponseSignature(body, secret, productCode)) {
    return res.status(400).json({ error: 'Could not verify eSewa response signature' });
  }

  if (body.status !== 'COMPLETE') {
    return res.status(400).json({ error: `Payment status: ${body.status || 'unknown'}` });
  }

  const uuid = String(body.transaction_uuid || '');
  const pending = pendingByTransactionUuid.get(uuid);
  if (!pending) {
    return res.status(400).json({
      error:
        'This payment session is unknown or expired (server restarted, or session is too old). Use Settle if the payment already cleared the bill.',
    });
  }

  if (pending.kind === 'guest') {
    return res.status(400).json({
      error: 'This payment was started from the guest bill — complete verification on the return page linked from eSewa.',
    });
  }

  if (req.profile.role !== 'super_admin' && req.profile.restaurant_id !== pending.restaurantId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const paid = Number(body.total_amount);
  if (Number.isNaN(paid) || Math.abs(paid - pending.amountExpected) > 0.02) {
    return res.status(400).json({ error: 'Paid amount does not match the initiated payment' });
  }

  const db = getClient(req);
  const { data: table, error: tErr } = await db
    .from('tables_rooms')
    .select('id, restaurant_id, running_total')
    .eq('id', pending.tableRoomId)
    .single();

  if (tErr || !table || table.restaurant_id !== pending.restaurantId) {
    pendingByTransactionUuid.delete(uuid);
    return res.status(400).json({ error: 'Table is no longer valid for this payment' });
  }

  const paidAt = new Date().toISOString();
  let receiptId = null;
  try {
    const snap = await snapshotTableForReceipt(db, pending.restaurantId, table.id);
    if (snap?.lines?.length) {
      const { data: receipt, error: rErr } = await insertReceiptSafe(db, {
        restaurant_id: pending.restaurantId,
        session_id: snap.session_id,
        guest_email: null,
        line_items: snap.lines,
        subtotal: snap.subtotal,
        vat_rate: 0,
        vat_amount: 0,
        total_amount: snap.subtotal,
        pan_display: snap.pan_display,
        table_room_id: table.id,
        payment_method: 'esewa',
        payment_ref: body.transaction_code || uuid,
      });
      if (!rErr && receipt?.id) receiptId = receipt.id;
    }
  } catch {
    // Receipt failure should not block settling the table.
  }

  try {
    await settleTableCheck(db, table);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Failed to close table after payment' });
  }

  await markTablePaidSafe(db, table.id, pending.restaurantId, {
    last_paid_at: paidAt,
    last_payment_method: 'esewa',
    last_payment_ref: body.transaction_code || uuid,
  });

  pendingByTransactionUuid.delete(uuid);

  res.json({
    ok: true,
    receipt_id: receiptId,
    transaction_code: body.transaction_code,
    transaction_uuid: uuid,
    table_id: table.id,
    settled: true,
  });
});

/**
 * Staff: eSewa redirects here on success/failure. It may POST the payload; we forward to SPA.
 * Note: verification still happens in the SPA page via /api/payments/esewa/verify.
 */
router.all('/esewa/staff/success', (req, res) => {
  const data = pickEsewaReturnData(req);
  const base = frontendBaseUrlFromEsewaReturn(data);
  const q = new URLSearchParams();
  if (data) q.set('data', data);
  res.redirect(302, `${base}/merchant/payments/esewa/success${q.toString() ? `?${q.toString()}` : ''}`);
});

router.all('/esewa/staff/failure', (req, res) => {
  const data = pickEsewaReturnData(req);
  const base = frontendBaseUrlFromEsewaReturn(data);
  const q = new URLSearchParams();
  if (data) q.set('data', data);
  res.redirect(302, `${base}/merchant/payments/esewa/failure${q.toString() ? `?${q.toString()}` : ''}`);
});

router.get('/esewa/config', requireAuth, (_req, res) => {
  res.json({
    enabled: !!esewaSecret(),
    form_host: esewaFormUrl(),
    product_code: esewaProductCode(),
  });
});

/** Public: whether eSewa is configured (guest bill UI). */
router.get('/esewa/public-config', (_req, res) => {
  res.json({
    enabled: !!(esewaSecret() && !DEMO_MODE && supabase),
    form_host: esewaFormUrl(),
  });
});

/**
 * Guest QR bill: init eSewa using table running_total. Validates session has orders on this table.
 */
router.post('/esewa/guest/init', async (req, res) => {
  if (DEMO_MODE || !supabase) {
    return res.status(503).json({ error: 'eSewa is not available in demo or without Supabase.' });
  }
  cleanupPending();

  const session_id = req.body?.session_id;
  const restaurant_id = req.body?.restaurant_id;
  const table_room_id = req.body?.table_room_id;
  if (!session_id || !restaurant_id || !table_room_id) {
    return res.status(400).json({ error: 'session_id, restaurant_id, and table_room_id are required' });
  }

  const secret = esewaSecret();
  const productCode = esewaProductCode();
  if (!secret) {
    return res.status(503).json({ error: 'eSewa is not configured (ESEWA_SECRET_KEY)' });
  }

  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('id, table_room_id')
    .eq('session_id', session_id)
    .eq('restaurant_id', restaurant_id);

  if (oErr) return res.status(500).json({ error: oErr.message });
  const linked = (orders || []).some((o) => o.table_room_id === table_room_id);
  if (!linked) {
    return res.status(400).json({
      error: 'No order from this device matches this table. Open the bill from your table QR.',
    });
  }

  const { data: table, error: tErr } = await supabase
    .from('tables_rooms')
    .select('id, restaurant_id, running_total, identifier')
    .eq('id', table_room_id)
    .eq('restaurant_id', restaurant_id)
    .single();

  if (tErr || !table) return res.status(404).json({ error: 'Table not found' });

  const running = Number(table.running_total || 0);
  if (running <= 0) {
    return res.status(400).json({ error: 'Nothing to pay yet — wait for staff to approve your order.' });
  }

  const { data: restaurantRow, error: rErr } = await supabase
    .from('restaurants')
    .select('slug')
    .eq('id', restaurant_id)
    .single();

  if (rErr || !restaurantRow?.slug) {
    return res.status(500).json({ error: 'Could not load restaurant' });
  }

  const amountStr = running.toFixed(2);
  const tax_amount = '0.00';
  const product_service_charge = '0.00';
  const product_delivery_charge = '0.00';
  const total_amount = (
    Number(amountStr) +
    Number(tax_amount) +
    Number(product_service_charge) +
    Number(product_delivery_charge)
  ).toFixed(2);

  const transaction_uuid = crypto.randomUUID();
  const signature = signEsewaRequest(total_amount, transaction_uuid, productCode, secret);

  const base = appPublicBaseUrlFromRequest(req);
  const rQ = encodeURIComponent(restaurantRow.slug);
  const locQ = encodeURIComponent(table_room_id);
  // Use backend endpoints to capture POST return payloads, then redirect to SPA with ?data=...
  const success_url = `${base}/api/payments/esewa/guest/success?r=${rQ}&loc=${locQ}`;
  const failure_url = `${base}/api/payments/esewa/guest/failure?r=${rQ}&loc=${locQ}`;
  const signed_field_names = 'total_amount,transaction_uuid,product_code';

  pendingByTransactionUuid.set(transaction_uuid, {
    kind: 'guest',
    sessionId: session_id,
    tableRoomId: table.id,
    restaurantId: table.restaurant_id,
    amountExpected: Number(total_amount),
    returnBase: base,
    createdAt: Date.now(),
  });

  res.json({
    formUrl: esewaFormUrl(),
    fields: {
      amount: amountStr,
      tax_amount,
      total_amount,
      transaction_uuid,
      product_code: productCode,
      product_service_charge,
      product_delivery_charge,
      success_url,
      failure_url,
      signed_field_names,
      signature,
    },
    return_urls: { success_url, failure_url },
    transaction_uuid,
    total_amount,
    table_label: table.identifier,
  });
});

/** Guest: verify eSewa return and close table (same settle as staff). No auth — validated via pending map + session. */
router.post('/esewa/guest/verify', async (req, res) => {
  if (DEMO_MODE || !supabase) {
    return res.status(503).json({ error: 'eSewa is not available in demo or without Supabase.' });
  }

  const data = req.body.data;
  if (!data || typeof data !== 'string') {
    return res.status(400).json({ error: 'data (base64 JSON from eSewa) is required' });
  }

  const secret = esewaSecret();
  const productCode = esewaProductCode();
  if (!secret) {
    return res.status(503).json({ error: 'eSewa is not configured' });
  }

  let body;
  try {
    const json = Buffer.from(data, 'base64').toString('utf8');
    body = JSON.parse(json);
  } catch {
    return res.status(400).json({ error: 'Invalid base64 payment payload' });
  }

  if (!verifyEsewaResponseSignature(body, secret, productCode)) {
    return res.status(400).json({ error: 'Could not verify eSewa response signature' });
  }

  if (body.status !== 'COMPLETE') {
    return res.status(400).json({ error: `Payment status: ${body.status || 'unknown'}` });
  }

  const uuid = String(body.transaction_uuid || '');
  const pending = pendingByTransactionUuid.get(uuid);
  if (!pending || pending.kind !== 'guest') {
    return res.status(400).json({
      error: 'Unknown or expired payment session. Ask staff if the payment still went through.',
    });
  }

  const paid = Number(body.total_amount);
  if (Number.isNaN(paid) || Math.abs(paid - pending.amountExpected) > 0.02) {
    return res.status(400).json({ error: 'Paid amount does not match the initiated payment' });
  }

  const { data: table, error: tErr } = await supabase
    .from('tables_rooms')
    .select('id, restaurant_id, running_total')
    .eq('id', pending.tableRoomId)
    .single();

  if (tErr || !table || table.restaurant_id !== pending.restaurantId) {
    pendingByTransactionUuid.delete(uuid);
    return res.status(400).json({ error: 'Table is no longer valid for this payment' });
  }

  const paidAt = new Date().toISOString();
  let receiptId = null;
  try {
    const snap = await snapshotTableForReceipt(supabase, pending.restaurantId, table.id);
    if (snap?.lines?.length) {
      const { data: receipt, error: rErr } = await insertReceiptSafe(supabase, {
        restaurant_id: pending.restaurantId,
        session_id: pending.sessionId || snap.session_id,
        guest_email: null,
        line_items: snap.lines,
        subtotal: snap.subtotal,
        vat_rate: 0,
        vat_amount: 0,
        total_amount: snap.subtotal,
        pan_display: snap.pan_display,
        table_room_id: table.id,
        payment_method: 'esewa',
        payment_ref: body.transaction_code || uuid,
      });
      if (!rErr && receipt?.id) receiptId = receipt.id;
    }
  } catch {
    // ignore
  }

  try {
    await settleTableCheck(supabase, table);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Failed to update table after payment' });
  }

  await markTablePaidSafe(supabase, table.id, pending.restaurantId, {
    last_paid_at: paidAt,
    last_payment_method: 'esewa',
    last_payment_ref: body.transaction_code || uuid,
  });

  // Guest emails: order placed + order ready only (see orders routes). Payment proof lives in-app / receipt export.

  pendingByTransactionUuid.delete(uuid);

  res.json({
    ok: true,
    receipt_id: receiptId,
    transaction_code: body.transaction_code,
    transaction_uuid: uuid,
    table_id: table.id,
    settled: true,
  });
});

router.all('/esewa/guest/success', (req, res) => {
  const data = pickEsewaReturnData(req);
  const base = frontendBaseUrlFromEsewaReturn(data);
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query || {})) {
    if (typeof v === 'string' && v) q.set(k, v);
  }
  if (data) q.set('data', data);
  res.redirect(302, `${base}/bill/payments/esewa/success${q.toString() ? `?${q.toString()}` : ''}`);
});

router.all('/esewa/guest/failure', (req, res) => {
  const data = pickEsewaReturnData(req);
  const base = frontendBaseUrlFromEsewaReturn(data);
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query || {})) {
    if (typeof v === 'string' && v) q.set(k, v);
  }
  if (data) q.set('data', data);
  res.redirect(302, `${base}/bill/payments/esewa/failure${q.toString() ? `?${q.toString()}` : ''}`);
});

export default router;
