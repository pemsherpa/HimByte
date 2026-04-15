-- Run this in Supabase SQL Editor if you see:
-- "Could not find the table 'public.employee_shifts' in the schema cache"
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS public.employee_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT employee_shifts_same_day CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_employee_shifts_restaurant ON public.employee_shifts (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_employee ON public.employee_shifts (employee_id);

ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_shifts_tenant ON public.employee_shifts;
CREATE POLICY employee_shifts_tenant ON public.employee_shifts FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
