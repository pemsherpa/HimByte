import { useEffect, useState } from 'react';
import { Loader2, Bell } from 'lucide-react';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

export default function MerchantHqNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .getVenueNotifications()
      .then((d) => setItems(d.items || []))
      .catch((e) => toast.error(e.message || 'Failed'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id) {
    try {
      await api.markVenueNotificationRead(id);
      load();
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink flex items-center gap-2">
          <Bell className="text-primary" size={26} />
          From Himbyte
        </h1>
        <p className="text-sm text-muted mt-0.5">Product updates and notices from the Himbyte team.</p>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted">No notifications yet.</Card>
        ) : (
          items.map((b) => (
            <Card
              key={b.id}
              className={`p-5 ${!b.read_at ? 'border-primary/40 bg-primary-soft/20' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-ink">{b.title}</h2>
                  <p className="text-xs text-muted mt-1">{new Date(b.created_at).toLocaleString()}</p>
                  <p className="text-sm text-body mt-3 whitespace-pre-wrap">{b.body}</p>
                </div>
                {!b.read_at && (
                  <button
                    type="button"
                    onClick={() => markRead(b.id)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-primary text-white shrink-0"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
