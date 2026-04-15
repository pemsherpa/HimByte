import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { requireAuth, requireRestaurant, requireOwnerOrSuper } from '../middleware/auth.js';
import { requireActiveStaffSubscription } from '../middleware/subscription.js';

const router = Router();

const EMPLOYEE_SHIFTS_MISSING_MSG =
  'Shifts need the employee_shifts table. In Supabase SQL editor, run supabase/migrations/012_employee_shifts_and_tables_rooms_rls.sql, then reload.';

function isEmployeeShiftsTableMissing(error) {
  if (!error) return false;
  const msg = String(error.message || '');
  if (!msg.includes('employee_shifts')) return false;
  return (
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('Could not find') ||
    error.code === '42P01' ||
    error.code === 'PGRST205'
  );
}

// ── Vendors ─────────────────────────────────────────────────
router.get('/owner/:restaurantId/vendors', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('restaurant_id', req.restaurantId)
    .order('name', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/owner/:restaurantId/vendors', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const { name, contact_phone, contact_email, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { data, error } = await supabase
    .from('vendors')
    .insert({
      restaurant_id: req.restaurantId,
      name: String(name).trim(),
      contact_phone: contact_phone || null,
      contact_email: contact_email || null,
      notes: notes || null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/owner/:restaurantId/vendors/:id', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const patch = {};
  if (req.body.name !== undefined) patch.name = String(req.body.name).trim();
  if (req.body.contact_phone !== undefined) patch.contact_phone = req.body.contact_phone;
  if (req.body.contact_email !== undefined) patch.contact_email = req.body.contact_email;
  if (req.body.notes !== undefined) patch.notes = req.body.notes;
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'No fields to update' });
  const { data, error } = await supabase
    .from('vendors')
    .update(patch)
    .eq('id', req.params.id)
    .eq('restaurant_id', req.restaurantId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Vendor payables ─────────────────────────────────────────
router.get('/owner/:restaurantId/vendor-payables', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const { data, error } = await supabase
    .from('vendor_payables')
    .select('*')
    .eq('restaurant_id', req.restaurantId)
    .order('due_date', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/owner/:restaurantId/vendor-payables', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const { vendor_id, vendor_name, description, amount_due, due_date, status } = req.body;
  const vn = String(vendor_name || '').trim();
  if (!vn || amount_due == null || !due_date) {
    return res.status(400).json({ error: 'vendor_name, amount_due, and due_date are required' });
  }
  const { data, error } = await supabase
    .from('vendor_payables')
    .insert({
      restaurant_id: req.restaurantId,
      vendor_id: vendor_id || null,
      vendor_name: vn,
      description: description || null,
      amount_due: Number(amount_due),
      due_date: String(due_date).slice(0, 10),
      status: status && ['open', 'paid', 'void'].includes(status) ? status : 'open',
      paid_at: null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/owner/:restaurantId/vendor-payables/:id', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const patch = {};
  if (req.body.vendor_name !== undefined) patch.vendor_name = String(req.body.vendor_name).trim();
  if (req.body.description !== undefined) patch.description = req.body.description;
  if (req.body.amount_due !== undefined) patch.amount_due = Number(req.body.amount_due);
  if (req.body.due_date !== undefined) patch.due_date = String(req.body.due_date).slice(0, 10);
  if (req.body.status !== undefined) {
    patch.status = req.body.status;
    if (req.body.status === 'paid') patch.paid_at = new Date().toISOString();
    if (req.body.status === 'open') patch.paid_at = null;
  }
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'No fields to update' });
  const { data, error } = await supabase
    .from('vendor_payables')
    .update(patch)
    .eq('id', req.params.id)
    .eq('restaurant_id', req.restaurantId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Employees ───────────────────────────────────────────────
router.get('/owner/:restaurantId/employees', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('restaurant_id', req.restaurantId)
    .order('full_name', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/owner/:restaurantId/employees', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const b = req.body;
  if (!b.full_name) return res.status(400).json({ error: 'full_name is required' });
  const { data, error } = await supabase
    .from('employees')
    .insert({
      restaurant_id: req.restaurantId,
      profile_id: b.profile_id || null,
      full_name: String(b.full_name).trim(),
      email: b.email || null,
      phone: b.phone || null,
      designation: b.designation || null,
      department: b.department || null,
      hire_date: b.hire_date || null,
      salary_amount: b.salary_amount != null ? Number(b.salary_amount) : null,
      salary_period: b.salary_period === 'daily' ? 'daily' : 'monthly',
      notes: b.notes || null,
      is_active: b.is_active !== false,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/owner/:restaurantId/employees/:id', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const b = req.body;
  const patch = {};
  if (b.full_name !== undefined) patch.full_name = String(b.full_name).trim();
  if (b.email !== undefined) patch.email = b.email;
  if (b.phone !== undefined) patch.phone = b.phone;
  if (b.designation !== undefined) patch.designation = b.designation;
  if (b.department !== undefined) patch.department = b.department;
  if (b.hire_date !== undefined) patch.hire_date = b.hire_date;
  if (b.salary_amount !== undefined) patch.salary_amount = b.salary_amount == null ? null : Number(b.salary_amount);
  if (b.salary_period !== undefined) patch.salary_period = b.salary_period === 'daily' ? 'daily' : 'monthly';
  if (b.notes !== undefined) patch.notes = b.notes;
  if (b.is_active !== undefined) patch.is_active = !!b.is_active;
  patch.updated_at = new Date().toISOString();
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'No fields to update' });
  const { data, error } = await supabase
    .from('employees')
    .update(patch)
    .eq('id', req.params.id)
    .eq('restaurant_id', req.restaurantId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// "Remove" = set inactive (former employee); row kept for payroll / audit
router.delete('/owner/:restaurantId/employees/:id', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const { data, error } = await supabase
    .from('employees')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .eq('restaurant_id', req.restaurantId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// ── Employment history ───────────────────────────────────────
router.get('/owner/:restaurantId/employees/:employeeId/employment-history', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const { data, error } = await supabase
    .from('employment_history')
    .select('*')
    .eq('restaurant_id', req.restaurantId)
    .eq('employee_id', req.params.employeeId)
    .order('start_date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/owner/:restaurantId/employment-history', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const { employee_id, title, department, start_date, end_date, notes } = req.body;
  if (!employee_id || !title || !start_date) {
    return res.status(400).json({ error: 'employee_id, title, and start_date are required' });
  }
  const { data, error } = await supabase
    .from('employment_history')
    .insert({
      restaurant_id: req.restaurantId,
      employee_id,
      title: String(title).trim(),
      department: department || null,
      start_date: String(start_date).slice(0, 10),
      end_date: end_date ? String(end_date).slice(0, 10) : null,
      notes: notes || null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── Employee shifts (weekly recurring) ───────────────────────
function normalizeTime(t) {
  if (t == null || t === '') return null;
  const s = String(t).trim().replace(/\+.*$/, '');
  if (/^\d{2}:\d{2}:\d{2}/.test(s)) return s.slice(0, 8);
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
}

router.get('/owner/:restaurantId/employees/:employeeId/shifts', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const { data: emp, error: eErr } = await supabase
    .from('employees')
    .select('id')
    .eq('id', req.params.employeeId)
    .eq('restaurant_id', req.restaurantId)
    .maybeSingle();
  if (eErr) return res.status(500).json({ error: eErr.message });
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const { data, error } = await supabase
    .from('employee_shifts')
    .select('*')
    .eq('restaurant_id', req.restaurantId)
    .eq('employee_id', req.params.employeeId)
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) {
    if (isEmployeeShiftsTableMissing(error)) {
      return res.status(503).json({ error: EMPLOYEE_SHIFTS_MISSING_MSG, code: 'employee_shifts_missing' });
    }
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

router.post('/owner/:restaurantId/employees/:employeeId/shifts', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const { weekday, start_time, end_time, notes } = req.body;
  const wd = Number(weekday);
  if (!Number.isInteger(wd) || wd < 0 || wd > 6) {
    return res.status(400).json({ error: 'weekday must be 0–6 (Sun–Sat)' });
  }
  const st = normalizeTime(start_time);
  const et = normalizeTime(end_time);
  if (!st || !et) return res.status(400).json({ error: 'start_time and end_time are required (HH:MM)' });

  const { data: emp, error: eErr } = await supabase
    .from('employees')
    .select('id')
    .eq('id', req.params.employeeId)
    .eq('restaurant_id', req.restaurantId)
    .maybeSingle();
  if (eErr) return res.status(500).json({ error: eErr.message });
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const { data, error } = await supabase
    .from('employee_shifts')
    .insert({
      restaurant_id: req.restaurantId,
      employee_id: req.params.employeeId,
      weekday: wd,
      start_time: st,
      end_time: et,
      notes: notes != null && String(notes).trim() ? String(notes).trim() : null,
    })
    .select()
    .single();
  if (error) {
    if (isEmployeeShiftsTableMissing(error)) {
      return res.status(503).json({ error: EMPLOYEE_SHIFTS_MISSING_MSG, code: 'employee_shifts_missing' });
    }
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

router.patch('/owner/:restaurantId/employee-shifts/:id', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const { data: row, error: fErr } = await supabase
    .from('employee_shifts')
    .select('id, restaurant_id')
    .eq('id', req.params.id)
    .single();
  if (fErr) {
    if (isEmployeeShiftsTableMissing(fErr)) {
      return res.status(503).json({ error: EMPLOYEE_SHIFTS_MISSING_MSG, code: 'employee_shifts_missing' });
    }
    return res.status(500).json({ error: fErr.message });
  }
  if (!row) return res.status(404).json({ error: 'Shift not found' });
  if (row.restaurant_id !== req.restaurantId) return res.status(403).json({ error: 'Access denied' });

  const patch = {};
  if (req.body.weekday !== undefined) {
    const wd = Number(req.body.weekday);
    if (!Number.isInteger(wd) || wd < 0 || wd > 6) {
      return res.status(400).json({ error: 'weekday must be 0–6' });
    }
    patch.weekday = wd;
  }
  if (req.body.start_time !== undefined) patch.start_time = normalizeTime(req.body.start_time);
  if (req.body.end_time !== undefined) patch.end_time = normalizeTime(req.body.end_time);
  if (req.body.notes !== undefined) patch.notes = req.body.notes != null && String(req.body.notes).trim() ? String(req.body.notes).trim() : null;
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'No fields to update' });

  const { data, error } = await supabase
    .from('employee_shifts')
    .update(patch)
    .eq('id', req.params.id)
    .eq('restaurant_id', req.restaurantId)
    .select()
    .single();
  if (error) {
    if (isEmployeeShiftsTableMissing(error)) {
      return res.status(503).json({ error: EMPLOYEE_SHIFTS_MISSING_MSG, code: 'employee_shifts_missing' });
    }
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

router.delete('/owner/:restaurantId/employee-shifts/:id', requireAuth, requireRestaurant, requireOwnerOrSuper, requireActiveStaffSubscription, async (req, res) => {
  const { data: row, error: fErr } = await supabase
    .from('employee_shifts')
    .select('id, restaurant_id')
    .eq('id', req.params.id)
    .single();
  if (fErr) {
    if (isEmployeeShiftsTableMissing(fErr)) {
      return res.status(503).json({ error: EMPLOYEE_SHIFTS_MISSING_MSG, code: 'employee_shifts_missing' });
    }
    return res.status(500).json({ error: fErr.message });
  }
  if (!row) return res.status(404).json({ error: 'Shift not found' });
  if (row.restaurant_id !== req.restaurantId) return res.status(403).json({ error: 'Access denied' });

  const { error } = await supabase.from('employee_shifts').delete().eq('id', req.params.id).eq('restaurant_id', req.restaurantId);
  if (error) {
    if (isEmployeeShiftsTableMissing(error)) {
      return res.status(503).json({ error: EMPLOYEE_SHIFTS_MISSING_MSG, code: 'employee_shifts_missing' });
    }
    return res.status(500).json({ error: error.message });
  }
  res.status(204).send();
});

export default router;
