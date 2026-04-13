-- Weekly recurring shift templates per employee (same calendar day; e.g. 09:00–17:00)
CREATE TABLE IF NOT EXISTS employee_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT employee_shifts_same_day CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_employee_shifts_restaurant ON employee_shifts (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_employee ON employee_shifts (employee_id);

ALTER TABLE employee_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_shifts_tenant ON employee_shifts FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
