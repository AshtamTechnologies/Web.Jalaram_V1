import React, {
  useState, useEffect, useCallback, useMemo,
  useRef, useLayoutEffect,
} from 'react';
import ReactDOM from 'react-dom';
// AFTER  — added AlertTriangle
import {
  Plus, Trash2, FileText, X, Search, Loader2,
  Printer, Building2, ChevronDown, Check,
  AlertCircle, AlertTriangle, RefreshCw, ChevronsLeft, ChevronsRight,
  ChevronLeft, ChevronRight, ChevronUp, Edit2,
  Filter, List, User, ArrowRight, ArrowLeft,
  FileCheck, Settings, Users, Hash, Calendar,
  Eye, Download, LayoutGrid, CheckSquare, Square,
  CheckCircle2, Link2, MapPin,
} from 'lucide-react';
import { apiService } from '../api/api';
import { useResizableColumns } from '../hooks/useResizableColumns';
import "./Common1.css";

/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */
const COMPANY = {
  name: 'JALARAM AD',
  line1: '9/B/1, Industrial Estate, Opp. Real Bakers, Nr.Borsad Crossing',
  line2: 'Jitodiya Road, Anand - 388001. Parag Patel # 7383999444',
  gstin: '24AAMFJ0339H2ZG',
  pan: 'AAMFJ0339H',
  bank: 'AXIS BANK',
  branch: 'GRID CHOKDI, ANAND',
  account: '920020035728954',
  ifsc: 'UTIB0003220',
  signatory: 'P.C.Pradep',
};

const ROWS_PER_PRINT_PAGE = 13;
const PAGE_SIZE_OPTIONS = [5, 10, 15, 20];
function parseOccupancyError(err) {
  const status = err?.response?.status;
  // Accept any 4xx error (400, 409 Conflict, 422 Unprocessable, etc.)
  if (!status || status < 400 || status >= 500) return null;

  const raw =
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    err?.response?.data?.errors ||
    err?.response?.data ||
    err?.message ||
    '';
  const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const lower = str.toLowerCase();

  if (
    lower.includes('occupied') ||
    lower.includes('already book') ||
    lower.includes('conflict') ||
    lower.includes('overlaps')
  ) {
    return str.trim();
  }
  return null;
}

// ── component ── (needs AlertTriangle, X from lucide — already imported)
function OccupancyWarningBanner({ messages, onDismiss }) {
  if (!messages || messages.length === 0) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '13px 16px', borderRadius: 12, marginBottom: 14,
      background: '#fffbeb', border: '1.5px solid #fbbf24',
      boxShadow: '0 2px 10px rgba(251,191,36,0.15)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'rgba(251,191,36,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertTriangle size={18} color="#d97706" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 900, color: '#92400e', marginBottom: messages.length > 1 ? 6 : 2 }}>
          {messages.length === 1 ? 'Hoarding Already Occupied' : `${messages.length} Hoardings Already Occupied`}
        </div>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, color: '#b45309', lineHeight: 1.5, marginTop: i > 0 ? 4 : 0 }}>
            {messages.length > 1 && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#d97706', marginTop: 7, flexShrink: 0 }} />}
            {msg}
          </div>
        ))}
        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 600, color: '#a16207', marginTop: 6 }}>
          Please choose a different date range or remove these hoardings.
        </div>
      </div>
      <button onClick={onDismiss} style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#d97706' }}>
        <X size={13} />
      </button>
    </div>
  );
}
const STEPS = [
  { n: 1, label: 'Customer & Type', Icon: Users },
  { n: 2, label: 'Add Hoardings', Icon: Building2 },
  { n: 3, label: 'GST & Generate', Icon: FileCheck },
];

const SITE_PASTEL_PALETTE = [
  { bg: '#FFF0EE', border: '#FFBCB3', dot: '#FF6B55' },
  { bg: '#EEF4FF', border: '#B3CCFF', dot: '#3B7FFF' },
  { bg: '#EDFFF2', border: '#AAFFBB', dot: '#1FBF4A' },
  { bg: '#FFFBEE', border: '#FFE5AA', dot: '#F5A623' },
  { bg: '#F7EEFF', border: '#D9AAFF', dot: '#9B3FFF' },
  { bg: '#EEFFFA', border: '#AAFFD6', dot: '#0DC88E' },
  { bg: '#FFFEEE', border: '#FFEFAA', dot: '#D4B800' },
  { bg: '#FFECFD', border: '#FFAAEE', dot: '#E020CC' },
  { bg: '#EEF9FF', border: '#AADEEF', dot: '#009DBF' },
  { bg: '#F2FFEE', border: '#C3FFAA', dot: '#46A800' },
];

const PAYMENT_FREQ_FALLBACK = [
  { value: 1, label: 'Monthly' },
  { value: 2, label: 'Quarterly' },
  { value: 3, label: 'Half-Yearly' },
  { value: 4, label: 'Yearly' },
];
const PRINTING_TYPES = [
  'Flex Banner Printing',
  'Black Back Printing',
  'Star Black Back Printing',
  'Backlit Printing',
  'Retro Flex Printing',
];
/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
const uid = () => Math.random().toString(36).substr(2, 9);
const todayISO = () => new Date().toISOString().split('T')[0];

const fmtCurrency = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDateFull = (d) => {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtDateShort = (d) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getFullYear()).slice(-2)}`;
};

const fmtDateDisplay = (d) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const addMonths = (dateStr, months) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + Math.max(0, Number(months) - 1));
  d.setMonth(d.getMonth() + 1, 0);
  return d.toISOString().split('T')[0];
};
function calcAmountByDates(startDate, endDate, monthlyRent) {
  if (!startDate || !endDate || !monthlyRent) return Number(monthlyRent) || 0;
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  if (end < start) return Number(monthlyRent) || 0;

  const startDay = start.getDate();
  const endDay = end.getDate();
  const endLastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();

  if (startDay === 1 && endDay === endLastDay) {
    // Full calendar months
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) + 1;
    return Math.round(months * Number(monthlyRent) * 100) / 100;
  }

  // Partial span — daily rate
  const days = Math.round((end - start) / 86400000) + 1; // inclusive
  const dailyRate = Number(monthlyRent) / 30;
  return Math.round(days * dailyRate * 100) / 100;
}

/**
 * calcNOSFromDates
 * Returns whole months for full-month spans, decimal months otherwise.
 */
function calcNOSFromDates(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  if (end < start) return 1;

  const startDay = start.getDate();
  const endDay = end.getDate();
  const endLastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();

  if (startDay === 1 && endDay === endLastDay) {
    return (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) + 1;
  }

  const days = Math.round((end - start) / 86400000) + 1;
  return Math.round((days / 30) * 100) / 100;
}
function checkHoardingDateConflicts(rows, allContracts, allContractMaps, customers) {
  const conflicts = [];
  const seen = new Set();

  for (const row of rows) {
    if (row.rowType === 'merged' || row.rowType === 'printing') continue;
    if (!row.hoardingID || !row.startDate || !row.endDate) continue;

    const rowStart = new Date(row.startDate);
    const rowEnd = new Date(row.endDate);

    const mappings = allContractMaps.filter(m =>
      Number(m.hoardingID ?? m.HoardingID) === Number(row.hoardingID)
    );

    for (const mapping of mappings) {
      const contractID = Number(
        mapping.customerContractID ?? mapping.CustomerContractID ?? 0
      );
      if (!contractID) continue;

      const contract = allContracts.find(c =>
        Number(c.customerContractID) === contractID
      );
      if (!contract) continue;
      if (contract.status === 'Expired' || contract.status === 'Terminated') continue;

      const cStart = new Date(contract.startDate);
      const cEnd = new Date(contract.endDate);

      // Overlap: rowStart ≤ cEnd  AND  rowEnd ≥ cStart
      if (rowStart <= cEnd && rowEnd >= cStart) {
        const key = `${row.hoardingID}-${contractID}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const customer = customers.find(c =>
          Number(c.customerID) === Number(contract.customerID)
        );
        conflicts.push({
          hoardingID: row.hoardingID,
          hoardingCode: row.hoardingCode || `#${row.hoardingID}`,
          rowStart: row.startDate,
          rowEnd: row.endDate,
          contractID,
          contractStart: contract.startDate,
          contractEnd: contract.endDate,
          customerName: customer?.customerName || `Customer #${contract.customerID}`,
          status: contract.status,
        });
      }
    }
  }
  return conflicts;
}
function numberToWords(n) {
  n = Math.round(Math.abs(n));
  if (!n) return 'Zero Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x) => x < 20 ? ones[x] : tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '');
  const three = (x) => x < 100 ? two(x) : ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + two(x % 100) : '');
  let w = '';
  if (Math.floor(n / 10000000)) w += two(Math.floor(n / 10000000)) + ' Crore ';
  if (Math.floor((n % 10000000) / 100000)) w += two(Math.floor((n % 10000000) / 100000)) + ' Lakh ';
  if (Math.floor((n % 100000) / 1000)) w += two(Math.floor((n % 100000) / 1000)) + ' Thousand ';
  if (n % 1000) w += three(n % 1000);
  return w.trim() + ' Only';
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
    customerID: raw.customerID ?? raw.CustomerID ?? raw.id ?? raw.Id ?? 0,
    customerName: raw.customerName ?? raw.CustomerName ?? '',
    addressLine1: raw.addressLine1 ?? raw.AddressLine1 ?? '',
    addressLine2: raw.addressLine2 ?? raw.AddressLine2 ?? '',
    addressLine3: raw.addressLine3 ?? raw.AddressLine3 ?? '',
    city: raw.city ?? raw.City ?? '',
    district: raw.district ?? raw.District ?? '',
    country: 'India',
    phone1: raw.phone1 ?? raw.Phone1 ?? '',
    phone2: raw.phone2 ?? raw.Phone2 ?? '',
    gstNumber: raw.gstNumber ?? raw.GstNumber ?? raw.gSTNumber ?? '',
    authorizedName: raw.authorizedName ?? raw.AuthorizedName ?? '',
  };
}

function normalizeQuotation(raw) {
  return {
    quotationID: raw.quotationID ?? raw.QuotationID ?? 0,
    quotationRevisionNumber: raw.quotationRevisionNumber ?? raw.QuotationRevisionNumber ?? 0,
    customerID: raw.customerID ?? raw.CustomerID ?? 0,
    quotationNumber: raw.quotationNumber ?? raw.QuotationNumber ?? '',
    quotationDate: (raw.quotationDate ?? raw.QuotationDate ?? '').split('T')[0],
    cGSTPercent: raw.cGSTPercent ?? raw.CGSTPercent ?? 9,
    cGSTAmount: raw.cGSTAmount ?? raw.CGSTAmount ?? 0,
    sGSTPercent: raw.sGSTPercent ?? raw.SGSTPercent ?? 9,
    sGSTAmount: raw.sGSTAmount ?? raw.SGSTAmount ?? 0,
    totalAmount: raw.totalAmount ?? raw.TotalAmount ?? 0,
  };
}

function normalizeQuotLine(raw) {
  return {
    quotationLineNumber: raw.quotationLineNumber ?? raw.QuotationLineNumber ?? 0,
    quotationID: raw.quotationID ?? raw.QuotationID ?? 0,
    quotationRevisionNumber: raw.quotationRevisionNumber ?? raw.QuotationRevisionNumber ?? 0,
    hoardingID: raw.hoardingID ?? raw.HoardingID ?? 0,
    purpose: raw.purpose ?? raw.Purpose ?? '',
    periodBeginDate: (raw.periodBeginDate ?? raw.PeriodBeginDate ?? '').split('T')[0],
    periodEndDate: (raw.periodEndDate ?? raw.PeriodEndDate ?? '').split('T')[0],
    rentAmount: raw.rentAmount ?? raw.RentAmount ?? 0,
    mergeFlag: raw.mergeFlag ?? raw.MergeFlag ?? false,
  };
}
// Normalize siteID to number for consistent Map keys
const toSID = (val) => {
  const n = Number(val);
  return (!isNaN(n) && n > 0) ? n : null;
};
const isAvailable = (h) => {
  if (typeof h.status === 'boolean') return h.status;
  if (typeof h.status === 'string') return ['available', 'active'].includes(h.status.toLowerCase());
  return false;
};

function parseSize(sizeStr) {
  const parts = (sizeStr || '').split(/[Xx×\s]+/).map(p => parseFloat(p.trim())).filter(n => !isNaN(n) && n > 0);
  return { w: parts[0] || 0, h: parts[1] || 0 };
}



// AFTER — collect UNIQUE siteIDs from BOTH sources, deduplicated
function buildSiteColorMap(hoardings, sites = []) {
  const map = new Map();
  let idx = 0;

  // Seed from hoardings FIRST — these siteIDs are confirmed correct
  for (const h of hoardings) {
    const sid = toSID(h.siteID);
    if (sid != null && !map.has(sid)) {
      map.set(sid, SITE_PASTEL_PALETTE[idx % SITE_PASTEL_PALETTE.length]);
      idx++;
    }
  }

  // Fill any remaining site IDs not already covered
  for (const s of sites) {
    const sid = toSID(s.siteID ?? s.SiteID);
    if (sid != null && !map.has(sid)) {
      map.set(sid, SITE_PASTEL_PALETTE[idx % SITE_PASTEL_PALETTE.length]);
      idx++;
    }
  }

  return map;
}
function normalizeSite(raw) {
  if (!raw) return null;
  return {
    siteID: raw.siteID ?? raw.SiteID ?? 0,
    addressLine1: raw.addressLine1 ?? raw.AddressLine1 ?? '',
    addressLine2: raw.addressLine2 ?? raw.AddressLine2 ?? '',
    addressLine3: raw.addressLine3 ?? raw.AddressLine3 ?? '',
    landmark: raw.landmark ?? raw.Landmark ?? '',
    city: raw.city ?? raw.City ?? '',
    district: raw.district ?? raw.District ?? '',
    siteType: raw.siteType ?? raw.SiteType ?? '',
    country: raw.country ?? raw.Country ?? '',
    ownerID: raw.ownerID ?? raw.OwnerID ?? 0,
  };
}

function buildSiteAddress(site, fallback = '') {
  if (!site) return fallback;
  const addrParts = [site.addressLine1, site.addressLine2, site.addressLine3].filter(Boolean);
  const cityPart = [site.city, site.district].filter(Boolean).join(', ');
  const full = [...addrParts, cityPart].filter(Boolean).join(', ');
  return full || fallback;
}

function getSiteDisplayLines(site, fallback = '') {
  if (!site) return { line1: fallback, line2: '' };

  const addrParts = [site.addressLine1, site.addressLine2, site.addressLine3]
    .filter(Boolean);
  const cityDistrict = [site.city, site.district].filter(Boolean).join(', ');

  // Primary address: use explicit address lines if present, else city/district
  const line1 = addrParts.length > 0
    ? addrParts.join(', ')
    : cityDistrict || fallback;

  // Secondary line: landmark · city/district (only when line1 didn't already use them)
  const line2Parts = [];
  if (site.landmark) line2Parts.push(`Nr. ${site.landmark}`);
  // Include city/district in line2 only when we had actual address lines in line1
  if (addrParts.length > 0 && cityDistrict) line2Parts.push(cityDistrict);
  if (site.siteType) line2Parts.push(site.siteType);

  return { line1, line2: line2Parts.join(' · ') };
}

function getSiteAddress(h) {
  return buildSiteAddress(h?.site, h?.hoardingCode || '');
}

const newHoardingRow = (h = null, globalStart = '', globalEnd = '', siteMap = null) => {
  const rawSiteID = toSID(h?.siteID ?? h?.site?.siteID ?? h?.site?.SiteID);
  const site = h?.site
    ? normalizeSite(h.site)
    : (rawSiteID != null ? (siteMap?.get(rawSiteID) ?? null) : null);
  const siteID = toSID(site?.siteID) ?? rawSiteID ?? null;



  return {
    _id: uid(),
    rowType: 'hoarding',
    hoardingID: h?.hoardingID || 0,
    siteID,
    siteObj: site,
    location: buildSiteAddress(site, h?.hoardingCode || ''),
    hoardingCode: h?.hoardingCode || '',
    size: h ? `${h.width} X ${h.height}` : '',
    sqFt: h ? (h.width * h.height) : 0,
    nos: 1,
    startDate: globalStart || '',
    endDate: globalEnd || '',
    ratePerMonth: h?.monthlyRent || 0,
    amount: h?.monthlyRent || 0,
    printingCost: 0,
    quotationLineNumber: 0,
    saved: false,
  };
};

const newPrintingRow = (label = 'Flex Banner Printing') => ({
  _id: uid(),
  rowType: 'printing',
  hoardingID: 0,
  siteID: null,
  location: label,
  hoardingCode: '',
  size: '',
  sqFt: 0,
  nos: 1,
  startDate: '',
  endDate: '',
  ratePerMonth: 8,
  amount: 0,
  printingCost: 0,
  quotationLineNumber: 0,
  saved: false,
});
const newExtraChargeRow = () => ({
  _id: uid(),
  rowType: 'extra',
  hoardingID: 0,
  siteID: null,
  location: 'Extra Charge',
  hoardingCode: '',
  size: '',
  sqFt: 0,
  nos: 1,
  startDate: '',
  endDate: '',
  ratePerMonth: 0,
  amount: 0,
  printingCost: 0,
  quotationLineNumber: 0,
  saved: false,
});
function newMergedRow(rowsArr, direction) {
  const sizes = rowsArr.map(r => parseSize(r.size));
  const gaps = Math.max(rowsArr.length - 1, 1); // at least 1 gap

  let mw, mh;
  if (direction === 'H') {
    mw = sizes.reduce((s, sz) => s + sz.w, 0) + gaps;   // sum widths + gaps
    mh = Math.max(...sizes.map(s => s.h));               // tallest height
  } else {
    mw = Math.max(...sizes.map(s => s.w));               // widest width
    mh = sizes.reduce((s, sz) => s + sz.h, 0) + gaps;   // sum heights + gaps
  }

  const sqFt = mw * mh;
  const combinedRate = rowsArr.reduce((s, r) => s + Number(r.ratePerMonth || 0), 0);
  const combinedAmt = rowsArr.reduce((s, r) => s + Number(r.amount || 0), 0);

  return {
    _id: uid(),
    rowType: 'merged',
    isMerged: true,
    mergeDirection: direction,
    mergedFromIds: rowsArr.map(r => r._id),
    mergedHoardingIDs: rowsArr.map(r => Number(r.hoardingID) || 0).filter(id => id > 0),
    hoardingID: 0,
    siteID: null,
    location: rowsArr.map(r => r.location).join(' + '),
    hoardingCode: rowsArr.map(r => r.hoardingCode || '').join(' + '),
    size: `${mw} X ${mh}`,
    sqFt,
    nos: 1,
    startDate: rowsArr[0]?.startDate || '',
    endDate: rowsArr[0]?.endDate || '',
    ratePerMonth: combinedRate,
    amount: combinedAmt,
    printingCost: 0,
    quotationLineNumber: 0,
    saved: false,
  };
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
   CUSTOMER COMBO
═══════════════════════════════════════════ */
function CustomerCombo({ value, onChange, customers }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null); const triggerRef = useRef(null);
  const panelRef = useRef(null); const inputRef = useRef(null); const listRef = useRef(null);
  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);
  useOutsideClick(wrapRef, panelRef, open, close);

  const selected = customers.find(c => String(c.customerID) === String(value));
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q ? customers.filter(c =>
      (c.customerName || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q) ||
      (c.district || '').toLowerCase().includes(q)
    ) : customers;
  }, [customers, query]);

  const openDD = () => { setOpen(true); setQuery(''); setTimeout(() => inputRef.current?.focus(), 0); };
  const select = (c) => { onChange(c); setOpen(false); setQuery(''); };
  const clear = (e) => { e.stopPropagation(); onChange(null); setOpen(false); setQuery(''); };
  const nav = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx = Array.from(items || []).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') close();
  };

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        ref={triggerRef}
        className="pg-field-wrap pg-combo-trigger pg-field-wrap--normal"
        onClick={openDD} tabIndex={0}
        onKeyDown={e => { if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDD(); } } else nav(e); }}
      >
        <User size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
        <span className={`pg-combo-display${!selected ? ' pg-combo-display--placeholder' : ''}`}>
          {selected ? selected.customerName : customers.length === 0 ? 'Loading customers…' : 'Select customer…'}
        </span>
        {selected ? <X size={13} className="pg-combo-clear" onClick={clear} /> : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position: 'static' }}>
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input ref={inputRef} className="pg-combo-search__input" placeholder="Search by name or city…" value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); listRef.current?.querySelectorAll('.pg-combo-option')?.[0]?.focus(); } else if (e.key === 'Escape') close(); }}
            />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
          </div>
          <div className="pg-combo-list" ref={listRef}>
            {filtered.length === 0
              ? <div className="pg-combo-empty">No customers found</div>
              : filtered.map(c => (
                <div key={c.customerID}
                  className={`pg-combo-option${String(c.customerID) === String(value) ? ' pg-combo-option--active' : ''}`}
                  onClick={() => select(c)} tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(c); } else nav(e); }}
                >
                  <div style={{ flex: 1 }}>
                    <span className="pg-combo-option__name">{c.customerName}</span>
                    <span className="pg-combo-option__id">{[c.city, c.district].filter(Boolean).join(', ')}</span>
                  </div>
                  {String(c.customerID) === String(value) && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                </div>
              ))}
          </div>
        </div>
      </PortalDropdown>
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
   PDF BUILDER
═══════════════════════════════════════════ */
function buildPrintHTML({ rows, withPrinting, selectedCustomer, quotNo, quotDate,
  revisionNo, cgstPct, sgstPct, subTotal, cgstAmt, sgstAmt,
  roundOff, finalTotal, selectedTerms, termsTexts,
  docNoLabel = 'Quotation No.', docNoValue = null }) {   

  const pages = rows.length === 0 ? [[]] : [];
  for (let i = 0; i < rows.length; i += ROWS_PER_PRINT_PAGE) pages.push(rows.slice(i, i + ROWS_PER_PRINT_PAGE));

  let run = 0;
  const pageRun = pages.map(pg => { run += pg.reduce((s, r) => s + Number(r.amount || 0), 0); return run; });

  const stdCols = 6;
  const prtCols = 7;
  const nCols = withPrinting ? prtCols : stdCols;

  const upiStr = `upi://pay?pa=${COMPANY.account}@axisbank&pn=JALARAM+AD&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiStr)}&size=100x100&bgcolor=ffffff&color=000000&ecc=M`;

  const css = `
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#000;background:#fff;}
.page{width:210mm;padding:7mm 10mm 5mm 10mm;page-break-after:always;}
.page:last-child{page-break-after:avoid;}
.co-hdr{text-align:center;border:1px solid #000;border-bottom:none;padding:5px 8px 4px;}
.co-name{font-size:17px;font-weight:bold;letter-spacing:.5px;}
.co-addr{font-size:10px;margin-top:2px;}
.doc-row{display:flex;border:1px solid #000;border-bottom:none;}
.dleft{padding:3px 8px;border-right:1px solid #000;font-weight:bold;width:28%;font-size:11px;}
.dctr{flex:1;text-align:center;padding:3px 8px;font-size:13px;font-weight:bold;letter-spacing:1px;}
.dright{padding:3px 8px;border-left:1px solid #000;width:18%;text-align:right;font-weight:bold;font-size:11px;}
.cust-row{border:1px solid #000;border-bottom:none;display:flex;}
.cleft{padding:6px 8px;flex:1;border-right:1px solid #000;font-size:10.5px;line-height:1.5;}
.cright{padding:5px 8px;width:200px;}
.cright table{width:100%;border-collapse:collapse;}
.cright td{padding:2px 2px;font-size:10.5px;vertical-align:top;}
.clbl{white-space:nowrap;font-weight:bold;width:88px;}
.itbl{width:100%;border-collapse:collapse;border:1px solid #000;}
.itbl th{border:1px solid #000;padding:4px 5px;font-size:10px;background:#f0f0f0;text-align:center;font-weight:bold;line-height:1.3;}
.itbl td{border:1px solid #000;padding:3px 5px;font-size:10.5px;vertical-align:middle;}
.c{text-align:center;}.r{text-align:right;}.l{text-align:left;}
.bf td{font-weight:bold;background:#f5f5f5;}
.cf td{font-weight:bold;background:#f0f0f0;font-size:11px;}
.erow{height:21px;}
.merged-tag{display:inline-block;font-size:8.5px;font-weight:bold;color:#6a22c0;background:#f0e8ff;border:1px solid #d4aaff;border-radius:3px;padding:1px 5px;margin-bottom:2px;}
.fwrap{border:1px solid #000;border-top:none;}
.f-words-row{display:flex;border-top:1px solid #000;}
.f-words{flex:1;padding:5px 8px;border-right:1px solid #000;font-size:10.5px;line-height:1.6;}
.f-totals{width:220px;padding:4px 8px;}
.f-totals table{width:100%;border-collapse:collapse;}
.f-totals td{padding:2px 3px;font-size:10.5px;}
.gr{text-align:right;}
.f-grand td{font-weight:bold;font-size:11.5px;border-top:1px solid #000;padding-top:3px;}
.f-main-row{display:flex;border-top:1px solid #000;}
.f-bank{flex:1;padding:5px 8px;border-right:1px solid #000;font-size:10px;line-height:1.7;}
.f-qr{width:110px;border-right:1px solid #000;display:flex;align-items:center;justify-content:center;padding:5px;}
.f-sig{width:165px;padding:5px 8px;text-align:right;font-size:10px;display:flex;flex-direction:column;}
.f-sig-company{font-weight:bold;font-size:11px;margin-bottom:40px;}
.f-sig-name{font-size:10px;}
.f-grand-box{border-top:1px solid #000;margin-top:5px;padding-top:4px;display:flex;justify-content:space-between;align-items:center;}
.f-grand-lbl{font-size:10.5px;font-weight:bold;}
.f-grand-val{font-size:12px;font-weight:bold;}
.f-blank{display:inline-block;min-width:200px;border-bottom:1px solid #bbb;}
.f-terms{padding:5px 8px;border-top:1px solid #000;font-size:10px;line-height:1.6;}
.f-eoe{padding:3px 8px;border-top:1px solid #000;font-size:10px;display:flex;justify-content:space-between;}
@media print{body{margin:0;}.page{padding:7mm 10mm 5mm 10mm;width:100%;}}
@page{size:A4;margin:0;}
`;

  const renderHdr = (pgIdx) => {
    const first = pgIdx === 0;
    const c = selectedCustomer;
    return `
<div class="co-hdr">
  <div class="co-name">${COMPANY.name}</div>
  <div class="co-addr">${COMPANY.line1}</div>
  <div class="co-addr">${COMPANY.line2}</div>
</div>
<div class="doc-row">
  <div class="dleft">Debit Memo</div>
  <div class="dctr">QUOTATION</div>
  <div class="dright">Original</div>
</div>
<div class="cust-row">
  <div class="cleft">
    <span style="font-size:9.5px;color:#555;">M/s. :</span><br>
    <strong style="font-size:11px;">${c?.customerName || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</strong>
    ${first && c?.addressLine1 ? `<br>${c.addressLine1}` : ''}
    ${first && c?.city ? `<br>${[c.city, c.district].filter(Boolean).join(', ')}` : ''}
    ${first && c?.gstNumber ? `<br><span style="font-size:10px;"><strong>GSTIN :</strong> ${c.gstNumber}</span>` : ''}
    ${first ? `<br><span style="font-size:10px;"><strong>PAN No :</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>` : ''}
  </div>
  <div class="cright">
    <table>
      <tr><td class="clbl">${docNoLabel}</td><td>: ${docNoValue ?? `${quotNo}${Number(revisionNo) > 1 ? ` Rev.${revisionNo}` : ''}`}</td></tr>
      <tr><td class="clbl">Date</td><td>: ${fmtDateFull(quotDate)}</td></tr>
      <tr><td class="clbl">PO No.</td><td>: &nbsp;</td></tr>
    </table>
  </div>
</div>`;
  };

  const renderTblHdr = () => withPrinting
    ? `<tr>
        <th style="width:30px;">SR No.</th>
        <th class="l">Site Address / Product</th>
        <th style="width:62px;">SIZE</th>
        <th style="width:55px;">NOS/Qty</th>
        <th style="width:70px;">Rate PER MONTH</th>
        <th style="width:82px;">Printing Cost</th>
        <th style="width:80px;">Amount</th>
      </tr>`
    : `<tr>
        <th style="width:30px;">SR No.</th>
        <th class="l">Site Address</th>
        <th style="width:62px;">SIZE</th>
        <th style="width:48px;">PERIOD (MONTH)</th>
        <th style="width:72px;">Rate PER MONTH</th>
        <th style="width:80px;">Amount</th>
      </tr>`;

  const renderRowStd = (row, sr) => {
    const dates = row.startDate && row.endDate
      ? `<br><span style="font-size:9px;color:#555;">${fmtDateShort(row.startDate)} TO ${fmtDateShort(row.endDate)}</span>` : '';
    const mergeTag = row.rowType === 'merged'
      ? `<div class="merged-tag">${row.mergeDirection === 'H' ? '↔ Horizontal Merge' : '↕ Vertical Merge'}</div>`
      : '';
    return `<tr${row.rowType === 'merged' ? ' style="background:#faf5ff;"' : ''}>
      <td class="c">${sr}</td>
      <td class="l">${mergeTag}${row.location || ''}${dates}</td>
      <td class="c">${row.size || ''}</td>
      <td class="c">${row.nos || 1}.00</td>
      <td class="r">${fmtCurrency(row.ratePerMonth)}</td>
      <td class="r">${fmtCurrency(row.amount)}</td>
    </tr>`;
  };

  const renderRowPrint = (row, sr) => {
    const printCell = row.rowType === 'printing'
      ? `<td class="r" style="font-weight:bold;">${row.amount > 0 ? fmtCurrency(row.amount) : '—'}</td>`
      : `<td class="r">${Number(row.printingCost || 0) > 0 ? fmtCurrency(row.printingCost) : '—'}</td>`;
    const mergeTag = row.rowType === 'merged'
      ? `<div class="merged-tag">${row.mergeDirection === 'H' ? '↔ H' : '↕ V'}</div>`
      : '';
    return `<tr${row.rowType === 'merged' ? ' style="background:#faf5ff;"' : ''}>
      <td class="c">${sr}</td>
      <td class="l">${mergeTag}${row.location || ''}</td>
      <td class="c">${row.size || ''}</td>
      <td class="c">${row.rowType === 'printing' ? fmtCurrency(row.sqFt) : (row.nos || 1)}</td>
      <td class="r">${fmtCurrency(row.ratePerMonth)}</td>
      ${printCell}
      <td class="r">${fmtCurrency(row.amount)}</td>
    </tr>`;
  };

  const renderRow = (row, sr) => withPrinting ? renderRowPrint(row, sr) : renderRowStd(row, sr);

  const renderFooter = (isLast) => {
    const val = (v) => isLast ? v : '';
    const bv = (w = 100) => isLast ? null : `<span style="display:inline-block;min-width:${w}px;border-bottom:1px solid #ccc;vertical-align:middle;">&nbsp;</span>`;

    const termsHtml = selectedTerms.length > 0
      ? `<div class="f-terms"><strong>Terms &amp; Condition :</strong><br>${selectedTerms.map((termID, n) => `${n + 1}. ${termsTexts[n] || ''}`).join('<br>')
      }</div>`
      : '';

    const bankSection = isLast
      ? `<strong>GSTIN :</strong> ${COMPANY.gstin} &nbsp; <strong>PAN No :</strong> ${COMPANY.pan}<br>
         <strong>Bank Name &nbsp;&nbsp;</strong>: ${COMPANY.bank}<br>
         <strong>Branch Name</strong>: ${COMPANY.branch}<br>
         <strong>Bank A/c No &nbsp;</strong>: ${COMPANY.account}<br>
         <strong>RTGS/IFSC &nbsp;&nbsp;</strong>: ${COMPANY.ifsc}`
      : `<strong>GSTIN :</strong> ${COMPANY.gstin} &nbsp; <strong>PAN No :</strong> ${COMPANY.pan}<br>
         <strong>Bank Name &nbsp;&nbsp;</strong>: ${bv(130)}<br>
         <strong>Branch Name</strong>: ${bv(120)}<br>
         <strong>Bank A/c No &nbsp;</strong>: ${bv(130)}<br>
         <strong>RTGS/IFSC &nbsp;&nbsp;</strong>: ${bv(90)}`;

    return `
<div class="fwrap">
  <div class="f-words-row">
    <div class="f-words">
      <strong>Rs. (in words) :</strong>
      ${isLast ? numberToWords(Math.round(finalTotal)) : '<span class="f-blank">&nbsp;</span>'}
    </div>
    <div class="f-totals">
      <table>
        <tr><td>Sub Total</td><td class="gr">${isLast ? `&#8377;&nbsp;${fmtCurrency(subTotal)}` : ''}</td></tr>
        <tr><td>CGST Expense ${cgstPct}%</td><td class="gr">${val(fmtCurrency(cgstAmt))}</td></tr>
        <tr><td>SGST Expense ${sgstPct}%</td><td class="gr">${val(fmtCurrency(sgstAmt))}</td></tr>
        <tr><td style="font-size:9px;color:#666;">${Number(cgstPct) + Number(sgstPct)}%</td><td></td></tr>
        <tr class="f-grand"><td>ROUND OFF</td><td class="gr">${val(fmtCurrency(roundOff))}</td></tr>
        <tr class="f-grand"><td>Grand Total</td><td class="gr">${isLast ? `&#8377;&nbsp;${fmtCurrency(finalTotal)}` : ''}</td></tr>
      </table>
    </div>
  </div>
  <div class="f-main-row">
    <div class="f-bank">
      ${bankSection}
      <div style="margin-top:5px;padding-top:4px;border-top:1px dashed #bbb;display:flex;align-items:center;gap:6px;">
        <strong style="white-space:nowrap;">Pending Amt :</strong>
        <span style="flex:1;border-bottom:1px solid #ccc;">&nbsp;</span>
      </div>
    </div>
    <div class="f-qr">
      <img src="${qrUrl}" width="98" height="98" style="display:block;" alt="UPI QR"/>
    </div>
    <div class="f-sig">
      <div class="f-sig-company">For, JALARAM AD</div>
      <div class="f-sig-name">${COMPANY.signatory}</div>
      <div class="f-sig-name">(Authorised Signatory)</div>
      <div class="f-grand-box">
        <span class="f-grand-lbl">Grand Total &#8377;</span>
        <span class="f-grand-val">${val(fmtCurrency(finalTotal))}</span>
      </div>
    </div>
  </div>
  ${termsHtml}
  <div class="f-eoe"><span>E.&amp;O.E</span><span></span></div>
</div>`;
  };

  const pagesHtml = pages.map((pgRows, pgIdx) => {
    const isLast = pgIdx === pages.length - 1;
    const isFirst = pgIdx === 0;
    const startSR = pgIdx * ROWS_PER_PRINT_PAGE + 1;
    const prevTotal = pgIdx > 0 ? pageRun[pgIdx - 1] : 0;
    const bfSlot = !isFirst ? 1 : 0;
    const cfSlot = !isLast ? 1 : 0;
    const emptyN = Math.max(0, ROWS_PER_PRINT_PAGE - pgRows.length - bfSlot - cfSlot);

    return `<div class="page">
${renderHdr(pgIdx)}
<table class="itbl">
  <thead>${renderTblHdr()}</thead>
  <tbody>
    ${!isFirst ? `<tr class="bf"><td colspan="${nCols - 1}" class="r">B/F &rarr;</td><td class="r">${fmtCurrency(prevTotal)}</td></tr>` : ''}
    ${pgRows.map((r, i) => renderRow(r, startSR + i)).join('')}
    ${Array(emptyN).fill(`<tr class="erow">${Array(nCols).fill('<td></td>').join('')}</tr>`).join('')}
    ${!isLast ? `<tr class="cf"><td colspan="${nCols - 1}" class="r">C/F to Next Page &rarr;</td><td class="r">${fmtCurrency(pageRun[pgIdx])}</td></tr>` : ''}
  </tbody>
</table>
${renderFooter(isLast)}
</div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Quotation - ${quotNo}</title><style>${css}</style></head><body>${pagesHtml}<script>window.onload=()=>setTimeout(()=>window.print(),400);</script></body></html>`;
}
function buildProformaHTML(params) {
  const html = buildPrintHTML({
    ...params,
    docNoLabel: 'Invoice ID',
    docNoValue: params.invoiceID != null && params.invoiceID !== 0
      ? String(params.invoiceID)
      : params.quotNo,   // fallback if invoiceID isn't available
  });
  return html
    .replace(/>QUOTATION</g, '>PROFORMA INVOICE<')
    .replace(/>Site Address</g, '>Product Name<')
    .replace(/>Site Address \/ Product</g, '>Product Name<');
}
/* ═══════════════════════════════════════════
   HOARDING SELECT MODAL
═══════════════════════════════════════════ */
function HoardingSelectModal({ hoardings, existingIds, onAdd, onClose, siteColorMap, siteMap }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());

  const active = useMemo(() => hoardings.filter(isAvailable), [hoardings]);
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return s ? active.filter(h =>
      (h.hoardingCode || '').toLowerCase().includes(s) ||
      (h.site?.addressLine1 || '').toLowerCase().includes(s) ||
      (h.site?.city || '').toLowerCase().includes(s)
    ) : active;
  }, [active, search]);

  const selectable = filtered.filter(h => !existingIds.has(h.hoardingID));
  const allSelected = selectable.length > 0 && selectable.every(h => selected.has(h.hoardingID));
  const someSelected = selectable.some(h => selected.has(h.hoardingID));

  const toggle = (id) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    if (allSelected) {
      setSelected(p => { const n = new Set(p); selectable.forEach(h => n.delete(h.hoardingID)); return n; });
    } else {
      setSelected(p => { const n = new Set(p); selectable.forEach(h => n.add(h.hoardingID)); return n; });
    }
  };

  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal" style={{ maxWidth: 660 }}>
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><Building2 size={20} color="#049edf" /></div>
            <div>
              <h5 className="pg-modal__title">Select Available Hoardings</h5>
              <p className="pg-modal__subtitle">{active.length} available · Colour-coded by site</p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #f0f0f8' }}>
          <div className="pg-search-box">
            <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input placeholder="Search by code, site address…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
          </div>
        </div>
        {selectable.length > 0 && (
          <div className="qt-select-all-row" onClick={toggleAll}>
            <div className={`qt-modal-check ${allSelected ? 'qt-modal-check--all' : someSelected ? 'qt-modal-check--on' : ''}`}>
              {allSelected ? <Check size={12} color="#fff" /> : someSelected ? <div style={{ width: 8, height: 2, background: '#049edf', borderRadius: 2 }} /> : null}
            </div>
            <span>{allSelected ? 'Deselect All' : `Select All (${selectable.length})`}</span>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 360 }}>
          {filtered.length === 0
            ? <div className="pg-empty__inner" style={{ padding: '32px 20px' }}><Building2 size={32} color="#d0d0e8" /><span className="pg-empty__label">No available hoardings</span></div>
            : filtered.map(h => {
              const checked = selected.has(h.hoardingID);
              const alreadyIn = existingIds.has(h.hoardingID);
              const sid = h.siteID ?? h.site?.siteID;
              const siteColor = toSID(sid) != null ? siteColorMap.get(toSID(sid)) : null;
              const site = h.site ? normalizeSite(h.site) : null;
              const resolvedSite = site ?? (toSID(sid) != null ? siteMap?.get(toSID(sid)) ?? null : null);
              const { line1, line2 } = getSiteDisplayLines(resolvedSite, h.hoardingCode);
              return (
                <div key={h.hoardingID}
                  onClick={() => !alreadyIn && toggle(h.hoardingID)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 24px',
                    borderBottom: '1px solid #f8f8f8',
                    borderLeft: siteColor ? `4px solid ${siteColor.border}` : '4px solid transparent',
                    cursor: alreadyIn ? 'not-allowed' : 'pointer',
                    background: checked ? 'rgba(4,158,223,0.05)' : siteColor ? siteColor.bg : '#fff',
                    opacity: alreadyIn ? 0.55 : 1,
                  }}
                >
                  <div className={`qt-modal-check ${checked ? 'qt-modal-check--on' : ''}`}>
                    {checked && <Check size={12} color="#fff" />}
                  </div>
                  {siteColor && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: siteColor.dot, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div className="pg-td__primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={11} color="#9090a8" />
                      <span>{line1 || h.hoardingCode}</span>
                      {alreadyIn && <span style={{ color: '#9090a8', fontSize: 11 }}>· Already added</span>}
                    </div>
                    {line2 && (
                      <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#7a8499', marginTop: 1 }}>{line2}</div>
                    )}
                    <div className="pg-td__secondary">
                      Code: {h.hoardingCode} · {h.width}×{h.height} ft · ₹{Number(h.monthlyRent || 0).toLocaleString('en-IN')}/mo
                    </div>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(22,163,74,0.10)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)', flexShrink: 0 }}>Available</span>
                </div>
              );
            })}
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

/* ═══════════════════════════════════════════════════════════
   COMPLETE ManualHoardingModal replacement
   Replace the ENTIRE function with this.
═══════════════════════════════════════════════════════════ */

function ManualHoardingModal({ hoardings, onAdd, onClose, siteColorMap, siteMap }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return s ? hoardings.filter(h =>
      (h.hoardingCode || '').toLowerCase().includes(s) ||
      (h.site?.addressLine1 || '').toLowerCase().includes(s)
    ) : hoardings;
  }, [hoardings, search]);

  const toggle = (id) => setSelected(p => {
    const n = new Set(p);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal" style={{ maxWidth: 540 }}>
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><Building2 size={20} color="#049edf" /></div>
            <div>
              <h5 className="pg-modal__title">Add Hoarding Manually</h5>
              <p className="pg-modal__subtitle">All hoardings — including occupied &amp; maintenance</p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ padding: '12px 24px', borderBottom: '1px solid #f0f0f8' }}>
          <div className="pg-search-box">
            <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              placeholder="Search all hoardings…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 360 }}>
          {filtered.map(h => {
            const isSelected = selected.has(h.hoardingID);
            const av = isAvailable(h);
            const statusLabel = typeof h.status === 'boolean'
              ? (h.status ? 'Available' : 'Unavailable')
              : (h.status || 'Unknown');

            // ── Resolve site: first try h.site, then fall back to siteMap ──
            const rawSid = h.siteID ?? h.site?.siteID ?? h.site?.SiteID;
            const sid = toSID(rawSid);
            const siteColor = sid != null ? siteColorMap.get(sid) : null;
            const embeddedSite = h.site ? normalizeSite(h.site) : null;
            const resolvedSite = embeddedSite ?? (sid != null ? (siteMap?.get(sid) ?? null) : null);

            // Build display lines from resolved site
            const addrParts = resolvedSite
              ? [resolvedSite.addressLine1, resolvedSite.addressLine2, resolvedSite.addressLine3].filter(Boolean)
              : [];
            const cityDistrict = resolvedSite
              ? [resolvedSite.city, resolvedSite.district].filter(Boolean).join(', ')
              : '';
            const landmarkPart = resolvedSite?.landmark ? `Nr. ${resolvedSite.landmark}` : '';

            // line1: address lines or city/district; fallback to hoarding code
            const line1 = addrParts.length > 0
              ? addrParts.join(', ')
              : cityDistrict || h.hoardingCode;

            // line2: landmark + city/district (when line1 had address lines)
            const line2Parts = [landmarkPart, addrParts.length > 0 ? cityDistrict : ''].filter(Boolean);
            const line2 = line2Parts.join(' · ');

            return (
              <div
                key={h.hoardingID}
                onClick={() => toggle(h.hoardingID)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 24px',
                  borderBottom: '1px solid #f8f8f8',
                  borderLeft: siteColor ? `4px solid ${siteColor.border}` : '4px solid transparent',
                  cursor: 'pointer',
                  background: isSelected
                    ? 'rgba(4,158,223,0.05)'
                    : siteColor ? siteColor.bg : '#fff',
                }}
              >
                {/* Checkbox */}
                <div className={`qt-modal-check ${isSelected ? 'qt-modal-check--on' : ''}`}>
                  {isSelected && <Check size={12} color="#fff" />}
                </div>

                {/* Site colour dot */}
                {siteColor && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: siteColor.dot, flexShrink: 0,
                  }} />
                )}

                {/* Address / info */}
                <div style={{ flex: 1 }}>
                  <div className="pg-td__primary" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={11} color="#9090a8" style={{ flexShrink: 0 }} />
                    <span>{line1}</span>
                  </div>
                  {line2 && (
                    <div style={{
                      fontFamily: 'Nunito,sans-serif', fontSize: 11,
                      color: '#7a8499', marginTop: 1,
                    }}>
                      {line2}
                    </div>
                  )}
                  <div className="pg-td__secondary">
                    Code: {h.hoardingCode} · {h.width}×{h.height} ft
                    {h.monthlyRent ? ` · ₹${Number(h.monthlyRent).toLocaleString('en-IN')}/mo` : ''}
                  </div>
                </div>

                {/* Status badge */}
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: '2px 8px',
                  borderRadius: 5, flexShrink: 0,
                  background: av ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)',
                  color: av ? '#16a34a' : '#dc2626',
                  border: `1px solid ${av ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
                }}>
                  {statusLabel}
                </span>
              </div>
            );
          })}
        </div>

        <div className="pg-modal__foot">
          <span style={{
            fontFamily: 'Nunito,sans-serif', fontSize: 12.5,
            color: '#9090a8', fontWeight: 600,
          }}>
            {selected.size} selected
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="pg-btn-cancel" onClick={onClose}>Cancel</button>
            <button
              className="pg-btn-save"
              onClick={() => onAdd(selected)}
              disabled={selected.size === 0}
            >
              <Plus size={14} /> Add {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   TERMS MODAL
═══════════════════════════════════════════ */
function TermsModal({ selected, onSelect, termsList, onClose }) {
  const sorted = useMemo(() => [...termsList].sort((a, b) => (a.order || 0) - (b.order || 0)), [termsList]);
  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal" style={{ maxWidth: 560 }}>
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><List size={20} color="#049edf" /></div>
            <div>
              <h5 className="pg-modal__title">Terms &amp; Conditions</h5>
              <p className="pg-modal__subtitle">Select up to 3.</p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 440, padding: '16px 24px' }}>
          {sorted.length === 0 && (
            <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, color: '#9090a8', textAlign: 'center', padding: '28px 0' }}>
              No terms found. Add them in Customer Terms settings.
            </div>
          )}
          {sorted.map(term => {
            const checked = selected.includes(term.termID);
            const disabled = !checked && selected.length >= 3;
            return (
              <div key={term.termID} style={{ border: `1.5px solid ${checked ? '#049edf40' : '#f0f0f8'}`, borderRadius: 12, padding: '11px 13px', marginBottom: 10, background: checked ? 'rgba(4,158,223,0.03)' : '#fff', opacity: disabled ? 0.5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <button onClick={() => !disabled && onSelect(term.termID)} style={{ background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', padding: 0, marginTop: 3, flexShrink: 0 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${checked ? '#049edf' : '#d0d0e0'}`, background: checked ? '#049edf' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {checked && <Check size={12} color="#fff" />}
                    </div>
                  </button>
                  <div style={{ flex: 1, fontFamily: 'Nunito,sans-serif', fontSize: 12.5, color: '#1a1a2e', fontWeight: 600, lineHeight: 1.5 }}>
                    {term.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pg-modal__foot">
          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, color: '#9090a8', fontWeight: 600 }}>{selected.length}/3 selected</span>
          <button className="pg-btn-save" onClick={onClose}><Check size={14} /> Done</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
function HoardingConflictModal({ conflicts, onClose }) {
  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99998,
        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 22, width: '100%', maxWidth: 640,
          maxHeight: '88vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
        }}
      >
        {/* ── Header — white with amber accent ── */}
        <div style={{
          padding: '22px 24px 18px',
          borderBottom: '1.5px solid #f0f0f8',
          display: 'flex', alignItems: 'flex-start', gap: 16,
          flexShrink: 0,
        }}>
          {/* Icon */}
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: '#fffbeb', border: '2px solid #fde68a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={22} color="#d97706" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 18,
              color: '#1a1a2e', lineHeight: 1.1,
            }}>
              Booking Conflicts Detected
            </div>
            <div style={{
              fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 600,
              color: '#7878a0', marginTop: 5, lineHeight: 1.5,
            }}>
              {conflicts.length} hoarding{conflicts.length !== 1 ? 's are' : ' is'} already
              booked under active contracts during your selected dates.
              Please update the hoarding dates in Step 2 before proceeding.
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0, marginTop: 2,
              border: '1.5px solid #e8e8f4', background: '#f8f8fd',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#7878a0',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Conflict list ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 20px' }}>
          {conflicts.map((c, i) => (
            <div
              key={i}
              style={{
                borderRadius: 14, overflow: 'hidden', marginBottom: 12,
                border: '1.5px solid #e8e8f4',
              }}
            >
              {/* Card header — hoarding name + status */}
              <div style={{
                padding: '11px 16px',
                background: 'linear-gradient(135deg,#f8f8fd,#fafafe)',
                borderBottom: '1px solid #f0f0f8',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(4,158,223,0.08)', border: '1px solid rgba(4,158,223,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Building2 size={15} color="#049edf" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 14, color: '#1a1a2e' }}>
                    {c.hoardingCode}
                  </div>
                  <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600, marginTop: 1 }}>
                    ID #{c.hoardingID} · Contract #{c.contractID}
                  </div>
                </div>
                <span style={{
                  padding: '3px 11px', borderRadius: 20, flexShrink: 0,
                  background: '#fffbeb', border: '1px solid #fde68a',
                  fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800, color: '#d97706',
                }}>
                  ⚠ Conflict
                </span>
              </div>

              {/* Card body */}
              <div style={{ padding: '13px 16px', background: '#fff' }}>
                <div style={{ display: 'flex', gap: 0, flexDirection: 'column' }}>

                  {/* Row 1 — date comparison */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', marginBottom: 10, flexWrap: 'wrap' }}>
                    {/* Your dates */}
                    <div style={{
                      flex: 1, minWidth: 170,
                      padding: '10px 12px', borderRadius: 10,
                      background: '#fffbeb', border: '1.5px solid #fde68a',
                    }}>
                      <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                        📋 Your Quotation Dates
                      </div>
                      <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800, color: '#d97706' }}>
                        {fmtDateDisplay(c.rowStart)}
                        <span style={{ fontWeight: 600, color: '#b0b0c8', margin: '0 6px' }}>→</span>
                        {fmtDateDisplay(c.rowEnd)}
                      </div>
                    </div>

                    {/* VS divider */}
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, padding: '0 4px' }}>
                      <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 900, color: '#c0c0d8', letterSpacing: '0.05em' }}>VS</div>
                    </div>

                    {/* Contract dates */}
                    <div style={{
                      flex: 1, minWidth: 170,
                      padding: '10px 12px', borderRadius: 10,
                      background: '#f8f8fd', border: '1.5px solid #e8e8f4',
                    }}>
                      <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 800, color: '#7878a0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                        📄 Existing Contract #{c.contractID}
                      </div>
                      <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800, color: '#1a1a2e' }}>
                        {fmtDateDisplay(c.contractStart)}
                        <span style={{ fontWeight: 600, color: '#b0b0c8', margin: '0 6px' }}>→</span>
                        {fmtDateDisplay(c.contractEnd)}
                      </div>
                    </div>
                  </div>

                  {/* Row 2 — customer */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '6px 11px', borderRadius: 8,
                    background: 'rgba(4,158,223,0.05)', border: '1px solid rgba(4,158,223,0.15)',
                    alignSelf: 'flex-start',
                  }}>
                    <User size={12} color="#049edf" style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#049edf' }}>
                      Booked by:
                    </span>
                    <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#1a1a2e' }}>
                      {c.customerName}
                    </span>
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 24px 18px', borderTop: '1.5px solid #f0f0f8',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fafafe', gap: 12, flexShrink: 0, flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600, flex: 1, minWidth: 180 }}>
            Go to Step 2 and update the hoarding dates, or remove the conflicting hoardings.
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px', borderRadius: 11, border: 'none',
              background: 'linear-gradient(135deg,#049edf,#6c63ff)',
              color: '#fff', cursor: 'pointer',
              fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
              boxShadow: '0 4px 16px rgba(4,158,223,0.30)',
            }}
          >
            <Check size={14} /> Got It, I'll Fix the Dates
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
/* ═══════════════════════════════════════════
   MERGE HOARDING MODAL
═══════════════════════════════════════════ */
function MergeModal({ rows, onMerge, onClose, siteColorMap }) {
  const hoardingRows = rows.filter(r => r.rowType === 'hoarding');
  const [sel, setSel] = useState([]);
  const [dir, setDir] = useState('H');

  const firstSiteID = sel.length > 0
    ? (hoardingRows.find(r => r._id === sel[0])?.siteID ?? null)
    : undefined;

  // Toggle without any upper limit (min 2 to merge)
  const toggle = (id) => {
    const row = hoardingRows.find(r => r._id === id);
    if (!row) return;
    setSel(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const preview = useMemo(() => {
    if (sel.length < 2) return null;
    const selRows = sel.map(id => rows.find(r => r._id === id)).filter(Boolean);
    const sizes = selRows.map(r => parseSize(r.size));
    const gaps = selRows.length - 1;
    let mw, mh;
    if (dir === 'H') { mw = sizes.reduce((s, sz) => s + sz.w, 0) + gaps; mh = Math.max(...sizes.map(s => s.h)); }
    else { mw = Math.max(...sizes.map(s => s.w)); mh = sizes.reduce((s, sz) => s + sz.h, 0) + gaps; }
    return { size: `${mw} × ${mh} ft`, sqFt: (mw * mh).toFixed(1), count: selRows.length };
  }, [sel, dir, rows]);

  const siteGroups = useMemo(() => {
    const map = new Map();
    for (const r of hoardingRows) {
      const sid = r.siteID ?? '__none__';
      if (!map.has(sid)) {
        const site = r.siteObj;
        const label = site
          ? [site.addressLine1 || site.city, site.city, site.district]
            .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ')
          : (sid === '__none__' ? 'Unknown Site' : `Site ${sid}`);
        map.set(sid, { label, siteID: r.siteID, rows: [] });
      }
      map.get(sid).rows.push(r);
    }
    return [...map.values()];
  }, [hoardingRows]);

  if (hoardingRows.length < 2) {
    return ReactDOM.createPortal(
      <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="pg-modal" style={{ maxWidth: 440 }}>
          <div className="pg-modal__head">
            <div className="pg-modal__head-left">
              <div className="pg-modal__icon-wrap" style={{ background: 'rgba(124,58,237,0.10)' }}><Link2 size={20} color="#7c3aed" /></div>
              <div><h5 className="pg-modal__title">Merge Hoardings</h5></div>
            </div>
            <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
          </div>
          <div style={{ padding: '32px 24px', textAlign: 'center', fontFamily: 'Nunito,sans-serif', fontSize: 13, color: '#9090a8' }}>
            <Building2 size={36} color="#d0d0e8" style={{ marginBottom: 12 }} />
            <p>You need at least <strong>2 hoarding rows from the same site</strong> before merging.</p>
          </div>
          <div className="pg-modal__foot">
            <button className="pg-btn-cancel" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal" style={{ maxWidth: 580 }}>
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap" style={{ background: 'rgba(124,58,237,0.10)' }}>
              <Link2 size={20} color="#7c3aed" />
            </div>
            <div>
              <h5 className="pg-modal__title">Merge Hoardings</h5>
              <p className="pg-modal__subtitle">
                Select <strong>2 or more</strong> hoardings from the <strong>same site</strong>
              </p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Direction */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid #f0f0f8' }}>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#5a5a78', marginBottom: 10 }}>
            Merge Direction
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { val: 'H', label: 'Horizontal', sub: 'Side by side · sum(widths) + gaps', icon: '↔' },
              { val: 'V', label: 'Vertical', sub: 'Top to bottom · sum(heights) + gaps', icon: '↕' },
            ].map(({ val, label, sub, icon }) => (
              <button key={val} onClick={() => setDir(val)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                  border: `2px solid ${dir === val ? '#7c3aed' : '#e8e8f4'}`,
                  background: dir === val ? 'rgba(124,58,237,0.06)' : '#fff',
                  fontFamily: 'Nunito,sans-serif',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: dir === val ? '#7c3aed' : '#1a1a2e' }}>{label}</div>
                <div style={{ fontSize: 11, color: '#9090a8', marginTop: 3 }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 24px 0', fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#5a5a78' }}>
          Select hoardings from the Same Site
          <span style={{ color: '#9090a8', fontWeight: 600, marginLeft: 6 }}>
            ({sel.length} selected — min. 2)
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 300, padding: '8px 24px 14px' }}>
          {siteGroups.map(group => {
            const groupColor = group.siteID != null ? siteColorMap.get(group.siteID) : null;
            const groupLocked = firstSiteID !== undefined && group.siteID !== firstSiteID;
            return (
              <div key={String(group.siteID ?? '__none__')} style={{ marginBottom: 14 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                  padding: '5px 10px', borderRadius: 8,
                  background: groupLocked ? '#f8f8f8' : (groupColor ? groupColor.bg : '#f4f4fb'),
                  border: `1px solid ${groupLocked ? '#e8e8f0' : (groupColor ? groupColor.border : '#e8e8f4')}`,
                  opacity: groupLocked ? 0.5 : 1,
                }}>
                  {groupColor && !groupLocked && (
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: groupColor.dot, flexShrink: 0 }} />
                  )}
                  <MapPin size={12} color={groupLocked ? '#c0c0c8' : (groupColor?.dot || '#9090a8')} />
                  <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: groupLocked ? '#b0b0c8' : '#1a1a2e' }}>
                    {group.label}
                  </span>
                  {groupLocked && (
                    <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#dc2626', marginLeft: 'auto', fontWeight: 700 }}>
                      ✕ Different site
                    </span>
                  )}
                </div>

                {group.rows.map(r => {
                  const checked = sel.includes(r._id);
                  const disabled = groupLocked;
                  const { line1, line2 } = getSiteDisplayLines(r.siteObj, r.hoardingCode);
                  const selIdx = sel.indexOf(r._id);
                  return (
                    <div key={r._id}
                      onClick={() => !disabled && toggle(r._id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '9px 12px', borderRadius: 10, marginBottom: 6,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        border: `1.5px solid ${checked ? '#7c3aed' : '#f0f0f0'}`,
                        background: checked ? 'rgba(124,58,237,0.06)' : groupLocked ? '#f8f8f8' : '#fafafa',
                        opacity: disabled ? 0.4 : 1,
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${checked ? '#7c3aed' : '#d0d0e0'}`,
                        background: checked ? '#7c3aed' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {checked && <Check size={12} color="#fff" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, color: groupLocked ? '#b0b0c8' : '#1a1a2e' }}>
                          {line1 || r.hoardingCode}
                        </div>
                        {line2 && (
                          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8', marginTop: 1 }}>{line2}</div>
                        )}
                        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#b0b0c8', marginTop: 1 }}>
                          Code: {r.hoardingCode} · Size: {r.size} · {r.sqFt} sq.ft
                        </div>
                      </div>
                      {checked && (
                        <div style={{
                          fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800,
                          padding: '2px 8px', borderRadius: 5, flexShrink: 0,
                          background: 'rgba(124,58,237,0.12)', color: '#7c3aed',
                          border: '1px solid rgba(124,58,237,0.25)',
                        }}>
                          #{selIdx + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Preview */}
        {preview && (
          <div style={{ margin: '0 24px 14px', padding: '12px 16px', borderRadius: 12, background: 'rgba(124,58,237,0.06)', border: '1.5px solid rgba(124,58,237,0.20)' }}>
            <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link2 size={13} /> Merge Preview ({preview.count} hoardings)
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8' }}>Combined Size</div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 16, fontWeight: 900, color: '#1a1a2e' }}>{preview.size}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8' }}>Total Area</div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 16, fontWeight: 900, color: '#1a1a2e' }}>{preview.sqFt} sq.ft</div>
              </div>
              <div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8' }}>Direction</div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 14, fontWeight: 900, color: '#7c3aed' }}>
                  {dir === 'H' ? '↔ Horizontal' : '↕ Vertical'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pg-modal__foot">
          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600 }}>
            {sel.length < 2 ? 'Select at least 2 hoardings' : `${sel.length} hoardings will be merged`}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="pg-btn-cancel" onClick={onClose}>Cancel</button>
            <button
              disabled={sel.length < 2}
              onClick={() => {
                const selectedRowData = sel.map(id => rows.find(r => r._id === id)).filter(Boolean);
                onMerge(selectedRowData, dir);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 20px', borderRadius: 9, border: 'none',
                background: sel.length >= 2 ? '#7c3aed' : '#d0d0e0',
                color: '#fff', cursor: sel.length >= 2 ? 'pointer' : 'not-allowed',
                fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800,
              }}
            >
              <Link2 size={14} /> Merge {sel.length >= 2 ? `(${sel.length})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}



































/* ═══════════════════════════════════════════
   CUSTOMER EDIT MODAL  ← NEW
═══════════════════════════════════════════ */
function CustomerEditModal({ customer, onSave, onClose }) {
  const [form, setForm] = useState({
    customerName: customer?.customerName ?? '',
    authorizedName: customer?.authorizedName ?? '',
    phone1: customer?.phone1 ?? '',
    phone2: customer?.phone2 ?? '',
    addressLine1: customer?.addressLine1 ?? '',
    addressLine2: customer?.addressLine2 ?? '',
    addressLine3: customer?.addressLine3 ?? '',
    city: customer?.city ?? '',
    district: customer?.district ?? '',
    gstNumber: customer?.gstNumber ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {

    if (!form.customerName.trim()) { setApiErr('Customer name is required.'); return; }
    setSaving(true); setApiErr('');
    try {
      await apiService.updateCustomer({ ...form, customerID: customer.customerID, country: 'India' });
      onSave({ ...customer, ...form, country: 'India' });
      onClose();
    } catch (err) {
      setApiErr(err?.response?.data?.message || err?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  const FIELDS = [
    { key: 'customerName', label: 'Customer Name', req: true, full: true },
    { key: 'authorizedName', label: 'Authorized Person', req: false, full: false },
    { key: 'phone1', label: 'Phone 1', req: true, full: false },
    { key: 'phone2', label: 'Phone 2', req: false, full: false },
    { key: 'addressLine1', label: 'Address Line 1', req: true, full: true },
    { key: 'addressLine2', label: 'Address Line 2', req: false, full: false },
    { key: 'addressLine3', label: 'Address Line 3 / Landmark', req: false, full: false },
    { key: 'city', label: 'City', req: true, full: false },
    { key: 'district', label: 'District', req: false, full: false },
    { key: 'gstNumber', label: 'GST Number (15 chars)', req: false, full: false },
  ];

  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal" style={{ maxWidth: 600 }}>
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><User size={20} color="#049edf" /></div>
            <div>
              <h5 className="pg-modal__title">Edit Customer</h5>
              <p className="pg-modal__subtitle">#{customer.customerID} · {customer.customerName}</p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: '62vh' }}>
          {apiErr && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', marginBottom: 14,
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9,
              color: '#dc2626', fontSize: 12.5, fontFamily: 'Nunito,sans-serif', fontWeight: 700,
            }}>
              <AlertCircle size={13} /> {apiErr}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {FIELDS.map(f => (
              <div key={f.key} style={f.full ? { gridColumn: '1 / -1' } : {}}>
                <label style={{
                  fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 700,
                  color: '#5a5a78', marginBottom: 4, display: 'block',
                }}>
                  {f.label}
                  {f.req && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
                </label>
                <div className="qt-input-wrap">
                  <input
                    className="qt-input"
                    value={form[f.key]}
                    placeholder={f.key === 'gstNumber' ? '24AAAAA0000A1Z5' : ''}
                    onChange={e =>
                      set(f.key, f.key === 'gstNumber' ? e.target.value.toUpperCase() : e.target.value)
                    }
                    maxLength={f.key === 'gstNumber' ? 15 : undefined}
                    style={f.key === 'gstNumber' ? { letterSpacing: '0.05em', textTransform: 'uppercase' } : {}}
                  />
                </div>
              </div>
            ))}

            {/* Country — read-only */}
            <div>
              <label style={{
                fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 700,
                color: '#5a5a78', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                Country
                <span style={{ fontSize: 10, color: '#049edf', fontWeight: 800, background: 'rgba(4,158,223,0.08)', padding: '1px 6px', borderRadius: 4 }}>
                  🔒 Fixed
                </span>
              </label>
              <div className="qt-input-wrap" style={{ background: 'rgba(4,158,223,0.03)', borderBottomColor: '#049edf', cursor: 'not-allowed' }}>
                <input
                  className="qt-input"
                  value="India"
                  readOnly
                  style={{ color: '#049edf', fontWeight: 800, cursor: 'not-allowed', pointerEvents: 'none' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pg-modal__foot">
          <button className="pg-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="pg-btn-save" onClick={handleSave} disabled={saving}>
            {saving
              ? <><Loader2 size={13} className="pg-spin" /> Saving…</>
              : <><Check size={13} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   CREATE CONTRACT FROM QUOTATION MODAL  ← NEW
═══════════════════════════════════════════ */
function CreateContractFromQuotModal({

  quot, quotLines, quotMerges = [], hoardings, customers, siteMap, paymentFreqs, onClose, onCreated, showToast,
}) {
  const myLines = quotLines.filter(l =>
    l.quotationID === quot.quotationID &&
    l.quotationRevisionNumber === quot.quotationRevisionNumber
  );
  const myMerges = quotMerges.filter(m =>
    Number(m.quotationID) === Number(quot.quotationID) &&
    Number(m.quotationRevisionNumber) === Number(quot.quotationRevisionNumber)
  );

  // Collect all unique hoardingIDs from merges that are NOT already in regular lines
  const regularHoardingIds = new Set(myLines.map(l => Number(l.hoardingID)));
  const mergedHoardingIds = [...new Set(
    myMerges
      .map(m => Number(m.hoardingID))
      .filter(id => id > 0 && !regularHoardingIds.has(id))
  )];

  const initCustomer = customers.find(c => c.customerID === quot.customerID) || null;
  const [localCustomer, setLocalCustomer] = useState(initCustomer);
  const [showEditCust, setShowEditCust] = useState(false);

  const freqOptions = paymentFreqs.length ? paymentFreqs : PAYMENT_FREQ_FALLBACK;
  const [freqID, setFreqID] = useState(String(freqOptions[0]?.value ?? 1));
  const [saving, setSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState({});
  const [occupancyWarnings, setOccupancyWarnings] = useState([]);


  /* Build one editable row per quotation line */
  const [contractRows, setContractRows] = useState(() => {
    // Regular lines (non-merged)
    const regularRows = myLines.map(l => {
      const h = hoardings.find(hh => hh.hoardingID === l.hoardingID);
      const siteID = h?.siteID ?? h?.site?.siteID ?? null;
      const siteObj = siteID != null ? siteMap.get(siteID) : null;
      return {
        _id: uid(),
        selected: true,
        isMerged: false,
        hoardingID: l.hoardingID,
        mergedHoardingIDs: [],
        hoardingCode: h?.hoardingCode || `Hoarding ${l.hoardingID}`,
        location: buildSiteAddress(siteObj, h?.hoardingCode || ''),
        size: h ? `${h.width} X ${h.height}` : '',
        startDate: l.periodBeginDate || '',
        endDate: l.periodEndDate || '',
        contractOrigValue: l.rentAmount || 0,
        amountPerFreq: l.rentAmount || 0,
        status: 'Active',
      };
    });

    // Build ONE merged row per merge group (grouped by quotationLineNumber)
    const mergedRows = [];
    if (myMerges.length >= 2) {
      const byLine = new Map();
      for (const m of myMerges) {
        const ln = m.quotationLineNumber;
        if (!byLine.has(ln)) byLine.set(ln, []);
        byLine.get(ln).push(m);
      }

      for (const [ln, records] of byLine.entries()) {
        if (records.length < 2) continue;

        const hoardingObjs = records
          .map(m => hoardings.find(h => h.hoardingID === Number(m.hoardingID)))
          .filter(Boolean);

        const dir = records[0].mergeAlongFlag === 'H' ? 'H' : 'V';

        // Compute merged size
        const sizes = hoardingObjs.map(h => ({ w: h.width || 0, h: h.height || 0 }));
        const gaps = hoardingObjs.length - 1;
        let mw, mh;
        if (dir === 'H') {
          mw = sizes.reduce((s, sz) => s + sz.w, 0) + gaps;
          mh = Math.max(...sizes.map(s => s.h));
        } else {
          mw = Math.max(...sizes.map(s => s.w));
          mh = sizes.reduce((s, sz) => s + sz.h, 0) + gaps;
        }

        // Combined location
        const locations = hoardingObjs.map(h => {
          const sid = h.siteID ?? h.site?.siteID ?? null;
          const siteObj = sid != null ? siteMap.get(sid) : null;
          return buildSiteAddress(siteObj, h.hoardingCode || '');
        });

        const combinedCodes = hoardingObjs.map(h => h.hoardingCode || '').join(' + ');
        const combinedLocation = locations.join(' + ');
        const totalRent = hoardingObjs.reduce((s, h) => s + (h.monthlyRent || 0), 0);
        const matchingLine = quotLines.find(l =>
          Number(l.quotationID) === Number(quot.quotationID) &&
          Number(l.quotationRevisionNumber) === Number(quot.quotationRevisionNumber) &&
          records.some(m => Number(m.quotationLineNumber) === Number(l.quotationLineNumber))
        );
        // Dates: from quotation date or today
        const startDate = quot.quotationDate?.split('T')[0] || '';
        const endDate = matchingLine?.periodEndDate || '';

        mergedRows.push({
          _id: uid(),
          selected: true,
          isMerged: true,
          mergeDirection: dir,
          mergedHoardingIDs: hoardingObjs.map(h => h.hoardingID),
          hoardingID: 0,
          hoardingCode: combinedCodes,
          location: combinedLocation,
          size: `${mw} X ${mh}`,
          startDate,
          endDate,
          contractOrigValue: totalRent,
          amountPerFreq: totalRent,
          status: 'Active',
        });
      }
    }

    return [...regularRows, ...mergedRows];
  });

  // ── Resizable columns — must come AFTER contractRows ──
  const contractTableRef = useRef(null);
  const [contractTableReady, setContractTableReady] = useState(false);
  useResizableColumns(contractTableRef, contractTableReady, [44, 220, 80, 136, 136, 130, 118, 110]);

  useEffect(() => {
    setContractTableReady(false);
    const t = setTimeout(() => setContractTableReady(true), 120);
    return () => clearTimeout(t);
  }, [contractRows.length]);

  const selectedRows = contractRows.filter(r => r.selected);
  const allSelected = contractRows.length > 0 && contractRows.every(r => r.selected);
  const someSelected = contractRows.some(r => r.selected);

  const updateRow = (id, field, val) =>
    setContractRows(p => p.map(r => r._id === id ? { ...r, [field]: val } : r));

  const toggleRow = (id) =>
    setContractRows(p => p.map(r => r._id === id ? { ...r, selected: !r.selected } : r));

  const toggleAll = () => {
    const next = !allSelected;
    setContractRows(p => p.map(r => ({ ...r, selected: next })));
  };

  const handleCreate = async () => {
    if (selectedRows.length === 0) {
      showToast('No hoarding lines found.', 'error');
      return;
    }

    const startDate = selectedRows.reduce((e, r) =>
      !e || (r.startDate && r.startDate < e) ? r.startDate : e, '');
    const endDate = selectedRows.reduce((l, r) =>
      !l || (r.endDate && r.endDate > l) ? r.endDate : l, '');

    if (!startDate || !endDate) {
      showToast('Start and end dates are required.', 'error');
      return;
    }

    const totalValue = selectedRows.reduce((s, r) => s + Number(r.contractOrigValue || 0), 0);
    const totalPerFreq = selectedRows.reduce((s, r) => s + Number(r.amountPerFreq || 0), 0);
    const validRows = selectedRows.filter(r => Number(r.hoardingID) > 0);

    setSaving(true);

    // Step 1: QuotationCustomer (non-blocking)
    try {
      await apiService.createQuotationCustomer({
        quotationID: quot.quotationID,
        quotationRevisionNumber: quot.quotationRevisionNumber ?? 0,
        customerID: quot.customerID,
      });
    } catch (err) {
      console.warn('[QuotationCustomer]:', err?.message);
    }

    // Step 2: Create CustomerContract
    let savedContractID = 0;
    try {
      const rawRes = await apiService.createCustomerContract({
        customerContractID: 0,
        customerID: Number(quot.customerID),
        startDate,
        endDate,
        contractOrigValue: totalValue,
        paymentFreqID: Number(freqID),
        amountPerFreq: totalPerFreq,
        advancePaid: 0,
        status: 'Active',
        discountAmount: 0,
        adjustmentAmount: 0,
        contractFinalValue: totalValue,
        comments: `From Quotation ${quot.quotationNumber || quot.quotationID} Rev.${quot.quotationRevisionNumber || 1}`,
      });
      savedContractID = Number(
        rawRes?.data?.customerContractID
        ?? rawRes?.data?.CustomerContractID
        ?? rawRes?.customerContractID
        ?? rawRes?.CustomerContractID
        ?? 0
      );

      // Backend is returning wrong ID — fetch the real newly created contract
      if (savedContractID <= 1) {
        console.warn('[Contract] Fetching real contract ID via apiService...');
        try {
          const allContracts = await apiService.getAllCustomerContracts();
          const allList = Array.isArray(allContracts) ? allContracts : [];


          const forThisCustomer = allList
            .filter(c => Number(c.customerContractID ?? c.CustomerContractID) > 0)
            .sort((a, b) =>
              Number(b.customerContractID ?? b.CustomerContractID ?? 0) -
              Number(a.customerContractID ?? a.CustomerContractID ?? 0)
            );

          if (forThisCustomer.length > 0) {
            savedContractID = Number(
              forThisCustomer[0].customerContractID ?? forThisCustomer[0].CustomerContractID
            );
          }
        } catch (err) {
          console.error('[Contract] apiService fetch failed:', err?.message);
        }
      }

    } catch (err) {
      setSaving(false);
      showToast(err?.response?.data?.message || err?.message || 'Failed to create contract.', 'error');
      return;
    }

    if (savedContractID > 0) {
      // Collect all hoardingIDs to map from selected rows only
      const allHoardingIDsToMap = new Set();

      for (const row of selectedRows) {
        if (row.isMerged && row.mergedHoardingIDs?.length) {
          row.mergedHoardingIDs.forEach(id => {
            if (Number(id) > 0) allHoardingIDsToMap.add(Number(id));
          });
        } else if (Number(row.hoardingID) > 0) {
          allHoardingIDsToMap.add(Number(row.hoardingID));
        }
      }


      // Step 3: Create hoarding maps
      const occupiedMsgs = [];
      for (const hID of allHoardingIDsToMap) {
        try {
          await apiService.createCustomerContractHoardingMap({
            customerContractLineID: 0,
            customerContractID: savedContractID,
            customerID: Number(quot.customerID),
            hoardingID: hID,
          });
        } catch (err) {
          // Log full error for debugging
          console.error('[HoardingMap] Error for hID', hID,
            '| status:', err?.response?.status,
            '| data:', JSON.stringify(err?.response?.data),
            '| message:', err?.message
          );

          const occ = parseOccupancyError(err);
          if (occ) {
            const h = hoardings.find(hh => hh.hoardingID === hID);
            const code = h?.hoardingCode ? ` (${h.hoardingCode})` : '';
            const msg = occ.replace(/Hoarding\s+\d+/, `Hoarding #${hID}${code}`);
            occupiedMsgs.push(msg);
            showToast(msg, 'error');      // ← toast so it's always visible
          } else {
            const fallback = err?.response?.data?.message || err?.message || `Failed to map Hoarding #${hID}`;
            showToast(fallback, 'error'); // ← generic errors as toast too
            console.error('[HoardingMap] Non-occupancy error:', hID, fallback);
          }
        }
      }
      if (occupiedMsgs.length > 0) {
        setOccupancyWarnings(occupiedMsgs);
        setSaving(false);
        return;  // keep modal open — user sees banner + toasts
      }

      // Step 4: Merge records — only for hoardings that were actually mapped
      const thisMerges = quotMerges.filter(m =>
        Number(m.quotationID) === Number(quot.quotationID)
      );

      for (const m of thisMerges) {
        const hID = Number(m.hoardingID);
        if (!allHoardingIDsToMap.has(hID)) continue; // ← this gate is the real fix
        try {
          await apiService.createHoardingMerge({
            hoardingID: hID,
            customerContractID: Number(savedContractID),
            mergeAlongFlag: m.mergeAlongFlag ?? 'H',
          });
        } catch (err) {
          console.error('[Merge] Failed:', hID, err?.message);
        }
      }
    }

    setSaving(false);
    await new Promise(resolve => setTimeout(resolve, 500));
    showToast('Customer contract created successfully!', 'success');
    onCreated?.();
    onClose();
  };

  const totalContractValue = selectedRows.reduce((s, r) => s + Number(r.contractOrigValue || 0), 0);
  const totalAmtPerFreq = selectedRows.reduce((s, r) => s + Number(r.amountPerFreq || 0), 0);

  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal" style={{ maxWidth: 940 }}>

        {/* ── Head ── */}
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap" style={{ background: 'rgba(124,58,237,0.10)' }}>
              <FileCheck size={20} color="#7c3aed" />
            </div>
            <div>
              <h5 className="pg-modal__title">Create Customer Contracts</h5>
              <p className="pg-modal__subtitle">
                From Quotation&nbsp;<strong>{quot.quotationNumber || `#${quot.quotationID}`}</strong>
                &nbsp;·&nbsp;{myLines.length + mergedHoardingIds.length} hoarding{(myLines.length + mergedHoardingIds.length) !== 1 ? 's' : ''}
                {Number(quot.quotationRevisionNumber) > 1 && (
                  <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 8, background: 'rgba(217,119,6,0.10)', color: '#7c7c7c', fontSize: 11, fontWeight: 800, border: '1px solid rgba(217,119,6,0.25)' }}>
                    Rev. {quot.quotationRevisionNumber}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>
        {/* ── Occupancy warning ── */}
        {occupancyWarnings.length > 0 && (
          <div style={{ padding: '14px 24px 0' }}>
            <OccupancyWarningBanner
              messages={occupancyWarnings}
              onDismiss={() => setOccupancyWarnings([])}
            />
          </div>
        )}
        {/* ── Customer bar ── */}
        <div style={{
          padding: '11px 24px', borderBottom: '1px solid #f0f0f8', background: '#fafafe',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(4,158,223,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <User size={15} color="#049edf" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 900, color: '#1a1a2e', lineHeight: 1.1 }}>
              {localCustomer?.customerName || `Customer ID ${quot.customerID}`}
            </div>
            {localCustomer && (
              <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11.5, color: '#9090a8', fontWeight: 600, marginTop: 3 }}>
                {[localCustomer.addressLine1, localCustomer.city, localCustomer.district].filter(Boolean).join(', ')}
                {localCustomer.gstNumber && <span style={{ marginLeft: 8 }}>· GST: {localCustomer.gstNumber}</span>}
                {localCustomer.phone1 && <span style={{ marginLeft: 8 }}>· {localCustomer.phone1}</span>}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowEditCust(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 13px',
              borderRadius: 8, border: '1.5px solid rgba(4,158,223,0.30)',
              background: 'rgba(4,158,223,0.06)', cursor: 'pointer',
              color: '#049edf', fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800,
              flexShrink: 0,
            }}
          >
            <Edit2 size={12} /> Edit Customer
          </button>
        </div>

        {/* ── Config bar ── */}
        <div style={{
          padding: '10px 24px', borderBottom: '1px solid #f0f0f8', background: '#fff',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#5a5a78', whiteSpace: 'nowrap' }}>
            Payment Frequency:
          </span>
          <select
            value={freqID}
            onChange={e => setFreqID(e.target.value)}
            style={{
              padding: '7px 14px', border: '1.5px solid #e8e8f4', borderRadius: 9,
              fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700,
              color: '#1a1a2e', background: '#fff', cursor: 'pointer', outline: 'none',
            }}
          >
            {freqOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11.5, color: '#b0b0c8', fontWeight: 600 }}>
            Applied to all selected contracts
          </span>
          <div style={{ marginLeft: 'auto', fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#9090a8' }}>
            {selectedRows.length} / {contractRows.length} selected
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{ overflow: 'auto', maxHeight: 370 }}>
          {contractRows.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'Nunito,sans-serif', color: '#9090a8' }}>
              <Building2 size={36} color="#d0d0e8" style={{ marginBottom: 10 }} />
              <div>No hoarding lines in this quotation.</div>
            </div>
          ) : (
            <table ref={contractTableRef} style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: '#f8f8fd' }}>
                  {/* Select-all */}
                  <th style={{ padding: '10px 14px', width: 44, textAlign: 'center', borderBottom: '1.5px solid #e8e8f4' }}>
                    <div
                      onClick={toggleAll}
                      title={allSelected ? 'Deselect all' : 'Select all'}
                      style={{
                        width: 20, height: 20, borderRadius: 6, cursor: 'pointer', margin: '0 auto',
                        border: `2px solid ${allSelected ? '#049edf' : someSelected ? '#049edf' : '#d0d0e0'}`,
                        background: allSelected ? '#049edf' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {allSelected && <Check size={12} color="#fff" />}
                      {!allSelected && someSelected && (
                        <div style={{ width: 8, height: 2, background: '#049edf', borderRadius: 2 }} />
                      )}
                    </div>
                  </th>
                  {[
                    { label: 'Hoarding / Location', align: 'left', w: null },
                    { label: 'Size', align: 'center', w: 80 },
                    { label: 'Start Date', align: 'center', w: 136 },
                    { label: 'End Date', align: 'center', w: 136 },
                    { label: 'Contract Value (₹)', align: 'center', w: 130 },
                    { label: 'Amt / Freq (₹)', align: 'center', w: 118 },
                    { label: 'Status', align: 'center', w: 110 },
                  ].map(col => (
                    <th key={col.label} style={{
                      padding: '10px 12px', textAlign: col.align,
                      fontSize: 10.5, fontFamily: 'Nunito,sans-serif', fontWeight: 800, color: '#7878a0',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      borderBottom: '1.5px solid #e8e8f4', whiteSpace: 'nowrap',
                      ...(col.w ? { width: col.w } : {}),
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contractRows.map((row, idx) => {
                  const hasErr = rowErrors[row._id];
                  return (
                    <tr key={row._id} style={{
                      background: !row.selected ? '#f9f9fb' : idx % 2 === 0 ? '#fff' : '#fafafe',
                      opacity: row.selected ? 1 : 0.45,
                      transition: 'opacity 0.15s',
                    }}>

                      {/* Checkbox */}
                      <td style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid #f0f0f8' }}>
                        <div
                          onClick={() => toggleRow(row._id)}
                          style={{
                            width: 20, height: 20, borderRadius: 6, cursor: 'pointer', margin: '0 auto',
                            border: `2px solid ${row.selected ? '#049edf' : '#d0d0e0'}`,
                            background: row.selected ? '#049edf' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {row.selected && <Check size={12} color="#fff" />}
                        </div>
                      </td>
                      {/* Hoarding info */}
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f8' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 800, color: '#049edf', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.hoardingCode}
                          </div>
                          {row.isMerged && (
                            <span style={{
                              fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                              background: 'rgba(124,58,237,0.10)', color: '#7c3aed',
                              border: '1px solid rgba(124,58,237,0.25)', whiteSpace: 'nowrap',
                            }}>
                              From Merge
                            </span>
                          )}
                        </div>
                        {row.location && (
                          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <MapPin size={10} color="#c0c0d8" style={{ marginRight: 3, verticalAlign: 'middle' }} />
                            {row.location}
                          </div>
                        )}
                      </td>
                      {/* Size */}
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f8', textAlign: 'center' }}>
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#4a5568' }}>{row.size || '—'}</span>
                      </td>

                      {/* Start Date */}
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f0f8' }}>
                        <input
                          type="date"
                          value={row.startDate}
                          disabled={!row.selected}
                          onChange={e => { updateRow(row._id, 'startDate', e.target.value); setRowErrors(p => ({ ...p, [row._id]: '' })); }}
                          style={{
                            width: '100%', padding: '6px 8px',
                            border: `1.5px solid ${hasErr ? '#ef4444' : '#e8e8f4'}`,
                            borderRadius: 8, fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700,
                            color: '#1a1a2e', background: row.selected ? '#fff' : 'transparent', outline: 'none',
                            cursor: row.selected ? 'pointer' : 'not-allowed',
                          }}
                        />
                        {hasErr && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3, color: '#ef4444', fontSize: 10.5, fontFamily: 'Nunito,sans-serif', fontWeight: 700 }}>
                            <AlertCircle size={10} /> {hasErr}
                          </div>
                        )}
                      </td>

                      {/* End Date */}
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f0f8' }}>
                        <input
                          type="date"
                          value={row.endDate}
                          disabled={!row.selected}
                          onChange={e => { updateRow(row._id, 'endDate', e.target.value); setRowErrors(p => ({ ...p, [row._id]: '' })); }}
                          style={{
                            width: '100%', padding: '6px 8px',
                            border: `1.5px solid ${hasErr ? '#ef4444' : '#e8e8f4'}`,
                            borderRadius: 8, fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700,
                            color: '#1a1a2e', background: row.selected ? '#fff' : 'transparent', outline: 'none',
                            cursor: row.selected ? 'pointer' : 'not-allowed',
                          }}
                        />
                      </td>

                      {/* Contract Value */}
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f0f8' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          border: '1.5px solid #e8e8f4', borderRadius: 8, padding: '5px 8px',
                          background: row.selected ? '#fff' : 'transparent',
                        }}>
                          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#b0b0c8', flexShrink: 0 }}>₹</span>
                          <input
                            type="number" min="0"
                            value={row.contractOrigValue}
                            disabled={!row.selected}
                            onChange={e => updateRow(row._id, 'contractOrigValue', e.target.value)}
                            style={{
                              width: '100%', border: 'none', outline: 'none',
                              fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800,
                              color: '#049edf', background: 'transparent',
                              cursor: row.selected ? 'text' : 'not-allowed',
                            }}
                          />
                        </div>
                      </td>

                      {/* Amount per Freq */}
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f0f8' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          border: '1.5px solid #e8e8f4', borderRadius: 8, padding: '5px 8px',
                          background: row.selected ? '#fff' : 'transparent',
                        }}>
                          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#b0b0c8', flexShrink: 0 }}>₹</span>
                          <input
                            type="number" min="0"
                            value={row.amountPerFreq}
                            disabled={!row.selected}
                            onChange={e => updateRow(row._id, 'amountPerFreq', e.target.value)}
                            style={{
                              width: '100%', border: 'none', outline: 'none',
                              fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800,
                              color: '#16a34a', background: 'transparent',
                              cursor: row.selected ? 'text' : 'not-allowed',
                            }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f0f8' }}>
                        <select
                          value={row.status}
                          disabled={!row.selected}
                          onChange={e => updateRow(row._id, 'status', e.target.value)}
                          style={{
                            width: '100%', padding: '6px 8px',
                            border: '1.5px solid #e8e8f4', borderRadius: 8,
                            fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 700,
                            color: '#1a1a2e', background: row.selected ? '#fff' : 'transparent',
                            outline: 'none', cursor: row.selected ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {['Active', 'Pending', 'Expired', 'Terminated'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Summary strip ── */}
        {selectedRows.length > 0 && (
          <div style={{
            padding: '10px 24px', borderTop: '1px solid #f0f0f8',
            background: 'rgba(124,58,237,0.04)',
            display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap',
          }}>
            <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>
              Total Contract Value:&nbsp;
              <span style={{ fontSize: 14, fontWeight: 900 }}>
                ₹ {totalContractValue.toLocaleString('en-IN')}
              </span>
            </div>
            <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#16a34a' }}>
              Total Amt / Freq:&nbsp;
              <span style={{ fontSize: 14, fontWeight: 900 }}>
                ₹ {totalAmtPerFreq.toLocaleString('en-IN')}
              </span>
            </div>
            <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11.5, color: '#9090a8', fontWeight: 600, marginLeft: 'auto' }}>
              Frequency: {freqOptions.find(f => String(f.value) === String(freqID))?.label || '—'}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="pg-modal__foot">
          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, color: '#9090a8', fontWeight: 600 }}>
            {selectedRows.length} of {contractRows.length} hoardings selected
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="pg-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
            <button
              onClick={handleCreate}
              disabled={saving || selectedRows.length === 0 || occupancyWarnings.length > 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 20px', borderRadius: 9, border: 'none',
                background:
                  occupancyWarnings.length > 0 ? '#d0d0e0' :
                    selectedRows.length > 0 ? 'linear-gradient(135deg,#7c3aed,#6d28d9)'
                      : '#d0d0e0',
                color: '#fff',
                cursor: saving || selectedRows.length === 0 || occupancyWarnings.length > 0
                  ? 'not-allowed' : 'pointer',
                fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800,
                boxShadow: selectedRows.length > 0 && !occupancyWarnings.length
                  ? '0 2px 10px rgba(124,58,237,0.30)' : 'none',
                pointerEvents: saving ? 'none' : 'auto',   // ← hard block on double-click
              }}
            >
              {saving
                ? <><Loader2 size={13} className="pg-spin" /> Creating…</>
                : <><FileCheck size={14} /> Create Contract</>}
            </button>
          </div>
        </div>
      </div>

      {/* Nested customer-edit modal */}
      {showEditCust && localCustomer && (
        <CustomerEditModal
          customer={localCustomer}
          onSave={updated => setLocalCustomer(updated)}
          onClose={() => setShowEditCust(false)}
        />
      )}
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function QuotationPage({ onNavigateToContracts }) {

  /* ── API Data ── */
  const [customers, setCustomers] = useState([]);
  const [hoardings, setHoardings] = useState([]);
  const [sites, setSites] = useState([]);
  const [termsList, setTermsList] = useState([]);
  const [paymentFreqs, setPaymentFreqs] = useState([]);   // ← NEW
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  /* ── History ── */
  const [quotations, setQuotations] = useState([]);
  const [quotLines, setQuotLines] = useState([]);
  const [histSearch, setHistSearch] = useState('');
  const [histSortKey, setHistSortKey] = useState('quotationDate');
  const [histSortDir, setHistSortDir] = useState('desc');
  const [histPage, setHistPage] = useState(1);
  const [histPageSize, setHistPageSize] = useState(10);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  /* ── Creator state ── */
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState(1);
  const [step1Error, setStep1Error] = useState('');
  const [step2Error, setStep2Error] = useState('');
  const [editingQuotID, setEditingQuotID] = useState(null);
  const [originalQuotID, setOriginalQuotID] = useState(0);
  const [customerContracts, setCustomerContracts] = useState([]);
  /* ── Form fields ── */
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [withPrinting, setWithPrinting] = useState(false);
  const [quotNo, setQuotNo] = useState('');
  const [quotDate, setQuotDate] = useState(todayISO());
  const [revisionNo, setRevisionNo] = useState(0);
  const [rows, setRows] = useState([]);
  const [cgstPct, setCgstPct] = useState(9);
  const [sgstPct, setSgstPct] = useState(9);
  const [selectedTerms, setSelectedTerms] = useState([]);
  const [globalStart, setGlobalStart] = useState('');
  const [globalEnd, setGlobalEnd] = useState('');

  /* ── Modals ── */
  const [showHoardModal, setShowHoardModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showCustomerEditModal, setShowCustomerEditModal] = useState(false);  // ← NEW
  const [showContractModal, setShowContractModal] = useState(false);  // ← NEW
  const [contractQuot, setContractQuot] = useState(null);   // ← NEW
  const [quotMerges, setQuotMerges] = useState([]);
  const [contractedQuotIds, setContractedQuotIds] = useState(new Set());
  const [allContracts, setAllContracts] = useState([]);   // ← NEW
  const [allContractMaps, setAllContractMaps] = useState([]);   // ← NEW
  const [conflictWarnings, setConflictWarnings] = useState([]);   // ← NEW
  const [showConflictModal, setShowConflictModal] = useState(false);// ← NEW
  const [showPrintTypeDD, setShowPrintTypeDD] = useState(false);
  /* ── Step 2 resizable table ── */
  const step2TableRef = useRef(null);
  const printTypeBtnRef = useRef(null);
  const printTypePanelRef = useRef(null);
  const [step2TableReady, setStep2TableReady] = useState(false);
  const histTableRef = useRef(null);
  const [histTableReady, setHistTableReady] = useState(false);
  const step2ColWidths = withPrinting
    ? [40, 240, 80, 110, 140, 140, 90, 90, 90, 46]
    : [40, 240, 80, 64, 56, 140, 140, 90, 90, 46];

  useResizableColumns(step2TableRef, step2TableReady, step2ColWidths);
  useResizableColumns(histTableRef, histTableReady, [44, 140, 200, 110, 110, 120, 220]);

  useEffect(() => {
    setStep2TableReady(false);
    if (step === 2) {
      const t = setTimeout(() => setStep2TableReady(true), 120);
      return () => clearTimeout(t);
    }
  }, [step, withPrinting]);
  useEffect(() => {
    if (!loading && !isCreating) {
      setHistTableReady(false);
      const t = setTimeout(() => setHistTableReady(true), 150);
      return () => clearTimeout(t);
    }
  }, [loading, isCreating]);

  const formRef = useRef(null);
  const loadCustomerContracts = async () => {
    try {
      const response = await apiService.getCustomerContracts();

      setCustomerContracts(
        Array.isArray(response)
          ? response
          : response?.data || []
      );
    }
    catch (err) {
      console.error(err);
    }
  };
  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  /* ── Site lookup map ── */
  const siteMap = useMemo(() => {
    const map = new Map();
    for (const s of sites) {
      const sid = toSID(s?.siteID ?? s?.SiteID);
      if (sid) map.set(sid, s);
    }
    for (const h of hoardings) {
      const sid = toSID(h.siteID);
      const s = h.site ? normalizeSite(h.site) : null;
      if (sid && s && !map.has(sid)) map.set(sid, s);
    }
    return map;
  }, [sites, hoardings]);

  /* ── Site colour map ── */
  const siteColorMap = useMemo(() => {
    const map = buildSiteColorMap(hoardings, sites);
    return map;
  }, [hoardings, sites]);

  const getRowSiteColor = (row) => {
    const sid = toSID(row.siteID ?? row.siteObj?.siteID);
    const color = sid == null ? null : siteColorMap.get(sid) || null;
    return color;
  };

  const toggleGroup = useCallback((key) => {
    setExpandedGroups(p => {
      const n = new Set(p);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }, []);
const handleViewProforma = async (quot) => {
    const myLines = quotLines.filter(l =>
      Number(l.quotationID) === Number(quot.quotationID) &&
      Number(l.quotationRevisionNumber) === Number(quot.quotationRevisionNumber)
    );
    const cust = customers.find(c => c.customerID === quot.customerID) || null;

    /* ── Build rows from QuotationLineDTL ── */
    const pdfRows = myLines
      .filter(l => !l.mergeFlag)
      .map(l => {
        // ── Printing / Extra rows ──
        if (!l.hoardingID && l.purpose) {
          const isPrinting = PRINTING_TYPES.some(pt =>
            pt.toLowerCase() === (l.purpose || '').toLowerCase()
          );
          return {
            rowType: isPrinting ? 'printing' : 'extra',
            hoardingID: 0,
            location: l.purpose,
            size: '',
            sqFt: 0,
            nos: 1,
            startDate: l.periodBeginDate,
            endDate: l.periodEndDate,
            ratePerMonth: l.rentAmount,
            amount: l.rentAmount,
            printingCost: 0,
          };
        }
        // ── Regular hoarding row ──
        const h = hoardings.find(hh => hh.hoardingID === l.hoardingID);
        const siteID = h?.siteID ?? h?.site?.siteID ?? null;
        const siteObj = siteID != null
          ? (siteMap.get(siteID) ?? (h?.site ? normalizeSite(h.site) : null))
          : null;
        return {
          rowType: 'hoarding',
          hoardingID: l.hoardingID,
          location: buildSiteAddress(siteObj, h?.hoardingCode || ''),
          size: h ? `${h.width} X ${h.height}` : '',
          sqFt: h ? (h.width * h.height) : 0,
          nos: 1,
          startDate: l.periodBeginDate,
          endDate: l.periodEndDate,
          ratePerMonth: l.rentAmount,
          amount: l.rentAmount,
          printingCost: 0,
        };
      });

    /* ── Merged rows from QuotationMergeDTL ── */
    const myMerges = quotMerges.filter(m =>
      Number(m.quotationID) === Number(quot.quotationID) &&
      Number(m.quotationRevisionNumber) === Number(quot.quotationRevisionNumber)
    );

    if (myMerges.length >= 2) {
      const byLine = new Map();
      for (const m of myMerges) {
        const ln = m.quotationLineNumber;
        if (!byLine.has(ln)) byLine.set(ln, []);
        byLine.get(ln).push(m);
      }

      for (const ln of [...byLine.keys()].sort((a, b) => a - b)) {
        const records = byLine.get(ln);
        if (records.length < 2) continue;

        const savedLine = myLines.find(l =>
          l.mergeFlag && Number(l.quotationLineNumber) === Number(ln)
        );

        const dir = records[0].mergeAlongFlag === 'H' ? 'H' : 'V';
        const hoardingObjs = records
          .map(r => hoardings.find(h => h.hoardingID === r.hoardingID))
          .filter(Boolean);

        const sizes = hoardingObjs.map(h => ({ w: h.width || 0, h: h.height || 0 }));
        const gaps = hoardingObjs.length - 1;
        let mw, mh;
        if (dir === 'H') {
          mw = sizes.reduce((s, sz) => s + sz.w, 0) + gaps;
          mh = Math.max(...sizes.map(s => s.h));
        } else {
          mw = Math.max(...sizes.map(s => s.w));
          mh = sizes.reduce((s, sz) => s + sz.h, 0) + gaps;
        }

        const locations = hoardingObjs.map(h => {
          const site = h.siteID ? siteMap.get(h.siteID) : null;
          return buildSiteAddress(site, h.hoardingCode || '');
        });
        const codes = hoardingObjs.map(h => h.hoardingCode || '').join(' + ');
        const fallbackRate = hoardingObjs.reduce((s, h) => s + (h.monthlyRent || 0), 0);

        pdfRows.push({
          rowType: 'merged',
          isMerged: true,
          mergeDirection: dir,
          hoardingID: 0,
          location: savedLine?.purpose || locations.join(' + '),
          hoardingCode: codes,
          size: `${mw} X ${mh}`,
          sqFt: mw * mh,
          nos: 1,
          startDate: savedLine?.periodBeginDate || '',
          endDate: savedLine?.periodEndDate || '',
          ratePerMonth: savedLine ? savedLine.rentAmount : fallbackRate,
          amount: savedLine ? savedLine.rentAmount : fallbackRate,
          printingCost: 0,
        });
      }
    }

    /* ── Save Proforma Invoice record to API (non-blocking) ── */
    let invoiceID = null;   // ← NEW
    try {
      const res = await apiService.createPerformaInvoice({
        invoiceID: 0,
        quotationID: Number(quot.quotationID),
        quotationRevisionNumber: Number(quot.quotationRevisionNumber ?? 0),
        quotationNumber: quot.quotationNumber || '',
        invoiceDate: new Date().toISOString(),
      });
      // ← NEW: extract the generated invoiceID from the response
      invoiceID = res?.invoiceID ?? res?.InvoiceID ?? res?.data?.invoiceID ?? res?.data?.InvoiceID ?? null;
      showToast('Proforma invoice saved.', 'success');
    } catch (err) {
      console.warn('[PerformaInvoice] Save failed:', err?.message);
      // Non-blocking — PDF still opens even if save fails
    }

    /* ── Open Proforma print window ── */
    const storedSub = quot.totalAmount / (1 + (quot.cGSTPercent + quot.sGSTPercent) / 100);
    const storedCgst = (storedSub * quot.cGSTPercent) / 100;
    const storedSgst = (storedSub * quot.sGSTPercent) / 100;
    const storedGross = storedSub + storedCgst + storedSgst;
    const storedFinal = Math.round(storedGross);

    const html = buildProformaHTML({
      rows: pdfRows,
      withPrinting: pdfRows.some(r => r.rowType === 'printing'),
      selectedCustomer: cust,
      quotNo: quot.quotationNumber,
      quotDate: quot.quotationDate,
      revisionNo: quot.quotationRevisionNumber,
      cgstPct: quot.cGSTPercent,
      sgstPct: quot.sGSTPercent,
      subTotal: storedSub,
      cgstAmt: storedCgst,
      sgstAmt: storedSgst,
      roundOff: storedFinal - storedGross,
      finalTotal: storedFinal,
      selectedTerms: [],
      termsTexts: [],
      invoiceID,   // ← NEW: pass through to buildProformaHTML
    });
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };
  /* ── Load API data ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cRaw, hRaw, sRaw, tRaw, qRaw, qlRaw, pRaw, contractsRaw, mapsRaw, quotCustRaw] = await Promise.all([
          apiService.getAllCustomers(),
          apiService.getAllHoardings(),
          apiService.getAllSites().catch(() => []),
          apiService.getAllCustomerTerms().catch(() => []),
          apiService.getAllQuotations().catch(() => []),
          apiService.getAllQuotationLines().catch(() => []),
          apiService.getAllPaymentFreqs().catch(() => []),
          apiService.getAllCustomerContracts().catch(() => []),                  // ← NEW
          apiService.getAllCustomerContractHoardingMaps().catch(() => []),       // ← NEW
          apiService.getAllQuotationCustomers().catch(() => []),
        ]);

        setCustomers(normalizeList(cRaw).map(normalizeCustomer));
        setHoardings(normalizeList(hRaw));
        setSites(normalizeList(sRaw).map(normalizeSite).filter(Boolean));
        setTermsList(normalizeList(tRaw));
        setQuotations(normalizeList(qRaw).map(normalizeQuotation));
        setQuotLines(normalizeList(qlRaw).map(normalizeQuotLine));
        const freqList = normalizeList(pRaw);
        setPaymentFreqs(freqList.map(f => ({
          value: f.paymentFreqID ?? f.PaymentFreqID,
          label: f.freqName ?? f.FreqName ?? f.name ?? String(f.paymentFreqID ?? ''),
        })));
        const contractedIds = new Set(
          normalizeList(quotCustRaw)
            .map(qc => Number(
              qc.quotation_ID ?? qc.quotationID ?? qc.QuotationID ??
              qc.Quotation_ID ?? 0
            ))
            .filter(id => id > 0)
        );
        setContractedQuotIds(contractedIds);
        // ← NEW: store contracts + maps for conflict detection
        setAllContracts(normalizeList(contractsRaw).map(c => ({
          customerContractID: c.customerContractID ?? c.CustomerContractID,
          customerID: c.customerID ?? c.CustomerID,
          startDate: (c.startDate ?? c.StartDate ?? '').split('T')[0],
          endDate: (c.endDate ?? c.EndDate ?? '').split('T')[0],
          status: c.status ?? c.Status ?? '',
        })));
        setAllContractMaps(normalizeList(mapsRaw));
      } catch (err) {
        setApiError(err?.response?.data?.message || err?.message || 'Failed to load data.');
      } finally { setLoading(false); }

      // Load merges separately — isolated so it can never break main data loading
      try {
        const mRaw = await apiService.getAllQuotationMerges();
        setQuotMerges(normalizeList(mRaw).map(m => ({
          quotationMergeID: m.quotationMergeID ?? m.QuotationMergeID ?? 0,
          quotationLineNumber: m.quotationLineNumber ?? m.QuotationLineNumber ?? 0,
          quotationID: m.quotationID ?? m.QuotationID ?? 0,
          quotationRevisionNumber: m.quotationRevisionNumber ?? m.QuotationRevisionNumber ?? 0,
          hoardingID: m.hoardingID ?? m.HoardingID ?? 0,
          mergeAlongFlag: m.mergeAlongFlag ?? m.MergeAlongFlag ?? 'H',
        })));
      } catch {
        setQuotMerges([]);
      }
    })();
  }, []);
  useEffect(() => {
    if (!showPrintTypeDD) return;
    const handler = (e) => {
      if (!printTypeBtnRef.current?.contains(e.target) &&
        !printTypePanelRef.current?.contains(e.target)) {
        setShowPrintTypeDD(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPrintTypeDD]);
  /* ── Refresh quotations ── */
  const refreshQuotations = useCallback(async () => {
    try {
      const [qRaw, qlRaw] = await Promise.all([
        apiService.getAllQuotations(),
        apiService.getAllQuotationLines(),
      ]);
      setQuotations(normalizeList(qRaw).map(normalizeQuotation));
      setQuotLines(normalizeList(qlRaw).map(normalizeQuotLine));

      // ← Also reload merges so handleViewPDF sees newly saved ones
      try {
        const mRaw = await apiService.getAllQuotationMerges();
        setQuotMerges(normalizeList(mRaw).map(m => ({
          quotationMergeID: m.quotationMergeID ?? m.QuotationMergeID ?? 0,
          quotationLineNumber: m.quotationLineNumber ?? m.QuotationLineNumber ?? 0,
          quotationID: m.quotationID ?? m.QuotationID ?? 0,
          quotationRevisionNumber: m.quotationRevisionNumber ?? m.QuotationRevisionNumber ?? 0,
          hoardingID: m.hoardingID ?? m.HoardingID ?? 0,
          mergeAlongFlag: m.mergeAlongFlag ?? m.MergeAlongFlag ?? 'H',
        })));
      } catch { /* silent — merged rows just won't show if this fails */ }

      showToast('List refreshed', 'success');
    } catch (err) {
      showToast('Refresh failed: ' + (err?.message || 'Unknown error'), 'error');
    }
  }, [showToast]);

  /* ── NEW: handle customer saved from CustomerEditModal ── */
  const handleCustomerSaved = useCallback((updated) => {
    setCustomers(prev => prev.map(c =>
      c.customerID === updated.customerID ? { ...c, ...updated } : c
    ));
    if (selectedCustomer?.customerID === updated.customerID) {
      setSelectedCustomer(prev => ({ ...prev, ...updated }));
    }
  }, [selectedCustomer]);

  /* ── Calculations ── */
  const subTotal = useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows]);
  const cgstAmt = useMemo(() => (subTotal * Number(cgstPct || 0)) / 100, [subTotal, cgstPct]);
  const sgstAmt = useMemo(() => (subTotal * Number(sgstPct || 0)) / 100, [subTotal, sgstPct]);
  const grossTotal = useMemo(() => subTotal + cgstAmt + sgstAmt, [subTotal, cgstAmt, sgstAmt]);
  const finalTotal = useMemo(() => Math.round(grossTotal), [grossTotal]);
  const roundOff = useMemo(() => finalTotal - grossTotal, [finalTotal, grossTotal]);

  /* ── Row operations ── */
  const updateRow = useCallback((id, field, val) => {
    setRows(prev => prev.map(r => {
      if (r._id !== id) return r;
      const u = { ...r, [field]: val };

      if (u.rowType === 'extra') {
        // extra charge: amount is directly editable — no auto-calculation
      } else if (u.rowType === 'printing') {
        // printing: sqFt × ratePerMonth
        if (['nos', 'sqFt', 'ratePerMonth'].includes(field)) {
          u.amount = Number(u.sqFt || 0) * Number(u.ratePerMonth || 0);
        }
      } else {
        // hoarding: date-based if both dates present, else nos × rate
        if (['ratePerMonth', 'nos', 'sqFt'].includes(field)) {
          if (u.startDate && u.endDate) {
            u.amount = calcAmountByDates(u.startDate, u.endDate, u.ratePerMonth);
          } else {
            u.amount = Number(u.ratePerMonth || 0) * Number(u.nos || 1);
          }
        }

        // nos changed → recalculate endDate (keep date logic)
        if (field === 'nos' && u.startDate) {
          u.endDate = addMonths(u.startDate, Number(val) || 1);
          u.amount = calcAmountByDates(u.startDate, u.endDate, u.ratePerMonth);
        }

        // startDate changed → recalculate endDate + amount
        if (field === 'startDate' && u.startDate) {
          u.endDate = addMonths(val, Number(u.nos) || 1);
          u.amount = calcAmountByDates(u.startDate, u.endDate, u.ratePerMonth);
        }

        // endDate changed → recalculate amount (and nos display)
        if (field === 'endDate' && u.startDate && u.endDate) {
          u.amount = calcAmountByDates(u.startDate, u.endDate, u.ratePerMonth);
          u.nos = calcNOSFromDates(u.startDate, u.endDate);
        }
      }

      return u;
    }));
  }, []);

  // Also add updateRowMultiple for printing-row size selection:
  const updateRowMultiple = useCallback((id, updates) => {
    setRows(prev => prev.map(r => {
      if (r._id !== id) return r;
      const u = { ...r, ...updates };
      if (u.rowType === 'printing') {
        u.amount = Number(u.sqFt || 0) * Number(u.ratePerMonth || 0);
      }
      return u;
    }));
  }, []);

  const deleteRow = useCallback((id) => setRows(p => p.filter(r => r._id !== id)), []);
  const existingHoardingIds = useMemo(() => new Set(rows.map(r => r.hoardingID).filter(Boolean)), [rows]);

  const applyGlobalDates = useCallback(() => {
    if (!globalStart) return;
    const updatedRows = rows.map(r => {
      if (r.rowType !== 'hoarding') return r;
      const end = globalEnd || addMonths(globalStart, Number(r.nos) || 1);
      return { ...r, startDate: globalStart, endDate: end };
    });
    setRows(updatedRows);
    // ── conflict check ──
    const conflicts = checkHoardingDateConflicts(updatedRows, allContracts, allContractMaps, customers);
    if (conflicts.length > 0) { setConflictWarnings(conflicts); setShowConflictModal(true); }
  }, [globalStart, globalEnd, rows, allContracts, allContractMaps, customers]);

  const handleAddSelected = (selectedIds) => {
    const toAdd = hoardings
      .filter(h => selectedIds.has(h.hoardingID) && !rows.find(r => r.hoardingID === h.hoardingID))
      .map(h => newHoardingRow(h, globalStart, globalEnd || addMonths(globalStart, 1), siteMap));
    const nextRows = [...rows, ...toAdd];
    setRows(nextRows);
    setShowHoardModal(false);
    // ── conflict check ──
    const conflicts = checkHoardingDateConflicts(nextRows, allContracts, allContractMaps, customers);
    if (conflicts.length > 0) { setConflictWarnings(conflicts); setShowConflictModal(true); }
  };

  const handleAddManual = (selectedIds) => {
    const toAdd = hoardings
      .filter(h => selectedIds.has(h.hoardingID) && !rows.find(r => r.hoardingID === h.hoardingID))
      .map(h => newHoardingRow(h, globalStart, globalEnd || addMonths(globalStart, 1), siteMap));
    const nextRows = [...rows, ...toAdd];
    setRows(nextRows);
    setShowManualModal(false);
    // ── conflict check ──
    const conflicts = checkHoardingDateConflicts(nextRows, allContracts, allContractMaps, customers);
    if (conflicts.length > 0) { setConflictWarnings(conflicts); setShowConflictModal(true); }
  };

  const handleMerge = useCallback((selectedRows, direction) => {
    const merged = newMergedRow(selectedRows, direction);
    setRows(prev => {
      const ids = new Set(selectedRows.map(r => r._id));
      return [...prev.filter(r => !ids.has(r._id)), merged];
    });
    setShowMergeModal(false);
    showToast(
      `${selectedRows.length} hoarding${selectedRows.length !== 1 ? 's' : ''} merged ` +
      `(${direction === 'H' ? 'Horizontal' : 'Vertical'}) · Size: ${merged.size}`,
      'success'
    );
  }, [showToast]);
  const toggleMergeDirection = useCallback((rowId) => {
    setRows(prev => prev.map(r => {
      if (r._id !== rowId || r.rowType !== 'merged') return r;

      const newDir = r.mergeDirection === 'H' ? 'V' : 'H';
      const hIds = r.mergedHoardingIDs || [];

      // Look up original dimensions from the hoardings array
      const sizes = hIds
        .map(hid => hoardings.find(hh => hh.hoardingID === hid))
        .filter(Boolean)
        .map(h => ({ w: h.width || 0, h: h.height || 0 }));

      if (sizes.length < 2) return { ...r, mergeDirection: newDir }; // no data, just flip label

      const gaps = hIds.length - 1;
      let mw, mh;
      if (newDir === 'H') {
        mw = sizes.reduce((s, sz) => s + sz.w, 0) + gaps;
        mh = Math.max(...sizes.map(s => s.h));
      } else {
        mw = Math.max(...sizes.map(s => s.w));
        mh = sizes.reduce((s, sz) => s + sz.h, 0) + gaps;
      }

      return { ...r, mergeDirection: newDir, size: `${mw} X ${mh}`, sqFt: mw * mh };
    }));
  }, [hoardings]);

  const toggleTerm = (termID) => {
    setSelectedTerms(p => {
      if (p.includes(termID)) return p.filter(i => i !== termID);
      if (p.length >= 3) return p;
      return [...p, termID];
    });
  };

  const resetForm = () => {
    setSelectedCustomer(null); setWithPrinting(false);
    setQuotNo(''); setQuotDate(todayISO());
    setRevisionNo(1);
    setRows([]);
    setCgstPct(9); setSgstPct(9);
    setSelectedTerms([]);
    setStep1Error(''); setStep2Error('');
    setEditingQuotID(null);
    setOriginalQuotID(0);   // ← NEW
    setGlobalStart(''); setGlobalEnd('');
  };

  const handleStartNew = async () => {
    resetForm();
    setStep(1);
    setIsCreating(true);
    // Fetch auto-generated quotation number from backend
    try {
      const res = await apiService.getNextQuotationNumber();
      // res could be a string, or object with a field
      const num = typeof res === 'string' ? res
        : res?.quotationNumber ?? res?.number ?? res?.nextNumber
        ?? res?.seriesNumber ?? res?.value ?? res?.data ?? '';
      if (num) setQuotNo(String(num));
    } catch (err) {
      console.warn('[QuotNo] Could not fetch auto number:', err?.message);
    }
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };
const handleEditQuotation = (quot) => {
  const myLines = quotLines.filter(l =>
    Number(l.quotationID) === Number(quot.quotationID) &&
    Number(l.quotationRevisionNumber) === Number(quot.quotationRevisionNumber)
  );
  const myMerges = quotMerges.filter(m =>
    Number(m.quotationID) === Number(quot.quotationID) &&
    Number(m.quotationRevisionNumber) === Number(quot.quotationRevisionNumber)
  );
  // ...rest unchanged
    const cust = customers.find(c => c.customerID === quot.customerID) || null;

    setSelectedCustomer(cust);
    setWithPrinting(false);
    setQuotNo(quot.quotationNumber);
    setQuotDate(quot.quotationDate ? quot.quotationDate.split('T')[0] : todayISO());
    setRevisionNo(quot.quotationRevisionNumber || 1);   // ← SAME revision, not +1
    setEditingQuotID(quot.quotationID);                  // ← PUT updates this row in place

    const regularRows = myLines
      .filter(l => !l.mergeFlag)
      .map(l => {
        if (!l.hoardingID && l.purpose) {
          const isPrinting = PRINTING_TYPES.some(pt =>
            pt.toLowerCase() === (l.purpose || '').toLowerCase()
          );
          return {
            _id: uid(),
            rowType: isPrinting ? 'printing' : 'extra',
            hoardingID: 0, siteID: null, siteObj: null,
            location: l.purpose, hoardingCode: '', size: '', sqFt: 0, nos: 1,
            startDate: l.periodBeginDate || '', endDate: l.periodEndDate || '',
            ratePerMonth: l.rentAmount || 0, amount: l.rentAmount || 0,
            printingCost: 0,
            quotationLineNumber: l.quotationLineNumber,
            saved: true,
          };
        }
        const h = hoardings.find(hh => hh.hoardingID === l.hoardingID);
        const siteID = h?.siteID ?? h?.site?.siteID ?? null;
        const siteObj = siteID != null ? (siteMap.get(siteID) ?? (h?.site ? normalizeSite(h.site) : null)) : null;
        return {
          _id: uid(), rowType: 'hoarding',
          hoardingID: l.hoardingID, siteID, siteObj,
          location: buildSiteAddress(siteObj, h?.hoardingCode || ''),
          hoardingCode: h?.hoardingCode || '',
          size: h ? `${h.width} X ${h.height}` : '',
          sqFt: h ? (h.width * h.height) : 0,
          nos: 1,
          startDate: l.periodBeginDate || '', endDate: l.periodEndDate || '',
          ratePerMonth: l.rentAmount || h?.monthlyRent || 0,
          amount: l.rentAmount || 0,
          printingCost: 0,
          quotationLineNumber: l.quotationLineNumber,
          saved: true,
        };
      });

    // Reconstruct merged rows (kept as "saved" so existing merge records aren't duplicated)
    const mergedRows = [];
    if (myMerges.length >= 2) {
      const byLine = new Map();
      for (const m of myMerges) {
        const ln = m.quotationLineNumber;
        if (!byLine.has(ln)) byLine.set(ln, []);
        byLine.get(ln).push(m);
      }
      for (const [ln, records] of byLine.entries()) {
        if (records.length < 2) continue;
        const savedLine = myLines.find(l => l.mergeFlag && Number(l.quotationLineNumber) === Number(ln));
        const dir = records[0].mergeAlongFlag === 'H' ? 'H' : 'V';
        const hoardingObjs = records.map(r => hoardings.find(h => h.hoardingID === r.hoardingID)).filter(Boolean);

        const sizes = hoardingObjs.map(h => ({ w: h.width || 0, h: h.height || 0 }));
        const gaps = hoardingObjs.length - 1;
        let mw, mh;
        if (dir === 'H') { mw = sizes.reduce((s, sz) => s + sz.w, 0) + gaps; mh = Math.max(...sizes.map(s => s.h)); }
        else { mw = Math.max(...sizes.map(s => s.w)); mh = sizes.reduce((s, sz) => s + sz.h, 0) + gaps; }

        const locations = hoardingObjs.map(h => {
          const site = h.siteID ? siteMap.get(h.siteID) : null;
          return buildSiteAddress(site, h.hoardingCode || '');
        });
        const codes = hoardingObjs.map(h => h.hoardingCode || '').join(' + ');

        mergedRows.push({
          _id: uid(),
          rowType: 'merged',
          isMerged: true,
          mergeDirection: dir,
          mergedHoardingIDs: hoardingObjs.map(h => h.hoardingID),
          hoardingID: 0, siteID: null,
          location: savedLine?.purpose || locations.join(' + '),
          hoardingCode: codes,
          size: `${mw} X ${mh}`,
          sqFt: mw * mh,
          nos: 1,
          startDate: savedLine?.periodBeginDate || '',
          endDate: savedLine?.periodEndDate || '',
          ratePerMonth: savedLine?.rentAmount || 0,
          amount: savedLine?.rentAmount || 0,
          printingCost: 0,
          quotationLineNumber: savedLine?.quotationLineNumber || 0,
          saved: true,
        });
      }
    }

    const allRows = [...regularRows, ...mergedRows];
    setRows(allRows);
    setCgstPct(quot.cGSTPercent ?? 9);
    setSgstPct(quot.sGSTPercent ?? 9);
    setSelectedTerms([]);
    setStep1Error(''); setStep2Error('');

    // ── Derive global period from the loaded rows ──
    const datedRows = allRows.filter(r => r.startDate && r.endDate);
    if (datedRows.length > 0) {
      const gStart = datedRows.reduce((min, r) => (r.startDate < min ? r.startDate : min), datedRows[0].startDate);
      const gEnd = datedRows.reduce((max, r) => (r.endDate > max ? r.endDate : max), datedRows[0].endDate);
      setGlobalStart(gStart);
      setGlobalEnd(gEnd);
    } else {
      setGlobalStart(''); setGlobalEnd('');
    }

    setStep(1); setIsCreating(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };
  const handleReopenHistory = async (quot) => {
    const myLines = quotLines.filter(l =>
      l.quotationID === quot.quotationID &&
      l.quotationRevisionNumber === quot.quotationRevisionNumber
    );
    const cust = customers.find(c => c.customerID === quot.customerID) || null;
    setSelectedCustomer(cust);
    setWithPrinting(false);
    setQuotNo(quot.quotationNumber);
    setQuotDate(todayISO());
    setRevisionNo((quot.quotationRevisionNumber || 1) + 1);
    // AFTER
    const builtRows = myLines
      .filter(l => !l.mergeFlag)   // exclude merged-line records — merges are read-only on revise
      .map(l => {
        // ── Restore printing / extra rows from saved purpose ──
        if (!l.hoardingID && l.purpose) {
          const isPrinting = PRINTING_TYPES.some(pt =>
            pt.toLowerCase() === (l.purpose || '').toLowerCase()
          );
          return {
            _id: uid(),
            rowType: isPrinting ? 'printing' : 'extra',
            hoardingID: 0,
            siteID: null,
            siteObj: null,
            location: l.purpose,
            hoardingCode: '',
            size: '',
            sqFt: 0,
            nos: 1,
            startDate: l.periodBeginDate || '',
            endDate: l.periodEndDate || '',
            ratePerMonth: l.rentAmount || 0,
            amount: l.rentAmount || 0,
            printingCost: 0,
            quotationLineNumber: l.quotationLineNumber,
            saved: true,
          };
        }
        // ── Regular hoarding row ──
        const h = hoardings.find(hh => hh.hoardingID === l.hoardingID);
        const siteID = h?.siteID ?? h?.site?.siteID ?? null;
        const siteObj = siteID != null ? (siteMap.get(siteID) ?? (h?.site ? normalizeSite(h.site) : null)) : null;
        return {
          _id: uid(), rowType: 'hoarding',
          hoardingID: l.hoardingID,
          siteID,
          siteObj,
          location: buildSiteAddress(siteObj, h?.hoardingCode || ''),
          hoardingCode: h?.hoardingCode || '',
          size: h ? `${h.width} X ${h.height}` : '',
          sqFt: h ? (h.width * h.height) : 0,
          nos: 1,
          startDate: l.periodBeginDate || '',
          endDate: l.periodEndDate || '',
          ratePerMonth: l.rentAmount || h?.monthlyRent || 0,
          amount: l.rentAmount || 0,
          printingCost: 0,
          quotationLineNumber: l.quotationLineNumber,
          saved: false,
        };
      });
    setRows(builtRows);
    setCgstPct(quot.cGSTPercent ?? 9);
    setSgstPct(quot.sGSTPercent ?? 9);
    setSelectedTerms([]);
    setStep1Error(''); setStep2Error('');
    setEditingQuotID(null);
    setOriginalQuotID(quot.quotationID);   // ← NEW: same quotationID family, so backend keeps the number

    // ── Derive global period from the loaded rows ──
    const datedRows = builtRows.filter(r => r.startDate && r.endDate);
    if (datedRows.length > 0) {
      const gStart = datedRows.reduce((min, r) => (r.startDate < min ? r.startDate : min), datedRows[0].startDate);
      const gEnd = datedRows.reduce((max, r) => (r.endDate > max ? r.endDate : max), datedRows[0].endDate);
      setGlobalStart(gStart);
      setGlobalEnd(gEnd);
    } else {
      setGlobalStart(''); setGlobalEnd('');
    }

    setStep(1); setIsCreating(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const handleViewPDF = (quot) => {
    const myLines = quotLines.filter(l =>
      Number(l.quotationID) === Number(quot.quotationID) &&
      Number(l.quotationRevisionNumber) === Number(quot.quotationRevisionNumber)
    );
    const cust = customers.find(c => c.customerID === quot.customerID) || null;

    /* ── Build rows from QuotationLineDTL ── */
    const pdfRows = myLines
      .filter(l => !l.mergeFlag)   // exclude merged-line records; those come from QuotationMergeDTL below
      .map(l => {
        // ── Printing / Extra rows (hoardingID = 0, purpose set) ──
        if (!l.hoardingID && l.purpose) {
          const isPrinting = PRINTING_TYPES.some(pt =>
            pt.toLowerCase() === (l.purpose || '').toLowerCase()
          );
          return {
            rowType: isPrinting ? 'printing' : 'extra',
            hoardingID: 0,
            location: l.purpose,
            size: '',
            sqFt: 0,
            nos: 1,
            startDate: l.periodBeginDate,
            endDate: l.periodEndDate,
            ratePerMonth: l.rentAmount,
            amount: l.rentAmount,
            printingCost: 0,
          };
        }
        // ── Regular hoarding row ──
        const h = hoardings.find(hh => hh.hoardingID === l.hoardingID);
        const siteID = h?.siteID ?? h?.site?.siteID ?? null;
        const siteObj = siteID != null
          ? (siteMap.get(siteID) ?? (h?.site ? normalizeSite(h.site) : null))
          : null;
        return {
          rowType: 'hoarding',
          hoardingID: l.hoardingID,
          location: buildSiteAddress(siteObj, h?.hoardingCode || ''),
          size: h ? `${h.width} X ${h.height}` : '',
          sqFt: h ? (h.width * h.height) : 0,
          nos: 1,
          startDate: l.periodBeginDate,
          endDate: l.periodEndDate,
          ratePerMonth: l.rentAmount,
          amount: l.rentAmount,
          printingCost: 0,
        };
      });

    /* ── Merged rows from QuotationMergeDTL ──
       Group by quotationLineNumber (≥2 records per merge group).
       Reconstruct merged size + location from source hoardings.
       Use the saved QuotationLineDTL merge-flag line for amount/dates.
    ── */
    const myMerges = quotMerges.filter(m =>
      Number(m.quotationID) === Number(quot.quotationID) &&
      Number(m.quotationRevisionNumber) === Number(quot.quotationRevisionNumber)
    );

    if (myMerges.length >= 2) {
      const byLine = new Map();
      for (const m of myMerges) {
        const ln = m.quotationLineNumber;
        if (!byLine.has(ln)) byLine.set(ln, []);
        byLine.get(ln).push(m);
      }

      const sortedKeys = [...byLine.keys()].sort((a, b) => a - b);
      for (const ln of sortedKeys) {
        const records = byLine.get(ln);
        if (records.length < 2) continue;

        // Saved line record for this merge (has correct amount + dates)
        const savedLine = myLines.find(l =>
          l.mergeFlag && Number(l.quotationLineNumber) === Number(ln)
        );

        const dir = records[0].mergeAlongFlag === 'H' ? 'H' : 'V';
        const hoardingObjs = records
          .map(r => hoardings.find(h => h.hoardingID === r.hoardingID))
          .filter(Boolean);

        const sizes = hoardingObjs.map(h => ({ w: h.width || 0, h: h.height || 0 }));
        const gaps = hoardingObjs.length - 1;
        let mw, mh;
        if (dir === 'H') {
          mw = sizes.reduce((s, sz) => s + sz.w, 0) + gaps;
          mh = Math.max(...sizes.map(s => s.h));
        } else {
          mw = Math.max(...sizes.map(s => s.w));
          mh = sizes.reduce((s, sz) => s + sz.h, 0) + gaps;
        }

        const locations = hoardingObjs.map(h => {
          const site = h.siteID ? siteMap.get(h.siteID) : null;
          return buildSiteAddress(site, h.hoardingCode || '');
        });
        const codes = hoardingObjs.map(h => h.hoardingCode || '').join(' + ');
        const fallbackRate = hoardingObjs.reduce((s, h) => s + (h.monthlyRent || 0), 0);

        pdfRows.push({
          rowType: 'merged',
          isMerged: true,
          mergeDirection: dir,
          hoardingID: 0,
          location: savedLine?.purpose || locations.join(' + '),
          hoardingCode: codes,
          size: `${mw} X ${mh}`,
          sqFt: mw * mh,
          nos: 1,
          startDate: savedLine?.periodBeginDate || '',
          endDate: savedLine?.periodEndDate || '',
          ratePerMonth: savedLine ? savedLine.rentAmount : fallbackRate,
          amount: savedLine ? savedLine.rentAmount : fallbackRate,
          printingCost: 0,
        });
      }
    }

    /* ── Open PDF ── */
    const storedSub = quot.totalAmount / (1 + (quot.cGSTPercent + quot.sGSTPercent) / 100);
    const storedCgst = (storedSub * quot.cGSTPercent) / 100;
    const storedSgst = (storedSub * quot.sGSTPercent) / 100;
    const storedGross = storedSub + storedCgst + storedSgst;
    const storedFinal = Math.round(storedGross);

    const html = buildPrintHTML({
      rows: pdfRows,
      withPrinting: pdfRows.some(r => r.rowType === 'printing'),
      selectedCustomer: cust,
      quotNo: quot.quotationNumber,
      quotDate: quot.quotationDate,
      revisionNo: quot.quotationRevisionNumber,
      cgstPct: quot.cGSTPercent,
      sgstPct: quot.sGSTPercent,
      subTotal: storedSub,
      cgstAmt: storedCgst,
      sgstAmt: storedSgst,
      roundOff: storedFinal - storedGross,
      finalTotal: storedFinal,
      selectedTerms: [],
      termsTexts: [],
    });
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const goNext = () => {
    if (step === 1) {
      if (!selectedCustomer) { setStep1Error('Please select a customer.'); return; }
      if (!globalStart) { setStep1Error('Global Period From date is required.'); return; }
      if (!globalEnd) { setStep1Error('Global Period To date is required.'); return; }
      setStep1Error(''); setStep(2);
    } else if (step === 2) {
      if (rows.length === 0) { setStep2Error('Add at least one hoarding.'); return; }
      
      if (withPrinting) {
        // 1. Verify there is at least one hoarding row (or merged hoarding)
        const hasHoarding = rows.some(r => r.rowType === 'hoarding' || r.rowType === 'merged');
        if (!hasHoarding) {
          setStep2Error('Select any hoarding.');
          return;
        }

        // 2. Verify all printing rows have a size selected
        const hasUnselectedSize = rows.some(r => r.rowType === 'printing' && !r.size);
        if (hasUnselectedSize) {
          setStep2Error('Select the size from the dropdown.');
          return;
        }
      }

      // ── re-check conflicts before proceeding ──
      const conflicts = checkHoardingDateConflicts(rows, allContracts, allContractMaps, customers);
      if (conflicts.length > 0) {
        setConflictWarnings(conflicts);
        setShowConflictModal(true);
        setStep2Error(`${conflicts.length} hoarding${conflicts.length !== 1 ? 's have' : ' has'} date conflicts with existing contracts. Please resolve them before proceeding.`);
        return;
      }
      setStep2Error(''); setStep(3);
    }
  };
  const goBack = () => setStep(s => Math.max(1, s - 1));
  const handleBackToList = () => { setIsCreating(false); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 80); };

  const generatePDF = async () => {
    setSaving(true);
    try {
      const headerPayload = {
        quotationRevisionNumber: Number(revisionNo),
        customerID: selectedCustomer.customerID,
        quotationNumber: quotNo || `QT/${Date.now()}`,
        quotationDate: quotDate,
        cGSTPercent: Number(cgstPct),
        cGSTAmount: cgstAmt,
        sGSTPercent: Number(sgstPct),
        sGSTAmount: sgstAmt,
        totalAmount: finalTotal,
      };
      let savedHeader;
      if (editingQuotID) {
        // EDIT: same quotationID + same revision number → PUT, updates row in place
        savedHeader = await apiService.updateQuotation({ ...headerPayload, quotationID: editingQuotID });
      } else if (Number(revisionNo) > 1 && originalQuotID > 0) {
        // REVISE: pass the original quotationID so the backend recognizes this as
        // revisionNumber > 1 for that quotation family and keeps the same quotationNumber
        savedHeader = await apiService.createQuotation({ ...headerPayload, quotationID: originalQuotID });
      } else {
        // Brand new quotation (revisionNumber === 1) — backend auto-generates a fresh quotationNumber
        savedHeader = await apiService.createQuotation(headerPayload);
      }

      const savedQuotID = savedHeader?.quotationID ?? savedHeader?.QuotationID ?? editingQuotID ?? originalQuotID ?? 0;
      const savedRevNo = Number(revisionNo);
      // AFTER
      await Promise.all(
        rows.filter(r => r.rowType === 'hoarding' || r.rowType === 'printing' || r.rowType === 'extra')
          .map((row, idx) => {
            // Derive the purpose string to store:
            // - printing row  → the printing type label (e.g. "Flex Banner Printing")
            // - extra row     → the custom description the admin typed
            // - hoarding row  → empty string (no special purpose)
            const purpose =
              row.rowType === 'printing' ? (row.location || '') :
                row.rowType === 'extra' ? (row.location || '') :
                  '';

            const linePayload = {
              quotationLineNumber: idx + 1,
              quotationID: savedQuotID,
              quotationRevisionNumber: savedRevNo,
              hoardingID: row.hoardingID || 0,
              purpose,
              periodBeginDate: row.startDate || todayISO(),
              periodEndDate: row.endDate || todayISO(),
              rentAmount: Number(row.amount || 0),
              mergeFlag: false,
            };
            if (row.saved && row.quotationLineNumber > 0) {
              return apiService.updateQuotationLine(linePayload);
            }
            return apiService.createQuotationLine(linePayload);
          })
      );
      /* ── Save merge records ───────────────── *//* ── Save merge records ───────────────── */
      const mergedRows = rows.filter(r => r.rowType === 'merged');
      let nextLineNum = rows.filter(r => r.rowType === 'hoarding' || r.rowType === 'printing' || r.rowType === 'extra').length;

      for (const mergedRow of mergedRows) {
        const hIds = Array.isArray(mergedRow.mergedHoardingIDs)
          ? mergedRow.mergedHoardingIDs.map(Number).filter(id => id > 0)
          : [];
        if (!hIds.length) continue;
        const flag = mergedRow.mergeDirection === 'H' ? 'H' : 'V';

        if (mergedRow.saved && mergedRow.quotationLineNumber > 0) {
          // EDIT MODE: update existing merge line, don't re-create merge records
          await apiService.updateQuotationLine({
            quotationLineNumber: mergedRow.quotationLineNumber,
            quotationID: savedQuotID,
            quotationRevisionNumber: savedRevNo,
            hoardingID: 0,
            purpose: mergedRow.location || '',
            periodBeginDate: mergedRow.startDate || todayISO(),
            periodEndDate: mergedRow.endDate || todayISO(),
            rentAmount: Number(mergedRow.amount || 0),
            mergeFlag: true,
          });
          continue; // merge records (QuotationMergeDTL) unchanged
        }

        nextLineNum += 1;
        await apiService.createQuotationLine({
          quotationLineNumber: nextLineNum,
          quotationID: savedQuotID,
          quotationRevisionNumber: savedRevNo,
          hoardingID: 0,
          purpose: mergedRow.location || '',
          periodBeginDate: mergedRow.startDate || todayISO(),
          periodEndDate: mergedRow.endDate || todayISO(),
          rentAmount: Number(mergedRow.amount || 0),
          mergeFlag: true,
        });

        for (const hID of hIds) {
          await apiService.createQuotationMerge({
            quotationLineNumber: nextLineNum,
            quotationID: savedQuotID,
            quotationRevisionNumber: savedRevNo,
            mergeAlongFlag: flag,
            hoardingID: hID,
          });
        }
      }

      const html = buildPrintHTML({
        rows, withPrinting, selectedCustomer,
        quotNo: quotNo || `QT/${savedQuotID}`,
        quotDate, revisionNo, cgstPct, sgstPct,
        subTotal, cgstAmt, sgstAmt, roundOff, finalTotal,
        selectedTerms,
        termsTexts: selectedTerms.map(id => {
          const t = termsList.find(t => t.termID === id);
          return t?.description || '';
        }),
      });
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
      showToast('Quotation saved successfully!', 'success');
      await refreshQuotations();
      setEditingQuotID(null);
      setOriginalQuotID(0);
      setIsCreating(false);
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save quotation.', 'error');
    } finally { setSaving(false); }
  };


  /* ── History grouped table ── */
  const allGrouped = useMemo(() => {
    const map = new Map();
    for (const q of quotations) {
      const key = (q.quotationNumber || '').trim() || String(q.quotationID);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(q);
    }
    const groups = [];
    for (const revs of map.values()) {
      groups.push([...revs].sort((a, b) =>
        Number(b.quotationRevisionNumber || 0) - Number(a.quotationRevisionNumber || 0)
      ));
    }
    return groups;
  }, [quotations]);

  const filteredGroups = useMemo(() => {
    const q = histSearch.toLowerCase();
    if (!q) return allGrouped;
    return allGrouped.filter(group => {
      const l = group[0];
      const cust = customers.find(c => c.customerID === l.customerID);
      return (l.quotationNumber || '').toLowerCase().includes(q) ||
        (cust?.customerName || '').toLowerCase().includes(q);
    });
  }, [allGrouped, histSearch, customers]);

  const sortedGroups = useMemo(() => [...filteredGroups].sort((a, b) => {
    const av = String(a[0][histSortKey] || '').toLowerCase();
    const bv = String(b[0][histSortKey] || '').toLowerCase();
    return histSortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  }), [filteredGroups, histSortKey, histSortDir]);

  const histTotalPages = Math.max(1, Math.ceil(sortedGroups.length / histPageSize));
  const histPaginated = sortedGroups.slice((histPage - 1) * histPageSize, histPage * histPageSize);

  const handleHistSort = (key) => {
    if (histSortKey === key) setHistSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setHistSortKey(key); setHistSortDir('asc'); }
    setHistPage(1);
  };

  const histPageNums = Array.from({ length: histTotalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === histTotalPages || Math.abs(p - histPage) <= 1)
    .reduce((acc, p, i, arr) => { if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…'); acc.push(p); return acc; }, []);

  const HIST_COLS = [
    { key: 'quotationNumber', label: 'Quotation No.', w: '14%' },
    { key: 'customerID', label: 'Customer', w: '20%' },
    { key: 'quotationDate', label: 'Date', w: '11%' },
    { key: '_version', label: 'Latest Version', w: '11%', noSort: true },
    { key: 'totalAmount', label: 'Grand Total', w: '12%' },
    { key: '_action', label: 'Actions', w: '22%', noSort: true },
  ];

  const custName = (id) => customers.find(c => c.customerID === id)?.customerName || '—';

  const mergedCount = rows.filter(r => r.rowType === 'merged').length;

  /* ════════════════ RENDER ════════════════ */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
      <Loader2 size={32} color="#049edf" className="pg-spin" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>Loading quotation data…</span>
    </div>
  );

  return (
    <>
      {saving && (
        <div className="qt-saving-overlay">
          <Loader2 size={32} color="#049edf" className="pg-spin" />
          <div className="qt-saving-overlay__text">Saving quotation…</div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="pg-page">

        {/* ── Page Header ── */}
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">Quotations</h1>
            <p className="pg-header__subtitle">Generate and manage hoarding <strong>quotations</strong> for customers.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {isCreating && (
              <button className="pg-btn-cancel" onClick={handleBackToList} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LayoutGrid size={13} /> Back to List
              </button>
            )}
            {!isCreating && (
              <button className="pg-btn-add" onClick={handleStartNew}>
                <Plus size={14} /> New Quotation
              </button>
            )}
          </div>
        </div>

        {apiError && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11, marginBottom: 16, color: '#dc2626', fontSize: 13, fontWeight: 600, fontFamily: 'Nunito,sans-serif' }}>
            <AlertCircle size={14} /> {apiError}
          </div>
        )}

        {/* ══════════════ STEP-BASED FORM ══════════════ */}
        {isCreating && (
          <div ref={formRef} className="pg-container qt-form-container" style={{ marginBottom: 20 }}>

            {/* Step Indicator */}
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

            {/* ─── STEP 1 ─── */}
            {step === 1 && (
              <div className="qt-step-body">
                <div className="qt-form-grid">

                  {/* Customer */}
                  <div className="qt-field-full">
                    <label className="qt-label">
                      Customer <span className="qt-label--req">*</span>
                      {revisionNo > 1 && (
                        <span style={{ marginLeft: 6, fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, color: '#7c7c7c' }}>
                          · locked for revision
                        </span>
                      )}
                    </label>
                    {revisionNo > 1 ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '9px 12px', borderRadius: 10,
                        background: 'rgba(114, 114, 114, 0.04)',
                        border: '1.5px solid rgba(88, 88, 88, 0.25)',
                        cursor: 'not-allowed',
                      }}>
                        <User size={14} color="#7c7c7c" style={{ flexShrink: 0 }} />
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700, color: '#7c7c7c', flex: 1 }}>
                          {selectedCustomer?.customerName || '—'}
                        </span>
                        <span style={{ fontSize: 11, color: '#7c7c7c', flexShrink: 0 }}>🔒</span>
                      </div>
                    ) : (
                      <CustomerCombo
                        value={selectedCustomer?.customerID ?? null}
                        onChange={(c) => { setSelectedCustomer(c); setStep1Error(''); }}
                        customers={customers}
                      />
                    )}

                    {/* ── Customer info strip with Edit button ── */}
                    {selectedCustomer && (
                      <div className="qt-customer-info" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <strong>{selectedCustomer.customerName}</strong>
                          {selectedCustomer.addressLine1 && <span> · {selectedCustomer.addressLine1}</span>}
                          {selectedCustomer.city && (
                            <span>, {[selectedCustomer.city, selectedCustomer.district].filter(Boolean).join(', ')}</span>
                          )}
                          {selectedCustomer.phone1 && <span> · 📞 {selectedCustomer.phone1}</span>}
                          {selectedCustomer.gstNumber && <span> · GST: {selectedCustomer.gstNumber}</span>}
                        </div>
                        {/* ← NEW: Edit customer button */}
                        <button
                          onClick={() => setShowCustomerEditModal(true)}
                          title="Edit customer details"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '4px 11px', borderRadius: 7,
                            border: '1.5px solid rgba(4,158,223,0.30)',
                            background: 'rgba(4,158,223,0.06)',
                            cursor: 'pointer', color: '#049edf',
                            fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 800,
                            flexShrink: 0, whiteSpace: 'nowrap',
                          }}
                        >
                          <Edit2 size={11} /> Edit
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quotation Type */}
                  <div className="qt-field-full">
                    <label className="qt-label">Quotation Type <span className="qt-label--req">*</span></label>
                    <div className="qt-type-grid">
                      {[
                        { val: false, label: 'Standard Quotation', sub: 'SR, Location, Size, Period, Rate, Amount' },
                        { val: true, label: 'With Printing Cost', sub: 'Includes Printing Cost column + Flex Banner rows' },
                      ].map(({ val, label, sub }) => (
                        <button key={String(val)} onClick={() => setWithPrinting(val)}
                          className={`qt-type-card${withPrinting === val ? ' qt-type-card--active' : ''}`}>
                          <div className="qt-type-card__check">{withPrinting === val && <Check size={11} color="#fff" />}</div>
                          <div className="qt-type-card__label">{label}</div>
                          <div className="qt-type-card__sub">{sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quotation No + Date */}
                  <div>
                    <label className="qt-label">
                      Quotation No.
                      {revisionNo > 1 && (
                        <span style={{ marginLeft: 6, fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, color: '#7c7c7c' }}>
                          · locked for revision
                        </span>
                      )}
                      {revisionNo <= 1 && (
                        <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: '#16a34a', background: 'rgba(22,163,74,0.08)', padding: '1px 6px', borderRadius: 4 }}>
                          Auto Generated
                        </span>
                      )}
                    </label>
                    <div className="qt-input-wrap" style={{
                      background: 'rgba(4,158,223,0.03)',
                      borderBottomColor: revisionNo > 1 ? '#7c7c7c' : '#049edf',
                      cursor: 'not-allowed',
                    }}>
                      <Hash size={14} color={revisionNo > 1 ? '#7c7c7c' : '#049edf'} style={{ flexShrink: 0 }} />
                      <input
                        className="qt-input"
                        value={quotNo || 'Generating…'}
                        readOnly
                        style={{
                          color: revisionNo > 1 ? '#7c7c7c' : '#049edf',
                          fontWeight: 800,
                          cursor: 'not-allowed',
                          pointerEvents: 'none',
                        }}
                      />
                      <span title={revisionNo > 1 ? 'Quotation number is fixed for revisions' : 'Auto-generated by system'} style={{ fontSize: 11, color: revisionNo > 1 ? '#7c7c7c' : '#049edf', flexShrink: 0 }}>🔒</span>
                    </div>
                  </div>
                  <div>
                    <label className="qt-label">Date</label>
                    <div className="qt-input-wrap">
                      <Calendar size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
                      <input className="qt-input" type="date" value={quotDate} onChange={e => setQuotDate(e.target.value)} />
                    </div>
                  </div>

                  {/* Revision No */}
                  <div>
                    <label className="qt-label">
                      Revision No. <span className="qt-label--opt">(1 = original)</span>
                    </label>
                    <div className="qt-input-wrap" style={{ background: 'rgba(4,158,223,0.03)', borderBottomColor: revisionNo > 1 ? '#7c7c7c' : '#049edf', cursor: 'default' }}>
                      <Edit2 size={14} color={revisionNo > 1 ? '#7c7c7c' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                      <input className="qt-input" type="number" value={revisionNo} readOnly
                        style={{ color: revisionNo > 1 ? '#7c7c7c' : '#1a1a2e', fontWeight: 900, cursor: 'default', pointerEvents: 'none' }} />
                      <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, color: revisionNo > 1 ? '#7c7c7c' : '#16a34a', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {revisionNo <= 1 ? 'Original' : `Revision ${revisionNo}`}
                      </span>
                    </div>
                  </div>

                  {/* Global Period Dates */}
                  <div className="qt-field-full">
                    <label className="qt-label">
                      Global Period Dates <span className="qt-label--req">*</span>
                      <span className="qt-label--opt"> — applied to all hoardings; editable per row in step 2</span>
                    </label>
                    <div className="qt-date-banner">
                      <span className="qt-date-banner__label"><Calendar size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Period:</span>
                      <div className="qt-date-banner__field">
                        <span className="qt-date-banner__sep">From</span>
                        <input type="date" className="qt-date-banner__input" value={globalStart} onChange={e => setGlobalStart(e.target.value)} />
                        <span className="qt-date-banner__sep">To</span>
                        <input type="date" className="qt-date-banner__input" value={globalEnd} onChange={e => setGlobalEnd(e.target.value)} />
                      </div>
                    </div>
                  </div>

                </div>

                {step1Error && (
                  <div className="qt-error-banner">
                    <AlertCircle size={14} /> {step1Error}
                  </div>
                )}

                <div className="qt-step-foot">
                  <button className="pg-btn-cancel" onClick={handleBackToList} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LayoutGrid size={13} /> Back to List
                  </button>
                  <button className="pg-btn-save" onClick={goNext}>
                    Next: Add Hoardings <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 2 ─── */}
            {step === 2 && (
              <div className="qt-step-body">
                {(globalStart || globalEnd) && (
                  <div className="qt-date-banner" style={{ marginBottom: 14 }}>
                    <span className="qt-date-banner__label"><Calendar size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Global Period:</span>
                    <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>
                      {globalStart ? fmtDateDisplay(globalStart) : '—'} → {globalEnd ? fmtDateDisplay(globalEnd) : 'Auto'}
                    </span>
                    <button className="qt-date-banner__apply" onClick={applyGlobalDates}>
                      <RefreshCw size={12} /> Apply to All
                    </button>
                  </div>
                )}

                {/* Site colour legend */}
                {rows.length > 0 && (() => {
                  const siteIds = [...new Set(rows.map(r => r.siteID).filter(sid => sid != null))];
                  if (siteIds.length === 0) return null;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap', padding: '8px 12px', background: '#f8f8fd', borderRadius: 10, border: '1px solid #f0f0f8' }}>
                      <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 700, color: '#5a5a78' }}>Sites:</span>
                      {siteIds.map(sid => {
                        const color = siteColorMap.get(toSID(sid));
                        const h = hoardings.find(hh => (hh.siteID ?? hh.site?.siteID) === sid);
                        const label = h?.site?.addressLine1 || h?.site?.city || `Site ${sid}`;
                        return color ? (
                          <div key={sid} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: color.bg, border: `1px solid ${color.border}` }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color.dot }} />
                            <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, color: '#1a1a2e', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                          </div>
                        ) : null;
                      })}
                      {mergedCount > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}>
                          <Link2 size={10} color="#7c3aed" />
                          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>{mergedCount} Merged</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="qt-step2-head">
                  <div>
                    <div className="qt-step2-title">Hoarding Items</div>
                    <div className="qt-step2-sub">
                      {rows.length} row{rows.length !== 1 ? 's' : ''} · {Math.max(1, Math.ceil(rows.length / ROWS_PER_PRINT_PAGE))} page{Math.max(1, Math.ceil(rows.length / ROWS_PER_PRINT_PAGE)) !== 1 ? 's' : ''} in PDF
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="pg-btn-cancel"
                      onClick={() => setShowMergeModal(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: 'rgba(124,58,237,0.35)', color: '#7c3aed', background: 'rgba(124,58,237,0.05)' }}
                      title="Merge two hoardings into one large display"
                    >
                      <Link2 size={13} /> Merge
                    </button>
                    <button className="pg-btn-cancel" onClick={() => setShowManualModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Building2 size={13} /> Add Manual
                    </button>
                    <button className="pg-btn-save" onClick={() => setShowHoardModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Plus size={13} /> Add Hoardings
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #f0f0f8', borderRadius: 12, marginBottom: 12 }}>
                  {rows.length === 0 ? (
                    <div className="pg-empty__inner" style={{ padding: '44px 20px' }}>
                      <Building2 size={38} color="#d0d0e8" />
                      <span className="pg-empty__label">No hoardings added yet</span>
                    </div>
                  ) : (
                    <table className="pg-table" ref={step2TableRef}>
                      <thead>
                        <tr>
                          <th className="pg-th">#</th>
                          <th className="pg-th" style={{ textAlign: 'left' }}>Site Address / Product</th>
                          <th className="pg-th">Size</th>
                          {!withPrinting && <>
                            <th className="pg-th">Sq.Ft</th>
                            <th className="pg-th">NOS</th>
                            <th className="pg-th">Start Date</th>
                            <th className="pg-th">End Date</th>
                          </>}
                          {withPrinting && <>
                            <th className="pg-th">NOS / Sq.Ft</th>
                            <th className="pg-th">Start Date</th>
                            <th className="pg-th">End Date</th>
                          </>}
                          <th className="pg-th">Rate/Mo</th>
                          {withPrinting && <th className="pg-th" style={{ color: '#7c3aed' }}>Print Cost</th>}
                          <th className="pg-th">Amount</th>
                          <th className="pg-th"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Compute sizeMap once — used by printing row SIZE dropdown
                          const sizeMap = {};
                          rows.forEach(r2 => {
                            if (r2.rowType === 'hoarding' && r2.size) {
                              if (!sizeMap[r2.size]) sizeMap[r2.size] = { sqFt: r2.sqFt || 0, count: 0, isMerged: false };
                              sizeMap[r2.size].count++;
                            } else if (r2.rowType === 'merged' && r2.size) {
                              // unique key so merged sizes don't collide/combine with regular hoarding sizes
                              const key = `${r2.size} (Merged)`;
                              if (!sizeMap[key]) sizeMap[key] = { sqFt: r2.sqFt || 0, count: 0, isMerged: true };
                              sizeMap[key].count++;   // ← CHANGED: increment instead of staying fixed at 1
                            }
                          });
                          const sizeOptions = Object.entries(sizeMap);

                          return rows.map((row, i) => {
                            const siteColor = getRowSiteColor(row);
                            const isMerged = row.rowType === 'merged';
                            const isPrint = row.rowType === 'printing';
                            const isExtra = row.rowType === 'extra';

                            const rowBg = isMerged ? 'rgba(124,58,237,0.05)'
                              : isPrint ? 'rgba(124,58,237,0.03)'
                                : siteColor ? siteColor.bg
                                  : '';
                            const rowBorderLeft = isMerged ? '4px solid rgba(124,58,237,0.40)'
                              : siteColor ? `4px solid ${siteColor.border}`
                                : '4px solid transparent';

                            return (
                              <tr key={row._id} className="pg-tr" style={{ background: rowBg, borderLeft: rowBorderLeft }}>
                                <td className="pg-td" style={{ textAlign: 'center' }}>
                                  {isMerged ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                      <Link2 size={12} color="#7c3aed" />
                                      <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 800, color: '#7c3aed' }}>{i + 1}</span>
                                    </div>
                                  ) : (
                                    <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: isPrint ? '#7c3aed' : '#9090a8' }}>{i + 1}</span>
                                  )}
                                </td>
                                <td className="pg-td" style={{ minWidth: 160 }}>
                                  {isMerged && (
                                    <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{
                                        fontFamily: 'Nunito,sans-serif', fontSize: 10.5, fontWeight: 800,
                                        padding: '2px 7px', borderRadius: 4,
                                        background: 'rgba(124,58,237,0.12)', color: '#7c3aed',
                                        border: '1px solid rgba(124,58,237,0.25)',
                                      }}>
                                        {row.mergeDirection === 'H' ? '↔ Horizontal Merge' : '↕ Vertical Merge'}
                                      </span>

                                      {/* Direction toggle button */}
                                      <button
                                        onClick={e => { e.stopPropagation(); toggleMergeDirection(row._id); }}
                                        title={`Switch to ${row.mergeDirection === 'H' ? 'Vertical' : 'Horizontal'}`}
                                        style={{
                                          display: 'flex', alignItems: 'center', gap: 3,
                                          padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(124,58,237,0.30)',
                                          background: 'rgba(124,58,237,0.06)', color: '#7c3aed',
                                          cursor: 'pointer', fontFamily: 'Nunito,sans-serif',
                                          fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap',
                                        }}
                                      >
                                        <RefreshCw size={9} />
                                        {row.mergeDirection === 'H' ? '↕ Switch V' : '↔ Switch H'}
                                      </button>
                                    </div>
                                  )}
                                  {!isMerged && siteColor && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: siteColor.dot, flexShrink: 0 }} />
                                      <MapPin size={10} color={siteColor.dot} />
                                    </div>
                                  )}
                                  {isExtra ? (
                                    <input
                                      value={row.location}
                                      onChange={e => updateRow(row._id, 'location', e.target.value)}
                                      style={{
                                        width: '100%', border: 'none',
                                        borderBottom: '1.5px dashed #e8e8f4',
                                        fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700,
                                        color: '#1a1a2e', background: 'transparent',
                                        outline: 'none', padding: '2px 0',
                                      }}
                                      placeholder="Charge description…"
                                    />
                                  ) : (
                                    <div style={{
                                      fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 600,
                                      color: isMerged ? '#7c3aed' : '#1a1a2e',
                                      fontStyle: isPrint ? 'italic' : 'normal',
                                      lineHeight: 1.4, paddingTop: 1,
                                    }}>
                                      {row.location}
                                    </div>
                                  )}
                                  {!isMerged && !isPrint && !isExtra && (() => {
                                    const { line2 } = getSiteDisplayLines(row.siteObj, '');
                                    return line2 ? (
                                      <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10.5, color: '#9090a8', marginTop: 2, paddingLeft: 2, lineHeight: 1.3 }}>{line2}</div>
                                    ) : null;
                                  })()}
                                </td>
                                <td className="pg-td" style={{ textAlign: 'center' }}>
                                  {withPrinting && isPrint && !isExtra ? (
                                    // ── Printing row: size dropdown ──
                                    <div>
                                      <select
                                        value={row.size || ''}
                                        onChange={e => {
                                          const sel = e.target.value;
                                          if (!sel) { updateRowMultiple(row._id, { size: '', sqFt: 0, nos: 0, amount: 0 }); return; }
                                          const info = sizeMap[sel];
                                          if (!info) return;
                                          const totalSqFt = info.count * info.sqFt;
                                          updateRowMultiple(row._id, { size: sel, sqFt: totalSqFt, nos: info.count }); // ← nos = count
                                        }}
                                        style={{
                                          width: '100%', padding: '5px 6px',
                                          border: '1.5px solid #e8e8f4', borderRadius: 8,
                                          fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700,
                                          color: '#7c3aed', background: '#fff', outline: 'none', cursor: 'pointer',
                                        }}
                                      >
                                        <option value="">Size…</option>
                                        {sizeOptions.map(([size, info]) => (
                                          <option key={size} value={size}>
                                            {`${size} (${info.count} × ${info.sqFt} = ${info.count * info.sqFt} sqft)`}
                                          </option>
                                        ))}
                                      </select>
                                      {row.sqFt > 0 && (
                                        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10, color: '#7c3aed', fontWeight: 700, marginTop: 2 }}>
                                          {row.sqFt} sq.ft
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    // ── Regular row: plain size text ──
                                    <span style={{
                                      fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, color: '#4a5568',
                                    }}>
                                      {row.size || '—'}
                                    </span>
                                  )}
                                </td>
                                {!withPrinting && <>
                                  <td className="pg-td" style={{ textAlign: 'center' }}>
                                    <span style={{
                                      fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700,
                                      color: '#4a5568',
                                    }}>
                                      {row.sqFt || '—'}
                                    </span>
                                  </td>
                                  <td className="pg-td">
                                    <input className="qt-inline-input" type="number" min="1" value={row.nos} onChange={e => updateRow(row._id, 'nos', e.target.value)} style={{ width: 50 }} />
                                  </td>
                                  <td className="pg-td">
                                    <input className="qt-inline-input qt-date-input" type="date" value={row.startDate} onChange={e => updateRow(row._id, 'startDate', e.target.value)} />
                                  </td>
                                  <td className="pg-td">
                                    <input className="qt-inline-input qt-date-input" type="date" value={row.endDate} onChange={e => updateRow(row._id, 'endDate', e.target.value)} />
                                  </td>
                                </>}
                                {withPrinting && (
                                  <>
                                    {/* NOS / Sq.Ft column */}
                                    <td className="pg-td" style={{ textAlign: 'center' }}>
                                      {isExtra ? (
                                        <span style={{ color: '#c0c0d0' }}>—</span>
                                      ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                          {isPrint ? (
                                            <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800, color: '#7c3aed' }}>
                                              {row.nos > 0 ? row.nos : '—'}
                                            </span>
                                          ) : (
                                            <input
                                              className="qt-inline-input" type="number"
                                              value={row.nos}
                                              onChange={e => updateRow(row._id, 'nos', e.target.value)}
                                              style={{ width: 64, textAlign: 'center' }}
                                            />
                                          )}
                                          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10.5, fontWeight: 700, color: '#7c3aed' }}>
                                            {row.sqFt > 0 ? `${row.sqFt} sq.ft` : '—'}
                                          </span>
                                        </div>
                                      )}
                                    </td>

                                    {/* Start Date */}
                                    <td className="pg-td">
                                      {isExtra
                                        ? <span style={{ color: '#c0c0d0', paddingLeft: 8 }}>—</span>
                                        : <input className="qt-inline-input qt-date-input" type="date" value={row.startDate} onChange={e => updateRow(row._id, 'startDate', e.target.value)} />
                                      }
                                    </td>
                                    {/* End Date */}
                                    <td className="pg-td">
                                      {isExtra
                                        ? <span style={{ color: '#c0c0d0', paddingLeft: 8 }}>—</span>
                                        : <input className="qt-inline-input qt-date-input" type="date" value={row.endDate} onChange={e => updateRow(row._id, 'endDate', e.target.value)} />
                                      }
                                    </td>
                                  </>
                                )}
                                <td className="pg-td">
                                  {isExtra
                                    ? <span style={{ color: '#c0c0d0', paddingLeft: 8 }}>—</span>
                                    : <input className="qt-inline-input" type="number" value={row.ratePerMonth} onChange={e => updateRow(row._id, 'ratePerMonth', e.target.value)} style={{ width: 86 }} />
                                  }
                                </td>
                                {withPrinting && (
                                  <td className="pg-td">
                                    {isPrint ? (
                                      // Printing row: show printing cost = sqFt × rate
                                      <span style={{
                                        fontFamily: 'Nunito,sans-serif', fontSize: 13,
                                        fontWeight: 900, color: '#7c3aed',
                                      }}>
                                        {row.amount > 0
                                          ? Number(row.amount).toLocaleString('en-IN')
                                          : '—'}
                                      </span>
                                    ) : (
                                      // Hoarding row: editable print cost field
                                      <input
                                        className="qt-inline-input" type="number"
                                        value={isExtra ? 0 : (row.printingCost || 0)}
                                        onChange={e => updateRow(row._id, 'printingCost', e.target.value)}
                                        style={{
                                          width: 86,
                                          color: isExtra ? '#c0c0d0' : '#7c3aed',
                                          fontWeight: 700,
                                          cursor: isExtra ? 'not-allowed' : 'text'
                                        }}
                                        disabled={isExtra}
                                      />
                                    )}
                                  </td>
                                )}
                                <td className="pg-td">
                                  <input className="qt-inline-input" type="number" value={row.amount} onChange={e => updateRow(row._id, 'amount', e.target.value)} style={{ width: 86, fontWeight: 700 }} />
                                </td>
                                <td className="pg-td">
                                  <div className="pg-action-wrap">
                                    <button className="pg-btn-view" onClick={() => deleteRow(row._id)} title="Remove">
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>

                  {/* Printing type dropdown — withPrinting mode only */}
                  {withPrinting && (
                    <div style={{ position: 'relative' }}>
                      <button
                        ref={printTypeBtnRef}
                        onClick={() => setShowPrintTypeDD(p => !p)}
                        className="qt-add-print-row"
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Plus size={13} /> Add Printing Row <ChevronDown size={12} />
                      </button>

                      <PortalDropdown
                        open={showPrintTypeDD}
                        triggerRef={printTypeBtnRef}
                        panelRef={printTypePanelRef}
                      >
                        <div
                          ref={printTypePanelRef}
                          style={{
                            background: '#fff', border: '1.5px solid #e8e8f4', borderRadius: 12,
                            boxShadow: '0 8px 28px rgba(0,0,0,0.12)', overflow: 'hidden',
                          }}
                        >
                          {PRINTING_TYPES.map(type => (
                            <div
                              key={type}
                              onClick={() => { setRows(p => [...p, newPrintingRow(type)]); setShowPrintTypeDD(false); }}
                              style={{
                                padding: '10px 16px', cursor: 'pointer',
                                fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700,
                                color: '#7c3aed', borderBottom: '1px solid #f4f4fb',
                                display: 'flex', alignItems: 'center', gap: 8,
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.05)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <Printer size={13} color="#7c3aed" /> {type}
                            </div>
                          ))}
                        </div>
                      </PortalDropdown>
                    </div>
                  )}

                  {/* Add Extra Charge — both modes */}
                  <button
                    onClick={() => setRows(p => [...p, newExtraChargeRow()])}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 9, cursor: 'pointer',
                      border: '1.5px dashed #e8e8f4', background: '#fafafe',
                      fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700,
                      color: '#5a5a78',
                    }}
                  >
                    <Plus size={13} /> Add Extra Charge
                  </button>

                </div>

                {step2Error && <div className="qt-error-banner"><AlertCircle size={14} /> {step2Error}</div>}

                <div className="qt-step-foot">
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="pg-btn-cancel" onClick={handleBackToList} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <LayoutGrid size={13} /> Back to List
                    </button>
                    <button className="pg-btn-cancel" onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ArrowLeft size={13} /> Back
                    </button>
                  </div>
                  <button className="pg-btn-save" onClick={goNext}>
                    Next: GST &amp; Generate <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 3 ─── */}
            {step === 3 && (
              <div className="qt-step-body">
                <div className="qt-step3-grid">

                  <div>
                    <div className="qt-section-head">GST Configuration</div>
                    <div className="qt-gst-row">
                      <div>
                        <label className="qt-label">CGST %</label>
                        <div className="qt-input-wrap">
                          <Settings size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
                          <input className="qt-input" type="number" min="0" max="28" value={cgstPct} onChange={e => setCgstPct(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="qt-label">SGST %</label>
                        <div className="qt-input-wrap">
                          <Settings size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
                          <input className="qt-input" type="number" min="0" max="28" value={sgstPct} onChange={e => setSgstPct(e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div className="qt-terms-head">
                      <div className="qt-section-head" style={{ margin: 0 }}>
                        Terms &amp; Conditions <span className="qt-label--opt">(max 3)</span>
                      </div>
                      <button className="pg-btn-cancel" onClick={() => setShowTermsModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <List size={12} /> Choose
                      </button>
                    </div>
                    {selectedTerms.length === 0
                      ? <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, color: '#9090a8', fontStyle: 'italic' }}>None selected (optional)</div>
                      : selectedTerms.map((termID, i) => {
                        const t = termsList.find(t => t.termID === termID);
                        return (
                          <div key={termID} className="qt-term-chip">
                            <span className="qt-term-chip__num">{i + 1}.</span>
                            <span>{t?.description || '—'}</span>
                          </div>
                        );
                      })}

                    {mergedCount > 0 && (
                      <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 11, background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.18)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                          <Link2 size={13} color="#7c3aed" />
                          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 800, color: '#7c3aed' }}>
                            {mergedCount} Merged Hoarding{mergedCount !== 1 ? 's' : ''} in this Quotation
                          </span>
                        </div>
                        {rows.filter(r => r.rowType === 'merged').map(r => (
                          <div key={r._id} style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11.5, color: '#5a5a78', marginBottom: 3 }}>
                            {r.mergeDirection === 'H' ? '↔' : '↕'} {r.location} · <strong>{r.size}</strong> · {r.sqFt} sq.ft
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="qt-section-head">Summary</div>
                    <div className="qt-summary-box">
                      <div className="qt-summary-customer">
                        <span>Customer</span>
                        <span>{selectedCustomer?.customerName || '—'}</span>
                      </div>
                      {[
                        { label: 'Sub Total', val: subTotal },
                        { label: `CGST ${cgstPct}%`, val: cgstAmt },
                        { label: `SGST ${sgstPct}%`, val: sgstAmt },
                        { label: 'Round Off', val: roundOff },
                      ].map(({ label, val }) => (
                        <div key={label} className="qt-summary-row">
                          <span>{label}</span><span>₹ {fmtCurrency(val)}</span>
                        </div>
                      ))}
                      <div className="qt-summary-total">
                        <span>Grand Total</span>
                        <span>₹ {fmtCurrency(finalTotal)}</span>
                      </div>
                      <div className="qt-summary-words">{numberToWords(Math.round(finalTotal))}</div>
                    </div>
                  </div>
                </div>

                <div className="qt-step-foot">
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="pg-btn-cancel" onClick={handleBackToList} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <LayoutGrid size={13} /> Back to List
                    </button>
                    <button className="pg-btn-cancel" onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ArrowLeft size={13} /> Back
                    </button>
                  </div>
                  <button className="pg-btn-save" onClick={generatePDF} disabled={rows.length === 0 || saving} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontSize: 14 }}>
                    <Printer size={15} /> Generate &amp; Print PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════ PREVIOUS REVISIONS PANEL ══════════ */}
        {isCreating && quotNo && (() => {
          const prevRevisions = quotations
            .filter(q => (q.quotationNumber || '').trim() === (quotNo || '').trim())
            .sort((a, b) => Number(b.quotationRevisionNumber || 0) - Number(a.quotationRevisionNumber || 0));
          if (prevRevisions.length === 0) return null;
          return (
            <div className="pg-container" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f0f0f8' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(217,119,6,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RefreshCw size={14} color="#7c7c7c" />
                    </div> */}
                    <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 14, fontWeight: 900, color: '#1a1a2e' }}>
                      Previous Revisions — {quotNo}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600, marginTop: 4 }}>
                    {prevRevisions.length} revision{prevRevisions.length !== 1 ? 's' : ''} saved · You are creating Rev. {revisionNo}
                  </div>
                </div>
              </div>
              <table className="pg-table">
                <thead>
                  <tr>
                    <th className="pg-th" style={{ width: '14%' }}>Version</th>
                    <th className="pg-th" style={{ width: '14%' }}>Date</th>
                    <th className="pg-th" style={{ width: '22%' }}>Customer</th>
                    <th className="pg-th" style={{ width: '18%' }}>Grand Total</th>
                    <th className="pg-th" style={{ width: '16%', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {prevRevisions.map(rev => (
                    <tr key={`prev-${rev.quotationID}-${rev.quotationRevisionNumber}`} className="pg-tr">
                      <td className="pg-td">
                        {Number(rev.quotationRevisionNumber) > 1
                          ? <span className="qt-rev-badge"><RefreshCw size={9} /> Rev. {rev.quotationRevisionNumber}</span>
                          : <span className="qt-orig-badge">Original</span>}
                      </td>
                      <td className="pg-td">
                        <span style={{ color: '#4a5568', fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 600 }}>
                          {fmtDateDisplay(rev.quotationDate)}
                        </span>
                      </td>
                      <td className="pg-td pg-td--overflow">
                        <span className="pg-td__ellipsis">{custName(rev.customerID)}</span>
                      </td>
                      <td className="pg-td">
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 13, color: '#049edf' }}>
                          ₹ {fmtCurrency(rev.totalAmount)}
                        </span>
                      </td>
                      <td className="pg-td" style={{ textAlign: 'center' }}>
                        <button onClick={() => handleViewPDF(rev)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 8, border: '1.5px solid #049edf', color: '#049edf', background: 'rgba(4,158,223,0.06)', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800 }}>
                          <Printer size={12} /> View PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* ══════════ QUOTATION HISTORY ══════════ */}
        {!isCreating && <div className="pg-container">

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #f0f0f8', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(4,158,223,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={15} color="#049edf" />
              </div>
              <div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 16, fontWeight: 900, color: '#1a1a2e', lineHeight: 1 }}>{sortedGroups.length}</div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 600, color: '#9090a8', lineHeight: 1, marginTop: 2 }}>Quotation{sortedGroups.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: '#f4f4fb', borderRadius: 10, border: '1.5px solid #ececf8' }}>
              <Search size={14} color="#9090a8" style={{ flexShrink: 0 }} />
              <input
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}
                placeholder="Search by quotation no. or customer…"
                value={histSearch}
                onChange={e => { setHistSearch(e.target.value); setHistPage(1); }}
              />
              {histSearch && <X size={13} style={{ cursor: 'pointer', color: '#9090a8', flexShrink: 0 }} onClick={() => setHistSearch('')} />}
            </div>
            <button onClick={refreshQuotations}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1.5px solid #e8e8f4', background: '#fff', color: '#5a5a78', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          <table className="pg-table" ref={histTableRef}>
            <thead>
              <tr>
                <th style={{ width: 44 }} className="pg-th"></th>
                {HIST_COLS.map(col => (
                  <th key={col.key} style={{ width: col.w }}
                    className={['pg-th', col.noSort ? '' : 'pg-th--sort'].filter(Boolean).join(' ')}
                    onClick={() => !col.noSort && handleHistSort(col.key)}
                  >
                    <div className="pg-th__inner">
                      {col.label}
                      {!col.noSort
                        ? <SortIcon col={col.key} sortKey={histSortKey} sortDir={histSortDir} />
                        : <Filter size={10} color="#d0d0e4" style={{ marginLeft: 5 }} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {histPaginated.length === 0 ? (
                <tr>
                  <td colSpan={HIST_COLS.length + 1} className="pg-td pg-empty" style={{ maxWidth: 'none' }}>
                    <div className="pg-empty__inner">
                      <FileText size={36} color="#d0d0e8" />
                      <span className="pg-empty__label">No quotations found</span>
                    </div>
                  </td>
                </tr>
              ) : histPaginated.map(group => {
                const latest = group[0];
                const groupKey = (latest.quotationNumber || '').trim() || String(latest.quotationID);
                const isExp = expandedGroups.has(groupKey);
                const hasRevs = group.length > 1;

                return (
                  <React.Fragment key={groupKey}>
                    <tr className="pg-tr qt-group-row">
                      <td className="pg-td" style={{ textAlign: 'center' }}>
                        {hasRevs ? (
                          <button className="qt-expand-btn" onClick={() => toggleGroup(groupKey)}
                            title={isExp ? 'Hide revisions' : `Show ${group.length - 1} older revision${group.length - 1 !== 1 ? 's' : ''}`}>
                            {isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        ) : <span style={{ width: 28, display: 'inline-block' }} />}
                      </td>
                      <td className="pg-td">
                        <div className="pg-td__primary">{latest.quotationNumber}</div>
                        {hasRevs && (
                          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600, marginTop: 2 }}>
                            {group.length - 1} older revision{group.length - 1 !== 1 ? 's' : ''}
                          </div>
                        )}
                      </td>
                      <td className="pg-td pg-td--overflow">
                        <span className="pg-td__ellipsis" title={custName(latest.customerID)}>{custName(latest.customerID)}</span>
                      </td>
                      <td className="pg-td">
                        <span style={{ color: '#4a5568' }}>{fmtDateDisplay(latest.quotationDate)}</span>
                      </td>
                      <td className="pg-td" style={{ textAlign: 'center' }}>
                        {Number(latest.quotationRevisionNumber) > 1
                          ? <span className="qt-rev-badge"><RefreshCw size={9} />Rev. {latest.quotationRevisionNumber}</span>
                          : <span className="qt-orig-badge">Original</span>}
                      </td>
                      <td className="pg-td">
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 13, color: '#049edf' }}>₹ {fmtCurrency(latest.totalAmount)}</span>
                      </td>
                      {/* ── Actions: PDF · Contract · Revise ── */}
                      <td className="pg-td">
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* PDF */}
                          <button onClick={() => handleViewPDF(latest)} title="View / Print PDF"
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, border: '1.5px solid #049edf', color: '#049edf', background: 'rgba(4,158,223,0.06)', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
                            <Printer size={13} /> PDF
                          </button>
                          {/* Proforma Invoice */}
                          <button onClick={() => handleViewProforma(latest)} title="Download Proforma Invoice"
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, border: '1.5px solid #16a34a', color: '#16a34a', background: 'rgba(22,163,74,0.06)', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
                            <FileText size={13} /> Proforma
                          </button>
                          {/* ← NEW: Create Contract button */}
                          {(() => {
                            const done = contractedQuotIds.has(latest.quotationID);
                            return (
                              <button
                                onClick={() => {
                                  if (done) return;
                                  setContractQuot(latest);
                                  setShowContractModal(true);
                                }}
                                disabled={done}
                                title={done ? 'Contract already created for this quotation' : 'Create customer contract'}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  padding: '5px 11px', borderRadius: 8, border: 'none',
                                  color: '#fff',
                                  background: done
                                    ? '#16a34a'
                                    : 'linear-gradient(135deg, #049edf, #6c63ff)',
                                  cursor: done ? 'not-allowed' : 'pointer',
                                  fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800,
                                  whiteSpace: 'nowrap',
                                  boxShadow: done ? 'none' : '0 2px 6px rgba(124,58,237,0.25)',
                                  opacity: done ? 0.75 : 1,
                                  pointerEvents: done ? 'none' : 'auto',
                                }}
                              >
                                {done
                                  ? <><Check size={13} /> Created</>
                                  : <><FileCheck size={13} /> Contract</>}
                              </button>
                            );
                          })()}
                          {/* Edit — edits this exact revision in place */}
                          <button onClick={() => handleEditQuotation(latest)} title="Edit this quotation (same number & revision)"
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, border: '1.5px solid #f59e0b', color: '#f59e0b', background: 'rgba(245,158,11,0.06)', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
                            <Edit2 size={13} /> Edit
                          </button>
                          {/* Revise */}
                          <button onClick={() => handleReopenHistory(latest)} title="Create Revision"
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, border: '1.5px solid #e8e8f4', color: '#5a5a78', background: '#fff', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
                            <Edit2 size={13} /> Revise
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExp && group.slice(1).map((rev) => (
                      <tr key={`${rev.quotationID}-${rev.quotationRevisionNumber}`} className="pg-tr qt-rev-row">
                        <td className="pg-td"></td>
                        <td className="pg-td">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 12 }}>
                            <div className="qt-rev-tree-line" />
                            {Number(rev.quotationRevisionNumber) > 1
                              ? <span className="qt-rev-badge" style={{ fontSize: 11 }}><RefreshCw size={9} />Rev. {rev.quotationRevisionNumber}</span>
                              : <span className="qt-orig-badge">Original</span>}
                          </div>
                        </td>
                        <td className="pg-td pg-td--overflow">
                          <span className="pg-td__ellipsis" style={{ color: '#9090a8' }}>{custName(rev.customerID)}</span>
                        </td>
                        <td className="pg-td">
                          <span style={{ color: '#b0b0c8', fontSize: 12 }}>{fmtDateDisplay(rev.quotationDate)}</span>
                        </td>
                        <td className="pg-td" style={{ textAlign: 'center' }}>
                          {Number(rev.quotationRevisionNumber) > 1
                            ? <span className="qt-rev-badge"><RefreshCw size={9} />Rev. {rev.quotationRevisionNumber}</span>
                            : <span className="qt-orig-badge">Original</span>}
                        </td>
                        <td className="pg-td">
                          <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: 12.5, color: '#9090a8' }}>₹ {fmtCurrency(rev.totalAmount)}</span>
                        </td>
                        <td className="pg-td">
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleViewPDF(rev)} title="View PDF"
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, border: '1.5px solid #049edf', color: '#049edf', background: 'rgba(4,158,223,0.06)', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
                              <Printer size={12} /> PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {sortedGroups.length > histPageSize && (
            <div className="pg-pagination">
              <div className="pg-pagination__left">
                <button className="pg-pg-btn" disabled={histPage === 1} onClick={() => setHistPage(1)}><ChevronsLeft size={13} /></button>
                <button className="pg-pg-btn" disabled={histPage === 1} onClick={() => setHistPage(p => p - 1)}><ChevronLeft size={13} /></button>
                {histPageNums.map((p, i) => p === '…'
                  ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span>
                  : <button key={p} className={`pg-pg-btn${histPage === p ? ' pg-pg-btn--active' : ''}`} onClick={() => setHistPage(p)}>{p}</button>
                )}
                <button className="pg-pg-btn" disabled={histPage === histTotalPages} onClick={() => setHistPage(p => p + 1)}><ChevronRight size={13} /></button>
                <button className="pg-pg-btn" disabled={histPage === histTotalPages} onClick={() => setHistPage(histTotalPages)}><ChevronsRight size={13} /></button>
              </div>
              <div className="pg-pagination__right">
                <select className="pg-pagesize-select" value={histPageSize} onChange={e => { setHistPageSize(Number(e.target.value)); setHistPage(1); }}>
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="pg-pagination__text">Items per page</span>
                <span className="pg-pagination__text">{histPage} of {histTotalPages} pages ({sortedGroups.length} items)</span>
              </div>
            </div>
          )}

        </div>}
      </div>

      {/* ════════════ MODALS ════════════ */}
      {showHoardModal && (
        <HoardingSelectModal
          hoardings={hoardings}
          existingIds={existingHoardingIds}
          onAdd={handleAddSelected}
          onClose={() => setShowHoardModal(false)}
          siteColorMap={siteColorMap}
          siteMap={siteMap}
        />
      )}
      {showManualModal && (
        <ManualHoardingModal
          hoardings={hoardings}
          onAdd={handleAddManual}
          onClose={() => setShowManualModal(false)}
          siteColorMap={siteColorMap}
          siteMap={siteMap}
        />
      )}
      {/* Hoarding date conflict modal */}
      {showConflictModal && conflictWarnings.length > 0 && (
        <HoardingConflictModal
          conflicts={conflictWarnings}
          onClose={() => setShowConflictModal(false)}
        />
      )}
      {showTermsModal && (
        <TermsModal
          selected={selectedTerms}
          onSelect={toggleTerm}
          termsList={termsList}
          onClose={() => setShowTermsModal(false)}
        />
      )}
      {showMergeModal && (
        <MergeModal
          rows={rows}
          onMerge={handleMerge}
          onClose={() => setShowMergeModal(false)}
          siteColorMap={siteColorMap}
        />
      )}

      {/* ← NEW: Customer Edit Modal (from Step 1) */}
      {showCustomerEditModal && selectedCustomer && (
        <CustomerEditModal
          customer={selectedCustomer}
          onSave={handleCustomerSaved}
          onClose={() => setShowCustomerEditModal(false)}
        />
      )}

      {showContractModal && contractQuot && (
        <CreateContractFromQuotModal
          quot={contractQuot}
          quotLines={quotLines}
          quotMerges={quotMerges}
          hoardings={hoardings}
          customers={customers}
          siteMap={siteMap}
          paymentFreqs={paymentFreqs}
          onClose={() => { setShowContractModal(false); setContractQuot(null); }}
          onCreated={() => {
            setContractedQuotIds(prev => new Set([...prev, contractQuot.quotationID]));
          }}
          showToast={showToast}
        />
      )}
    </>
  );
}