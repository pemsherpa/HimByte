/**
 * Guest flow: restaurant → categories → items → order → track.
 * Run: k6 run load/k6-guest-journey.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { discoverRestaurantData } from './k6-env.js';

export function setup() {
  return discoverRestaurantData();
}

export const options = {
  vus: 1,
  iterations: 12,
};

export default function (data) {
  const BASE = data.base;
  const SLUG = data.slug;
  const sessionId = `journey-${__VU}-${__ITER}-${Date.now()}`;

  let res = http.get(`${BASE}/restaurants/${SLUG}`);
  check(res, { 'GET restaurant': (r) => r.status === 200 });

  res = http.get(`${BASE}/menu/${data.restaurantId}/categories`);
  check(res, { 'GET categories': (r) => r.status === 200 });

  res = http.get(`${BASE}/menu/${data.restaurantId}/items`);
  check(res, { 'GET items': (r) => r.status === 200 });

  const body = JSON.stringify({
    restaurant_id: data.restaurantId,
    table_room_id: data.tableRoomId,
    session_id: sessionId,
    items: [{ menu_item_id: data.menuItemId, quantity: 1 }],
  });

  res = http.post(`${BASE}/orders`, body, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, { 'POST order': (r) => r.status === 201 || r.status === 429 });

  if (res.status === 201) {
    res = http.get(`${BASE}/orders/track/${sessionId}`);
    check(res, { 'GET track': (r) => r.status === 200 });
  }

  sleep(8);
}
