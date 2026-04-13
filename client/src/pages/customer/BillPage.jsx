import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { useCartStore } from '../../stores/cartStore';
import useGuestStore from '../../stores/guestStore';
import CustomerLayout from '../../components/layout/CustomerLayout';
import BillView from '../../components/customer/bill-view';
import GuestGateModal from '../../components/customer/guest-gate-modal';
import { matchesLocationIdentifier } from '../../lib/locationMatch';
import { DEMO_MODE, supabase } from '../../lib/supabase';

export default function BillPage() {
  const { slug: slugParam } = useParams();
  const [searchParams] = useSearchParams();
  const slug = slugParam || searchParams.get('r');
  const locationId = searchParams.get('loc');
  const locationKey = searchParams.get('location');
  const tableParam = searchParams.get('table');
  const legacyRoom = searchParams.get('room');

  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const setContext = useCartStore((s) => s.setContext);
  const sessionId = useCartStore((s) => s.sessionId);
  const guestVerified = useGuestStore((s) => s.verified);
  const hydrateGuest = useGuestStore((s) => s.hydrateForContext);
  const setGuest = useGuestStore((s) => s.setGuest);

  const queryString = useMemo(() => searchParams.toString(), [searchParams]);

  const menuBackPath = useMemo(() => {
    if (slugParam) return `/menu/${slugParam}${queryString ? `?${queryString}` : ''}`;
    return `/menu?${queryString}`;
  }, [slugParam, queryString]);

  useEffect(() => {
    if (!slug) {
      setLoadError('Missing restaurant.');
      setLoading(false);
      setRestaurant(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    api
      .getRestaurant(slug)
      .then(async (r) => {
        if (cancelled) return;
        setRestaurant(r);

        let tableRoomId = locationId || null;
        let resolvedLoc = null;

        if (locationKey || tableParam || legacyRoom) {
          try {
            const all = await api.getTablesRooms(r.id);
            const keyword = locationKey || tableParam || legacyRoom;
            resolvedLoc = all.find((t) => matchesLocationIdentifier(t, keyword));
            if (resolvedLoc) tableRoomId = resolvedLoc.id;
          } catch {
            /* ignore */
          }
        } else if (locationId) {
          try {
            const all = await api.getTablesRooms(r.id);
            resolvedLoc = all.find((t) => t.id === locationId);
          } catch {
            /* ignore */
          }
        }

        setContext(r.id, tableRoomId);
        hydrateGuest(slug, tableRoomId ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message || 'Restaurant not found.');
          setRestaurant(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, locationId, locationKey, tableParam, legacyRoom, setContext, hydrateGuest]);

  const showGuestGate = !DEMO_MODE && !!supabase && !!restaurant && !guestVerified;

  if (loading) {
    return (
      <CustomerLayout restaurantName="Bill">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-primary" size={36} />
        </div>
      </CustomerLayout>
    );
  }

  if (loadError || !restaurant) {
    return (
      <CustomerLayout restaurantName="Bill">
        <div className="px-6 py-16 text-center">
          <p className="text-ink font-bold mb-2">We couldn&apos;t open your bill</p>
          <p className="text-sm text-muted mb-6">{loadError}</p>
          <Link to="/" className="text-sm font-semibold text-primary hover:underline">
            ← Home
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout restaurantName={restaurant.name}>
      <GuestGateModal
        open={showGuestGate}
        restaurantName={restaurant.name}
        onContinue={(phone, email) => {
          const tr = useCartStore.getState().tableRoomId;
          setGuest(phone, email, slug, tr ?? null);
        }}
      />

      <div className="px-4 pt-3 pb-2">
        <Link
          to={menuBackPath}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft size={16} /> Back to menu
        </Link>
      </div>

      <BillView restaurant={restaurant} sessionId={sessionId} />
    </CustomerLayout>
  );
}
