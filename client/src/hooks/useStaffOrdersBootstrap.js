import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useOrderStore } from '../stores/orderStore';
import { supabase, DEMO_MODE } from '../lib/supabase';

const CHIME_FREQUENCY = 880;
const CHIME_DURATION = 0.3;

function playNotificationChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(CHIME_FREQUENCY, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(CHIME_FREQUENCY * 1.25, audioCtx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(CHIME_FREQUENCY * 1.5, audioCtx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + CHIME_DURATION);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + CHIME_DURATION);
  } catch {
    // AudioContext not available
  }
}

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
          if (payload.new?.status === 'pending' && payload.old == null) {
            playNotificationChime();
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

  return loading;
}
