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
function toSafeISO(effdt) {
  if (!effdt) return new Date().toISOString();
  if (typeof effdt === 'string' && effdt.includes('T')) {
    const d = new Date(effdt);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
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

// ── Helper: get logged-in user ID as integer ─────────────────
const getLoggedInUserID = () => {
  const id = localStorage.getItem('userId');
  const parsed = parseInt(id, 10);
  return isNaN(parsed) ? 0 : parsed;
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
    // Preserve attachment name map across logout so filenames survive re-login
    const attachNames = localStorage.getItem('lc_attach_names');
    localStorage.clear();
    if (attachNames) localStorage.setItem('lc_attach_names', attachNames);
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
      status: siteData.status === 'Active',
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
      status: siteData.status === 'Active',
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
        ? data.effdt
        : new Date().toISOString().split('T')[0],
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
        ? data.effdt
        : new Date().toISOString().split('T')[0],
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
      effdt: data.effdt ? data.effdt.split('T')[0] : new Date().toISOString().split('T')[0],
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

  getAllExpenses: () =>
    api.get('/HoardingExpense'),

  getExpenseById: (expenseID) =>
    api.get(`/HoardingExpense/${expenseID}`),

  createExpense: (data) =>
    api.post('/HoardingExpense', {
      expenseID: 0,
      hoardingID: Number(data.hoardingID),
      expenseDate: data.expenseDate
        ? data.expenseDate
        : new Date().toISOString().split('T')[0],
      expenseType: data.expenseType,
      expenseDTL: data.expenseDTL,
      amount: Number(data.amount),
      paidBy: data.paidBy,
      comments: data.comments || '',
    }),

  updateExpense: (expenseID, data) =>
    api.put(`/HoardingExpense/${expenseID}`, {
      expenseID: Number(expenseID),
      hoardingID: Number(data.hoardingID),
      expenseDate: data.expenseDate
        ? data.expenseDate
        : new Date().toISOString().split('T')[0],
      expenseType: data.expenseType,
      expenseDTL: data.expenseDTL,
      amount: Number(data.amount),
      paidBy: data.paidBy,
      comments: data.comments || '',
    }),

  deleteExpense: (expenseID) =>
    api.delete(`/HoardingExpense/${expenseID}`),

  // ─────────────────────────────────────
  // HOARDING PHOTOS
  // ─────────────────────────────────────

  getPhotosByHoardingID: async (hoardingID) => {
    try {
      return await api.get(`/HoardingPhoto/GetByHoardingID/${hoardingID}`);
    } catch (err) {
      if (err?.response?.status === 404) return [];
      throw err;
    }
  },

  uploadHoardingPhoto: (formData) =>
    api.post('/HoardingPhoto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateHoardingPhoto: async (formData) => {
    const oldId = formData.get('hoardingPhotoID');
    if (oldId && Number(oldId) > 0) {
      await api.delete(`/HoardingPhoto/${oldId}`);
    }
    formData.set('hoardingPhotoID', '0');
    return api.post('/HoardingPhoto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteHoardingPhoto: (hoardingPhotoID) =>
    api.delete(`/HoardingPhoto/${hoardingPhotoID}`),

  // ─────────────────────────────────────
  // PAYMENT FREQUENCIES
  // ─────────────────────────────────────

  getAllPaymentFreqs: () =>
    api.get('/PaymentFreq/GetAll'),

  // ─────────────────────────────────────
  // LAND CONTRACTS  (JSON body — no file)
  // ─────────────────────────────────────

  getAllLandContracts: () =>
    api.get('/LandContract/GetAll'),

  getLandContractById: (id) =>
    api.get(`/LandContract/${id}`),

  /**
   * Create a new land contract.
   * Body is plain JSON — documents are handled via LandContractAttach APIs.
   */
  createLandContract: (data) => {
    return api.post('/LandContract/Create', {
      landContractID:     0,
      ownerID:            Number(data.ownerID),
      hoardingID:         Number(data.hoardingID),
      startDate:          data.startDate,
      endDate:            data.endDate,
      totalContractValue: Number(data.totalContractValue),
      paymentFreqID:      Number(data.paymentFreqID),
      amountPerFreq:      Number(data.amountPerFreq),
      advancePaid:        data.advancePaid !== '' && data.advancePaid != null
                            ? Number(data.advancePaid)
                            : 0,
      status:             data.status,
      comments:           data.comments || '',
      lastUpdateDttm:     new Date().toISOString(),
      lastUpdatedBy:      getLoggedInUserID(),
    });
  },

  /**
   * Update an existing land contract.
   * Body is plain JSON — documents are handled via LandContractAttach APIs.
   */
  updateLandContract: (data) => {
    return api.put('/LandContract/Update', {
      landContractID:     Number(data.landContractID),
      ownerID:            Number(data.ownerID),
      hoardingID:         Number(data.hoardingID),
      startDate:          data.startDate,
      endDate:            data.endDate,
      totalContractValue: Number(data.totalContractValue),
      paymentFreqID:      Number(data.paymentFreqID),
      amountPerFreq:      Number(data.amountPerFreq),
      advancePaid:        data.advancePaid !== '' && data.advancePaid != null
                            ? Number(data.advancePaid)
                            : 0,
      status:             data.status,
      comments:           data.comments || '',
      lastUpdateDttm:     new Date().toISOString(),
      lastUpdatedBy:      getLoggedInUserID(),
    });
  },

  deleteLandContract: (landContractID) =>
    api.delete(`/LandContract/Delete/${landContractID}`),

  // ─────────────────────────────────────
  // LAND CONTRACT ATTACHMENTS
  // Separate multi-document management API
  // ─────────────────────────────────────

  /**
   * Fetch all attachments for a given contract.
   * Uses GetAll and filters client-side — GetByContractID does not exist.
   * Returns [] on any error so the UI never hard-crashes.
   */
  getLandContractAttachments: async (contractId) => {
    try {
      return await api.get(`/LandContractAttach/GetByContract/${contractId}`);
    } catch (err) {
      if (err?.response?.status === 404) return [];
      throw err;
    }
  },

  /**
   * Upload a new attachment for a contract.
   * POST /api/LandContractAttach/Upload  (multipart/form-data)
   * Supports uploading one file at a time; call multiple times for multiple files.
   *
   * @param {number} contractId
   * @param {number} ownerID
   * @param {number} hoardingID
   * @param {File}   file
   */
  uploadLandContractAttach: (contractId, ownerID, hoardingID, file) => {
    const fd = new FormData();
    fd.append('LandContractAttachID', 0);
    fd.append('LandContractID',       Number(contractId));
    fd.append('OwnerID',              Number(ownerID));
    fd.append('HoardingID',           Number(hoardingID));
    // Append with both casings — .NET model binding is case-insensitive
    // but some servers differ; sending both ensures one binds.
    fd.append('Files',                file);
    fd.append('ContractFilePath',     file.name);   // required — non-empty
    fd.append('ContractFilename',     file.name);
    fd.append('LastUpdateDttm',       new Date().toISOString());
    fd.append('LastUpdatedBy',        getLoggedInUserID());
    return api.post('/LandContractAttach/Upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Replace the file for an existing attachment.
   * PUT /api/LandContractAttach/Update/{id}  (multipart/form-data)
   *
   * @param {number} attachId  — LandContractAttachID
   * @param {File}   file      — new replacement file
   */
  updateLandContractAttach: (attachId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.put(`/LandContractAttach/Update/${attachId}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Permanently delete an attachment.
   * DELETE /api/LandContractAttach/Delete/{id}
   */
  deleteLandContractAttach: (attachId) =>
    api.delete(`/LandContractAttach/Delete/${attachId}`),

  // ─────────────────────────────────────
  // LAND PAYMENTS
  // ─────────────────────────────────────

  getAllLandPayments: () =>
    api.get('/LandPayment'),

  getLandPaymentById: (id) =>
    api.get(`/LandPayment/${id}`),

  createLandPayment: (data) => {
    const userData      = JSON.parse(localStorage.getItem('userData') || '{}');
    const lastUpdatedBy = userData?.name || userData?.email || userData?.userName || 'Admin';

    return api.post('/LandPayment', {
      landPaymentID:   0,
      ownerID:         Number(data.ownerID),
      landContractID:  Number(data.landContractID),
      hoardingID:      Number(data.hoardingID) || 0,
      paymentDate:     data.paymentDate ? data.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0],
      paymentPurpose:  data.paymentPurpose  || '',
      amountPaid:      Number(data.amountPaid),
      paymentMode:     data.paymentMode     || '',
      nextDueDate:     data.nextDueDate     ? data.nextDueDate.split('T')[0] : null,
      bankName:        data.bankName        || null,
      referenceNumber: data.referenceNumber || null,
      paidBy:          data.paidBy          || '',
      comments:        data.comments        || null,
      lastUpdatedBy,
    });
  },

  updateLandPayment: (id, data) => {
    const userData      = JSON.parse(localStorage.getItem('userData') || '{}');
    const lastUpdatedBy = userData?.name || userData?.email || userData?.userName || 'Admin';

    return api.put(`/LandPayment/${id}`, {
      landPaymentID:   Number(id),
      ownerID:         Number(data.ownerID),
      landContractID:  Number(data.landContractID),
      hoardingID:      Number(data.hoardingID) || 0,
      paymentDate:     data.paymentDate ? data.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0],
      paymentPurpose:  data.paymentPurpose  || '',
      amountPaid:      Number(data.amountPaid),
      paymentMode:     data.paymentMode     || '',
      nextDueDate:     data.nextDueDate     ? data.nextDueDate.split('T')[0] : null,
      bankName:        data.bankName        || null,
      referenceNumber: data.referenceNumber || null,
      paidBy:          data.paidBy          || '',
      comments:        data.comments        || null,
      lastUpdatedBy,
    });
  },

  deleteLandPayment: (id) =>
    api.delete(`/LandPayment/${id}`),

  // ─────────────────────────────────────
  // CUSTOMERS
  // ─────────────────────────────────────

  getAllCustomers: () =>
    api.get('/CustomerDTL/GetAll'),

  getCustomerById: (id) =>
    api.get(`/CustomerDTL/${id}`),

  createCustomer: (data) =>
    api.post('/CustomerDTL/Create', {
      customerID:     0,
      customerName:   data.customerName   || '',
      addressLine1:   data.addressLine1   || '',
      addressLine2:   data.addressLine2   || '',
      addressLine3:   data.addressLine3   || '',
      city:           data.city           || '',
      district:       data.district       || '',
      country:        data.country        || '',
      phone1:         data.phone1         || '',
      phone2:         data.phone2         || '',
      authorizedName: data.authorizedName || '',
      gstNumber:      data.gstNumber      || '',
      lastUpdateDttm: new Date().toISOString(),
      lastUpdatedBy:  getLoggedInUserID(),
    }),

  updateCustomer: (data) =>
    api.put('/CustomerDTL/Update', {
      customerID:     Number(data.customerID),
      customerName:   data.customerName   || '',
      addressLine1:   data.addressLine1   || '',
      addressLine2:   data.addressLine2   || '',
      addressLine3:   data.addressLine3   || '',
      city:           data.city           || '',
      district:       data.district       || '',
      country:        data.country        || '',
      phone1:         data.phone1         || '',
      phone2:         data.phone2         || '',
      authorizedName: data.authorizedName || '',
      gstNumber:      data.gstNumber      || '',
      lastUpdateDttm: new Date().toISOString(),
      lastUpdatedBy:  getLoggedInUserID(),
    }),

  deleteCustomer: (id) =>
    api.delete(`/CustomerDTL/Delete/${id}`),
};

export default api;