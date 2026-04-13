/** Order counts toward guest bill only after staff approval */
export const BILL_STATUSES = ['approved', 'preparing', 'ready', 'served'];

export function isOnBill(status) {
  return BILL_STATUSES.includes(String(status || '').toLowerCase());
}

export function aggregateLinesFromOrders(orders, { approvedOnly }) {
  const map = new Map();
  for (const o of orders || []) {
    if (o.status === 'cancelled') continue;
    if (approvedOnly && !isOnBill(o.status)) continue;
    for (const oi of o.order_items || []) {
      const name = oi.menu_items?.name || 'Item';
      const unit = Number(oi.price_at_time || 0);
      const qty = Number(oi.quantity || 0);
      const key = `${name}::${unit}`;
      const prev = map.get(key) || { name, unit_price: unit, quantity: 0, line_total: 0 };
      prev.quantity += qty;
      prev.line_total = Math.round(prev.unit_price * prev.quantity * 100) / 100;
      map.set(key, prev);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Pending = placed but not yet approved — shown separately, not in bill total */
export function pendingOrderLines(orders) {
  const map = new Map();
  for (const o of orders || []) {
    if (o.status !== 'pending') continue;
    for (const oi of o.order_items || []) {
      const name = oi.menu_items?.name || 'Item';
      const unit = Number(oi.price_at_time || 0);
      const qty = Number(oi.quantity || 0);
      const key = `${name}::${unit}`;
      const prev = map.get(key) || { name, unit_price: unit, quantity: 0, line_total: 0 };
      prev.quantity += qty;
      prev.line_total = Math.round(prev.unit_price * prev.quantity * 100) / 100;
      map.set(key, prev);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
