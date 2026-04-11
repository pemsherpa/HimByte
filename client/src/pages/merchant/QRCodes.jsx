import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Table2, BedDouble, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { DEMO_RESTAURANT_ID, DEMO_RESTAURANT_SLUG } from '../../lib/constants';
import Card from '../../components/ui/Card';

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

function QRCard({ location, slug }) {
  const qrUrl = location.qr_code_url || `${APP_URL}/scan?r=${slug}&loc=${location.id}`;
  const ref   = useRef(null);

  function handleDownload() {
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
      <div className="flex gap-2 w-full">
        <button onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary bg-primary-soft hover:bg-primary/20 px-3 py-2 rounded-xl transition-colors">
          <Download size={13} /> SVG
        </button>
        <button onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-body bg-canvas hover:bg-canvas-dark px-3 py-2 rounded-xl transition-colors border border-border">
          <Printer size={13} /> Print
        </button>
      </div>
    </Card>
  );
}

export default function QRCodes() {
  const [locations, setLocations]  = useState([]);
  const [filter, setFilter]        = useState('all');   // 'all' | 'table' | 'room'
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading]      = useState(true);

  useEffect(() => {
    Promise.all([
      api.getRestaurant(DEMO_RESTAURANT_SLUG),
      api.getTablesRooms(DEMO_RESTAURANT_ID),
    ]).then(([r, locs]) => {
      setRestaurant(r);
      setLocations(locs);
    }).finally(() => setLoading(false));
  }, []);

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
          <h1 className="text-2xl font-black text-ink">QR Codes</h1>
          <p className="text-sm text-muted mt-0.5">
            {restaurant?.name} · {tables} tables{rooms > 0 ? ` · ${rooms} rooms` : ''}
          </p>
        </div>
        <button onClick={handlePrintAll}
          className="inline-flex items-center gap-2 bg-primary text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-primary-dark transition-colors shadow-sm">
          <Printer size={16} /> Print All QR Codes
        </button>
      </div>

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
            <QRCard key={loc.id} location={loc} slug={restaurant?.slug || DEMO_RESTAURANT_SLUG} />
          ))}
        </div>
      )}
    </div>
  );
}
