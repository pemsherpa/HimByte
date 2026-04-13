import { useEffect, useRef } from 'react';
import { supabase, DEMO_MODE } from '../lib/supabase';
import { useOrderStore } from '../stores/orderStore';
import { api } from '../lib/api';

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

export function useRealtimeOrders(restaurantId) {
  const upsertFromRealtime = useOrderStore((s) => s.upsertFromRealtime);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!restaurantId || DEMO_MODE || !supabase) return;

    const channel = supabase
      .channel(`orders-staff:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          upsertFromRealtime(payload.new);
          if (payload.new.status === 'pending') playNotificationChime();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          upsertFromRealtime(payload.new);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [restaurantId, upsertFromRealtime]);
}

const TERMINAL_STATUSES = ['served', 'cancelled'];

function pickActiveOrder(orders) {
  if (!orders?.length) return null;
  const active = orders.filter((o) => !TERMINAL_STATUSES.includes(o.status));
  if (active.length) return active[0]; // most recent non-terminal
  return null;
}

export function useRealtimeCustomerOrder(sessionId) {
  const setCurrentOrder = useOrderStore((s) => s.setCurrentOrder);
  const fetchedRef = useRef(false);

  // Re-fetch latest order on mount / sessionId change (handles page refresh)
  useEffect(() => {
    if (!sessionId) return;
    fetchedRef.current = false;

    api.trackOrders(sessionId)
      .then((orders) => {
        const active = pickActiveOrder(orders);
        if (active) setCurrentOrder(active);
        else {
          const persisted = useOrderStore.getState().currentOrder;
          if (persisted && TERMINAL_STATUSES.includes(persisted.status)) {
            setCurrentOrder(null);
          }
        }
        fetchedRef.current = true;
      })
      .catch(() => { fetchedRef.current = true; });
  }, [sessionId, setCurrentOrder]);

  // Realtime subscription for live status changes
  useEffect(() => {
    if (!sessionId || DEMO_MODE || !supabase) return;

    const merge = (row) => {
      const prev = useOrderStore.getState().currentOrder;
      if (prev && prev.id === row.id) return { ...prev, ...row };
      return row;
    };

    const channel = supabase
      .channel(`orders-guest:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setCurrentOrder(merge(payload.new));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setCurrentOrder(merge(payload.new));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, setCurrentOrder]);
}
