/**
 * Read-only API smoke. IDs come from setup() via SLUG (default hotel-tashi-delek).
 *
 * Run one line at a time in zsh (do not paste comment lines with parentheses):
 *   cd /Users/pemasherpa/himbyte
 *   k6 run load/k6-smoke-readonly.js
 *
 * Demo API only:
 *   SLUG=himalayan-kitchen k6 run load/k6-smoke-readonly.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { discoverRestaurantData } from './k6-env.js';

export function setup() {
  return discoverRestaurantData();
}

export const options = {
  vus: 30,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    // Local + Supabase: menu routes often 300–600ms p95; 500ms is too tight for CI/laptop variance.
    http_req_duration: ['p(95)<800'],
  },
};

export default function (data) {
  const BASE = data.base;
  const SLUG = data.slug;
  const RESTAURANT_ID = data.restaurantId;

  const r1 = http.get(`${BASE}/health`);
  check(r1, { 'health 200': (r) => r.status === 200 });

  const r2 = http.get(`${BASE}/restaurants/${SLUG}`);
  check(r2, { 'restaurant 200': (r) => r.status === 200 });

  const r3 = http.get(`${BASE}/menu/${RESTAURANT_ID}/categories`);
  check(r3, { 'categories 200': (r) => r.status === 200 });

  const r4 = http.get(`${BASE}/menu/${RESTAURANT_ID}/items`);
  check(r4, { 'items 200': (r) => r.status === 200 });

  sleep(0.05);
}
