import React, {
  useState, useEffect, useCallback, useMemo,
  useRef, useLayoutEffect,
} from 'react';
import ReactDOM from 'react-dom';
import {
  Plus, Trash2, FileText, X, Search, Loader2,
  ChevronDown, Check, AlertCircle, RefreshCw,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, ChevronUp,
  Edit2, Filter, User, ArrowRight, ArrowLeft,
  Calendar, MapPin, LayoutGrid, CheckCircle2,
  Briefcase, Building2, Clock, UserCheck, Tag, Hash, Camera,
  ZoomIn, ZoomOut, SendHorizonal, Circle, AlertTriangle,
} from 'lucide-react';
import { apiService, API_ROOT_URL } from '../api/api';
import { useResizableColumns } from '../hooks/useResizableColumns';
import "./Common1.css";
/* Geolocation helpers */
function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false, timeout: 5000, maximumAge: 30000, ...options,
      });
    }, {
      enableHighAccuracy: true, timeout: 5000, maximumAge: 0, ...options,
    });
  });
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'en' } });
    const json = await res.json();
    return json?.display_name || '';
  } catch { return ''; }
}

async function getGeoPayload() {
  try {
    const pos = await getCurrentPosition();
    const { latitude, longitude, accuracy } = pos.coords;
    const address = await reverseGeocode(latitude, longitude);
    return { latitude, longitude, accuracy, address };
  } catch (err) {
    console.error("Geolocation failed:", err);
    return { latitude: 0, longitude: 0, accuracy: 0, address: '' };
  }
}

/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */
const JOB_TYPES = [
  { value: 'Mounting', label: 'Mounting', icon: '🪧' },
  { value: 'Repair', label: 'Repair', icon: '🔧' },
  { value: 'Erection', label: 'Erection', icon: '🏗️' },
];
const JOB_STATUS_LIST = ['Open', 'Accepted', 'In Progress', 'Submitted', 'Completed'];
const TASK_STATUS_LIST = ['Open', 'In Progress', 'Submitted'];
const PAGE_SIZE_OPTIONS = [5, 10, 15, 20];

const STEPS = [
  { n: 1, label: 'Job Details', Icon: Briefcase },
  { n: 2, label: 'Hoardings & Tasks', Icon: Building2 },
];

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
const uid = () => Math.random().toString(36).substr(2, 9);
const todayISO = () => new Date().toISOString().split('T')[0];
const nowISO = () => {
  const date = new Date();
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (3600000 * 5.5));
  const pad = (num) => String(num).padStart(2, '0');
  return `${istDate.getFullYear()}-${pad(istDate.getMonth() + 1)}-${pad(istDate.getDate())}T${pad(istDate.getHours())}:${pad(istDate.getMinutes())}:${pad(istDate.getSeconds())}.${String(istDate.getMilliseconds()).padStart(3, '0')}`;
};
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const parseUtcDate = (d) => {
  if (!d) return null;
  if (typeof d === 'string' && d.includes('T')) {
    const hasOffset = /([+-]\d{2}:\d{2}|Z)$/.test(d);
    if (!hasOffset) {
      return new Date(d + 'Z');
    }
  }
  return new Date(d);
};
const getTaskSubmitTimeFromAttachments = (taskID, allAttachments) => {
  const taskIDNum = Number(taskID);
  if (!taskIDNum || !allAttachments) return null;
  const mine = allAttachments.filter(a => Number(a.jobTaskID ?? a.JobTaskID ?? 0) === taskIDNum);
  if (mine.length === 0) return null;
  const sorted = [...mine].sort((a, b) => {
    const da = new Date(a.lastUpdateDttm ?? a.LastUpdateDttm ?? 0).getTime();
    const db = new Date(b.lastUpdateDttm ?? b.LastUpdateDttm ?? 0).getTime();
    return db - da;
  });
  return sorted[0]?.lastUpdateDttm ?? sorted[0]?.LastUpdateDttm ?? null;
};
const fmtDateTime = (d) => {
  if (!d) return '—';
  try {
    const parsed = parseUtcDate(d);
    return parsed.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
};

const validateTargetDate = (selectedDate, contractStart) => {
  if (!selectedDate || !contractStart) return { isValid: true };
  const target = new Date(selectedDate + 'T00:00:00');
  const start = new Date(contractStart + 'T00:00:00');

  // If target date is before start date, it is allowed (valid)
  if (target < start) {
    return { isValid: true };
  }

  // If target date is on or after start date, it must be within 7 days of start date
  const diffTime = target.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 7) {
    return {
      isValid: false,
      reason: 'greater_than_7_days',
      message: `Target Completion Date must be within 7 days after the Contract Start Date.`
    };
  }

  return { isValid: true };
};



function buildImageUrl(att) {
  const path = att.photoFilePath ?? att.PhotoFilePath
    ?? att.filePath ?? att.FilePath
    ?? att.imagePath ?? att.ImagePath
    ?? '';
  if (!path) return null;
  if (path.startsWith('http')) return path;
  // Normalize: strip trailing slash from base, ensure leading slash on path
  const base = (API_ROOT_URL || '').replace(/\/$/, '');
  const rel = path.startsWith('/') ? path : `/${path}`;
  return `${base}${rel}`;
}

function normalizeList(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.$values)) return res.$values;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  return [];
}

function normalizeCustomer(raw) {
  return {
    customerID: raw.customerID ?? raw.CustomerID ?? 0,
    customerName: raw.customerName ?? raw.CustomerName ?? '',
    city: raw.city ?? raw.City ?? '',
    district: raw.district ?? raw.District ?? '',
    phone1: raw.phone1 ?? raw.Phone1 ?? '',
    gstNumber: raw.gstNumber ?? raw.GstNumber ?? '',
  };
}

function normalizeContract(raw) {
  const rawComments = raw.comments ?? raw.Comments ?? '';
  const matchCompany = rawComments.match(/\[CompanyID:\s*(\d+)\]/i);
  const commentsCompanyID = matchCompany ? Number(matchCompany[1]) : '';
  const comments = rawComments.replace(/\[CompanyID:\s*\d+\]/gi, '').trim();
  const directCompanyID = raw.companyID ?? raw.CompanyID ?? raw.company_ID ?? raw.Company_ID ?? '';

  return {
    customerContractID: Number(raw.customerContractID ?? raw.CustomerContractID ?? 0),
    customerID: Number(raw.customerID ?? raw.CustomerID ?? 0),
    hoardingID: Number(raw.hoardingID ?? raw.HoardingID ?? 0),
    startDate: (raw.startDate ?? raw.StartDate ?? '').split('T')[0],
    endDate: (raw.endDate ?? raw.EndDate ?? '').split('T')[0],
    status: raw.status ?? raw.Status ?? '',
    amountPerFreq: Number(raw.amountPerFreq ?? raw.AmountPerFreq ?? 0),
    comments: comments,
    companyID: directCompanyID !== '' ? Number(directCompanyID) : (commentsCompanyID !== '' ? Number(commentsCompanyID) : ''),
  };
}

function normalizeCompany(raw) {
  if (!raw) return null;
  return {
    companyID: Number(raw.company_ID ?? raw.Company_ID ?? raw.companyID ?? raw.CompanyID ?? 0),
    companyName: raw.company_Name ?? raw.Company_Name ?? raw.companyName ?? raw.CompanyName ?? '',
    addressLine1: raw.address_Line1 ?? raw.Address_Line1 ?? raw.addressLine1 ?? raw.AddressLine1 ?? '',
    addressLine2: raw.address_Line2 ?? raw.Address_Line2 ?? raw.addressLine2 ?? raw.AddressLine2 ?? '',
    city: raw.city ?? raw.City ?? '',
    state: raw.state ?? raw.State ?? '',
    country: raw.country ?? raw.Country ?? '',
    pincode: raw.pincode ?? raw.Pincode ?? '',
    contactPerson: raw.contact_Person ?? raw.Contact_Person ?? raw.contactPerson ?? raw.ContactPerson ?? '',
    mobileNo: raw.mobile_No ?? raw.Mobile_No ?? raw.mobileNo ?? raw.MobileNo ?? '',
    email: raw.email ?? raw.Email ?? '',
    website: raw.website ?? raw.Website ?? '',
    gstin: raw.gstin ?? raw.GSTIN ?? raw.Gstin ?? '',
    panNo: raw.paN_No ?? raw.PAN_No ?? raw.panNo ?? raw.PanNo ?? raw.pan ?? '',
  };
}

function getCompanyInfo(company) {
  if (!company) return JOB_COMPANY;
  const line2Parts = [
    company.addressLine2,
    company.city,
    [company.state, company.pincode].filter(Boolean).join(' - '),
    company.country
  ].filter(Boolean);

  const phoneParts = [
    company.contactPerson ? `${company.contactPerson} # ` : '',
    company.mobileNo || ''
  ].filter(Boolean).join('');

  return {
    name: company.companyName || JOB_COMPANY.name,
    line1: company.addressLine1 || JOB_COMPANY.line1,
    line2: line2Parts.join(', ') || JOB_COMPANY.line2,
    phone: phoneParts || company.mobileNo || JOB_COMPANY.phone,
  };
}

function normalizeSite(raw) {
  if (!raw) return null;
  return {
    siteID: raw.siteID ?? raw.SiteID ?? 0,
    addressLine1: raw.addressLine1 ?? raw.AddressLine1 ?? '',
    addressLine2: raw.addressLine2 ?? raw.AddressLine2 ?? '',
    landmark: raw.landmark ?? raw.Landmark ?? '',
    city: raw.city ?? raw.City ?? '',
    district: raw.district ?? raw.District ?? '',
  };
}

function normalizeUser(raw) {
  const firstName = raw.first_Name ?? raw.First_Name ?? raw.firstName ?? raw.FirstName ?? '';
  const lastName = raw.last_Name ?? raw.Last_Name ?? raw.lastName ?? raw.LastName ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return {
    userID: raw.userID ?? raw.UserID ?? raw.id ?? 0,
    userName: raw.userName ?? raw.UserName ?? raw.fullName ?? raw.FullName ??
      raw.name ?? raw.Name ??
      (fullName || null) ??
      raw.email ?? raw.Email ?? '',
    email: raw.email ?? raw.Email ?? '',
    role: raw.role ?? raw.Role ?? raw.roleName ?? raw.RoleName ?? '',
    roleId: Number(raw.roleId ?? raw.RoleId ?? raw.roleID ?? 0),
  };
}

function normalizeJobRequest(raw) {
  return {
    jobRequestID: raw.jobRequestID ?? raw.JobRequestID ?? 0,
    customerID: raw.customerID ?? raw.CustomerID ?? 0,
    customerContractID: raw.customerContractID ?? raw.CustomerContractID ?? 0,
    jobType: raw.jobType ?? raw.JobType ?? '',
    jobDescription: raw.jobDescription ?? raw.JobDescription ?? '',
    supervisorID: raw.iD ?? raw.ID ?? raw.id ?? raw.supervisorID ?? raw.SupervisorID ?? 0,
    supervisorAcceptDttm: raw.supervisorAcceptDttm ?? raw.SupervisorAcceptDttm ?? '',
    rateperSQFT: Number(raw.rateperSQFT ?? raw.RateperSQFT ?? 0),
    totalAreaSQFT: Number(raw.totalAreaSQFT ?? raw.TotalAreaSQFT ?? 0),
    targetCompletionDate: (raw.targetCompletionDate ?? raw.TargetCompletionDate ?? '').split('T')[0],
    actualCompletionDate: (raw.actualCompletionDate ?? raw.ActualCompletionDate ?? '').split('T')[0],
    jobStatus: raw.jobStatus ?? raw.JobStatus ?? 'Pending',
  };
}

function normalizeJobTask(raw) {
  return {
    jobTaskID: raw.jobTaskID ?? raw.JobTaskID ?? 0,
    jobRequestID: raw.jobRequestID ?? raw.JobRequestID ?? 0,
    hoardingID: raw.hoardingID ?? raw.HoardingID ?? 0,
    actualCompletionDate: (raw.actualCompletionDate ?? raw.ActualCompletionDate ?? '').split('T')[0],
    status: raw.status ?? raw.Status ?? 'Pending',
    submitDTTM: raw.submitDttm ?? raw.submitDTTM ?? raw.SubmitDTTM ?? '',
    lastUpdateDttm: raw.lastUpdateDttm ?? raw.LastUpdateDttm ?? '',
    lastUpdatedBy: raw.lastUpdatedBy ?? raw.LastUpdatedBy ?? 0,
  };
}

function getSiteAddress(h) {
  if (!h) return '';

  // 1. Try nested site object (if populated)
  const s = h.site ? normalizeSite(h.site) : null;
  if (s) {
    const addr = [s.addressLine1, s.addressLine2].filter(Boolean).join(', ');
    const city = [s.city, s.district].filter(Boolean).join(', ');
    const full = [addr, city].filter(Boolean).join(' — ');
    if (full) return full;
  }

  // 2. Try flat fields directly on the hoarding (common in .NET APIs)
  const flatAddr = [
    h.addressLine1 ?? h.AddressLine1 ?? '',
    h.addressLine2 ?? h.AddressLine2 ?? '',
  ].filter(Boolean).join(', ');

  const flatCity = [
    h.city ?? h.City ?? h.siteCity ?? h.SiteCity ?? '',
    h.district ?? h.District ?? h.siteDistrict ?? h.SiteDistrict ?? '',
  ].filter(Boolean).join(', ');

  const flatFull = [flatAddr, flatCity].filter(Boolean).join(' — ');
  if (flatFull) return flatFull;

  // 3. Try landmark
  const landmark = h.landmark ?? h.Landmark ?? h.siteLandmark ?? h.SiteLandmark ?? '';
  if (landmark) return landmark;

  // 4. Last resort
  return h.hoardingCode ?? h.HoardingCode ?? '';
}

const newTaskRow = (h = null) => ({
  _id: uid(),
  jobTaskID: 0,
  hoardingID: h?.hoardingID || 0,
  hoardingCode: h?.hoardingCode || '',
  siteAddress: getSiteAddress(h),
  size: h ? `${h.width} X ${h.height}` : '',
  sqFt: h ? (h.width * h.height) : 0,
  actualCompletionDate: '',
  status: 'Open',
  submitDttm: '',
  saved: false,
});

/* ═══════════════════════════════════════════
   STATUS BADGES
═══════════════════════════════════════════ */
const JOB_STATUS_COLORS = {
  'Open': { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  'Accepted': { bg: '#fefce8', color: '#ca8a04', border: '#fde68a' },
  'In Progress': { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Submitted': { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'Completed': { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
};
const TASK_STATUS_COLORS = {
  'Open': { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  'In Progress': { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Submitted': { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
};

function JobStatusBadge({ status }) {
  const s = JOB_STATUS_COLORS[status] || JOB_STATUS_COLORS['Open'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {status || 'Open'}
    </span>
  );
}

function TaskStatusSelect({ value, onChange, disabled }) {
  const s = TASK_STATUS_COLORS[value] || TASK_STATUS_COLORS['Open'];

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700,
        padding: '4px 10px', borderRadius: 7,
        border: `1.5px solid ${s.border}`,
        background: s.bg, color: s.color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        appearance: 'none', WebkitAppearance: 'none',
        paddingRight: disabled ? 10 : 22,
        backgroundImage: disabled ? 'none' : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239090a8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 6px center',
        opacity: disabled ? 0.8 : 1,
      }}
    >
      {TASK_STATUS_LIST.map(st => <option key={st} value={st}>{st}</option>)}
    </select>
  );
}

/* ═══════════════════════════════════════════
   JOB PDF HTML BUILDER
═══════════════════════════════════════════ */
const JOB_COMPANY = {
  name: 'JALARAM AD',
  line1: '103/4/5/6, Drashti Arcade, Opp. Anand ITI',
  line2: 'Nr. Grid Crossing, Anand - 388001, GUJ. INDIA',
  phone: 'Parag Patel # 9428151123',
};

function buildJobPDFHTML({ company, job, customerName, supervisorName, tasks, attachments, hoardings, hoardingMerges = [] }) {
  const comp = company || JOB_COMPANY;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtD = (d) => {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Build a map: taskID -> { near, far }
  const taskPhotoMap = {};
  attachments.forEach(att => {
    const taskID = Number(att.jobTaskID ?? att.JobTaskID ?? 0);
    if (!taskID) return;
    const url = buildImageUrl(att);
    if (!url) return;
    const type = (att.photoFileType ?? att.PhotoFileType ?? '').toLowerCase();
    if (!taskPhotoMap[taskID]) taskPhotoMap[taskID] = { near: null, far: null };
    if (type.includes('near')) {
      taskPhotoMap[taskID].near = taskPhotoMap[taskID].near || url;
    } else if (type.includes('far')) {
      taskPhotoMap[taskID].far = taskPhotoMap[taskID].far || url;
    }
  });

  // Group tasks by merge group if merged, else unmerged
  const mergeMap = new Map();
  (hoardingMerges || []).forEach(m => {
    const hid = Number(m.hoardingID ?? m.HoardingID ?? 0);
    if (hid) {
      mergeMap.set(hid, m);
    }
  });

  const mergedGroups = {}; // key: `${siteID}_${flag}` -> array of tasks
  const unmergedTasks = [];

  tasks.forEach(task => {
    const hid = Number(task.hoardingID);
    const mergeInfo = mergeMap.get(hid);
    if (mergeInfo) {
      const flag = mergeInfo.mergeAlongFlag ?? mergeInfo.MergeAlongFlag ?? 'H';
      const hoarding = hoardings.find(hh => Number(hh.hoardingID ?? hh.HoardingID) === hid);
      const siteID = hoarding ? Number(hoarding.siteID ?? hoarding.SiteID ?? 0) : 0;
      const key = `${siteID}_${flag}`;
      if (!mergedGroups[key]) {
        mergedGroups[key] = [];
      }
      mergedGroups[key].push(task);
    } else {
      unmergedTasks.push(task);
    }
  });

  // Process merged groups
  const mergedItems = Object.entries(mergedGroups).map(([key, groupTasks]) => {
    const [siteIDStr, flag] = key.split('_');
    const isHorizontalMerge = flag === 'H';

    const mergedHoardings = groupTasks.map(t => {
      const h = hoardings.find(hh => Number(hh.hoardingID ?? hh.HoardingID) === Number(t.hoardingID));
      return {
        hoardingCode: t.hoardingCode || h?.hoardingCode || `#${t.hoardingID}`,
        width: Number(h?.width ?? h?.Width ?? 0),
        height: Number(h?.height ?? h?.Height ?? 0),
        siteAddress: t.siteAddress || getSiteAddress(h),
        taskID: Number(t.jobTaskID),
      };
    });

    const sizes = mergedHoardings.map(h => ({ w: h.width, h: h.height }));
    const gaps = Math.max(groupTasks.length - 1, 0);
    const mw = isHorizontalMerge
      ? sizes.reduce((s, sz) => s + sz.w, 0) + gaps
      : Math.max(...sizes.map(s => s.w), 0);
    const mh = isHorizontalMerge
      ? Math.max(...sizes.map(s => s.h), 0)
      : sizes.reduce((s, sz) => s + sz.h, 0) + gaps;
    const combinedSqFt = mw * mh;

    const hoardingCodes = mergedHoardings.map(h => h.hoardingCode).join(' + ');
    const siteAddr = mergedHoardings.find(h => h.siteAddress)?.siteAddress || '';

    // Photos: look across all taskIDs in the merge group
    const allTaskIDs = groupTasks.map(t => Number(t.jobTaskID));
    let near = null;
    let far = null;
    for (const tid of allTaskIDs) {
      if (!near && taskPhotoMap[tid]?.near) near = taskPhotoMap[tid].near;
      if (!far && taskPhotoMap[tid]?.far) far = taskPhotoMap[tid].far;
    }

    return {
      isMerged: true,
      direction: flag,
      hoardingCodes,
      mergedHoardings,
      size: `${mw} × ${mh} ft`,
      sqFt: combinedSqFt,
      siteAddr,
      status: groupTasks[0].status || 'Open',
      photos: { near, far },
      taskIDs: allTaskIDs,
      totalCount: groupTasks.length,
    };
  });

  // Process unmerged tasks
  const unmergedItems = unmergedTasks.map(t => {
    const h = hoardings.find(hh => Number(hh.hoardingID ?? hh.HoardingID) === Number(t.hoardingID));
    const hoardingCode = t.hoardingCode || h?.hoardingCode || `#${t.hoardingID}`;
    const size = h ? `${h.width} × ${h.height} ft` : (t.size || '—');
    const sqFt = h ? (Number(h.width) * Number(h.height)) : (Number(t.sqFt) || 0);
    const siteAddr = t.siteAddress || getSiteAddress(h);
    const taskID = Number(t.jobTaskID);
    const photos = taskPhotoMap[taskID] || { near: null, far: null };
    return {
      isMerged: false,
      hoardingCode,
      size,
      sqFt,
      siteAddr,
      status: t.status,
      photos,
      taskID,
      totalCount: 1,
    };
  });

  const taskItems = [...mergedItems, ...unmergedItems];
  const totalSqFt = taskItems.reduce((s, t) => s + (t.sqFt || 0), 0);

  const css = `
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#000;}

    /* ── A4 page ── */
    .page{
      width:210mm; height:297mm;
      padding:10mm 14mm 9mm;
      page-break-after:always;
      display:flex; flex-direction:column;
      overflow:hidden;
    }
    .page:last-child{page-break-after:avoid;}

    /* ── Page header ── */
    .ph{
      display:flex; justify-content:space-between; align-items:flex-end;
      padding-bottom:5px; border-bottom:2px solid #000;
      margin-bottom:7px; flex-shrink:0;
    }
    .ph-co{font-size:14px;font-weight:900;letter-spacing:1px;}
    .ph-r{font-size:10px;color:#444;text-align:right;line-height:1.4;}

    /* ── COVER ── */
    .cov{justify-content:space-between;}
    .cov-top{
      display:flex;justify-content:space-between;align-items:flex-start;
      padding-bottom:13px;border-bottom:3px solid #000;
    }
    .cov-co{font-size:38px;font-weight:900;letter-spacing:2px;line-height:1.1;}
    .cov-addr{font-size:10.5px;color:#555;margin-top:6px;line-height:1.7;}
    .cov-date{font-size:15px;font-weight:700;white-space:nowrap;}
    .cov-body{flex:1;display:flex;flex-direction:column;justify-content:center;padding:26px 0 14px;}
    .cov-title{font-size:30px;font-weight:700;margin-bottom:8px;}
    .cov-sub{font-size:15px;color:#333;margin-top:4px;}
    .cov-info{
      margin-top:18px;padding:13px 15px;
      background:#f4f4f4;border-left:5px solid #000;
      font-size:13px;line-height:2;color:#111;
    }
    .cov-foot{
      display:flex;justify-content:space-between;align-items:center;
      border-top:1px solid #ccc;padding-top:8px;
      font-size:10.5px;color:#555;font-weight:600;
    }

    /* ── HOARDING PAIR ── */
    .pair-wrap{
      flex:1;min-height:0;
      display:flex;flex-direction:column;
      gap:0;
    }
    .hrd-section{
      flex:0 0 50%;max-height:50%;
      min-height:0;
      display:flex;flex-direction:column;
    }
    .hrd-section + .hrd-section{
      border-top:1.5px dashed #ccc;
      padding-top:5px;
    }
    /* Vision photos side by side */
    .hrd-photos{
      flex:1;min-height:0;overflow:hidden;
      display:flex;gap:4px;margin-bottom:4px;
    }
    .hrd-photo-wrap{
      flex:1;min-width:0;position:relative;overflow:hidden;
      background:#e0e0e0;
    }
    .hrd-photo-wrap img{
      width:100%;height:100%;object-fit:contain;display:block;
    }
    .hrd-vision-label{
      position:absolute;bottom:4px;left:4px;
      background:rgba(0,0,0,0.65);color:#fff;
      font-size:9px;font-weight:bold;
      padding:1px 6px;border-radius:4px;
    }
    .hrd-no-photo{
      flex:1;min-height:0;overflow:hidden;
      background:#f5f5f5;border:1.5px dashed #ccc;
      margin-bottom:4px;
      display:flex;align-items:center;justify-content:center;
      font-size:11px;color:#aaa;gap:6px;
    }
    /* Details box */
    .hrd-box{
      background:#f2f2f2;padding:8px 12px;
      border-left:4px solid #000;flex-shrink:0;
    }
    .hrd-title{font-size:11.5px;font-weight:700;margin-bottom:5px;line-height:1.4;color:#000;}
    .hrd-row{display:flex;flex-wrap:wrap;font-size:11px;}
    .hrd-cell{flex:0 0 50%;padding-right:8px;}
    .hrd-lbl{font-weight:700;}
    .hrd-status{display:inline-block;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:800;
      background:#e8fdf3;color:#16a34a;border:1px solid #bbf7d0;}

    /* Download bar */
    #dl-bar{
      position:fixed;top:0;left:0;right:0;z-index:9999;
      background:#111;color:#fff;
      display:flex;align-items:center;justify-content:space-between;
      padding:10px 20px;font-family:Arial,sans-serif;font-size:13px;gap:12px;
    }
    .dl-btn{
      padding:7px 22px;background:#dc2626;color:#fff;
      border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;
    }
    .dl-btn:hover{background:#b91c1c;}
    @media print{
      #dl-bar{display:none!important;}
      body{padding-top:0!important;}
      .page{width:100%;height:100vh;padding:8mm 12mm 8mm;}
    }
    @page{size:A4 portrait;margin:0;}
  `;

  /* shared page header */
  const ph = `
    <div class="ph">
      <span class="ph-co">${comp.name}</span>
      <span class="ph-r">Job #${job.jobRequestID} &mdash; ${customerName}<br>${today}</span>
    </div>`;

  /* hoarding section */
  const section = (item) => {
    const hasNear = !!item.photos.near;
    const hasFar = !!item.photos.far;
    const hasAnyPhoto = hasNear || hasFar;
    const displayName = item.isMerged ? item.hoardingCodes : item.hoardingCode;

    const photoArea = hasAnyPhoto ? `
      <div class="hrd-photos">
        ${hasNear ? `
          <div class="hrd-photo-wrap">
            <img src="${item.photos.near}" alt="Short Vision - ${displayName}" />
            <span class="hrd-vision-label">📸 Short Vision</span>
          </div>` : `
          <div class="hrd-photo-wrap" style="display:flex;align-items:center;justify-content:center;font-size:11px;color:#aaa;">
            📷 No Short Vision
          </div>`}
        ${hasFar ? `
          <div class="hrd-photo-wrap">
            <img src="${item.photos.far}" alt="Long Vision - ${displayName}" />
            <span class="hrd-vision-label">🔭 Long Vision</span>
          </div>` : `
          <div class="hrd-photo-wrap" style="display:flex;align-items:center;justify-content:center;font-size:11px;color:#aaa;">
            📷 No Long Vision
          </div>`}
      </div>` :
      `<div class="hrd-no-photo">📷&nbsp;No photos uploaded for ${displayName}</div>`;

    const detailsBox = item.isMerged ? `
      <div class="hrd-box" style="border-left: 4px solid #7c3aed; background: #faf8ff;">
        <div class="hrd-title">
          <strong>${item.hoardingCodes}</strong>
          <span style="display:inline-block;padding:1px 8px;border-radius:10px;background:#ede9fe;color:#7c3aed;font-size:10px;font-weight:800;margin-left:6px;border:1px solid #ddd6fe;">
            ${item.direction === 'H' ? '↔ Horizontal Merge' : '↕ Vertical Merge'}
          </span>
          ${item.siteAddr ? `&nbsp;&mdash;&nbsp;${item.siteAddr}` : ''}
          ${item.size ? `&nbsp;&mdash;&nbsp;<strong>${item.size}</strong>` : ''}
        </div>
        <div class="hrd-row">
          <div class="hrd-cell" style="flex:0 0 100%;margin-bottom:3px;">
            <span class="hrd-lbl">Merged Hoardings:</span>&nbsp;
            ${(item.mergedHoardings || []).map(h => `<span style="display:inline-block;background:#fff;padding:1px 6px;border-radius:4px;border:1px solid #e0d8f8;margin-right:4px;font-size:10.5px;">${h.hoardingCode} (${h.width}×${h.height} ft)</span>`).join('')}
          </div>
          <div class="hrd-cell"><span class="hrd-lbl">Combined Area:</span>&nbsp;${item.sqFt ? item.sqFt.toLocaleString('en-IN') + ' sq.ft' : '—'}</div>
          <div class="hrd-cell"><span class="hrd-lbl">Status:</span>&nbsp;<span class="hrd-status">${item.status || 'Open'}</span></div>
        </div>
      </div>` : `
      <div class="hrd-box">
        <div class="hrd-title">${item.hoardingCode}${item.siteAddr ? ` &mdash; ${item.siteAddr}` : ''}${item.size ? ` &mdash; ${item.size}` : ''}</div>
        <div class="hrd-row">
          <div class="hrd-cell"><span class="hrd-lbl">Area:</span>&nbsp;${item.sqFt ? item.sqFt.toLocaleString('en-IN') + ' sq.ft' : '—'}</div>
          <div class="hrd-cell"><span class="hrd-lbl">Status:</span>&nbsp;<span class="hrd-status">${item.status || 'Open'}</span></div>
        </div>
      </div>`;

    return `
      <div class="hrd-section">
        ${photoArea}
        ${detailsBox}
      </div>`;
  };

  /* ── COVER ── */
  const totalHoardingsCount = tasks.length;
  const cover = `
    <div class="page cov">
      <div class="cov-top">
        <div>
          <div class="cov-co">${comp.name}</div>
          <div class="cov-addr">${comp.line1}<br>${comp.line2}</div>
        </div>
        <div class="cov-date">${today}</div>
      </div>
      <div class="cov-body">
        <div class="cov-title">Job #${job.jobRequestID}</div>
        ${customerName ? `<div class="cov-sub">${customerName}</div>` : ''}
        <div class="cov-info">
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <tr>
              <td style="width:180px;font-weight:bold;padding:2px 0;">Job Type</td>
              <td style="padding:2px 0;">: ${job.jobType || '—'}</td>
            </tr>
            <tr>
              <td style="font-weight:bold;padding:2px 0;">Supervisor</td>
              <td style="padding:2px 0;">: ${supervisorName || '—'}</td>
            </tr>
            ${job.actualCompletionDate ? `
            <tr>
              <td style="font-weight:bold;padding:2px 0;">Completed On</td>
              <td style="padding:2px 0;">: ${fmtD(job.actualCompletionDate)}</td>
            </tr>` : ''}
            <tr>
              <td style="font-weight:bold;padding:2px 0;">Total Area</td>
              <td style="padding:2px 0;">: ${totalSqFt.toLocaleString('en-IN')} sq.ft</td>
            </tr>
            <tr>
              <td style="font-weight:bold;padding:2px 0;">Total Hoardings</td>
              <td style="padding:2px 0;">: ${totalHoardingsCount} (${taskItems.length} location${taskItems.length !== 1 ? 's' : ''})</td>
            </tr>
            ${job.jobDescription ? `
            <tr>
              <td style="font-weight:bold;padding:2px 0;vertical-align:top;">Description</td>
              <td style="padding:2px 0;">: ${job.jobDescription}</td>
            </tr>` : ''}
          </table>
        </div>
      </div>
      <div class="cov-foot">
        <span>${comp.phone}</span>
        <span>${taskItems.length} Location${taskItems.length !== 1 ? 's' : ''} (${totalHoardingsCount} Hoarding${totalHoardingsCount !== 1 ? 's' : ''})</span>
      </div>
    </div>`;

  /* ── HOARDING PAGES (2 per page) ── */
  const hrdPages = [];
  for (let i = 0; i < taskItems.length; i += 2) {
    const a = taskItems[i];
    const b = taskItems[i + 1];
    hrdPages.push(`
      <div class="page" style="display:flex;flex-direction:column;">
        ${ph}
        <div class="pair-wrap">
          ${section(a)}
          ${b ? section(b) : ''}
        </div>
      </div>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Job #${job.jobRequestID} &mdash; ${customerName}</title>
  <style>${css}</style>
</head>
<body style="padding-top:44px;">
  <div id="dl-bar">
    <span><strong>${comp.name}</strong> &mdash; Job #${job.jobRequestID} &mdash; ${customerName}</span>
    <button class="dl-btn" onclick="window.print()">&#8681; Download / Print PDF</button>
  </div>
  ${cover}
  ${hrdPages.join('')}
</body>
</html>`;
}


/* ═══════════════════════════════════════════
   PORTAL DROPDOWN
═══════════════════════════════════════════ */
function PortalDropdown({ open, triggerRef, panelRef, children }) {
  const [style, setStyle] = useState({ position: 'fixed', top: 0, left: 0, width: 0, zIndex: 99999 });
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const upd = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const ph = panelRef.current?.offsetHeight || 260;
      const flipUp = (window.innerHeight - r.bottom) < ph + 8 && r.top > ph + 8;
      setStyle({ position: 'fixed', top: flipUp ? r.top - ph - 4 : r.bottom + 4, left: r.left, width: r.width, zIndex: 99999 });
    };
    upd();
    window.addEventListener('scroll', upd, true);
    window.addEventListener('resize', upd);
    return () => { window.removeEventListener('scroll', upd, true); window.removeEventListener('resize', upd); };
  }, [open, triggerRef, panelRef]);
  if (!open) return null;
  return ReactDOM.createPortal(<div ref={panelRef} style={style}>{children}</div>, document.body);
}

function useOutsideClick(wrapRef, panelRef, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!wrapRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);

  }, [open, wrapRef, panelRef, onClose]);
}

/* ═══════════════════════════════════════════
   GENERIC COMBO FIELD
═══════════════════════════════════════════ */
function ComboField({ value, onChange, options, placeholder, icon: Icon, disabled, getLabel, getValue, getSecondary, searchPlaceholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);
  useOutsideClick(wrapRef, panelRef, open, close);

  const selected = options.find(o => String(getValue(o)) === String(value ?? ''));
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return options;
    return options.filter(o =>
      getLabel(o).toLowerCase().includes(q) ||
      (getSecondary?.(o) || '').toLowerCase().includes(q)
    );
  }, [options, query, getLabel, getSecondary]);

  const openDD = () => { if (disabled) return; setOpen(true); setQuery(''); setTimeout(() => inputRef.current?.focus(), 0); };
  const select = (o) => { onChange(o); setOpen(false); setQuery(''); };
  const clear = (e) => { e.stopPropagation(); onChange(null); };

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div ref={triggerRef}
        className={`pg-field-wrap pg-combo-trigger pg-field-wrap--normal${disabled ? ' jb-disabled' : ''}`}
        onClick={openDD} tabIndex={disabled ? -1 : 0}
        onKeyDown={e => {
          if (!open && !disabled && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDD(); }
          else if (open && e.key === 'Escape') close();
        }}
      >
        {Icon && <Icon size={14} color={disabled ? '#d0d0e0' : '#c0c0d8'} style={{ flexShrink: 0 }} />}
        <span className={`pg-combo-display${!selected ? ' pg-combo-display--placeholder' : ''}`}
          style={{ color: disabled ? '#c0c0d8' : undefined }}>
          {selected ? getLabel(selected) : placeholder || 'Select…'}
        </span>
        {selected && !disabled
          ? <X size={13} className="pg-combo-clear" onClick={clear} />
          : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position: 'static' }}>
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input ref={inputRef} className="pg-combo-search__input"
              placeholder={searchPlaceholder || 'Search…'}
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') close(); }} />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
          </div>
          <div className="pg-combo-list">
            {filtered.length === 0
              ? <div className="pg-combo-empty">No options found</div>
              : filtered.map(o => (
                <div key={getValue(o)}
                  className={`pg-combo-option${String(getValue(o)) === String(value ?? '') ? ' pg-combo-option--active' : ''}`}
                  onClick={() => select(o)} tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(o); } }}
                >
                  <div style={{ flex: 1 }}>
                    <span className="pg-combo-option__name">{getLabel(o)}</span>
                    {getSecondary?.(o) && <span className="pg-combo-option__id">{getSecondary(o)}</span>}
                  </div>
                  {String(getValue(o)) === String(value ?? '') && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                </div>
              ))}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HOARDING SELECT MODAL
═══════════════════════════════════════════ */
function HoardingSelectModal({ hoardings, filteredHoardingIds, existingIds, onAdd, onClose, anyIdToLatestId, hoardingMerges }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const isFiltered = filteredHoardingIds !== null;

  // Build a map: hoardingID → mergeAlongFlag ('H' or 'V'), for merged hoardings only
  const mergedFlagMap = useMemo(() => {
    const map = new Map();
    (hoardingMerges || []).forEach(m => {
      const id = Number(m.hoardingID ?? m.HoardingID ?? 0);
      if (id) map.set(id, m.mergeAlongFlag ?? m.MergeAlongFlag ?? 'H');
    });
    return map;
  }, [hoardingMerges]);

  const base = useMemo(() => {
    if (!isFiltered) return hoardings;
    const canonicalIds = new Set();
    filteredHoardingIds.forEach(rawId => {
      canonicalIds.add(rawId);
      const mapped = anyIdToLatestId?.get(rawId);
      if (mapped) canonicalIds.add(mapped);
    });
    anyIdToLatestId?.forEach((latestId, anyId) => {
      if (filteredHoardingIds.has(anyId) || filteredHoardingIds.has(latestId)) {
        canonicalIds.add(latestId);
      }
    });
    return hoardings.filter(h => canonicalIds.has(Number(h.hoardingID)));
  }, [hoardings, filteredHoardingIds, isFiltered, anyIdToLatestId]);

  const display = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return base;
    return base.filter(h =>
      (h.hoardingCode || '').toLowerCase().includes(q) ||
      getSiteAddress(h).toLowerCase().includes(q) ||
      (h.site?.city || '').toLowerCase().includes(q)
    );
  }, [base, search]);

  // Group display: merged hoardings shown together by site & flag, unmerged shown individually
  const { mergeGroups, unmerged } = useMemo(() => {
    const groups = new Map(); // "siteID_flag" -> { siteID, flag, hoardings: [] }
    const ungrouped = [];

    display.forEach(h => {
      const flag = mergedFlagMap.get(Number(h.hoardingID));
      if (flag) {
        const siteID = Number(h.siteID ?? h.SiteID ?? h.site?.siteID ?? 0);
        const key = `${siteID}_${flag}`;
        if (!groups.has(key)) {
          groups.set(key, { siteID, flag, hoardings: [] });
        }
        groups.get(key).hoardings.push(h);
      } else {
        ungrouped.push(h);
      }
    });

    return { mergeGroups: [...groups.values()], unmerged: ungrouped };
  }, [display, mergedFlagMap]);

  // Build a lookup map: hoardingID -> array of other hoardingIDs in the same merge group
  const hoardingIdToGroupIds = useMemo(() => {
    const map = new Map();
    mergeGroups.forEach(g => {
      const ids = g.hoardings.map(h => h.hoardingID);
      ids.forEach(id => {
        map.set(id, ids);
      });
    });
    return map;
  }, [mergeGroups]);

  const selectable = display.filter(h => !existingIds.has(h.hoardingID));
  const allSelected = selectable.length > 0 && selectable.every(h => selected.has(h.hoardingID));
  const someSel = selectable.some(h => selected.has(h.hoardingID));

  const toggle = (id) => setSelected(p => {
    const n = new Set(p);
    const groupIds = hoardingIdToGroupIds.get(id);
    if (groupIds) {
      const turningOn = !n.has(id);
      groupIds.forEach(gid => {
        if (!existingIds.has(gid)) {
          if (turningOn) n.add(gid);
          else n.delete(gid);
        }
      });
    } else {
      n.has(id) ? n.delete(id) : n.add(id);
    }
    return n;
  });

  const toggleAll = () => {
    if (allSelected) setSelected(p => { const n = new Set(p); selectable.forEach(h => n.delete(h.hoardingID)); return n; });
    else setSelected(p => { const n = new Set(p); selectable.forEach(h => n.add(h.hoardingID)); return n; });
  };

  const renderRow = (h, isMerged = false, mergeFlag = null) => {
    const checked = selected.has(h.hoardingID);
    const alreadyIn = existingIds.has(h.hoardingID);
    const addr = getSiteAddress(h);
    const siteCity = [h.site?.city, h.site?.district].filter(Boolean).join(', ');

    return (
      <div key={h.hoardingID}
        onClick={() => !alreadyIn && toggle(h.hoardingID)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: isMerged ? '9px 24px 9px 36px' : '10px 24px',
          borderBottom: '1px solid #f8f8f8',
          cursor: alreadyIn ? 'not-allowed' : 'pointer',
          background: checked ? 'rgba(4,158,223,0.05)' : isMerged ? '#fafafe' : '#fff',
          opacity: alreadyIn ? 0.5 : 1,
        }}
      >
        <div className={`qt-modal-check ${checked ? 'qt-modal-check--on' : ''}`}>
          {checked && <Check size={12} color="#fff" />}
        </div>
        <MapPin size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            {addr || h.hoardingCode}
            {alreadyIn && <span style={{ color: '#9090a8', fontWeight: 600, fontSize: 11 }}> · Already added</span>}
          </div>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8', marginTop: 2 }}>
            Code: {h.hoardingCode} · {h.width}×{h.height} ft · {h.width * h.height} sq.ft
            {siteCity ? ` · ${siteCity}` : ''}
          </div>
        </div>
      </div>
    );
  };

  return ReactDOM.createPortal(
    // <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="pg-overlay">
      <div className="pg-modal" style={{ maxWidth: 640 }}>
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><Building2 size={20} color="#049edf" /></div>
            <div>
              <h5 className="pg-modal__title">Select Hoardings</h5>
              <p className="pg-modal__subtitle">
                {isFiltered
                  ? `${base.length} hoarding${base.length !== 1 ? 's' : ''} from selected customer/contract`
                  : `All ${base.length} hoardings (no customer/contract filter)`}
              </p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>

        {!isFiltered && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(245,158,11,0.07)', borderBottom: '1px solid rgba(245,158,11,0.18)', fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#b45309', fontWeight: 600 }}>
            <AlertCircle size={13} />
            Select a customer or contract in Step 1 to filter relevant hoardings.
          </div>
        )}

        <div style={{ padding: '12px 24px', borderBottom: '1px solid #f0f0f8' }}>
          <div className="pg-search-box">
            <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input placeholder="Search by site address or hoarding code…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
          </div>
        </div>

        {selectable.length > 0 && (
          <div className="qt-select-all-row" onClick={toggleAll}>
            <div className={`qt-modal-check ${allSelected ? 'qt-modal-check--all' : someSel ? 'qt-modal-check--on' : ''}`}>
              {allSelected ? <Check size={12} color="#fff" /> : someSel ? <div style={{ width: 8, height: 2, background: '#049edf', borderRadius: 2 }} /> : null}
            </div>
            <span>{allSelected ? 'Deselect All' : `Select All (${selectable.length})`}</span>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 400 }}>
          {display.length === 0 ? (
            <div className="pg-empty__inner" style={{ padding: '32px 20px' }}>
              <Building2 size={32} color="#d0d0e8" />
              <span className="pg-empty__label">{isFiltered ? 'No hoardings in this contract' : 'No hoardings found'}</span>
            </div>
          ) : (
            <>
              {/* ── Merged groups ── */}
              {mergeGroups.map(({ siteID, flag, hoardings: groupHoardings }) => {
                // Compute combined size
                const sizes = groupHoardings.map(h => ({ w: Number(h.width) || 0, h: Number(h.height) || 0 }));
                const gaps = Math.max(groupHoardings.length - 1, 0);
                const isHorizontalMerge = flag === 'H';
                const mw = isHorizontalMerge ? sizes.reduce((s, sz) => s + sz.w, 0) + gaps : Math.max(...sizes.map(s => s.w), 0);
                const mh = isHorizontalMerge ? Math.max(...sizes.map(s => s.h), 0) : sizes.reduce((s, sz) => s + sz.h, 0) + gaps;
                const mergedSqFt = mw * mh;

                return (
                  <div key={`${siteID}_${flag}`} style={{ margin: '8px 12px', border: '1.5px solid rgba(124,58,237,0.25)', borderRadius: 10, overflow: 'hidden' }}>
                    {/* Merge group header */}
                    <div style={{
                      padding: '8px 14px', background: 'rgba(124,58,237,0.06)',
                      borderBottom: '1px solid rgba(124,58,237,0.15)',
                      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    }}>
                      <span style={{ fontSize: 13 }}>{isHorizontalMerge ? '↔' : '↕'}</span>
                      <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#7c3aed' }}>
                        {isHorizontalMerge ? 'Horizontal' : 'Vertical'} Merge · {groupHoardings.length} hoardings
                      </span>
                      <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, color: '#5a5a78' }}>
                        {mw} × {mh} ft
                      </span>
                      <span style={{
                        padding: '1px 8px', borderRadius: 10,
                        background: 'rgba(124,58,237,0.10)', color: '#7c3aed',
                        border: '1px solid rgba(124,58,237,0.20)',
                        fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800,
                      }}>
                        {mergedSqFt.toLocaleString('en-IN')} sq.ft
                      </span>
                    </div>
                    {/* Individual merged hoardings */}
                    {groupHoardings.map(h => renderRow(h, true, flag))}
                  </div>
                );
              })}

              {/* ── Unmerged hoardings ── */}
              {unmerged.map(h => renderRow(h, false))}
            </>
          )}
        </div>

        <div className="pg-modal__foot">
          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, color: '#9090a8', fontWeight: 600 }}>{selected.size} selected</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="pg-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="pg-btn-save" onClick={() => onAdd(selected)} disabled={selected.size === 0}>
              <Plus size={14} /> Add {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ValidationAlertModal({ isOpen, onClose, contractStartDate, targetDate, reason }) {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999999,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '460px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px rgba(4, 158, 223, 0.05)',
        fontFamily: 'Nunito, sans-serif',
        animation: 'fadeInScale 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        border: '1px solid rgba(226, 232, 240, 0.8)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #ef4444, #f97316)',
          padding: '30px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          textAlign: 'center',
          color: '#fff',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
            animation: 'pulse 2s infinite',
          }}>
            ⚠️
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px' }}>
              Date Validation Failed
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
              Job cannot be created with selected date
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{
            background: '#fff8f6',
            border: '1.5px dashed rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Contract Start Date:</span>
              <span style={{ fontSize: '13.5px', color: '#1e293b', fontWeight: 800 }}>
                {fmtDate(contractStartDate)}
              </span>
            </div>

            <div style={{ height: '1px', background: 'rgba(239, 68, 68, 0.1)' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Selected Target Date:</span>
              <span style={{ fontSize: '13.5px', color: '#ef4444', fontWeight: 800 }}>
                {fmtDate(targetDate)}
              </span>
            </div>

            <div style={{ height: '1px', background: 'rgba(239, 68, 68, 0.1)' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Maximum Allowed Date:</span>
              <span style={{
                fontSize: '13.5px',
                color: '#16a34a',
                fontWeight: 800,
                background: 'rgba(22, 163, 74, 0.08)',
                padding: '3px 8px',
                borderRadius: '6px',
              }}>
                {(() => {
                  if (!contractStartDate) return '—';
                  const d = new Date(contractStartDate + 'T00:00:00');
                  d.setDate(d.getDate() + 7);
                  const year = d.getFullYear();
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return fmtDate(`${year}-${month}-${day}`);
                })()}
              </span>
            </div>
          </div>

          <div style={{
            fontSize: '13.5px',
            color: '#475569',
            lineHeight: '1.6',
            fontWeight: 600,
            textAlign: 'center',
          }}>
            {reason === 'greater_than_7_days' ? (
              <span>
                Target Completion Date can be any date before the contract start date. However, if it is on or after the start date, it must be within <strong style={{ color: '#ef4444' }}>7 days</strong> of the start date.
              </span>
            ) : (
              <span>
                The Target Completion Date is invalid. Please adjust the target completion date.
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 24px 24px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px 0',
              border: 'none',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 10px 20px -5px rgba(239, 68, 68, 0.4)',
              transition: 'all 0.2s',
              outline: 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 12px 22px -5px rgba(239, 68, 68, 0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(239, 68, 68, 0.4)';
            }}
          >
            Adjust Date
          </button>
        </div>
      </div>

      {/* Styles for animation */}
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`qt-toast qt-toast--${type}`}>
      {type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {msg}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SORT ICON
═══════════════════════════════════════════ */
function SortIcon({ col, sortKey, sortDir }) {
  const active = sortKey === col;
  return (
    <span className="pg-sort-icon">
      <ChevronUp size={10} color={active && sortDir === 'asc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__up" />
      <ChevronDown size={10} color={active && sortDir === 'desc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__down" />
    </span>
  );
}

/* ═══════════════════════════════════════════
   IMAGE UPLOAD ZONE
   (used for short/long vision uploads)
═══════════════════════════════════════════ */
function ImageUploadZone({ label, sublabel, IconComp, values = [], onChange, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const addFiles = (files) => {
    const images = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!images.length) return;
    onChange(images.slice(0, 1));
  };
  const removeOne = (idx) => onChange(values.filter((_, i) => i !== idx));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</span>
        <span style={{ color: '#ef4444', fontSize: 12, lineHeight: 1 }}>*</span>
        <span style={{ fontSize: 10, color: '#9090a8', fontFamily: 'Nunito,sans-serif', fontWeight: 600 }}>{sublabel}</span>
        {values.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#1a9e6e', background: '#e8faf3', padding: '2px 8px', borderRadius: 20, border: '1px solid #7dd5b0' }}>
            {values.length} photo
          </span>
        )}
      </div>
      {values.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
          {values.map((file, idx) => {
            const url = URL.createObjectURL(file);
            return (
              <div key={idx} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 10, overflow: 'hidden', border: '2px solid #d0f0e0' }}>
                <img src={url} alt={`${label} ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onLoad={() => URL.revokeObjectURL(url)} />
                <button type="button" onClick={() => removeOne(idx)} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(239,68,68,0.9)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                  <X size={10} />
                </button>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(26,26,46,0.55)', color: '#fff', fontFamily: 'Nunito,sans-serif', fontSize: 9, fontWeight: 700, padding: '2px 5px', textAlign: 'center' }}>#{idx + 1}</div>
              </div>
            );
          })}
        </div>
      )}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          borderRadius: 12, cursor: 'pointer', padding: '16px 10px',
          border: error ? '2px dashed #ef4444' : dragging ? '2px dashed #049edf' : '2px dashed #d0d0e8',
          background: error ? 'rgba(239,68,68,0.03)' : dragging ? 'rgba(4,158,223,0.05)' : '#f8f8fd',
          transition: 'all 0.15s',
        }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: error ? 'rgba(239,68,68,0.1)' : 'rgba(4,158,223,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconComp size={20} color={error ? '#ef4444' : '#049edf'} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: error ? '#ef4444' : '#1a1a2e', marginBottom: 2 }}>
            {values.length > 0 ? 'Change photo' : `Upload ${label}`}
          </div>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 600, color: '#9090a8' }}>Click or drag & drop</div>
        </div>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
            <AlertTriangle size={11} /> {error}
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   SUBMIT TASK PHOTO MODAL (Compulsory upload)
═══════════════════════════════════════════ */
function SubmitTaskPhotoModal({ task, jobRequestID, onClose, onSubmitted, showToast }) {
  const [closeImg, setCloseImg] = useState([]);
  const [farImg, setFarImg] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [geoStatus, setGeoStatus] = useState('idle');
  const [geoData, setGeoData] = useState(null);

  const validate = () => {
    const errs = {};
    if (closeImg.length === 0) errs.closeImg = 'Short Vision photo is required';
    if (farImg.length === 0) errs.farImg = 'Long Vision photo is required';
    return errs;
  };

  const handleSave = async () => {
    setErrors({});
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setGeoStatus('locating');
    try {
      const geo = await getGeoPayload();
      if (!geo || geo.latitude === 0 || geo.longitude === 0) {
        setGeoStatus('failed');
        setErrors({
          location: 'Your device GPS or browser location access is turned off or denied. To submit this task, you MUST enable location/GPS. Please turn it on and click "Submit Task" again.'
        });
        showToast('Location access is required to submit this task!', 'error');
        setSubmitting(false);
        return;
      }

      setGeoStatus('ready');
      setGeoData(geo);
      const userId = parseInt(localStorage.getItem('userId') || '0', 10);
      const nowISOStr = nowISO();

      const uploadWithGeo = async (file, photoFileType) => {
        const fd = new FormData();
        fd.append('JobTaskAttachID', '0');
        fd.append('JobTaskID', String(task.jobTaskID || 0));
        fd.append('JobRequestID', String(jobRequestID || 0));
        fd.append('HoardingID', String(task.hoardingID || 0));
        fd.append('PhotoFileType', photoFileType);
        fd.append('Files', file);
        fd.append('PhotoFilePath', '');
        fd.append('PhotoFilename', file.name);
        fd.append('LastUpdateDttm', nowISOStr);
        fd.append('LastUpdatedBy', String(userId));
        await apiService.uploadJobTaskAttachment(fd);

        const geoFd = new FormData();
        geoFd.append('Image', file);
        geoFd.append('TaskId', String(task.jobTaskID || 0));
        geoFd.append('Latitude', String(geo.latitude));
        geoFd.append('Longitude', String(geo.longitude));
        geoFd.append('Accuracy', String(geo.accuracy));
        geoFd.append('Address', geo.address);
        geoFd.append('CapturedAt', nowISOStr);
        await apiService.uploadGeoLocation(geoFd).catch(e => console.error("Geo upload failed:", e));
      };

      for (const file of closeImg) await uploadWithGeo(file, 'Near Photo');
      for (const file of farImg) await uploadWithGeo(file, 'Far Photo');

      const todayISO = nowISOStr.split('T')[0];
      const taskIDs = task.tasks ? task.tasks.map(t => Number(t.jobTaskID)) : [Number(task.jobTaskID)];

      for (const tid of taskIDs) {
        const individualTask = task.tasks ? task.tasks.find(t => Number(t.jobTaskID) === tid) : task;
        await apiService.updateJobTask({
          jobTaskID: tid,
          jobRequestID: jobRequestID,
          hoardingID: individualTask?.hoardingID || task.hoardingID,
          status: 'Submitted',
          actualCompletionDate: todayISO,
          submitDTTM: nowISOStr,
          lastUpdateDttm: nowISOStr,
          lastUpdatedBy: userId,
        });
      }

      showToast('Task submitted successfully!', 'success');
      onSubmitted?.();
      onClose();
    } catch (err) {
      showToast(err?.message || 'Submission failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1060, background: 'rgba(15,23,42,0.58)', backdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 720, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.22)' }}>

        {/* Head */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px', borderBottom: '1.5px solid #f0f0f8' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(4,158,223,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={20} color="#049edf" />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontFamily: 'Nunito,sans-serif', fontSize: 16, fontWeight: 900, color: '#1a1a2e', margin: 0 }}>Site Photos</h4>
            <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#9090a8', margin: '2px 0 0 0', fontWeight: 600 }}>Both photos are mandatory to submit</p>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontFamily: 'Nunito,sans-serif', fontWeight: 700, background: closeImg.length > 0 ? '#e8faf3' : '#f0f0f8', color: closeImg.length > 0 ? '#1a9e6e' : '#9090a8', border: `1px solid ${closeImg.length > 0 ? '#7dd5b0' : '#e0e0f0'}` }}>
              {closeImg.length > 0 ? <Check size={10} /> : <span style={{ fontSize: 12 }}>📷</span>} Short
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontFamily: 'Nunito,sans-serif', fontWeight: 700, background: farImg.length > 0 ? '#e8faf3' : '#f0f0f8', color: farImg.length > 0 ? '#1a9e6e' : '#9090a8', border: `1px solid ${farImg.length > 0 ? '#7dd5b0' : '#e0e0f0'}` }}>
              {farImg.length > 0 ? <Check size={10} /> : <span style={{ fontSize: 12 }}>📷</span>} Long
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {errors.location && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 12,
              background: '#fef2f2', border: '1.5px solid #fecaca',
              fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, color: '#dc2626',
              boxShadow: '0 2px 8px rgba(220,38,38,0.08)',
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 900, marginBottom: 3 }}>GPS / Location Access Required</div>
                <div style={{ lineHeight: 1.4 }}>{errors.location}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <ImageUploadZone
                label="Short Vision"
                sublabel="(Close-up)"
                IconComp={ZoomIn}
                values={closeImg}
                onChange={v => { setCloseImg(v.slice(0, 1)); setErrors(e => ({ ...e, closeImg: '' })); }}
                error={errors.closeImg}
              />
            </div>
            <div>
              <ImageUploadZone
                label="Long Vision"
                sublabel="(Wide shot)"
                IconComp={ZoomOut}
                values={farImg}
                onChange={v => { setFarImg(v.slice(0, 1)); setErrors(e => ({ ...e, farImg: '' })); }}
                error={errors.farImg}
              />
            </div>
          </div>

          {/* Geo status */}
          {geoStatus !== 'idle' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10,
              background: geoStatus === 'locating' ? 'rgba(4,158,223,0.06)' : geoStatus === 'ready' ? 'rgba(26,158,110,0.07)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${geoStatus === 'locating' ? '#b3d9f5' : geoStatus === 'ready' ? '#7dd5b0' : '#fecaca'}`,
              fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700,
              color: geoStatus === 'locating' ? '#049edf' : geoStatus === 'ready' ? '#1a9e6e' : '#dc2626',
            }}>
              {geoStatus === 'locating' && <><Loader2 size={13} className="pg-spin" /> Capturing location…</>}
              {geoStatus === 'ready' && <><MapPin size={13} /> Location captured · {geoData?.address}</>}
              {geoStatus === 'failed' && <><AlertTriangle size={13} /> GPS/Location is disabled or denied. Please enable location to submit this task.</>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1.5px solid #f0f0f8', background: '#fcfcfd' }}>
          <button className="pg-btn-cancel" onClick={onClose} disabled={submitting}>Close</button>
          <button
            className="pg-btn-save"
            onClick={handleSave}
            disabled={submitting}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {submitting ? (
              <><Loader2 size={13} className="pg-spin" /> Submitting…</>
            ) : (
              <><SendHorizonal size={13} /> Submit Task</>
            )}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   TASK PHOTO MODAL
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   TASK PHOTO MODAL  (replace entire function)
═══════════════════════════════════════════ */
function TaskPhotoModal({ task, jobRequestID, attachments, onClose, showToast, onUploaded, isCompleted, onStatusChange }) {
  const [lightbox, setLightbox] = useState(null);
  const [imgErrors, setImgErrors] = useState({}); // track broken images by index
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [geoAddress, setGeoAddress] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [photoIdsToDelete, setPhotoIdsToDelete] = useState([]);
  const [savingDeletes, setSavingDeletes] = useState(false);

  // Fetch geo address for this task
  useEffect(() => {
    const taskId = task?.jobTaskID;
    if (!taskId) return;
    setGeoLoading(true);
    setGeoAddress('');
    apiService.getGeoLocationByTaskId(taskId)
      .then(res => {
        const rows = Array.isArray(res) ? res
          : Array.isArray(res?.data) ? res.data
            : Array.isArray(res?.$values) ? res.$values : [];
        setGeoAddress(rows[0]?.address ?? rows[0]?.Address ?? '');
      })
      .catch(() => setGeoAddress(''))
      .finally(() => setGeoLoading(false));
  }, [task?.jobTaskID]);

  const taskIDs = new Set(
    [task.jobTaskID, ...(task.mergedTaskIDs ?? [])].map(Number)
  );
  const myAttachments = attachments.filter(
    a => taskIDs.has(Number(a.jobTaskID ?? a.JobTaskID))
  );

  const visibleAttachments = myAttachments.filter(a => {
    const attachID = a.jobTaskAttachID ?? a.JobTaskAttachID ?? a.id ?? a.ID;
    return !photoIdsToDelete.includes(attachID);
  });

  const handleSaveChanges = async () => {
    if (photoIdsToDelete.length === 0) {
      onClose();
      return;
    }
    setSavingDeletes(true);
    try {
      for (const attachID of photoIdsToDelete) {
        await apiService.deleteJobTaskAttachment(attachID);
      }
      showToast('Selected photo(s) deleted successfully.', 'success');

      if (task.status === 'Submitted') {
        const userId = parseInt(localStorage.getItem('userId') || '0', 10);
        const nowISOStr = nowISO();
        const tIDs = task.tasks ? task.tasks.map(t => Number(t.jobTaskID)) : [Number(task.jobTaskID)];

        for (const tid of tIDs) {
          const individualTask = task.tasks ? task.tasks.find(t => Number(t.jobTaskID) === tid) : task;
          await apiService.updateJobTask({
            jobTaskID: tid,
            jobRequestID: jobRequestID,
            hoardingID: individualTask?.hoardingID || task.hoardingID,
            status: 'Open',
            actualCompletionDate: individualTask?.actualCompletionDate || '',
            submitDTTM: null,
            lastUpdateDttm: nowISOStr,
            lastUpdatedBy: userId,
          });
        }
        onStatusChange?.(tIDs, 'Open');
        showToast('Task status reverted to Open because photo(s) were deleted.', 'info');
      }
      onUploaded?.();
      onClose();
    } catch (err) {
      showToast(err?.message || 'Failed to delete photos.', 'error');
    } finally {
      setSavingDeletes(false);
    }
  };

  return ReactDOM.createPortal(
    <>
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(0,0,0,0.90)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 18, right: 22,
              background: 'rgba(255,255,255,0.18)', border: 'none',
              borderRadius: 8, cursor: 'pointer', padding: '6px 14px',
              color: '#fff', fontSize: 20, lineHeight: 1, fontWeight: 700,
            }}
          >✕</button>
          <img
            src={lightbox}
            alt="Full size preview"
            style={{
              maxWidth: '92vw', maxHeight: '88vh',
              borderRadius: 14, boxShadow: '0 12px 60px rgba(0,0,0,0.7)',
              objectFit: 'contain',
            }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="pg-modal" style={{ maxWidth: 680 }}>

          {/* Head */}
          <div className="pg-modal__head">
            <div className="pg-modal__head-left">
              <div className="pg-modal__icon-wrap" style={{
                background: 'rgba(4,158,223,0.10)', fontSize: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>📷</div>
              <div>
                <h5 className="pg-modal__title">Task Photos</h5>
                <p className="pg-modal__subtitle">
                  <strong>{task.hoardingCode || `Hoarding ${task.hoardingID}`}</strong>
                  {task.siteAddress ? ` · ${task.siteAddress}` : ''}
                  <span style={{
                    marginLeft: 8, padding: '1px 8px', borderRadius: 10,
                    background: 'rgba(4,158,223,0.10)', color: '#049edf',
                    fontSize: 11, fontWeight: 800,
                  }}>
                    {visibleAttachments.length} photo{visibleAttachments.length !== 1 ? 's' : ''}
                  </span>
                </p>
              </div>
            </div>
            <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
          </div>

          {/* Photo grid */}
          <div style={{ padding: '16px 24px', overflowY: 'auto', maxHeight: 340, minHeight: 80 }}>
            {visibleAttachments.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '32px 0',
                fontFamily: 'Nunito,sans-serif', fontSize: 13.5,
                color: '#b0b0c8', fontStyle: 'italic',
              }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🖼️</div>
                No photos uploaded yet for this task
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
                gap: 12,
              }}>
                {visibleAttachments.map((att, i) => {
                  const url = buildImageUrl(att);
                  const name = att.photoFilename ?? att.PhotoFilename ?? `Photo ${i + 1}`;
                  const attachID = att.jobTaskAttachID ?? att.JobTaskAttachID ?? att.id ?? att.ID;
                  const hasError = imgErrors[i];
                  const fileType = att.photoFileType ?? att.PhotoFileType ?? '';

                  return (
                    <div
                      key={i}
                      style={{
                        borderRadius: 11, overflow: 'hidden',
                        border: '1.5px solid #e8e8f4', background: '#f8f8fd',
                        position: 'relative',
                        boxShadow: '0 1px 5px rgba(0,0,0,0.07)',
                        transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.04)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(4,158,223,0.20)';
                        e.currentTarget.style.borderColor = '#049edf';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 1px 5px rgba(0,0,0,0.07)';
                        e.currentTarget.style.borderColor = '#e8e8f4';
                      }}
                    >
                      {/* Image area — click to open lightbox */}
                      <div
                        onClick={() => url && !hasError && setLightbox(url)}
                        style={{
                          position: 'relative', height: 118,
                          background: '#f0f0f8', overflow: 'hidden',
                          cursor: url && !hasError ? 'zoom-in' : 'default',
                        }}
                      >
                        {url && !hasError ? (
                          <img
                            src={url}
                            alt={name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={() => setImgErrors(p => ({ ...p, [i]: true }))}
                          />
                        ) : (
                          /* Fallback — shown when no URL or image fails to load */
                          <div style={{
                            width: '100%', height: '100%',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 36, color: '#c0c0d8',
                          }}>
                            🖼️
                          </div>
                        )}

                        {/* Photo File Type Badge */}
                        {fileType && (
                          <span style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            background: fileType.toLowerCase().includes('near') ? 'rgba(4, 158, 223, 0.9)' : 'rgba(108, 99, 255, 0.9)',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontFamily: 'Nunito,sans-serif',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}>
                            {fileType}
                          </span>
                        )}
                      </div>

                      {/* Filename row + delete button */}
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        padding: '5px 8px',
                        borderTop: '1px solid #f0f0f8',
                        gap: 6,
                      }}>
                        <span style={{
                          flex: 1,
                          fontFamily: 'Nunito,sans-serif', fontSize: 10.5,
                          color: '#7a8499', fontWeight: 600,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {name.length > 20 ? name.slice(0, 18) + '…' : name}
                        </span>

                        {/* ── Delete button ── */}
                        {!isCompleted && (
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteConfirmTarget({ att, index: i }); }}
                            disabled={savingDeletes}
                            title="Delete photo"
                            style={{
                              flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 22, height: 22, borderRadius: 6,
                              border: '1px solid rgba(220,38,38,0.25)',
                              background: 'rgba(220,38,38,0.07)',
                              color: '#dc2626', cursor: savingDeletes ? 'wait' : 'pointer',
                              padding: 0, opacity: savingDeletes ? 0.5 : 1,
                            }}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Geo Address Strip */}
          {(geoLoading || geoAddress) && (
            <div style={{
              margin: '0 24px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '9px 13px', borderRadius: 10,
              background: 'rgba(4,158,223,0.05)',
              border: '1.5px solid rgba(4,158,223,0.18)',
            }}>
              <MapPin size={13} color="#049edf" style={{ flexShrink: 0, marginTop: 2 }} />
              {geoLoading ? (
                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Loader2 size={12} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> Fetching location…
                </span>
              ) : (
                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#3a3a5c', lineHeight: 1.5 }}>
                  {geoAddress}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pg-modal__foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600 }}>
              {visibleAttachments.length > 0
                ? 'Click any photo to enlarge' + (!isCompleted ? ' · Trash icon to delete' : '')
                : 'No photos yet'}
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="pg-btn-cancel" onClick={onClose} disabled={savingDeletes}>Cancel</button>
              {!isCompleted && photoIdsToDelete.length > 0 && (
                <button
                  className="pg-btn-save"
                  onClick={handleSaveChanges}
                  disabled={savingDeletes}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {savingDeletes ? (
                    <><Loader2 size={13} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                  ) : (
                    <>Save Changes</>
                  )}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {deleteConfirmTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999999,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            maxWidth: 380,
            width: '90%',
            background: '#fff',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            fontFamily: 'Nunito,sans-serif',
            animation: 'fadeIn 0.2s',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg,#dc2626,#f87171)',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                border: '2px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                color: '#fff',
              }}>
                🗑️
              </div>
              <div style={{ fontWeight: 900, fontSize: 17, color: '#fff' }}>
                Delete Photo
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 14, color: '#4b5563', lineHeight: 1.5, fontWeight: 600 }}>
                Are you sure you want to delete this photo?
              </p>
              <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#9ca3af', lineHeight: 1.5, fontWeight: 500 }}>
                This action cannot be undone.
              </p>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 12, padding: '0 20px 20px 20px' }}>
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 10,
                  background: '#fff',
                  color: '#64748b',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const attachID = deleteConfirmTarget.att.jobTaskAttachID ?? deleteConfirmTarget.att.JobTaskAttachID ?? deleteConfirmTarget.att.id ?? deleteConfirmTarget.att.ID;
                  if (attachID) {
                    setPhotoIdsToDelete(prev => [...prev, attachID]);
                  }
                  setDeleteConfirmTarget(null);
                }}
                style={{
                  flex: 1.5,
                  padding: '10px 0',
                  border: 'none',
                  borderRadius: 10,
                  background: '#dc2626',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(220,38,38,0.3)',
                  outline: 'none',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   JOB PHOTOS VIEW MODAL
═══════════════════════════════════════════ */
// ✅ MODIFIED: Added hoardingMerges prop to group merged hoardings together in dropdown and photos view
function JobPhotosViewModal({ job, tasks, hoardings, attachments, hoardingMerges = [], onClose }) {
  // ✅ MODIFIED: Group tasks by site and merge flag so merged hoardings show up as a single dropdown item
  const options = useMemo(() => {
    const mergeMap = new Map();
    (hoardingMerges || []).forEach(m => {
      const hid = Number(m.hoardingID ?? m.HoardingID ?? 0);
      if (hid) {
        mergeMap.set(hid, m);
      }
    });

    const mergedGroups = {}; // key: siteID_flag -> array of tasks
    const unmergedRows = [];

    tasks.forEach(task => {
      const hid = Number(task.hoardingID);
      const mergeInfo = mergeMap.get(hid);
      if (mergeInfo) {
        const flag = mergeInfo.mergeAlongFlag ?? mergeInfo.MergeAlongFlag ?? 'H';
        const hoarding = hoardings.find(hh => Number(hh.hoardingID ?? hh.HoardingID) === hid);
        const siteID = hoarding ? Number(hoarding.siteID ?? hoarding.SiteID ?? 0) : 0;
        const key = `${siteID}_${flag}`;
        if (!mergedGroups[key]) {
          mergedGroups[key] = [];
        }
        mergedGroups[key].push(task);
      } else {
        unmergedRows.push(task);
      }
    });

    const result = [];

    // Process merged groups
    Object.entries(mergedGroups).forEach(([key, groupTasks]) => {
      if (groupTasks.length === 0) return;
      const [siteIDStr, flag] = key.split('_');
      result.push({
        _type: 'merged',
        _id: `__merged__${siteIDStr}_${flag}`,
        tasks: groupTasks,
        mergeFlag: flag,
        jobTaskID: String(groupTasks[0].jobTaskID),
      });
    });

    // Individual rows for unmerged
    unmergedRows.forEach(task => result.push({ _type: 'single', jobTaskID: String(task.jobTaskID), ...task }));

    return result;
  }, [tasks, hoardingMerges, hoardings]);

  const [selectedTaskID, setSelectedTaskID] = useState('');

  // Set default selection
  useEffect(() => {
    if (options.length > 0 && !selectedTaskID) {
      setSelectedTaskID(String(options[0].jobTaskID));
    }
  }, [options, selectedTaskID]);

  const [lightbox, setLightbox] = useState(null);
  const [geoAddress, setGeoAddress] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);

  const selectedOption = options.find(o => String(o.jobTaskID) === selectedTaskID);

  // Fetch geo address whenever the selected task changes
  useEffect(() => {
    if (!selectedTaskID) { setGeoAddress(''); return; }
    setGeoLoading(true);
    setGeoAddress('');
    apiService.getGeoLocationByTaskId(selectedTaskID)
      .then(res => {
        const rows = Array.isArray(res) ? res
          : Array.isArray(res?.data) ? res.data
            : Array.isArray(res?.$values) ? res.$values : [];
        const addr = rows[0]?.address ?? rows[0]?.Address ?? '';
        setGeoAddress(addr);
      })
      .catch(() => setGeoAddress(''))
      .finally(() => setGeoLoading(false));
  }, [selectedTaskID]);

  // ✅ MODIFIED: Retrieve photos for all task IDs in a group if it is a merged hoarding, otherwise retrieve for the single task
  const taskAttachments = useMemo(() => {
    if (!selectedOption) return [];
    if (selectedOption._type === 'merged') {
      const taskIDs = selectedOption.tasks.map(t => Number(t.jobTaskID));
      return attachments.filter(
        a => taskIDs.includes(Number(a.jobTaskID ?? a.JobTaskID))
      );
    } else {
      return attachments.filter(
        a => Number(a.jobTaskID ?? a.JobTaskID) === Number(selectedTaskID)
      );
    }
  }, [selectedOption, selectedTaskID, attachments]);

  const customerName = job.customerName || `Customer ID ${job.customerID}`;

  return ReactDOM.createPortal(
    <>
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(0,0,0,0.90)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 18, right: 22,
              background: 'rgba(255,255,255,0.18)', border: 'none',
              borderRadius: 8, cursor: 'pointer', padding: '6px 14px',
              color: '#fff', fontSize: 20, lineHeight: 1, fontWeight: 700,
            }}
          >✕</button>
          <img
            src={lightbox}
            alt="Full size preview"
            style={{
              maxWidth: '92vw', maxHeight: '88vh',
              borderRadius: 14, boxShadow: '0 12px 60px rgba(0,0,0,0.7)',
              objectFit: 'contain',
            }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="pg-modal" style={{ maxWidth: 600 }}>
          {/* Head */}
          <div className="pg-modal__head">
            <div className="pg-modal__head-left">
              <div className="pg-modal__icon-wrap" style={{
                background: 'rgba(4,158,223,0.10)', fontSize: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>🖼️</div>
              <div>
                <h5 className="pg-modal__title">View Job Photos</h5>
                <p className="pg-modal__subtitle">
                  Job #{job.jobRequestID} · {customerName}
                </p>
              </div>
            </div>
            <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
          </div>

          {/* Selector / Dropdown */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f8', background: '#fcfcfd' }}>
            <label style={{
              display: 'block', marginBottom: 8,
              fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#5a5a78',
            }}>
              Select Hoarding from this Job:
            </label>
            <ComboField
              value={selectedTaskID}
              onChange={t => setSelectedTaskID(t ? String(t.jobTaskID) : '')}
              options={options}
              placeholder="Select hoarding…"
              icon={Building2}
              getLabel={t => {
                if (t._type === 'merged') {
                  const flagStr = t.mergeFlag === 'H' ? 'Horizontal Merge' : 'Vertical Merge';
                  const codes = t.tasks.map(tsk => {
                    const h = hoardings.find(hh => Number(hh.hoardingID) === Number(tsk.hoardingID));
                    return tsk.hoardingCode || h?.hoardingCode || `#${tsk.hoardingID}`;
                  }).join(' + ');
                  return `${flagStr} [${codes}]`;
                } else {
                  const h = hoardings.find(hh => Number(hh.hoardingID) === Number(t.hoardingID));
                  return t.hoardingCode || h?.hoardingCode || `#${t.hoardingID}`;
                }
              }}
              getValue={t => t.jobTaskID}
              getSecondary={t => {
                if (t._type === 'merged') {
                  const firstTask = t.tasks[0];
                  const h = hoardings.find(hh => Number(hh.hoardingID) === Number(firstTask.hoardingID));
                  return getSiteAddress(h);
                } else {
                  const h = hoardings.find(hh => Number(hh.hoardingID) === Number(t.hoardingID));
                  return getSiteAddress(h);
                }
              }}
              searchPlaceholder="Search hoardings…"
            />
          </div>

          {/* Photo Display Grid */}
          <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: 360, minHeight: 120 }}>
            {taskAttachments.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px 0',
                fontFamily: 'Nunito,sans-serif', fontSize: 13.5,
                color: '#b0b0c8',
              }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🖼️</div>
                No photos uploaded for this hoarding
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 14,
              }}>
                {taskAttachments.map((att, i) => {
                  const url = buildImageUrl(att);
                  const name = att.photoFilename ?? att.PhotoFilename ?? `Photo ${i + 1}`;
                  const fileType = att.photoFileType ?? att.PhotoFileType ?? '';
                  return (
                    <div
                      key={i}
                      onClick={() => url && setLightbox(url)}
                      style={{
                        borderRadius: 12, overflow: 'hidden',
                        border: '1.5px solid #e8e8f4', background: '#fff',
                        position: 'relative', height: 120, cursor: 'zoom-in',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.03)';
                        e.currentTarget.style.boxShadow = '0 6px 18px rgba(4,158,223,0.15)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
                      }}
                    >
                      {url ? (
                        <img
                          src={url}
                          alt={name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 32, color: '#c0c0d8',
                        }}>
                          🖼️
                        </div>
                      )}

                      {/* Photo File Type Badge */}
                      {fileType && (
                        <span style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          background: fileType.toLowerCase().includes('near') ? 'rgba(4, 158, 223, 0.9)' : 'rgba(108, 99, 255, 0.9)',
                          color: '#fff',
                          fontSize: '9px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontFamily: 'Nunito,sans-serif',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          {fileType}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Geo Address Strip */}
          {(geoLoading || geoAddress) && (
            <div style={{
              margin: '0 24px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(4,158,223,0.05)',
              border: '1.5px solid rgba(4,158,223,0.18)',
            }}>
              <MapPin size={14} color="#049edf" style={{ flexShrink: 0, marginTop: 1 }} />
              {geoLoading ? (
                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Loader2 size={12} className="pg-spin" color="#049edf" /> Fetching location…
                </span>
              ) : (
                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#3a3a5c', lineHeight: 1.5 }}>
                  {geoAddress}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pg-modal__foot">
            <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600 }}>
              {taskAttachments.length > 0 ? 'Click any photo to enlarge' : ''}
            </span>
            <button className="pg-btn-cancel" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
function CompleteJobModal({ job, tasks, allHoardings, hoardingMerges, attachments, onConfirm, onCancel, completing }) {
  const [completionDate, setCompletionDate] = useState(
    job.actualCompletionDate || todayISO()
  );
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Find tasks without photos
  const tasksWithNoPhotos = useMemo(() => {
    // Group task IDs by siteID and mergeFlag
    const mergeGroupToTaskIDs = {};
    tasks.forEach(t => {
      const m = (hoardingMerges || []).find(x => Number(x.hoardingID ?? x.HoardingID ?? 0) === Number(t.hoardingID));
      const flag = m ? (m.mergeAlongFlag ?? m.MergeAlongFlag ?? 'H') : null;
      if (flag) {
        const h = allHoardings.find(hh => Number(hh.hoardingID ?? hh.HoardingID ?? 0) === Number(t.hoardingID));
        const siteID = h ? Number(h.siteID ?? h.SiteID ?? 0) : 0;
        const key = `${siteID}_${flag}`;
        if (!mergeGroupToTaskIDs[key]) mergeGroupToTaskIDs[key] = [];
        mergeGroupToTaskIDs[key].push(Number(t.jobTaskID));
      }
    });

    return tasks.filter(t => {
      const m = (hoardingMerges || []).find(x => Number(x.hoardingID ?? x.HoardingID ?? 0) === Number(t.hoardingID));
      const flag = m ? (m.mergeAlongFlag ?? m.MergeAlongFlag ?? 'H') : null;

      let targetTaskIDs = [Number(t.jobTaskID)];
      if (flag) {
        const h = allHoardings.find(hh => Number(hh.hoardingID ?? hh.HoardingID ?? 0) === Number(t.hoardingID));
        const siteID = h ? Number(h.siteID ?? h.SiteID ?? 0) : 0;
        const key = `${siteID}_${flag}`;
        if (mergeGroupToTaskIDs[key]) {
          targetTaskIDs = mergeGroupToTaskIDs[key];
        }
      }

      const hasPhoto = (attachments || []).some(a => {
        const aTaskID = Number(a.jobTaskID ?? a.JobTaskID ?? 0);
        return targetTaskIDs.includes(aTaskID);
      });

      return !hasPhoto;
    });
  }, [tasks, attachments, hoardingMerges, allHoardings]);

  const hasMissingPhotos = tasksWithNoPhotos.length > 0;

  /* Build preview: for each task find the hoarding's current (latest) status */
  const hoardingPreviews = tasks.map(t => {
    const h = allHoardings.find(hh => Number(hh.hoardingID) === Number(t.hoardingID));
    return {
      hoardingCode: t.hoardingCode || h?.hoardingCode || `#${t.hoardingID}`,
      currentStatus: h?.status || 'Active',   // ← last effdt row's status
      siteAddress: t.siteAddress || '',
    };
  });

  // ✅ MODIFIED: Group hoarding previews so merged hoardings show together in the Complete confirmation list
  const groupedPreviews = useMemo(() => {
    const mergeMap = new Map();
    (hoardingMerges || []).forEach(m => {
      const hid = Number(m.hoardingID ?? m.HoardingID ?? 0);
      if (hid) {
        mergeMap.set(hid, m);
      }
    });

    const mergedGroups = {}; // key: siteID_flag -> array of tasks
    const unmergedRows = [];

    tasks.forEach(task => {
      const hid = Number(task.hoardingID);
      const mergeInfo = mergeMap.get(hid);
      if (mergeInfo) {
        const flag = mergeInfo.mergeAlongFlag ?? mergeInfo.MergeAlongFlag ?? 'H';
        const hoarding = allHoardings.find(hh => Number(hh.hoardingID ?? hh.HoardingID) === hid);
        const siteID = hoarding ? Number(hoarding.siteID ?? hoarding.SiteID ?? 0) : 0;
        const key = `${siteID}_${flag}`;
        if (!mergedGroups[key]) {
          mergedGroups[key] = [];
        }
        mergedGroups[key].push(task);
      } else {
        unmergedRows.push(task);
      }
    });

    const result = [];

    // Process merged groups
    Object.entries(mergedGroups).forEach(([key, groupTasks]) => {
      if (groupTasks.length === 0) return;
      const [siteIDStr, flag] = key.split('_');
      const firstH = allHoardings.find(hh => Number(hh.hoardingID) === Number(groupTasks[0].hoardingID));
      const flagStr = flag === 'H' ? 'Horizontal Merge' : 'Vertical Merge';
      const codes = groupTasks.map(t => {
        const h = allHoardings.find(hh => Number(hh.hoardingID) === Number(t.hoardingID));
        return t.hoardingCode || h?.hoardingCode || `#${t.hoardingID}`;
      }).join(' + ');

      result.push({
        _type: 'merged',
        hoardingCode: `${flagStr} [${codes}]`,
        currentStatus: firstH?.status || 'Active',
      });
    });

    // Individual rows for unmerged
    unmergedRows.forEach(task => {
      const h = allHoardings.find(hh => Number(hh.hoardingID) === Number(task.hoardingID));
      result.push({
        _type: 'single',
        hoardingCode: task.hoardingCode || h?.hoardingCode || `#${task.hoardingID}`,
        currentStatus: h?.status || 'Active',
      });
    });

    return result;
  }, [tasks, hoardingMerges, allHoardings]);

  const handleFinalSubmit = () => {
    if (hasMissingPhotos) {
      setError('Upload the images first then make mark as complete the job');
    } else {
      setError('');
      setShowConfirm(true);
    }
  };

  return ReactDOM.createPortal(
    // <div className="pg-overlay" onClick={e => e.target === e.currentTarget && !completing && onCancel()}>
    <div className="pg-overlay">
      <div className="pg-modal" style={{ maxWidth: 480, position: 'relative', overflowY: 'auto', maxHeight: '90vh' }}>

        {/* Confirmation Screen */}
        {showConfirm && (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Nunito,sans-serif',
            animation: 'fadeIn 0.2s',
            borderRadius: '20px',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg,#16a34a,#15803d)',
              padding: '24px 26px 18px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(255,255,255,0.20)', border: '2px solid rgba(255,255,255,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}>❓</div>
              <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 18, color: '#fff' }}>
                Are you sure?
              </div>
              <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, color: 'rgba(255,255,255,0.82)', fontWeight: 600 }}>
                Verification Successful
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '30px 24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <p style={{ margin: 0, fontSize: 14.5, color: '#4b5563', lineHeight: 1.6, fontWeight: 700, textAlign: 'center' }}>
                All task photos have been successfully verified for Job #{job.jobRequestID}.
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: 13, color: '#7878a0', lineHeight: 1.5, fontWeight: 600, textAlign: 'center' }}>
                Do you want to finalize and mark this job as Completed?
              </p>
            </div>

            {/* Footer */}
            <div style={{ padding: '20px 24px', borderTop: '1px solid #f0f0f8' }}>
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button
                  className="pg-btn-cancel"
                  onClick={() => setShowConfirm(false)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  No, Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    onConfirm(completionDate);
                  }}
                  style={{
                    flex: 1.6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '11px 0', borderRadius: 11, border: 'none',
                    background: 'linear-gradient(135deg,#16a34a,#15803d)',
                    color: '#fff',
                    fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(22,163,74,0.35)',
                  }}
                >
                  Yes, Complete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#16a34a,#15803d)',
          padding: '24px 26px 18px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(255,255,255,0.20)', border: '2px solid rgba(255,255,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
          }}>✅</div>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 18, color: '#fff' }}>
            Mark Job Complete
          </div>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, color: 'rgba(255,255,255,0.82)', fontWeight: 600 }}>
            Job #{job.jobRequestID} · {tasks.length} hoarding{tasks.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{ padding: '20px 24px 22px' }}>

          {/* Completion date */}
          <div style={{ marginBottom: 18 }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
              fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#5a5a78',
            }}>
              <Calendar size={13} color="#16a34a" /> Completion Date <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid rgba(22,163,74,0.30)',
              background: 'rgba(22,163,74,0.03)',
            }}>
              <Calendar size={14} color="#16a34a" style={{ flexShrink: 0 }} />
              <input
                type="date"
                value={completionDate}
                onChange={e => setCompletionDate(e.target.value)}
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 700, color: '#1a1a2e',
                }}
              />
            </div>
          </div>

          {/* Hoarding effdt preview */}
          {hoardingPreviews.length > 0 && (
            <div style={{
              background: '#f0fdf4', border: '1.5px solid #bbf7d0',
              borderRadius: 11, padding: '12px 14px', marginBottom: 20,
            }}>
              <div style={{
                fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 900,
                color: '#15803d', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Building2 size={13} color="#16a34a" />
                {hoardingPreviews.length} New Effdt Row{hoardingPreviews.length !== 1 ? 's' : ''} Will Be Added
              </div>

              {/* ✅ MODIFIED: Render groupedPreviews list instead of hoardingPreviews individually */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                {groupedPreviews.map((h, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 8,
                    background: '#fff', border: '1px solid #dcfce7',
                    fontFamily: 'Nunito,sans-serif', fontSize: 11.5,
                  }}>
                    {/* Hoarding code */}
                    <span style={{ fontWeight: 800, color: '#15803d' }}>
                      {h.hoardingCode}
                    </span>
                    {/* Arrow */}
                    <span style={{ color: '#9090a8', fontWeight: 700, fontSize: 11, marginLeft: '6px' }}>effdt =</span>
                    {/* Date */}
                    <span style={{ fontWeight: 700, color: '#1a1a2e', marginLeft: '4px' }}>
                      {completionDate ? fmtDate(completionDate) : '—'}
                    </span>
                    {/* Status (from last effdt row) */}
                    <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800,
                        background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                      }}>
                        {h.currentStatus}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 9, fontFamily: 'Nunito,sans-serif', fontSize: 11,
                color: '#15803d', fontWeight: 600,
              }}>
                💡 Status copied from each hoarding's last effective date row
              </div>
            </div>
          )}

          {error && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center',
              padding: '10px 14px', background: '#fef2f2',
              border: '1.5px solid #fecaca', borderRadius: 10,
              marginBottom: 16, color: '#dc2626',
              fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="pg-btn-cancel"
              onClick={onCancel}
              disabled={completing}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Cancel
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={completing || !completionDate}
              style={{
                flex: 1.6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px 0', borderRadius: 11, border: 'none',
                background: (completing || !completionDate) ? '#e8e8f4' : 'linear-gradient(135deg,#16a34a,#15803d)',
                color: (completing || !completionDate) ? '#b0b0c8' : '#fff',
                fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 800,
                cursor: (completing || !completionDate) ? 'not-allowed' : 'pointer',
                boxShadow: (completing || !completionDate) ? 'none' : '0 4px 16px rgba(22,163,74,0.35)',
              }}
            >
              {completing
                ? <><Loader2 size={14} className="pg-spin" /> Completing…</>
                : <>✅ Mark as Completed</>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
const getJobDraft = () => {
  try {
    const draft = sessionStorage.getItem('job_form_draft');
    return draft ? JSON.parse(draft) : null;
  } catch (e) {
    console.error("Failed to parse job draft", e);
    return null;
  }
};

/* ═══════════════════════════════════════════
   MAIN JOB PAGE
═══════════════════════════════════════════ */
export default function JobPage() {

  const jobDraft = useMemo(() => getJobDraft(), []);

  /* ── API data ── */
  const [customers, setCustomers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [hoardings, setHoardings] = useState([]);
  const [availableHoardings, setAvailableHoardings] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [jobRequests, setJobRequests] = useState([]);
  const [allJobTasks, setAllJobTasks] = useState([]);
  const [allAttachments, setAllAttachments] = useState([]);
  const [photoModalTask, setPhotoModalTask] = useState(null); // task row for photo modal
  const [submitTaskTarget, setSubmitTaskTarget] = useState(null); // task row for compulsory upload to submit
  const [photosViewTarget, setPhotosViewTarget] = useState(null); // job request to view photos for
  const [completeTarget, setCompleteTarget] = useState(null); // { job, tasks }
  const [completing, setCompleting] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);


  /* ── UI ── */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [toast, setToast] = useState(null);
  // Original code:
  // const [isCreating, setIsCreating] = useState(false);
  const [isCreating, setIsCreating] = useState(() => jobDraft?.isCreating ?? false);
  // Original code:
  // const [step, setStep] = useState(1);
  const [step, setStep] = useState(() => jobDraft?.step ?? 1);
  const [step1Error, setStep1Error] = useState('');
  const [step2Error, setStep2Error] = useState('');
  // Original code:
  // const [editingJobID, setEditingJobID] = useState(null);
  const [editingJobID, setEditingJobID] = useState(() => jobDraft?.editingJobID ?? null);
  const [showHoardModal, setShowHoardModal] = useState(false);


  /* ── Form ── */
  // Original code:
  // const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(() => jobDraft?.selectedCustomer ?? null);
  // Original code:
  // const [selectedContract, setSelectedContract] = useState(null);
  const [selectedContract, setSelectedContract] = useState(() => jobDraft?.selectedContract ?? null);
  const [pendingContract, setPendingContract] = useState(null);
  // Original code:
  // const [jobType, setJobType] = useState('');
  const [jobType, setJobType] = useState(() => jobDraft?.jobType ?? '');
  // Original code:
  // const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState(() => jobDraft?.selectedSupervisor ?? null);
  // Original code:
  // const [jobDescription, setJobDescription] = useState('');
  const [jobDescription, setJobDescription] = useState(() => jobDraft?.jobDescription ?? '');
  // Original code:
  // const [ratePerSQFT, setRatePerSQFT] = useState('');
  const [ratePerSQFT, setRatePerSQFT] = useState(() => jobDraft?.ratePerSQFT ?? '');
  // Original code:
  // const [targetDate, setTargetDate] = useState('');
  const [targetDate, setTargetDate] = useState(() => jobDraft?.targetDate ?? '');
  // Original code:
  // const [supervisorAcceptDttm, setSupervisorAcceptDttm] = useState('');
  const [supervisorAcceptDttm, setSupervisorAcceptDttm] = useState(() => jobDraft?.supervisorAcceptDttm ?? '');
  // Original code:
  // const [actualCompletionDate, setActualCompletionDate] = useState('');
  const [actualCompletionDate, setActualCompletionDate] = useState(() => jobDraft?.actualCompletionDate ?? '');
  // Original code:
  // const [jobStatus, setJobStatus] = useState('Open');
  const [jobStatus, setJobStatus] = useState(() => jobDraft?.jobStatus ?? 'Open');
  const [contractHoardingMaps, setContractHoardingMaps] = useState([]);
  const [hoardingMerges, setHoardingMerges] = useState([]);
  const [contractStartDate, setContractStartDate] = useState(null);
  const [validationAlert, setValidationAlert] = useState(null);

  /* ── Inline tasks ── */
  // Original code:
  // const [tasks, setTasks] = useState([]);
  const [tasks, setTasks] = useState(() => jobDraft?.tasks ?? []);

  useEffect(() => {
    if (isCreating) {
      const draftData = {
        isCreating,
        step,
        selectedCustomer,
        selectedContract,
        jobType,
        selectedSupervisor,
        jobDescription,
        ratePerSQFT,
        targetDate,
        supervisorAcceptDttm,
        actualCompletionDate,
        jobStatus,
        tasks,
        editingJobID,
      };
      sessionStorage.setItem('job_form_draft', JSON.stringify(draftData));
    }
  }, [
    isCreating,
    step,
    selectedCustomer,
    selectedContract,
    jobType,
    selectedSupervisor,
    jobDescription,
    ratePerSQFT,
    targetDate,
    supervisorAcceptDttm,
    actualCompletionDate,
    jobStatus,
    tasks,
    editingJobID,
  ]);
  const [contractBanners, setContractBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  /* ── History table ── */
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('jobRequestID');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [anyIdToLatestId, setAnyIdToLatestId] = useState(new Map());
  const formRef = useRef(null);
  const tableRef = useRef(null);
  const [tableReady, setTableReady] = useState(false);

  useEffect(() => { if (!loading) setTableReady(true); }, [loading]);
  useResizableColumns(tableRef, tableReady, [80, 180, 110, 150, 130, 120, 120, 100, 120, 130]);

  const taskTableRef = useRef(null);
  const [taskTableReady, setTaskTableReady] = useState(false);

  useEffect(() => {
    if (step === 2 && tasks.length > 0) {
      setTaskTableReady(false);
      const t = setTimeout(() => setTaskTableReady(true), 120);
      return () => clearTimeout(t);
    }
  }, [step, tasks.length]);

  useResizableColumns(taskTableRef, taskTableReady, [40, 240, 90, 90, 70, 148, 140, 170, 80, 60]);
  // Group tasks: merged ones collapse into a single display row
  const displayTaskRows = useMemo(() => {
    const mergeMap = new Map();
    hoardingMerges.forEach(m => {
      const hid = Number(m.hoardingID ?? m.HoardingID ?? 0);
      if (hid) {
        mergeMap.set(hid, m);
      }
    });

    const mergedGroups = {}; // key: siteID_flag -> array of tasks
    const unmergedRows = [];

    tasks.forEach(task => {
      const hid = Number(task.hoardingID);
      const mergeInfo = mergeMap.get(hid);
      if (mergeInfo) {
        const flag = mergeInfo.mergeAlongFlag ?? mergeInfo.MergeAlongFlag ?? 'H';
        const hoarding = hoardings.find(hh => Number(hh.hoardingID ?? hh.HoardingID) === hid);
        const siteID = hoarding ? Number(hoarding.siteID ?? hoarding.SiteID ?? 0) : 0;
        const key = `${siteID}_${flag}`;
        if (!mergedGroups[key]) {
          mergedGroups[key] = [];
        }
        mergedGroups[key].push(task);
      } else {
        unmergedRows.push(task);
      }
    });

    const result = [];

    // Process merged groups
    Object.entries(mergedGroups).forEach(([key, groupTasks]) => {
      if (groupTasks.length === 0) return;

      const [siteIDStr, flag] = key.split('_');
      const siteID = Number(siteIDStr);

      const sizes = groupTasks.map(t => {
        const h = hoardings.find(hh => Number(hh.hoardingID ?? hh.HoardingID) === Number(t.hoardingID));
        return { w: Number(h?.width ?? h?.Width ?? 0), h: Number(h?.height ?? h?.Height ?? 0) };
      });

      const gaps = Math.max(groupTasks.length - 1, 0);
      const isHorizontalMerge = flag === 'H';
      const mw = isHorizontalMerge
        ? sizes.reduce((s, sz) => s + sz.w, 0) + gaps
        : Math.max(...sizes.map(s => s.w), 0);
      const mh = isHorizontalMerge
        ? Math.max(...sizes.map(s => s.h), 0)
        : sizes.reduce((s, sz) => s + sz.h, 0) + gaps;

      result.push({
        _type: 'merged',
        _id: `__merged__${siteID}_${flag}`,
        tasks: groupTasks,
        mergeFlag: flag,
        mergedWidth: mw,
        mergedHeight: mh,
        mergedSqFt: mw * mh,
        // Use first task's fields for status/date editing (or aggregate)
        status: groupTasks[0].status,
        actualCompletionDate: groupTasks[0].actualCompletionDate,
        submitDttm: groupTasks[0].submitDttm,
        saved: groupTasks.every(t => t.saved),
        jobTaskID: groupTasks[0].jobTaskID,
      });
    });

    // Individual rows for unmerged
    unmergedRows.forEach(task => result.push({ _type: 'single', ...task }));

    return result;
  }, [tasks, hoardingMerges, hoardings]);
  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
  const mergedTaskHoardingIds = useMemo(() => {
    return new Set(hoardingMerges.map(m => Number(m.hoardingID ?? m.HoardingID ?? 0)).filter(Boolean));
  }, [hoardingMerges]);
  /* ── Computed ── */
  const totalAreaSQFT = useMemo(() => {
    let total = 0;
    displayTaskRows.forEach(row => {
      if (row._type === 'merged') total += row.mergedSqFt;
      else total += Number(row.sqFt || 0);
    });
    return total;
  }, [displayTaskRows]);

  const derivedJobStatus = useMemo(() => {
    if (jobStatus === 'Completed') return 'Completed';
    if (tasks.length > 0) {
      const submittedCnt = tasks.filter(t => t.status === 'Submitted').length;
      if (submittedCnt === tasks.length) return 'Submitted';
      if (submittedCnt > 0) return 'In Progress';
      if (['In Progress', 'Accepted', 'Submitted'].includes(jobStatus)) return 'Accepted';
    }
    return jobStatus;
  }, [tasks, jobStatus]);

  const customerContracts = useMemo(() => {
    if (!selectedCustomer) return [];
    return contracts.filter(c => c.customerID === selectedCustomer.customerID);
  }, [contracts, selectedCustomer]);

  const filteredHoardingIds = useMemo(() => {
    if (!selectedContract && !selectedCustomer) return null;

    // Collect contract IDs in scope
    const scopeContractIDs = new Set();
    if (selectedContract) {
      scopeContractIDs.add(Number(selectedContract.customerContractID));
    } else {
      contracts
        .filter(c => c.customerID === selectedCustomer.customerID)
        .forEach(c => scopeContractIDs.add(Number(c.customerContractID)));
    }

    // Helper: translate any raw hoardingID → latest deduplicated ID
    const toLatest = (rawId) => {
      const n = Number(rawId);
      return anyIdToLatestId.get(n) ?? n; // fallback to itself if not found
    };

    // Direct hoardings from CustomerContractHoarding map
    const result = new Set();
    contractHoardingMaps.forEach(m => {
      const contractID = Number(m.customerContractID ?? m.CustomerContractID ?? 0);
      if (scopeContractIDs.has(contractID)) {
        const latestId = toLatest(m.hoardingID ?? m.HoardingID);
        if (latestId) result.add(latestId);
      }
    });

    // Merged hoardings from HoardingMerge
    // Each merge row: hoardingID = a merged hoarding, customerContractID = the contract it belongs to
    hoardingMerges.forEach(m => {
      const contractID = Number(
        m.customerContractID ?? m.CustomerContractID ??
        m.contractID ?? m.ContractID ?? 0
      );
      if (scopeContractIDs.has(contractID)) {
        const latestId = toLatest(m.hoardingID ?? m.HoardingID);
        if (latestId) result.add(latestId);
      }
    });


    return result.size > 0 ? result : null;

  }, [selectedContract, selectedCustomer, contracts, contractHoardingMaps, hoardingMerges, anyIdToLatestId]);
  const handleComplete = async (completionDate) => {
    if (!completeTarget) return;
    const { job, tasks: jobTasks } = completeTarget;
    setCompleting(true);
    try {

      /* STEP 1: Update job → Completed + actualCompletionDate */
      await apiService.updateJobRequest({
        customerID: job.customerID,
        customerContractID: job.customerContractID,
        jobType: job.jobType,
        jobDescription: job.jobDescription || '',
        iD: String(job.supervisorID ?? ''),
        noofHoardings: String(jobTasks.length),
        supervisorAcceptDttm: job.supervisorAcceptDttm || new Date().toISOString(),
        rateperSQFT: Number(job.rateperSQFT || 0),
        totalAreaSQFT: Number(job.totalAreaSQFT || 0),
        targetCompletionDate: job.targetCompletionDate,
        actualCompletionDate: completionDate,
        jobStatus: 'Completed',
        jobRequestID: job.jobRequestID,
      });

      /* STEP 2: For each task's hoarding, insert a new effdt row */
      const results = await Promise.allSettled(
        jobTasks.map(async (task) => {
          const rawHid = Number(task.hoardingID ?? 0);
          if (!rawHid) return;

          // ← KEY FIX: resolve any old effdt ID → latest deduplicated ID
          const hid = anyIdToLatestId.get(rawHid) ?? rawHid;

          const h = hoardings.find(hh => Number(hh.hoardingID ?? hh.HoardingID) === hid);
          if (!h) {
            console.warn('[Complete] hoarding not found, rawHid:', rawHid, '→ resolvedHid:', hid);
            return;
          }

          // Normalize fields — same pattern as DissolveContractPage (known working)
          const hoardingCode = h.hoardingCode ?? h.HoardingCode ?? '';
          const material = h.material ?? h.Material ?? '';
          const hoardingType = h.hoardingType ?? h.HoardingType ?? 0;
          const monthlyRent = Number(h.monthlyRent ?? h.MonthlyRent ?? 0);
          const width = Number(h.width ?? h.Width ?? 0);
          const height = Number(h.height ?? h.Height ?? 0);
          const siteID = Number(h.siteID ?? h.SiteID ?? 0);
          const status = h.status ?? h.Status ?? 'Active';

          if (!hoardingCode) {
            console.warn('[Complete] missing hoardingCode for hid:', hid, h);
            return;
          }

          const payload = {
            effdt: completionDate,        // "YYYY-MM-DD"
            material,
            hoardingType: Number(hoardingType),  // must be a number
            status,                              // from last effdt row
            monthlyRent,
            width,
            height,
            siteID,
          };

          console.log('[Complete] addHoardingEffdt →', hoardingCode, payload);
          return apiService.addHoardingEffdt(hoardingCode, payload);
        })
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== undefined).length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      results
        .filter(r => r.status === 'rejected')
        .forEach(r => console.error('[Complete] effdt failed:', r.reason?.response?.data || r.reason?.message));

      /* STEP 3: Update local state */
      setJobRequests(prev =>
        prev.map(j =>
          j.jobRequestID === job.jobRequestID
            ? { ...j, jobStatus: 'Completed', actualCompletionDate: completionDate }
            : j
        )
      );

      showToast(
        `Job #${job.jobRequestID} marked as Completed! ` +
        `${successCount} hoarding row${successCount !== 1 ? 's' : ''} inserted.` +
        (failCount > 0 ? ` ⚠ ${failCount} failed — check console.` : ''),
        failCount > 0 ? 'error' : 'success'
      );
      setCompleteTarget(null);

      if (editingJobID === job.jobRequestID) {
        setActualCompletionDate(completionDate);
        setJobStatus('Completed');
      }

    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to complete job.', 'error');
    } finally {
      setCompleting(false);
    }
  };
  const existingTaskHoardingIds = useMemo(() =>
    new Set(tasks.map(t => t.hoardingID).filter(Boolean)), [tasks]);
  useEffect(() => {
    if (!selectedContract) {
      setContractBanners([]);
      return;
    }
    setBannersLoading(true);
    apiService.getCustContractAttachments(selectedContract.customerContractID)
      .then(data => setContractBanners(normalizeList(data)))
      .catch(() => setContractBanners([]))
      .finally(() => setBannersLoading(false));
  }, [selectedContract]);

  useEffect(() => {
    if (!selectedContract) {
      setContractStartDate(null);
      return;
    }
    apiService.getCustomerContractById(selectedContract.customerContractID)
      .then(res => {
        const rawData = res?.data ?? res;
        const startD = rawData?.startDate ?? rawData?.StartDate ?? null;
        setContractStartDate(startD ? startD.split('T')[0] : null);
      })
      .catch(err => {
        console.error("Failed to fetch customer contract details:", err);
        if (selectedContract.startDate) {
          setContractStartDate(selectedContract.startDate.split('T')[0]);
        }
      });
  }, [selectedContract]);

  /* ── Load data ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cRaw, conRaw, hRaw, avhRaw, uRaw, jRaw, jtRaw, attRaw, sRaw, chmRaw, mergeRaw, extRaw, compRaw] = await Promise.all([
          apiService.getAllCustomers().catch(() => []),
          apiService.getAllCustomerContracts().catch(() => []),
          apiService.getAllHoardings().catch(() => []), // All Hoardings for info/other
          apiService.getAllavailableforJob().catch(() => []), // Available Hoardings for select modal
          apiService.getAllUsers().catch(() => []),
          apiService.getAllJobRequests().catch(() => []),
          apiService.getAllJobTasks().catch(() => []),
          apiService.getAllJobTaskAttachments().catch(() => []),
          apiService.getAllSites().catch(() => []),
          apiService.getAllCustomerContractHoardingMaps().catch(() => []),
          apiService.getAllHoardingMerges().catch(() => []),   // ← ADD
          apiService.getAllExternalHoardings().catch(() => []), // ← NEW
          apiService.getAllCompanyDetails().catch(() => []),   // ← Companies
        ]);

        setCustomers(normalizeList(cRaw).map(normalizeCustomer));
        setContracts(normalizeList(conRaw).map(normalizeContract));
        setCompanies(normalizeList(compRaw).map(normalizeCompany));
        // Build site lookup map
        const siteList = normalizeList(sRaw);
        const siteMap = new Map(
          siteList.map(s => [
            Number(s.siteID ?? s.SiteID ?? 0),
            normalizeSite(s)
          ])
        );
        const rawHoardings = [
          ...normalizeList(hRaw),
          ...normalizeList(extRaw),
        ];

        // ── 1. Build code → latest hoarding
        const latestByCode = new Map();
        rawHoardings.forEach(h => {
          const code = h.hoardingCode ?? h.HoardingCode ?? '';
          const existing = latestByCode.get(code);
          const thisDate = new Date(h.effdt ?? h.Effdt ?? 0).getTime();
          const existDate = existing ? new Date(existing.effdt ?? existing.Effdt ?? 0).getTime() : -1;
          if (!existing || thisDate > existDate) latestByCode.set(code, h);
        });

        // ── 2. Build anyHoardingID → latestHoardingID for that code
        //    This lets us translate old effdt IDs (stored in merge/contract tables)
        //    to the deduplicated latest ID we actually render
        // Build: any raw hoardingID → the latest hoardingID for that code
        const anyIdToLatestId = new Map();
        rawHoardings.forEach(h => {
          const code = h.hoardingCode ?? h.HoardingCode ?? '';
          const latest = latestByCode.get(code);
          if (latest) {
            anyIdToLatestId.set(
              Number(h.hoardingID ?? h.HoardingID ?? 0),
              Number(latest.hoardingID ?? latest.HoardingID ?? 0)
            );
          }
        });
        setAnyIdToLatestId(anyIdToLatestId);


        // ── 3. Enrich with site data
        const enrichedHoardings = Array.from(latestByCode.values()).map(h => {
          const siteID = Number(h.siteID ?? h.SiteID ?? h.site_id ?? h.Site_ID ?? h.siteId ?? 0);
          const foundSite = siteMap.get(siteID) || null;
          const hasFoundSite = foundSite && (foundSite.addressLine1 || foundSite.city);
          return {
            ...h,
            site: hasFoundSite ? foundSite : (h.site ? normalizeSite(h.site) : null),
          };
        });

        setHoardings(enrichedHoardings);
        setAnyIdToLatestId(anyIdToLatestId); // ← new state, see below

        // Deduplicate and enrich available hoardings:
        const rawAvailable = normalizeList(avhRaw);
        const latestAvailableByCode = new Map();
        rawAvailable.forEach(h => {
          const code = h.hoardingCode ?? h.HoardingCode ?? '';
          const existing = latestAvailableByCode.get(code);
          const thisDate = new Date(h.effdt ?? h.Effdt ?? 0).getTime();
          const existDate = existing ? new Date(existing.effdt ?? existing.Effdt ?? 0).getTime() : -1;
          if (!existing || thisDate > existDate) latestAvailableByCode.set(code, h);
        });
        const enrichedAvailable = Array.from(latestAvailableByCode.values()).map(h => {
          const siteID = Number(h.siteID ?? h.SiteID ?? h.site_id ?? h.Site_ID ?? h.siteId ?? 0);
          const foundSite = siteMap.get(siteID) || null;
          const hasFoundSite = foundSite && (foundSite.addressLine1 || foundSite.city);
          return {
            ...h,
            site: hasFoundSite ? foundSite : (h.site ? normalizeSite(h.site) : null),
          };
        });
        setAvailableHoardings(enrichedAvailable);

        setContractHoardingMaps(normalizeList(chmRaw));
        setHoardingMerges(normalizeList(mergeRaw));

        rawHoardings.forEach(h => {
          const code = h.hoardingCode ?? h.HoardingCode ?? '';
          const existing = latestByCode.get(code);
          const thisDate = new Date(h.effdt ?? h.Effdt ?? 0).getTime();
          const existDate = existing ? new Date(existing.effdt ?? existing.Effdt ?? 0).getTime() : -1;
          if (!existing || thisDate > existDate) latestByCode.set(code, h);
        });
        // setHoardings(Array.from(latestByCode.values()));
        const allUsers = normalizeList(uRaw).map(normalizeUser);
        setSupervisors(allUsers.filter(u =>
          u.role?.toLowerCase().includes('supervisor') || u.roleId === 3
        ));

        setJobRequests(normalizeList(jRaw).map(normalizeJobRequest));
        setAllJobTasks(normalizeList(jtRaw).map(normalizeJobTask));
        setAllAttachments(normalizeList(attRaw));  // ✅ loaded on startup

      } catch (err) {
        setApiError(err?.response?.data?.message || err?.message || 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const refreshAvailableHoardings = useCallback(async () => {
    try {
      const [hRaw, sRaw] = await Promise.all([
        apiService.getAllavailableforJob().catch(() => []),
        apiService.getAllSites().catch(() => []),
      ]);
      const siteList = normalizeList(sRaw);
      const siteMap = new Map(
        siteList.map(s => [
          Number(s.siteID ?? s.SiteID ?? 0),
          normalizeSite(s)
        ])
      );
      const rawHoardings = normalizeList(hRaw);

      // ── 1. Build code → latest hoarding
      const latestByCode = new Map();
      rawHoardings.forEach(h => {
        const code = h.hoardingCode ?? h.HoardingCode ?? '';
        const existing = latestByCode.get(code);
        const thisDate = new Date(h.effdt ?? h.Effdt ?? 0).getTime();
        const existDate = existing ? new Date(existing.effdt ?? existing.Effdt ?? 0).getTime() : -1;
        if (!existing || thisDate > existDate) latestByCode.set(code, h);
      });

      // ── 3. Enrich with site data
      const enrichedHoardings = Array.from(latestByCode.values()).map(h => {
        const siteID = Number(h.siteID ?? h.SiteID ?? h.site_id ?? h.Site_ID ?? h.siteId ?? 0);
        const foundSite = siteMap.get(siteID) || null;
        const hasFoundSite = foundSite && (foundSite.addressLine1 || foundSite.city);
        return {
          ...h,
          site: hasFoundSite ? foundSite : (h.site ? normalizeSite(h.site) : null),
        };
      });

      setAvailableHoardings(enrichedHoardings);
    } catch (err) {
      console.error('Failed to refresh available hoardings:', err);
    }
  }, []);

  const refreshAttachments = useCallback(async () => {
    try {
      const attRaw = await apiService.getAllJobTaskAttachments().catch(() => []);
      setAllAttachments(normalizeList(attRaw));
    } catch { }
  }, []);

  /* ── Refresh ── */
  const refreshJobs = useCallback(async () => {
    try {
      const [jRaw, jtRaw, attRaw] = await Promise.all([
        apiService.getAllJobRequests(),
        apiService.getAllJobTasks(),
        apiService.getAllJobTaskAttachments().catch(() => []),
      ]);
      setJobRequests(normalizeList(jRaw).map(normalizeJobRequest));
      setAllJobTasks(normalizeList(jtRaw).map(normalizeJobTask));
      setAllAttachments(normalizeList(attRaw));

      // Also refresh available hoardings
      await refreshAvailableHoardings();

      showToast('Refreshed', 'success');
    } catch { showToast('Refresh failed', 'error'); }
  }, [showToast, refreshAvailableHoardings]);

  /* ── Reset form ── */
  const resetForm = () => {
    setSelectedCustomer(null); setSelectedContract(null);
    setJobType(''); setSelectedSupervisor(null);
    setJobDescription(''); setRatePerSQFT(''); setTargetDate('');
    setSupervisorAcceptDttm(''); setActualCompletionDate('');
    setTasks([]);
    setStep1Error(''); setStep2Error('');
    setEditingJobID(null);
    setJobStatus('Open');
    setContractStartDate(null);
    setValidationAlert(null);
  };

  /* ── Start new ── */
  const handleStartNew = () => {
    resetForm();
    setStep(1); setIsCreating(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  /* ── Edit existing ── */
  const handleEdit = (job) => {
    const cust = customers.find(c => c.customerID === job.customerID) || null;
    const cont = contracts.find(c => c.customerContractID === job.customerContractID) || null;
    const sup = supervisors.find(u => String(u.userID) === String(job.supervisorID)) || null;

    setSelectedCustomer(cust);
    setSelectedContract(cont);
    setJobType(job.jobType || '');
    setSelectedSupervisor(sup);
    setJobDescription(job.jobDescription || '');
    setRatePerSQFT(String(job.rateperSQFT || ''));
    setTargetDate(job.targetCompletionDate || '');
    setSupervisorAcceptDttm(job.supervisorAcceptDttm || '');
    setActualCompletionDate(job.actualCompletionDate || '');
    setEditingJobID(job.jobRequestID);
    setJobStatus(job.jobStatus || 'Open');

    const myTasks = allJobTasks.filter(t => t.jobRequestID === job.jobRequestID);
    setTasks(myTasks.map(jt => {
      const h = hoardings.find(hh => hh.hoardingID === jt.hoardingID);
      return {
        _id: uid(),
        jobTaskID: jt.jobTaskID,
        hoardingID: jt.hoardingID,
        hoardingCode: h?.hoardingCode || '',
        siteAddress: getSiteAddress(h),
        size: h ? `${h.width} X ${h.height}` : '',
        sqFt: h ? (h.width * h.height) : 0,
        actualCompletionDate: jt.actualCompletionDate || '',
        status: jt.status || 'Open',
        submitDttm: jt.submitDTTM || '',
        saved: true,
      };
    }));

    setStep1Error(''); setStep2Error('');
    setStep(1); setIsCreating(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  /* ── Step navigation ── */
  const goNext = () => {
    if (step === 1) {
      if (!jobType) { setStep1Error('Please select a job type.'); return; }
      if (!selectedSupervisor || !selectedSupervisor.userID) { setStep1Error('Please select a supervisor.'); return; }
      if (!targetDate) { setStep1Error('Target completion date is required.'); return; }
      if (!ratePerSQFT || Number(ratePerSQFT) <= 0) { setStep1Error('Rate per SQFT must be greater than 0.'); return; }

      if (selectedContract && contractStartDate) {
        const res = validateTargetDate(targetDate, contractStartDate);
        if (!res.isValid) {
          setValidationAlert({
            reason: res.reason,
            contractStartDate: contractStartDate,
            targetDate: targetDate
          });
          setStep1Error(res.message);
          return;
        }
      }

      setStep1Error(''); setStep(2);
    }
  };
  const goBack = () => setStep(s => Math.max(1, s - 1));
  const handleBackToList = () => {
    // Original code:
    // setIsCreating(false);
    // setStep1Error(''); setStep2Error('');
    // setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 80);
    sessionStorage.removeItem('job_form_draft');
    setStep(1);
    resetForm();
    setIsCreating(false);
    setStep1Error(''); setStep2Error('');
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 80);
  };

  /* ── Task operations ── */
  const handleAddHoardings = (selectedIds) => {
    const existingHoardingIDs = new Set(tasks.map(t => t.hoardingID));
    const toAdd = availableHoardings
      .filter(h => selectedIds.has(h.hoardingID) && !existingHoardingIDs.has(h.hoardingID))
      .map(h => newTaskRow(h));
    setTasks(p => [...p, ...toAdd]);
    setShowHoardModal(false);
  };

  const updateTask = useCallback((id, field, val) => {
    setTasks(prev => prev.map(t => {
      if (t._id !== id) return t;
      const u = { ...t, [field]: val };
      if (field === 'status' && val === 'Submitted' && !u.submitDttm) {
        u.submitDttm = nowISO();
      }
      return u;
    }));
  }, []);

  const deleteTask = useCallback((id) => setTasks(p => p.filter(t => t._id !== id)), []);

  /* ── Save ── */
  const handleSave = async () => {
    if (tasks.length === 0) { setStep2Error('Add at least one hoarding task.'); return; }

    if (selectedContract && contractStartDate) {
      const res = validateTargetDate(targetDate, contractStartDate);
      if (!res.isValid) {
        setValidationAlert({
          reason: res.reason,
          contractStartDate: contractStartDate,
          targetDate: targetDate
        });
        setStep2Error(res.message);
        return;
      }
    }

    setStep2Error('');
    setSaving(true);
    try {
      const userId = parseInt(localStorage.getItem('userId') || '0', 10);

      const jobPayload = {
        customerID: selectedCustomer?.customerID || 0,
        customerContractID: selectedContract?.customerContractID || 0,
        jobType,
        jobDescription: jobDescription || '',
        iD: String(selectedSupervisor?.userID ?? ''),
        noofHoardings: String(tasks.length),
        supervisorAcceptDttm: supervisorAcceptDttm || new Date().toISOString(),
        rateperSQFT: Number(ratePerSQFT || 0),
        totalAreaSQFT,
        targetCompletionDate: targetDate,
        actualCompletionDate: actualCompletionDate || null,
        jobStatus: derivedJobStatus,
      };

      let savedJobID = editingJobID;
      if (editingJobID) {
        await apiService.updateJobRequest({ ...jobPayload, jobRequestID: editingJobID });
        setJobStatus(jobPayload.jobStatus);
      } else {
        const saved = await apiService.createJobRequest(jobPayload);
        savedJobID = saved?.jobRequestID ?? saved?.JobRequestID ?? 0;
        setEditingJobID(savedJobID); // ← mark as saved so photo buttons activate
        setJobStatus(saved?.jobStatus ?? saved?.JobStatus ?? jobPayload.jobStatus);
      }

      // Save tasks and capture their returned IDs
      const updatedTasks = await Promise.all(tasks.map(async task => {
        const payload = {
          jobRequestID: savedJobID,
          hoardingID: task.hoardingID,
          actualCompletionDate: task.actualCompletionDate || todayISO(),
          status: task.status,
          submitDTTM: task.status === 'Submitted' ? (task.submitDttm || nowISO()) : nowISO(),
          lastUpdateDttm: nowISO(),
          lastUpdatedBy: userId,
        };

        if (task.saved && task.jobTaskID > 0) {
          await apiService.updateJobTask({ ...payload, jobTaskID: task.jobTaskID });
          return task; // already has jobTaskID
        } else {
          const created = await apiService.createJobTask(payload);
          // ← capture the new jobTaskID so photo button activates immediately
          const newJobTaskID = created?.jobTaskID ?? created?.JobTaskID ?? 0;
          return { ...task, jobTaskID: newJobTaskID, saved: true };
        }
      }));

      setTasks(updatedTasks); // ← update tasks with real server IDs

      showToast(editingJobID ? 'Job updated successfully!' : 'Job created successfully!', 'success');
      // Original code:
      // await refreshJobs();
      sessionStorage.removeItem('job_form_draft');
      await refreshJobs();
      // ← removed: setIsCreating(false)  so form stays open for photos

    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save job.', 'error');
    } finally { setSaving(false); }
  };
  const getMyTasks = useCallback((jobID) => allJobTasks.filter(t => t.jobRequestID === jobID), [allJobTasks]);
  const custName = (id) => customers.find(c => c.customerID === id)?.customerName || '—';
  const supName = (id) => supervisors.find(u => String(u.userID) === String(id))?.userName || '—';

  /* ── History table ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return jobRequests;
    return jobRequests.filter(j => {
      const cust = customers.find(c => c.customerID === j.customerID);
      const myTasks = getMyTasks(j.jobRequestID);
      const submittedCnt = myTasks.filter(t => t.status === 'Submitted').length;
      const derived = j.jobStatus === 'Completed'
        ? 'Completed'
        : myTasks.length > 0
          ? (submittedCnt === myTasks.length ? 'Submitted' : (submittedCnt > 0 ? 'In Progress' : (j.jobStatus === 'In Progress' ? 'Accepted' : j.jobStatus)))
          : (j.jobStatus || 'Open');

      return (cust?.customerName || '').toLowerCase().includes(q) ||
        (j.jobType || '').toLowerCase().includes(q) ||
        String(j.jobRequestID).includes(q) ||
        derived.toLowerCase().includes(q);
    });
  }, [jobRequests, search, customers, allJobTasks]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const av = String(a[sortKey] || '').toLowerCase();
    const bv = String(b[sortKey] || '').toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  }), [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => { if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…'); acc.push(p); return acc; }, []);


  const jobTypeBadgeStyle = (type) => {
    const styles = {
      'Banner': { bg: 'rgba(4,158,223,0.09)', color: '#049edf', border: 'rgba(4,158,223,0.25)' },
      'Repair': { bg: 'rgba(245,158,11,0.09)', color: '#d97706', border: 'rgba(245,158,11,0.25)' },
      'Erection': { bg: 'rgba(124,58,237,0.09)', color: '#7c3aed', border: 'rgba(124,58,237,0.25)' },
    };
    return styles[type] || styles['Banner'];
  };

  /* ════════════════ RENDER ════════════════ */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
      <Loader2 size={32} color="#049edf" className="pg-spin" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>Loading job data…</span>
    </div>
  );

  return (
    <>
      {saving && (
        <div className="qt-saving-overlay">
          <Loader2 size={32} color="#049edf" className="pg-spin" />
          <div className="qt-saving-overlay__text">Saving job…</div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="pg-page">

        {/* ── Page Header ── */}
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">Job Management</h1>
            <p className="pg-header__subtitle">Create and manage hoarding <strong>job requests</strong> and tasks.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {isCreating && (
              <button className="pg-btn-cancel" onClick={handleBackToList} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LayoutGrid size={13} /> Back to List
              </button>
            )}
            {!isCreating && (
              <button className="pg-btn-add" onClick={handleStartNew}>
                <Plus size={14} /> New Job
              </button>
            )}
          </div>
        </div>

        {apiError && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11, marginBottom: 16, color: '#dc2626', fontSize: 13, fontWeight: 600, fontFamily: 'Nunito,sans-serif' }}>
            <AlertCircle size={14} /> {apiError}
          </div>
        )}

        {/* ══════════ FORM ══════════ */}
        {isCreating && (
          <div ref={formRef} className="pg-container jb-form-container" style={{ marginBottom: 20 }}>

            {/* Step bar */}
            <div className="qt-step-bar">
              {STEPS.map((s, i) => {
                const done = step > s.n;
                const active = step === s.n;
                return (
                  <React.Fragment key={s.n}>
                    <div className={`qt-step${active ? ' qt-step--active' : ''}${done ? ' qt-step--done' : ''}`}>
                      <div className="qt-step__circle">
                        {done ? <Check size={14} color="#fff" /> : <s.Icon size={13} color={active ? '#fff' : '#b0b0c8'} />}
                      </div>
                      <div className="qt-step__label">{s.label}</div>
                    </div>
                    {i < STEPS.length - 1 && <div className={`qt-step__connector${done ? ' qt-step__connector--done' : ''}`} />}
                  </React.Fragment>
                );
              })}
            </div>
            {/* ── Contract Banner Preview ── */}
            {selectedContract && (
              <div className="qt-field-full" style={{ margin: 30 }}>
                {bannersLoading ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600,
                  }}>
                    <Loader2 size={12} color="#049edf" className="pg-spin" /> Loading banner designs…
                  </div>
                ) : contractBanners.length === 0 ? null : (
                  <div style={{
                    background: 'rgba(4,158,223,0.04)',
                    border: '1.5px solid rgba(4,158,223,0.15)',
                    borderRadius: 10, padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                  }}>
                    {/* Label */}
                    <div style={{
                      fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 800,
                      color: '#049edf', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      🖼️ Banner Designs
                      <span style={{
                        background: '#049edf', color: '#fff', borderRadius: 20,
                        padding: '1px 7px', fontSize: 10, fontWeight: 900,
                      }}>{contractBanners.length}</span>
                    </div>

                    <div style={{ width: 1, height: 28, background: 'rgba(4,158,223,0.2)', flexShrink: 0 }} />

                    {/* Thumbnails */}
                    {contractBanners.map((banner, i) => {
                      const rawPath = banner.imageUrl ?? banner.ImageUrl ?? banner.contractFilePath ?? banner.ContractFilePath ?? '';
                      const imgUrl = rawPath.startsWith('http') ? rawPath : `${API_ROOT_URL}${rawPath}`;
                      const filename = banner.contractFilename ?? banner.ContractFilename ?? `Banner ${i + 1}`;
                      const fileType = banner.fileUploadType ?? banner.FileUploadType ?? '';

                      return (
                        <div
                          key={banner.custContractAttachID ?? i}
                          onClick={() => window.open(imgUrl, '_blank')}
                          title={`${fileType ? fileType + ' · ' : ''}${filename} — click to view`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '4px 10px 4px 4px',
                            background: '#fff', borderRadius: 8,
                            border: '1.5px solid #e8e8f4',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s, box-shadow 0.15s',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = '#049edf';
                            e.currentTarget.style.boxShadow = '0 3px 12px rgba(4,158,223,0.18)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = '#e8e8f4';
                            e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                          }}
                        >
                          {/* Small thumbnail */}
                          <div style={{
                            width: 36, height: 36, borderRadius: 6, overflow: 'hidden',
                            background: '#f0f0f8', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <img
                              src={imgUrl}
                              alt={filename}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              onError={e => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement.innerHTML = '<span style="font-size:18px">🖼️</span>';
                              }}
                            />
                          </div>

                          {/* Name + type */}
                          <div>
                            {fileType && (
                              <div style={{
                                fontFamily: 'Nunito,sans-serif', fontSize: 9.5, fontWeight: 800,
                                color: '#049edf', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1,
                              }}>
                                {fileType}
                              </div>
                            )}
                            <div style={{
                              fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#5a5a78', fontWeight: 700,
                              maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              marginTop: fileType ? 2 : 0,
                            }}>
                              {filename.length > 18 ? filename.slice(0, 16) + '…' : filename}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {/* ─── STEP 1 ─── */}
            {step === 1 && (
              <div className="qt-step-body">
                <div className="qt-form-grid">

                  <div>
                    <label className="qt-label">Customer <span className="qt-label--opt">(optional)</span></label>
                    <ComboField
                      value={selectedCustomer?.customerID}
                      onChange={c => { setSelectedCustomer(c); setSelectedContract(null); setStep1Error(''); }}
                      options={customers}
                      placeholder="Select customer…"
                      icon={User}
                      getLabel={c => c.customerName}
                      getValue={c => c.customerID}
                      getSecondary={c => [c.city, c.district].filter(Boolean).join(', ')}
                      searchPlaceholder="Search customers…"
                    />
                    {selectedCustomer && (
                      <div className="jb-info-strip">
                        {selectedCustomer.phone1 && <span>📞 {selectedCustomer.phone1}</span>}
                        {selectedCustomer.gstNumber && <span>GST: {selectedCustomer.gstNumber}</span>}
                        <span style={{ color: '#049edf' }}>{customerContracts.length} contract{customerContracts.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="qt-label">Customer Contract <span className="qt-label--opt">(optional — filters hoardings)</span></label>
                    <ComboField
                      value={selectedContract?.customerContractID}
                      onChange={async c => {
                        if (!c) {
                          setSelectedContract(null);
                          return;
                        }
                        const banners = await apiService.getContractBannerImages(c.customerContractID);
                        if (banners.length === 0) {
                          setPendingContract(c);
                        } else {
                          setSelectedContract(c);
                        }
                      }}
                      options={customerContracts}
                      placeholder={selectedCustomer ? (customerContracts.length === 0 ? 'No contracts for this customer' : 'Select contract…') : 'Select customer first'}
                      icon={FileText}
                      disabled={!selectedCustomer || customerContracts.length === 0}
                      getLabel={c => `Contract #${c.customerContractID}`}
                      getValue={c => c.customerContractID}
                      getSecondary={c => `${fmtDate(c.startDate)} → ${fmtDate(c.endDate)} · ${c.status || ''}`}
                      searchPlaceholder="Search contracts…"
                    />
                  </div>

                  <div>
                    <label className="qt-label">Job Type <span className="qt-label--req">*</span></label>
                    <ComboField
                      value={jobType}
                      onChange={o => { setJobType(o ? o.value : ''); setStep1Error(''); }}
                      options={JOB_TYPES}
                      placeholder="Select type…"
                      icon={Tag}
                      getLabel={o => `${o.icon} ${o.label}`}
                      getValue={o => o.value}
                      searchPlaceholder="Mounting / Repair / Erection"
                    />
                  </div>

                  <div>
                    <label className="qt-label">Select Supervisor <span className="qt-label--req">*</span></label>
                    <ComboField
                      value={selectedSupervisor?.userID}
                      onChange={u => { setSelectedSupervisor(u); setStep1Error(''); }}
                      options={supervisors}
                      placeholder={supervisors.length === 0 ? 'No supervisors found in system' : 'Select supervisor…'}
                      icon={UserCheck}
                      disabled={supervisors.length === 0}
                      getLabel={u => u.userName}
                      getValue={u => u.userID}
                      getSecondary={u => u.email || u.role}
                      searchPlaceholder="Search supervisors…"
                    />
                    {supervisors.length === 0 && (
                      <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#f59e0b', marginTop: 4, display: 'flex', gap: 5, alignItems: 'center' }}>
                        <AlertCircle size={11} /> No users with Supervisor role found.
                      </div>
                    )}
                  </div>

                  <div className="qt-field-full">
                    <label className="qt-label">Job Description <span className="qt-label--opt">(optional)</span></label>
                    <div className="qt-input-wrap" style={{ alignItems: 'flex-start', paddingTop: 10 }}>
                      <Briefcase size={14} color="#c0c0d8" style={{ flexShrink: 0, marginTop: 2 }} />
                      <textarea
                        className="qt-input jb-textarea"
                        value={jobDescription}
                        onChange={e => setJobDescription(e.target.value)}
                        placeholder="Describe the job scope, requirements, special instructions…"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="qt-label">Rate per SQFT <span className="qt-label--req">*</span></label>
                    <div className="qt-input-wrap">
                      <span style={{ fontSize: 13, color: '#049edf', fontWeight: 800, flexShrink: 0 }}>₹</span>
                      <input className="qt-input" type="number" min="0" step="0.01"
                        value={ratePerSQFT}
                        onChange={e => { setRatePerSQFT(e.target.value); setStep1Error(''); }}
                        placeholder="0.00" />
                    </div>
                  </div>

                  <div>
                    <label className="qt-label">Target Completion Date <span className="qt-label--req">*</span></label>
                    <div className="qt-input-wrap">
                      <Calendar size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
                      <input className="qt-input" type="date" value={targetDate}
                        onChange={e => {
                          const val = e.target.value;
                          setTargetDate(val);
                          setStep1Error('');
                          if (val && selectedContract && contractStartDate) {
                            const res = validateTargetDate(val, contractStartDate);
                            if (!res.isValid) {
                              setValidationAlert({
                                reason: res.reason,
                                contractStartDate: contractStartDate,
                                targetDate: val
                              });
                            }
                          }
                        }} />
                    </div>
                  </div>

                  <div>
                    <label className="qt-label">Supervisor Accept Date <span className="qt-label--opt">(read-only)</span></label>
                    <div className="qt-input-wrap jb-readonly">
                      <Clock size={14} color="#d0d0e0" style={{ flexShrink: 0 }} />
                      <span className="jb-readonly-text">
                        {supervisorAcceptDttm ? fmtDateTime(supervisorAcceptDttm) : 'Pending supervisor acceptance…'}
                      </span>
                      <span style={{ fontSize: 11, color: '#d0d0e0', flexShrink: 0 }}>🔒</span>
                    </div>
                  </div>

                  <div>
                    <label className="qt-label">Actual Completion Date <span className="qt-label--opt">(read-only)</span></label>
                    <div className="qt-input-wrap jb-readonly">
                      <Calendar size={14} color="#d0d0e0" style={{ flexShrink: 0 }} />
                      <span className="jb-readonly-text">
                        {actualCompletionDate ? fmtDate(actualCompletionDate) : 'Not yet completed'}
                      </span>
                      <span style={{ fontSize: 11, color: '#d0d0e0', flexShrink: 0 }}>🔒</span>
                    </div>
                  </div>

                  <div>
                    <label className="qt-label">Job Status <span className="qt-label--opt">(auto-derived)</span></label>
                    <div style={{ marginTop: 6 }}>
                      <JobStatusBadge status={derivedJobStatus} />
                      <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8', marginTop: 5, fontWeight: 600 }}>
                        Updates automatically based on supervisor acceptance and task completion.
                      </div>
                    </div>
                  </div>

                </div>

                {step1Error && <div className="qt-error-banner"><AlertCircle size={14} /> {step1Error}</div>}

                <div className="qt-step-foot">
                  <button className="pg-btn-cancel" onClick={handleBackToList} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LayoutGrid size={13} /> Back to List
                  </button>
                  <button className="pg-btn-save" onClick={goNext}>
                    Next: Hoardings &amp; Tasks <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 2 ─── */}
            {step === 2 && (
              <div className="qt-step-body">

                {/* Summary banner */}
                <div className="jb-summary-banner">
                  <div className="jb-summary-item">
                    <span className="jb-summary-label">Customer</span>
                    <span className="jb-summary-value">{selectedCustomer?.customerName || '—'}</span>
                  </div>
                  <div className="jb-summary-divider" />
                  <div className="jb-summary-item">
                    <span className="jb-summary-label">Job Type</span>
                    <span className="jb-summary-value">{jobType || '—'}</span>
                  </div>
                  <div className="jb-summary-divider" />
                  <div className="jb-summary-item">
                    <span className="jb-summary-label">Rate / Sq.Ft</span>
                    <span className="jb-summary-value">₹ {ratePerSQFT || '0'}</span>
                  </div>
                  <div className="jb-summary-divider" />
                  <div className="jb-summary-item">
                    <span className="jb-summary-label">Total Area</span>
                    <span className="jb-summary-value" style={{ color: '#049edf', fontWeight: 900 }}>
                      {totalAreaSQFT.toFixed(1)} sq.ft
                    </span>
                  </div>
                  <div className="jb-summary-divider" />
                  <div className="jb-summary-item">
                    <span className="jb-summary-label">Total Amount</span>
                    <span className="jb-summary-value" style={{ color: '#16a34a', fontWeight: 900 }}>
                      ₹ {(Number(ratePerSQFT || 0) * totalAreaSQFT).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="jb-summary-divider" />
                  <div className="jb-summary-item">
                    <span className="jb-summary-label">Target Date</span>
                    <span className="jb-summary-value">{fmtDate(targetDate)}</span>
                  </div>
                  <div className="jb-summary-divider" />
                  <div className="jb-summary-item">
                    <span className="jb-summary-label">Status</span>
                    <JobStatusBadge status={derivedJobStatus} />
                  </div>
                </div>

                {/* Tasks header */}
                <div className="qt-step2-head" style={{ marginTop: 18 }}>
                  <div>
                    <div className="qt-step2-title">Hoarding Tasks</div>
                    <div className="qt-step2-sub">
                      {tasks.length} hoarding{tasks.length !== 1 ? 's' : ''} · Total area: {totalAreaSQFT.toFixed(1)} sq.ft
                      {selectedContract
                        ? ` · Filtered by Contract #${selectedContract.customerContractID}`
                        : selectedCustomer
                          ? ` · Filtered by ${selectedCustomer.customerName}'s contracts`
                          : ' · Showing all hoardings'}
                    </div>
                  </div>
                  <button className="pg-btn-save" onClick={() => setShowHoardModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={13} /> Add Hoardings
                  </button>
                </div>

                {/* Tasks table */}
                <div style={{ overflowX: 'auto', border: '1px solid #f0f0f8', borderRadius: 12, marginBottom: 12 }}>
                  {tasks.length === 0 ? (
                    <div className="pg-empty__inner" style={{ padding: '44px 20px' }}>
                      <Building2 size={38} color="#d0d0e8" />
                      <span className="pg-empty__label">No hoardings added yet</span>
                      <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#b0b0c8', fontWeight: 600 }}>
                        Click "Add Hoardings" to get started
                      </span>
                    </div>
                  ) : (
                    <table className="pg-table" ref={taskTableRef} style={{ tableLayout: 'fixed', width: '100%', minWidth: 1100 }}>
                      <thead>
                        <tr>
                          <th className="pg-th" style={{ width: 40 }}>#</th>
                          <th className="pg-th" style={{ textAlign: 'left', minWidth: 200 }}>Site Address</th>
                          <th className="pg-th" style={{ minWidth: 90 }}>Code</th>
                          <th className="pg-th" style={{ minWidth: 90 }}>Size</th>
                          <th className="pg-th" style={{ minWidth: 70 }}>Sq.Ft</th>
                          <th className="pg-th" style={{ minWidth: 148 }}>Actual Completion</th>
                          <th className="pg-th" style={{ minWidth: 140 }}>Task Status</th>
                          <th className="pg-th" style={{ minWidth: 170 }}>Submit Date / Time</th>
                          <th className="pg-th" style={{ minWidth: 80, textAlign: 'center' }}>Photos</th>
                          <th className="pg-th" style={{ width: 60, textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayTaskRows.map((row, i) => {
                          if (row._type === 'merged') {
                            // ── Merged group row ──
                            const codes = row.tasks.map(t => t.hoardingCode).filter(Boolean).join(' + ');
                            const addrs = [...new Set(row.tasks.map(t => t.siteAddress || t.hoardingCode).filter(Boolean))].join(', ');
                            const allSubmitted = row.tasks.every(t => t.status === 'Submitted');
                            const anySubmitted = row.tasks.some(t => t.status === 'Submitted');

                            return (
                              <tr key={row._id} className="pg-tr" style={{
                                background: allSubmitted ? 'rgba(22,163,74,0.04)' : 'rgba(124,58,237,0.03)',
                                borderLeft: '3px solid rgba(124,58,237,0.35)',
                              }}>
                                <td className="pg-td" style={{ textAlign: 'center' }}>
                                  <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#9090a8' }}>{i + 1}</span>
                                </td>

                                <td className="pg-td">
                                  <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, color: '#1a1a2e' }}>
                                    {addrs}
                                  </div>
                                  <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 4,
                                      padding: '2px 8px', borderRadius: 10,
                                      background: 'rgba(124,58,237,0.08)',
                                      border: '1px solid rgba(124,58,237,0.22)',
                                      color: '#7c3aed',
                                      fontFamily: 'Nunito,sans-serif', fontSize: 10.5, fontWeight: 800,
                                    }}>
                                      {row.mergeFlag === 'H' ? '↔' : '↕'} {row.mergeFlag === 'H' ? 'Horizontal' : 'Vertical'} Merge
                                    </span>
                                    <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600 }}>
                                      {row.tasks.length} hoardings merged
                                    </span>
                                  </div>
                                </td>

                                <td className="pg-td">
                                  <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11.5, color: '#7c3aed', fontWeight: 700 }}>
                                    {codes}
                                  </span>
                                </td>

                                <td className="pg-td" style={{ textAlign: 'center' }}>
                                  <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#4a5568', fontWeight: 700 }}>
                                    {row.mergedWidth} × {row.mergedHeight} ft
                                  </span>
                                </td>

                                <td className="pg-td" style={{ textAlign: 'center' }}>
                                  <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 900, color: '#7c3aed' }}>
                                    {row.mergedSqFt}
                                  </span>
                                </td>

                                <td className="pg-td">
                                  <input className="qt-inline-input qt-date-input" type="date"
                                    value={row.actualCompletionDate}
                                    onChange={e => {
                                      const val = e.target.value;
                                      row.tasks.forEach(t => updateTask(t._id, 'actualCompletionDate', val));
                                    }} />
                                </td>

                                <td className="pg-td">
                                  <TaskStatusSelect
                                    value={row.status}
                                    disabled={jobStatus === 'Completed'}
                                    onChange={val => {
                                      if (val === 'Submitted') {
                                        const unsaved = row.tasks.some(t => !t.saved || t.jobTaskID === 0);
                                        if (unsaved) {
                                          showToast('Please save the job first before submitting tasks.', 'error');
                                          return;
                                        }
                                        const taskIDs = row.tasks.map(t => Number(t.jobTaskID));
                                        const mine = allAttachments.filter(a => taskIDs.includes(Number(a.jobTaskID ?? a.JobTaskID)));
                                        const hasNear = mine.some(a => (a.photoFileType ?? a.PhotoFileType ?? '').toLowerCase().includes('near'));
                                        const hasFar = mine.some(a => (a.photoFileType ?? a.PhotoFileType ?? '').toLowerCase().includes('far'));
                                        if (hasNear && hasFar) {
                                          row.tasks.forEach(t => updateTask(t._id, 'status', 'Submitted'));
                                        } else {
                                          setSubmitTaskTarget({
                                            ...row.tasks[0],
                                            tasks: row.tasks,
                                            hoardingCode: row.tasks.map(t => t.hoardingCode).filter(Boolean).join(' + '),
                                            siteAddress: [...new Set(row.tasks.map(t => t.siteAddress).filter(Boolean))].join(', '),
                                          });
                                        }
                                        return;
                                      }
                                      if (row.status === 'Submitted' && (val === 'Open' || val === 'In Progress')) {
                                        const taskIDs = new Set(row.tasks.map(t => Number(t.jobTaskID)));
                                        const hasPhotos = allAttachments.some(a => taskIDs.has(Number(a.jobTaskID ?? a.JobTaskID)));
                                        if (hasPhotos) {
                                          showToast('Please delete all uploaded photos for this hoarding task before changing the status from Submitted.', 'error');
                                          return;
                                        }
                                      }
                                      row.tasks.forEach(t => updateTask(t._id, 'status', val));
                                    }}
                                  />
                                </td>

                                <td className="pg-td">
                                  {allSubmitted ? (
                                    <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11.5, color: '#16a34a', fontWeight: 700 }}>
                                      {(() => {
                                        let submitTime = null;
                                        for (const t of row.tasks) {
                                          submitTime = getTaskSubmitTimeFromAttachments(t.jobTaskID, allAttachments);
                                          if (submitTime) break;
                                        }
                                        const finalTime = submitTime || row.submitDttm;
                                        return finalTime ? fmtDateTime(finalTime) : fmtDateTime(nowISO());
                                      })()}
                                      <span style={{ fontSize: 10, color: '#d0d0e0', marginLeft: 4 }}>🔒</span>
                                    </div>
                                  ) : (
                                    <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#d0d0e0', fontStyle: 'italic' }}>
                                      Set status to Submitted
                                    </span>
                                  )}
                                </td>

                                <td className="pg-td" style={{ textAlign: 'center' }}>
                                  {(() => {
                                    const allSaved = row.tasks.every(t => t.jobTaskID > 0);
                                    const totalCnt = row.tasks.reduce((sum, t) =>
                                      sum + allAttachments.filter(
                                        a => Number(a.jobTaskID ?? a.JobTaskID ?? 0) === Number(t.jobTaskID)
                                      ).length, 0);
                                    return allSaved ? (
                                      <button
                                        className="pg-btn-view"
                                        onClick={() => setPhotoModalTask({
                                          ...row.tasks[0],
                                          mergedTaskIDs: row.tasks.map(t => t.jobTaskID),
                                          tasks: row.tasks,
                                          hoardingCode: row.tasks.map(t => t.hoardingCode).filter(Boolean).join(' + '),
                                          siteAddress: [...new Set(row.tasks.map(t => t.siteAddress).filter(Boolean))].join(', '),
                                        })}
                                        title="View / Upload photos for all merged hoardings"
                                        style={{ background: 'rgba(4,158,223,0.08)', color: '#049edf', boxShadow: 'none', position: 'relative' }}
                                      >
                                        📷
                                        {totalCnt > 0 && (
                                          <span style={{
                                            position: 'absolute', top: -6, right: -6,
                                            background: '#049edf', color: '#fff',
                                            borderRadius: '50%', width: 16, height: 16,
                                            fontSize: 9, fontWeight: 900, fontFamily: 'Nunito,sans-serif',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: '1.5px solid #fff',
                                          }}>{totalCnt}</span>
                                        )}
                                      </button>
                                    ) : (
                                      <span title="Save job first"
                                        style={{
                                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                          width: 30, height: 30, borderRadius: 8,
                                          background: '#f4f4fb', border: '1px solid #e8e8f4',
                                          fontSize: 14, opacity: 0.4, cursor: 'not-allowed',
                                        }}>📷</span>
                                    );
                                  })()}
                                </td>
                                <td className="pg-td" style={{ textAlign: 'center' }}>
                                  {(!editingJobID || row.tasks.some(t => !t.saved || t.jobTaskID === 0)) && (
                                    <button
                                      className="pg-btn-view"
                                      onClick={() => {
                                        setDeleteConfirmTarget({
                                          type: 'merged',
                                          tasks: row.tasks,
                                          message: "Are you sure you want to remove these merged hoarding tasks?"
                                        });
                                      }}
                                      title="Remove all merged tasks"
                                      style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', boxShadow: 'none' }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          }

                          // ── Single row ──
                          return (
                            <tr key={row._id} className="pg-tr"
                              style={{ background: row.status === 'Submitted' ? 'rgba(22,163,74,0.03)' : undefined }}>

                              <td className="pg-td" style={{ textAlign: 'center' }}>
                                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#9090a8' }}>{i + 1}</span>
                              </td>
                              <td className="pg-td">
                                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, color: '#1a1a2e' }}>
                                  {row.siteAddress || row.hoardingCode || '—'}
                                </div>
                              </td>
                              <td className="pg-td">
                                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#049edf', fontWeight: 700 }}>
                                  {row.hoardingCode || '—'}
                                </span>
                              </td>
                              <td className="pg-td" style={{ textAlign: 'center' }}>
                                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#4a5568' }}>{row.size || '—'}</span>
                              </td>
                              <td className="pg-td" style={{ textAlign: 'center' }}>
                                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 900, color: '#1a1a2e' }}>{row.sqFt}</span>
                              </td>
                              <td className="pg-td">
                                <input className="qt-inline-input qt-date-input" type="date"
                                  value={row.actualCompletionDate}
                                  onChange={e => updateTask(row._id, 'actualCompletionDate', e.target.value)} />
                              </td>
                              <td className="pg-td">
                                <TaskStatusSelect
                                  value={row.status}
                                  disabled={jobStatus === 'Completed'}
                                  onChange={val => {
                                    if (val === 'Submitted') {
                                      if (!row.saved || row.jobTaskID === 0) {
                                        showToast('Please save the job first before submitting this task.', 'error');
                                        return;
                                      }
                                      const mine = allAttachments.filter(a => Number(a.jobTaskID ?? a.JobTaskID) === Number(row.jobTaskID));
                                      const hasNear = mine.some(a => (a.photoFileType ?? a.PhotoFileType ?? '').toLowerCase().includes('near'));
                                      const hasFar = mine.some(a => (a.photoFileType ?? a.PhotoFileType ?? '').toLowerCase().includes('far'));
                                      if (hasNear && hasFar) {
                                        updateTask(row._id, 'status', 'Submitted');
                                      } else {
                                        setSubmitTaskTarget(row);
                                      }
                                      return;
                                    }
                                    if (row.status === 'Submitted' && (val === 'Open' || val === 'In Progress')) {
                                      const hasPhotos = allAttachments.some(a => Number(a.jobTaskID ?? a.JobTaskID) === Number(row.jobTaskID));
                                      if (hasPhotos) {
                                        showToast('Please delete all uploaded photos for this hoarding task before changing the status from Submitted.', 'error');
                                        return;
                                      }
                                    }
                                    updateTask(row._id, 'status', val);
                                  }}
                                />
                              </td>
                              <td className="pg-td">
                                {row.status === 'Submitted' ? (
                                  <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11.5, color: '#16a34a', fontWeight: 700 }}>
                                    {(() => {
                                      const submitTime = getTaskSubmitTimeFromAttachments(row.jobTaskID, allAttachments);
                                      const finalTime = submitTime || row.submitDttm;
                                      return finalTime ? fmtDateTime(finalTime) : fmtDateTime(nowISO());
                                    })()}
                                    <span style={{ fontSize: 10, color: '#d0d0e0', marginLeft: 4 }}>🔒</span>
                                  </div>
                                ) : (
                                  <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#d0d0e0', fontStyle: 'italic' }}>
                                    Set status to Submitted
                                  </span>
                                )}
                              </td>
                              <td className="pg-td" style={{ textAlign: 'center' }}>
                                {row.jobTaskID > 0 ? (
                                  <button
                                    className="pg-btn-view"
                                    onClick={() => setPhotoModalTask(row)}
                                    title="View / Upload Photos"
                                    style={{ background: 'rgba(4,158,223,0.08)', color: '#049edf', boxShadow: 'none', position: 'relative' }}
                                  >
                                    📷
                                    {/* Photo count badge */}
                                    {(() => {
                                      const cnt = allAttachments.filter(
                                        a => Number(a.jobTaskID ?? a.JobTaskID ?? 0) === Number(row.jobTaskID)
                                      ).length;
                                      return cnt > 0 ? (
                                        <span style={{
                                          position: 'absolute', top: -6, right: -6,
                                          background: '#049edf', color: '#fff',
                                          borderRadius: '50%', width: 16, height: 16,
                                          fontSize: 9, fontWeight: 900, fontFamily: 'Nunito,sans-serif',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          border: '1.5px solid #fff',
                                        }}>{cnt}</span>
                                      ) : null;
                                    })()}
                                  </button>
                                ) : (
                                  <span title="Save job first to upload photos" style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: 30, height: 30, borderRadius: 8,
                                    background: '#f4f4fb', border: '1px solid #e8e8f4',
                                    fontSize: 14, opacity: 0.4, cursor: 'not-allowed',
                                  }}>📷</span>
                                )}
                              </td>
                              <td className="pg-td" style={{ textAlign: 'center' }}>
                                {(!editingJobID || !row.saved || row.jobTaskID === 0) && (
                                  <button
                                    className="pg-btn-view"
                                    onClick={() => {
                                      setDeleteConfirmTarget({
                                        type: 'single',
                                        task: row,
                                        message: `Are you sure you want to remove the task for hoarding "${row.hoardingCode}"?`
                                      });
                                    }}
                                    title="Remove task"
                                    style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', boxShadow: 'none' }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f5f5fd' }}>
                          <td colSpan={4} className="pg-td"
                            style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 12.5, color: '#5a5a78', textAlign: 'right' }}>
                            Total Area SQFT →
                          </td>
                          <td className="pg-td" style={{ textAlign: 'center', fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 14, color: '#049edf' }}>
                            {totalAreaSQFT.toFixed(1)}
                          </td>
                          <td colSpan={4}></td>
                        </tr>
                      </tfoot>
                      {/* {tasks.length > 0 && (
                        <tfoot>
                          <tr style={{ background: '#f5f5fd' }}>
                            <td colSpan={4} className="pg-td"
                              style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 12.5, color: '#5a5a78', textAlign: 'right' }}>
                              Total Area SQFT →
                            </td>
                            <td className="pg-td" style={{ textAlign: 'center', fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 14, color: '#049edf' }}>
                              {totalAreaSQFT.toFixed(1)}
                            </td>
                            <td colSpan={4}></td>
                          </tr>
                        </tfoot>
                      )} */}
                    </table>
                  )}
                </div>

                {step2Error && <div className="qt-error-banner"><AlertCircle size={14} /> {step2Error}</div>}

                <div className="qt-step-foot">
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="pg-btn-cancel" onClick={handleBackToList}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <LayoutGrid size={13} /> Back to List
                    </button>
                    <button className="pg-btn-cancel" onClick={goBack}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ArrowLeft size={13} /> Back
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {/* Unsaved hint */}
                    {tasks.some(t => !t.saved || t.jobTaskID === 0) && (
                      <span style={{
                        fontFamily: 'Nunito,sans-serif', fontSize: 12,
                        color: '#f59e0b', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        <AlertCircle size={12} /> Save first to enable photo uploads
                      </span>
                    )}

                    {/* ✅ Mark Complete — shown only when editing a non-completed job */}
                    {/* ✅ Mark Complete — shown only when editing a non-completed job */}
                    {(() => {
                      const savedJob = jobRequests.find(j => j.jobRequestID === editingJobID);
                      const alreadyCompleted = savedJob?.jobStatus === 'Completed' || completing;
                      return editingJobID && !alreadyCompleted && (
                        <button
                          onClick={() => {
                            if (completing) return;          // hard guard — ignore double-clicks
                            setCompleteTarget({
                              job: {
                                ...jobRequests.find(j => j.jobRequestID === editingJobID),
                                jobRequestID: editingJobID,
                                customerID: selectedCustomer?.customerID || 0,
                                customerContractID: selectedContract?.customerContractID || 0,
                                jobType,
                                jobDescription,
                                supervisorID: selectedSupervisor?.userID || '',
                                rateperSQFT: Number(ratePerSQFT || 0),
                                totalAreaSQFT,
                                targetCompletionDate: targetDate,
                                supervisorAcceptDttm,
                                actualCompletionDate,
                              },
                              tasks: tasks.map(t => ({
                                jobTaskID: t.jobTaskID,
                                hoardingID: t.hoardingID,
                                hoardingCode: t.hoardingCode,
                                siteAddress: t.siteAddress,
                                status: t.status,
                              })),
                            });
                          }}
                          disabled={completing}                    // ← disable while in-flight
                          style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '10px 20px', borderRadius: 11, border: 'none',
                            background: completing
                              ? '#e8e8f4'
                              : 'linear-gradient(135deg,#16a34a,#15803d)',
                            color: completing ? '#b0b0c8' : '#fff',
                            cursor: completing ? 'not-allowed' : 'pointer',
                            fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800,
                            boxShadow: completing ? 'none' : '0 3px 12px rgba(22,163,74,0.30)',
                            transition: 'all 0.18s',
                            pointerEvents: completing ? 'none' : 'auto',   // ← belt-and-suspenders
                          }}
                          onMouseEnter={e => { if (!completing) e.currentTarget.style.transform = 'scale(1.03)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          {completing
                            ? <><Loader2 size={14} className="pg-spin" /> Completing…</>
                            : <>✅ Mark Complete</>}
                        </button>
                      );
                    })()}

                    {/* Save / Update */}
                    <button
                      className="pg-btn-save"
                      onClick={handleSave}
                      disabled={tasks.length === 0 || saving}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontSize: 14 }}
                    >
                      {saving
                        ? <><Loader2 size={14} className="pg-spin" /> Saving…</>
                        : <><Check size={15} /> {editingJobID ? 'Update Job' : 'Create Job'}</>}
                    </button>

                    {/* Done — shown after save */}
                    {editingJobID && (
                      <button
                        className="pg-btn-cancel"
                        onClick={() => {
                          // Original code:
                          // setIsCreating(false);
                          sessionStorage.removeItem('job_form_draft');
                          setStep(1);
                          resetForm();
                          setIsCreating(false);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <LayoutGrid size={13} /> Done
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ══════════ JOB LIST ══════════ */}
        {!isCreating && (
          <div className="pg-container">

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #f0f0f8', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(4,158,223,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={15} color="#049edf" />
                </div>
                <div>
                  <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 16, fontWeight: 900, color: '#1a1a2e', lineHeight: 1 }}>{sorted.length}</div>
                  <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 600, color: '#9090a8', lineHeight: 1, marginTop: 2 }}>Job{sorted.length !== 1 ? 's' : ''}</div>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: '#f4f4fb', borderRadius: 10, border: '1.5px solid #ececf8' }}>
                <Search size={14} color="#9090a8" style={{ flexShrink: 0 }} />
                <input
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}
                  placeholder="Search by customer, job type, status, ID…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                {search && <X size={13} style={{ cursor: 'pointer', color: '#9090a8', flexShrink: 0 }} onClick={() => setSearch('')} />}
              </div>

              <button onClick={refreshJobs}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1.5px solid #e8e8f4', background: '#fff', color: '#5a5a78', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                <RefreshCw size={13} /> Refresh
              </button>

              {/* <button onClick={handleStartNew}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, border: 'none', background: '#049edf', color: '#fff', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800, flexShrink: 0, boxShadow: '0 2px 8px rgba(4,158,223,0.25)' }}>
                <Plus size={14} /> New Job
              </button> */}
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #f0f0f8', borderRadius: 12, marginBottom: 12 }}>
              <table className="pg-table" ref={tableRef}>
                <thead>
                  <tr>
                    {[
                      { key: 'jobRequestID', label: 'Job ID', w: '8%' },
                      { key: 'customerID', label: 'Customer', w: '18%' },
                      { key: 'jobType', label: 'Type', w: '10%' },
                      { key: '_supervisor', label: 'Supervisor', w: '14%', noSort: true },
                      { key: 'targetCompletionDate', label: 'Target Date', w: '11%' },
                      { key: 'totalAreaSQFT', label: 'Area (sq.ft)', w: '9%' },
                      { key: 'totalAmount', label: 'Total Amount', w: '10%', noSort: true },
                      { key: '_tasks', label: 'Tasks', w: '9%', noSort: true },
                      { key: 'jobStatus', label: 'Status', w: '11%' },
                      { key: '_action', label: 'Actions', w: '10%', noSort: true },
                    ].map(col => (
                      <th key={col.key} style={{ width: col.w }}
                        className={['pg-th', col.noSort ? '' : 'pg-th--sort'].filter(Boolean).join(' ')}
                        onClick={() => !col.noSort && handleSort(col.key)}>
                        <div className="pg-th__inner">
                          {col.label}
                          {!col.noSort
                            ? <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                            : <Filter size={10} color="#d0d0e4" style={{ marginLeft: 5 }} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="pg-td pg-empty" style={{ maxWidth: 'none' }}>
                        <div className="pg-empty__inner">
                          <Briefcase size={36} color="#d0d0e8" />
                          <span className="pg-empty__label">No job requests found</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginated.map(job => {
                    const myTasks = getMyTasks(job.jobRequestID);
                    const submittedCnt = myTasks.filter(t => t.status === 'Submitted').length;
                    const jts = jobTypeBadgeStyle(job.jobType);
                    const currentStatus =
                      job.jobStatus === 'Completed'
                        ? 'Completed'
                        : myTasks.length > 0
                          ? (submittedCnt === myTasks.length ? 'Submitted' : (submittedCnt > 0 ? 'In Progress' : (['In Progress', 'Accepted', 'Submitted'].includes(job.jobStatus) ? 'Accepted' : job.jobStatus)))
                          : (job.jobStatus || 'Open');
                    const isPdfEligible = currentStatus === 'Completed' || currentStatus === 'Submitted';

                    return (
                      <tr key={job.jobRequestID} className="pg-tr">
                        <td className="pg-td">
                          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 800, color: '#049edf' }}>
                            #{job.jobRequestID}
                          </span>
                        </td>
                        <td className="pg-td pg-td--overflow">
                          <span className="pg-td__ellipsis" title={custName(job.customerID)}>
                            {custName(job.customerID)}
                          </span>
                        </td>
                        <td className="pg-td">
                          {job.jobType ? (
                            <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: jts.bg, color: jts.color, border: `1px solid ${jts.border}`, whiteSpace: 'nowrap' }}>
                              {job.jobType}
                            </span>
                          ) : <span style={{ color: '#c0c0d8' }}>—</span>}
                        </td>
                        <td className="pg-td pg-td--overflow">
                          <span className="pg-td__ellipsis" style={{ color: '#4a5568' }}>{supName(job.supervisorID)}</span>
                        </td>
                        <td className="pg-td">
                          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 600, color: '#4a5568' }}>
                            {fmtDate(job.targetCompletionDate)}
                          </span>
                        </td>
                        <td className="pg-td" style={{ textAlign: 'center' }}>
                          <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 13, color: '#1a1a2e' }}>
                            {job.totalAreaSQFT ? Number(job.totalAreaSQFT).toFixed(1) : '—'}
                          </span>
                        </td>
                        <td className="pg-td" style={{ textAlign: 'right' }}>
                          <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 13, color: '#16a34a' }}>
                            ₹ {((job.rateperSQFT || 0) * (job.totalAreaSQFT || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="pg-td" style={{ textAlign: 'center' }}>
                          {myTasks.length > 0 ? (
                            <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700 }}>
                              <span style={{ color: submittedCnt === myTasks.length ? '#16a34a' : '#4a5568' }}>{submittedCnt}</span>
                              <span style={{ color: '#b0b0c8' }}>/{myTasks.length}</span>
                              <div style={{ fontSize: 10, color: '#9090a8', marginTop: 1 }}>submitted</div>
                            </div>
                          ) : (
                            <span style={{ color: '#c0c0d8', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td className="pg-td">
                          <JobStatusBadge status={currentStatus} />
                        </td>
                        <td className="pg-td">
                          <div className="pg-action-wrap">
                            {/* View Photos */}
                            <button className="pg-btn-view" onClick={() => setPhotosViewTarget(job)} title="View Photos" style={{ background: 'rgba(4,158,223,0.08)', color: '#049edf' }}>
                              <Camera size={13} />
                            </button>

                            {/* Generate Job PDF - Shown only when Completed or Submitted */}
                            {isPdfEligible && (
                              <button
                                className="pg-btn-view"
                                onClick={async () => {
                                  const jobTasks = getMyTasks(job.jobRequestID).map(jt => {
                                    const h = hoardings.find(hh => hh.hoardingID === jt.hoardingID);
                                    return {
                                      jobTaskID: jt.jobTaskID,
                                      hoardingID: jt.hoardingID,
                                      hoardingCode: h?.hoardingCode || '',
                                      siteAddress: getSiteAddress(h),
                                      size: h ? `${h.width} X ${h.height}` : '',
                                      sqFt: h ? (h.width * h.height) : 0,
                                      status: jt.status,
                                    };
                                  });
                                  const contract = contracts.find(c => Number(c.customerContractID) === Number(job.customerContractID));
                                  const companyID = contract?.companyID ? Number(contract.companyID) : 0;
                                  let compRecord = companies.find(c => Number(c.companyID) === companyID);

                                  if (!compRecord && companyID) {
                                    try {
                                      const res = await apiService.getCompanyDetailsById(companyID);
                                      const raw = res?.data ?? res;
                                      if (raw) compRecord = normalizeCompany(raw);
                                    } catch (e) {
                                      console.warn('Failed to fetch company details by ID:', companyID, e);
                                    }
                                  }

                                  if (!compRecord && companies.length > 0) {
                                    compRecord = companies[0];
                                  }

                                  const companyInfo = getCompanyInfo(compRecord);

                                  const html = buildJobPDFHTML({
                                    company: companyInfo,
                                    job,
                                    customerName: custName(job.customerID),
                                    supervisorName: supName(job.supervisorID),
                                    tasks: jobTasks,
                                    attachments: allAttachments,
                                    hoardings,
                                    hoardingMerges,
                                  });
                                  const win = window.open('', '_blank');
                                  if (win) { win.document.write(html); win.document.close(); }
                                  else alert('Popup blocked. Please allow popups for this site and try again.');
                                }}
                                title="Generate Job PDF"
                                style={{ background: 'rgba(108,99,255,0.08)', color: '#6c63ff' }}
                              >
                                <FileText size={13} />
                              </button>
                            )}

                            {/* Edit */}
                            <button className="pg-btn-view" onClick={() => handleEdit(job)} title="Edit">
                              <Edit2 size={13} />
                            </button>

                            {/* Complete — green ✅ for non-completed jobs */}
                            {job.jobStatus !== 'Completed' && (
                              <button
                                onClick={() => {
                                  if (completing) return;
                                  const jobTasks = getMyTasks(job.jobRequestID).map(jt => {
                                    const h = hoardings.find(hh => hh.hoardingID === jt.hoardingID);
                                    return {
                                      jobTaskID: jt.jobTaskID,
                                      hoardingID: jt.hoardingID,
                                      hoardingCode: h?.hoardingCode || '',
                                      siteAddress: getSiteAddress(h),
                                      status: jt.status,
                                    };
                                  });
                                  setCompleteTarget({ job, tasks: jobTasks });
                                }}
                                disabled={completing}
                                title="Mark as Completed"
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: 30, height: 30, borderRadius: 8,
                                  border: '1.5px solid rgba(22,163,74,0.30)',
                                  background: completing ? '#f4f4fb' : 'rgba(22,163,74,0.08)',
                                  color: completing ? '#c0c0d8' : '#16a34a',
                                  cursor: completing ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.15s',
                                  pointerEvents: completing ? 'none' : 'auto',
                                }}
                                onMouseEnter={e => {
                                  if (completing) return;
                                  e.currentTarget.style.background = 'rgba(22,163,74,0.18)';
                                  e.currentTarget.style.borderColor = '#16a34a';
                                }}
                                onMouseLeave={e => {
                                  if (completing) return;
                                  e.currentTarget.style.background = 'rgba(22,163,74,0.08)';
                                  e.currentTarget.style.borderColor = 'rgba(22,163,74,0.30)';
                                }}
                              >
                                {completing ? <Loader2 size={13} className="pg-spin" /> : '✅'}
                              </button>
                            )}

                            {/* Static completed indicator */}
                            {job.jobStatus === 'Completed' && (
                              <span title="Completed" style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 30, height: 30, borderRadius: 8,
                                background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.20)',
                                fontSize: 14,
                              }}>✅</span>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {sorted.length > pageSize && (
              <div className="pg-pagination">
                <div className="pg-pagination__left">
                  <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
                  <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
                  {pageNums.map((p, i) => p === '…'
                    ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span>
                    : <button key={p} className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  )}
                  <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></button>
                  <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={13} /></button>
                </div>
                <div className="pg-pagination__right">
                  <select className="pg-pagesize-select" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                    {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span className="pg-pagination__text">Items per page</span>
                  <span className="pg-pagination__text">{page} of {totalPages} pages ({sorted.length} items)</span>
                </div>
              </div>
            )}

          </div>
        )}
      </div>


      {/* ── Hoarding selector modal ── */}
      {showHoardModal && (
        <HoardingSelectModal
          hoardings={availableHoardings}
          filteredHoardingIds={filteredHoardingIds}
          existingIds={existingTaskHoardingIds}
          onAdd={handleAddHoardings}
          onClose={() => setShowHoardModal(false)}
          anyIdToLatestId={anyIdToLatestId}
          hoardingMerges={hoardingMerges}
        />
      )}
      {/* ── Task Photo Modal ── */}
      {photoModalTask && (
        <TaskPhotoModal
          task={photoModalTask}
          jobRequestID={editingJobID}
          attachments={allAttachments}
          onClose={() => setPhotoModalTask(null)}
          showToast={showToast}
          onUploaded={async () => {
            await refreshAttachments();
            await refreshJobs();
          }}
          isCompleted={jobStatus === 'Completed'}
          onStatusChange={(taskIDs, newStatus) => {
            setTasks(prev => prev.map(t => {
              if (taskIDs.includes(Number(t.jobTaskID))) {
                return { ...t, status: newStatus, submitDttm: null };
              }
              return t;
            }));
          }}
        />
      )}
      {/* ── Compulsory Submit Photo Modal ── */}
      {submitTaskTarget && (
        <SubmitTaskPhotoModal
          task={submitTaskTarget}
          jobRequestID={editingJobID}
          onClose={() => setSubmitTaskTarget(null)}
          onSubmitted={async () => {
            const taskIDs = submitTaskTarget.tasks
              ? submitTaskTarget.tasks.map(t => Number(t.jobTaskID))
              : [Number(submitTaskTarget.jobTaskID)];
            setTasks(prev => prev.map(t => {
              if (taskIDs.includes(Number(t.jobTaskID))) {
                return { ...t, status: 'Submitted', submitDttm: new Date().toISOString() };
              }
              return t;
            }));
            await refreshJobs();
          }}
          showToast={showToast}
        />
      )}
      {/* ── Job Photos View Modal ── */}
      {photosViewTarget && (
        <JobPhotosViewModal
          job={photosViewTarget}
          tasks={getMyTasks(photosViewTarget.jobRequestID)}
          hoardings={hoardings}
          attachments={allAttachments}
          hoardingMerges={hoardingMerges} // ✅ MODIFIED: Pass hoardingMerges to view combined photos/dropdowns
          onClose={() => setPhotosViewTarget(null)}
        />
      )}
      {completeTarget && (
        <CompleteJobModal
          job={completeTarget.job}
          tasks={completeTarget.tasks}
          allHoardings={hoardings}
          hoardingMerges={hoardingMerges}
          attachments={allAttachments}
          onConfirm={handleComplete}
          onCancel={() => !completing && setCompleteTarget(null)}
          completing={completing}
        />
      )}
      {deleteConfirmTarget && (
        <JobTaskDeleteConfirmModal
          title={deleteConfirmTarget.type === 'merged' ? 'Remove Merged Tasks' : 'Remove Hoarding Task'}
          message={deleteConfirmTarget.message}
          onConfirm={() => {
            if (deleteConfirmTarget.type === 'merged') {
              deleteConfirmTarget.tasks.forEach(t => deleteTask(t._id));
            } else {
              deleteTask(deleteConfirmTarget.task._id);
            }
            setDeleteConfirmTarget(null);
          }}
          onClose={() => setDeleteConfirmTarget(null)}
        />
      )}
      {pendingContract && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999999,
          background: 'rgba(15,23,42,0.58)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            maxWidth: 420,
            width: '90%',
            background: '#fff',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
            fontFamily: 'Nunito,sans-serif',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg,#e08a00,#f5b041)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              textAlign: 'center',
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                border: '2px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                color: '#fff',
              }}>
                ⚠️
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 19, color: '#fff', marginBottom: 4 }}>
                  Banner Not Available
                </div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>
                  Contract #{pendingContract.customerContractID}
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 14.5, color: '#2d3748', lineHeight: 1.6, fontWeight: 700 }}>
                This contract does not have a <span style={{ color: '#e08a00', fontWeight: 900 }}>Banner Design</span> uploaded.
              </p>
              <p style={{ margin: '10px 0 0 0', fontSize: 13, color: '#718096', lineHeight: 1.5, fontWeight: 600 }}>
                Do you still want to proceed?
              </p>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 12, padding: '0 24px 24px 24px' }}>
              <button
                onClick={() => {
                  setSelectedContract(null);
                  setPendingContract(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 12,
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                No, Cancel
              </button>
              <button
                onClick={() => {
                  setSelectedContract(pendingContract);
                  setPendingContract(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  border: 'none',
                  borderRadius: 12,
                  background: '#e08a00',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(224,138,0,0.25)',
                }}
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
      {validationAlert && (
        <ValidationAlertModal
          isOpen={!!validationAlert}
          onClose={() => setValidationAlert(null)}
          contractStartDate={validationAlert.contractStartDate}
          targetDate={validationAlert.targetDate}
          reason={validationAlert.reason}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════
   JOB TASK DELETE CONFIRM MODAL
 ═══════════════════════════════════════════ */
function JobTaskDeleteConfirmModal({ title, message, onConfirm, onClose }) {
  return ReactDOM.createPortal(
    <div className="pg-overlay" style={{ zIndex: 99999 }}>
      <div className="pg-modal" style={{ maxWidth: 450, padding: 0 }}>
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap" style={{ background: 'rgba(220,38,38,0.10)' }}>
              <Trash2 size={20} color="#dc2626" />
            </div>
            <div>
              <h5 className="pg-modal__title" style={{ color: '#1a1a2e' }}>{title || 'Confirm Delete'}</h5>
              <p className="pg-modal__subtitle">This action cannot be undone</p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ padding: '24px', fontFamily: 'Nunito,sans-serif', fontSize: 13.5, color: '#4a5568', lineHeight: 1.5 }}>
          {message}
        </div>

        <div className="pg-modal__foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f8f8fd' }}>
          <button className="pg-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{
              padding: '9px 20px', borderRadius: 9, border: 'none',
              background: '#dc2626', color: '#fff', cursor: 'pointer',
              fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800,
              boxShadow: '0 4px 12px rgba(220,38,38,0.2)'
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}