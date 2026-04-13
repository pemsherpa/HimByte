import { create } from 'zustand';

export function guestStorageKey(slug, tableRoomId) {
  return `himbyte_guest_v1:${slug || 'unknown'}:${tableRoomId || 'open'}`;
}

function readStored(slug, tableRoomId) {
  try {
    const raw = sessionStorage.getItem(guestStorageKey(slug, tableRoomId));
    if (!raw) return { phone: '', email: '', verified: false };
    const j = JSON.parse(raw);
    return {
      phone: typeof j.phone === 'string' ? j.phone : '',
      email: typeof j.email === 'string' ? j.email : '',
      verified: !!j.verified,
    };
  } catch {
    return { phone: '', email: '', verified: false };
  }
}

/**
 * Lightweight guest identity for QR menu (no password).
 * Values are stored in sessionStorage per restaurant + table.
 */
const useGuestStore = create((set, get) => ({
  phone: '',
  email: '',
  verified: false,
  contextKey: '',

  /** Load or switch context (call when slug / table_room_id is known) */
  hydrateForContext: (slug, tableRoomId) => {
    const key = guestStorageKey(slug, tableRoomId);
    if (get().contextKey === key) return;
    const stored = readStored(slug, tableRoomId);
    set({ ...stored, contextKey: key });
  },

  setGuest: (phone, email, slug, tableRoomId) => {
    const key = guestStorageKey(slug, tableRoomId);
    const payload = {
      phone: String(phone).trim(),
      email: String(email).trim().toLowerCase(),
      verified: true,
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
    set({ ...payload, contextKey: key });
  },

  clearGuest: (slug, tableRoomId) => {
    sessionStorage.removeItem(guestStorageKey(slug, tableRoomId));
    set({ phone: '', email: '', verified: false, contextKey: '' });
  },
}));

export default useGuestStore;
