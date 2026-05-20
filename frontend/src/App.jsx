import React, { useState, useEffect } from 'react';
import { Cpu, CreditCard, LayoutDashboard, History, ShieldCheck, RefreshCw, Layers, LogOut } from 'lucide-react';
import { fetchGateways, fetchRouterStatus, fetchTransactions, updateGateway, isAdminLoggedIn, setAdminToken, clearAdminToken } from './api';

import Dashboard from './components/Dashboard';
import GatewayCard from './components/GatewayCard';
import CheckoutForm from './components/CheckoutForm';
import TransactionTable from './components/TransactionTable';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [gateways, setGateways] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [routerStatus, setRouterStatus] = useState({});
  const [loading, setLoading] = useState(isAdminLoggedIn());
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(isAdminLoggedIn());

  const loadData = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const [gData, rData, tData] = await Promise.all([
        fetchGateways(),
        fetchRouterStatus(),
        fetchTransactions()
      ]);
      setGateways(gData);
      setRouterStatus(rData);
      setTransactions(tData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not establish connection with FastAPI backend. Make sure your docker services are running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (adminAuthenticated) {
      setLoading(true);
      loadData();
      const interval = setInterval(() => loadData(false), 8000);
      return () => clearInterval(interval);
    }
  }, [adminAuthenticated]);

  const handleToggleActive = async (gatewayId, isActive) => {
    try {
      await updateGateway(gatewayId, { is_active: isActive });
      await loadData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleUpdateConfig = async (gatewayId, configPayload) => {
    try {
      await updateGateway(gatewayId, configPayload);
      await loadData();
    } catch (err) {
      alert('Failed to update config');
      throw err;
    }
  };

  const handleAdminLogin = (token) => {
    setAdminToken(token);
    setAdminAuthenticated(true);
  };

  const handleAdminLogout = () => {
    clearAdminToken();
    setAdminAuthenticated(false);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--text-secondary)'
      }}>
        <div className="spinner" style={{ width: '40px', height: '40px', marginBottom: '1rem', borderTopColor: 'var(--color-primary)' }}></div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: '600' }}>Initializing Gateway Router Systems...</p>
      </div>
    );
  }


  // ── Full-screen login gate ─────────────────────────────────────────────────
  if (!adminAuthenticated) {
    return (
      <div className="app-container">
        <header className="app-header" style={{ justifyContent: 'center' }}>
          <div className="logo-section">
            <div className="logo-icon"><Cpu size={24} /></div>
            <div className="logo-text">GATEWAY<span>ROUTER</span></div>
          </div>
        </header>
        <AdminLogin onLoginSuccess={handleAdminLogin} />
        <footer style={{ marginTop: '4rem', padding: '1.5rem 0', borderTop: '1px solid var(--glass-border)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Payment Gateway Router System • Secure Admin Access Required
        </footer>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">
            <Cpu size={24} />
          </div>
          <div className="logo-text">
            GATEWAY<span>ROUTER</span>
          </div>
        </div>

        <nav className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={16} /> Console
          </button>
          <button 
            className={`tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
            onClick={() => setActiveTab('simulator')}
          >
            <CreditCard size={16} /> API Simulator
          </button>
          <button 
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <History size={16} /> API Logs
          </button>
          <button 
            className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
            style={activeTab === 'admin' ? {} : { borderColor: 'rgba(99,102,241,0.3)', color: 'var(--color-primary)' }}
          >
            <ShieldCheck size={16} /> Admin
          </button>
        </nav>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            onClick={() => loadData(true)} 
            disabled={refreshing}
            className="tab-btn" 
            style={{ border: '1px solid var(--glass-border)' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spinner' : ''} /> Refresh
          </button>
          <button
            onClick={handleAdminLogout}
            className="tab-btn"
            style={{ border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', gap: '0.4rem' }}
            title="Sign out"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      {error && (
        <div className="card-glass" style={{ 
          padding: '1rem 1.5rem', 
          borderColor: 'var(--color-danger)', 
          background: 'var(--color-danger-glow)',
          color: 'white',
          marginBottom: '2rem',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main Views */}
      {activeTab === 'dashboard' && (
        <div className="dashboard-grid">
          {/* Main Panel */}
          <div>
            <Dashboard 
              transactions={transactions} 
              gateways={gateways} 
              routerStatus={routerStatus} 
            />

            {/* List of Gateways */}
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 className="panel-title" style={{ fontSize: '1.2rem' }}>
                  <Layers size={18} className="text-primary" /> Integrated Providers
                </h2>
              </div>
              <div className="gateways-list">
                {gateways.map(gw => (
                  <GatewayCard 
                    key={gw.id} 
                    gateway={gw} 
                    isNext={routerStatus.next_gateway_id === gw.id}
                    onToggleActive={handleToggleActive}
                    onUpdateConfig={handleUpdateConfig}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Router state / Next up queue */}
          <div>
            <div className="card-glass router-status-panel">
              <h2 className="panel-title">
                <Cpu size={18} className="text-secondary" /> Router Config State
              </h2>
              
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Shows the current round-robin configuration index state loaded on the API gateway layer.
              </div>

              <div className="next-indicator">
                <div className="next-indicator-dot"></div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Next Routed Gateway</div>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#fff', textTransform: 'capitalize' }}>
                    {routerStatus.next_gateway_name || 'No active gateways'}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  ROUND-ROBIN ROUTING SEQUENCE
                </div>
                {routerStatus.queue_order && routerStatus.queue_order.length > 0 ? (
                  <div className="queue-viz">
                    {routerStatus.queue_order.map((gwId, idx) => {
                      const isTarget = routerStatus.next_gateway_id === gwId;
                      return (
                        <React.Fragment key={gwId}>
                          {idx > 0 && <span className="queue-arrow">→</span>}
                          <div className={`queue-item ${isTarget ? 'active' : ''}`}>
                            <span style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%', 
                              backgroundColor: isTarget ? 'var(--color-primary)' : 'var(--text-muted)' 
                            }}></span>
                            {gwId.toUpperCase()}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: '500' }}>
                    Warning: 0 active providers. API checkout requests will reject with 503 Service Unavailable.
                  </div>
                )}
              </div>

              <div style={{ 
                borderTop: '1px solid var(--glass-border)', 
                paddingTop: '1rem', 
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discovered Providers:</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>{gateways.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Active Routing Nodes:</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>{routerStatus.active_gateways_count || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Counter Offset:</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>{routerStatus.total_transactions || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'simulator' && (
        <CheckoutForm onCheckoutSuccess={() => loadData(false)} />
      )}

      {activeTab === 'logs' && (
        <TransactionTable transactions={transactions} />
      )}

      {activeTab === 'admin' && (
        <AdminPanel token={null} onLogout={handleAdminLogout} />
      )}

      <footer style={{ marginTop: '4rem', padding: '1.5rem 0', borderTop: '1px solid var(--glass-border)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Payment Gateway Router System • Extensible Design • Dark Dashboard Mode • Built with React & FastAPI
      </footer>
    </div>
  );
}
