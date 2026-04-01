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

// ── Helper: validate that a JWT string is structurally sound ─
const isValidJWT = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.replace(/^Bearer\s+/i, '').trim().split('.');
  return parts.length === 3 && parts.every(p => p.length > 0);
};

// ========================================
// API SERVICE
// ========================================
export const apiService = {

  // ─────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────

  loginUser: async ({ email, password }) => {
    const response = await api.post('/Login/login', { email, password });

    // ── Forced password change — return early, don't store anything ──
    if (response.forcePasswordChange === true) {
      return response;
    }

    // ── Strict token validation ──────────────────────────────────────
    const rawToken = response.token || response.accessToken;

    if (!isValidJWT(rawToken)) {
      localStorage.clear();
      const err = new Error('Authentication failed: no valid token received.');
      err.response = { data: { message: 'Invalid credentials or server error.' } };
      throw err;
    }

    const token = rawToken.replace(/^Bearer\s+/i, '').trim();

    // ── Decode and sanity-check the token payload ────────────────────
    const decoded = decodeJWT(token);
    if (!decoded) {
      localStorage.clear();
      const err = new Error('Authentication failed: could not decode token.');
      err.response = { data: { message: 'Invalid credentials or server error.' } };
      throw err;
    }

    // ── Verify the token is not already expired ──────────────────────
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.clear();
      const err = new Error('Authentication failed: token is already expired.');
      err.response = { data: { message: 'Session expired. Please try again.' } };
      throw err;
    }

    // ── All checks passed — persist auth data ────────────────────────
    localStorage.setItem('authToken', token);

    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }

    let userId = response.userId || response.user?.id || null;
    if (!userId) {
      userId = decoded?.nameid || decoded?.sub || decoded?.userId || decoded?.id;
    }
    if (userId) localStorage.setItem('userId', String(userId));

    const roleId = response.roleId || response.user?.roleId || 2;
    localStorage.setItem('roleId',   String(roleId));
    localStorage.setItem('userRole', roleId === 1 || roleId === '1' ? 'admin' : 'user');

    localStorage.setItem('userData',   JSON.stringify(response.user || response));
    localStorage.setItem('isLoggedIn', 'true');

    return response;
  },

  forgotPassword: (email) =>
    api.post('/Login/forgot-password', { email }),

  resetPassword: (data) =>
    api.post('/Login/reset-password', {
      email:       data.email,
      newPassword: data.newPassword,
    }),

  logoutUser: () => {
    localStorage.clear();
    window.location.replace('/login');
  },

  // ─────────────────────────────────────
  // OWNERS
  // API field names confirmed from Swagger:
  //   ownerID (PK), ownerName, alternateContactName,
  //   ownerAddress, phone1, phone2, city, district,
  //   state, country, emailAddress
  // ─────────────────────────────────────

  getAllOwners: () =>
    api.get('/Owner'),

  getOwnerById: (ownerId) =>
    api.get(`/Owner/${ownerId}`),

  createOwner: (ownerData) =>
    api.post('/Owner', {
      ownerName:            ownerData.ownerName,
      alternateContactName: ownerData.alternateContactName,
      ownerAddress:         ownerData.ownerAddress,
      phone1:               ownerData.phone1,
      phone2:               ownerData.phone2,
      city:                 ownerData.city,
      district:             ownerData.district,
      state:                ownerData.state,
      country:              ownerData.country,
      emailAddress:         ownerData.emailAddress,
    }),

  updateOwner: (ownerId, ownerData) =>
    api.put(`/Owner/${ownerId}`, {
      ownerID:              Number(ownerId),
      ownerName:            ownerData.ownerName,
      alternateContactName: ownerData.alternateContactName,
      ownerAddress:         ownerData.ownerAddress,
      phone1:               ownerData.phone1,
      phone2:               ownerData.phone2,
      city:                 ownerData.city,
      district:             ownerData.district,
      state:                ownerData.state,
      country:              ownerData.country,
      emailAddress:         ownerData.emailAddress,
    }),

  deleteOwner: (ownerId) =>
    api.delete(`/Owner/${ownerId}`),

  // ─────────────────────────────────────
  // SITES
  // API body schema (confirmed):
  //   siteID (PK), addressLine1, addressLine2,
  //   addressLine3, landmark, city, district,
  //   siteType, country, ownerID (FK → Owner)
  // ─────────────────────────────────────

  getAllSites: () =>
    api.get('/Site'),

  getSiteById: (siteId) =>
    api.get(`/Site/${siteId}`),

  createSite: (siteData) =>
    api.post('/Site', {
      siteID:       0,
      addressLine1: siteData.addressLine1,
      addressLine2: siteData.addressLine2  || '',
      addressLine3: siteData.addressLine3  || '',
      landmark:     siteData.landmark      || '',
      city:         siteData.city,
      district:     siteData.district,
      siteType:     siteData.siteType      || '',
      country:      siteData.country,
      ownerID:      Number(siteData.ownerID),
    }),

  updateSite: (siteId, siteData) =>
    api.put(`/Site/${siteId}`, {
      siteID:       Number(siteId),
      addressLine1: siteData.addressLine1,
      addressLine2: siteData.addressLine2  || '',
      addressLine3: siteData.addressLine3  || '',
      landmark:     siteData.landmark      || '',
      city:         siteData.city,
      district:     siteData.district,
      siteType:     siteData.siteType      || '',
      country:      siteData.country,
      ownerID:      Number(siteData.ownerID),
    }),

  deleteSite: (siteId) =>
    api.delete(`/Site/${siteId}`),

  // ─────────────────────────────────────
  // HOARDING TYPES
  // Returns: [{ hoardingTypeID, hoardingTypeName, ... }, ...]
  // Used to dynamically populate the "Hoarding Type" dropdown
  // instead of hardcoded HOARDING_TYPE_LABELS / OPTIONS constants
  // ─────────────────────────────────────

  getAllHoardingTypes: () =>
    api.get('/HoardingType'),

  // ─────────────────────────────────────
  // HOARDINGS
  // ─────────────────────────────────────

  getAllHoardings: () =>
    api.get('/Hoarding'),

  getHoardingById: (hoardingID) =>
    api.get(`/Hoarding/${hoardingID}`),

  createHoarding: (data) =>
    api.post('/Hoarding', {
      hoardingID:   0,
      effdt:        data.effdt
                      ? new Date(data.effdt + 'T00:00:00.000Z').toISOString()
                      : new Date().toISOString(),
      hoardingCode: data.hoardingCode,
      material:     data.material,
      hoardingType: Number(data.hoardingType),
      status:       data.status,
      monthlyRent:  Number(data.monthlyRent),
      width:        Number(data.width),
      height:       Number(data.height),
      siteID:       Number(data.siteID),
    }),

  addHoardingEffdt: (hoardingCode, data) =>
    api.post('/Hoarding', {
      hoardingID:   0,
      effdt:        data.effdt
                      ? new Date(data.effdt + 'T00:00:00.000Z').toISOString()
                      : new Date().toISOString(),
      hoardingCode: hoardingCode,
      material:     data.material,
      hoardingType: Number(data.hoardingType),
      status:       data.status,
      monthlyRent:  Number(data.monthlyRent),
      width:        Number(data.width),
      height:       Number(data.height),
      siteID:       Number(data.siteID),
    }),

  updateHoarding: (hoardingID, data) =>
    api.put(`/Hoarding/${hoardingID}`, {
      hoardingID:   Number(hoardingID),
      effdt:        data.effdt
                      ? new Date(data.effdt + 'T00:00:00.000Z').toISOString()
                      : new Date().toISOString(),
      hoardingCode: data.hoardingCode,
      material:     data.material,
      hoardingType: Number(data.hoardingType),
      status:       data.status,
      monthlyRent:  Number(data.monthlyRent),
      width:        Number(data.width),
      height:       Number(data.height),
      siteID:       Number(data.siteID),
    }),

  deleteHoarding: (hoardingID) =>
    api.delete(`/Hoarding/${hoardingID}`),

  // ─────────────────────────────────────
  // HOARDING EXPENSES
  // ─────────────────────────────────────

  getAllExpenses: () =>
    api.get('/HoardingExpense'),

  getExpenseById: (expenseID) =>
    api.get(`/HoardingExpense/${expenseID}`),

  createExpense: (data) =>
    api.post('/HoardingExpense', {
      expenseID:   0,
      hoardingID:  Number(data.hoardingID),
      expenseDate: data.expenseDate
                     ? new Date(data.expenseDate).toISOString()
                     : new Date().toISOString(),
      expenseType: data.expenseType,
      expenseDTL:  data.expenseDTL,
      amount:      Number(data.amount),
      paidBy:      data.paidBy,
      comments:    data.comments || '',
    }),

  updateExpense: (expenseID, data) =>
    api.put(`/HoardingExpense/${expenseID}`, {
      expenseID:   Number(expenseID),
      hoardingID:  Number(data.hoardingID),
      expenseDate: data.expenseDate
                     ? new Date(data.expenseDate).toISOString()
                     : new Date().toISOString(),
      expenseType: data.expenseType,
      expenseDTL:  data.expenseDTL,
      amount:      Number(data.amount),
      paidBy:      data.paidBy,
      comments:    data.comments || '',
    }),

  deleteExpense: (expenseID) =>
    api.delete(`/HoardingExpense/${expenseID}`),
};

export default api;