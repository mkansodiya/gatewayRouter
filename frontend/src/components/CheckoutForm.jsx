import React, { useState } from 'react';
import { ShieldCheck, IndianRupee, FileText, Globe, Key } from 'lucide-react';
import { createOrder } from '../api';

export default function CheckoutForm({ onCheckoutSuccess }) {
  const [amount, setAmount] = useState('100.00');
  const [referenceId, setReferenceId] = useState(() => `ref_${Math.floor(100000 + Math.random() * 900000)}`);
  const [description, setDescription] = useState('Order Payment #123');
  const [redirectUrl, setRedirectUrl] = useState('https://your-site.com/callback');
  const [isLoading, setIsLoading] = useState(false);
  const [resultModal, setResultModal] = useState(null); // { success: bool, data: object, error: string }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        referenceId,
        amount: parseFloat(amount),
        description,
        redirectUrl
      };
      
      const response = await createOrder(payload);
      setResultModal({
        success: response.status === 'success',
        data: response.data,
        error: null
      });
      if (onCheckoutSuccess) {
        onCheckoutSuccess();
      }
    } catch (err) {
      setResultModal({
        success: false,
        data: null,
        error: err.message || 'An unknown network error occurred.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card-glass checkout-simulator">
      <h2 className="panel-title" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
        <ShieldCheck size={24} className="text-primary" /> API Order Creation Simulator
      </h2>

      {/* Premium Order Receipt Preview */}
      <div className="card-wrapper" style={{ perspective: '1000px', marginBottom: '1.5rem' }}>
        <div className="credit-card" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', height: '170px', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
          <div className="card-front" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Invoice Summary</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', fontStyle: 'italic', color: 'var(--color-primary)' }}>ROUTED API</div>
            </div>
            
            <div style={{ marginTop: '0.5rem', textAlign: 'left' }}>
              <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Reference ID</div>
              <div style={{ fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 'bold', color: '#f8fafc' }}>{referenceId || 'ref_xxxxxx'}</div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.5rem' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Description</div>
                <div style={{ fontSize: '0.8rem', fontWeight: '500', color: '#e2e8f0', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description || 'No description'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Total Amount</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--color-secondary)' }}>₹{parseFloat(amount || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Creation Form */}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label><IndianRupee size={12} /> Amount (₹)</label>
            <input 
              type="number" 
              step="0.01" 
              className="form-control" 
              required 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label><Key size={12} /> Reference ID</label>
            <input 
              type="text" 
              className="form-control" 
              required 
              value={referenceId} 
              onChange={(e) => setReferenceId(e.target.value)} 
            />
          </div>
        </div>

        <div className="form-group">
          <label><FileText size={12} /> Description</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Order description..."
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label><Globe size={12} /> Redirect URL</label>
          <input 
            type="url" 
            className="form-control" 
            placeholder="https://..."
            value={redirectUrl} 
            onChange={(e) => setRedirectUrl(e.target.value)}
          />
        </div>

        <button type="submit" disabled={isLoading} className="submit-btn" style={{ marginTop: '1rem' }}>
          {isLoading ? (
            <>
              <div className="spinner"></div> Creating Order...
            </>
          ) : (
            `Create Order (₹${parseFloat(amount || 0).toFixed(2)})`
          )}
        </button>
      </form>

      {/* Result Modal Overlay */}
      {resultModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            
            <div className={`modal-icon ${resultModal.success ? 'success' : 'failed'}`}>
              {resultModal.success ? (
                <ShieldCheck size={36} />
              ) : (
                <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>×</span>
              )}
            </div>

            <h3 className="modal-title">
              {resultModal.success ? 'Order Initiated!' : 'Order Creation Failed'}
            </h3>
            
            <p className="modal-subtitle">
              {resultModal.success 
                ? 'The payment order has been successfully created and routed.' 
                : 'The gateway router failed to process this order.'
              }
            </p>

            <div className="modal-details">
              {resultModal.success && resultModal.data ? (
                <>
                  <div className="modal-details-row">
                    <span>Transaction ID:</span>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {resultModal.data.transactionId}
                    </span>
                  </div>
                  <div className="modal-details-row">
                    <span>Reference ID:</span>
                    <span style={{ fontFamily: 'monospace' }}>{resultModal.data.referenceId}</span>
                  </div>
                  <div className="modal-details-row">
                    <span>Amount:</span>
                    <span>₹{parseFloat(resultModal.data.amount).toFixed(2)} INR</span>
                  </div>
                  
                  {resultModal.data.qr_string && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px dashed var(--glass-border)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Gateway QR Code String</div>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-primary)' }}>{resultModal.data.qr_string}</span>
                    </div>
                  )}
                  {resultModal.data.paymentUrl && (
                    <a 
                      href={resultModal.data.paymentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="submit-btn" 
                      style={{ 
                        display: 'block', 
                        textAlign: 'center', 
                        textDecoration: 'none', 
                        marginTop: '0.75rem', 
                        padding: '0.6rem',
                        fontSize: '0.85rem',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))'
                      }}
                    >
                      Proceed to Gateway Checkout
                    </a>
                  )}
                </>
              ) : (
                <div className="modal-details-row" style={{ color: 'var(--color-danger)' }}>
                  <span>Error:</span>
                  <span>{resultModal.error}</span>
                </div>
              )}
            </div>

            <button 
              onClick={() => {
                setResultModal(null);
                setReferenceId(`ref_${Math.floor(100000 + Math.random() * 900000)}`);
              }} 
              className="modal-close-btn"
            >
              Close Simulator
            </button>
            
          </div>
        </div>
      )}
    </div>
  );
}
