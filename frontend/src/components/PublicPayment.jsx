import React, { useEffect, useState, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchTransaction } from '../api';
import { ShieldCheck, AlertCircle, Loader, CheckCircle2, Clock, RefreshCw } from 'lucide-react';

const POLL_INTERVAL_MS = 5000; // poll every 5 seconds while pending

export default function PublicPayment({ transactionId }) {
  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const intervalRef = useRef(null);

  const fetchStatus = useCallback(async (isInitial = false) => {
    try {
      const data = await fetchTransaction(transactionId);
      setTransaction(data);
      setLastChecked(new Date());

      // Stop polling once we have a terminal state
      if (data.status === 'success' || data.status === 'failed') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // If success and there's a redirect_url, redirect after 3 seconds
        if (data.status === 'success' && data.redirect_url) {
          setTimeout(() => {
            window.location.href = data.redirect_url;
          }, 3000);
        }
      }
    } catch (err) {
      if (isInitial) setError('Payment session not found or expired.');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    if (!transactionId) return;

    // Initial load
    fetchStatus(true);

    // Start polling
    intervalRef.current = setInterval(() => fetchStatus(false), POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [transactionId, fetchStatus]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--color-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Loader className="spinner" size={40} />
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'white' }}>Loading Payment Session...</h2>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !transaction) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="card-glass" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px', borderColor: 'var(--color-danger)' }}>
          <AlertCircle size={48} color="var(--color-danger)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ color: 'white', marginBottom: '0.5rem' }}>Session Not Found</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      </div>
    );
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (transaction.status === 'success') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem' }}>
        <div className="card-glass" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem 2rem', textAlign: 'center', borderColor: 'rgba(34,197,94,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '1rem', borderRadius: '50%', animation: 'fadeIn 0.5s ease' }}>
              <CheckCircle2 size={48} />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'white', marginBottom: '0.5rem', fontSize: '1.6rem' }}>Payment Successful!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Your payment of <strong style={{ color: 'white' }}>₹{transaction.amount}</strong> has been confirmed.
          </p>
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', padding: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'left', lineHeight: '1.8' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Transaction ID:</span> <span style={{ color: 'white', fontFamily: 'monospace' }}>{transaction.id}</span></div>
            {transaction.utr && <div><span style={{ color: 'var(--text-muted)' }}>UTR:</span> <span style={{ color: '#22c55e', fontFamily: 'monospace' }}>{transaction.utr}</span></div>}
            <div><span style={{ color: 'var(--text-muted)' }}>Gateway:</span> <span style={{ color: 'white', textTransform: 'capitalize' }}>{transaction.gateway_id}</span></div>
          </div>
          {transaction.redirect_url && (
            <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Redirecting you back in 3 seconds...
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Failed state ────────────────────────────────────────────────────────────
  if (transaction.status === 'failed') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem' }}>
        <div className="card-glass" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem 2rem', textAlign: 'center', borderColor: 'rgba(239,68,68,0.4)' }}>
          <AlertCircle size={48} color="var(--color-danger)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ color: 'white', marginBottom: '0.5rem' }}>Payment Failed</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{transaction.error_message || 'The payment could not be processed.'}</p>
        </div>
      </div>
    );
  }

  // ── Poll status indicator (shared by QR + iframe views) ────────────────────
  const PollIndicator = () => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      fontSize: '0.75rem', color: 'var(--text-muted)',
      justifyContent: 'center', marginTop: '0.75rem'
    }}>
      <RefreshCw size={11} style={{ animation: 'spin 2s linear infinite' }} />
      Checking status automatically every 5s
      {lastChecked && <span>· Last: {lastChecked.toLocaleTimeString()}</span>}
    </div>
  );

  // ── QR Code view (pending) ──────────────────────────────────────────────────
  if (transaction.qr_string) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem' }}>
        <div className="card-glass" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem 2rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-success)', padding: '0.75rem', borderRadius: '50%' }}>
              <ShieldCheck size={32} />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'white', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
            Complete Your Payment
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Scan the QR code below with any supported UPI app to complete your transaction of
            <strong style={{ color: 'white', marginLeft: '0.3rem' }}>₹{transaction.amount}</strong>
          </p>

          <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem', display: 'inline-block', marginBottom: '2rem', boxShadow: '0 0 40px rgba(99, 102, 241, 0.15)' }}>
            <QRCodeSVG
              value={transaction.qr_string}
              size={220}
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              level={"Q"}
              includeMargin={false}
            />
          </div>

          {/* Status badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Clock size={14} style={{ color: 'var(--color-warning)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-warning)', fontWeight: '600' }}>Waiting for payment...</span>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: '0.25rem' }}>Transaction ID: <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{transaction.id}</span></p>
            <p>Status: <span style={{ color: 'var(--color-warning)', textTransform: 'capitalize', fontWeight: '600' }}>{transaction.status}</span></p>
          </div>

          <PollIndicator />
        </div>
      </div>
    );
  }

  // ── Iframe / redirect URL view (pending) ────────────────────────────────────
  if (transaction.payment_url) {
    return (
      <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', background: '#fff', position: 'relative' }}>
        <iframe
          src={transaction.payment_url}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Payment Checkout"
          allow="payment"
        />
        {/* Floating status bar */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(10,10,20,0.92)', backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--glass-border)',
          padding: '0.6rem 1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '0.78rem', color: 'var(--text-muted)', zIndex: 9999
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={12} style={{ color: 'var(--color-warning)' }} />
            <span style={{ color: 'var(--color-warning)', fontWeight: '600' }}>Payment Pending</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: '0.25rem' }}>· {transaction.id}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <RefreshCw size={11} style={{ animation: 'spin 2s linear infinite' }} />
            {lastChecked && <span>{lastChecked.toLocaleTimeString()}</span>}
          </span>
        </div>
      </div>
    );
  }

  // ── Fallback ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div className="card-glass" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
        <AlertCircle size={48} color="var(--color-warning)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ color: 'white', marginBottom: '0.5rem' }}>Invalid Checkout</h2>
        <p style={{ color: 'var(--text-secondary)' }}>No valid payment methods could be loaded for this transaction.</p>
      </div>
    </div>
  );
}
