/**
 * Sum quantities by menu item name across orders (KDS / gate sidebar).
 */
export function aggregatePendingItems(orders) {
  const map = new Map();
  for (const o of orders || []) {
    for (const oi of o.order_items || []) {
      const name = oi.menu_items?.name || 'Item';
      map.set(name, (map.get(name) || 0) + Number(oi.quantity || 0));
    }
  }
  return [...map.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
}
