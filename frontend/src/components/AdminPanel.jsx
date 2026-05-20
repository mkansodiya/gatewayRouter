import React, { useState, useEffect } from 'react';
import { ShieldCheck, ToggleLeft, ToggleRight, Settings, Check, Save, AlertTriangle, ArrowUp, LogOut } from 'lucide-react';
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

export default function AdminPanel({ token, onLogout }) {
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState(null);

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
    </div>
  );
}
