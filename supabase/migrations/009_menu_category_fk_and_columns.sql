-- Fix menu/category compatibility: columns some DBs lack, and FK for referential integrity.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_service_category BOOLEAN DEFAULT FALSE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- Backfill priority from sort_order when present (older schema used sort_order only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'sort_order'
  ) THEN
    UPDATE categories SET priority = COALESCE(sort_order, priority, 0) WHERE priority IS NULL;
  END IF;
END $$;

-- FK menu_items.category_id -> categories(id) (PostgREST embeds need this)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'menu_items'
      AND constraint_name = 'menu_items_category_id_fkey'
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
