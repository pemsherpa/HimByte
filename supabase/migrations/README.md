# Supabase migrations

## Incremental migrations (`001`–`010`)

Use these **in order** on databases that were created before the consolidated baseline. They patch schema drift over time.

## Consolidated baseline (`000_full_schema.sql`)

`000_full_schema.sql` is a **single canonical snapshot** of the Himbyte schema aligned with the current app (multi-tenant `tables_rooms`, `price_at_time`, HR, receipts, storage bucket, etc.).

**Do not** run `000_full_schema.sql` on a database that already applied `001`–`010` — you will get duplicate-object errors.

**New empty database (recommended):**

1. Run the SQL in `000_full_schema.sql` once (Supabase SQL Editor or `psql`).
2. For ongoing changes, add new migrations as `011_*.sql`, `012_*.sql`, …

**If you use Supabase CLI `db push` with this repo:** either keep only `000_full_schema.sql` (and move older files out of `migrations/`), or keep only `001`–`010` and **do not** run `000` in the same database.
