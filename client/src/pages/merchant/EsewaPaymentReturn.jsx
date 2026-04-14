import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import { extractEsewaDataFromUrl } from '../../lib/esewaReturnData';

/** eSewa success redirect (?data= base64 JSON) — verify signature server-side and close the table check. */
export function EsewaSuccessPage() {
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState('verifying');
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const data = searchParams.get('data') || extractEsewaDataFromUrl(window.location.href);
    if (!data) {
      setPhase('error');
      setDetail('Missing payment data from eSewa. Return to Table Bills and try again.');
      return;
    }
    let cancelled = false;
    api
      .verifyEsewaPayment(data)
      .then((r) => {
        if (cancelled) return;
        setPhase('ok');
        setDetail(r);
        toast.success('eSewa payment verified — table bill cleared.');
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
    <div className="max-w-lg mx-auto px-4 py-10">
      <Card className="p-6 border border-border">
        {phase === 'verifying' && (
          <div className="flex items-center gap-3 text-body">
            <Loader2 className="animate-spin text-primary" size={22} />
            <span>Verifying eSewa payment…</span>
          </div>
        )}
        {phase === 'ok' && (
          <div className="flex flex-col items-center text-center gap-3">
            <CheckCircle className="text-success" size={40} />
            <p className="font-bold text-ink">Payment successful</p>
            {detail?.transaction_code && (
              <p className="text-sm text-muted">
                eSewa ref: <span className="text-ink font-mono">{detail.transaction_code}</span>
              </p>
            )}
            <Link
              to="/merchant/bills"
              className="mt-2 inline-flex px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold"
            >
              Back to Table Bills
            </Link>
          </div>
        )}
        {phase === 'error' && (
          <div className="flex flex-col items-center text-center gap-3">
            <XCircle className="text-danger" size={40} />
            <p className="font-bold text-ink">Could not complete verification</p>
            <p className="text-sm text-body">{detail}</p>
            <Link to="/merchant/bills" className="mt-2 text-sm font-semibold text-primary">
              Back to Table Bills
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}

export function EsewaFailurePage() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('message') || searchParams.get('error');

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Card className="p-6 border border-border">
        <div className="flex flex-col items-center text-center gap-3">
          <XCircle className="text-warning" size={40} />
          <p className="font-bold text-ink">eSewa payment was not completed</p>
          {reason && <p className="text-sm text-body">{reason}</p>}
          <p className="text-xs text-muted">
            The guest may have cancelled, or the session timed out. You can try again or settle manually.
          </p>
          <Link
            to="/merchant/bills"
            className="mt-2 inline-flex px-5 py-2.5 rounded-xl bg-surface border border-border text-ink text-sm font-bold"
          >
            Back to Table Bills
          </Link>
        </div>
      </Card>
    </div>
  );
}
