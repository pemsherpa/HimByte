-- Priority flag for guest / concierge requests (Order Gate highlights + sounds).
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal';

UPDATE public.service_requests SET urgency = 'normal' WHERE urgency IS NULL;

ALTER TABLE public.service_requests ALTER COLUMN urgency SET DEFAULT 'normal';

ALTER TABLE public.service_requests ALTER COLUMN urgency SET NOT NULL;

ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_urgency_check;
ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_urgency_check CHECK (urgency IN ('normal', 'high'));

COMMENT ON COLUMN public.service_requests.urgency IS 'normal | high — high for call waiter / immediate help';
