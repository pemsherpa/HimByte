/**
 * Kitchen / order gate urgency bands (minutes since order was created).
 * Green: under 5m · Yellow: 5–9m · Red: 10m+
 */
export function getOrderUrgency(createdAt) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.max(0, Math.floor(ms / 60000));
  let band = 'fresh';
  if (mins >= 10) band = 'hot';
  else if (mins >= 5) band = 'warm';
  return { band, mins };
}

export const URGENCY_STYLES = {
  fresh: {
    header: 'bg-success-soft border-b border-success/25',
    accent: 'text-success',
    chip: 'bg-success/15 text-success border border-success/30',
    border: 'border-success/20',
  },
  warm: {
    header: 'bg-warning-soft border-b border-warning/30',
    accent: 'text-warning',
    chip: 'bg-warning/15 text-warning border border-warning/35',
    border: 'border-warning/35',
  },
  hot: {
    header: 'bg-danger-soft border-b border-danger/25',
    accent: 'text-danger',
    chip: 'bg-danger/15 text-danger border border-danger/30',
    border: 'border-danger/40',
  },
};

export function formatOrderClock(iso) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}
