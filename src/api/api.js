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
// Safely convert any effdt value to a valid ISO string
// Handles: already ISO ("2024-01-15T00:00:00.000Z"), date-only ("2024-01-15"), null/undefined
function toSafeISO(effdt) {
  if (!effdt) return new Date().toISOString();
  // Already a full ISO string — return as-is
  if (typeof effdt === 'string' && effdt.includes('T')) {
    const d = new Date(effdt);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  // Date-only string "YYYY-MM-DD"
  const d = new Date(effdt + 'T00:00:00.000Z');
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
} 
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
const statusToNum = (s) => (s === 'Active' ? 1 : 0);
export const apiService = {

  // ─────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────

  loginUser: async ({ email, password }) => {
    const response = await api.post('/Login/login', { email, password });

    if (response.forcePasswordChange === true) {
      return response;
    }

    const rawToken = response.token || response.accessToken;

    if (!isValidJWT(rawToken)) {
      localStorage.clear();
      const err = new Error('Authentication failed: no valid token received.');
      err.response = { data: { message: 'Invalid credentials or server error.' } };
      throw err;
    }

    const token = rawToken.replace(/^Bearer\s+/i, '').trim();

    const decoded = decodeJWT(token);
    if (!decoded) {
      localStorage.clear();
      const err = new Error('Authentication failed: could not decode token.');
      err.response = { data: { message: 'Invalid credentials or server error.' } };
      throw err;
    }

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.clear();
      const err = new Error('Authentication failed: token is already expired.');
      err.response = { data: { message: 'Session expired. Please try again.' } };
      throw err;
    }

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
    localStorage.setItem('roleId', String(roleId));
    localStorage.setItem('userRole', roleId === 1 || roleId === '1' ? 'admin' : 'user');

    localStorage.setItem('userData', JSON.stringify(response.user || response));
    localStorage.setItem('isLoggedIn', 'true');

    return response;
  },

  forgotPassword: (email) =>
    api.post('/Login/forgot-password', { email }),

  resetPassword: (data) =>
    api.post('/Login/reset-password', {
      email: data.email,
      newPassword: data.newPassword,
    }),

  logoutUser: () => {
    localStorage.clear();
    window.location.replace('/login');
  },

  // ─────────────────────────────────────
  // OWNERS
  // ─────────────────────────────────────

  getAllOwners: () =>
    api.get('/Owner'),

  getOwnerById: (ownerId) =>
    api.get(`/Owner/${ownerId}`),

  createOwner: (ownerData) =>
    api.post('/Owner', {
      ownerName: ownerData.ownerName,
      alternateContactName: ownerData.alternateContactName,
      ownerAddress: ownerData.ownerAddress,
      phone1: ownerData.phone1,
      phone2: ownerData.phone2,
      city: ownerData.city,
      district: ownerData.district,
      state: ownerData.state,
      country: ownerData.country,
      emailAddress: ownerData.emailAddress,
    }),

  updateOwner: (ownerId, ownerData) =>
    api.put(`/Owner/${ownerId}`, {
      ownerID: Number(ownerId),
      ownerName: ownerData.ownerName,
      alternateContactName: ownerData.alternateContactName,
      ownerAddress: ownerData.ownerAddress,
      phone1: ownerData.phone1,
      phone2: ownerData.phone2,
      city: ownerData.city,
      district: ownerData.district,
      state: ownerData.state,
      country: ownerData.country,
      emailAddress: ownerData.emailAddress,
    }),

  deleteOwner: (ownerId) =>
    api.delete(`/Owner/${ownerId}`),

  // ─────────────────────────────────────
  // SITES
  // ─────────────────────────────────────

  getAllSites: () =>
    api.get('/Site'),

  getSiteById: (siteId) =>
    api.get(`/Site/${siteId}`),

  createSite: (siteData) =>
    api.post('/Site', {
      siteID: 0,
      addressLine1: siteData.addressLine1,
      addressLine2: siteData.addressLine2 || '',
      addressLine3: siteData.addressLine3 || '',
      landmark: siteData.landmark || '',
      city: siteData.city,
      district: siteData.district,
      siteType: siteData.siteType || '',
      country: siteData.country,
      status: statusToNum(siteData.status),   // ← ADD
      ownerID: Number(siteData.ownerID),
    }),

  updateSite: (siteId, siteData) =>
    api.put(`/Site/${siteId}`, {
      siteID: Number(siteId),
      addressLine1: siteData.addressLine1,
      addressLine2: siteData.addressLine2 || '',
      addressLine3: siteData.addressLine3 || '',
      landmark: siteData.landmark || '',
      city: siteData.city,
      district: siteData.district,
      siteType: siteData.siteType || '',
      country: siteData.country,
      status: statusToNum(siteData.status),   // ← ADD
      ownerID: Number(siteData.ownerID),
    }),

  deleteSite: (siteId) =>
    api.delete(`/Site/${siteId}`),

  // ─────────────────────────────────────
  // HOARDING TYPES
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
      hoardingID: 0,
      effdt: data.effdt
        ? new Date(data.effdt + 'T00:00:00.000Z').toISOString()
        : new Date().toISOString(),
      hoardingCode: data.hoardingCode,
      material: data.material,
      hoardingType: Number(data.hoardingType),
      status: data.status,
      monthlyRent: Number(data.monthlyRent),
      width: Number(data.width),
      height: Number(data.height),
      siteID: Number(data.siteID),
    }),

  addHoardingEffdt: (hoardingCode, data) =>
    api.post('/Hoarding', {
      hoardingID: 0,
      effdt: data.effdt
        ? new Date(data.effdt + 'T00:00:00.000Z').toISOString()
        : new Date().toISOString(),
      hoardingCode: hoardingCode,
      material: data.material,
      hoardingType: Number(data.hoardingType),
      status: data.status,
      monthlyRent: Number(data.monthlyRent),
      width: Number(data.width),
      height: Number(data.height),
      siteID: Number(data.siteID),
    }),

updateHoarding: (hoardingID, data) =>
  api.put(`/Hoarding/${hoardingID}`, {
    hoardingID: Number(hoardingID),
    effdt: toSafeISO(data.effdt),   // ← use helper
    hoardingCode: data.hoardingCode,
    material: data.material,
    hoardingType: Number(data.hoardingType),
    status: data.status,
    monthlyRent: Number(data.monthlyRent),
    width: Number(data.width),
    height: Number(data.height),
    siteID: Number(data.siteID),
  }),
  deleteHoarding: (hoardingID) =>
    api.delete(`/Hoarding/${hoardingID}`),

  // ─────────────────────────────────────
  // HOARDING EXPENSES

  // ─────────────────────────────────────

  // GET /api/HoardingExpense — used to populate the main table
  getAllExpenses: () =>
    api.get('/HoardingExpense'),

  // GET /api/HoardingExpense/{expenseID}
  getExpenseById: (expenseID) =>
    api.get(`/HoardingExpense/${expenseID}`),

  // POST /api/HoardingExpense
  // Body: { expenseID: 0, hoardingID, expenseDate (ISO), expenseType, expenseDTL, amount, paidBy, comments }
  createExpense: (data) =>
    api.post('/HoardingExpense', {
      expenseID: 0,
      hoardingID: Number(data.hoardingID),
      expenseDate: data.expenseDate
        ? new Date(data.expenseDate).toISOString()
        : new Date().toISOString(),
      expenseType: data.expenseType,
      expenseDTL: data.expenseDTL,
      amount: Number(data.amount),
      paidBy: data.paidBy,
      comments: data.comments || '',
    }),

  // PUT /api/HoardingExpense/{expenseID}
  // Body: { expenseID, hoardingID, expenseDate (ISO), expenseType, expenseDTL, amount, paidBy, comments }
  updateExpense: (expenseID, data) =>
    api.put(`/HoardingExpense/${expenseID}`, {
      expenseID: Number(expenseID),
      hoardingID: Number(data.hoardingID),
      expenseDate: data.expenseDate
        ? new Date(data.expenseDate).toISOString()
        : new Date().toISOString(),
      expenseType: data.expenseType,
      expenseDTL: data.expenseDTL,
      amount: Number(data.amount),
      paidBy: data.paidBy,
      comments: data.comments || '',
    }),

  // DELETE /api/HoardingExpense/{expenseID}
  deleteExpense: (expenseID) =>
    api.delete(`/HoardingExpense/${expenseID}`),

  // ─────────────────────────────────────
  // HOARDING PHOTOS
  // ─────────────────────────────────────

  // GET /api/HoardingPhoto/GetByHoardingID/{hoardingID}
  // Returns [] silently on 404 (no photos yet)
  getPhotosByHoardingID: async (hoardingID) => {
    try {
      return await api.get(`/HoardingPhoto/GetByHoardingID/${hoardingID}`);
    } catch (err) {
      if (err?.response?.status === 404) return [];
      throw err;
    }
  },

  // POST /api/HoardingPhoto — multipart/form-data
  // POST /api/HoardingPhoto — multipart/form-data (used for both add AND replace)
  uploadHoardingPhoto: (formData) =>
    api.post('/HoardingPhoto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Replace = delete old + upload new
  updateHoardingPhoto: async (formData) => {
    const oldId = formData.get('hoardingPhotoID');
    // Delete the old photo first
    if (oldId && Number(oldId) > 0) {
      await api.delete(`/HoardingPhoto/${oldId}`);
    }
    // Reset ID to 0 for fresh upload
    formData.set('hoardingPhotoID', '0');
    return api.post('/HoardingPhoto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // DELETE /api/HoardingPhoto/{hoardingPhotoID}
  deleteHoardingPhoto: (hoardingPhotoID) =>
    api.delete(`/HoardingPhoto/${hoardingPhotoID}`),


  // ─────────────────────────────────────
  // LAND CONTRACTS
  // ─────────────────────────────────────
getAllPaymentFreqs: () =>
  api.get('/PaymentFreq/GetAll'),

  getAllLandContracts: () =>
    api.get('/LandContract/GetAll'),

  createLandContract: (data) => {
    const fd = new FormData();
    fd.append('landContractID', 0);
    fd.append('ownerID', data.ownerID);
    fd.append('hoardingID', data.hoardingID);
    fd.append('startDate', data.startDate);
    fd.append('endDate', data.endDate);
    fd.append('totalContractValue', data.totalContractValue);
    fd.append('paymentFreqID', data.paymentFreqID);
    fd.append('amountPerFreq', data.amountPerFreq);
    if (data.advancePaid != null && data.advancePaid !== '')
      fd.append('advancePaid', data.advancePaid);
    fd.append('status', data.status);
    fd.append('comments', data.comments || '');
    fd.append('DocumentPath', data.landContractdocument instanceof File ? 'pending' : 'none');
    if (data.landContractdocument instanceof File)
      fd.append('landContractdocument', data.landContractdocument);
    return api.post('/LandContract/Create', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

updateLandContract: async (data) => {
  const fd = new FormData();
  fd.append('landContractID',     data.landContractID);
  fd.append('ownerID',            data.ownerID);
  fd.append('hoardingID',         data.hoardingID);
  fd.append('startDate',          data.startDate);
  fd.append('endDate',            data.endDate);
  fd.append('totalContractValue', data.totalContractValue);
  fd.append('paymentFreqID',      data.paymentFreqID);
  fd.append('amountPerFreq',      data.amountPerFreq);
  if (data.advancePaid != null && data.advancePaid !== '')
    fd.append('advancePaid', data.advancePaid);
  fd.append('status',   data.status);
  fd.append('comments', data.comments || '');

  if (data.landContractdocument instanceof File) {
    // User uploaded a new file — send it directly
    fd.append('landContractdocument', data.landContractdocument);
    fd.append('DocumentPath', 'pending');
  } else if (typeof data.documentPath === 'string' && data.documentPath.trim()) {
    // No new file — re-fetch existing document from URL and re-send
    try {
      const res  = await fetch(data.documentPath);
      const blob = await res.blob();
      const name = data.documentPath.split('/').pop() || 'document';
      fd.append('landContractdocument', new File([blob], name, { type: blob.type }));
      fd.append('DocumentPath', data.documentPath);
    } catch {
      fd.append('DocumentPath', data.documentPath);
    }
  } else {
    fd.append('DocumentPath', 'none');
  }

  return api.put('/LandContract/Update', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
},

  deleteLandContract: (landContractID) =>
    api.delete(`/LandContract/Delete/${landContractID}`),





  // ─────────────────────────────────────────────────────────────────────────────
// LAND PAYMENTS
// Add these methods inside the `apiService` object in your existing api.js file
// Place them after the `deleteLandContract` method
// ─────────────────────────────────────────────────────────────────────────────

  // GET /api/LandPayment  — fetch all payments
  getAllLandPayments: () =>
    api.get('/LandPayment'),

  // GET /api/LandPayment/{id}  — fetch single payment by ID
  getLandPaymentById: (id) =>
    api.get(`/LandPayment/${id}`),

  // POST /api/LandPayment  — create a new payment
  createLandPayment: (data) =>
    api.post('/LandPayment', {
      landPaymentID:   0,
      ownerID:         Number(data.ownerID),
      landContractID:  Number(data.landContractID),
      hoardingID:      Number(data.hoardingID) || 0,
      paymentDate:     data.paymentDate
        ? new Date(data.paymentDate + 'T00:00:00.000Z').toISOString()
        : new Date().toISOString(),
      paymentPurpose:  data.paymentPurpose  || '',
      amountPaid:      Number(data.amountPaid),
      paymentMode:     data.paymentMode     || '',
      nextDueDate:     data.nextDueDate
        ? new Date(data.nextDueDate + 'T00:00:00.000Z').toISOString()
        : null,
      bankName:        data.bankName        || '',
      referenceNumber: data.referenceNumber || '',
      paidBy:          data.paidBy          || '',
      comments:        data.comments        || '',
    }),

  // PUT /api/LandPayment/{id}  — update an existing payment
  updateLandPayment: (id, data) =>
    api.put(`/LandPayment/${id}`, {
      landPaymentID:   Number(id),
      ownerID:         Number(data.ownerID),
      landContractID:  Number(data.landContractID),
      hoardingID:      Number(data.hoardingID) || 0,
      paymentDate:     data.paymentDate
        ? new Date(data.paymentDate + 'T00:00:00.000Z').toISOString()
        : new Date().toISOString(),
      paymentPurpose:  data.paymentPurpose  || '',
      amountPaid:      Number(data.amountPaid),
      paymentMode:     data.paymentMode     || '',
      nextDueDate:     data.nextDueDate
        ? new Date(data.nextDueDate + 'T00:00:00.000Z').toISOString()
        : null,
      bankName:        data.bankName        || '',
      referenceNumber: data.referenceNumber || '',
      paidBy:          data.paidBy          || '',
      comments:        data.comments        || '',
    }),

  // DELETE /api/LandPayment/{id}  — permanently remove a payment
  deleteLandPayment: (id) =>
    api.delete(`/LandPayment/${id}`),
};



export default api;