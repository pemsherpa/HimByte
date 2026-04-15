-- Staff JWT can list/update orders for their tenant (settle table, order gate, KDS).
-- Without this, only orders_anon_insert exists from 000_full_schema — UPDATE always fails when the API uses the anon key + JWT (no service role).

DROP POLICY IF EXISTS orders_tenant_select ON public.orders;
CREATE POLICY orders_tenant_select ON public.orders FOR SELECT USING (
  restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS orders_tenant_update ON public.orders;
CREATE POLICY orders_tenant_update ON public.orders FOR UPDATE USING (
  restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
) WITH CHECK (
  restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Nested selects (order_items → menu_items) for staff lists / settle receipt snapshot
DROP POLICY IF EXISTS order_items_tenant_select ON public.order_items;
CREATE POLICY order_items_tenant_select ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
    AND (
      o.restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
  )
);

-- Staff can read all menu rows for their restaurant (not only is_available = true)
DROP POLICY IF EXISTS menu_items_tenant_select ON public.menu_items;
CREATE POLICY menu_items_tenant_select ON public.menu_items FOR SELECT USING (
  restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
