import { useEffect, useRef } from 'react';
import { supabase, DEMO_MODE } from '../lib/supabase';
import { useOrderStore } from '../stores/orderStore';

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
  const { setPendingOrders, setActiveOrders, moveOrderToActive, updateOrderInList } = useOrderStore();
  const channelRef = useRef(null);

  useEffect(() => {
    if (!restaurantId || DEMO_MODE || !supabase) return;

    const channel = supabase
      .channel(`orders:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          if (payload.new.status === 'pending') {
            setPendingOrders((prev) => [payload.new, ...(Array.isArray(prev) ? prev : [])]);
            playNotificationChime();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          const order = payload.new;
          if (order.status === 'approved') {
            moveOrderToActive(order.id);
          }
          updateOrderInList(order);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [restaurantId, setPendingOrders, setActiveOrders, moveOrderToActive, updateOrderInList]);
}

export function useRealtimeCustomerOrder(sessionId) {
  const { setCurrentOrder } = useOrderStore();

  useEffect(() => {
    if (!sessionId || DEMO_MODE || !supabase) return;

    const channel = supabase
      .channel(`customer:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setCurrentOrder(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, setCurrentOrder]);
}
