import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Receipt, X, CreditCard, Split, ArrowRightLeft,
  Printer, Loader2, Table2, BedDouble, CheckCircle,
  Users, Minus, Plus, Wallet,
} from 'lucide-react';
import { api } from '../../lib/api';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { supabase, DEMO_MODE } from '../../lib/supabase';
import { submitEsewaFormPost } from '../../lib/esewaForm.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function BillDrawer({ tableRoomId, onClose, allTables, restaurantName, onSettled }) {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [splitWays, setSplitWays] = useState(2);
  const [splitResult, setSplitResult] = useState(null);
  const [splitMode, setSplitMode] = useState('equal');
  const [numItemGroups, setNumItemGroups] = useState(2);
  const [itemGroupAssignment, setItemGroupAssignment] = useState({});
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [esewaEnabled, setEsewaEnabled] = useState(false);
  const [esewaHost, setEsewaHost] = useState('');
  const [esewaLoading, setEsewaLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const load = useCallback(() => {
    if (!tableRoomId) return;
    setLoading(true);
    api.getTableBill(tableRoomId)
      .then(setBill)
      .catch(() => toast.error('Failed to load bill'))
      .finally(() => setLoading(false));
  }, [tableRoomId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.getEsewaConfig()
      .then((c) => {
        setEsewaEnabled(!!c.enabled);
        setEsewaHost(String(c?.form_host || ''));
      })
      .catch(() => {
        setEsewaEnabled(false);
        setEsewaHost('');
      });
  }, []);

  useEffect(() => {
    if (!tableRoomId || DEMO_MODE || !supabase) return;
    let t;
    const debounced = () => {
      clearTimeout(t);
      t = setTimeout(() => load(), 200);
    };
    const channel = supabase
      .channel(`bill-drawer:${tableRoomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `table_room_id=eq.${tableRoomId}` },
        debounced,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tables_rooms', filter: `id=eq.${tableRoomId}` },
        debounced,
      )
      .subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [tableRoomId, load]);

  useEffect(() => {
    if (!bill?.items?.length) return;
    setItemGroupAssignment((prev) => {
      const next = { ...prev };
      bill.items.forEach((i) => {
        if (next[i.order_item_id] === undefined) next[i.order_item_id] = 0;
      });
      return next;
    });
  }, [bill?.items]);

  async function handleSettle() {
    if (!window.confirm('Settle this table? All active orders will be marked as served and the bill reset to Rs. 0.')) return;
    setSettling(true);
    try {
      const res = await api.settleTable(tableRoomId, { payment_method: paymentMethod });
      const pmLabel = { cash: 'Cash', digital_wallet: 'Digital wallet', bank_transfer: 'Bank transfer' }[paymentMethod] || paymentMethod;
      toast.success(`Table settled (${pmLabel}) — Rs. ${res.settled_total}`);
      onSettled?.();
      onClose();
    } catch (e) {
      toast.error(e?.message || 'Failed to settle');
    } finally {
      setSettling(false);
    }
  }

  async function handleSplitEqual() {
    try {
      const res = await api.splitBill(tableRoomId, { mode: 'equal', num_ways: splitWays });
      setSplitResult(res);
    } catch { toast.error('Failed to calculate split'); }
  }

  async function handleSplitByItem() {
    if (!bill?.items?.length) return;
    const n = Math.min(8, Math.max(2, numItemGroups));
    const item_groups = [];
    for (let g = 0; g < n; g += 1) {
      const order_item_ids = bill.items
        .filter((i) => (itemGroupAssignment[i.order_item_id] ?? 0) === g)
        .map((i) => i.order_item_id);
      item_groups.push({ label: `Guest ${g + 1}`, order_item_ids });
    }
    try {
      const res = await api.splitBill(tableRoomId, { mode: 'by_item', item_groups });
      setSplitResult(res);
    } catch { toast.error('Failed to calculate split'); }
  }

  async function handleEsewaPayAtCounter() {
    if (!tableRoomId) return;
    if (Number(bill?.running_total || 0) <= 0) {
      toast.error('Nothing on the running bill to charge.');
      return;
    }
    setEsewaLoading(true);
    try {
      const r = await api.initEsewaTableBill(tableRoomId);
      submitEsewaFormPost(r.formUrl, r.fields);
    } catch (e) {
      toast.error(e?.message || 'Could not start eSewa');
    } finally {
      setEsewaLoading(false);
    }
  }

  async function handleTransfer() {
    if (!transferTarget || !selectedOrders.length) {
      toast.error('Select a target table and at least one order');
      return;
    }
    try {
      const res = await api.transferOrders(tableRoomId, {
        target_table_id: transferTarget,
        order_ids: selectedOrders,
      });
      toast.success(`Transferred ${res.moved_orders} order(s), Rs. ${res.moved_total}`);
      setShowTransfer(false);
      setSelectedOrders([]);
      load();
      onSettled?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to transfer');
    }
  }

  function handlePrint() {
    const w = window.open('', '_blank', 'width=380,height=600');
    if (!w || !bill) return;
    const venue = restaurantName || 'Restaurant';
    const when = new Date().toLocaleString();
    const pending = bill.pending_items || [];
    const rowsOnBill = bill.items.map((i) =>
      `<tr><td>${escapeHtml(i.name)}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">Rs. ${i.line_total}</td></tr>`
    ).join('');
    const rowsPending = pending.length
      ? `<tr><td colspan="3" style="font-size:11px;padding-top:10px;color:#666">Awaiting staff approval (not on bill yet)</td></tr>${pending.map((i) =>
          `<tr><td>${escapeHtml(i.name)}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">Rs. ${i.line_total}</td></tr>`).join('')}`
      : '';
    const rows = rowsOnBill + rowsPending;
    w.document.write(`<!DOCTYPE html><html><head><title>Bill — ${escapeHtml(bill.table.identifier)}</title>
<style>body{font-family:system-ui,monospace;padding:16px;max-width:360px;margin:0 auto}table{width:100%;border-collapse:collapse}
td{padding:4px 0;font-size:13px;border-bottom:1px dashed #ccc}h2{margin:0 0 4px}p{margin:2px 0;font-size:12px;color:#666}
.total{font-size:16px;font-weight:bold;border-top:2px solid #000;padding-top:8px;margin-top:8px}
@media print{body{padding:0}}</style></head><body>
<p style="font-size:11px;color:#666">${escapeHtml(venue)}</p>
<h2>${escapeHtml(bill.table.identifier)}</h2><p>Bill · ${when}</p><hr/>
<table><thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Amount</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="total">On bill: Rs. ${bill.subtotal}${pending.length ? ` · Pending approval: Rs. ${bill.pending_subtotal ?? 0}` : ''}</div>
<p style="margin-top:16px;text-align:center;font-size:11px">Thank you! — Himbyte</p>
<script>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
  }

  const otherTables = (allTables || []).filter((t) => t.id !== tableRoomId);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/40 z-40" />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-surface z-50 flex min-h-0 flex-col shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Receipt size={18} className="text-primary" />
            <h2 className="text-base font-bold text-ink">{bill?.table?.identifier || 'Bill'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas">
            <X size={18} className="text-muted" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : !bill?.items?.length && !(bill?.pending_items?.length) ? (
            <div className="text-center py-16 text-muted">
              <Receipt size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No active orders on this table.</p>
            </div>
          ) : (
            <>
              {bill.items?.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-2">On the bill (approved)</p>
                  <div className="space-y-2 mb-5">
                    {bill.items.map((item) => (
                      <div key={item.order_item_id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{item.name}</p>
                          <p className="text-xs text-muted">
                            Rs. {item.price_at_time} x {item.quantity}
                            {showTransfer && (
                              <span className="ml-1.5">
                                <Badge status={item.order_status} className="text-[9px]" />
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-ink">Rs. {item.line_total}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {(bill.pending_items?.length > 0) && (
                <>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-2">Awaiting staff approval</p>
                  <div className="space-y-2 mb-5 rounded-xl border border-gold/30 bg-gold-soft/40 px-3 py-2">
                    {bill.pending_items.map((item) => (
                      <div key={item.order_item_id} className="flex items-center gap-3 py-2 border-b border-gold/20 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{item.name}</p>
                          <p className="text-xs text-muted">
                            Rs. {item.price_at_time} x {item.quantity}
                            {showTransfer && (
                              <span className="ml-1.5">
                                <Badge status={item.order_status} className="text-[9px]" />
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-ink">Rs. {item.line_total}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="bg-canvas rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">Subtotal (on bill)</span>
                  <span className="text-lg font-black text-primary">Rs. {bill.subtotal}</span>
                </div>
                {(bill.pending_subtotal > 0) && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted">Not on bill until approved</span>
                    <span className="text-sm font-semibold text-body">Rs. {bill.pending_subtotal}</span>
                  </div>
                )}
                {Math.abs(Number(bill.subtotal || 0) - Number(bill.running_total || 0)) > 0.01 && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <span className="text-xs text-muted">Running total (table)</span>
                    <span className="text-sm font-semibold text-body">Rs. {bill.running_total}</span>
                  </div>
                )}
              </div>

              <Card className="p-4 mb-5 border border-primary/20 bg-primary-soft/25">
                <p className="text-xs font-bold text-muted uppercase mb-1">Pay at counter (eSewa)</p>
                <p className="text-[11px] text-body mb-3 leading-relaxed">
                  Charges the <span className="font-semibold text-ink">running bill total</span> via eSewa ePay v2 (testing portal when UAT is configured).
                  UAT test login: eSewa ID 9806800001–9806800005, password Nepal@123, verification token 123456 — see{' '}
                  <a href="https://developer.esewa.com.np/pages/Test-credentials" target="_blank" rel="noreferrer" className="text-primary font-medium underline">
                    eSewa test credentials
                  </a>.
                </p>
                <button
                  type="button"
                  onClick={handleEsewaPayAtCounter}
                  disabled={!esewaEnabled || settling || esewaLoading || Number(bill.running_total || 0) <= 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {esewaLoading ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                  Pay Rs. {Number(bill.running_total || 0).toLocaleString()} with eSewa
                </button>
                {esewaEnabled && esewaHost && (
                  <p className="text-[10px] text-muted mt-2">
                    Payment host: <span className="font-mono text-ink/80">{esewaHost}</span>
                  </p>
                )}
                {!esewaEnabled && (
                  <p className="text-[10px] text-muted mt-2">
                    Add <span className="font-mono text-ink/80">ESEWA_SECRET_KEY</span> to server env to enable (see .env.example).
                  </p>
                )}
              </Card>

              {/* Split bill section */}
              <AnimatePresence>
                {showSplit && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                    <Card className="p-4">
                      <p className="text-xs font-bold text-muted uppercase mb-2">Split bill</p>
                      <div className="flex gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => { setSplitMode('equal'); setSplitResult(null); }}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border ${splitMode === 'equal' ? 'bg-primary text-white border-primary' : 'bg-canvas border-border text-body'}`}
                        >
                          Equal
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSplitMode('by_item'); setSplitResult(null); }}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border ${splitMode === 'by_item' ? 'bg-primary text-white border-primary' : 'bg-canvas border-border text-body'}`}
                        >
                          By item
                        </button>
                      </div>

                      {splitMode === 'equal' && (
                        <>
                          <div className="flex items-center gap-3 mb-3">
                            <button type="button" onClick={() => setSplitWays(Math.max(2, splitWays - 1))} className="w-8 h-8 rounded-xl border border-border flex items-center justify-center"><Minus size={14} /></button>
                            <span className="text-lg font-black text-ink">{splitWays}</span>
                            <button type="button" onClick={() => setSplitWays(splitWays + 1)} className="w-8 h-8 rounded-xl border border-border flex items-center justify-center"><Plus size={14} /></button>
                            <span className="text-sm text-muted">people</span>
                            <button type="button" onClick={handleSplitEqual} className="ml-auto px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl">Calculate</button>
                          </div>
                          <p className="text-[10px] text-muted mb-2">Splits the table total equally (uses running bill total).</p>
                        </>
                      )}

                      {splitMode === 'by_item' && (
                        <>
                          <div className="flex items-center gap-2 mb-3">
                            <label className="text-xs text-muted">Groups</label>
                            <select
                              value={numItemGroups}
                              onChange={(e) => setNumItemGroups(Number(e.target.value))}
                              className="px-2 py-1.5 rounded-lg border border-border bg-canvas text-sm text-ink"
                            >
                              {[2, 3, 4, 5, 6].map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                            <button type="button" onClick={handleSplitByItem} className="ml-auto px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl">Calculate</button>
                          </div>
                          <p className="text-[10px] text-muted mb-2">Assign each line to a guest group, then calculate amounts.</p>
                          <div className="space-y-2 mb-2 max-h-48 overflow-y-auto">
                            {bill.items.map((item) => (
                              <div key={item.order_item_id} className="flex items-center gap-2 text-xs">
                                <span className="flex-1 truncate text-body">{item.name}</span>
                                <span className="text-muted shrink-0">Rs.{item.line_total}</span>
                                <select
                                  value={itemGroupAssignment[item.order_item_id] ?? 0}
                                  onChange={(e) => setItemGroupAssignment((prev) => ({
                                    ...prev,
                                    [item.order_item_id]: Number(e.target.value),
                                  }))}
                                  className="px-2 py-1 rounded-lg border border-border bg-surface text-ink text-[11px] max-w-[100px]"
                                >
                                  {Array.from({ length: numItemGroups }, (_, g) => (
                                    <option key={g} value={g}>Guest {g + 1}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {splitResult && (
                        <div className="space-y-1.5 mt-3 pt-3 border-t border-border">
                          <p className="text-[10px] font-bold text-muted uppercase">Result · Total Rs. {splitResult.total}</p>
                          {splitResult.splits.map((s, i) => (
                            <div key={i} className="flex justify-between items-center bg-canvas px-3 py-2 rounded-lg">
                              <span className="text-sm text-body flex items-center gap-1.5"><Users size={13} /> {s.label}</span>
                              <span className="text-sm font-bold text-ink">Rs. {s.amount}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Transfer section */}
              <AnimatePresence>
                {showTransfer && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                    <Card className="p-4">
                      <p className="text-xs font-bold text-muted uppercase mb-2">Transfer Orders</p>
                      <select value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm text-ink mb-3">
                        <option value="">Select target table…</option>
                        {otherTables.map((t) => (
                          <option key={t.id} value={t.id}>{t.identifier}</option>
                        ))}
                      </select>
                      <div className="space-y-1 mb-3">
                        {(bill.orders || []).filter((o) => o.status !== 'cancelled').map((o) => (
                          <label key={o.id} className="flex items-center gap-2 px-3 py-2 bg-canvas rounded-lg cursor-pointer">
                            <input type="checkbox" checked={selectedOrders.includes(o.id)}
                              onChange={(e) => setSelectedOrders((prev) =>
                                e.target.checked ? [...prev, o.id] : prev.filter((x) => x !== o.id))}
                              className="accent-primary" />
                            <span className="text-sm text-body flex-1">Order Rs. {o.total_price}</span>
                            <Badge status={o.status} className="text-[9px]" />
                          </label>
                        ))}
                      </div>
                      <button onClick={handleTransfer} disabled={!transferTarget || !selectedOrders.length}
                        className="w-full py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-40">
                        Transfer Selected
                      </button>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {(bill?.items?.length > 0 || bill?.pending_items?.length > 0) && (
          <div className="shrink-0 border-t border-border bg-surface px-5 py-4 space-y-2 relative z-10">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setShowSplit(!showSplit); setShowTransfer(false); }}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-colors
                  ${showSplit ? 'bg-primary text-white border-primary' : 'bg-surface text-body border-border hover:border-primary/40'}`}>
                <Split size={15} /> Split Bill
              </button>
              <button onClick={() => { setShowTransfer(!showTransfer); setShowSplit(false); }}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-colors
                  ${showTransfer ? 'bg-primary text-white border-primary' : 'bg-surface text-body border-border hover:border-primary/40'}`}>
                <ArrowRightLeft size={15} /> Transfer
              </button>
            </div>
            <div className="mb-3">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wide block mb-1.5">Payment method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm text-ink"
              >
                <option value="cash">Cash</option>
                <option value="digital_wallet">Digital wallet</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handlePrint}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-surface text-body border border-border hover:border-primary/40">
                <Printer size={15} /> Print Bill
              </button>
              <button onClick={handleSettle} disabled={settling}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-gold text-ink hover:bg-gold-light disabled:opacity-50">
                {settling ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                Settle Table
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}

export default function TableBills() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [restaurantName, setRestaurantName] = useState('');
  const { restaurantId } = useAuthStore();

  useEffect(() => {
    if (!restaurantId) return;
    api.getRestaurantById(restaurantId)
      .then((r) => setRestaurantName(r?.name || ''))
      .catch(() => {});
  }, [restaurantId]);

  const load = useCallback(() => {
    if (!restaurantId) { setLoading(false); return; }
    setLoading(true);
    api.getTableBills(restaurantId)
      .then(setTables)
      .catch(() => toast.error('Failed to load tables'))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!restaurantId || DEMO_MODE || !supabase) return;
    let t;
    const debounced = () => {
      clearTimeout(t);
      t = setTimeout(() => load(), 200);
    };
    const channel = supabase
      .channel(`table-bills-list:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables_rooms', filter: `restaurant_id=eq.${restaurantId}` },
        debounced,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        debounced,
      )
      .subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, load]);

  if (!restaurantId) return (
    <div>
      <h1 className="text-2xl font-black text-ink">Table Bills</h1>
      <p className="mt-3 text-sm text-muted">No restaurant linked to this login.</p>
    </div>
  );

  const activeTables = tables.filter((t) => Number(t.running_total || 0) > 0);
  const emptyTables = tables.filter((t) => !Number(t.running_total || 0));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink">Table Bills</h1>
        <p className="text-sm text-muted mt-0.5">View, settle, split, or transfer active bills.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : (
        <>
          {activeTables.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Active Bills ({activeTables.length})</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {activeTables.map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card onClick={() => setSelectedTable(t.id)} className="p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        {t.type === 'room' ? <BedDouble size={16} className="text-gold-dark" /> : <Table2 size={16} className="text-primary" />}
                        <span className="text-sm font-bold text-ink">{t.identifier}</span>
                      </div>
                      <p className="text-xl font-black text-primary">Rs. {Number(t.running_total || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-muted mt-1">Tap to view bill</p>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-widest mb-3">
              {activeTables.length > 0 ? 'Empty Tables' : 'All Tables'} ({emptyTables.length})
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {emptyTables.map((t) => (
                <Card key={t.id} onClick={() => setSelectedTable(t.id)}
                  className="p-3 text-center cursor-pointer hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    {t.type === 'room' ? <BedDouble size={13} className="text-muted" /> : <Table2 size={13} className="text-muted" />}
                    <span className="text-xs font-semibold text-body">{t.identifier}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    {t.last_paid_at ? (
                      <>
                        <CheckCircle size={11} className="text-success" />
                        <span className="text-[10px] text-success font-medium">Paid</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={11} className="text-success" />
                        <span className="text-[10px] text-success font-medium">Free</span>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {tables.length === 0 && (
            <Card className="p-10 text-center">
              <Table2 size={36} className="mx-auto text-muted mb-3 opacity-20" />
              <p className="text-sm text-muted">No tables or rooms configured yet.</p>
            </Card>
          )}
        </>
      )}

      <AnimatePresence>
        {selectedTable && (
          <BillDrawer
            tableRoomId={selectedTable}
            allTables={tables}
            restaurantName={restaurantName}
            onClose={() => setSelectedTable(null)}
            onSettled={load}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
