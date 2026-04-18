#!/usr/bin/env node
/**
 * Applies pending SQL files to Postgres (DDL safe to re-run).
 *
 * Prefer DATABASE_URL from Supabase Dashboard → Connect → Session pooler (IPv4-friendly).
 * Direct host db.<ref>.supabase.co is IPv6-first and often fails DNS (ENOTFOUND) on IPv4-only networks.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
const envPath = path.join(root, '.env');
dotenv.config({ path: envPath });

function projectRefFromSupabaseUrl(supabaseUrl) {
  try {
    const host = new URL(supabaseUrl).hostname;
    if (!host.includes('supabase.co')) return null;
    return host.split('.')[0] || null;
  } catch {
    return null;
  }
}

function resolveConnectionString() {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct && (direct.startsWith('postgresql') || direct.startsWith('postgres://'))) return direct;

  const pw = process.env.SUPABASE_DB_PASSWORD?.trim() || process.env.DATABASE_PASSWORD?.trim();
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const ref = projectRefFromSupabaseUrl(supabaseUrl || '');
  const region =
    process.env.SUPABASE_DB_REGION?.trim() ||
    process.env.SUPABASE_REGION?.trim() ||
    process.env.SUPABASE_POOLER_REGION?.trim();

  if (pw && ref && region) {
    // Session pooler (IPv4 + IPv6) — username must be postgres.<project_ref>
    const user = `postgres.${ref}`;
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pw)}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
  }

  if (pw && ref && process.env.SUPABASE_USE_DIRECT_DB === 'true') {
    // Opt-in: direct connection (often IPv6-only; may ENOTFOUND on some networks)
    return `postgresql://postgres:${encodeURIComponent(pw)}@db.${ref}.supabase.co:5432/postgres`;
  }

  return null;
}

const url = resolveConnectionString();
if (!url) {
  console.error('[migrate] Missing database connection. Use one of:\n');
  console.error('  1) DATABASE_URL — copy the Session pooler URI from Supabase → Connect → Session mode (recommended).');
  console.error('  2) SUPABASE_DB_PASSWORD + SUPABASE_URL + SUPABASE_DB_REGION (e.g. ap-south-1, us-east-1 — see Project Settings → General → Region).');
  console.error('  3) Optional: SUPABASE_USE_DIRECT_DB=true with password + SUPABASE_URL for direct db.<ref>.supabase.co (IPv6; often fails on IPv4-only DNS).\n');
  console.error(`[migrate] Loaded env from: ${envPath}`);
  console.error('[migrate] If variables are set elsewhere, add them to that file or export them in this shell.\n');
  process.exit(1);
}

const migDir = path.join(root, 'supabase', 'migrations');
/** Incremental migrations safe to run on an existing DB (excludes 000–013 full/bootstrap files). */
const MIN_MIGRATION_NUM = 14;

function listMigrationFiles() {
  if (!fs.existsSync(migDir)) {
    console.warn('[migrate] No folder:', migDir);
    return [];
  }
  return fs
    .readdirSync(migDir)
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => {
      const m = /^(\d{3})_/.exec(f);
      return m && Number(m[1]) >= MIN_MIGRATION_NUM;
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function main() {
  const names = listMigrationFiles();
  if (!names.length) {
    console.error('[migrate] No .sql files in supabase/migrations/');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    for (const name of names) {
      const rel = path.join('supabase', 'migrations', name);
      const full = path.join(root, rel);
      const sql = fs.readFileSync(full, 'utf8');
      console.log('[migrate] Applying', rel);
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
  console.log('[migrate] Done.');
}

main().catch((e) => {
  console.error('[migrate] Error:', e.message);
  process.exit(1);
});
