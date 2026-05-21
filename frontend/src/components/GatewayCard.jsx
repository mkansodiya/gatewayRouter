import React, { useState } from 'react';
import { Settings, ArrowUp } from 'lucide-react';

export default function GatewayCard({ gateway, isNext, onToggleActive, onUpdateConfig }) {
  const [isEditing, setIsEditing] = useState(false);
  const [sortOrder, setSortOrder] = useState(gateway.sort_order);
  const [isSaving, setIsSaving] = useState(false);

  // Build initial form state from credentials_schema and current config_data values
  const buildInitialFields = () => {
    const schema = gateway.credentials_schema || [];
    return schema.reduce((acc, field) => {
      acc[field.name] = gateway.config_data[field.name] ?? '';
      return acc;
    }, {});
  };

  const [fieldValues, setFieldValues] = useState(buildInitialFields);

  const handleFieldChange = (fieldName, value) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateConfig(gateway.id, {
        sort_order: parseInt(sortOrder),
        config_data: fieldValues, // all credential fields from the dynamic schema
      });
      setIsEditing(false);
    } catch (err) {
      alert('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const getGatewayColor = (id) => {
    // Color lookup is purely visual; any new provider will default to primary color automatically
    switch (id) {
      case 'okpay': return '#eab308';
      default: return 'var(--color-primary)';
    }
  };

  const schema = gateway.credentials_schema || [];

  return (
    <div
      className={`card-glass gateway-card ${isNext ? 'next-active-card' : ''}`}
      style={{
        padding: '1.25rem',
        borderLeft: isNext
          ? `4px solid ${getGatewayColor(gateway.id)}`
          : '1px solid var(--glass-border)',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ width: '100%' }}>
        {/* Header row */}
        <div className="gateway-card-header">
          <div className="gateway-info">
            <div
              className="gateway-avatar"
              style={{
                color: 'white',
                background: `linear-gradient(135deg, ${getGatewayColor(gateway.id)}, var(--bg-tertiary))`,
              }}
            >
              {gateway.name.substring(0, 1)}
            </div>
            <div className="gateway-meta">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {gateway.name}
                {isNext && (
                  <span
                    className="badge success"
                    style={{
                      fontSize: '0.65rem',
                      padding: '0.15rem 0.4rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                    }}
                  >
                    <ArrowUp size={10} /> Next In Queue
                  </span>
                )}
              </h3>
              <span>
                ID: {gateway.id} &bull; Sort Order: {gateway.sort_order} &bull;{' '}
                {schema.length} credential field{schema.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="gateway-controls">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="tab-btn"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: 'auto' }}
            >
              <Settings size={14} /> Config
            </button>
            <label className="switch">
              <input
                type="checkbox"
                checked={gateway.is_active}
                onChange={(e) => onToggleActive(gateway.id, e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        {/* Dynamic Configuration Form */}
        {isEditing && (
          <div
            style={{
              marginTop: '1.25rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--glass-border)',
            }}
          >
            {/* Sort order always available */}
            <div className="gateway-form-grid" style={{ marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Sort Order Index</label>
                <input
                  type="number"
                  className="form-control"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
            </div>

            {/* Dynamically generated credential fields from provider's schema */}
            {schema.length > 0 ? (
              <div className="gateway-form-grid">
                {schema.map((field) => (
                  <div
                    key={field.name}
                    className="form-group"
                    style={{
                      marginBottom: 0,
                      gridColumn: field.type === 'url' ? 'span 2' : 'span 1',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {field.label}
                      {field.type === 'password' && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            background: 'rgba(239,68,68,0.12)',
                            color: '#ef4444',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                          }}
                        >
                          SENSITIVE
                        </span>
                      )}
                    </label>
                    <input
                      type={field.type || 'text'}
                      className="form-control"
                      placeholder={field.placeholder || ''}
                      value={fieldValues[field.name] ?? ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      autoComplete={field.type === 'password' ? 'new-password' : 'off'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                This provider has no configurable credential fields.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={() => setIsEditing(false)}
                className="tab-btn"
                style={{ padding: '0.4rem 1rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="submit-btn"
                style={{ padding: '0.4rem 1rem', width: 'auto', margin: 0, fontSize: '0.85rem' }}
              >
                {isSaving ? 'Saving...' : 'Save Credentials'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
