import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchTransaction } from '../api';
import { ShieldCheck, AlertCircle, Loader } from 'lucide-react';

export default function PublicPayment({ transactionId }) {
  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTx() {
      try {
        const data = await fetchTransaction(transactionId);
        setTransaction(data);
      } catch (err) {
        setError("Payment session not found or expired.");
      } finally {
        setLoading(false);
      }
    }
    if (transactionId) {
      loadTx();
    }
  }, [transactionId]);

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

  // If transaction has a QR string, we generate the QR code directly
  if (transaction.qr_string) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        background: 'var(--bg-primary)',
        padding: '2rem'
      }}>
        <div className="card-glass" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem 2rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ 
              background: 'rgba(34, 197, 94, 0.1)', 
              color: 'var(--color-success)', 
              padding: '0.75rem', 
              borderRadius: '50%' 
            }}>
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

          <div style={{ 
            background: 'white', 
            padding: '1rem', 
            borderRadius: '1rem', 
            display: 'inline-block',
            marginBottom: '2rem',
            boxShadow: '0 0 40px rgba(99, 102, 241, 0.15)'
          }}>
            <QRCodeSVG 
              value={transaction.qr_string} 
              size={220} 
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              level={"Q"}
              includeMargin={false}
            />
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: '0.25rem' }}>Transaction ID: {transaction.id}</p>
            <p>Status: <span style={{ color: transaction.status === 'success' ? 'var(--color-success)' : 'var(--color-warning)', textTransform: 'capitalize' }}>{transaction.status}</span></p>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, if it has a redirect payment URL, embed it
  if (transaction.payment_url) {
    return (
      <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', background: '#fff' }}>
        <iframe 
          src={transaction.payment_url} 
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Payment Checkout"
          allow="payment"
        />
      </div>
    );
  }

  // Fallback if neither exists
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
