import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import CustomerLayout from '../../components/layout/CustomerLayout';

function billBackPath(searchParams) {
  const r = searchParams.get('r');
  const loc = searchParams.get('loc');
  const location = searchParams.get('location');
  const table = searchParams.get('table');
  const room = searchParams.get('room');
  const p = new URLSearchParams();
  if (r) p.set('r', r);
  if (loc) p.set('loc', loc);
  if (location) p.set('location', location);
  if (table) p.set('table', table);
  if (room) p.set('room', room);
  const q = p.toString();
  return q ? `/bill?${q}` : '/bill';
}

/** Guest eSewa success (?data= from redirect; keeps r + loc in URL). */
export function GuestEsewaSuccessPage() {
  const [searchParams] = useSearchParams();
  const backTo = useMemo(() => billBackPath(searchParams), [searchParams]);
  const [phase, setPhase] = useState('verifying');
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const data = searchParams.get('data');
    if (!data) {
      setPhase('error');
      setDetail('Missing payment data. Return to your bill and try again.');
      return;
    }
    let cancelled = false;
    api
      .verifyEsewaGuestPayment(data)
      .then((r) => {
        if (cancelled) return;
        setPhase('ok');
        setDetail(r);
        toast.success('Payment received — thank you!');
      })
      .catch((e) => {
        if (cancelled) return;
        setPhase('error');
        setDetail(e?.message || 'Verification failed');
        toast.error(e?.message || 'Verification failed');
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <CustomerLayout restaurantName="Payment">
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
          {phase === 'verifying' && (
            <div className="flex items-center gap-3 text-body">
              <Loader2 className="animate-spin text-primary" size={22} />
              <span>Verifying payment…</span>
            </div>
          )}
          {phase === 'ok' && (
            <div className="flex flex-col items-center text-center gap-3">
              <CheckCircle className="text-success" size={40} />
              <p className="font-bold text-ink">Payment successful</p>
              {detail?.transaction_code && (
                <p className="text-sm text-muted">
                  Reference: <span className="text-ink font-mono">{detail.transaction_code}</span>
                </p>
              )}
              <Link
                to={backTo}
                className="mt-2 inline-flex px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold"
              >
                Back to bill
              </Link>
            </div>
          )}
          {phase === 'error' && (
            <div className="flex flex-col items-center text-center gap-3">
              <XCircle className="text-danger" size={40} />
              <p className="font-bold text-ink">Could not confirm payment</p>
              <p className="text-sm text-body">{detail}</p>
              <Link to={backTo} className="mt-2 text-sm font-semibold text-primary">
                Back to bill
              </Link>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}

export function GuestEsewaFailurePage() {
  const [searchParams] = useSearchParams();
  const backTo = useMemo(() => billBackPath(searchParams), [searchParams]);
  const reason = searchParams.get('message') || searchParams.get('error');

  return (
    <CustomerLayout restaurantName="Payment">
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex flex-col items-center text-center gap-3">
            <XCircle className="text-warning" size={40} />
            <p className="font-bold text-ink">Payment not completed</p>
            {reason && <p className="text-sm text-body">{reason}</p>}
            <p className="text-xs text-muted">You can try again or pay at the counter.</p>
            <Link
              to={backTo}
              className="mt-2 inline-flex px-5 py-2.5 rounded-xl bg-surface border border-border text-ink text-sm font-bold"
            >
              Back to bill
            </Link>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
