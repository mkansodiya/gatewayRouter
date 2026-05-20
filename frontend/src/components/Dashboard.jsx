import React from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, Cpu, IndianRupee } from 'lucide-react';

export default function Dashboard({ transactions = [], gateways = [], routerStatus = {} }) {
  // Calculate Stats
  const totalCount = transactions.length;
  const successCount = transactions.filter(t => t.status === 'success').length;
  const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : '100.0';
  
  const totalVolume = transactions
    .filter(t => t.status === 'success')
    .reduce((sum, t) => sum + t.amount, 0);

  const activeGatewaysCount = gateways.filter(g => g.is_active).length;

  // Calculate distribution of transactions per gateway
  const distribution = gateways.map(gw => {
    const gwTxs = transactions.filter(t => t.gateway_id === gw.id);
    const count = gwTxs.length;
    const successTxCount = gwTxs.filter(t => t.status === 'success').length;
    const rate = count > 0 ? ((successTxCount / count) * 100).toFixed(0) : 0;
    const sharePercent = totalCount > 0 ? ((count / totalCount) * 100).toFixed(0) : 0;
    
    return {
      id: gw.id,
      name: gw.name,
      count,
      successRate: rate,
      sharePercent
    };
  });

  return (
    <div>
      {/* Metrics Row */}
      <div className="metrics-row">
        
        <div className="card-glass metric-card primary">
          <div className="metric-icon-wrapper">
            <Cpu size={24} />
          </div>
          <div className="metric-val">{activeGatewaysCount} / {gateways.length}</div>
          <div className="metric-lbl">Active Gateways</div>
        </div>

        <div className="card-glass metric-card secondary">
          <div className="metric-icon-wrapper">
            <CreditCard size={24} />
          </div>
          <div className="metric-val">{totalCount}</div>
          <div className="metric-lbl">Total API Requests</div>
        </div>

        <div className="card-glass metric-card success">
          <div className="metric-icon-wrapper">
            <CheckCircle2 size={24} />
          </div>
          <div className="metric-val">{successRate}%</div>
          <div className="metric-lbl">Router Success Rate</div>
        </div>

        <div className="card-glass metric-card warning">
          <div className="metric-icon-wrapper">
            <IndianRupee size={24} />
          </div>
          <div className="metric-val">₹{totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="metric-lbl">Total Routed Volume</div>
        </div>

      </div>

      {/* Distribution Chart Widget */}
      <div className="card-glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 className="panel-title" style={{ marginBottom: '1rem' }}>
          <Cpu size={20} className="text-primary" /> Routing Distribution
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Real-time split of API traffic routed across active gateways via round-robin.
        </p>

        {totalCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <AlertTriangle size={32} style={{ marginBottom: '0.5rem', color: 'var(--color-warning)' }} />
            <p>No transactions routed yet. Use the checkout simulator to route payments.</p>
          </div>
        ) : (
          <div className="chart-distribution">
            {distribution.map(gw => (
              <div className="chart-bar-row" key={gw.id}>
                <div className="chart-bar-info">
                  <span>{gw.name} ({gw.count} txs)</span>
                  <span className="val">{gw.sharePercent}% share • {gw.successRate}% success</span>
                </div>
                <div className="chart-bar-bg">
                  <div 
                    className="chart-bar-fill" 
                    style={{ 
                      width: `${gw.sharePercent}%`,
                      background: gw.id === 'stripe' 
                        ? 'linear-gradient(to right, #6366f1, #4f46e5)' 
                        : gw.id === 'paypal'
                        ? 'linear-gradient(to right, #a855f7, #9333ea)'
                        : 'linear-gradient(to right, #10b981, #059669)'
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
