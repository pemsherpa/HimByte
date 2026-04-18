import { useEffect, useState } from 'react';
import { Loader2, MessageSquare, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

const STATUSES = ['open', 'awaiting_hq', 'resolved', 'closed'];

export default function AdminSupportInbox() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('');

  function loadList() {
    setLoading(true);
    api
      .listSupportTicketsAdmin(filter || undefined)
      .then(setTickets)
      .catch((e) => toast.error(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadList();
  }, [filter]);

  async function openTicket(t) {
    setSelected(t);
    setThread(null);
    try {
      const data = await api.getSupportTicketAdmin(t.id);
      setThread(data);
    } catch (e) {
      toast.error(e.message || 'Failed to load thread');
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      await api.replySupportTicketAdmin(selected.id, reply.trim());
      setReply('');
      const data = await api.getSupportTicketAdmin(selected.id);
      setThread(data);
      loadList();
      toast.success('Reply sent');
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setSending(false);
    }
  }

  async function setStatus(status) {
    if (!selected) return;
    try {
      await api.patchSupportTicketAdmin(selected.id, { status });
      const data = await api.getSupportTicketAdmin(selected.id);
      setThread(data);
      setSelected((s) => ({ ...s, status }));
      loadList();
      toast.success('Status updated');
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  }

  if (loading && !tickets.length) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-[60vh]">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-ink">Support</h1>
            <p className="text-sm text-muted mt-0.5">Venue queries and chat history (Himbyte HQ).</p>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-border bg-surface"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          {tickets.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted">No tickets yet.</Card>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openTicket(t)}
                className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                  selected?.id === t.id
                    ? 'border-primary bg-primary-soft/50'
                    : 'border-border bg-surface hover:bg-canvas-dark'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-ink text-sm line-clamp-2">{t.subject}</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-canvas-dark text-muted shrink-0">
                    {t.status?.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">{t.restaurants?.name || 'Venue'}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <Card className="p-5 flex flex-col min-h-[420px]">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted">
            Select a ticket
          </div>
        ) : !thread ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2 mb-4 pb-3 border-b border-border">
              <div>
                <h2 className="font-black text-ink text-sm">{thread.ticket.subject}</h2>
                <p className="text-xs text-muted mt-0.5">{thread.ticket.restaurants?.name}</p>
              </div>
              <select
                value={thread.ticket.status}
                onChange={(e) => setStatus(e.target.value)}
                className="text-xs font-bold px-2 py-1.5 rounded-xl border border-border bg-canvas shrink-0"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[340px]">
              {(thread.messages || []).map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl p-3 text-sm ${
                    m.is_hq_reply
                      ? 'bg-gold-soft border border-gold/30 ml-4'
                      : 'bg-canvas-dark border border-border mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted mb-1">
                    <span>{m.is_hq_reply ? 'Himbyte' : m.author_name || 'Venue'}</span>
                    <span>{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-body whitespace-pre-wrap">{m.body}</p>
                </div>
              ))}
            </div>
            {thread.ticket.status !== 'closed' ? (
              <form onSubmit={sendReply} className="space-y-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply as Himbyte support…"
                  rows={3}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-canvas resize-none"
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <MessageSquare size={16} />
                  Send reply
                </button>
              </form>
            ) : (
              <p className="text-xs text-muted flex items-center gap-2">
                <CheckCircle size={14} className="text-success" /> This thread is marked {thread.ticket.status}.
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
