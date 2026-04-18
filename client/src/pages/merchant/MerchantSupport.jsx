import { useEffect, useState } from 'react';
import { Loader2, MessageSquare, Plus, LifeBuoy } from 'lucide-react';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

export default function MerchantSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);

  function loadList() {
    setLoading(true);
    api
      .listVenueSupportTickets()
      .then(setTickets)
      .catch((e) => toast.error(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadList();
  }, []);

  async function openTicket(t) {
    setSelected(t);
    setThread(null);
    try {
      const data = await api.getVenueSupportTicket(t.id);
      setThread(data);
    } catch (e) {
      toast.error(e.message || 'Failed to load');
    }
  }

  async function createTicket(e) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setCreating(true);
    try {
      const t = await api.createVenueSupportTicket({
        subject: subject.trim(),
        message: message.trim(),
      });
      setSubject('');
      setMessage('');
      toast.success('Message sent to Himbyte support');
      await loadList();
      await openTicket(t);
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setCreating(false);
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      await api.replyVenueSupportTicket(selected.id, reply.trim());
      setReply('');
      const data = await api.getVenueSupportTicket(selected.id);
      setThread(data);
      loadList();
      toast.success('Sent');
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setSending(false);
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink flex items-center gap-2">
          <LifeBuoy className="text-primary" size={26} />
          Himbyte support
        </h1>
        <p className="text-sm text-muted mt-0.5">
          Ask our team about billing, onboarding, or the product. Responses appear here (not legal advice—consult your own advisers where needed).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-black text-ink mb-3 flex items-center gap-2">
              <Plus size={16} className="text-gold" /> New request
            </h2>
            <form onSubmit={createTicket} className="space-y-3">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm"
                maxLength={240}
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm resize-none"
              />
              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark disabled:opacity-50"
              >
                {creating ? 'Sending…' : 'Submit to Himbyte'}
              </button>
            </form>
          </Card>

          <div>
            <h2 className="text-sm font-black text-ink mb-2">Your conversations</h2>
            <div className="space-y-2">
              {tickets.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted">No messages yet.</Card>
              ) : (
                tickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openTicket(t)}
                    className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                      selected?.id === t.id
                        ? 'border-primary bg-primary-soft/40'
                        : 'border-border bg-surface hover:bg-canvas-dark'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink text-sm line-clamp-2">{t.subject}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-canvas-dark text-muted">
                        {t.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <Card className="p-5 min-h-[400px] flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted">
              Open a conversation
            </div>
          ) : !thread ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : (
            <>
              <h2 className="font-black text-ink text-sm mb-4 pb-3 border-b border-border">{thread.ticket.subject}</h2>
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[360px]">
                {(thread.messages || []).map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl p-3 text-sm ${
                      m.is_hq_reply
                        ? 'bg-gold-soft border border-gold/30 ml-2'
                        : 'bg-canvas-dark border border-border mr-2'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-muted mb-1">
                      <span>{m.is_hq_reply ? 'Himbyte' : m.author_name || 'You'}</span>
                      <span>{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-body whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>
              {thread.ticket.status !== 'closed' && thread.ticket.status !== 'resolved' ? (
                <form onSubmit={sendReply} className="space-y-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={3}
                    placeholder="Reply…"
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-canvas resize-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !reply.trim()}
                    className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={16} /> Send
                  </button>
                </form>
              ) : (
                <p className="text-xs text-muted">This conversation is {thread.ticket.status}. Open a new request if you need more help.</p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
