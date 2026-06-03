import React, { useEffect, useState, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchTransaction, verifyTransactionUtr } from '../api';
import { Shield, ShieldCheck, Loader, CheckCircle, Clock, BadgeCheck, RefreshCw } from 'lucide-react';

const POLL_INTERVAL_MS = 5000;

export default function PublicPayment({ transactionId }) {
  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [lastChecked, setLastChecked] = useState(null);
  const intervalRef = useRef(null);

  // UTR verification state
  const [utr, setUtr] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(299);

  const fetchStatus = useCallback(async (isInitial = false) => {
    try {
      const data = await fetchTransaction(transactionId);
      setTransaction(data);
      setLastChecked(new Date());

      if (data.status === 'success' || data.status === 'failed') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (data.redirect_url) {
          setTimeout(() => {
            let finalUrl;
            try {
              const url = new URL(data.redirect_url);
              url.searchParams.set('status', data.status);
              url.searchParams.set('transaction_id', data.id);
              if (data.utr) url.searchParams.set('utr', data.utr);
              finalUrl = url.toString();
            } catch (_) {
              const sep = data.redirect_url.includes('?') ? '&' : '?';
              finalUrl = `${data.redirect_url}${sep}status=${encodeURIComponent(data.status)}&transaction_id=${encodeURIComponent(data.id)}${data.utr ? '&utr=' + encodeURIComponent(data.utr) : ''}`;
            }
            window.location.href = finalUrl;
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
    fetchStatus(true);
    intervalRef.current = setInterval(() => fetchStatus(false), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [transactionId, fetchStatus]);

  // Timer countdown
  useEffect(() => {
    if (!transaction || transaction.status === 'success' || transaction.status === 'failed') return;
    const intervalId = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [transaction]);

  const handleVerify = async () => {
    if (!utr || utr.length < 8) {
      setVerifyError("Please enter a valid UTR number.");
      return;
    }
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const updatedTx = await verifyTransactionUtr(transactionId, utr);
      if (updatedTx.status === 'pending') {
        setVerifyError("UTR verification failed, Please try with correct UTR.");
      }
      await fetchStatus(false);
    } catch (err) {
      setVerifyError(err.message || "Verification failed. Please try again or check your UTR.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const getUpiIntent = (appScheme) => {
    const baseString = transaction?.qr_string || `upi://pay?pa=merchant@upi&pn=Merchant&am=${transaction?.amount}`;
    switch(appScheme) {
      case 'gpay': return baseString.replace('upi://pay', 'gpay://upi/pay');
      case 'paytm': return baseString.replace('upi://pay', 'paytmmp://pay');
      case 'phonepe': return baseString.replace('upi://pay', 'phonepe://pay');
      case 'bhim': return baseString.replace('upi://pay', 'bhim://pay');
      default: return baseString;
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="checkout-container">
        <div style={{ color: 'var(--color-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Loader className="spinner" size={40} color="#3b82f6" />
          <h2 style={{ fontFamily: 'var(--font-display)', color: '#0f172a' }}>Loading...</h2>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="checkout-container">
        <div className="checkout-card">
          <Shield size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h2 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>Session Not Found</h2>
          <p style={{ color: '#64748b' }}>{error}</p>
        </div>
      </div>
    );
  }

  // If redirect_url exists and no qr_string (iframe mode), embed it
  if (transaction.payment_url && !transaction.qr_string) {
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

  return (
    <div className="checkout-container">
      <div className="checkout-card">
        
        {/* Header Badges */}
        {transaction.status === 'success' ? (
          <div className="checkout-pill">
            <CheckCircle size={14} /> Payment Successful
          </div>
        ) : transaction.status === 'failed' ? (
          <div className="checkout-pill" style={{ background: '#fee2e2', color: '#991b1b' }}>
            <Shield size={14} /> Payment Failed
          </div>
        ) : (
          <div className="checkout-pill blue">
            <Shield size={14} /> Verified • Secure
          </div>
        )}

        <h2 className="checkout-title">
          {transaction.status === 'success' ? 'PAYMENT COMPLETE' : transaction.status === 'failed' ? 'PAYMENT FAILED' : 'COMPLETE YOUR PAYMENT'}
        </h2>
        <p className="checkout-subtitle">Order ID: #{transaction.id}</p>

        <div className="checkout-dashed-line"></div>

        <div className="checkout-amount-label">
          PAYABLE AMOUNT 
          <span style={{ 
            background: '#dcfce7', color: '#166534', padding: '0.1rem 0.4rem', 
            borderRadius: '4px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.2rem'
          }}>
            <BadgeCheck size={12} /> Verified
          </span>
        </div>
        <div className="checkout-amount-value">₹{parseFloat(transaction.amount).toFixed(2)}</div>

        {transaction.status !== 'success' && transaction.status !== 'failed' && (
          <>
            <div className="qr-box-wrapper">
              <div className="qr-box-label">SCAN THIS QR WITH ANY UPI APP</div>
              <div className="qr-box">
                <QRCodeSVG 
                  value={transaction.qr_string || `upi://pay?pa=merchant@upi&pn=Merchant&am=${transaction.amount}`} 
                  size={160} 
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"M"}
                  includeMargin={false}
                />
              </div>
            </div>

            <div className="separator-with-text">
              <div className="separator-line"></div>
              <div className="separator-text">OR PAY USING YOUR APPS</div>
              <div className="separator-line"></div>
            </div>

            <div className="app-logos-row">
              <a href={getUpiIntent('gpay')} className="app-logo-box" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-pay-icon.png" alt="GPay" />
              </a>
              <a href={getUpiIntent('paytm')} className="app-logo-box" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/paytm-icon.png" alt="Paytm" />
              </a>
              <a href={getUpiIntent('phonepe')} className="app-logo-box" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg" alt="PhonePe" />
              </a>
              <a href={getUpiIntent('bhim')} className="app-logo-box" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/bhim-upi-icon.png" alt="BHIM" />
              </a>
            </div>

            <p className="instruction-text">
              Use the QR code or your saved UPI app for payment.
            </p>

            <div className="timer-text">
              <Clock size={14} /> Your payment session expires in: <span className="timer-value">{formatTime(timeLeft)}</span>
            </div>

            {transaction.gateway_id === 'paycrm' ? (
              <div className="light-utr-input-group">
                <input 
                  type="text" 
                  className="light-utr-input"
                  placeholder="Enter 12-digit UTR Number"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  maxLength={12}
                />
                {verifyError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '-0.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>{verifyError}</p>}
                <button 
                  className="light-verify-btn"
                  onClick={handleVerify}
                  disabled={verifyLoading}
                >
                  {verifyLoading ? <Loader size={18} className="spinner" /> : 'Submit UTR & Verify'}
                </button>
              </div>
            ) : (
              <div className="waiting-box">
                <div className="waiting-spinner"></div>
                Waiting for confirmation from your bank...
              </div>
            )}
          </>
        )}

        <div className="trust-badges" style={{ marginTop: '1rem' }}>
          <div className="trust-badge-item">
            <CheckCircle size={12} color="#166534" /> NPCI Approved
          </div>
          <div className="trust-badge-item">
            <ShieldCheck size={12} color="#166534" /> Secure
          </div>
        </div>

      </div>
    </div>
  );
}
