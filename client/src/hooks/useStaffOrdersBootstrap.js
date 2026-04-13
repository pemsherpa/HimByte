import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useOrderStore } from '../stores/orderStore';

/** Loads pending + active orders into the staff order store (Order Gate + KDS). */
export function useStaffOrdersBootstrap(restaurantId) {
  const [loading, setLoading] = useState(!!restaurantId);
  const setPendingOrders = useOrderStore((s) => s.setPendingOrders);
  const setActiveOrders = useOrderStore((s) => s.setActiveOrders);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.getRestaurantOrders(restaurantId, 'pending'),
      api.getRestaurantOrders(restaurantId),
    ])
      .then(([pending, all]) => {
        if (cancelled) return;
        setPendingOrders(pending || []);
        setActiveOrders(
          (all || []).filter((o) => ['approved', 'preparing', 'ready'].includes(o.status)),
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, setPendingOrders, setActiveOrders]);

  return loading;
}
