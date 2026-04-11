import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Utensils, BedDouble, Loader2, MapPin } from 'lucide-react';
import { api } from '../../lib/api';
import { useCartStore } from '../../stores/cartStore';
import MandalaBackground from '../../components/patterns/MandalaBackground';

export default function QRLanding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setContext = useCartStore((s) => s.setContext);

  const [restaurant, setRestaurant] = useState(null);
  const [location, setLocation] = useState(null);   // tables_rooms row
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const slug          = searchParams.get('r');
  const locationId    = searchParams.get('loc');   // tables_rooms.id
  const legacyTable   = searchParams.get('table');  // fallback legacy param
  const legacyRoom    = searchParams.get('room');

  useEffect(() => {
    if (!slug) { setError('Invalid QR code — no restaurant specified.'); setLoading(false); return; }
    api.getRestaurant(slug)
      .then(async (data) => {
        setRestaurant(data);

        // Resolve location
        if (locationId) {
          const all = await api.getTablesRooms(data.id);
          const loc = all.find((t) => t.id === locationId);
          if (loc) {
            setLocation(loc);
            setContext(data.id, loc.id);
          }
        } else if (legacyTable) {
          // legacy QR: ?r=slug&table=1
          const all = await api.getTablesRooms(data.id, 'table');
          const loc = all.find((t) => t.identifier.includes(legacyTable));
          setLocation(loc || { id: null, identifier: `Table ${legacyTable}`, type: 'table' });
          setContext(data.id, loc?.id || null);
        } else if (legacyRoom) {
          const all = await api.getTablesRooms(data.id, 'room');
          const loc = all.find((t) => t.identifier.includes(legacyRoom));
          setLocation(loc || { id: null, identifier: `Room ${legacyRoom}`, type: 'room' });
          setContext(data.id, loc?.id || null);
        } else {
          setContext(data.id, null);
        }
      })
      .catch(() => setError('Restaurant not found or currently unavailable.'))
      .finally(() => setLoading(false));
  }, [slug, locationId, legacyTable, legacyRoom, setContext]);

  if (loading) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={36} />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-soft rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🏔️</span>
        </div>
        <h1 className="text-xl font-bold text-ink mb-2">Oops!</h1>
        <p className="text-muted text-sm">{error}</p>
      </div>
    </div>
  );

  const isRoom = location?.type === 'room';
  const menuPath = `/menu?r=${slug}${locationId ? `&loc=${locationId}` : legacyTable ? `&table=${legacyTable}` : legacyRoom ? `&room=${legacyRoom}` : ''}`;
  const servicesPath = `/services?r=${slug}${locationId ? `&loc=${locationId}` : legacyRoom ? `&room=${legacyRoom}` : ''}`;

  return (
    <div className="min-h-screen bg-canvas relative overflow-hidden">
      <MandalaBackground opacity={0.06} />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center">
        {/* Logo / avatar */}
        {restaurant.logo_url
          ? <img src={restaurant.logo_url} alt={restaurant.name} className="w-20 h-20 rounded-2xl mx-auto mb-5 shadow-lg" />
          : (
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
              <span className="text-white text-3xl font-black">{restaurant.name[0]}</span>
            </div>
          )
        }

        <h1 className="text-2xl font-black text-ink mb-1">{restaurant.name}</h1>
        {restaurant.address && (
          <p className="text-sm text-muted flex items-center justify-center gap-1 mb-2">
            <MapPin size={13} /> {restaurant.address}
          </p>
        )}

        {location && (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold mt-2 mb-6
            ${isRoom ? 'bg-gold-soft text-gold-dark' : 'bg-primary-soft text-primary'}`}>
            {isRoom ? <BedDouble size={14} /> : <Utensils size={14} />}
            {location.identifier}
          </div>
        )}

        <div className="w-full max-w-xs space-y-3 mt-4">
          <button
            onClick={() => navigate(menuPath)}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors flex items-center justify-center gap-2.5 active:scale-95">
            <Utensils size={20} />
            {isRoom ? 'Room Service Menu' : 'View Menu & Order'}
          </button>

          {isRoom && (
            <button
              onClick={() => navigate(servicesPath)}
              className="w-full bg-surface text-ink py-4 rounded-2xl font-bold text-base shadow-sm border border-border hover:border-gold transition-colors flex items-center justify-center gap-2.5 active:scale-95">
              <BedDouble size={20} />
              Hotel Services
            </button>
          )}
        </div>

        <p className="mt-10 text-xs text-muted">
          Powered by <span className="font-bold text-primary">Himbyte</span> · Nepal's Restaurant OS
        </p>
      </div>
    </div>
  );
}
