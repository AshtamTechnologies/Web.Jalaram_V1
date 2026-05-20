  import axios from 'axios';

  const API_BASE_URL = 'https://api.jalaram-ad.ashtamtechnologies.com/api';
  export const API_ROOT_URL = 'https://api.jalaram-ad.ashtamtechnologies.com';

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
        landContractID: 0,
        ownerID: Number(data.ownerID),
        startDate: data.startDate,
        endDate: data.endDate,
        totalContractValue: Number(data.totalContractValue),
        paymentFreqID: Number(data.paymentFreqID),
        amountPerFreq: Number(data.amountPerFreq),
        advancePaid: data.advancePaid !== '' && data.advancePaid != null
          ? Number(data.advancePaid)
          : 0,
        status: data.status,
        comments: data.comments || '',
        lastUpdateDttm: new Date().toISOString(),
        lastUpdatedBy: getLoggedInUserID(),
      });
    },

    /**
     * Update an existing land contract.
     * Body is plain JSON — documents are handled via LandContractAttach APIs.
     */
    updateLandContract: (data) => {
      return api.put('/LandContract/Update', {
        landContractID: Number(data.landContractID),
        ownerID: Number(data.ownerID),
        startDate: data.startDate,
        endDate: data.endDate,
        totalContractValue: Number(data.totalContractValue),
        paymentFreqID: Number(data.paymentFreqID),
        amountPerFreq: Number(data.amountPerFreq),
        advancePaid: data.advancePaid !== '' && data.advancePaid != null
          ? Number(data.advancePaid)
          : 0,
        status: data.status,
        comments: data.comments || '',
        lastUpdateDttm: new Date().toISOString(),
        lastUpdatedBy: getLoggedInUserID(),
      });
    },

    deleteLandContract: (landContractID) =>
      api.delete(`/LandContract/Delete/${landContractID}`),

    // ─────────────────────────────────────
    // LAND CONTRACT ATTACHMENTS
    // Separate multi-document management API
    // ─────────────────────────────────────


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
      fd.append('LandContractID', Number(contractId));
      fd.append('OwnerID', Number(ownerID));
      fd.append('HoardingID', Number(hoardingID));
      // Append with both casings — .NET model binding is case-insensitive
      // but some servers differ; sending both ensures one binds.
      fd.append('Files', file);
      fd.append('ContractFilePath', file.name);   // required — non-empty
      fd.append('ContractFilename', file.name);
      fd.append('LastUpdateDttm', new Date().toISOString());
      fd.append('LastUpdatedBy', getLoggedInUserID());
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
        nextDueDate: data.nextDueDate ? data.nextDueDate.split('T')[0] : null,
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
        nextDueDate: data.nextDueDate ? data.nextDueDate.split('T')[0] : null,
        bankName: data.bankName || null,
        referenceNumber: data.referenceNumber || null,
        paidBy: data.paidBy || '',
        comments: data.comments || null,
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

    updateCustomer: (data) =>
      api.put('/CustomerDTL/Update', {
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

    deleteCustomer: (id) =>
      api.delete(`/CustomerDTL/Delete/${id}`),

    // ─────────────────────────────────────
    // CUSTOMER CONTRACTS
    // ─────────────────────────────────────

    getAllCustomerContracts: () =>
      api.get('/CustomerContract/GetAll'),

    createCustomerContract: (data) =>
      api.post('/CustomerContract/Create', {
        customerContractID: 0,
        customerID: Number(data.customerID),
        hoardingID: Number(data.hoardingID),
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

    updateCustomerContract: (data) =>
      api.put('/CustomerContract/Update', {
        customerContractID: Number(data.customerContractID),
        customerID: Number(data.customerID),
        hoardingID: Number(data.hoardingID),
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

    deleteCustomerContract: (id) =>
      api.delete(`/CustomerContract/Delete/${id}`),
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
      return api.post('/HoardingExpenseAttach/Create', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },

    getExpenseAttachByExpenseId: async (expenseID) => {
      try {
        const all = await api.get('/HoardingExpenseAttach/GetAll');
        const list = Array.isArray(all) ? all : [];

        console.log('📋 All attaches sample:', list[0]); // shows real field names — remove after fix

        const found = list.find(a =>
          Number(a.expenseID) === Number(expenseID) ||
          Number(a.ExpenseID) === Number(expenseID) ||
          Number(a.expenseId) === Number(expenseID)
        );
        return found || null;
      } catch (err) {
        console.error('getExpenseAttachByExpenseId failed:', err);
        return null;
      }
    },


    /**
     * POST /api/HoardingExpenseAttach/Create  (multipart/form-data)
     *
     * NOTE: Server model uses "HoradingExpense..." (typo — missing 'a')
     * These field names MUST match exactly or the API returns 400.
     *
     * @param {number} expenseID
     * @param {number} hoardingID
     * @param {File}   file
     */
    // REPLACE your existing updateExpenseAttachment (if any) with this:
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
      return api.put('/HoardingExpenseAttach/Update', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    // ══════════════════════════════════════════════════════════════
    //  ADD TO YOUR EXISTING api.js  —  paste inside apiService { }
    // ══════════════════════════════════════════════════════════════

    // ─────────────────────────────────────
    // HOARDING MERGE
    // ─────────────────────────────────────

    getAllHoardingMerges: () =>
      api.get('/HoardingMerge/GetAll'),

    getHoardingMergeById: (id) =>
      api.get(`/HoardingMerge/${id}`),

    createHoardingMerge: (data) =>
      api.post('/HoardingMerge/Create', {
        hoardingMergeID: 0,
        hoardingID: Number(data.hoardingID),
        customerContractID: Number(data.customerContractID),
        mergeAlongFlag: data.mergeAlongFlag,   // 'W' = Width, 'H' = Height
      }),

    updateHoardingMerge: (id, data) =>
      api.put(`/HoardingMerge/Update/${id}`, {
        hoardingMergeID: Number(id),
        hoardingID: Number(data.hoardingID),
        customerContractID: Number(data.customerContractID),
        mergeAlongFlag: data.mergeAlongFlag,
      }),

    deleteHoardingMerge: (id) =>
      api.delete(`/HoardingMerge/Delete/${id}`),
    // ─────────────────────────────────────
    // HOARDING EXPENSE ATTACHMENTS
    // ─────────────────────────────────────

    getExpenseAttachByExpenseId: async (expenseID) => {
      try {
        const all = await api.get('/HoardingExpenseAttach/GetAll');
        const list = Array.isArray(all) ? all : [];
        const found = list.find(a =>
          Number(a.expenseID) === Number(expenseID) ||
          Number(a.ExpenseID) === Number(expenseID) ||
          Number(a.expenseId) === Number(expenseID)
        );
        return found || null;
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
      return api.post('/HoardingExpenseAttach/Create', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },

    updateExpenseAttach: (attachObj, hoardingID, expenseID, file) => {
      const fd = new FormData();
      fd.append('HoradingExpenseAttachID', Number(
        attachObj.hoardingExpenseAttachID ||
        attachObj.horadingExpenseAttachID || 0
      ));
      fd.append('ExpenseID', Number(expenseID));
      fd.append('HoardingID', Number(hoardingID));
      fd.append('File', file);
      fd.append('HoradingExpenseFilePath', file.name);
      fd.append('HoradingExpenseFilename', file.name);
      fd.append('LastUpdateDttm', new Date().toISOString());
      fd.append('LastUpdatedBy', getLoggedInUserID());
      return api.put('/HoardingExpenseAttach/Update', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },

    // ─────────────────────────────────────
    // LAND PAYMENT ATTACHMENTS
    // ─────────────────────────────────────

    getLandPaymentAttachByPaymentId: async (landPaymentID) => {
      try {
        const all = await api.get('/LandPaymentAttach/GetAll');
        const list = Array.isArray(all) ? all : [];
        const found = list.find(a =>
          Number(a.landPaymentID) === Number(landPaymentID) ||
          Number(a.LandPaymentID) === Number(landPaymentID)
        );
        return found || null;
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
      return api.post('/LandPaymentAttach/Create', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },

    updateLandPaymentAttach: (attachObj, landPaymentID, ownerID, landContractID, hoardingID, file) => {
      const fd = new FormData();
      fd.append('LandPaymentAttachID', Number(
        attachObj.landPaymentAttachID ||
        attachObj.LandPaymentAttachID || 0
      ));
      fd.append('LandPaymentID', Number(landPaymentID));
      fd.append('OwnerID', Number(ownerID));
      fd.append('LandContractID', Number(landContractID));
      fd.append('HoardingID', Number(hoardingID));
      fd.append('File', file);
      fd.append('LandPymntFilePath', file.name);
      fd.append('LandPymntFilename', file.name);
      fd.append('LastUpdateDttm', new Date().toISOString());
      fd.append('LastUpdatedBy', getLoggedInUserID());
      return api.put('/LandPaymentAttach/Update', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

    },
    // ─────────────────────────────────────
    // LAND CONTRACT HOARDING MAP
    // Map multiple additional hoardings to a single land contract
    // ─────────────────────────────────────

    getLandContractHoardingMaps: async (contractId) => {
      try {
        return await api.get(`/LandContractHoardingMap/GetByContract/${contractId}`);
      } catch (err) {
        // If the per-contract endpoint is 404, fall back to GetAll
        if (err?.response?.status === 404) {
          try {
            const all = await api.get('/LandContractHoardingMap/GetAll');
            const list = Array.isArray(all) ? all : Array.isArray(all?.data) ? all.data : [];
            return list.filter(
              (m) =>
                Number(m.landContractID ?? m.LandContractID) === Number(contractId)
            );
          } catch { return []; }
        }
        throw err;
      }
    },

    /**
     * Create a new hoarding mapping for a contract.
     * POST /api/LandContractHoardingMap/Create
     */
    createLandContractHoardingMap: (data) =>
      api.post('/LandContractHoardingMap/Create', {
        landContrHrdngMapID: 0,
        landContractID: Number(data.landContractID),
        ownerID: Number(data.ownerID),
        hoardingID: Number(data.hoardingID),
      }),

    /**
     * Update an existing hoarding mapping.
     * PUT /api/LandContractHoardingMap/Update
     */
    updateLandContractHoardingMap: (data) =>
      api.put('/LandContractHoardingMap/Update', {
        landContrHrdngMapID: Number(data.landContrHrdngMapID),
        landContractID: Number(data.landContractID),
        ownerID: Number(data.ownerID),
        hoardingID: Number(data.hoardingID),
      }),

    /**
     * Delete a hoarding mapping by its own PK.
     * DELETE /api/LandContractHoardingMap/Delete/{landContrHrdngMapID}
     */
    deleteLandContractHoardingMap: (mapId) =>
      api.delete(`/LandContractHoardingMap/Delete/${mapId}`),
  getAllLandContractHoardingMaps: () =>
    api.get('/LandContractHoardingMap/GetAll'),
    // ─────────────────────────────────────
    // CUSTOMER CONTRACT ATTACHMENTS
    // ─────────────────────────────────────

    getCustContractAttachments: async (customerContractID) => {
      try {
        const all = await api.get('/CustContractAttach/GetAll');
        const list = Array.isArray(all) ? all : Array.isArray(all?.data) ? all.data : [];
        return list.filter(
          (a) =>
            Number(a.customerContractID ?? a.CustomerContractID) ===
            Number(customerContractID)
        );
      } catch (err) {
        if (err?.response?.status === 404) return [];
        throw err;
      }
    },

    /**
     * Upload a new attachment for a customer contract.
     * POST /api/CustContractAttach/Create  (multipart/form-data)
     *
     * @param {object} params
     * @param {number} params.customerContractID
     * @param {number} params.ownerID            – pass 0 if not applicable
     * @param {number} params.hoardingID         – pass 0 if not applicable
     * @param {string} params.fileUploadType     – e.g. 'Contract' | 'Hoarding Image'
     * @param {File}   params.file
     */
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
      return api.post('/CustContractAttach/Create', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },

    /**
     * Update an existing attachment (replace file / change type).
     * PUT /api/CustContractAttach/Update  (multipart/form-data)
     *
     * @param {object} params
     * @param {number} params.custContractAttachID – existing attach PK
     * @param {number} params.customerContractID
     * @param {number} params.ownerID
     * @param {number} params.hoardingID
     * @param {string} params.fileUploadType
     * @param {File}   params.file
     */
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
      return api.put('/CustContractAttach/Update', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },

    /**
     * Delete an attachment by its PK.
     * DELETE /api/CustContractAttach/Delete/{custContractAttachID}
     */
    deleteCustContractAttach: (custContractAttachID) =>
      api.delete(`/CustContractAttach/Delete/${custContractAttachID}`),

    // ─────────────────────────────────────
    // REPORTS
    // ─────────────────────────────────────

    // ─────────────────────────────────────
    // REPORTS
    // ─────────────────────────────────────

    getAvailableHoardingsReport: () =>
      api.get('/Report/GetAvailableHoardings'),

    /**
     * Unified export helper used by all reports.
     * GET /api/Report/ExportReport?reportType={reportType}
     *
     * @param {string} reportType  — e.g. 'AvailableHoardings' | 'HoardingExpenseReport'
     * @param {'excel'|'pdf'} format
     * @param {string} defaultExt  — file extension used when server doesn't set Content-Disposition
     */
    _exportReport: async (reportType, format, defaultExt) => {
      const token = localStorage.getItem('authToken');
      const today = new Date().toISOString().slice(0, 10);

      const response = await fetch(
        `https://api.jalaram-ad.ashtamtechnologies.com/api/Report/ExportReport?reportType=${reportType}`,
        {
          method: 'GET',
          headers: {
            'Accept': '*/*',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Server returned an empty file.');

      const disposition = response.headers.get('content-disposition') ?? '';
      const nameMatch   = disposition.match(/filename\*?=(?:UTF-8''|")?([^";\n]+)/i);
      const filename    = nameMatch
        ? decodeURIComponent(nameMatch[1].replace(/['"]/g, '').trim())
        : `${reportType}_${today}.${defaultExt}`;

      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },

    /**
     * Download any report as Excel.
     * @param {string} reportType — e.g. 'AvailableHoardings' | 'HoardingExpenseReport'
     */
    exportReportExcel: function (reportType) {
      return this._exportReport(reportType, 'excel', 'xlsx');
    },

    /**
     * Download any report as PDF.
     * @param {string} reportType — e.g. 'AvailableHoardings'
     */
    exportReportPDF: function (reportType) {
      return this._exportReport(reportType, 'pdf', 'pdf');
    },

// ─────────────────────────────────────
    // CUSTOMER TERMS
    // ─────────────────────────────────────

    /**
     * GET /api/CustomerTerms
     * Returns all customer terms sorted by order (server may return unsorted;
     * the UI re-sorts client-side by the `order` field).
     */
    getAllCustomerTerms: () =>
      api.get('/CustomerTerms'),

    /**
     * GET /api/CustomerTerms/{id}
     * Returns a single term by termID.
     */
    getCustomerTermById: (termID) =>
      api.get(`/CustomerTerms/${termID}`),

    /**
     * POST /api/CustomerTerms
     * Body: { termID: 0, order: number, description: string }
     *
     * @param {{ order: number|string, description: string }} data
     */
    createCustomerTerm: ({ order, description }) =>
      api.post('/CustomerTerms', {
        termID:      0,
        order:       Number(order),
        description: String(description).trim(),
      }),

    /**
     * PUT /api/CustomerTerms/{termID}
     * Body: { termID, order: number, description: string }
     *
     * @param {number} termID
     * @param {{ order: number|string, description: string }} data
     */
    updateCustomerTerm: (termID, { order, description }) =>
      api.put(`/CustomerTerms/${termID}`, {
        termID:      Number(termID),
        order:       Number(order),
        description: String(description).trim(),
      }),

    /**
     * DELETE /api/CustomerTerms/{termID}
     * Permanently removes the term.
     */
    deleteCustomerTerm: (termID) =>
      api.delete(`/CustomerTerms/${termID}`),



// ════════════════════════════════════════════════════════════════
//  ADD THESE METHODS INSIDE  apiService { }  in your api.js
//  They integrate with the Quotation + QuotationLineDTL endpoints
// ════════════════════════════════════════════════════════════════

// ─────────────────────────────────────
// QUOTATION (Header)
// ─────────────────────────────────────

/** GET /api/Quotation  — returns all quotation headers */
getAllQuotations: () =>
  api.get('/Quotation'),

/** GET /api/Quotation/{quotationID}/{revisionNumber}/{customerID} */
getQuotationById: (quotationID, revisionNumber, customerID) =>
  api.get(`/Quotation/${quotationID}/${revisionNumber}/${customerID}`),

/**
 * POST /api/Quotation
 * Creates a new quotation header and returns the saved object
 * (including the generated quotationID from the server).
 */
createQuotation: (data) =>
  api.post('/Quotation', {
    quotationID:             0,
    quotationRevisionNumber: Number(data.quotationRevisionNumber ?? 0),
    customerID:              Number(data.customerID),
    quotationNumber:         String(data.quotationNumber),
    quotationDate:           data.quotationDate,          // 'YYYY-MM-DD'
    cGSTPercent:             Number(data.cGSTPercent ?? 0),
    cGSTAmount:              Number(data.cGSTAmount  ?? 0),
    sGSTPercent:             Number(data.sGSTPercent ?? 0),
    sGSTAmount:              Number(data.sGSTAmount  ?? 0),
    totalAmount:             Number(data.totalAmount ?? 0),
  }),

/**
 * PUT /api/Quotation
 * Updates an existing quotation header.
 */
updateQuotation: (data) =>
  api.put('/Quotation', {
    quotationID:             Number(data.quotationID),
    quotationRevisionNumber: Number(data.quotationRevisionNumber ?? 0),
    customerID:              Number(data.customerID),
    quotationNumber:         String(data.quotationNumber),
    quotationDate:           data.quotationDate,
    cGSTPercent:             Number(data.cGSTPercent ?? 0),
    cGSTAmount:              Number(data.cGSTAmount  ?? 0),
    sGSTPercent:             Number(data.sGSTPercent ?? 0),
    sGSTAmount:              Number(data.sGSTAmount  ?? 0),
    totalAmount:             Number(data.totalAmount ?? 0),
  }),

// ─────────────────────────────────────
// QUOTATION LINE DETAIL
// ─────────────────────────────────────

/** GET /api/QuotationLineDTL  — returns all line items */
getAllQuotationLines: () =>
  api.get('/QuotationLineDTL'),

/**
 * GET /api/QuotationLineDTL/{lineID}/{quotationID}/{revisionID}/{hoardingID}
 */
getQuotationLineById: (lineID, quotationID, revisionID, hoardingID) =>
  api.get(`/QuotationLineDTL/${lineID}/${quotationID}/${revisionID}/${hoardingID}`),

/**
 * POST /api/QuotationLineDTL
 * Creates one line item for a quotation.
 */
createQuotationLine: (data) =>
  api.post('/QuotationLineDTL', {
    quotationLineNumber:     Number(data.quotationLineNumber ?? 0),
    quotationID:             Number(data.quotationID),
    quotationRevisionNumber: Number(data.quotationRevisionNumber ?? 0),
    hoardingID:              Number(data.hoardingID ?? 0),
    periodBeginDate:         data.periodBeginDate,  // 'YYYY-MM-DD'
    periodEndDate:           data.periodEndDate,    // 'YYYY-MM-DD'
    rentAmount:              Number(data.rentAmount ?? 0),
  }),

/**
 * PUT /api/QuotationLineDTL
 * Updates an existing line item.
 */
updateQuotationLine: (data) =>
  api.put('/QuotationLineDTL', {
    quotationLineNumber:     Number(data.quotationLineNumber ?? 0),
    quotationID:             Number(data.quotationID),
    quotationRevisionNumber: Number(data.quotationRevisionNumber ?? 0),
    hoardingID:              Number(data.hoardingID ?? 0),
    periodBeginDate:         data.periodBeginDate,
    periodEndDate:           data.periodEndDate,
    rentAmount:              Number(data.rentAmount ?? 0),
  }),

// ═══════════════════════════════════════════════════════════════════
//  JOB MANAGEMENT  —  paste these methods inside apiService { } in api.js
//  Endpoints follow the DTO mapping from the Job_Request_TBL and
//  Job_Task_DTL schemas.
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────
// USERS  (needed for supervisor dropdown)
// GET /api/User/GetAll
// Returns all users; the UI filters client-side by role.
// ─────────────────────────────────────

getAllUsers: () =>
  api.get('/User/GetAll'),


// ─────────────────────────────────────
// JOB REQUESTS  (Job_Request_TBL)
// ─────────────────────────────────────

/** GET /api/JobRequest/GetAll */
getAllJobRequests: () =>
  api.get('/JobRequest/GetAll'),

/** GET /api/JobRequest/{id} */
getJobRequestById: (id) =>
  api.get(`/JobRequest/${id}`),

/**
 * POST /api/JobRequest/Create
 *
 * NOTE: The "ID" field in the schema (supervisor user ID) maps to DTO field `iD`.
 * Job_Create_DTTM is auto-generated by the backend.
 * No_of_Hoardings is NOT sent from the front end (removed as requested).
 * Total_Area_SQFT is calculated from selected hoardings on the front end.
 */
createJobRequest: (data) =>
  api.post('/JobRequest/Create', {
    jobRequestID:         0,
    customerID:           Number(data.customerID           ?? 0),
    customerContractID:   Number(data.customerContractID   ?? 0),
    jobType:              String(data.jobType              ?? ''),
    jobDescription:       String(data.jobDescription       ?? ''),
    iD:                   Number(data.iD                   ?? 0),   // supervisor userID → "ID" column
    rateperSQFT:          Number(data.rateperSQFT          ?? 0),
    totalAreaSQFT:        Number(data.totalAreaSQFT        ?? 0),
    targetCompletionDate: data.targetCompletionDate        ?? '',
    actualCompletionDate: data.actualCompletionDate        || null,
    jobStatus:            String(data.jobStatus            ?? 'Open'),
  }),

/**
 * PUT /api/JobRequest/Update
 */
updateJobRequest: (data) =>
  api.put('/JobRequest/Update', {
    jobRequestID:         Number(data.jobRequestID         ?? 0),
    customerID:           Number(data.customerID           ?? 0),
    customerContractID:   Number(data.customerContractID   ?? 0),
    jobType:              String(data.jobType              ?? ''),
    jobDescription:       String(data.jobDescription       ?? ''),
    iD:                   Number(data.iD                   ?? 0),
    rateperSQFT:          Number(data.rateperSQFT          ?? 0),
    totalAreaSQFT:        Number(data.totalAreaSQFT        ?? 0),
    targetCompletionDate: data.targetCompletionDate        ?? '',
    actualCompletionDate: data.actualCompletionDate        || null,
    jobStatus:            String(data.jobStatus            ?? 'Open'),
  }),

/**
 * DELETE /api/JobRequest/Delete/{id}
 */
deleteJobRequest: (id) =>
  api.delete(`/JobRequest/Delete/${id}`),


// ─────────────────────────────────────
// JOB TASKS  (Job_Task_DTL)
// ─────────────────────────────────────

/** GET /api/JobTaskDTL/GetAll */
getAllJobTasks: () =>
  api.get('/JobTaskDTL/GetAll'),

/** GET /api/JobTaskDTL/GetByJobRequest/{jobRequestID} */
getJobTasksByJobRequestId: (jobRequestID) =>
  api.get(`/JobTaskDTL/GetByJobRequest/${jobRequestID}`),

/**
 * POST /api/JobTaskDTL/Create
 *
 * Submit_DTTM is always the current timestamp (front end sends it; read-only in UI).
 * Status values: Open / In Progress / Submitted
 */
createJobTask: (data) => {
  const userId = (() => {
    const id = localStorage.getItem('userId');
    const n  = parseInt(id, 10);
    return isNaN(n) ? 0 : n;
  })();

  return api.post('/JobTaskDTL/Create', {
    jobTaskID:            0,
    jobRequestID:         Number(data.jobRequestID         ?? 0),
    hoardingID:           Number(data.hoardingID           ?? 0),
    actualCompletionDate: data.actualCompletionDate        ?? new Date().toISOString().split('T')[0],
    status:               String(data.status               ?? 'Open'),
    submitDTTM:           data.submitDTTM                  ?? new Date().toISOString(),
    lastUpdateDttm:       new Date().toISOString(),
    lastUpdatedBy:        Number(data.lastUpdatedBy        ?? userId),
  });
},

/**
 * PUT /api/JobTaskDTL/Update
 */
updateJobTask: (data) => {
  const userId = (() => {
    const id = localStorage.getItem('userId');
    const n  = parseInt(id, 10);
    return isNaN(n) ? 0 : n;
  })();

  return api.put('/JobTaskDTL/Update', {
    jobTaskID:            Number(data.jobTaskID            ?? 0),
    jobRequestID:         Number(data.jobRequestID         ?? 0),
    hoardingID:           Number(data.hoardingID           ?? 0),
    actualCompletionDate: data.actualCompletionDate        ?? new Date().toISOString().split('T')[0],
    status:               String(data.status               ?? 'Open'),
    submitDTTM:           data.submitDTTM                  ?? new Date().toISOString(),
    lastUpdateDttm:       new Date().toISOString(),
    lastUpdatedBy:        Number(data.lastUpdatedBy        ?? userId),
  });
},

/**
 * DELETE /api/JobTaskDTL/Delete/{id}
 */
deleteJobTask: (id) =>
  api.delete(`/JobTaskDTL/Delete/${id}`),


// ─────────────────────────────────────
// USER REGISTRATION
// POST /api/Login/register
// ─────────────────────────────────────

/**
 * Register a new user.
 * The API expects snake_case field names as shown in the Postman example.
 *
 * @param {object} data  — form data from Registration.jsx (camelCase keys)
 */
registerUser: (data) =>
  api.post('/Login/register', {
    first_Name:    String(data.firstName    || '').trim(),
    last_Name:     String(data.lastName     || '').trim(),
    phone_1:       String(data.phone1       || '').trim(),
    phone_2:       String(data.phone2       || '').trim(),
    email:         String(data.email        || '').trim(),
    address_Line_1:String(data.addressLine1 || '').trim(),
    address_Line_2:String(data.addressLine2 || '').trim(),
    address_Line_3:String(data.addressLine3 || '').trim(),
    city:          String(data.city         || '').trim(),
    district:      String(data.district     || '').trim(),
    country:       String(data.country      || 'India').trim(),
    role:          String(data.role         || '').trim(),
  }),





    
  };
  export default api;