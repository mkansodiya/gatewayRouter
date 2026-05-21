const _apiBase = import.meta.env.VITE_API_BASE_URL;
if (!_apiBase) throw new Error('VITE_API_BASE_URL is not set. Check your .env file or docker-compose environment.');
const API_BASE_URL = `${_apiBase}/api`;

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

// ── Internal fetch helpers ─────────────────────────────────────────────────────
function authHeaders() {
  const token = getAdminToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);
  if (response.status === 401) {
    // Token expired or invalid — force logout
    clearAdminToken();
    window.location.reload();
  }
  return response;
}

// ── Admin auth (PUBLIC — no token needed) ──────────────────────────────────────
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

// ── Gateway endpoints (PROTECTED) ─────────────────────────────────────────────
export async function fetchGateways() {
  const response = await apiFetch(`${API_BASE_URL}/gateways`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Failed to fetch payment gateways');
  return response.json();
}

export async function updateGateway(gatewayId, data) {
  const response = await apiFetch(`${API_BASE_URL}/gateways/${gatewayId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
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

// PROTECTED — admin list view
export async function fetchTransactions() {
  const response = await apiFetch(`${API_BASE_URL}/transactions`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Failed to fetch transactions');
  return response.json();
}

// PUBLIC — used by the payment page (no auth)
export async function fetchTransaction(transactionId) {
  const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}`);
  if (!response.ok) throw new Error('Failed to fetch transaction details');
  return response.json();
}

// PROTECTED — router status
export async function fetchRouterStatus() {
  const response = await apiFetch(`${API_BASE_URL}/router/status`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Failed to fetch router status');
  return response.json();
}

// ── Order creation (PUBLIC — no token needed) ──────────────────────────────────
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

// ── Admin update credentials (PROTECTED) ─────────────────────────────────────────
export async function updateAdminCredentials(username, password) {
  const body = {};
  if (username) body.username = username;
  if (password) body.password = password;

  const response = await apiFetch(`${API_BASE_URL}/admin/credentials`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update credentials');
  }
  return response.json();
}
