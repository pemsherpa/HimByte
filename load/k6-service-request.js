/**
 * POST /service-requests — 20/min per IP in demo; 1 VU + sleep 4s.
 * Run: k6 run load/k6-service-request.js
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
  const payload = JSON.stringify({
    restaurant_id: data.restaurantId,
    table_room_id: data.tableRoomId,
    service_type: 'towels',
    session_id: `sr-${Date.now()}`,
  });

  const res = http.post(`${data.base}/service-requests`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, { 'service-request 201': (r) => r.status === 201 });

  sleep(4);
}
