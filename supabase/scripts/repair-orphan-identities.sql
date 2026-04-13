-- ═══════════════════════════════════════════════════════════════════════════
-- Repair "Database error checking email" for specific demo addresses
-- (GoTrue cannot create the user if identities / users are in a bad state.)
--
-- Run in Supabase → SQL Editor. Run section (A) first and read the result.
-- Then run (B), then (C). Finally: npm run fix:demo-auth
--
-- WARNING: (B) and (C) delete Auth data for these emails only. Use on dev/demo.
-- ═══════════════════════════════════════════════════════════════════════════

-- (A) DIAGNOSTIC — identities for our demo emails + linked user row
SELECT
  i.id AS identity_id,
  i.user_id,
  i.provider,
  i.identity_data->>'email' AS identity_email,
  u.id AS user_row_id,
  u.email AS users_table_email
FROM auth.identities i
LEFT JOIN auth.users u ON u.id = i.user_id
WHERE lower(trim(COALESCE(i.identity_data->>'email', ''))) IN (
  'admin@tashidelek.np',
  'staff@tashidelek.np',
  'admin@ohanacafe.np',
  'staff@ohanacafe.np',
  'admin@himbyte.app'
)
ORDER BY identity_email;

-- (A2) DIAGNOSTIC — auth.users rows for those emails (may differ from Dashboard list)
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE lower(trim(COALESCE(email, ''))) IN (
  'admin@tashidelek.np',
  'staff@tashidelek.np',
  'admin@ohanacafe.np',
  'staff@ohanacafe.np',
  'admin@himbyte.app'
);

-- ─── If (A) or (A2) show unexpected rows, continue below ───────────────────

-- (B) Remove auth.users for these addresses (CASCADE removes their identities)
DELETE FROM auth.users
WHERE lower(trim(COALESCE(email, ''))) IN (
  'admin@tashidelek.np',
  'staff@tashidelek.np',
  'admin@ohanacafe.np',
  'staff@ohanacafe.np',
  'admin@himbyte.app'
);

-- (C) Remove any leftover email identities for those addresses
--     (covers ghost identities: wrong user_id, JSON email only, etc.)
DELETE FROM auth.identities
WHERE provider = 'email'
  AND lower(trim(COALESCE(identity_data->>'email', ''))) IN (
    'admin@tashidelek.np',
    'staff@tashidelek.np',
    'admin@ohanacafe.np',
    'staff@ohanacafe.np',
    'admin@himbyte.app'
  );

-- (D) Repo root: npm run fix:demo-auth
--     Then log in with .np addresses + passwords from working.md §6.
