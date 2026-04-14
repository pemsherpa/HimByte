import crypto from 'node:crypto';

/**
 * eSewa ePay v2 request signing (HMAC-SHA256, base64 output).
 * Message format (mandatory field order): total_amount, transaction_uuid, product_code
 * @see https://developer.esewa.com.np/pages/Epay-V2
 */
/** Amount as sent in the form fields (must match what eSewa hashes for `total_amount`). */
export function formatTotalAmountForSign(total_amount) {
  const n = Number(total_amount);
  if (Number.isFinite(n)) return n.toFixed(2);
  return String(total_amount ?? '').trim();
}

export function buildEsewaRequestSignMessage(total_amount, transaction_uuid, product_code) {
  const ta = formatTotalAmountForSign(total_amount);
  return `total_amount=${ta},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
}

export function signEsewaRequest(total_amount, transaction_uuid, product_code, secretKey) {
  const message = buildEsewaRequestSignMessage(total_amount, transaction_uuid, product_code);
  return crypto.createHmac('sha256', secretKey).update(message, 'utf8').digest('base64');
}

/**
 * Verify redirect payload signature. signed_field_names lists fields appended to the message in order.
 */
export function verifyEsewaResponseSignature(body, secretKey, expectedProductCode) {
  const provided = body?.signature;
  if (!provided || typeof provided !== 'string') return false;

  if (expectedProductCode && String(body.product_code) !== String(expectedProductCode)) {
    return false;
  }

  const names = String(body.signed_field_names || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!names.length) return false;

  const buildMessage = (totalFormatter) => {
    const parts = [];
    for (const name of names) {
      let v = body[name];
      if (v === undefined || v === null) return null;
      if (name === 'total_amount') v = totalFormatter(v);
      else v = String(v);
      parts.push(`${name}=${v}`);
    }
    return parts.join(',');
  };

  const attempts = [
    (v) => (typeof v === 'number' ? v.toFixed(2) : String(v)),
    (v) => String(v),
    (v) => (typeof v === 'number' ? String(v) : String(v)),
  ];

  for (const fmt of attempts) {
    const message = buildMessage(fmt);
    if (!message) continue;
    const expected = crypto.createHmac('sha256', secretKey).update(message, 'utf8').digest('base64');
    if (expected === provided) return true;
  }

  return false;
}
