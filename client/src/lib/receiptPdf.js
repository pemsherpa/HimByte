import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * @param {object} opts
 * @param {string} opts.restaurantName
 * @param {string} [opts.address]
 * @param {string} [opts.phone]
 * @param {string} [opts.pan]
 * @param {Array<{ name: string, quantity: number, unit_price: number, line_total: number }>} opts.lines
 * @param {number} opts.subtotal
 * @param {number} opts.vatAmount
 * @param {number} opts.vatRate
 * @param {number} opts.total
 * @param {string} [opts.filename]
 */
export function downloadSessionReceiptPdf(opts) {
  const {
    restaurantName,
    address,
    phone,
    pan,
    lines,
    subtotal,
    vatAmount,
    vatRate,
    total,
    filename,
  } = opts;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 36;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(String(restaurantName || 'Restaurant'), pageW / 2, y, { align: 'center' });
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const meta = [address, phone ? `Tel: ${phone}` : '', pan ? `PAN/VAT: ${pan}` : ''].filter(Boolean);
  for (const line of meta) {
    doc.text(line, pageW / 2, y, { align: 'center', maxWidth: pageW - 48 });
    y += 12;
  }
  doc.setTextColor(0, 0, 0);
  y += 8;

  doc.setDrawColor(200);
  doc.line(24, y, pageW - 24, y);
  y += 16;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Tax invoice / Bill', pageW / 2, y, { align: 'center' });
  y += 14;

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Qty', 'Amount']],
    body: lines.map((l) => [
      String(l.name),
      String(l.quantity),
      formatMoney(l.line_total),
    ]),
    foot: [
      ['Subtotal', '', formatMoney(subtotal)],
      ['Total (NPR)', '', formatMoney(total)],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [245, 245, 245], textColor: [40, 40, 40], fontStyle: 'bold' },
    footStyles: { fontStyle: 'bold', fillColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 36 },
      2: { halign: 'right', cellWidth: 72 },
    },
    margin: { left: 24, right: 24 },
  });

  const finalY = doc.lastAutoTable?.finalY ?? y + 120;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Thank you for dining with us.', pageW / 2, finalY + 24, { align: 'center' });
  doc.text('Himbyte · Digital bill', pageW / 2, finalY + 38, { align: 'center' });

  const safeName = (restaurantName || 'bill').replace(/[^\w-]+/g, '-').slice(0, 40);
  doc.save(filename || `himbyte-receipt-${safeName}.pdf`);
}

function formatMoney(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return '—';
  return `Rs. ${x.toLocaleString('en-NP', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
