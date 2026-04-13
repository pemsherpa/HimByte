import { aggregatePendingItems } from '../../lib/aggregateOrderItems';

export default function PendingItemsSummary({ orders, title = 'Pending item summary' }) {
  const rows = aggregatePendingItems(orders);

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col min-h-[200px] max-h-[min(70vh,560px)]">
      <div className="px-4 py-3 border-b border-border bg-canvas">
        <h3 className="text-sm font-black text-ink">{title}</h3>
        <p className="text-[11px] text-muted mt-0.5">Totals across selected tickets</p>
      </div>
      <div className="overflow-y-auto flex-1">
        {rows.length === 0 ? (
          <p className="text-sm text-muted text-center py-10 px-4">No line items</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted border-b border-border">
                <th className="px-4 py-2 font-semibold">Item</th>
                <th className="px-4 py-2 font-semibold text-right w-20">Qty</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-ink leading-snug">{r.name}</td>
                  <td className="px-4 py-2.5 text-right font-black text-primary tabular-nums">{r.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
