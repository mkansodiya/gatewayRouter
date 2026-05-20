import React, { useState, useEffect } from 'react';
import { ShieldCheck, ToggleLeft, ToggleRight, Settings, Check, Save, AlertTriangle, ArrowUp, LogOut, BookOpen, Copy, Code } from 'lucide-react';
import { fetchGateways, updateGateway, isAdminLoggedIn, clearAdminToken } from '../api';

function GatewayAdminRow({ gateway, onUpdated, onError }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isActive, setIsActive] = useState(gateway.is_active);
  const [apiKey, setApiKey] = useState(gateway.config_data?.api_key || '');
  const [successRate, setSuccessRate] = useState(((gateway.config_data?.success_rate ?? 0.9) * 100).toFixed(0));
  const [sortOrder, setSortOrder] = useState(gateway.sort_order);
  const [isSaving, setIsSaving] = useState(false);

  const getColor = (id) => {
    const map = { stripe: '#6366f1', paypal: '#f59e0b', razorpay: '#10b981', adyen: '#06b6d4' };
    return map[id] || '#94a3b8';
  };

  const handleToggle = async () => {
    const next = !isActive;
    setIsActive(next);
    try {
      await updateGateway(gateway.id, { is_active: next });
      onUpdated();
    } catch (err) {
      setIsActive(!next); // rollback
      onError(err.message);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateGateway(gateway.id, {
        sort_order: parseInt(sortOrder),
        config_data: {
          success_rate: parseFloat(successRate) / 100,
          api_key: apiKey,
        },
      });
      setIsEditing(false);
      onUpdated();
    } catch (err) {
      onError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const color = getColor(gateway.id);

  return (
    <div className="card-glass" style={{
      padding: '1.25rem 1.5rem',
      borderLeft: `4px solid ${color}`,
      transition: 'all 0.3s ease'
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
            background: `linear-gradient(135deg, ${color}33, ${color}11)`,
            border: `1px solid ${color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', fontWeight: '800', color
          }}>
            {gateway.name[0]}
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '1rem' }}>{gateway.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '2px' }}>
              ID: {gateway.id} &nbsp;·&nbsp; Sort: {gateway.sort_order} &nbsp;·&nbsp; Rate: {(gateway.config_data?.success_rate * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Active badge */}
          <span style={{
            fontSize: '0.7rem', fontWeight: '600', padding: '0.25rem 0.6rem',
            borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px',
            background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: isActive ? '#10b981' : '#ef4444',
            border: `1px solid ${isActive ? '#10b98133' : '#ef444433'}`,
          }}>
            {isActive ? 'Active' : 'Inactive'}
          </span>

          {/* Config toggle */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="tab-btn"
            style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem', minHeight: 'auto' }}
          >
            <Settings size={13} /> Config
          </button>

          {/* Active switch */}
          <label className="switch" style={{ flexShrink: 0 }}>
            <input type="checkbox" checked={isActive} onChange={handleToggle} />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* API Key preview */}
      <div style={{
        marginTop: '0.85rem',
        padding: '0.5rem 0.85rem',
        background: 'var(--bg-tertiary)',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        color: 'var(--text-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit' }}>api_key</span>
        <span style={{ color: color }}>{apiKey ? `${apiKey.substring(0, 22)}${apiKey.length > 22 ? '...' : ''}` : '— not set —'}</span>
      </div>

      {/* Editable config form */}
      {isEditing && (
        <div style={{
          marginTop: '1.25rem', paddingTop: '1.25rem',
          borderTop: '1px solid var(--glass-border)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem'
        }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Success Rate (%)</label>
            <input type="number" min="0" max="100" className="form-control"
              value={successRate} onChange={(e) => setSuccessRate(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Sort Order Index</label>
            <input type="number" className="form-control"
              value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
            <label>API Secret Key / Credential</label>
            <input type="text" className="form-control" placeholder="sk_live_... / rzp_live_..."
              value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
            <button onClick={() => setIsEditing(false)} className="tab-btn" style={{ padding: '0.4rem 1rem' }}>Cancel</button>
            <button onClick={handleSave} disabled={isSaving} className="submit-btn"
              style={{ padding: '0.4rem 1.2rem', width: 'auto', margin: 0, fontSize: '0.85rem' }}>
              {isSaving ? 'Saving...' : <><Save size={13} /> Save Changes</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function APIDocumentation() {
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  const [apiEndpoint, setApiEndpoint] = useState('create_order'); // 'create_order' or 'status_check'
  const [activeCodeTab, setActiveCodeTab] = useState('success_url'); // for order: 'success_url', 'success_qr', 'error'
  const [activeStatusTab, setActiveStatusTab] = useState('status_success'); // for status check: 'status_success', 'status_pending'
  const [copiedText, setCopiedText] = useState(null);

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const requestJSON = `{
  "amount": 100.00,
  "referenceId": "ref_849204",
  "description": "Order Payment #123",
  "redirectUrl": "https://your-site.com/callback"
}`;

  const successUrlJSON = `{
  "status": "success",
  "data": {
    "transactionId": "TXN8B6A40D62B3A",
    "referenceId": "ORD0D64DB1177A4",
    "amount": 100.0,
    "paymentUrl": "http://localhost:5173/pay/TXN8B6A40D62B3A"
  }
}`;

  const successQrJSON = `{
  "status": "success",
  "data": {
    "transactionId": "TXNCC358A9F0B2A",
    "referenceId": "ref_125564",
    "amount": 100.0,
    "qr_string": "upi://pay?pa=test@okpay&pn=Merchant&am=100.00&tr=ref_125564"
  }
}`;

  const errorJSON = `{
  "detail": "Payment failed: JazPays Error: Invalid merchant credentials"
}`;

  const statusSuccessJSON = `{
  "id": "TXN8B6A40D62B3A",
  "reference_id": "ref_849204",
  "amount": 100.0,
  "description": "Order Payment #123",
  "redirect_url": "https://your-site.com/callback",
  "gateway_id": "jazpays",
  "status": "success",
  "error_message": null,
  "qr_string": null,
  "payment_url": "https://checkout.jazpays.com/pay/103984",
  "utr": "UTR847290184712",
  "created_at": "2026-05-20T17:39:26.124Z"
}`;

  const statusPendingJSON = `{
  "id": "TXN8B6A40D62B3A",
  "reference_id": "ref_849204",
  "amount": 100.0,
  "description": "Order Payment #123",
  "redirect_url": "https://your-site.com/callback",
  "gateway_id": "jazpays",
  "status": "pending",
  "error_message": null,
  "qr_string": null,
  "payment_url": "https://checkout.jazpays.com/pay/103984",
  "utr": null,
  "created_at": "2026-05-20T17:39:26.124Z"
}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', color: '#f8fafc', animation: 'fadeIn 0.3s ease' }}>
      {/* Base URL Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: '8px', padding: '0.65rem 1rem'
      }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Base URL</span>
        <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#e0e7ff', fontWeight: '600', flexGrow: 1 }}>{apiBase}</span>
        <button
          onClick={() => handleCopy(apiBase, 'base')}
          className="tab-btn"
          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', minHeight: 'auto', gap: '0.25rem', whiteSpace: 'nowrap' }}
        >
          {copiedText === 'base' ? <Check size={11} style={{ color: '#10b981' }} /> : <Copy size={11} />}
          {copiedText === 'base' ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* API Endpoint Toggle Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setApiEndpoint('create_order')}
          className={`tab-btn ${apiEndpoint === 'create_order' ? 'active' : ''}`}
          style={{ minHeight: 'auto', padding: '0.35rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <span style={{ fontSize: '0.65rem', background: '#10b981', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 'bold' }}>POST</span>
          Create Order
        </button>
        <button
          onClick={() => setApiEndpoint('status_check')}
          className={`tab-btn ${apiEndpoint === 'status_check' ? 'active' : ''}`}
          style={{ minHeight: 'auto', padding: '0.35rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <span style={{ fontSize: '0.65rem', background: '#3b82f6', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 'bold' }}>GET</span>
          Status Check
        </button>
      </div>

      {apiEndpoint === 'create_order' ? (
        <>
          {/* Endpoint summary */}
          <div className="card-glass" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: '800',
                fontSize: '0.8rem',
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                textTransform: 'uppercase'
              }}>POST</span>
              <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: '600' }}>/api/orders</span>
              
              <button
                onClick={() => handleCopy(`${apiBase}/api/orders`, 'url')}
                className="tab-btn"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginLeft: 'auto', minHeight: 'auto', gap: '0.3rem' }}
              >
                {copiedText === 'url' ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                {copiedText === 'url' ? 'Copied' : 'Copy Endpoint'}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Initiates a checkout transaction. The request is routed via round-robin distribution to the next active provider in the queue.
            </p>
          </div>

          {/* Main Grid: Request params and Examples */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
            {/* Left column: Request Body fields */}
            <div className="card-glass" style={{ padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                <Code size={16} /> Request Body Fields
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}>amount</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-warning)', fontWeight: 'bold' }}>float · required</span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    The payment value in Rupees (₹). Must be greater than 0.
                  </p>
                </div>

                <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}>referenceId</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-warning)', fontWeight: 'bold' }}>string · required</span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    A unique ID from your system representing the order/invoice.
                  </p>
                </div>

                <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}>redirectUrl</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-warning)', fontWeight: 'bold' }}>string · required</span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Callback URL where customers redirect after payment completion on the gateway.
                  </p>
                </div>

                <div style={{ paddingBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}>description</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>string · optional</span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    A brief description of the billing items or transaction.
                  </p>
                </div>

              </div>
            </div>

            {/* Right column: Request/Response Examples */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Request Body JSON */}
              <div className="card-glass" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Example JSON Request</h4>
                  <button
                    onClick={() => handleCopy(requestJSON, 'req')}
                    className="tab-btn"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', minHeight: 'auto', gap: '0.3rem' }}
                  >
                    {copiedText === 'req' ? <Check size={11} style={{ color: '#10b981' }} /> : <Copy size={11} />}
                    {copiedText === 'req' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre style={{
                  margin: 0, padding: '1rem', background: 'rgba(0,0,0,0.25)',
                  borderRadius: '6px', border: '1px solid var(--glass-border)',
                  fontFamily: 'monospace', fontSize: '0.8rem', color: '#a5f3fc',
                  overflowX: 'auto'
                }}>{requestJSON}</pre>
              </div>

              {/* Response Bodies JSON */}
              <div className="card-glass" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Responses</h4>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      onClick={() => setActiveCodeTab('success_url')}
                      className={`tab-btn ${activeCodeTab === 'success_url' ? 'active' : ''}`}
                      style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', minHeight: 'auto' }}
                    >
                      201 Redirect
                    </button>
                    <button
                      onClick={() => setActiveCodeTab('success_qr')}
                      className={`tab-btn ${activeCodeTab === 'success_qr' ? 'active' : ''}`}
                      style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', minHeight: 'auto' }}
                    >
                      201 QR Code
                    </button>
                    <button
                      onClick={() => setActiveCodeTab('error')}
                      className={`tab-btn ${activeCodeTab === 'error' ? 'active' : ''}`}
                      style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', minHeight: 'auto' }}
                    >
                      400/503 Error
                    </button>
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => {
                      const target = activeCodeTab === 'success_url' ? successUrlJSON : (activeCodeTab === 'success_qr' ? successQrJSON : errorJSON);
                      handleCopy(target, 'res');
                    }}
                    className="tab-btn"
                    style={{ position: 'absolute', right: '10px', top: '10px', padding: '0.2rem 0.5rem', fontSize: '0.7rem', minHeight: 'auto', zIndex: 5, gap: '0.3rem' }}
                  >
                    {copiedText === 'res' ? <Check size={11} style={{ color: '#10b981' }} /> : <Copy size={11} />}
                    {copiedText === 'res' ? 'Copied' : 'Copy'}
                  </button>
                  
                  {activeCodeTab === 'success_url' && (
                    <pre style={{
                      margin: 0, padding: '1.25rem 1rem 1rem', background: 'rgba(0,0,0,0.25)',
                      borderRadius: '6px', border: '1px solid var(--glass-border)',
                      fontFamily: 'monospace', fontSize: '0.8rem', color: '#86efac',
                      overflowX: 'auto'
                    }}>{successUrlJSON}</pre>
                  )}

                  {activeCodeTab === 'success_qr' && (
                    <pre style={{
                      margin: 0, padding: '1.25rem 1rem 1rem', background: 'rgba(0,0,0,0.25)',
                      borderRadius: '6px', border: '1px solid var(--glass-border)',
                      fontFamily: 'monospace', fontSize: '0.8rem', color: '#86efac',
                      overflowX: 'auto'
                    }}>{successQrJSON}</pre>
                  )}

                  {activeCodeTab === 'error' && (
                    <pre style={{
                      margin: 0, padding: '1.25rem 1rem 1rem', background: 'rgba(0,0,0,0.25)',
                      borderRadius: '6px', border: '1px solid var(--glass-border)',
                      fontFamily: 'monospace', fontSize: '0.8rem', color: '#fca5a5',
                      overflowX: 'auto'
                    }}>{errorJSON}</pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Endpoint summary */}
          <div className="card-glass" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                fontWeight: '800',
                fontSize: '0.8rem',
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                textTransform: 'uppercase'
              }}>GET</span>
              <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: '600' }}>/api/transactions/{"{transaction_id}"}</span>
              
              <button
                onClick={() => handleCopy(`${apiBase}/api/transactions/{transaction_id}`, 'url')}
                className="tab-btn"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginLeft: 'auto', minHeight: 'auto', gap: '0.3rem' }}
              >
                {copiedText === 'url' ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                {copiedText === 'url' ? 'Copied' : 'Copy Endpoint'}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Query the current database status, routed gateway, and **Unique Transaction Reference (UTR)** for any transaction generated by the system.
            </p>
          </div>

          {/* Main Grid: Request params and Examples */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
            {/* Left column: Path Parameter & Response Fields */}
            <div className="card-glass" style={{ padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                <Code size={16} /> URL &amp; Response Schema
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}>transaction_id</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-warning)', fontWeight: 'bold' }}>string · path</span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    The transaction ID (e.g. `TXN8B6A40D62B3A`) generated during checkout.
                  </p>
                </div>

                <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}>status</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>string · body</span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Current transaction state: <code style={{color: '#86efac'}}>success</code>, <code style={{color: '#a5f3fc'}}>pending</code>, or <code style={{color: '#fca5a5'}}>failed</code>.
                  </p>
                </div>

                <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}>utr</span>
                    <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold' }}>string · body (UTR)</span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    **Unique Transaction Reference (UTR)**. Populated after the gateway completes payment successfully.
                  </p>
                </div>

                <div style={{ paddingBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}>gateway_id</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>string · body</span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    The target payment gateway that processed this transaction (e.g. `jazpays`).
                  </p>
                </div>

              </div>
            </div>

            {/* Right column: Request/Response Examples */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Response Bodies JSON */}
              <div className="card-glass" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>JSON Responses</h4>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      onClick={() => setActiveStatusTab('status_success')}
                      className={`tab-btn ${activeStatusTab === 'status_success' ? 'active' : ''}`}
                      style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', minHeight: 'auto' }}
                    >
                      200 Success (Paid + UTR)
                    </button>
                    <button
                      onClick={() => setActiveStatusTab('status_pending')}
                      className={`tab-btn ${activeStatusTab === 'status_pending' ? 'active' : ''}`}
                      style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', minHeight: 'auto' }}
                    >
                      200 Pending
                    </button>
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => {
                      const target = activeStatusTab === 'status_success' ? statusSuccessJSON : statusPendingJSON;
                      handleCopy(target, 'res');
                    }}
                    className="tab-btn"
                    style={{ position: 'absolute', right: '10px', top: '10px', padding: '0.2rem 0.5rem', fontSize: '0.7rem', minHeight: 'auto', zIndex: 5, gap: '0.3rem' }}
                  >
                    {copiedText === 'res' ? <Check size={11} style={{ color: '#10b981' }} /> : <Copy size={11} />}
                    {copiedText === 'res' ? 'Copied' : 'Copy'}
                  </button>
                  
                  {activeStatusTab === 'status_success' && (
                    <pre style={{
                      margin: 0, padding: '1.25rem 1rem 1rem', background: 'rgba(0,0,0,0.25)',
                      borderRadius: '6px', border: '1px solid var(--glass-border)',
                      fontFamily: 'monospace', fontSize: '0.8rem', color: '#86efac',
                      overflowX: 'auto'
                    }}>{statusSuccessJSON}</pre>
                  )}

                  {activeStatusTab === 'status_pending' && (
                    <pre style={{
                      margin: 0, padding: '1.25rem 1rem 1rem', background: 'rgba(0,0,0,0.25)',
                      borderRadius: '6px', border: '1px solid var(--glass-border)',
                      fontFamily: 'monospace', fontSize: '0.8rem', color: '#a5f3fc',
                      overflowX: 'auto'
                    }}>{statusPendingJSON}</pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminPanel({ token, onLogout }) {
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('gateways'); // 'gateways' or 'docs'

  const loadGateways = async () => {
    try {
      const data = await fetchGateways();
      setGateways(data);
    } catch (err) {
      setErrorBanner('Could not load gateways: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGateways();
  }, []);

  const handleLogout = () => {
    clearAdminToken();
    onLogout();
  };

  return (
    <div>
      {/* Panel header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldCheck size={18} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700' }}>Admin Gateway Manager</h2>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Manage API credentials, toggle active status &amp; sort order
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="tab-btn"
          style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', gap: '0.4rem' }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      {/* Admin Panel Sub Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveSubTab('gateways')}
          className={`tab-btn ${activeSubTab === 'gateways' ? 'active' : ''}`}
          style={{ minHeight: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Settings size={14} /> Gateways Config
        </button>
        <button
          onClick={() => setActiveSubTab('docs')}
          className={`tab-btn ${activeSubTab === 'docs' ? 'active' : ''}`}
          style={{ minHeight: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <BookOpen size={14} /> API Docs
        </button>
      </div>

      {/* Error banner */}
      {errorBanner && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.65rem',
          background: 'var(--color-danger-glow)',
          border: '1px solid var(--color-danger)',
          borderRadius: '8px', padding: '0.75rem 1rem',
          marginBottom: '1.25rem', fontSize: '0.85rem', color: '#fca5a5'
        }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          {errorBanner}
          <button onClick={() => setErrorBanner(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {activeSubTab === 'gateways' ? (
        <>
          {/* Info strip */}
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <ShieldCheck size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            Changes to credentials and status are applied immediately. The round-robin router respects active/inactive toggles in real-time.
          </div>

          {/* Gateway list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 1rem', borderTopColor: 'var(--color-primary)' }}></div>
              Loading gateway configurations...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {gateways.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No payment gateways discovered. Check provider directory.
                </div>
              ) : (
                gateways.map(gw => (
                  <GatewayAdminRow
                    key={gw.id}
                    gateway={gw}
                    onUpdated={loadGateways}
                    onError={(msg) => setErrorBanner(msg)}
                  />
                ))
              )}
            </div>
          )}
        </>
      ) : (
        <APIDocumentation />
      )}
    </div>
  );
}
