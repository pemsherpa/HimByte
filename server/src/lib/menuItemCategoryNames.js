/**
 * Avoid PostgREST `select('*, categories(name)')` embeds when FK metadata is missing or incompatible.
 */
export async function attachCategoryNames(db, rows) {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  if (!list.length) return Array.isArray(rows) ? [] : null;
  const ids = [...new Set(list.map((r) => r.category_id).filter(Boolean))];
  if (!ids.length) {
    const out = list.map((r) => ({ ...r, categories: { name: '—' } }));
    return Array.isArray(rows) ? out : out[0];
  }
  const { data: cats, error } = await db.from('categories').select('id, name').in('id', ids);
  if (error) {
    console.warn('[attachCategoryNames]', error.message);
  }
  const map = Object.fromEntries((cats || []).map((c) => [c.id, c.name]));
  const out = list.map((r) => ({
    ...r,
    categories: { name: map[r.category_id] || '—' },
  }));
  return Array.isArray(rows) ? out : out[0];
}
