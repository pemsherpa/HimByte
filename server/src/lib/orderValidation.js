/**
 * Guest order validation and server-side pricing (never trust client prices).
 */

export const MAX_ORDER_LINE_ITEMS = 50;
export const MAX_ITEM_QUANTITY = 99;
export const MAX_NOTES_LENGTH = 2000;
export const MAX_CONTACT_FIELD_LENGTH = 160;

/** Merge duplicate menu_item_id lines by summing quantity (capped per line). */
export function mergeOrderLineItems(items) {
  if (!Array.isArray(items)) return [];
  const map = new Map();
  for (const raw of items) {
    const menu_item_id = raw?.menu_item_id;
    const q = Number(raw?.quantity);
    if (!menu_item_id || !Number.isFinite(q)) continue;
    const qty = Math.floor(q);
    if (qty < 1) continue;
    const prev = map.get(menu_item_id) || 0;
    const next = Math.min(MAX_ITEM_QUANTITY, prev + qty);
    map.set(menu_item_id, next);
  }
  return [...map.entries()].map(([menu_item_id, quantity]) => ({ menu_item_id, quantity }));
}

export function sanitizeNotes(notes) {
  if (notes == null || notes === '') return null;
  let s = String(notes).replace(/\u0000/g, '');
  if (s.length > MAX_NOTES_LENGTH) s = s.slice(0, MAX_NOTES_LENGTH);
  return s.trim() || null;
}

export function sanitizeContactField(v, maxLen = MAX_CONTACT_FIELD_LENGTH) {
  if (v == null || v === '') return null;
  let s = String(v).trim().replace(/\u0000/g, '');
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s || null;
}
