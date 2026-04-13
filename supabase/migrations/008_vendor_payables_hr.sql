-- Vendors & accounts payable (owner reporting)
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_restaurant ON vendors (restaurant_id);

CREATE TABLE IF NOT EXISTS vendor_payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name TEXT NOT NULL,
  description TEXT,
  amount_due NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'void')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_payables_restaurant_due ON vendor_payables (restaurant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_vendor_payables_status ON vendor_payables (restaurant_id, status);

-- HR: employees (not always linked to auth)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  designation TEXT,
  department TEXT,
  hire_date DATE,
  salary_amount NUMERIC(12,2),
  salary_period TEXT DEFAULT 'monthly' CHECK (salary_period IN ('monthly', 'daily')),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_restaurant ON employees (restaurant_id);

CREATE TABLE IF NOT EXISTS employment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employment_history_employee ON employment_history (employee_id);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_history ENABLE ROW LEVEL SECURITY;

-- Staff of a restaurant, or super admin
CREATE POLICY vendors_tenant ON vendors FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY vendor_payables_tenant ON vendor_payables FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY employees_tenant ON employees FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY employment_history_tenant ON employment_history FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
