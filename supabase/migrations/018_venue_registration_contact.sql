-- Extra fields for "List your venue" applications (contact & compliance)
ALTER TABLE venue_registration_requests
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS vat_pan_number TEXT;
