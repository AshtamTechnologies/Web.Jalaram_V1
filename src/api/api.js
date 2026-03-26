import axios from 'axios';

const API_BASE_URL = 'https://api.jalaram-ad.ashtamtechnologies.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 80000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Interceptor: attach token to every request ──────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Interceptor: handle 401 globally ────────────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login?session=expired';
    }
    return Promise.reject(error);
  }
);

// ── Helper: decode JWT to extract claims ────────────────────
const decodeJWT = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(
      atob(base64).split('').map((c) =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    ));
  } catch { return null; }
};

// ========================================
// API SERVICE
// ========================================
export const apiService = {

  loginUser: async ({ email, password }) => {
    const response = await api.post('/Login/login', { email, password });

    // ── Token ────────────────────────────────────────────────
    const rawToken = response.token || response.accessToken;
    if (rawToken) {
      const token = rawToken.replace(/^Bearer\s+/i, '').trim();
      localStorage.setItem('authToken', token);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
    }

    // ── User ID ──────────────────────────────────────────────
    let userId = response.userId || response.user?.id || null;
    if (!userId && rawToken) {
      const decoded = decodeJWT(rawToken);
      userId = decoded?.nameid || decoded?.sub || decoded?.userId || decoded?.id;
    }
    if (userId) localStorage.setItem('userId', String(userId));

    // ── Role ─────────────────────────────────────────────────
    const roleId = response.roleId || response.user?.roleId || 2;
    localStorage.setItem('roleId',   String(roleId));
    localStorage.setItem('userRole', roleId === 1 || roleId === '1' ? 'admin' : 'user');

    // ── User data & login flag ───────────────────────────────
    localStorage.setItem('userData',   JSON.stringify(response.user || response));
    localStorage.setItem('isLoggedIn', 'true');

    return response;
  },

  // POST /Login/forgot-password  →  body: { email }
  forgotPassword: (email) =>
    api.post('/Login/forgot-password', { email }),

  // POST /Login/reset-password  →  body: { email, newPassword }
  // Used for both forced password change on first login & normal reset
  resetPassword: (data) =>
    api.post('/Login/reset-password', {
      email:       data.email,
      newPassword: data.newPassword,
    }),

  logoutUser: () => {
    localStorage.clear();
    window.location.replace('/login');
  },
};

export default api;