const BASE = 'http://localhost:8000/api/v1';

function getToken() { return localStorage.getItem('access_token'); }
function setTokens(access, refresh) {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}
function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('pos_user');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Try refresh
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      const r = await fetch(`${BASE}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (r.ok) {
        const d = await r.json();
        localStorage.setItem('access_token', d.data.access);
        headers['Authorization'] = `Bearer ${d.data.access}`;
        res = await fetch(`${BASE}${path}`, { ...options, headers });
      } else {
        clearTokens();
        window.dispatchEvent(new Event('auth:logout'));
        throw new Error('Session expired');
      }
    }
  }

  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw data?.error || { message: 'Request failed' };
  return data?.data ?? data;
}

export const api = {
  setTokens, clearTokens,
  getUser: () => JSON.parse(localStorage.getItem('pos_user') || 'null'),
  setUser: (u) => localStorage.setItem('pos_user', JSON.stringify(u)),

  // Auth
  login: (body) => request('/auth/login/', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout/', { method: 'POST', body: JSON.stringify({ refresh: localStorage.getItem('refresh_token') }) }),

  // Categories
  getCategories: () => request('/categories/'),
  createCategory: (body) => request('/categories/', { method: 'POST', body: JSON.stringify(body) }),
  deleteCategory: (id) => request(`/categories/${id}/`, { method: 'DELETE' }),

  // Products
  getProducts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/products/${q ? '?' + q : ''}`);
  },
  createProduct: (body) => request('/products/', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) => request(`/products/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProduct: (id) => request(`/products/${id}/`, { method: 'DELETE' }),

  // Orders
  createOrder: (body) => request('/orders/', { method: 'POST', body: JSON.stringify(body) }),
  getOrders: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/orders/${q ? '?' + q : ''}`);
  },
  getOrder: (id) => request(`/orders/${id}/`),
  voidOrder: (id, reason) => request(`/orders/${id}/void/`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Reports
  getSummary: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports/summary/${q ? '?' + q : ''}`);
  },
  getLowStock: () => request('/reports/low-stock/'),

  // Users
  getUsers: () => request('/users/'),
  createUser: (body) => request('/users/', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/users/${id}/`, { method: 'PATCH', body: JSON.stringify(body) }),
};
