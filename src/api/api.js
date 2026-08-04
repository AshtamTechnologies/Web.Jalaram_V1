import axios from 'axios';

const API_BASE_URL = 'https://api.jalaram-ad.ashtamtechnologies.com/api';
export const API_ROOT_URL = 'https://api.jalaram-ad.ashtamtechnologies.com';

// https://uatapi.jalaram-ad.ashtamtechnologies.com/swagger/index.htmls

// const API_BASE_URL = 'https://uatapi.jalaram-ad.ashtamtechnologies.com/api';
// export const API_ROOT_URL = 'https://uatapi.jalaram-ad.ashtamtechnologies.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 80000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — redirect to login
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

function toSafeISO(effdt) {
  if (!effdt) return new Date().toISOString();
  if (typeof effdt === 'string' && effdt.includes('T')) {
    const d = new Date(effdt);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const d = new Date(effdt + 'T00:00:00.000Z');
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

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

const isValidJWT = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.replace(/^Bearer\s+/i, '').trim().split('.');
  return parts.length === 3 && parts.every(p => p.length > 0);
};

const getLoggedInUserID = () => {
  const id = localStorage.getItem('userId');
  const parsed = parseInt(id, 10);
  return isNaN(parsed) ? 0 : parsed;
};

export const apiService = {

  // AUTH
  loginUser: async ({ email, password }) => {
    const response = await api.post('/Login/login', { email, password });
    if (response.forcePasswordChange === true) return response;

    // ── Inactive account — API returns 200 with a plain message string ──
    if (typeof response === 'string' && response.toLowerCase().includes('inactive')) {
      const err = new Error(response);
      err.response = { data: { message: response } };
      throw err;
    }
    // Also handles if it comes back as an object with a message field but no token
    if (!response.token && !response.accessToken && response.message) {
      const err = new Error(response.message);
      err.response = { data: { message: response.message } };
      throw err;
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
    if (response.refreshToken) localStorage.setItem('refreshToken', response.refreshToken);
    let userId = response.userId || response.user?.id || null;
    if (!userId) userId = decoded?.nameid || decoded?.sub || decoded?.userId || decoded?.id;
    if (userId) localStorage.setItem('userId', String(userId));
    // ✅ NEW
    const roleId = response.roleId || response.user?.roleId || 2;
    const roleStr = (response.role || response.user?.role || '').toLowerCase().trim();
    localStorage.setItem('roleId', String(roleId));
    localStorage.setItem('userRole', roleStr ? roleStr : (roleId === 1 || roleId === '1' ? 'admin' : 'user'));
    localStorage.setItem('userData', JSON.stringify(response.user || response));
    localStorage.setItem('isLoggedIn', 'true');
    return response;
  },

  forgotPassword: (email) => api.post('/Login/forgot-password', { email }),

  resetPassword: (data) =>
    api.post('/Login/reset-password', { email: data.email, newPassword: data.newPassword }),

  changePassword: (data) =>
    api.post('/Login/change-password', {
      email: data.email,
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
    }),

  logoutUser: () => {
    const attachNames = localStorage.getItem('lc_attach_names');
    localStorage.clear();
    if (attachNames) localStorage.setItem('lc_attach_names', attachNames);
    window.location.replace('/login');
  },

  // OWNERS
  getAllOwners: () => api.get('/Owner'),
  getOwnerById: (ownerId) => api.get(`/Owner/${ownerId}`),
  createOwner: (ownerData) => api.post('/Owner', {
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
  updateOwner: (ownerId, ownerData) => api.put(`/Owner/${ownerId}`, {
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
  deleteOwner: (ownerId) => api.delete(`/Owner/${ownerId}`),

  // SITES
  getAllSites: () => api.get('/Site'),
  getSiteById: (siteId) => api.get(`/Site/${siteId}`),
  createSite: (siteData) => api.post('/Site', {
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
  updateSite: (siteId, siteData) => api.put(`/Site/${siteId}`, {
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
  deleteSite: (siteId) => api.delete(`/Site/${siteId}`),

  // HOARDING TYPES
  getAllHoardingTypes: () => api.get('/HoardingType'),

  // HOARDINGS
  getAllHoardings: () => api.get('/Hoarding'),
  getAllExternalHoardings: () => api.get('/Hoarding/GetAllExternal'),
  getAvailableHoardings: (startDate, endDate) => api.get(`/Hoarding/available?startDate=${startDate}&endDate=${endDate}`),
  getAllavailableforJob: () => api.get('/Hoarding/availableforJob'), //Show the hoarding available
  getHoardingById: (hoardingID) => api.get(`/Hoarding/${hoardingID}`),
  getHoardingAvailabilityDetails: (hoardingID) => api.get(`/Hoarding/${hoardingID}/HoardingAvailabilityDetails`),
  createHoarding: (data) => api.post('/Hoarding', {
    hoardingID: 0,
    effdt: data.effdt ? data.effdt : new Date().toISOString().split('T')[0],
    hoardingCode: data.hoardingCode,
    material: data.material,
    hoardingType: Number(data.hoardingType),
    status: data.status,
    monthlyRent: Number(data.monthlyRent),
    width: Number(data.width),
    height: Number(data.height),
    siteID: Number(data.siteID),
    isExternal: data.isExternal,
  }),
  addHoardingEffdt: (hoardingCode, data) => api.post('/Hoarding', {
    hoardingID: 0,
    effdt: data.effdt ? data.effdt : new Date().toISOString().split('T')[0],
    hoardingCode: hoardingCode,
    material: data.material,
    hoardingType: Number(data.hoardingType),
    status: data.status,
    monthlyRent: Number(data.monthlyRent),
    width: Number(data.width),
    height: Number(data.height),
    siteID: Number(data.siteID),
    isExternal: data.isExternal,
  }),
  saveHoardingLinkWithPhotos: (data) => api.post('/Hoarding/SaveHoardingLinkWithPhotos', {
    hoardingID: Number(data.hoardingID),
    effdt: data.effdt ? data.effdt : new Date().toISOString().split('T')[0],
    hoardingCode: data.hoardingCode,
    material: data.material,
    hoardingType: Number(data.hoardingType),
    status: data.status,
    monthlyRent: Number(data.monthlyRent),
    width: Number(data.width),
    height: Number(data.height),
    siteID: Number(data.siteID),
    isExternal: data.isExternal,
  }),
  updateHoarding: (hoardingID, data) => api.put(`/Hoarding/${hoardingID}`, {
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
    isExternal: data.isExternal,
  }),
  deleteHoarding: (hoardingID) => api.delete(`/Hoarding/${hoardingID}`),

  // HOARDING EXPENSES
  getAllExpenses: () => api.get('/HoardingExpense'),
  getExpenseById: (expenseID) => api.get(`/HoardingExpense/${expenseID}`),
  createExpense: (data) => api.post('/HoardingExpense', {
    expenseID: 0,
    hoardingID: Number(data.hoardingID),
    expenseDate: data.expenseDate ? data.expenseDate : new Date().toISOString().split('T')[0],
    expenseType: data.expenseType,
    expenseDTL: data.expenseDTL,
    amount: Number(data.amount),
    paidBy: data.paidBy,
    comments: data.comments || '',
  }),
  updateExpense: (expenseID, data) => api.put(`/HoardingExpense/${expenseID}`, {
    expenseID: Number(expenseID),
    hoardingID: Number(data.hoardingID),
    expenseDate: data.expenseDate ? data.expenseDate : new Date().toISOString().split('T')[0],
    expenseType: data.expenseType,
    expenseDTL: data.expenseDTL,
    amount: Number(data.amount),
    paidBy: data.paidBy,
    comments: data.comments || '',
  }),
  deleteExpense: (expenseID) => api.delete(`/HoardingExpense/${expenseID}`),

  // HOARDING PHOTOS
  getPhotosByHoardingID: async (hoardingID) => {
    try {
      return await api.get(`/HoardingPhoto/GetByHoardingID/${hoardingID}`);
    } catch (err) {
      if (err?.response?.status === 404) return [];
      throw err;
    }
  },
  uploadHoardingPhoto: (formData) =>
    api.post('/HoardingPhoto', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateHoardingPhoto: async (formData) => {
    const oldId = formData.get('hoardingPhotoID');
    if (oldId && Number(oldId) > 0) await api.delete(`/HoardingPhoto/${oldId}`);
    formData.set('hoardingPhotoID', '0');
    return api.post('/HoardingPhoto', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteHoardingPhoto: (hoardingPhotoID) => api.delete(`/HoardingPhoto/${hoardingPhotoID}`),

  // PAYMENT FREQUENCIES
  getAllPaymentFreqs: () => api.get('/PaymentFreq/GetAll'),

  // LAND CONTRACTS
  getAllLandContracts: () => api.get('/LandContract/GetAll'),
  getLandContractById: (id) => api.get(`/LandContract/${id}`),
  createLandContract: (data) => api.post('/LandContract/Create', {
    landContractID: 0,
    ownerID: Number(data.ownerID),
    startDate: data.startDate,
    endDate: data.endDate,
    totalContractValue: Number(data.totalContractValue),
    paymentFreqID: Number(data.paymentFreqID),
    amountPerFreq: Number(data.amountPerFreq),
    advancePaid: data.advancePaid !== '' && data.advancePaid != null ? Number(data.advancePaid) : 0,
    status: data.status,
    comments: data.comments || '',
    lastUpdateDttm: new Date().toISOString(),
    lastUpdatedBy: getLoggedInUserID(),
  }),
  updateLandContract: (data) => api.put('/LandContract/Update', {
    landContractID: Number(data.landContractID),
    ownerID: Number(data.ownerID),
    startDate: data.startDate,
    endDate: data.endDate,
    totalContractValue: Number(data.totalContractValue),
    paymentFreqID: Number(data.paymentFreqID),
    amountPerFreq: Number(data.amountPerFreq),
    advancePaid: data.advancePaid !== '' && data.advancePaid != null ? Number(data.advancePaid) : 0,
    status: data.status,
    comments: data.comments || '',
    lastUpdateDttm: new Date().toISOString(),
    lastUpdatedBy: getLoggedInUserID(),
  }),
  deleteLandContract: (landContractID) => api.delete(`/LandContract/Delete/${landContractID}`),

  // LAND CONTRACT ATTACHMENTS
  getLandContractAttachments: async (contractId) => {
    try {
      return await api.get(`/LandContractAttach/GetByContract/${contractId}`);
    } catch (err) {
      if (err?.response?.status === 404) return [];
      throw err;
    }
  },
  uploadLandContractAttach: (contractId, ownerID, hoardingID, file) => {
    const fd = new FormData();
    fd.append('LandContractAttachID', 0);
    fd.append('LandContractID', Number(contractId));
    fd.append('OwnerID', Number(ownerID));
    fd.append('HoardingID', Number(hoardingID));
    fd.append('Files', file);
    fd.append('ContractFilePath', file.name);
    fd.append('ContractFilename', file.name);
    fd.append('LastUpdateDttm', new Date().toISOString());
    fd.append('LastUpdatedBy', getLoggedInUserID());
    return api.post('/LandContractAttach/Upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  updateLandContractAttach: (attachId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.put(`/LandContractAttach/Update/${attachId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteLandContractAttach: (attachId) => api.delete(`/LandContractAttach/Delete/${attachId}`),

  // LAND PAYMENTS
  getAllLandPayments: () => api.get('/LandPayment'),
  getLandPaymentById: (id) => api.get(`/LandPayment/${id}`),
  createLandPayment: (data) => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const lastUpdatedBy = userData?.name || userData?.email || userData?.userName || 'Admin';
    return api.post('/LandPayment', {
      landPaymentID: 0,
      ownerID: Number(data.ownerID),
      landContractID: Number(data.landContractID),
      hoardingID: Number(data.hoardingID) || 0,
      paymentDate: data.paymentDate ? data.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0],
      paymentPurpose: data.paymentPurpose || '',
      amountPaid: Number(data.amountPaid),
      paymentMode: data.paymentMode || '',
      nextDueDate: data.nextDueDate ? data.nextDueDate.split('T')[0] : '0001-01-01',
      bankName: data.bankName || null,
      referenceNumber: data.referenceNumber || null,
      paidBy: data.paidBy || '',
      comments: data.comments || null,
      lastUpdatedBy,
    });
  },
  updateLandPayment: (id, data) => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const lastUpdatedBy = userData?.name || userData?.email || userData?.userName || 'Admin';
    return api.put(`/LandPayment/${id}`, {
      landPaymentID: Number(id),
      ownerID: Number(data.ownerID),
      landContractID: Number(data.landContractID),
      hoardingID: Number(data.hoardingID) || 0,
      paymentDate: data.paymentDate ? data.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0],
      paymentPurpose: data.paymentPurpose || '',
      amountPaid: Number(data.amountPaid),
      paymentMode: data.paymentMode || '',
      nextDueDate: data.nextDueDate ? data.nextDueDate.split('T')[0] : '0001-01-01',
      bankName: data.bankName || null,
      referenceNumber: data.referenceNumber || null,
      paidBy: data.paidBy || '',
      comments: data.comments || null,
      lastUpdatedBy,
    });
  },
  deleteLandPayment: (id) => api.delete(`/LandPayment/${id}`),

  // CUSTOMERS
  getAllCustomers: () => api.get('/CustomerDTL/GetAll'),
  getCustomerById: (id) => api.get(`/CustomerDTL/${id}`),
  createCustomer: (data) => api.post('/CustomerDTL/Create', {
    customerID: 0,
    customerName: data.customerName || '',
    addressLine1: data.addressLine1 || '',
    addressLine2: data.addressLine2 || '',
    addressLine3: data.addressLine3 || '',
    city: data.city || '',
    district: data.district || '',
    country: data.country || '',
    phone1: data.phone1 || '',
    phone2: data.phone2 || '',
    authorizedName: data.authorizedName || '',
    gstNumber: data.gstNumber || '',
    lastUpdateDttm: new Date().toISOString(),
    lastUpdatedBy: getLoggedInUserID(),
  }),
  updateCustomer: (data) => api.put('/CustomerDTL/Update', {
    customerID: Number(data.customerID),
    customerName: data.customerName || '',
    addressLine1: data.addressLine1 || '',
    addressLine2: data.addressLine2 || '',
    addressLine3: data.addressLine3 || '',
    city: data.city || '',
    district: data.district || '',
    country: data.country || '',
    phone1: data.phone1 || '',
    phone2: data.phone2 || '',
    authorizedName: data.authorizedName || '',
    gstNumber: data.gstNumber || '',
    lastUpdateDttm: new Date().toISOString(),
    lastUpdatedBy: getLoggedInUserID(),
  }),
  deleteCustomer: (id) => api.delete(`/CustomerDTL/Delete/${id}`),

  // CUSTOMER CONTRACTS
  getAllCustomerContracts: async () => {
    const res = await api.get('/CustomerContract/GetAll');
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.$values)) return res.$values;
    return [];
  },
  getCustomerContractById: (id) => api.get(`/CustomerContract/GetById/${id}`),
  createCustomerContract: (data) => api.post('/CustomerContract/Create', {
    customerContractID: 0,
    customerID: Number(data.customerID),
    companyID: data.companyID ? Number(data.companyID) : null,
    startDate: data.startDate,
    endDate: data.endDate,
    contractOrigValue: Number(data.contractOrigValue) || 0,
    paymentFreqID: Number(data.paymentFreqID),
    amountPerFreq: Number(data.amountPerFreq) || 0,
    advancePaid: Number(data.advancePaid) || 0,
    status: data.status,
    discountAmount: Number(data.discountAmount) || 0,
    adjustmentAmount: Number(data.adjustmentAmount) || 0,
    contractFinalValue: Number(data.contractFinalValue) || 0,
    comments: data.comments || '',
    lastUpdateDttm: new Date().toISOString(),
    lastUpdatedBy: getLoggedInUserID(),
  }),
  updateCustomerContract: (data) => api.put('/CustomerContract/Update', {
    customerContractID: Number(data.customerContractID),
    customerID: Number(data.customerID),
    companyID: data.companyID ? Number(data.companyID) : null,
    startDate: data.startDate,
    endDate: data.endDate,
    contractOrigValue: Number(data.contractOrigValue) || 0,
    paymentFreqID: Number(data.paymentFreqID),
    amountPerFreq: Number(data.amountPerFreq) || 0,
    advancePaid: Number(data.advancePaid) || 0,
    status: data.status,
    discountAmount: Number(data.discountAmount) || 0,
    adjustmentAmount: Number(data.adjustmentAmount) || 0,
    contractFinalValue: Number(data.contractFinalValue) || 0,
    comments: data.comments || '',
    lastUpdateDttm: new Date().toISOString(),
    lastUpdatedBy: getLoggedInUserID(),
  }),
  deleteCustomerContract: (id) => api.delete(`/CustomerContract/Delete/${id}`),

  // HOARDING EXPENSE ATTACHMENTS
  getExpenseAttachByExpenseId: async (expenseID) => {
    try {
      const all = await api.get('/HoardingExpenseAttach/GetAll');
      const list = Array.isArray(all) ? all : [];
      return list.find(a =>
        Number(a.expenseID) === Number(expenseID) ||
        Number(a.ExpenseID) === Number(expenseID) ||
        Number(a.expenseId) === Number(expenseID)
      ) || null;
    } catch (err) {
      console.error('getExpenseAttachByExpenseId failed:', err);
      return null;
    }
  },
  createExpenseAttach: (expenseID, hoardingID, file) => {
    const fd = new FormData();
    fd.append('HoardingExpenseAttachID', 0);
    fd.append('ExpenseID', Number(expenseID));
    fd.append('HoardingID', Number(hoardingID));
    fd.append('File', file);
    fd.append('HoradingExpenseFilename', file.name);
    fd.append('HoradingExpenseFilePath', file.name);
    fd.append('LastUpdateDttm', new Date().toISOString());
    fd.append('LastUpdatedBy', getLoggedInUserID());
    return api.post('/HoardingExpenseAttach/Create', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  updateExpenseAttach: (attachObj, hoardingID, expenseID, file) => {
    const fd = new FormData();
    fd.append('HoradingExpenseAttachID', Number(attachObj.hoardingExpenseAttachID || attachObj.horadingExpenseAttachID || 0));
    fd.append('ExpenseID', Number(expenseID));
    fd.append('HoardingID', Number(hoardingID));
    fd.append('File', file);
    fd.append('HoradingExpenseFilePath', file.name);
    fd.append('HoradingExpenseFilename', file.name);
    fd.append('LastUpdateDttm', new Date().toISOString());
    fd.append('LastUpdatedBy', getLoggedInUserID());
    return api.put('/HoardingExpenseAttach/Update', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  // HOARDING MERGE (contract-level)
  getAllHoardingMerges: async () => {
    try {
      const res = await api.get('/HoardingMerge/GetAll');
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : Array.isArray(res?.value) ? res.value : [];
      return list;
    } catch (err) {
      console.warn('[MERGE GetAll failed, trying /HoardingMerge]', err?.response?.status);
      try {
        const res2 = await api.get('/HoardingMerge');
        const list2 = Array.isArray(res2) ? res2 : Array.isArray(res2?.data) ? res2.data : Array.isArray(res2?.value) ? res2.value : [];
        return list2;
      } catch (err2) {
        console.error('[MERGE both endpoints failed]', err2?.response?.status);
        return [];
      }
    }
  },
  getHoardingMergeById: (id) => api.get(`/HoardingMerge/${id}`),
  createHoardingMerge: (data) => api.post('/HoardingMerge/Create', {
    hoardingMergeID: 0,
    hoardingID: Number(data.hoardingID),
    customerContractID: Number(data.customerContractID),
    mergeAlongFlag: data.mergeAlongFlag,
  }),
  updateHoardingMerge: (id, data) => api.put(`/HoardingMerge/Update`, {
    hoardingMergeID: Number(id),
    hoardingID: Number(data.hoardingID),
    customerContractID: Number(data.customerContractID),
    mergeAlongFlag: data.mergeAlongFlag,
  }),
  deleteHoardingMerge: (id) => api.delete(`/HoardingMerge/Delete/${id}`),

  // LAND PAYMENT ATTACHMENTS
  getLandPaymentAttachByPaymentId: async (landPaymentID) => {
    try {
      const all = await api.get('/LandPaymentAttach/GetAll');
      const list = Array.isArray(all) ? all : [];
      return list.find(a =>
        Number(a.landPaymentID) === Number(landPaymentID) ||
        Number(a.LandPaymentID) === Number(landPaymentID)
      ) || null;
    } catch (err) {
      console.error('getLandPaymentAttachByPaymentId failed:', err);
      return null;
    }
  },
  createLandPaymentAttach: (landPaymentID, ownerID, landContractID, hoardingID, file) => {
    const fd = new FormData();
    fd.append('LandPaymentAttachID', 0);
    fd.append('LandPaymentID', Number(landPaymentID));
    fd.append('OwnerID', Number(ownerID));
    fd.append('LandContractID', Number(landContractID));
    fd.append('HoardingID', Number(hoardingID));
    fd.append('File', file);
    fd.append('LandPymntFilePath', file.name);
    fd.append('LandPymntFilename', file.name);
    fd.append('LastUpdateDttm', new Date().toISOString());
    fd.append('LastUpdatedBy', getLoggedInUserID());
    return api.post('/LandPaymentAttach/Create', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  updateLandPaymentAttach: (attachObj, landPaymentID, ownerID, landContractID, hoardingID, file) => {
    const fd = new FormData();
    fd.append('LandPaymentAttachID', Number(attachObj.landPaymentAttachID || attachObj.LandPaymentAttachID || 0));
    fd.append('LandPaymentID', Number(landPaymentID));
    fd.append('OwnerID', Number(ownerID));
    fd.append('LandContractID', Number(landContractID));
    fd.append('HoardingID', Number(hoardingID));
    fd.append('File', file);
    fd.append('LandPymntFilePath', file.name);
    fd.append('LandPymntFilename', file.name);
    fd.append('LastUpdateDttm', new Date().toISOString());
    fd.append('LastUpdatedBy', getLoggedInUserID());
    return api.put('/LandPaymentAttach/Update', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  // LAND CONTRACT HOARDING MAP
  getAllLandContractHoardingMaps: () => api.get('/LandContractHoardingMap/GetAll'),
  getLandContractHoardingMaps: async (contractId) => {
    try {
      return await api.get(`/LandContractHoardingMap/GetByContract/${contractId}`);
    } catch (err) {
      if (err?.response?.status === 404) {
        try {
          const all = await api.get('/LandContractHoardingMap/GetAll');
          const list = Array.isArray(all) ? all : Array.isArray(all?.data) ? all.data : [];
          return list.filter(m => Number(m.landContractID ?? m.LandContractID) === Number(contractId));
        } catch { return []; }
      }
      throw err;
    }
  },
  createLandContractHoardingMap: (data) => api.post('/LandContractHoardingMap/Create', {
    landContrHrdngMapID: 0,
    landContractID: Number(data.landContractID),
    ownerID: Number(data.ownerID),
    hoardingID: Number(data.hoardingID),
  }),
  updateLandContractHoardingMap: (data) => api.put('/LandContractHoardingMap/Update', {
    landContrHrdngMapID: Number(data.landContrHrdngMapID),
    landContractID: Number(data.landContractID),
    ownerID: Number(data.ownerID),
    hoardingID: Number(data.hoardingID),
  }),
  deleteLandContractHoardingMap: (mapId) => api.delete(`/LandContractHoardingMap/Delete/${mapId}`),

  // CUSTOMER CONTRACT ATTACHMENTS
  getCustContractAttachments: async (customerContractID) => {
    try {
      const all = await api.get('/CustContractAttach/GetAll');
      const list = Array.isArray(all) ? all : Array.isArray(all?.data) ? all.data : [];
      return list.filter(a => Number(a.customerContractID ?? a.CustomerContractID) === Number(customerContractID));
    } catch (err) {
      if (err?.response?.status === 404) return [];
      throw err;
    }
  },
  createCustContractAttach: ({ customerContractID, ownerID = 0, hoardingID = 0, fileUploadType, file }) => {
    const fd = new FormData();
    fd.append('CustContractAttachID', 0);
    fd.append('CustomerContractID', Number(customerContractID));
    fd.append('OwnerID', Number(ownerID));
    fd.append('HoardingID', Number(hoardingID));
    fd.append('FileUploadType', fileUploadType || '');
    fd.append('File', file);
    fd.append('ContractFilePath', file.name);
    fd.append('ContractFilename', file.name);
    fd.append('LastUpdateDttm', new Date().toISOString());
    fd.append('LastUpdatedBy', getLoggedInUserID());
    return api.post('/CustContractAttach/Create', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  updateCustContractAttach: ({ custContractAttachID, customerContractID, ownerID = 0, hoardingID = 0, fileUploadType, file }) => {
    const fd = new FormData();
    fd.append('CustContractAttachID', Number(custContractAttachID));
    fd.append('CustomerContractID', Number(customerContractID));
    fd.append('OwnerID', Number(ownerID));
    fd.append('HoardingID', Number(hoardingID));
    fd.append('FileUploadType', fileUploadType || '');
    fd.append('File', file);
    fd.append('ContractFilePath', file.name);
    fd.append('ContractFilename', file.name);
    fd.append('LastUpdateDttm', new Date().toISOString());
    fd.append('LastUpdatedBy', getLoggedInUserID());
    return api.put('/CustContractAttach/Update', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteCustContractAttach: (custContractAttachID) => api.delete(`/CustContractAttach/Delete/${custContractAttachID}`),

  // REPORTS
  getAvailableHoardingsReport: () => api.get('/Report/GetAvailableHoardings'),
  _exportReport: async (reportType, format, defaultExt) => {
    const token = localStorage.getItem('authToken');
    const today = new Date().toISOString().slice(0, 10);
    const acceptHeader = format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel';
    const response = await fetch(
      `${API_ROOT_URL}/api/Report/ExportReport?reportType=${reportType}&format=${format}`,
      { method: 'GET', headers: { 'Accept': acceptHeader, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
    );
    if (!response.ok) {
      let errMsg = `Server error: ${response.status}`;
      try {
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          if (errorData && errorData.message) {
            errMsg = errorData.message;
          } else if (errorData && errorData.error) {
            errMsg = errorData.error;
          }
        } catch (jsonErr) {
          if (text && text.trim().length < 200) {
            errMsg = text.trim();
          }
        }
      } catch (e) {
        // ignore
      }
      throw new Error(errMsg);
    }
    const blob = await response.blob();
    if (blob.size === 0) throw new Error('Server returned an empty file.');
    const disposition = response.headers.get('content-disposition') ?? '';
    const nameMatch = disposition.match(/filename\*?=(?:UTF-8''|")?([^";\n]+)/i);
    const filename = nameMatch
      ? decodeURIComponent(nameMatch[1].replace(/['"]/g, '').trim())
      : `${reportType}_${today}.${defaultExt}`;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  exportReportExcel: function (reportType) { return this._exportReport(reportType, 'excel', 'xlsx'); },
  exportReportPDF: async function () {
    const token = localStorage.getItem('authToken');
    const today = new Date().toISOString().slice(0, 10);
    const response = await fetch(
      `${API_ROOT_URL}/api/Report/ExportPDF`,
      { method: 'GET', headers: { 'Accept': 'application/pdf', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
    );
    if (!response.ok) {
      let errMsg = `Server error: ${response.status}`;
      try {
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          errMsg = errorData.message || errorData.error || errMsg;
        } catch {
          if (text && text.trim().length < 200) errMsg = text.trim();
        }
      } catch { /* ignore */ }
      throw new Error(errMsg);
    }
    const blob = await response.blob();
    if (blob.size === 0) throw new Error('Server returned an empty file.');
    const disposition = response.headers.get('content-disposition') ?? '';
    const nameMatch = disposition.match(/filename\*?=(?:UTF-8''|")?([^";\n]+)/i);
    const filename = nameMatch
      ? decodeURIComponent(nameMatch[1].replace(/['"]/g, '').trim())
      : `AvailableHoardings_${today}.pdf`;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // CUSTOMER TERMS
  getAllCustomerTerms: () => api.get('/CustomerTerms'),
  getCustomerTermById: (termID) => api.get(`/CustomerTerms/${termID}`),
  createCustomerTerm: ({ order, description }) =>
    api.post('/CustomerTerms', { termID: 0, order: Number(order), description: String(description).trim() }),
  updateCustomerTerm: (termID, { order, description }) =>
    api.put(`/CustomerTerms/${termID}`, { termID: Number(termID), order: Number(order), description: String(description).trim() }),
  deleteCustomerTerm: (termID) => api.delete(`/CustomerTerms/${termID}`),

  // QUOTATIONS
  getAllQuotations: () => api.get('/Quotation'),
  getQuotationById: (quotationID, revisionNumber, customerID) =>
    api.get(`/Quotation/${quotationID}/${revisionNumber}/${customerID}`),
  createQuotation: (data) => api.post('/Quotation', {
    quotationID: Number(data.quotationID ?? 0),
    quotationRevisionNumber: Number(data.quotationRevisionNumber ?? 0),
    customerID: Number(data.customerID),
    quotationNumber: String(data.quotationNumber),
    quotationDate: data.quotationDate,
    cGSTPercent: Number(data.cGSTPercent ?? 0),
    cGSTAmount: Number(data.cGSTAmount ?? 0),
    sGSTPercent: Number(data.sGSTPercent ?? 0),
    sGSTAmount: Number(data.sGSTAmount ?? 0),
    totalAmount: Number(data.totalAmount ?? 0),
  }),
  updateQuotation: (data) => api.put('/Quotation', {
    quotationID: Number(data.quotationID),
    quotationRevisionNumber: Number(data.quotationRevisionNumber ?? 0),
    customerID: Number(data.customerID),
    quotationNumber: String(data.quotationNumber),
    quotationDate: data.quotationDate,
    cGSTPercent: Number(data.cGSTPercent ?? 0),
    cGSTAmount: Number(data.cGSTAmount ?? 0),
    sGSTPercent: Number(data.sGSTPercent ?? 0),
    sGSTAmount: Number(data.sGSTAmount ?? 0),
    totalAmount: Number(data.totalAmount ?? 0),
  }),
  archiveQuotation: (quotationId) => api.post(`/QuotationArchive/${quotationId}`),
  deleteQuotation: (quotationId, revisionNo, customerId) =>
    api.delete(`/Quotation/${Number(quotationId)}/${Number(revisionNo)}/${Number(customerId)}`),


  // QUOTATION LINES
  getAllQuotationLines: () => api.get('/QuotationLineDTL'),
  getQuotationLineById: (lineID, quotationID, revisionID, hoardingID) =>
    api.get(`/QuotationLineDTL/${lineID}/${quotationID}/${revisionID}/${hoardingID}`),
  createQuotationLine: (data) => api.post('/QuotationLineDTL', {
    quotationLineNumber: Number(data.quotationLineNumber ?? 0),
    quotationID: Number(data.quotationID),
    quotationRevisionNumber: Number(data.quotationRevisionNumber ?? 0),
    hoardingID: Number(data.hoardingID ?? 0),
    purpose: String(data.purpose ?? ''),
    periodBeginDate: data.periodBeginDate,
    periodEndDate: data.periodEndDate,
    rentAmount: Number(data.rentAmount ?? 0),
    mergeFlag: Boolean(data.mergeFlag ?? false),
  }),
  updateQuotationLine: (data) => api.put('/QuotationLineDTL', {
    quotationLineNumber: Number(data.quotationLineNumber ?? 0),
    quotationID: Number(data.quotationID),
    quotationRevisionNumber: Number(data.quotationRevisionNumber ?? 0),
    hoardingID: Number(data.hoardingID ?? 0),
    purpose: String(data.purpose ?? ''),
    periodBeginDate: data.periodBeginDate,
    periodEndDate: data.periodEndDate,
    rentAmount: Number(data.rentAmount ?? 0),
    mergeFlag: Boolean(data.mergeFlag ?? false),
  }),
  deleteQuotationLine: (lineID, quotationID, revisionID, hoardingID) =>
    api.delete(`/QuotationLineDTL/${lineID}/${quotationID}/${revisionID}/${hoardingID}`),

  // ─────────────────────────────────────────────────────────
  // QUOTATION MERGE DTL
  //
  // Saves which hoardings were merged inside a quotation.
  // Each physical merge of 2 hoardings → 2 POST calls, one per
  // source hoardingID, both sharing the same quotationLineNumber.
  //
  // mergeAlongFlag:  'H' = Horizontal  |  'V' = Vertical
  //
  // POST   /api/QuotationMergeDTL
  // PUT    /api/QuotationMergeDTL/{mergeId}/{hoardingId}
  // DELETE /api/QuotationMergeDTL/{mergeId}/{hoardingId}
  // GET    /api/QuotationMergeDTL
  // ─────────────────────────────────────────────────────────

  getAllQuotationMerges: () => api.get('/QuotationMergeDTL'),

  createQuotationMerge: (data) => {
    // Guard — never POST zeros or bad data to the API
    if (!Number(data?.quotationID) || !Number(data?.hoardingID)) {
      console.error('[createQuotationMerge] Blocked — quotationID or hoardingID is 0:', data);
      return Promise.resolve(null);
    }
    return api.post('/QuotationMergeDTL', {
      quotationMergeID: 0,
      quotationLineNumber: Number(data.quotationLineNumber ?? 0),
      quotationID: Number(data.quotationID),
      quotationRevisionNumber: Number(data.quotationRevisionNumber ?? 0),
      hoardingID: Number(data.hoardingID),
      mergeAlongFlag: data.mergeAlongFlag === 'H' ? 'H' : 'V',
    });
  },

  updateQuotationMerge: (mergeId, hoardingId, data) =>
    api.put(`/QuotationMergeDTL/${mergeId}/${hoardingId}`, {
      quotationMergeID: Number(mergeId),
      quotationLineNumber: Number(data.quotationLineNumber ?? 0),
      quotationID: Number(data.quotationID ?? 0),
      quotationRevisionNumber: Number(data.quotationRevisionNumber ?? 0),
      hoardingID: Number(hoardingId),
      mergeAlongFlag: data.mergeAlongFlag === 'H' ? 'H' : 'V',
    }),

  deleteQuotationMerge: (mergeId, hoardingId) =>
    api.delete(`/QuotationMergeDTL/${mergeId}/${hoardingId}`),
  // Add to apiService in api.js
  getAllCustomerContractHoardingMaps: () => api.get('/CustomerContractHoarding'),
  // JOB REQUESTS
  getAllJobRequests: () => api.get('/JobRequest'),
  getJobRequestById: (id) => api.get(`/JobRequest/${id}`),
  createJobRequest: (data) => api.post('/JobRequest', {
    jobRequestID: 0,
    customerID: Number(data.customerID ?? 0),
    customerContractID: Number(data.customerContractID ?? 0),
    jobType: String(data.jobType ?? ''),
    jobDescription: String(data.jobDescription ?? ''),
    iD: String(data.iD ?? ''),                          // ← STRING not number
    jobCreateDTTM: new Date().toISOString(),             // ← NEW required field
    supervisorAcceptDttm: new Date().toISOString(),      // ← NEW required field
    noofHoardings: String(data.noofHoardings ?? '0'),    // ← NEW required field (string)
    rateperSQFT: Number(data.rateperSQFT ?? 0),
    totalAreaSQFT: Number(data.totalAreaSQFT ?? 0),
    targetCompletionDate: data.targetCompletionDate ?? '',
    actualCompletionDate: data.actualCompletionDate || data.targetCompletionDate || '',
    jobStatus: String(data.jobStatus ?? 'Open'),
  }),
  updateJobRequest: (data) => api.put('/JobRequest', {
    jobRequestID: Number(data.jobRequestID ?? 0),
    customerID: Number(data.customerID ?? 0),
    customerContractID: Number(data.customerContractID ?? 0),
    jobType: String(data.jobType ?? ''),
    jobDescription: String(data.jobDescription ?? ''),
    iD: String(data.iD ?? ''),                          // ← STRING
    jobCreateDTTM: new Date().toISOString(),
    supervisorAcceptDttm: data.supervisorAcceptDttm ?? new Date().toISOString(),
    noofHoardings: String(data.noofHoardings ?? '0'),
    rateperSQFT: Number(data.rateperSQFT ?? 0),
    totalAreaSQFT: Number(data.totalAreaSQFT ?? 0),
    targetCompletionDate: data.targetCompletionDate ?? '',
    actualCompletionDate: data.actualCompletionDate || data.targetCompletionDate || '',
    jobStatus: String(data.jobStatus ?? 'Open'),
  }),
  deleteJobRequest: (id) => api.delete(`/JobRequest/Delete/${id}`),

  // JOB TASKS
  getAllJobTasks: () => api.get('/JobTask'),
  // In api.js — replace getJobTasksByJobRequestId
  getJobTasksByJobRequestId: async (jobRequestID) => {
    const all = await api.get('/JobTask');
    const list = Array.isArray(all) ? all : Array.isArray(all?.data) ? all.data : [];
    return list.filter(t =>
      Number(t.jobRequestID ?? t.JobRequestID) === Number(jobRequestID)
    );
  },
  createJobTask: (data) => {
    const userId = (() => { const n = parseInt(localStorage.getItem('userId'), 10); return isNaN(n) ? 0 : n; })();
    return api.post('/JobTask', {
      jobTaskID: 0,
      jobRequestID: Number(data.jobRequestID ?? 0),
      hoardingID: Number(data.hoardingID ?? 0),
      actualCompletionDate: data.actualCompletionDate ?? new Date().toISOString().split('T')[0],
      status: String(data.status ?? 'Open'),
      submitDTTM: data.submitDTTM ?? new Date().toISOString(),
      lastUpdateDttm: new Date().toISOString(),
      lastUpdatedBy: Number(data.lastUpdatedBy ?? userId),
    });
  },
  updateJobTask: (data) => {
    const userId = (() => { const n = parseInt(localStorage.getItem('userId'), 10); return isNaN(n) ? 0 : n; })();
    return api.put(`/JobTask/${Number(data.jobTaskID ?? 0)}`, {
      jobTaskID: Number(data.jobTaskID ?? 0),
      jobRequestID: Number(data.jobRequestID ?? 0),
      hoardingID: Number(data.hoardingID ?? 0),
      actualCompletionDate: data.actualCompletionDate ?? new Date().toISOString().split('T')[0],
      status: String(data.status ?? 'Open'),
      submitDTTM: data.submitDTTM ?? new Date().toISOString(),
      lastUpdateDttm: new Date().toISOString(),
      lastUpdatedBy: Number(data.lastUpdatedBy ?? userId),
    });
  },
  deleteJobTask: (id) => api.delete(`/JobTask/${id}`),

  // USER REGISTRATION & MANAGEMENT
  getAllUsers: () => api.get('/Login/get-all'),
  registerUser: (data) => api.post('/Login/register', {
    first_Name: String(data.firstName || '').trim(),
    last_Name: String(data.lastName || '').trim(),
    phone_1: String(data.phone1 || '').trim(),
    phone_2: String(data.phone2 || '').trim(),
    email: String(data.email || '').trim(),
    address_Line_1: String(data.addressLine1 || '').trim(),
    address_Line_2: String(data.addressLine2 || '').trim(),
    address_Line_3: String(data.addressLine3 || '').trim(),
    city: String(data.city || '').trim(),
    district: String(data.district || '').trim(),
    country: String(data.country || 'India').trim(),
    status: String(data.status || 'Active').trim(),
    role: String(data.role || '').trim(),
  }),
  updateUser: (userId, data) => api.put('/Login/update', {
    id: Number(userId),
    first_Name: String(data.firstName || '').trim(),
    last_Name: String(data.lastName || '').trim(),
    phone_1: String(data.phone1 || '').trim(),
    phone_2: String(data.phone2 || '').trim(),
    email: String(data.email || '').trim(),
    address_Line_1: String(data.addressLine1 || '').trim(),
    address_Line_2: String(data.addressLine2 || '').trim(),
    address_Line_3: String(data.addressLine3 || '').trim(),
    city: String(data.city || '').trim(),
    district: String(data.district || '').trim(),
    country: String(data.country || 'India').trim(),
    status: String(data.status || 'Active').trim(),
    role: String(data.role || '').trim(),
  }),

  // ─────────────────────────────────────────────────────────
  // ADD THIS INSIDE your apiService object in api.js
  // Place it right after getAllJobRequests / getJobRequestById
  // ─────────────────────────────────────────────────────────

  getJobRequestsByUserId: (userId) =>
    api.get(`/JobRequest/GetByUserId/${userId}`),

  // QUOTATION CUSTOMER
  getNextQuotationNumber: () => api.get('/SeriesID/NextQuotationNumber'),
  getNextProformaInvoiceNumber: () => api.get('/SeriesID/NextProformaInvoiceNumber'),
  getNextProformaNumber: () => api.get('/SeriesID/NextProformaNumber'),
  getAllQuotationCustomers: () => api.get('/QuotationCustomer'),
  getQuotationCustomerById: (id) => api.get(`/QuotationCustomer/${id}`),
  createQuotationCustomer: (data) => api.post('/QuotationCustomer', {
    quotationCustomer_ID: 0,
    quotation_ID: Number(data.quotationID),
    quotation_Revision_Number: Number(data.quotationRevisionNumber ?? 0),
    customer_ID: Number(data.customerID),
  }),
  updateQuotationCustomer: (id, data) => api.put(`/QuotationCustomer/${id}`, {
    quotationCustomer_ID: Number(id),
    quotation_ID: Number(data.quotationID),
    quotation_Revision_Number: Number(data.quotationRevisionNumber ?? 0),
    customer_ID: Number(data.customerID),
  }),


  // Customer Contract Hoarding Map
  getCustomerContractHoardingMaps: async (customerContractID) => {
    try {
      const all = await api.get('/CustomerContractHoarding');
      const list = Array.isArray(all) ? all : Array.isArray(all?.data) ? all.data : [];
      return list.filter(m =>
        Number(m.customerContractID ?? m.CustomerContractID) === Number(customerContractID)
      );
    } catch (err) {
      if (err?.response?.status === 404) return [];
      throw err;
    }
  },
  createCustomerContractHoardingMap: (payload) =>
    api.post('/CustomerContractHoarding', {
      customerContractLineID: 0,
      customerContractID: Number(payload.customerContractID),
      customerID: Number(payload.customerID),
      hoardingID: Number(payload.hoardingID),
    }),
  updateCustomerContractHoardingMap: (customerContractLineID, payload) =>
    api.put(`/CustomerContractHoarding/${customerContractLineID}`, {
      customerContractLineID: Number(customerContractLineID),
      customerContractID: Number(payload.customerContractID),
      customerID: Number(payload.customerID),
      hoardingID: Number(payload.hoardingID),
    }),
  deleteCustomerContractHoardingMap: (customerContractLineID) =>
    api.delete(`/CustomerContractHoarding/${customerContractLineID}`),



  // ── Job Task Attachments ──

  getAllJobTaskAttachments: () => api.get('/JobTaskAttach'),
  getJobTaskAttachmentById: (id) => api.get(`/JobTaskAttach/${id}`),
  uploadJobTaskAttachment: (formData) =>
    api.post('/JobTaskAttach/Upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateJobTaskAttachment: (id, data) => api.put(`/JobTaskAttach/${id}`, data),
  // Inside apiService object, after uploadJobTaskAttachment:
  deleteJobTaskAttachment: (id) => api.delete(`/JobTaskAttach/${id}`),

  getJobTaskAssignsByUserId: (userId) =>
    api.get(`/JobTaskAssign/GetByUserId/${userId}`),

  // ── Expense Type ──
  getAllExpenseTypes: () => api.get('/ExpenseType'),
  getExpenseTypeById: (id) => api.get(`/ExpenseType/${id}`),
  createExpenseType: (data) => api.post('/ExpenseType', data),
  updateExpenseType: (id, data) => api.put(`/ExpenseType/${id}`, data),
  deleteExpenseType: (id) => api.delete(`/ExpenseType/${id}`),



  // Workers
  getWorkers: async () => {
    try {
      const res = await api.get('/Login/get-all');
      const list = Array.isArray(res) ? res
        : Array.isArray(res?.data) ? res.data
          : Array.isArray(res?.$values) ? res.$values : [];
      return list
        .filter(u => (u.role ?? u.Role ?? '').toLowerCase() === 'worker')
        .map(u => ({
          id: u.id ?? u.Id ?? u.userID ?? u.UserID ?? 0,
          name: [u.first_Name ?? u.firstName ?? '', u.last_Name ?? u.lastName ?? ''].filter(Boolean).join(' ').trim()
            || u.email || `User #${u.id}`,
          role: u.role ?? u.Role ?? '',
          email: u.email ?? u.Email ?? '',
        }));
    } catch (err) {
      console.error('getWorkers failed:', err?.response?.status);
      return [];
    }
  },

  // Job Task Assignments
  getJobTaskAssignsByTaskId: async (jobTaskID) => {
    try {
      const res = await api.get('/JobTaskAssign');
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      return list.filter(a => Number(a.jobTaskID ?? a.JobTaskID) === Number(jobTaskID));
    } catch {
      return [];
    }
  },

  createJobTaskAssign: async (payload) => {
    const response = await api.post('/JobTaskAssign', payload);
    return response?.data ?? response;
  },

  updateJobTaskAssign: async (payload) => {
    const response = await api.put(`/JobTaskAssign/${payload.jobTaskAssignID}`, payload);
    return response?.data ?? response;
  },

  deleteJobTaskAssign: async (jobTaskAssignID) => {
    const response = await api.delete(`/JobTaskAssign/${jobTaskAssignID}`);
    return response?.data ?? response;
  },

  getContractBannerImages: async (customerContractID) => {
    try {
      const res = await api.get(`/CustContractAttach/ViewImage/${customerContractID}`);
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      return list
        .filter(item => item.fileUploadType === 'Banner Design' || item.imageUrl)
        .map(item => ({
          custContractAttachID: item.custContractAttachID,
          contractFilename: item.contractFilename,
          imageUrl: `${API_ROOT_URL}${item.imageUrl}`,
        }));
    } catch { return []; }
  },



  // JOB PAYMENTS
  getAllJobPayments: () => api.get('/JobPayment'),
  getJobPaymentsByUserId: (userId) => api.get(`/JobPayment/GetByUserId/${userId}`),
  getCompletedJobsWithPendingPayment: () => api.get('/JobPayment/GetCompletedJobsWithPendingPayment'),
  getJobPaymentById: (id) => api.get(`/JobPayment/${id}`),
  createJobPayment: (data) => api.post('/JobPayment', {
    jobPaymentID: 0,
    jobRequestID: Number(data.jobRequestID ?? 0),
    paymentDate: data.paymentDate ?? new Date().toISOString().split('T')[0],
    calculatedAmount: Number(data.calculatedAmount ?? 0),
    paidAmount: Number(data.paidAmount ?? 0),
    remainingAmount: Number(data.remainingAmount ?? 0),
    paidBY: String(data.paidBY ?? ''),
    extrapayment: data.extrapayment ? String(data.extrapayment) : null,
    receiptPhoto: String(data.receiptPhoto ?? ''),
    comments: String(data.comments ?? ''),
    isParicialPayment: Boolean(data.isParicialPayment ?? false),
    lastUpdateDttm: new Date().toISOString(),
    lastUpdatedBy: getLoggedInUserID(),
  }),
  updateJobPayment: (id, data) => api.put(`/JobPayment/${id}`, {
    jobPaymentID: Number(id),
    jobRequestID: Number(data.jobRequestID ?? 0),
    paymentDate: data.paymentDate ?? new Date().toISOString().split('T')[0],
    calculatedAmount: Number(data.calculatedAmount ?? 0),
    paidAmount: Number(data.paidAmount ?? 0),
    remainingAmount: Number(data.remainingAmount ?? 0),
    paidBY: String(data.paidBY ?? ''),
    extrapayment: data.extrapayment ? String(data.extrapayment) : null,
    receiptPhoto: String(data.receiptPhoto ?? ''),
    comments: String(data.comments ?? ''),
    isParicialPayment: Boolean(data.isParicialPayment ?? false),
    lastUpdateDttm: new Date().toISOString(),
    lastUpdatedBy: getLoggedInUserID(),
  }),

  // JOB PAYMENT ATTACHMENTS
  getJobPaymentAttachments: async (jobPaymentID) => {
    try {
      const res = await api.get('/JobPaymentAttach');
      const list = Array.isArray(res) ? res
        : Array.isArray(res?.$values) ? res.$values
          : Array.isArray(res?.data) ? res.data : [];
      return list.filter(item => Number(item.jobPaymentID ?? item.JobPaymentID) === Number(jobPaymentID));
    } catch (err) {
      if (err?.response?.status === 404) return [];
      throw err;
    }
  },
  uploadJobPaymentAttachment: (jobPaymentID, jobRequestID, file) => {
    const fd = new FormData();
    fd.append('JobPaymentAttachID', '0');
    fd.append('JobPaymentID', String(Number(jobPaymentID)));
    fd.append('JobRequestID', String(Number(jobRequestID)));
    fd.append('ReceiptFilePath', '');
    fd.append('ReceiptFilename', file.name);
    fd.append('file', file);
    return api.post('/JobPaymentAttach/Upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // GEO LOCATION UPLOAD
  uploadGeoLocation: (formData) =>
    api.post('/GeoLocationUpload/Upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getGeoLocationByTaskId: (taskId) =>
    api.get(`/GeoLocationUpload/GetByTaskId?id=${taskId}`),

  // FINANCIAL YEAR SETUP
  getAllFinancialYears: () => api.get('/FinancialYearSetup'),
  createFinancialYear: (data) => api.post('/FinancialYearSetup', {
    financialYearID: 0,
    financialYearBeginDate: data.financialYearBeginDate,
    financialYearEndDate: data.financialYearEndDate,
    financialYearAbbrevation: data.financialYearAbbrevation,
    currentlyOpen: data.currentlyOpen,
  }),
  updateFinancialYear: (data) => api.put('/FinancialYearSetup', {
    financialYearID: Number(data.financialYearID),
    financialYearBeginDate: data.financialYearBeginDate,
    financialYearEndDate: data.financialYearEndDate,
    financialYearAbbrevation: data.financialYearAbbrevation,
    currentlyOpen: data.currentlyOpen,
  }),
  // SERIES ID SETUP
  getAllSeriesIDs: () => api.get('/SeriesID'),
  createSeriesID: (data) => api.post('/SeriesID', {
    seriesID: 0,
    seriesType: data.seriesType,
    initialCharacters: data.initialCharacters,
    delimiter: data.delimiter,
    lastNumberUsed: Number(data.lastNumberUsed) || 0,
    useCurrentFY: data.useCurrentFY,
    format: data.format,
    isActive: data.isActive,
  }),
  updateSeriesID: (id, data) => api.put('/SeriesID', {
    seriesID: Number(id),
    seriesType: data.seriesType,
    initialCharacters: data.initialCharacters,
    delimiter: data.delimiter,
    lastNumberUsed: Number(data.lastNumberUsed) || 0,
    useCurrentFY: data.useCurrentFY,
    format: data.format,
    isActive: data.isActive,
  }),

  getAllHoardingPhotos: () => api.get('/HoardingPhoto'),
  getPhotosByHoardingIDAndEffdt: (hoardingID, effdt) =>
    api.get(`/Hoarding/by-hoarding/${hoardingID}/effdt/${effdt}`),

  createQuotationTerm: (data) => api.post('/QuotationTerm', data),
  updateQuotationTerm: (data) => api.put('/QuotationTerm', data),
  getQuotationTerms: (quotationId, quotationRevisionNumber) =>
    api.get(`/QuotationTerm/GetQuotationTerms?quotationId=${quotationId}&quotationRevisionNumber=${quotationRevisionNumber}`),
  deleteQuotationTerm: (id) =>
    api.delete(`/QuotationTerm/${id}`).catch(() => api.delete(`/QuotationTerm?id=${id}`)),

  createPerformaInvoice: (data) => api.post('/PerformaInvoice', data),
  getAllPerformaInvoices: () => api.get('/PerformaInvoice'),
  getDashboardOverview: () => api.get('/Dashboard/overview'),

  // VENDORS
  getAllVendors: () => api.get('/Vendor'),
  getVendorById: (vendorId) => api.get(`/Vendor/${vendorId}`),
  createVendor: (data) => api.post('/Vendor', data),
  updateVendor: (data) => api.put('/Vendor', data),

  // COMPANY DETAILS
  getAllCompanyDetails: () => api.get('/CompanyDetails'),
  getCompanyDetailsById: (id) => api.get(`/CompanyDetails/${id}`),
  createCompanyDetails: (data) => api.post('/CompanyDetails', data),
  updateCompanyDetails: (data) => api.put('/CompanyDetails', data),

  // QUOTATION COMPANY
  getAllQuotationCompanies: () => api.get('/QuotationCompany'),
  createQuotationCompany: (data) => api.post('/QuotationCompany', data),
  updateQuotationCompany: (data) => api.put('/QuotationCompany', data),
  getQuotationCompanyByQuotation: (quotationId, revisionNumber) =>
    api.get(`/QuotationCompany/GetByQuotation?quotationId=${quotationId}&quotationRevisionNumber=${revisionNumber}`),
  getQuotationCompanyByQuotationId: (quotationID) =>
    api.get(`/QuotationCompany/GetByQuotationId/${quotationID}`),

  // OPPORTUNITIES
  getAllOpportunities: () => api.get('/Opportunity'),
  getOpportunityById: (id) => api.get(`/Opportunity/${id}`),
  createOpportunity: (data) => api.post('/Opportunity', data),
  updateOpportunity: (data) => api.put('/Opportunity', data),

  // OPPORTUNITY PHOTOS
  getOpportunityPhotos: async (opportunityID) => {
    try {
      return await api.get(`/OpportunityPhoto/Opportunity/${opportunityID}`);
    } catch (err) {
      if (err?.response?.status === 404) return [];
      throw err;
    }
  },
  uploadOpportunityPhoto: (formData) =>
    api.post('/OpportunityPhoto', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteOpportunityPhoto: (id) => api.delete(`/OpportunityPhoto/${id}`),

  // NOTIFICATIONS
  getNotificationsByUser: (userId) => api.get(`/Notification/User/${userId}`),
};

export default api;