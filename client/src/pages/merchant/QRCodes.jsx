import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Table2, BedDouble, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

async function svgToPngDataUrl(svgEl, { size = 512, bg = '#ffffff' } = {}) {
  const svgText = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = svgUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function QRCard({ location, slug, canDelete, onDeleted }) {
  const qrUrl = location.qr_code_url || `${APP_URL}/scan?r=${slug}&loc=${location.id}`;
  const ref   = useRef(null);

  function handleDownloadSvg() {
    const svg  = ref.current?.querySelector('svg');
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `qr-${location.identifier.replace(/\s+/g, '-').toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPng() {
    const svg = ref.current?.querySelector('svg');
    if (!svg) return;
    try {
      const dataUrl = await svgToPngDataUrl(svg, { size: 768, bg: '#ffffff' });
      downloadDataUrl(dataUrl, `qr-${location.identifier.replace(/\s+/g, '-').toLowerCase()}.png`);
    } catch {
      toast.error('Could not export PNG');
    }
  }

  async function handleDownloadJpg() {
    const svg = ref.current?.querySelector('svg');
    if (!svg) return;
    try {
      const png = await svgToPngDataUrl(svg, { size: 768, bg: '#ffffff' });
      // Convert PNG dataURL -> JPEG via canvas
      const img = new Image();
      img.src = png;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const jpg = canvas.toDataURL('image/jpeg', 0.92);
      downloadDataUrl(jpg, `qr-${location.identifier.replace(/\s+/g, '-').toLowerCase()}.jpg`);
    } catch {
      toast.error('Could not export JPG');
    }
  }

  async function handleDownloadPdf() {
    const svg = ref.current?.querySelector('svg');
    if (!svg) return;
    try {
      const png = await svgToPngDataUrl(svg, { size: 768, bg: '#ffffff' });
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      let y = 64;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(String(location.identifier || 'QR Code'), pageW / 2, y, { align: 'center' });
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Scan to view menu & order', pageW / 2, y + 18, { align: 'center' });
      doc.setTextColor(0);

      const qrSize = 260;
      const x = (pageW - qrSize) / 2;
      doc.addImage(png, 'PNG', x, y + 44, qrSize, qrSize);

      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(qrUrl, pageW / 2, y + 44 + qrSize + 24, { align: 'center', maxWidth: pageW - 96 });
      doc.save(`qr-${location.identifier.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch {
      toast.error('Could not export PDF');
    }
  }

  function handlePrint() {
    const svg   = ref.current?.querySelector('svg');
    if (!svg) return;
    const win   = window.open('', '_blank');
    const html  = `
      <!DOCTYPE html><html><head><title>QR — ${location.identifier}</title>
      <style>
        body { font-family: Inter, sans-serif; display:flex; flex-direction:column;
               align-items:center; justify-content:center; min-height:100vh; margin:0;
               background:#F4F8FB; color:#0F172A; }
        .card { background:#fff; border-radius:20px; padding:32px; text-align:center;
                box-shadow:0 4px 24px rgba(0,0,0,.08); max-width:280px; }
        h2 { font-size:22px; font-weight:900; margin:16px 0 4px; }
        p  { font-size:12px; color:#64748B; margin:0 0 6px; }
        .url { font-size:9px; color:#94A3B8; word-break:break-all; margin-top:12px; }
        @media print { body { background:white; } }
      </style></head><body>
      <div class="card">
        ${svg.outerHTML}
        <h2>${location.identifier}</h2>
        <p>Scan to view menu & order</p>
        <p class="url">${qrUrl}</p>
      </div>
      <script>window.onload=()=>window.print();</script>
      </body></html>`;
    win.document.write(html);
    win.document.close();
  }

  return (
    <Card className="p-5 flex flex-col items-center text-center gap-4 hover:shadow-md transition-shadow">
      {/* QR Code */}
      <div ref={ref} className="p-3 bg-white rounded-2xl border border-border shadow-sm">
        <QRCodeSVG
          value={qrUrl}
          size={140}
          bgColor="#FFFFFF"
          fgColor="#0D2540"
          level="H"
          imageSettings={{
            src: '/favicon.svg',
            x: undefined, y: undefined,
            height: 22, width: 22,
            excavate: true,
          }}
        />
      </div>

      {/* Label */}
      <div>
        <div className="flex items-center justify-center gap-1.5 mb-1">
          {location.type === 'room'
            ? <BedDouble size={14} className="text-gold-dark" />
            : <Table2    size={14} className="text-primary"   />}
          <h3 className="font-bold text-ink text-sm">{location.identifier}</h3>
        </div>
        <p className="text-[10px] text-muted break-all leading-relaxed max-w-[160px] mx-auto">
          {qrUrl}
        </p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 w-full">
        <button onClick={handleDownloadPng}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary bg-primary-soft hover:bg-primary/20 px-3 py-2 rounded-xl transition-colors">
          <Download size={13} /> PNG
        </button>
        <button onClick={handleDownloadJpg}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary bg-primary-soft hover:bg-primary/20 px-3 py-2 rounded-xl transition-colors">
          <Download size={13} /> JPG
        </button>
        <button onClick={handleDownloadPdf}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-body bg-canvas hover:bg-canvas-dark px-3 py-2 rounded-xl transition-colors border border-border">
          <Download size={13} /> PDF
        </button>
        <button onClick={handlePrint}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-body bg-canvas hover:bg-canvas-dark px-3 py-2 rounded-xl transition-colors border border-border">
          <Printer size={13} /> Print
        </button>
      </div>

      <button onClick={handleDownloadSvg}
        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted hover:text-body underline underline-offset-4">
        Download SVG (advanced)
      </button>

      {canDelete && (
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm(`Delete ${location.identifier}? This cannot be undone.`)) return;
            try {
              await api.deleteTableRoom(location.restaurant_id, location.id);
              toast.success('Deleted');
              onDeleted?.();
            } catch (e) {
              toast.error(e?.message || 'Could not delete');
            }
          }}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-danger hover:underline"
        >
          <Trash2 size={13} /> Delete
        </button>
      )}
    </Card>
  );
}

export default function QRCodes() {
  const [locations, setLocations]  = useState([]);
  const [filter, setFilter]        = useState('all');   // 'all' | 'table' | 'room'
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading]      = useState(true);
  const [newTableLabel, setNewTableLabel] = useState('');
  const [newLocType, setNewLocType] = useState('table'); // 'table' | 'room'
  const [addingTable, setAddingTable] = useState(false);
  const { restaurantId, profile } = useAuthStore();
  const canDelete = profile?.role === 'restaurant_admin' || profile?.role === 'super_admin';

  async function handleAddTable(e) {
    e.preventDefault();
    if (!restaurantId || !newTableLabel.trim()) return;
    setAddingTable(true);
    try {
      await api.createTableRoom(restaurantId, {
        identifier: newTableLabel.trim(),
        type: newLocType === 'room' ? 'room' : 'table',
      });
      toast.success(`${newLocType === 'room' ? 'Room' : 'Table'} added — QR is ready below`);
      setNewTableLabel('');
      const locs = await api.getTablesRooms(restaurantId);
      setLocations(locs);
    } catch (err) {
      toast.error(err.message || 'Could not add table');
    } finally {
      setAddingTable(false);
    }
  }

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    Promise.all([
      api.getTablesRooms(restaurantId),
      api.getRestaurantById(restaurantId).catch(() => null),
    ])
      .then(([locs, meta]) => {
        setLocations(locs);
        if (meta) setRestaurant(meta);
        else setRestaurant({ name: profile?.full_name?.replace(' Admin', '').replace(' Staff', '') || 'Restaurant', slug: null });
      })
      .finally(() => setLoading(false));
  }, [restaurantId, profile]);

  function handlePrintAll() {
    const visible = filtered;
    const rows    = visible.map((loc) => {
      const url = loc.qr_code_url || `${APP_URL}/scan?r=${restaurant?.slug}&loc=${loc.id}`;
      return `
        <div class="card">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(url)}" width="140" height="140" />
          <h2>${loc.identifier}</h2>
          <p>Scan to order</p>
        </div>`;
    }).join('');

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>QR Codes — ${restaurant?.name}</title>
      <style>
        body { font-family: Inter,sans-serif; margin:0; padding:24px; background:#F4F8FB; }
        h1   { font-size:20px; font-weight:900; color:#0F172A; margin-bottom:24px; }
        .grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:16px; }
        .card{ background:#fff; border-radius:16px; padding:20px; text-align:center;
               box-shadow:0 2px 8px rgba(0,0,0,.06); break-inside:avoid; }
        h2   { font-size:15px; font-weight:800; margin:12px 0 4px; color:#0F172A; }
        p    { font-size:11px; color:#64748B; margin:0; }
        @media print { body { background:#fff; } }
      </style></head><body>
      <h1>${restaurant?.name} — QR Codes</h1>
      <div class="grid">${rows}</div>
      <script>window.onload=()=>window.print();</script>
    </body></html>`);
    win.document.close();
  }

  const filtered = locations.filter((l) => filter === 'all' || l.type === filter);
  const tables   = locations.filter((l) => l.type === 'table').length;
  const rooms    = locations.filter((l) => l.type === 'room').length;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-ink">Tables & rooms</h1>
          <p className="text-sm text-muted mt-0.5">
            {restaurant?.name} · {tables} tables{rooms > 0 ? ` · ${rooms} rooms` : ''}
          </p>
        </div>
        <button onClick={handlePrintAll}
          className="inline-flex items-center gap-2 bg-primary text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-primary-dark transition-colors shadow-sm">
          <Printer size={16} /> Print All QR Codes
        </button>
      </div>

      {/* Add table */}
      <Card className="p-5 mb-6">
        <h2 className="text-sm font-bold text-ink mb-2 flex items-center gap-2">
          <Plus size={16} className="text-primary" />
          Add table or room
        </h2>
        <p className="text-xs text-muted mb-3">
          Each location gets a unique QR code (stable ID in the link). Guests open the menu and orders are tied to that table or room.
        </p>
        <form onSubmit={handleAddTable} className="flex flex-wrap gap-3 items-end">
          <label className="min-w-[140px]">
            <span className="block text-[11px] font-semibold text-muted mb-1">Type</span>
            <select
              value={newLocType}
              onChange={(e) => setNewLocType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm text-ink"
            >
              <option value="table">Table</option>
              <option value="room">Room</option>
            </select>
          </label>
          <label className="flex-1 min-w-[200px]">
            <span className="block text-[11px] font-semibold text-muted mb-1">Name</span>
            <input
              value={newTableLabel}
              onChange={(e) => setNewTableLabel(e.target.value)}
              placeholder={newLocType === 'room' ? 'e.g. Room 101' : 'e.g. Table 12'}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm text-ink"
            />
          </label>
          <button
            type="submit"
            disabled={addingTable || !newTableLabel.trim()}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark disabled:opacity-50 inline-flex items-center gap-2"
          >
            {addingTable ? '…' : (
              <>
                <Plus size={16} />
                Create & show QR
              </>
            )}
          </button>
        </form>
      </Card>

      {/* Info banner */}
      <div className="bg-primary-soft border border-primary/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <RefreshCw size={18} className="text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-primary">Permanent QR Codes</p>
          <p className="text-xs text-body mt-0.5 leading-relaxed">
            These QR codes are permanently tied to each table/room ID in the database. They will never change — you can print and laminate them safely.
            Scanning opens the digital menu directly at the correct table.
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[['all','All'], ['table','Tables'], ['room','Rooms']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors
              ${filter === val ? 'bg-primary text-white' : 'bg-surface border border-border text-body hover:border-primary/30'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted text-sm">Loading QR codes…</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((loc) => (
            <QRCard
              key={loc.id}
              location={loc}
              slug={restaurant?.slug || 'venue'}
              canDelete={canDelete}
              onDeleted={async () => {
                if (!restaurantId) return;
                const locs = await api.getTablesRooms(restaurantId);
                setLocations(locs);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
