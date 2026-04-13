import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { useCartStore } from '../../stores/cartStore';
import useGuestStore from '../../stores/guestStore';
import { computeNepalVat, formatNpr, NEPAL_VAT_RATE } from '../../lib/vat';
import { downloadSessionReceiptPdf } from '../../lib/receiptPdf';
import { DEMO_MODE } from '../../lib/supabase';
import { aggregateLinesFromOrders, pendingOrderLines } from '../../lib/billAggregation';
import toast from 'react-hot-toast';

export default function BillView({ restaurant, sessionId }) {
  const cartItems = useCartStore((s) => s.items);
  const guestEmail = useGuestStore((s) => s.email);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingLedger, setSavingLedger] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await api.trackOrders(sessionId);
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [sessionId, load]);

  const approvedLines = useMemo(
    () => aggregateLinesFromOrders(orders, { approvedOnly: true }),
    [orders],
  );
  const pendingLines = useMemo(() => pendingOrderLines(orders), [orders]);

  const billSubtotal = useMemo(
    () => Math.round(approvedLines.reduce((s, l) => s + l.line_total, 0) * 100) / 100,
    [approvedLines],
  );
  const billVat = useMemo(() => computeNepalVat(billSubtotal), [billSubtotal]);

  const pendingSubtotal = useMemo(
    () => Math.round(pendingLines.reduce((s, l) => s + l.line_total, 0) * 100) / 100,
    [pendingLines],
  );

  const cartSubtotal = useMemo(
    () => Math.round(cartItems.reduce((s, i) => s + i.price_at_time * i.quantity, 0) * 100) / 100,
    [cartItems],
  );
  const cartVat = useMemo(() => computeNepalVat(cartSubtotal), [cartSubtotal]);

  const hasBill = approvedLines.length > 0;
  const hasPending = pendingLines.length > 0;
  const hasCart = cartItems.length > 0;

  function handleDownloadPdf() {
    if (!hasBill) {
      toast.error('Nothing on your bill yet — staff must approve your order first.');
      return;
    }
    downloadSessionReceiptPdf({
      restaurantName: restaurant?.name,
      address: restaurant?.address,
      phone: restaurant?.phone,
      pan: restaurant?.vat_pan_number,
      lines: approvedLines.map((l) => ({
        name: l.name,
        quantity: l.quantity,
        unit_price: l.unit_price,
        line_total: l.line_total,
      })),
      subtotal: billVat.subtotal,
      vatAmount: billVat.vatAmount,
      vatRate: billVat.vatRate,
      total: billVat.total,
    });
    toast.success('PDF downloaded');
  }

  async function handleSaveLedger() {
    if (!restaurant?.id || !sessionId || !hasBill) return;
    if (DEMO_MODE) {
      toast('Demo mode — receipts are not stored.', { icon: 'ℹ️' });
      return;
    }
    setSavingLedger(true);
    try {
      await api.createReceiptFromSession({
        session_id: sessionId,
        restaurant_id: restaurant.id,
        guest_email: guestEmail || undefined,
      });
      toast.success('Receipt saved to your venue records');
    } catch (e) {
      toast.error(e.message || 'Could not save receipt');
    } finally {
      setSavingLedger(false);
    }
  }

  return (
    <div className="px-4 pb-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Your bill</p>
        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            load();
          }}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          disabled={refreshing}
        >
          {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Refresh
        </button>
      </div>

      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-dashed border-border">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted">
              <Loader2 className="animate-spin" size={22} />
            </div>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-lg font-bold text-ink tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                  {restaurant?.name}
                </h2>
                {restaurant?.address && (
                  <p className="text-[11px] text-muted mt-1 leading-snug">{restaurant.address}</p>
                )}
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-body">
                  {restaurant?.phone && <span>Tel: {restaurant.phone}</span>}
                  {restaurant?.vat_pan_number && (
                    <span className="whitespace-nowrap">PAN/VAT: {restaurant.vat_pan_number}</span>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-center text-muted mt-4 px-2 leading-relaxed">
                Totals below include only orders <span className="font-semibold text-body">approved by staff</span>.
                Pending orders are listed separately until accepted.
              </p>

              {hasPending && (
                <div className="mt-4 p-3 rounded-xl bg-gold-soft/80 border border-gold/25">
                  <p className="text-[10px] font-bold text-gold-dark uppercase tracking-wide mb-2">
                    Awaiting staff approval (not on bill yet)
                  </p>
                  {pendingLines.map((l) => (
                    <div key={`${l.name}-${l.unit_price}`} className="flex justify-between text-xs text-gold-dark py-0.5">
                      <span>{l.name} ×{l.quantity}</span>
                      <span className="tabular-nums">{formatNpr(l.line_total)}</span>
                    </div>
                  ))}
                  <p className="text-[11px] font-semibold text-gold-dark mt-2 pt-2 border-t border-gold/20">
                    Subtotal (pending) {formatNpr(pendingSubtotal)}
                  </p>
                </div>
              )}

              {hasBill && (
                <div className="mt-5 space-y-0">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10px] font-bold text-muted uppercase tracking-wide pb-2 border-b border-border">
                    <span>Item</span>
                    <span className="text-center w-10">Qty</span>
                    <span className="text-right w-20">Line</span>
                  </div>
                  {approvedLines.map((l) => (
                    <div
                      key={`${l.name}-${l.unit_price}`}
                      className="grid grid-cols-[1fr_auto_auto] gap-2 py-2 text-sm text-ink border-b border-border/60 last:border-0"
                    >
                      <span className="font-medium leading-tight">{l.name}</span>
                      <span className="text-center text-body w-10">{l.quantity}</span>
                      <span className="text-right font-semibold tabular-nums w-20">{formatNpr(l.line_total)}</span>
                    </div>
                  ))}
                  <div className="pt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-body">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{formatNpr(billVat.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-body">
                      <span>VAT ({Math.round(NEPAL_VAT_RATE * 100)}%)</span>
                      <span className="tabular-nums">{formatNpr(billVat.vatAmount)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-ink pt-1 border-t border-border">
                      <span>Total</span>
                      <span className="tabular-nums">{formatNpr(billVat.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              {hasCart && (
                <div className={`${hasBill || hasPending ? 'mt-5 pt-4 border-t border-dashed border-border' : 'mt-2'}`}>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">In cart (not sent)</p>
                  {cartItems.map((i) => (
                    <div key={i.menu_item_id} className="flex justify-between text-sm py-1.5 text-body">
                      <span className="pr-2">
                        {i.name}
                        <span className="text-muted"> ×{i.quantity}</span>
                      </span>
                      <span className="tabular-nums font-medium shrink-0">
                        {formatNpr(i.price_at_time * i.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs text-muted mt-2 pt-2 border-t border-border/50">
                    <span>Est. with VAT</span>
                    <span className="tabular-nums">{formatNpr(cartVat.total)}</span>
                  </div>
                </div>
              )}

              {!hasBill && !hasPending && !hasCart && (
                <p className="text-center text-sm text-muted py-6">No orders yet — browse the menu to order.</p>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-3 bg-canvas/80 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!hasBill || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-dark disabled:opacity-45 transition-colors"
          >
            <Download size={14} />
            Download PDF
          </button>
          {!DEMO_MODE && (
            <button
              type="button"
              onClick={handleSaveLedger}
              disabled={!hasBill || loading || savingLedger}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-border bg-surface text-ink hover:bg-canvas-dark disabled:opacity-45 transition-colors"
            >
              {savingLedger ? <Loader2 size={14} className="animate-spin" /> : null}
              Save to records
            </button>
          )}
        </div>
      </div>
      <p className="text-[10px] text-muted mt-2 text-center leading-relaxed">
        Nepal VAT ({Math.round(NEPAL_VAT_RATE * 100)}%) on approved items. Staff may adjust totals before payment.
      </p>
    </div>
  );
}
