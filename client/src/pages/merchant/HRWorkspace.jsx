import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Clock, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { api } from '../../lib/api';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

export default function HRWorkspace() {
  const { restaurantId } = useAuthStore();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('team');
  const [shifts, setShifts] = useState([]);
  const [shiftForm, setShiftForm] = useState({
    weekday: 1,
    start_time: '09:00',
    end_time: '17:00',
    notes: '',
  });
  const [editingShift, setEditingShift] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmp, setNewEmp] = useState({
    full_name: '',
    designation: '',
    department: '',
    hire_date: '',
    salary_amount: '',
    salary_period: 'monthly',
    email: '',
    phone: '',
  });
  const [histForm, setHistForm] = useState({
    title: '',
    department: '',
    start_date: '',
    end_date: '',
    notes: '',
  });

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.is_active !== false),
    [employees],
  );

  const selected = useMemo(
    () => activeEmployees.find((e) => e.id === selectedId) || null,
    [activeEmployees, selectedId],
  );

  function loadEmployees() {
    if (!restaurantId) return;
    api
      .listEmployees(restaurantId)
      .then(setEmployees)
      .catch(() => toast.error('Could not load team'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    loadEmployees();
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId || !selectedId) {
      setHistory([]);
      return;
    }
    api
      .listEmploymentHistory(restaurantId, selectedId)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [restaurantId, selectedId]);

  useEffect(() => {
    setEditingShift(null);
  }, [selectedId]);

  useEffect(() => {
    if (!restaurantId || !selectedId || tab !== 'shifts') {
      setShifts([]);
      return;
    }
    api
      .listEmployeeShifts(restaurantId, selectedId)
      .then(setShifts)
      .catch((err) => {
        setShifts([]);
        toast.error(
          err?.message ||
            'Could not load shifts. If this is a new project, run supabase/migrations/012_employee_shifts_and_tables_rooms_rls.sql in the Supabase SQL editor.',
        );
      });
  }, [restaurantId, selectedId, tab]);

  const monthlyPayroll = useMemo(() => {
    return employees
      .filter((e) => e.is_active !== false && e.salary_period === 'monthly' && e.salary_amount != null)
      .reduce((s, e) => s + Number(e.salary_amount), 0);
  }, [employees]);

  async function handleCreateEmployee(e) {
    e.preventDefault();
    if (!restaurantId) return;
    try {
      await api.createEmployee(restaurantId, {
        full_name: newEmp.full_name,
        designation: newEmp.designation || null,
        department: newEmp.department || null,
        hire_date: newEmp.hire_date || null,
        salary_amount: newEmp.salary_amount ? Number(newEmp.salary_amount) : null,
        salary_period: newEmp.salary_period,
        email: newEmp.email || null,
        phone: newEmp.phone || null,
      });
      toast.success('Team member added');
      setShowAdd(false);
      setNewEmp({
        full_name: '',
        designation: '',
        department: '',
        hire_date: '',
        salary_amount: '',
        salary_period: 'monthly',
        email: '',
        phone: '',
      });
      loadEmployees();
    } catch {
      toast.error('Failed to add');
    }
  }

  async function handleRemoveEmployee() {
    if (!restaurantId || !selectedId || !selected) return;
    if (!window.confirm(`Mark ${selected.full_name} as inactive (no longer on the team)? Their record stays for reporting.`)) return;
    try {
      await api.deleteEmployee(restaurantId, selectedId);
      toast.success('Marked inactive');
      setSelectedId(null);
      setHistory([]);
      setLoading(true);
      api
        .listEmployees(restaurantId)
        .then(setEmployees)
        .catch(() => toast.error('Could not reload team'))
        .finally(() => setLoading(false));
    } catch (err) {
      toast.error(err.message || 'Could not remove');
    }
  }

  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function formatTime(t) {
    if (t == null) return '';
    const s = String(t);
    return s.length >= 5 ? s.slice(0, 5) : s;
  }

  async function handleAddShift(e) {
    e.preventDefault();
    if (!restaurantId || !selectedId) return;
    try {
      await api.createEmployeeShift(restaurantId, selectedId, {
        weekday: Number(shiftForm.weekday),
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time,
        notes: shiftForm.notes || null,
      });
      toast.success('Shift saved');
      setShiftForm({ weekday: 1, start_time: '09:00', end_time: '17:00', notes: '' });
      const list = await api.listEmployeeShifts(restaurantId, selectedId);
      setShifts(list || []);
    } catch (err) {
      toast.error(err.message || 'Could not save shift');
    }
  }

  async function handleUpdateShift(e) {
    e.preventDefault();
    if (!restaurantId || !editingShift?.id) return;
    try {
      await api.updateEmployeeShift(restaurantId, editingShift.id, {
        weekday: Number(editingShift.weekday),
        start_time: editingShift.start_time,
        end_time: editingShift.end_time,
        notes: editingShift.notes || null,
      });
      toast.success('Shift updated');
      setEditingShift(null);
      const list = await api.listEmployeeShifts(restaurantId, selectedId);
      setShifts(list || []);
    } catch (err) {
      toast.error(err.message || 'Could not update');
    }
  }

  async function handleDeleteShift(shiftId) {
    if (!restaurantId || !window.confirm('Remove this shift?')) return;
    try {
      await api.deleteEmployeeShift(restaurantId, shiftId);
      toast.success('Shift removed');
      const list = await api.listEmployeeShifts(restaurantId, selectedId);
      setShifts(list || []);
      if (editingShift?.id === shiftId) setEditingShift(null);
    } catch (err) {
      toast.error(err.message || 'Could not remove');
    }
  }

  async function handleAddHistory(e) {
    e.preventDefault();
    if (!restaurantId || !selectedId) return;
    try {
      await api.createEmploymentHistory(restaurantId, {
        employee_id: selectedId,
        title: histForm.title,
        department: histForm.department || null,
        start_date: histForm.start_date,
        end_date: histForm.end_date || null,
        notes: histForm.notes || null,
      });
      toast.success('History entry saved');
      setHistForm({ title: '', department: '', start_date: '', end_date: '', notes: '' });
      const h = await api.listEmploymentHistory(restaurantId, selectedId);
      setHistory(h || []);
    } catch {
      toast.error('Failed to save');
    }
  }

  if (!restaurantId) {
    return <p className="text-sm text-muted">No restaurant linked.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gold-soft flex items-center justify-center">
            <Users className="text-gold-dark" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ink">HR & team</h1>
            <p className="text-sm text-muted">Profiles, shifts, employment history, and salary notes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={tab === 'team' ? 'gold' : 'ghost'}
            className="rounded-2xl"
            onClick={() => setTab('team')}
          >
            Team
          </Button>
          <Button
            variant={tab === 'shifts' ? 'gold' : 'ghost'}
            className="rounded-2xl"
            onClick={() => setTab('shifts')}
          >
            <Clock size={16} className="inline mr-1" />
            Shifts
          </Button>
          <Button
            variant={tab === 'payroll' ? 'gold' : 'ghost'}
            className="rounded-2xl"
            onClick={() => setTab('payroll')}
          >
            Salary overview
          </Button>
        </div>
      </div>

      {tab === 'payroll' && (
        <Card className="p-6 mb-6">
          <p className="text-xs font-bold text-muted uppercase tracking-wide">Estimated monthly payroll</p>
          <p className="text-3xl font-black text-ink mt-2">Rs. {monthlyPayroll.toLocaleString()}</p>
          <p className="text-sm text-muted mt-2">
            Sum of active team on monthly salary. Daily wages are listed per person in the team tab.
          </p>
        </Card>
      )}

      {tab === 'shifts' && (
        <>
          <p className="text-sm text-muted mb-4">
            Set recurring weekly shifts (same calendar day). For overnight or split shifts, add separate rows or use notes.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
            <Card className="xl:col-span-2 overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-canvas">
                <h2 className="font-bold text-ink text-sm">Team</h2>
              </div>
              <div className="max-h-[560px] overflow-y-auto divide-y divide-border">
                {loading ? (
                  <p className="p-6 text-sm text-muted">Loading…</p>
                ) : activeEmployees.length === 0 ? (
                  <p className="p-6 text-sm text-muted">No active team members yet</p>
                ) : (
                  activeEmployees.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelectedId(e.id)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        selectedId === e.id ? 'bg-primary-soft' : 'hover:bg-canvas'
                      }`}
                    >
                      <p className="font-bold text-ink">{e.full_name}</p>
                      <p className="text-xs text-muted">
                        {e.designation || '—'}
                        {e.department ? ` · ${e.department}` : ''}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </Card>

            <Card className="xl:col-span-3 p-5 min-h-[320px]">
              {!selected ? (
                <p className="text-sm text-muted">Select a team member to view and edit their weekly shifts.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-gold-soft flex items-center justify-center">
                      <Clock className="text-gold-dark" size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-ink">{selected.full_name}</h3>
                      <p className="text-xs text-muted">Recurring weekly schedule</p>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-5">
                    {shifts.length === 0 ? (
                      <li className="text-sm text-muted border border-dashed border-border rounded-xl px-3 py-4 text-center">
                        No shifts yet — add one below.
                      </li>
                    ) : (
                      shifts.map((s) =>
                        editingShift?.id === s.id ? (
                          <li key={s.id} className="border border-primary rounded-xl p-3 bg-primary-soft/30">
                            <form onSubmit={handleUpdateShift} className="space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <label className="text-xs font-semibold text-muted">
                                  Day
                                  <select
                                    className="mt-1 w-full rounded-xl border border-border px-2 py-2 text-sm text-ink"
                                    value={editingShift.weekday}
                                    onChange={(e) =>
                                      setEditingShift((x) => ({ ...x, weekday: Number(e.target.value) }))
                                    }
                                  >
                                    {WEEKDAYS.map((name, i) => (
                                      <option key={name} value={i}>
                                        {name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                  <label className="text-xs font-semibold text-muted">
                                    Start
                                    <input
                                      type="time"
                                      required
                                      className="mt-1 w-full rounded-xl border border-border px-2 py-2 text-sm"
                                      value={formatTime(editingShift.start_time)}
                                      onChange={(e) =>
                                        setEditingShift((x) => ({ ...x, start_time: e.target.value }))
                                      }
                                    />
                                  </label>
                                  <label className="text-xs font-semibold text-muted">
                                    End
                                    <input
                                      type="time"
                                      required
                                      className="mt-1 w-full rounded-xl border border-border px-2 py-2 text-sm"
                                      value={formatTime(editingShift.end_time)}
                                      onChange={(e) =>
                                        setEditingShift((x) => ({ ...x, end_time: e.target.value }))
                                      }
                                    />
                                  </label>
                                </div>
                              </div>
                              <input
                                placeholder="Notes (optional)"
                                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                                value={editingShift.notes || ''}
                                onChange={(e) => setEditingShift((x) => ({ ...x, notes: e.target.value }))}
                              />
                              <div className="flex gap-2">
                                <Button type="submit" variant="primary" size="sm" className="rounded-xl">
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="rounded-xl"
                                  onClick={() => setEditingShift(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </li>
                        ) : (
                          <li
                            key={s.id}
                            className="flex flex-wrap items-center justify-between gap-2 border border-border rounded-xl px-3 py-2.5 bg-canvas/50"
                          >
                            <div>
                              <span className="font-semibold text-ink">{WEEKDAYS[s.weekday]}</span>
                              <span className="text-sm text-body">
                                {' '}
                                · {formatTime(s.start_time)} – {formatTime(s.end_time)}
                              </span>
                              {s.notes && <p className="text-xs text-muted mt-0.5">{s.notes}</p>}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="rounded-xl"
                                onClick={() =>
                                  setEditingShift({
                                    ...s,
                                    start_time: formatTime(s.start_time),
                                    end_time: formatTime(s.end_time),
                                  })
                                }
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => handleDeleteShift(s.id)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </li>
                        ),
                      )
                    )}
                  </ul>

                  <form onSubmit={handleAddShift} className="space-y-2 border border-border rounded-2xl p-4 bg-canvas/30">
                    <p className="text-xs font-bold text-ink">Add shift</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="text-xs font-semibold text-muted">
                        Day of week
                        <select
                          className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-ink"
                          value={shiftForm.weekday}
                          onChange={(e) =>
                            setShiftForm((x) => ({ ...x, weekday: Number(e.target.value) }))
                          }
                        >
                          {WEEKDAYS.map((name, i) => (
                            <option key={name} value={i}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-xs font-semibold text-muted">
                          Start
                          <input
                            type="time"
                            required
                            className="mt-1 w-full rounded-xl border border-border px-2 py-2 text-sm"
                            value={shiftForm.start_time}
                            onChange={(e) => setShiftForm((x) => ({ ...x, start_time: e.target.value }))}
                          />
                        </label>
                        <label className="text-xs font-semibold text-muted">
                          End
                          <input
                            type="time"
                            required
                            className="mt-1 w-full rounded-xl border border-border px-2 py-2 text-sm"
                            value={shiftForm.end_time}
                            onChange={(e) => setShiftForm((x) => ({ ...x, end_time: e.target.value }))}
                          />
                        </label>
                      </div>
                    </div>
                    <input
                      placeholder="Notes (optional)"
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                      value={shiftForm.notes}
                      onChange={(e) => setShiftForm((x) => ({ ...x, notes: e.target.value }))}
                    />
                    <Button type="submit" variant="gold" size="sm" className="rounded-xl">
                      Add shift
                    </Button>
                  </form>
                </>
              )}
            </Card>
          </div>
        </>
      )}

      {tab === 'team' && (
        <>
          <div className="flex justify-end mb-4">
            <Button variant="primary" className="rounded-2xl" onClick={() => setShowAdd(!showAdd)}>
              <Plus size={18} /> Add team member
            </Button>
          </div>

          {showAdd && (
            <motion.form
              onSubmit={handleCreateEmployee}
              className="bg-surface rounded-2xl border border-border p-5 mb-6 space-y-3"
            >
              <p className="font-bold text-ink text-sm">New employee profile</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-muted">
                  Full name
                  <input
                    required
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-ink"
                    value={newEmp.full_name}
                    onChange={(e) => setNewEmp((x) => ({ ...x, full_name: e.target.value }))}
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Designation
                  <input
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-ink"
                    value={newEmp.designation}
                    onChange={(e) => setNewEmp((x) => ({ ...x, designation: e.target.value }))}
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Department
                  <input
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-ink"
                    value={newEmp.department}
                    onChange={(e) => setNewEmp((x) => ({ ...x, department: e.target.value }))}
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Hire date
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-ink"
                    value={newEmp.hire_date}
                    onChange={(e) => setNewEmp((x) => ({ ...x, hire_date: e.target.value }))}
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Salary (Rs.)
                  <input
                    type="number"
                    min="0"
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-ink"
                    value={newEmp.salary_amount}
                    onChange={(e) => setNewEmp((x) => ({ ...x, salary_amount: e.target.value }))}
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Salary period
                  <select
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-ink"
                    value={newEmp.salary_period}
                    onChange={(e) => setNewEmp((x) => ({ ...x, salary_period: e.target.value }))}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="daily">Daily</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-muted">
                  Email
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-ink"
                    value={newEmp.email}
                    onChange={(e) => setNewEmp((x) => ({ ...x, email: e.target.value }))}
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Phone
                  <input
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-ink"
                    value={newEmp.phone}
                    onChange={(e) => setNewEmp((x) => ({ ...x, phone: e.target.value }))}
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="success" className="rounded-2xl">
                  Save
                </Button>
                <Button type="button" variant="ghost" className="rounded-2xl" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
              </div>
            </motion.form>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
            <Card className="xl:col-span-2 overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-canvas">
                <h2 className="font-bold text-ink text-sm">Team</h2>
              </div>
              <div className="max-h-[560px] overflow-y-auto divide-y divide-border">
                {loading ? (
                  <p className="p-6 text-sm text-muted">Loading…</p>
                ) : activeEmployees.length === 0 ? (
                  <p className="p-6 text-sm text-muted">No active team members yet</p>
                ) : (
                  activeEmployees.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelectedId(e.id)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        selectedId === e.id ? 'bg-primary-soft' : 'hover:bg-canvas'
                      }`}
                    >
                      <p className="font-bold text-ink">{e.full_name}</p>
                      <p className="text-xs text-muted">
                        {e.designation || '—'}
                        {e.department ? ` · ${e.department}` : ''}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </Card>

            <Card className="xl:col-span-3 p-5 min-h-[320px]">
              {!selected ? (
                <p className="text-sm text-muted">Select a team member to view profile and employment history.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-primary-soft flex items-center justify-center flex-shrink-0">
                        <Briefcase className="text-primary" size={22} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-ink">{selected.full_name}</h3>
                        <p className="text-sm text-muted">
                          {selected.designation || 'No designation'}
                          {selected.department ? ` · ${selected.department}` : ''}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          Hired: {selected.hire_date || '—'} ·{' '}
                          {selected.salary_amount != null
                            ? `Rs. ${Number(selected.salary_amount).toLocaleString()} / ${selected.salary_period}`
                            : 'Salary not set'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="rounded-xl shrink-0"
                      onClick={handleRemoveEmployee}
                    >
                      <Trash2 size={16} />                       Mark inactive
                    </Button>
                  </div>

                  <div className="border-t border-border pt-4 mt-4">
                    <h4 className="text-xs font-bold text-muted uppercase tracking-wide mb-3">
                      Employment history
                    </h4>
                    <ul className="space-y-2 mb-4">
                      {history.length === 0 ? (
                        <li className="text-sm text-muted">No history rows yet</li>
                      ) : (
                        history.map((h) => (
                          <li
                            key={h.id}
                            className="text-sm border border-border rounded-xl px-3 py-2 bg-canvas/50"
                          >
                            <span className="font-semibold text-ink">{h.title}</span>
                            {h.department && (
                              <span className="text-muted"> · {h.department}</span>
                            )}
                            <span className="text-muted">
                              {' '}
                              · {h.start_date}
                              {h.end_date ? ` → ${h.end_date}` : ' → present'}
                            </span>
                            {h.notes && <p className="text-xs text-body mt-1">{h.notes}</p>}
                          </li>
                        ))
                      )}
                    </ul>

                    <form onSubmit={handleAddHistory} className="space-y-2 border border-border rounded-2xl p-4 bg-canvas/30">
                      <p className="text-xs font-bold text-ink">Add history entry</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          required
                          placeholder="Title / role"
                          className="rounded-xl border border-border px-3 py-2 text-sm"
                          value={histForm.title}
                          onChange={(e) => setHistForm((x) => ({ ...x, title: e.target.value }))}
                        />
                        <input
                          placeholder="Department"
                          className="rounded-xl border border-border px-3 py-2 text-sm"
                          value={histForm.department}
                          onChange={(e) => setHistForm((x) => ({ ...x, department: e.target.value }))}
                        />
                        <input
                          required
                          type="date"
                          className="rounded-xl border border-border px-3 py-2 text-sm"
                          value={histForm.start_date}
                          onChange={(e) => setHistForm((x) => ({ ...x, start_date: e.target.value }))}
                        />
                        <input
                          type="date"
                          className="rounded-xl border border-border px-3 py-2 text-sm"
                          value={histForm.end_date}
                          onChange={(e) => setHistForm((x) => ({ ...x, end_date: e.target.value }))}
                        />
                      </div>
                      <textarea
                        placeholder="Notes (optional)"
                        className="w-full rounded-xl border border-border px-3 py-2 text-sm min-h-[72px]"
                        value={histForm.notes}
                        onChange={(e) => setHistForm((x) => ({ ...x, notes: e.target.value }))}
                      />
                      <Button type="submit" variant="gold" size="sm" className="rounded-xl">
                        Add entry
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
