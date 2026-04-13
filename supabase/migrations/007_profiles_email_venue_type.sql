-- Staff/admin login email on profiles (synced from auth via app; passwords stay in auth.users only)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email) WHERE email IS NOT NULL;

-- Venue kind: standalone restaurant vs hotel (affects UX; reporting)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS venue_type TEXT DEFAULT 'restaurant';

UPDATE restaurants SET venue_type = 'restaurant' WHERE venue_type IS NULL OR venue_type = '';

ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_venue_type_check;
ALTER TABLE restaurants
  ADD CONSTRAINT restaurants_venue_type_check
  CHECK (venue_type IN ('restaurant', 'hotel'));

COMMENT ON COLUMN profiles.email IS 'Denormalized from auth.users.email for SQL reporting; synced on login.';
COMMENT ON COLUMN restaurants.venue_type IS 'restaurant | hotel';
