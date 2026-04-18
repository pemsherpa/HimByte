import { useEffect, useState } from 'react';
import { Loader2, Radio, Send } from 'lucide-react';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

export default function AdminBroadcasts() {
  const [list, setList] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scope, setScope] = useState('all');
  const [picked, setPicked] = useState([]);
  const [sending, setSending] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([api.listHqBroadcasts(), api.getAllRestaurants()])
      .then(([b, r]) => {
        setList(b);
        setRestaurants(r);
      })
      .catch((e) => toast.error(e.message || 'Failed'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function toggleRid(id) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    if (scope === 'restaurants' && picked.length === 0) {
      toast.error('Select at least one venue');
      return;
    }
    setSending(true);
    try {
      await api.createHqBroadcast({
        title: title.trim(),
        body: body.trim(),
        target_scope: scope,
        restaurant_ids: scope === 'restaurants' ? picked : undefined,
      });
      toast.success('Notification published');
      setTitle('');
      setBody('');
      setPicked([]);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setSending(false);
    }
  }

  if (loading && !list.length) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink">Notifications</h1>
        <p className="text-sm text-muted mt-0.5">
          Send product updates and operational notices. Venues see a popup (once) and a list in their dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h2 className="text-sm font-black text-ink mb-4 flex items-center gap-2">
            <Radio size={16} className="text-primary" /> New broadcast
          </h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-muted uppercase">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm"
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted uppercase">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted uppercase">Audience</label>
              <div className="flex gap-3 mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === 'all'}
                    onChange={() => setScope('all')}
                  />
                  All venues
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === 'restaurants'}
                    onChange={() => setScope('restaurants')}
                  />
                  Selected venues
                </label>
              </div>
            </div>
            {scope === 'restaurants' && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-border p-2 space-y-1">
                {restaurants.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-xs py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={picked.includes(r.id)}
                      onChange={() => toggleRid(r.id)}
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            )}
            <button
              type="submit"
              disabled={sending}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send size={16} />
              {sending ? 'Sending…' : 'Publish'}
            </button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-black text-ink mb-4">Recent</h2>
          <div className="space-y-3 max-h-[520px] overflow-y-auto">
            {list.length === 0 ? (
              <p className="text-sm text-muted">No broadcasts yet.</p>
            ) : (
              list.map((b) => (
                <div key={b.id} className="p-3 rounded-xl border border-border bg-canvas-dark/50">
                  <p className="font-bold text-ink text-sm">{b.title}</p>
                  <p className="text-xs text-muted mt-1">{new Date(b.created_at).toLocaleString()}</p>
                  <p className="text-xs text-body mt-2 whitespace-pre-wrap">{b.body}</p>
                  <p className="text-[10px] font-bold text-muted mt-2 uppercase">
                    {b.target_scope === 'all' ? 'All venues' : `Selected (${(b.restaurant_ids || []).length})`}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
