import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useOrderStore } from '../stores/orderStore';
import { supabase, DEMO_MODE } from '../lib/supabase';
import { playStaffOrderChime } from '../lib/staffNotificationSound';

/** Loads pending + active orders; refetches on realtime so Order Gate / KDS stay current without manual refresh. */
export function useStaffOrdersBootstrap(restaurantId) {
  const [loading, setLoading] = useState(!!restaurantId);
  const setPendingOrders = useOrderStore((s) => s.setPendingOrders);
  const setActiveOrders = useOrderStore((s) => s.setActiveOrders);

  const fetchOrders = useCallback(() => {
    if (!restaurantId) return Promise.resolve();
    return Promise.all([
      api.getRestaurantOrders(restaurantId, 'pending'),
      api.getRestaurantOrders(restaurantId),
    ]).then(([pending, all]) => {
      setPendingOrders(pending || []);
      setActiveOrders(
        (all || []).filter((o) => ['approved', 'preparing', 'ready'].includes(o.status)),
      );
    });
  }, [restaurantId, setPendingOrders, setActiveOrders]);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchOrders()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, fetchOrders]);

  /** Realtime (requires Supabase RLS + replication on `orders`); polling covers demo mode and any Realtime gaps. */
  useEffect(() => {
    if (!restaurantId || DEMO_MODE || !supabase) return;
    let t;
    const debounced = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        fetchOrders().catch(() => {});
      }, 200);
    };

    const channel = supabase
      .channel(`staff-orders-sync:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
            playStaffOrderChime();
          }
          debounced();
        },
      )
      .subscribe();

    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, fetchOrders]);

  /** Poll so Order Gate / KDS update without refresh (demo + production; fixes missing Realtime). */
  useEffect(() => {
    if (!restaurantId) return;
    const id = window.setInterval(() => {
      fetchOrders().catch(() => {});
    }, 5000);
    const onVis = () => {
      if (document.visibilityState === 'visible') fetchOrders().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [restaurantId, fetchOrders]);

  return loading;
}
