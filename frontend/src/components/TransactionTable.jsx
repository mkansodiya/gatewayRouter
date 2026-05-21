import React, { useState } from 'react';
import { Search, Filter, Calendar } from 'lucide-react';

export default function TransactionTable({ transactions = [] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gatewayFilter, setGatewayFilter] = useState('all');

  // Derive unique gateway IDs from logs to filter
  const uniqueGateways = Array.from(new Set(transactions.map(t => t.gateway_id)));

  // Filter logs
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.id.toLowerCase().includes(search.toLowerCase()) || 
      (t.reference_id && t.reference_id.toLowerCase().includes(search.toLowerCase()));
      
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesGateway = gatewayFilter === 'all' || t.gateway_id === gatewayFilter;

    return matchesSearch && matchesStatus && matchesGateway;
  });

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="card-glass logs-section">
      <div className="logs-header">
        <h2 className="panel-title">Transaction API Router Logs</h2>
        
        <div className="table-controls">
          {/* Search bar */}
          <div className="table-search-bar" style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search ID or Ref..." 
              className="form-control"
              style={{ paddingLeft: '2.25rem', width: '220px', paddingRight: '0.75rem', height: '38px' }}
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
            <Search size={14} style={{ 
              position: 'absolute', 
              left: '0.85rem', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--text-muted)' 
            }} />
          </div>

          {/* Gateway Filter */}
          <select 
            className="form-control" 
            style={{ width: '130px', height: '38px', padding: '0.25rem 0.5rem' }}
            value={gatewayFilter} 
            onChange={(e) => setGatewayFilter(e.target.value)}
          >
            <option value="all">All Gateways</option>
            {uniqueGateways.map(gw => (
              <option key={gw} value={gw}>{gw.toUpperCase()}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select 
            className="form-control" 
            style={{ width: '120px', height: '38px', padding: '0.25rem 0.5rem' }}
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        {filteredTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No matching transactions found in database logs.
          </div>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Gateway</th>
                <th>Reference ID</th>
                <th>UTR</th>
                <th>Amount (USD)</th>
                <th>Status</th>
                <th>Routed Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(tx => (
                <tr key={tx.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {tx.id}
                  </td>
                  <td>
                    <span className="badge provider" style={{ textTransform: 'capitalize' }}>
                      {tx.gateway_id}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{tx.reference_id}</td>
                  <td style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: tx.utr ? 'white' : 'var(--text-muted)' }}>
                    {tx.utr || '-'}
                  </td>
                  <td style={{ fontWeight: '600' }}>
                    ₹{tx.amount.toFixed(2)}
                  </td>
                  <td>
                    {tx.status === 'success' ? (
                      <span className="badge success">success</span>
                    ) : tx.status === 'pending' ? (
                      <span className="badge pending" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>pending</span>
                    ) : (
                      <span 
                        className="badge failed" 
                        title={tx.error_message} 
                        style={{ cursor: 'help' }}
                      >
                        failed
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={12} /> {formatDate(tx.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
