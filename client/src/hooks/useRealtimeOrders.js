import { useEffect, useRef } from 'react';
import { supabase, DEMO_MODE } from '../lib/supabase';
import { useOrderStore } from '../stores/orderStore';
import { api } from '../lib/api';

/** Staff order lists (Order Gate, KDS) use `useStaffOrdersBootstrap` for live refetch + chime. */

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

  // Realtime: merge for instant UI, then debounced full refetch (includes order_items + table label)
  useEffect(() => {
    if (!sessionId || DEMO_MODE || !supabase) return;

    let debounceT;
    const refetchFull = () => {
      clearTimeout(debounceT);
      debounceT = setTimeout(() => {
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
          })
          .catch(() => {});
      }, 200);
    };

    const merge = (row) => {
      const prev = useOrderStore.getState().currentOrder;
      if (prev && prev.id === row.id) return { ...prev, ...row };
      return row;
    };

    const channel = supabase
      .channel(`orders-guest:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.new) setCurrentOrder(merge(payload.new));
          refetchFull();
        },
      )
      .subscribe();

    return () => {
      clearTimeout(debounceT);
      supabase.removeChannel(channel);
    };
  }, [sessionId, setCurrentOrder]);
}
