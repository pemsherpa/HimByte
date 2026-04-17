/**
 * Shared discovery for k6: resolves restaurant UUID, first menu item, first table/room
 * from GET /restaurants/:slug (works in demo + Supabase).
 *
 * Env:
 *   BASE_URL  default http://localhost:3001/api
 *   SLUG      default hotel-tashi-delek (seed). Use himalayan-kitchen for demo-only API.
 */
import http from 'k6/http';

export function discoverRestaurantData() {
  const base = __ENV.BASE_URL || 'http://localhost:3001/api';
  const slug = __ENV.SLUG || 'hotel-tashi-delek';

  const r = http.get(`${base}/restaurants/${slug}`);
  if (r.status !== 200) {
    throw new Error(
      `GET /restaurants/${slug} → HTTP ${r.status}. ` +
        `Try: SLUG=hotel-tashi-delek (seeded Supabase) or SLUG=himalayan-kitchen (demo API with no SUPABASE). ` +
        `Body: ${String(r.body).slice(0, 180)}`
    );
  }

  const restaurant = JSON.parse(r.body);
  const restaurantId = restaurant.id;

  const itemsRes = http.get(`${base}/menu/${restaurantId}/items`);
  if (itemsRes.status !== 200) {
    throw new Error(`GET /menu/.../items → ${itemsRes.status}`);
  }
  const items = JSON.parse(itemsRes.body);
  if (!items?.length) {
    throw new Error('No menu items for restaurant');
  }
  const menuItemId = items[0].id;

  const tablesRes = http.get(`${base}/restaurants/${restaurantId}/tables_rooms`);
  if (tablesRes.status !== 200) {
    throw new Error(`GET /restaurants/.../tables_rooms → ${tablesRes.status}`);
  }
  const tables = JSON.parse(tablesRes.body);
  const tableRoom = tables.find((t) => t.type === 'room') || tables[0];
  if (!tableRoom?.id) {
    throw new Error('No tables_rooms rows');
  }

  return {
    base,
    slug,
    restaurantId,
    menuItemId,
    tableRoomId: tableRoom.id,
  };
}
