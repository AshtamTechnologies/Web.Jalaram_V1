import axios from 'axios';

export const API_BASE_URL = 'https://api.jalaram-ad.ashtamtechnologies.com/api';
export const API_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/i, '');

// https://uatapi.jalaram-ad.ashtamtechnologies.com/swagger/index.htmls

// export const API_BASE_URL = 'https://uatapi.jalaram-ad.ashtamtechnologies.com/api';
// export const API_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/i, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 80000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
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

/* ─────────────────────────────────────────
   HOARDING MAINTENANCE HELPERS & NORMALIZERS
───────────────────────────────────────── */
export const resolveMaintenancePhotoSrc = (p) => {
  if (!p) return '';
  const raw = typeof p === 'string' ? p : (p.photoPath ?? p.photo_Path ?? p.path ?? p.photoUrl ?? p.url ?? '');
  if (!raw) return '';
  if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  const base = (API_ROOT_URL || API_BASE_URL.replace(/\/api\/?$/i, '')).replace(/\/+$/, '');
  const rel = '/' + raw.replace(/^\/+/, '');
  return `${base}${rel}`;
};

export function normalizeReason(raw) {
  if (!raw) return null;
  return {
    maintenanceReasonID: Number(raw.maintenance_Reason_ID ?? raw.maintenanceReasonID ?? raw.maintenanceReasonId ?? raw.id ?? 0),
    reasonName: raw.reason_Name ?? raw.reasonName ?? raw.name ?? raw.reason ?? raw.description ?? '',
    isActive: raw.is_Active ?? raw.isActive ?? true,
  };
}

export function normalizeMaintenancePhoto(raw) {
  if (!raw) return null;
  const rawType =
    raw.photo_Type ??
    raw.Photo_Type ??
    raw.PhotoType ??
    raw.photoType ??
    raw.photo_type ??
    raw.Photo_type ??
    raw.type ??
    raw.Type ??
    raw.photoCategory ??
    raw.PhotoCategory ??
    '';

  const typeStr = typeof rawType === 'string' && rawType.trim() ? rawType.trim() : 'Before';
  const normalizedType =
    typeStr.toLowerCase() === 'after'
      ? 'After'
      : typeStr.toLowerCase() === 'before'
      ? 'Before'
      : typeStr.charAt(0).toUpperCase() + typeStr.slice(1);

  return {
    photoID: Number(raw.maintenance_Photo_ID ?? raw.maintenancePhotoID ?? raw.Photo_ID ?? raw.photoID ?? raw.photoId ?? raw.id ?? 0),
    maintenanceID: Number(raw.maintenance_ID ?? raw.maintenanceID ?? raw.maintenanceId ?? 0),
    photoType: normalizedType,
    photoPath: raw.photo_Path ?? raw.Photo_Path ?? raw.PhotoPath ?? raw.photoPath ?? raw.path ?? raw.photoUrl ?? raw.url ?? '',
    filename: raw.filename ?? raw.fileName ?? raw.FileName ?? '',
    uploadedOn: raw.uploaded_On ?? raw.Uploaded_On ?? raw.createdAt ?? raw.createdDate ?? raw.uploadDate ?? '',
    createdAt: raw.uploaded_On ?? raw.Uploaded_On ?? raw.createdAt ?? raw.createdDate ?? raw.uploadDate ?? '',
    uploadedBy: raw.uploaded_By ?? raw.Uploaded_By ?? raw.createdBy ?? null,
    uploadedByName: raw.uploaded_By_Name ?? raw.Uploaded_By_Name ?? raw.createdByName ?? '',
    isDeleted: raw.is_Deleted ?? raw.isDeleted ?? false,
  };
}

export function normalizeStatusLog(raw) {
  if (!raw) return null;
  return {
    logID: Number(raw.status_Log_ID ?? raw.statusLogID ?? raw.logID ?? raw.logId ?? raw.id ?? 0),
    maintenanceID: Number(raw.maintenance_ID ?? raw.maintenanceID ?? raw.maintenanceId ?? 0),
    oldStatus: raw.old_Status ?? raw.oldStatus ?? '',
    newStatus: raw.new_Status ?? raw.newStatus ?? '',
    remarks: raw.remarks ?? raw.comment ?? '',
    changedBy: raw.changed_By ?? raw.changedBy ?? 0,
    changedByName: raw.changed_By_Name ?? raw.changedByName ?? raw.createdByName ?? raw.userName ?? (raw.changed_By ? `User #${raw.changed_By}` : 'System'),
    changedDate: raw.changed_On ?? raw.changedDate ?? raw.createdAt ?? raw.createdDate ?? raw.date ?? '',
  };
}

export function normalizeMaintenance(raw) {
  if (!raw) return null;
  
  const rawPhotos = raw.photos ?? raw.maintenancePhotos ?? raw.$values ?? [];
  const photos = Array.isArray(rawPhotos)
    ? rawPhotos.map(normalizeMaintenancePhoto).filter(Boolean)
    : (rawPhotos?.$values ? rawPhotos.$values.map(normalizeMaintenancePhoto).filter(Boolean) : []);

  const rawLogs = raw.statusLogs ?? raw.statusLog ?? raw.history ?? raw.maintenanceStatusLogs ?? [];
  const statusLogs = Array.isArray(rawLogs)
    ? rawLogs.map(normalizeStatusLog).filter(Boolean)
    : (rawLogs?.$values ? rawLogs.$values.map(normalizeStatusLog).filter(Boolean) : []);

  const reportedDate = raw.reported_Date ?? raw.reportedDate ?? raw.createdAt ?? raw.createdDate ?? '';
  const rawTargetDate = raw.target_Date ?? raw.targetDate ?? '';
  const rawCompletedDate = raw.completed_Date ?? raw.completedDate ?? raw.completionDate ?? '';
  const rawClosedDate = raw.closed_Date ?? raw.closedDate ?? '';
  const reportedByName = raw.reported_By_Name ?? raw.reportedByName ?? raw.createdByName ?? raw.userName ?? (raw.reported_By ? `User #${raw.reported_By}` : 'Admin');

  const hoardingObj = raw.hoarding || raw.Hoarding || null;
  const siteObj = raw.site || raw.Site || hoardingObj?.site || hoardingObj?.Site || null;

  const rawSiteAddress =
    raw.siteAddress ??
    raw.SiteAddress ??
    raw.site_Address ??
    raw.address ??
    raw.Address ??
    siteObj?.addressLine1 ??
    siteObj?.AddressLine1 ??
    hoardingObj?.addressLine1 ??
    hoardingObj?.AddressLine1 ??
    hoardingObj?.siteAddress ??
    '';

  const rawCity =
    raw.city ??
    raw.City ??
    siteObj?.city ??
    siteObj?.City ??
    hoardingObj?.city ??
    hoardingObj?.City ??
    '';

  const fullAddress = [
    siteObj?.addressLine1 || raw.addressLine1 || raw.AddressLine1 || rawSiteAddress,
    siteObj?.addressLine2 || raw.addressLine2 || raw.AddressLine2 || hoardingObj?.addressLine2,
    siteObj?.addressLine3 || raw.addressLine3 || raw.AddressLine3,
    siteObj?.landmark || raw.landmark || raw.Landmark || hoardingObj?.landmark,
    siteObj?.city || raw.city || raw.City || rawCity,
    siteObj?.district || raw.district || raw.District,
    siteObj?.state || raw.state || raw.State,
  ]
    .filter(Boolean)
    .join(', ') || rawSiteAddress || '';

  return {
    maintenanceID: Number(raw.maintenance_ID ?? raw.maintenanceID ?? raw.maintenanceId ?? raw.hoardingMaintenanceID ?? raw.id ?? 0),
    hoardingID: Number(raw.hoarding_ID ?? raw.hoardingID ?? raw.hoardingId ?? hoardingObj?.hoardingID ?? 0),
    hoardingCode: raw.hoarding_Code ?? raw.hoardingCode ?? hoardingObj?.hoardingCode ?? (raw.hoarding_ID || raw.hoardingID ? `HD-${raw.hoarding_ID || raw.hoardingID}` : '—'),
    hoarding: hoardingObj,
    site: siteObj,
    siteAddress: fullAddress,
    siteCity: rawCity || siteObj?.city || '',
    maintenanceReasonID: Number(raw.maintenance_Reason_ID ?? raw.maintenanceReasonID ?? raw.maintenanceReasonId ?? 0),
    reasonName: raw.reason_Name ?? raw.reasonName ?? raw.maintenanceReason?.reasonName ?? raw.maintenanceReason?.name ?? '—',
    maintenanceReason: raw.maintenanceReason || null,
    description: raw.description ?? '',
    priority: raw.priority ?? 'Normal',
    status: raw.status ?? 'Open',
    targetDate: rawTargetDate ? (rawTargetDate.includes('T') ? rawTargetDate.split('T')[0] : rawTargetDate) : '',
    completedDate: rawCompletedDate ? (rawCompletedDate.includes('T') ? rawCompletedDate.split('T')[0] : rawCompletedDate) : '',
    closedDate: rawClosedDate ? (rawClosedDate.includes('T') ? rawClosedDate.split('T')[0] : rawClosedDate) : '',
    reportedBy: raw.reported_By ?? raw.reportedBy ?? 0,
    reportedByName: reportedByName,
    reportedDate: reportedDate,
    remarks: raw.completion_Remarks ?? raw.completionRemarks ?? raw.remarks ?? '',
    completionRemarks: raw.completion_Remarks ?? raw.completionRemarks ?? '',
    cost: raw.maintenance_Cost != null ? Number(raw.maintenance_Cost) : (raw.cost != null ? Number(raw.cost) : (raw.maintenanceCost != null ? Number(raw.maintenanceCost) : null)),
    assignedTo: raw.assigned_To ?? raw.assignedTo ?? null,
    assignedToName: raw.assigned_To_Name ?? raw.assignedToName ?? '',
    isActive: raw.is_Active ?? raw.isActive ?? true,
    lastUpdateDttm: raw.last_Update_Dttm ?? raw.lastUpdateDttm ?? '',
    lastUpdatedByName: raw.last_Updated_By_Name ?? raw.lastUpdatedByName ?? '',
    photos,
    statusLogs,
  };
}

let _hoardingAddressCache = null;
let _hoardingAddressPromise = null;

export const getHoardingAddressMap = async (forceRefresh = false) => {
  if (_hoardingAddressCache && !forceRefresh) return _hoardingAddressCache;
  if (_hoardingAddressPromise && !forceRefresh) return _hoardingAddressPromise;

  _hoardingAddressPromise = (async () => {
    try {
      const [hRes, sRes] = await Promise.all([
        api.get('/Hoarding').catch(() => []),
        api.get('/Site').catch(() => []),
      ]);

      const extract = (res) => {
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.data)) return res.data;
        if (Array.isArray(res?.$values)) return res.$values;
        return [];
      };

      const sList = extract(sRes);
      const siteMap = new Map();
      sList.forEach((s) => {
        const sId = s.siteID ?? s.siteId ?? s.SiteID ?? s.id;
        if (sId != null) {
          siteMap.set(String(sId), s);
          siteMap.set(Number(sId), s);
        }
      });

      const hList = extract(hRes);
      const byIdMap = new Map();
      const byCodeMap = new Map();
      const uniqueHoardings = [];

      // Group flat hoarding records by hoarding code (same logic as Hoarding.jsx)
      const groupMap = new Map();
      hList.forEach((rec) => {
        const hId = rec.hoardingID ?? rec.hoardingId ?? rec.HoardingID ?? rec.id;
        const code = String(rec.hoardingCode ?? rec.HoardingCode ?? '').trim();
        const groupKey = (code || (hId ? `HD-${hId}` : '')).toLowerCase();
        if (!groupKey) return;

        if (!groupMap.has(groupKey)) {
          groupMap.set(groupKey, {
            canonicalCode: code || (hId ? `HD-${hId}` : ''),
            versions: [],
          });
        }
        groupMap.get(groupKey).versions.push(rec);
      });

      groupMap.forEach((group) => {
        // Sort versions by effdt descending (latest first)
        const sortedVersions = [...group.versions].sort((a, b) => {
          const dateA = new Date(a.effdt || a.effdtRaw || 0).getTime();
          const dateB = new Date(b.effdt || b.effdtRaw || 0).getTime();
          return dateB - dateA;
        });

        const latest = sortedVersions[0] || {};
        // Find best siteID (check latest version first, fallback to any version with a siteID)
        let resolvedSiteId = latest.siteID ?? latest.siteId ?? latest.SiteID ?? latest.site_ID ?? latest.site?.siteID ?? latest.Site?.siteID;
        if (resolvedSiteId == null || resolvedSiteId === 0 || resolvedSiteId === '') {
          for (const v of sortedVersions) {
            const vSiteId = v.siteID ?? v.siteId ?? v.SiteID ?? v.site_ID ?? v.site?.siteID ?? v.Site?.siteID;
            if (vSiteId != null && vSiteId !== 0 && vSiteId !== '') {
              resolvedSiteId = vSiteId;
              break;
            }
          }
        }

        const s = (resolvedSiteId != null ? siteMap.get(String(resolvedSiteId)) : null) || latest.site || latest.Site || {};

        const addressParts = [
          s.addressLine1 || s.AddressLine1 || latest.addressLine1 || latest.AddressLine1,
          s.addressLine2 || s.AddressLine2 || latest.addressLine2 || latest.AddressLine2,
          s.addressLine3 || s.AddressLine3 || latest.addressLine3,
          s.landmark || s.Landmark || latest.landmark || latest.Landmark,
          s.city || s.City || latest.city || latest.City,
          s.district || s.District || latest.district || latest.District,
          s.state || s.State || latest.state || latest.State,
        ]
          .map((x) => (typeof x === 'string' ? x.trim() : x))
          .filter(Boolean);

        const fullAddress =
          addressParts.length > 0
            ? addressParts.join(', ')
            : s.addressLine1 || s.AddressLine1 || (s.city ? `${s.city}` : (latest.siteAddress || ''));

        const latestHId = latest.hoardingID ?? latest.hoardingId ?? latest.HoardingID ?? latest.id;
        const info = {
          hoardingID: Number(latestHId || 0),
          hoardingCode: group.canonicalCode,
          width: latest.width ?? latest.Width ?? '',
          height: latest.height ?? latest.Height ?? '',
          siteID: resolvedSiteId,
          site: s,
          addressLine1: s.addressLine1 || latest.addressLine1 || '',
          city: s.city || latest.city || '',
          fullAddress: fullAddress,
        };

        // Register all version IDs in byIdMap
        sortedVersions.forEach((v) => {
          const vId = v.hoardingID ?? v.hoardingId ?? v.HoardingID ?? v.id;
          if (vId != null) {
            byIdMap.set(String(vId), info);
            byIdMap.set(Number(vId), info);
          }
        });

        // Register all code variants in byCodeMap
        const rawCode = group.canonicalCode;
        const codeLower = rawCode.toLowerCase();
        const codeAlphanum = codeLower.replace(/[\s\-_]/g, '');
        byCodeMap.set(codeLower, info);
        byCodeMap.set(rawCode, info);
        byCodeMap.set(codeAlphanum, info);

        uniqueHoardings.push(info);
      });

      // Ensure any standalone raw record from hList is mapped in byIdMap
      hList.forEach((h) => {
        const hId = h.hoardingID ?? h.hoardingId ?? h.HoardingID ?? h.id;
        if (hId != null && !byIdMap.has(String(hId))) {
          const sId = h.siteID ?? h.siteId ?? h.SiteID ?? h.site_ID ?? h.site?.siteID ?? h.Site?.siteID;
          const s = (sId != null ? siteMap.get(String(sId)) : null) || h.site || h.Site || {};
          const fullAddress = [
            s.addressLine1 || s.AddressLine1 || h.addressLine1,
            s.addressLine2 || s.AddressLine2 || h.addressLine2,
            s.landmark || s.Landmark || h.landmark,
            s.city || s.City || h.city,
            s.district || s.District || h.district,
            s.state || s.State || h.state,
          ]
            .map((x) => (typeof x === 'string' ? x.trim() : x))
            .filter(Boolean)
            .join(', ');

          const info = {
            hoardingID: Number(hId),
            hoardingCode: String(h.hoardingCode ?? h.HoardingCode ?? `HD-${hId}`).trim(),
            width: h.width ?? h.Width ?? '',
            height: h.height ?? h.Height ?? '',
            siteID: sId,
            site: s,
            addressLine1: s.addressLine1 || h.addressLine1 || '',
            city: s.city || h.city || '',
            fullAddress: fullAddress || s.addressLine1 || '',
          };
          byIdMap.set(String(hId), info);
          byIdMap.set(Number(hId), info);
        }
      });

      uniqueHoardings.sort((a, b) => a.hoardingCode.localeCompare(b.hoardingCode));

      _hoardingAddressCache = { byIdMap, byCodeMap, uniqueHoardings, hList, sList };
      return _hoardingAddressCache;
    } catch (err) {
      console.error('Failed to load hoarding address map:', err);
      return { byIdMap: new Map(), byCodeMap: new Map(), uniqueHoardings: [], hList: [], sList: [] };
    } finally {
      _hoardingAddressPromise = null;
    }
  })();

  return _hoardingAddressPromise;
};

export const enrichItemWithHoardingAddress = (m, addressData) => {
  if (!m) return m;
  const { byIdMap, byCodeMap } = addressData || {};
  if (!byIdMap && !byCodeMap) return m;

  const hIdStr = m.hoardingID ? String(m.hoardingID) : '';
  const rawCode = String(m.hoardingCode || '').trim();
  const codeLower = rawCode.toLowerCase();
  const codeAlphanum = codeLower.replace(/[\s\-_]/g, '');

  let matched = null;
  if (hIdStr && byIdMap) {
    matched = byIdMap.get(hIdStr) || byIdMap.get(Number(hIdStr));
  }
  if (!matched && codeLower && byCodeMap) {
    matched = byCodeMap.get(codeLower) || byCodeMap.get(codeAlphanum) || byCodeMap.get(rawCode);
  }

  // Fallback for code formats like "HD-5" or numeric codes
  if (!matched && byIdMap) {
    const numMatch = rawCode.match(/\d+/);
    if (numMatch) {
      matched = byIdMap.get(numMatch[0]) || byIdMap.get(Number(numMatch[0]));
    }
  }

  if (matched) {
    if (matched.fullAddress && (!m.siteAddress || m.siteAddress === '—' || m.siteAddress === `HD-${m.hoardingID}`)) {
      m.siteAddress = matched.fullAddress;
    }
    if (!m.site && matched.site) {
      m.site = matched.site;
    }
    if ((!m.hoardingCode || m.hoardingCode === '—' || m.hoardingCode.startsWith('HD-')) && matched.hoardingCode) {
      m.hoardingCode = matched.hoardingCode;
    }
    if ((!m.hoardingID || m.hoardingID === 0) && matched.hoardingID) {
      m.hoardingID = matched.hoardingID;
    }
  }

  return m;
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
  getAllExternalAvailableForVendor: () => api.get('/Hoarding/GetAllExternalavailableforVendor'),
  getAvailableHoardings: (startDate, endDate) => api.get(`/Hoarding/available?startDate=${startDate}&endDate=${endDate}`),
  getAvailableHoardingListPhoto: (startDate) => {
    return api.get(`/Hoarding/GetAvailableHoardingListPhoto?startDate=${encodeURIComponent(startDate || '')}`);
  },
  getAllHoardingsStatusListPhoto: (startDate, endDate) => {
    let url = `/Hoarding/GetAllHoardingsStatusListPhoto?startDate=${encodeURIComponent(startDate || '')}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
    return api.get(url);
  },
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
  updateHoardingPhoto: (idOrFormData, maybeFormData) => {
    if (maybeFormData) {
      return api.put(`/HoardingPhoto/${idOrFormData}`, maybeFormData, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    const id = idOrFormData.get('hoardingPhotoID');
    return api.put(`/HoardingPhoto/${id}`, idOrFormData, { headers: { 'Content-Type': 'multipart/form-data' } });
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
  getLandContractsBySiteId: (ownerId) => api.get(`/LandContract/GetBySiteId/${ownerId}`),

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
      extrapayment: (data.extrapayment !== '' && data.extrapayment != null) ? Number(data.extrapayment) : null,
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
      extrapayment: (data.extrapayment !== '' && data.extrapayment != null) ? Number(data.extrapayment) : null,
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
    hoardingLineNumber: Number(data.hoardingLineNumber ?? data.HoardingLineNumber ?? data.lineNo ?? 0),
    hoardingID: Number(data.hoardingID ?? data.HoardingID),
    customerContractID: Number(data.customerContractID ?? data.CustomerContractID),
    mergeAlongFlag: data.mergeAlongFlag ?? data.MergeAlongFlag ?? 'H',
  }),
  updateHoardingMerge: (id, data) => api.put(`/HoardingMerge/Update`, {
    hoardingMergeID: Number(id),
    hoardingLineNumber: Number(data.hoardingLineNumber ?? data.HoardingLineNumber ?? data.lineNo ?? 0),
    hoardingID: Number(data.hoardingID ?? data.HoardingID),
    customerContractID: Number(data.customerContractID ?? data.CustomerContractID),
    mergeAlongFlag: data.mergeAlongFlag ?? data.MergeAlongFlag ?? 'H',
  }),
  deleteHoardingMerge: (id) => api.delete(`/HoardingMerge/Delete/${id}`),
  selectMergePhoto: (data) => {
    const fd = new FormData();
    fd.append('CustomerContractID', Number(data.customerContractID ?? data.CustomerContractID ?? 0));
    fd.append('HoardingID', Number(data.hoardingID ?? data.HoardingID ?? 0));
    const existingPhotoId = data.existingHoardingPhotoID ?? data.ExistingHoardingPhotoID;
    if (existingPhotoId != null && Number(existingPhotoId) > 0) {
      fd.append('ExistingHoardingPhotoID', Number(existingPhotoId));
    }
    if (data.newPhoto || data.NewPhoto) {
      const files = Array.isArray(data.newPhoto || data.NewPhoto)
        ? (data.newPhoto || data.NewPhoto)
        : [data.newPhoto || data.NewPhoto];
      files.forEach(f => {
        if (f) fd.append('NewPhoto', f);
      });
    }
    return api.post('/HoardingMerge/SelectMergePhoto', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getMergedImages: async (customerContractId) => {
    try {
      const res = await api.get(`/HoardingMerge/GetMergedImages/${customerContractId}`);
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : Array.isArray(res?.$values) ? res.$values : [];
    } catch {
      return [];
    }
  },
  getAllHoardingPhotos: async () => {
    try {
      const res = await api.get('/HoardingPhoto/GetAll');
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : Array.isArray(res?.value) ? res.value : [];
    } catch {
      try {
        const res2 = await api.get('/HoardingPhoto');
        return Array.isArray(res2) ? res2 : Array.isArray(res2?.data) ? res2.data : Array.isArray(res2?.value) ? res2.value : [];
      } catch {
        return [];
      }
    }
  },

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
  getLandContractHoardingMapsByOwnerId: (ownerId) => api.get(`/LandContractHoardingMap/GetByOwnerId/${ownerId}`),

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
      `${API_BASE_URL}/Report/ExportReport?reportType=${reportType}&format=${format}`,
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
      `${API_BASE_URL}/Report/ExportPDF`,
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
  getAllQuotationArchives: () => api.get('/QuotationArchive'),
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
    const flag = data.mergeAlongFlag === 'S' ? 'S' : (data.mergeAlongFlag === 'H' ? 'H' : 'V');
    return api.post('/QuotationMergeDTL', {
      quotationMergeID: 0,
      quotationLineNumber: Number(data.quotationLineNumber ?? 0),
      quotationID: Number(data.quotationID),
      quotationRevisionNumber: Number(data.quotationRevisionNumber ?? 0),
      hoardingID: Number(data.hoardingID),
      mergeAlongFlag: flag,
    });
  },

  updateQuotationMerge: (mergeId, hoardingId, data) => {
    const flag = data.mergeAlongFlag === 'S' ? 'S' : (data.mergeAlongFlag === 'H' ? 'H' : 'V');
    return api.put(`/QuotationMergeDTL/${mergeId}/${hoardingId}`, {
      quotationMergeID: Number(mergeId),
      quotationLineNumber: Number(data.quotationLineNumber ?? 0),
      quotationID: Number(data.quotationID ?? 0),
      quotationRevisionNumber: Number(data.quotationRevisionNumber ?? 0),
      hoardingID: Number(hoardingId),
      mergeAlongFlag: flag,
    });
  },

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
  getFilteredJobPayments: (params = {}) => {
    const query = new URLSearchParams();
    if (params.fromDate) query.append('fromDate', params.fromDate);
    if (params.toDate) query.append('toDate', params.toDate);
    if (params.userId) query.append('userId', params.userId);
    const qs = query.toString();
    return api.get(`/JobPayment/filter${qs ? `?${qs}` : ''}`);
  },
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
    isAdvancePayment: Boolean(data.isAdvancePayment ?? false),
    advancePaymentAmount: 0,
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
    isAdvancePayment: Boolean(data.isAdvancePayment ?? false),
    advancePaymentAmount: 0,
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
  getAllExternalHoardings: () => api.get('/Hoarding/GetAllExternal'),
  getAllExternalAvailableForVendor: () => api.get('/Hoarding/GetAllExternalavailableforVendor'),

  // OUTSIDE SITES (EXTERNAL SITES)
  getAllOutsideSites: async () => {
    try {
      return await api.get('/OutsideSite');
    } catch (err) {
      if (err?.response?.status === 404) return [];
      throw err;
    }
  },
  getOutsideSiteById: (id) => api.get(`/OutsideSite/${id}`),
  getOutsideSitesByVendorId: async (vendorId) => {
    try {
      return await api.get(`/OutsideSite/vendor/${vendorId}`);
    } catch (err) {
      if (err?.response?.status === 404) return [];
      throw err;
    }
  },
  createOutsideSite: (data) => api.post('/OutsideSite', {
    outsideSiteID: 0,
    addressLine1: data.addressLine1 || '',
    addressLine2: data.addressLine2 || '',
    addressLine3: data.addressLine3 || '',
    landmark: data.landmark || '',
    city: data.city || '',
    district: data.district || '',
    state: data.state || 'Gujarat',
    pincode: data.pincode || '',
    siteType: data.siteType || '',
    country: data.country || 'India',
    vendorID: Number(data.vendorID) || 0,
    status: data.status === 'Active' || data.status === true,
  }),
  updateOutsideSite: (id, data) => api.put(`/OutsideSite/${id}`, {
    outsideSiteID: Number(id),
    addressLine1: data.addressLine1 || '',
    addressLine2: data.addressLine2 || '',
    addressLine3: data.addressLine3 || '',
    landmark: data.landmark || '',
    city: data.city || '',
    district: data.district || '',
    state: data.state || 'Gujarat',
    pincode: data.pincode || '',
    siteType: data.siteType || '',
    country: data.country || 'India',
    vendorID: Number(data.vendorID) || 0,
    status: data.status === 'Active' || data.status === true,
  }),
  deleteOutsideSite: (id) => api.delete(`/OutsideSite/${id}`),

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
  getAllOpportunities: (isActive) => {
    if (isActive === undefined || isActive === null || isActive === '') {
      return api.get('/Opportunity');
    }
    return api.get(`/Opportunity?isActive=${isActive}`);
  },
  getConvertedOpportunities: () => api.get('/Opportunity/converted'),
  convertToLandlord: (opportunityId, data) =>
    api.post(`/Opportunity/ConvertToLandlord/${opportunityId}`, data),
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
  readNotification: (id) => api.put(`/Notification/Read/${id}`),

  // HOARDING MAINTENANCE
  getMaintenanceReasons: async () => {
    try {
      const res = await api.get('/maintenance-reasons');
      const list = Array.isArray(res) ? res : (res?.data ?? res?.$values ?? []);
      return (Array.isArray(list) ? list : []).map(normalizeReason).filter(Boolean);
    } catch (err) {
      console.error('Failed to load maintenance reasons:', err);
      return [];
    }
  },

  getHoardingAddressMap: (forceRefresh) => getHoardingAddressMap(forceRefresh),

  getHoardingMaintenances: async (params = {}) => {
    const cleanParams = {};
    if (params.status) cleanParams.Status = params.status;
    if (params.hoardingId) cleanParams.HoardingId = params.hoardingId;
    if (params.priority) cleanParams.Priority = params.priority;
    if (params.fromDate) cleanParams.FromDate = params.fromDate;
    if (params.toDate) cleanParams.ToDate = params.toDate;
    if (params.page || params.pageNumber) cleanParams.PageNumber = params.page || params.pageNumber;
    if (params.pageSize) cleanParams.PageSize = params.pageSize;

    const [res, addressData] = await Promise.all([
      api.get('/hoarding-maintenance', { params: cleanParams }),
      getHoardingAddressMap().catch(() => ({ byIdMap: new Map(), byCodeMap: new Map() })),
    ]);

    let items = [];
    let totalCount = 0;
    let page = params.page || params.pageNumber || 1;
    let pageSize = params.pageSize || 10;
    let totalPages = 1;

    if (Array.isArray(res)) {
      items = res;
      totalCount = res.length;
      totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    } else if (res && typeof res === 'object') {
      const rawList = res.items ?? res.data ?? res.records ?? res.$values ?? (Array.isArray(res) ? res : []);
      items = Array.isArray(rawList) ? rawList : [];
      totalCount = res.totalCount ?? res.total ?? res.count ?? items.length;
      page = res.pageNumber ?? res.page ?? page;
      pageSize = res.pageSize ?? pageSize;
      totalPages = res.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));
    }

    const normalizedItems = items
      .map((raw) => {
        const m = normalizeMaintenance(raw);
        return m ? enrichItemWithHoardingAddress(m, addressData) : null;
      })
      .filter(Boolean);

    return {
      items: normalizedItems,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  },

  getHoardingMaintenanceById: async (id) => {
    const [res, addressData] = await Promise.all([
      api.get(`/hoarding-maintenance/${id}`),
      getHoardingAddressMap().catch(() => ({ byIdMap: new Map(), byCodeMap: new Map() })),
    ]);
    const raw = res?.data ?? res;
    const item = normalizeMaintenance(raw);
    return item ? enrichItemWithHoardingAddress(item, addressData) : null;
  },

  createHoardingMaintenance: async (formData) => {
    const res = await api.post('/hoarding-maintenance', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res?.data ?? res;
  },

  addMaintenancePhotos: async (id, formData) => {
    let pType = '';
    try {
      if (formData instanceof FormData) {
        pType = formData.get('photoType') || formData.get('PhotoType') || formData.get('Photo_Type') || '';
      }
    } catch {
      // ignore
    }

    const query = pType
      ? `?photoType=${encodeURIComponent(pType)}&PhotoType=${encodeURIComponent(pType)}&photo_Type=${encodeURIComponent(pType)}&Photo_Type=${encodeURIComponent(pType)}`
      : '';

    const res = await api.post(`/hoarding-maintenance/${id}/photos${query}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res?.data ?? res;
  },

  deleteMaintenancePhoto: async (photoId) => {
    const res = await api.delete(`/hoarding-maintenance/photos/${photoId}`);
    return res?.data ?? res;
  },

  updateMaintenanceStatus: async (id, formDataOrObj) => {
    let payload = formDataOrObj;
    if (formDataOrObj instanceof FormData) {
      payload = formDataOrObj;
      const status =
        payload.get('New_Status') ||
        payload.get('NewStatus') ||
        payload.get('newStatus') ||
        payload.get('Status') ||
        payload.get('status') ||
        '';
      const remarks =
        payload.get('Remarks') ||
        payload.get('remarks') ||
        payload.get('CompletionRemarks') ||
        payload.get('completionRemarks') ||
        payload.get('Completion_Remarks') ||
        '';
      const cost =
        payload.get('Maintenance_Cost') ||
        payload.get('MaintenanceCost') ||
        payload.get('maintenanceCost') ||
        payload.get('cost') ||
        '0';

      if (status) {
        if (!payload.has('NewStatus')) payload.append('NewStatus', status);
        if (!payload.has('newStatus')) payload.append('newStatus', status);
        if (!payload.has('New_Status')) payload.append('New_Status', status);
        if (!payload.has('new_status')) payload.append('new_status', status);
        if (!payload.has('Status')) payload.append('Status', status);
        if (!payload.has('status')) payload.append('status', status);
      }
      if (remarks) {
        if (!payload.has('Remarks')) payload.append('Remarks', remarks);
        if (!payload.has('remarks')) payload.append('remarks', remarks);
        if (!payload.has('CompletionRemarks')) payload.append('CompletionRemarks', remarks);
        if (!payload.has('completionRemarks')) payload.append('completionRemarks', remarks);
        if (!payload.has('Completion_Remarks')) payload.append('Completion_Remarks', remarks);
      }
      if (cost != null) {
        if (!payload.has('Maintenance_Cost')) payload.append('Maintenance_Cost', String(cost));
        if (!payload.has('MaintenanceCost')) payload.append('MaintenanceCost', String(cost));
        if (!payload.has('maintenanceCost')) payload.append('maintenanceCost', String(cost));
        if (!payload.has('Cost')) payload.append('Cost', String(cost));
      }
    }

    const res = await api.put(`/hoarding-maintenance/${id}/status`, payload);
    return res?.data ?? res;
  },

  getHoardingIsInMaintenance: async (hoardingId) => {
    try {
      const res = await api.get(`/hoarding-maintenance/is-in-maintenance/${hoardingId}`);
      return res?.data ?? res;
    } catch (err) {
      console.error('Failed to fetch hoarding maintenance status:', err);
      return null;
    }
  },
  getMaintenanceReport: async (params = {}) => {
    const q = new URLSearchParams();
    if (params.Status) q.append('Status', params.Status);
    else if (params.status) q.append('Status', params.status);

    if (params.Priority) q.append('Priority', params.Priority);
    else if (params.priority) q.append('Priority', params.priority);

    if (params.FromDate) q.append('FromDate', params.FromDate);
    else if (params.fromDate) q.append('FromDate', params.fromDate);

    if (params.ToDate) q.append('ToDate', params.ToDate);
    else if (params.toDate) q.append('ToDate', params.toDate);

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    const res = await api.get(`/hoarding-maintenance/report${queryStr}`);
    return res?.data ?? res;
  },
};

export const hoardingMaintenanceService = {
  getMaintenanceReasons: () => apiService.getMaintenanceReasons(),
  getHoardingMaintenances: (params) => apiService.getHoardingMaintenances(params),
  getHoardingMaintenanceById: (id) => apiService.getHoardingMaintenanceById(id),
  createHoardingMaintenance: (formData) => apiService.createHoardingMaintenance(formData),
  addMaintenancePhotos: (id, formData) => apiService.addMaintenancePhotos(id, formData),
  deleteMaintenancePhoto: (photoId) => apiService.deleteMaintenancePhoto(photoId),
  updateMaintenanceStatus: (id, formData) => apiService.updateMaintenanceStatus(id, formData),
  getHoardingIsInMaintenance: (hoardingId) => apiService.getHoardingIsInMaintenance(hoardingId),
  getMaintenanceReport: (params) => apiService.getMaintenanceReport(params),
};

export default api;