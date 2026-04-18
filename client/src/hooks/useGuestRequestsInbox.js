import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { supabase, DEMO_MODE } from '../lib/supabase';
import { playGuestRequestChime } from '../lib/staffNotificationSound';

/**
 * Open guest / concierge requests (requested status) for Order Gate.
 * Realtime refresh + chime on new rows (production Supabase only).
 */
export function useGuestRequestsInbox(restaurantId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(!!restaurantId);

  const load = useCallback(() => {
    if (!restaurantId) return Promise.resolve();
    return api
      .getServiceRequests(restaurantId, 'requested')
      .then((rows) => setItems(Array.isArray(rows) ? rows : []))
      .catch(() => setItems([]));
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, load]);

  useEffect(() => {
    if (!restaurantId || DEMO_MODE || !supabase) return;
    let t;
    const debounced = () => {
      clearTimeout(t);
      t = setTimeout(() => load().catch(() => {}), 200);
    };

    const channel = supabase
      .channel(`guest-requests:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_requests',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          playGuestRequestChime();
          debounced();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        debounced,
      )
      .subscribe();

    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, load]);

  useEffect(() => {
    if (!restaurantId) return;
    const id = window.setInterval(() => load().catch(() => {}), DEMO_MODE ? 3500 : 8000);
    const onVis = () => {
      if (document.visibilityState === 'visible') load().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [restaurantId, load]);

  return { items, loading, reload: load };
}
