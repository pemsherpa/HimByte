/**
 * Match a tables_rooms row to a URL keyword (table=, room=, location=).
 * Handles "Room 101" vs "101", "R101", etc.
 */
export function matchesLocationIdentifier(row, keyword) {
  if (keyword === undefined || keyword === null || keyword === '') return false;
  const kw = String(keyword).trim();
  const id = row.identifier || '';
  if (id === kw) return true;
  if (id.toLowerCase() === kw.toLowerCase()) return true;
  if (id.includes(kw)) return true;
  const idDigits = id.replace(/\D/g, '');
  const kwDigits = kw.replace(/\D/g, '');
  if (idDigits && kwDigits && idDigits === kwDigits) return true;
  return false;
}
