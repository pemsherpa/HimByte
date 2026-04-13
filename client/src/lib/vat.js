/** Nepal VAT (standard rate) — IRD reference: 13% */
export const NEPAL_VAT_RATE = 0.13;

/**
 * Prices on menu are treated as taxable supply; VAT is added on top (exclusive basis).
 * @returns { subtotal, vatAmount, total, vatRate }
 */
export function computeNepalVat(subtotal) {
  const s = Math.round(Number(subtotal) * 100) / 100;
  const vatAmount = Math.round(s * NEPAL_VAT_RATE * 100) / 100;
  const total = Math.round((s + vatAmount) * 100) / 100;
  return {
    subtotal: s,
    vatAmount,
    total,
    vatRate: NEPAL_VAT_RATE,
  };
}

export function formatNpr(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return '—';
  return `Rs. ${x.toLocaleString('en-NP', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
