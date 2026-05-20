const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api`;

// ── Token helpers ──────────────────────────────────────────────────────────────
export function getAdminToken() {
  return localStorage.getItem('adminToken');
}

export function setAdminToken(token) {
  localStorage.setItem('adminToken', token);
}

export function clearAdminToken() {
  localStorage.removeItem('adminToken');
}

export function isAdminLoggedIn() {
  return !!getAdminToken();
}

// ── Admin auth ─────────────────────────────────────────────────────────────────
export async function adminLogin(username, password) {
  const response = await fetch(`${API_BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Login failed');
  }
  return response.json();
}

// ── Gateway endpoints ──────────────────────────────────────────────────────────
export async function fetchGateways() {
  const response = await fetch(`${API_BASE_URL}/gateways`);
  if (!response.ok) throw new Error('Failed to fetch payment gateways');
  return response.json();
}

export async function updateGateway(gatewayId, data) {
  const token = getAdminToken();
  const response = await fetch(`${API_BASE_URL}/gateways/${gatewayId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to update gateway ${gatewayId}`);
  }
  return response.json();
}

// ── Transaction endpoints ──────────────────────────────────────────────────────
export async function fetchTransactions() {
  const response = await fetch(`${API_BASE_URL}/transactions`);
  if (!response.ok) throw new Error('Failed to fetch transactions');
  return response.json();
}

export async function fetchTransaction(transactionId) {
  const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}`);
  if (!response.ok) throw new Error('Failed to fetch transaction details');
  return response.json();
}

export async function fetchRouterStatus() {
  const response = await fetch(`${API_BASE_URL}/router/status`);
  if (!response.ok) throw new Error('Failed to fetch router status');
  return response.json();
}

// ── Order creation ─────────────────────────────────────────────────────────────
export async function createOrder(payload) {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Order creation failed');
  }
  return response.json();
}

