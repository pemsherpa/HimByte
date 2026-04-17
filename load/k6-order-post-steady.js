/**
 * POST /orders — 10 req/min per IP in demo; 1 VU + sleep 7s.
 * Run: k6 run load/k6-order-post-steady.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { discoverRestaurantData } from './k6-env.js';

export function setup() {
  return discoverRestaurantData();
}

export const options = {
  vus: 1,
  iterations: 15,
};

export default function (data) {
  const payload = JSON.stringify({
    restaurant_id: data.restaurantId,
    table_room_id: data.tableRoomId,
    session_id: `load-${__VU}-${Date.now()}`,
    items: [{ menu_item_id: data.menuItemId, quantity: 1 }],
    notes: 'k6 load test',
  });

  const res = http.post(`${data.base}/orders`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'order 201': (r) => r.status === 201,
    'has id': (r) => {
      try {
        return JSON.parse(r.body).id != null;
      } catch {
        return false;
      }
    },
  });

  sleep(7);
}
