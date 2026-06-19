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
  Briefcase, Building2, Clock, UserCheck, Tag, Hash,
} from 'lucide-react';
import { apiService, API_ROOT_URL } from '../api/api';
import { useResizableColumns } from '../hooks/useResizableColumns';
import "./Common1.css";
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
const nowISO = () => new Date().toISOString();
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtDateTime = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
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
  return {
    customerContractID: raw.customerContractID ?? raw.CustomerContractID ?? 0,
    customerID: raw.customerID ?? raw.CustomerID ?? 0,
    hoardingID: raw.hoardingID ?? raw.HoardingID ?? 0,
    startDate: (raw.startDate ?? raw.StartDate ?? '').split('T')[0],
    endDate: (raw.endDate ?? raw.EndDate ?? '').split('T')[0],
    status: raw.status ?? raw.Status ?? '',
    amountPerFreq: Number(raw.amountPerFreq ?? raw.AmountPerFreq ?? 0),
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
    jobStatus: raw.jobStatus ?? raw.JobStatus ?? 'Open',
  };
}

function normalizeJobTask(raw) {
  return {
    jobTaskID: raw.jobTaskID ?? raw.JobTaskID ?? 0,
    jobRequestID: raw.jobRequestID ?? raw.JobRequestID ?? 0,
    hoardingID: raw.hoardingID ?? raw.HoardingID ?? 0,
    actualCompletionDate: (raw.actualCompletionDate ?? raw.ActualCompletionDate ?? '').split('T')[0],
    status: raw.status ?? raw.Status ?? 'Open',
    submitDTTM: raw.submitDTTM ?? raw.SubmitDTTM ?? '',
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

function TaskStatusSelect({ value, onChange }) {
  const s = TASK_STATUS_COLORS[value] || TASK_STATUS_COLORS['Open'];
  const isSubmitted = value === 'Submitted';

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={isSubmitted}
      style={{
        fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700,
        padding: '4px 10px', borderRadius: 7,
        border: `1.5px solid ${s.border}`,
        background: s.bg, color: s.color,
        cursor: isSubmitted ? 'not-allowed' : 'pointer',
        outline: 'none',
        appearance: 'none', WebkitAppearance: 'none',
        paddingRight: isSubmitted ? 10 : 22,
        backgroundImage: isSubmitted ? 'none' : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239090a8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 6px center',
        opacity: isSubmitted ? 0.8 : 1,
      }}
    >
      {TASK_STATUS_LIST.map(st => <option key={st} value={st}>{st}</option>)}
    </select>
  );
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

  const selectable = display.filter(h => !existingIds.has(h.hoardingID));
  const allSelected = selectable.length > 0 && selectable.every(h => selected.has(h.hoardingID));
  const someSel = selectable.some(h => selected.has(h.hoardingID));

  const toggle = (id) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    if (allSelected) setSelected(p => { const n = new Set(p); selectable.forEach(h => n.delete(h.hoardingID)); return n; });
    else setSelected(p => { const n = new Set(p); selectable.forEach(h => n.add(h.hoardingID)); return n; });
  };

  // Group display: merged hoardings shown together, unmerged shown individually
  const { mergeGroups, unmerged } = useMemo(() => {
    const groups = new Map(); // flag → [hoardings]
    const ungrouped = [];

    display.forEach(h => {
      const flag = mergedFlagMap.get(Number(h.hoardingID));
      if (flag) {
        const key = flag; // 'H' or 'V' — groups all same-direction merges together
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(h);
      } else {
        ungrouped.push(h);
      }
    });

    return { mergeGroups: [...groups.entries()], unmerged: ungrouped };
  }, [display, mergedFlagMap]);

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
    <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
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
              {mergeGroups.map(([flag, groupHoardings]) => {
                // Compute combined size
                const sizes = groupHoardings.map(h => ({ w: Number(h.width) || 0, h: Number(h.height) || 0 }));
                const gaps = Math.max(groupHoardings.length - 1, 1);
                const mw = flag === 'H' ? sizes.reduce((s, sz) => s + sz.w, 0) + gaps : Math.max(...sizes.map(s => s.w));
                const mh = flag === 'H' ? Math.max(...sizes.map(s => s.h)) : sizes.reduce((s, sz) => s + sz.h, 0) + gaps;
                const mergedSqFt = mw * mh;

                return (
                  <div key={flag} style={{ margin: '8px 12px', border: '1.5px solid rgba(124,58,237,0.25)', borderRadius: 10, overflow: 'hidden' }}>
                    {/* Merge group header */}
                    <div style={{
                      padding: '8px 14px', background: 'rgba(124,58,237,0.06)',
                      borderBottom: '1px solid rgba(124,58,237,0.15)',
                      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    }}>
                      <span style={{ fontSize: 13 }}>{flag === 'H' ? '↔' : '↕'}</span>
                      <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#7c3aed' }}>
                        {flag === 'H' ? 'Horizontal' : 'Vertical'} Merge · {groupHoardings.length} hoardings
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
   TASK PHOTO MODAL
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   TASK PHOTO MODAL  (replace entire function)
═══════════════════════════════════════════ */
function TaskPhotoModal({ task, jobRequestID, attachments, onClose, showToast, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null); // attachID being deleted
  const [lightbox, setLightbox] = useState(null);
  const [imgErrors, setImgErrors] = useState({}); // track broken images by index
  const inputRef = useRef(null);

  const taskIDs = new Set(
    [task.jobTaskID, ...(task.mergedTaskIDs ?? [])].map(Number)
  );
  const myAttachments = attachments.filter(
    a => taskIDs.has(Number(a.jobTaskID ?? a.JobTaskID))
  );
  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const userId = parseInt(localStorage.getItem('userId') || '0', 10);
      for (const file of files) {
        const fd = new FormData();
        fd.append('JobTaskAttachID', '0');
        fd.append('JobTaskID', String(task.jobTaskID || 0));
        fd.append('JobRequestID', String(jobRequestID || 0));
        fd.append('HoardingID', String(task.hoardingID || 0));
        fd.append('PhotoFileType', file.type || 'image/jpeg');
        fd.append('Files', file);
        fd.append('PhotoFilePath', '');
        fd.append('PhotoFilename', file.name);
        fd.append('LastUpdateDttm', new Date().toISOString());
        fd.append('LastUpdatedBy', String(userId));
        await apiService.uploadJobTaskAttachment(fd);
      }
      showToast(`${files.length} photo${files.length !== 1 ? 's' : ''} uploaded!`, 'success');
      setFiles([]);
      onUploaded?.();
    } catch (err) {
      showToast(err?.message || 'Upload failed.', 'error');
    } finally { setUploading(false); }
  };

  const handleDelete = async (att, i) => {
    const attachID = att.jobTaskAttachID ?? att.JobTaskAttachID ?? att.id ?? att.ID;
    if (!attachID) { showToast('Cannot delete: no attachment ID found.', 'error'); return; }
    if (!window.confirm('Delete this photo?')) return;
    setDeleting(attachID);
    // Replace the try block in handleDelete with:
    try {
      await apiService.deleteJobTaskAttachment(attachID);
      showToast('Photo deleted.', 'success');
      onUploaded?.();
    } catch (err) {
      showToast(err?.message || 'Delete failed.', 'error');
    } finally { setDeleting(null); }
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
                    {myAttachments.length} photo{myAttachments.length !== 1 ? 's' : ''}
                  </span>
                </p>
              </div>
            </div>
            <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
          </div>

          {/* Upload zone */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f8' }}>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                setFiles(p => [...p, ...dropped]);
              }}
              style={{
                border: `2px dashed ${files.length > 0 ? '#049edf' : '#d0d0e8'}`,
                borderRadius: 12, padding: '20px',
                textAlign: 'center', cursor: 'pointer',
                background: files.length > 0 ? 'rgba(4,158,223,0.04)' : '#fafafe',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
              <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700, color: '#5a5a78' }}>
                Click to select or drag &amp; drop photos
              </div>
              <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8', marginTop: 3 }}>
                JPG, PNG, WEBP · Multiple files supported
              </div>
              <input
                ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => setFiles(p => [...p, ...Array.from(e.target.files)])}
              />
            </div>

            {files.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {files.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 20,
                    background: 'rgba(4,158,223,0.08)', border: '1px solid rgba(4,158,223,0.20)',
                    fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 700, color: '#049edf',
                  }}>
                    📄 {f.name.length > 22 ? f.name.slice(0, 20) + '…' : f.name}
                    <X size={11} style={{ cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => setFiles(p => p.filter((_, j) => j !== i))} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photo grid */}
          <div style={{ padding: '16px 24px', overflowY: 'auto', maxHeight: 340, minHeight: 80 }}>
            {myAttachments.length === 0 ? (
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
                {myAttachments.map((att, i) => {
                  const url = buildImageUrl(att);
                  const name = att.photoFilename ?? att.PhotoFilename ?? `Photo ${i + 1}`;
                  const attachID = att.jobTaskAttachID ?? att.JobTaskAttachID ?? att.id ?? att.ID;
                  const isDeleting = deleting === attachID;
                  const hasError = imgErrors[i];

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
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(att, i); }}
                          disabled={isDeleting}
                          title="Delete photo"
                          style={{
                            flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: 6,
                            border: '1px solid rgba(220,38,38,0.25)',
                            background: 'rgba(220,38,38,0.07)',
                            color: '#dc2626', cursor: isDeleting ? 'wait' : 'pointer',
                            padding: 0, opacity: isDeleting ? 0.5 : 1,
                          }}
                        >
                          {isDeleting
                            ? <Loader2 size={11} className="pg-spin" />
                            : <Trash2 size={11} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pg-modal__foot">
            <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600 }}>
              {files.length > 0
                ? `${files.length} file${files.length !== 1 ? 's' : ''} ready to upload`
                : myAttachments.length > 0
                  ? 'Click any photo to enlarge · Trash icon to delete'
                  : 'No photos yet'}
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="pg-btn-cancel" onClick={onClose}>Close</button>
              <button
                className="pg-btn-save"
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
              >
                {uploading
                  ? <><Loader2 size={13} className="pg-spin" /> Uploading…</>
                  : <>📤 Upload {files.length > 0 ? `(${files.length})` : ''}</>}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}
function CompleteJobModal({ job, tasks, allHoardings, onConfirm, onCancel, completing }) {
  const [completionDate, setCompletionDate] = useState(
    job.actualCompletionDate || todayISO()
  );

  /* Build preview: for each task find the hoarding's current (latest) status */
  const hoardingPreviews = tasks.map(t => {
    const h = allHoardings.find(hh => Number(hh.hoardingID) === Number(t.hoardingID));
    return {
      hoardingCode: t.hoardingCode || h?.hoardingCode || `#${t.hoardingID}`,
      currentStatus: h?.status || 'Active',   // ← last effdt row's status
      siteAddress: t.siteAddress || '',
    };
  });

  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target === e.currentTarget && !completing && onCancel()}>
      <div className="pg-modal" style={{ maxWidth: 480 }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#16a34a,#15803d)',
          padding: '24px 26px 18px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {hoardingPreviews.map((h, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 8,
                    background: '#fff', border: '1px solid #dcfce7',
                    fontFamily: 'Nunito,sans-serif', fontSize: 11.5,
                  }}>
                    {/* Hoarding code */}
                    <span style={{ fontWeight: 800, color: '#15803d', minWidth: 70 }}>
                      {h.hoardingCode}
                    </span>
                    {/* Arrow */}
                    <span style={{ color: '#9090a8', fontWeight: 700, fontSize: 11 }}>effdt =</span>
                    {/* Date */}
                    <span style={{ fontWeight: 700, color: '#1a1a2e' }}>
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
              onClick={() => onConfirm(completionDate)}
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
/* ═══════════════════════════════════════════
   MAIN JOB PAGE
═══════════════════════════════════════════ */
export default function JobPage() {

  /* ── API data ── */
  const [customers, setCustomers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [hoardings, setHoardings] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [jobRequests, setJobRequests] = useState([]);
  const [allJobTasks, setAllJobTasks] = useState([]);
  const [allAttachments, setAllAttachments] = useState([]);
  const [photoModalTask, setPhotoModalTask] = useState(null); // task row for photo modal
  const [completeTarget, setCompleteTarget] = useState(null); // { job, tasks }
  const [completing, setCompleting] = useState(false);

  /* ── UI ── */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [toast, setToast] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState(1);
  const [step1Error, setStep1Error] = useState('');
  const [step2Error, setStep2Error] = useState('');
  const [editingJobID, setEditingJobID] = useState(null);
  const [showHoardModal, setShowHoardModal] = useState(false);


  /* ── Form ── */
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [jobType, setJobType] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [ratePerSQFT, setRatePerSQFT] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [supervisorAcceptDttm, setSupervisorAcceptDttm] = useState('');
  const [actualCompletionDate, setActualCompletionDate] = useState('');
  const [contractHoardingMaps, setContractHoardingMaps] = useState([]);
  const [hoardingMerges, setHoardingMerges] = useState([]);

  /* ── Inline tasks ── */
  const [tasks, setTasks] = useState([]);
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
  useResizableColumns(tableRef, tableReady, [40, 200, 120, 100, 70, 148, 140, 170, 60]); useResizableColumns(tableRef, tableReady, [40, 200, 120, 100, 70, 148, 140, 170, 60]);
  // Group tasks: merged ones collapse into a single display row
  const displayTaskRows = useMemo(() => {
    const mergedIds = new Set(
      hoardingMerges.map(m => Number(m.hoardingID ?? m.HoardingID ?? 0)).filter(Boolean)
    );

    const mergedGroup = [];
    const unmergedRows = [];

    tasks.forEach(task => {
      if (mergedIds.has(Number(task.hoardingID))) {
        mergedGroup.push(task);
      } else {
        unmergedRows.push(task);
      }
    });

    const result = [];

    // One grouped row for all merged hoardings
    if (mergedGroup.length > 0) {
      const flag = hoardingMerges.find(
        m => Number(m.hoardingID ?? m.HoardingID) === Number(mergedGroup[0].hoardingID)
      )?.mergeAlongFlag ?? 'H';

      const sizes = mergedGroup.map(t => {
        const h = hoardings.find(hh => hh.hoardingID === t.hoardingID);
        return { w: Number(h?.width) || 0, h: Number(h?.height) || 0 };
      });
      const gaps = Math.max(mergedGroup.length - 1, 1);
      const mw = flag === 'H' ? sizes.reduce((s, sz) => s + sz.w, 0) + gaps : Math.max(...sizes.map(s => s.w));
      const mh = flag === 'H' ? Math.max(...sizes.map(s => s.h)) : sizes.reduce((s, sz) => s + sz.h, 0) + gaps;

      result.push({
        _type: 'merged',
        _id: '__merged__',
        tasks: mergedGroup,
        mergeFlag: flag,
        mergedWidth: mw,
        mergedHeight: mh,
        mergedSqFt: mw * mh,
        // Use first task's fields for status/date editing (or aggregate)
        status: mergedGroup[0].status,
        actualCompletionDate: mergedGroup[0].actualCompletionDate,
        submitDttm: mergedGroup[0].submitDttm,
        saved: mergedGroup.every(t => t.saved),
        jobTaskID: mergedGroup[0].jobTaskID,
      });
    }

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
    if (tasks.length > 0 && tasks.every(t => t.status === 'Submitted')) return 'Submitted';
    if (supervisorAcceptDttm) return 'In Progress';
    if (editingJobID && selectedSupervisor) return 'Accepted';
    return 'Open';
  }, [tasks, supervisorAcceptDttm, editingJobID, selectedSupervisor]);

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
  /* ── Load data ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cRaw, conRaw, hRaw, uRaw, jRaw, jtRaw, attRaw, sRaw, chmRaw, mergeRaw] = await Promise.all([
          apiService.getAllCustomers().catch(() => []),
          apiService.getAllCustomerContracts().catch(() => []),
          apiService.getAllHoardings().catch(() => []),
          apiService.getAllUsers().catch(() => []),
          apiService.getAllJobRequests().catch(() => []),
          apiService.getAllJobTasks().catch(() => []),
          apiService.getAllJobTaskAttachments().catch(() => []),
          apiService.getAllSites().catch(() => []),
          apiService.getAllCustomerContractHoardingMaps().catch(() => []),
          apiService.getAllHoardingMerges().catch(() => []),   // ← ADD
        ]);

        setCustomers(normalizeList(cRaw).map(normalizeCustomer));
        setContracts(normalizeList(conRaw).map(normalizeContract));
        // Build site lookup map
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
      showToast('Refreshed', 'success');
    } catch { showToast('Refresh failed', 'error'); }
  }, [showToast]);

  /* ── Reset form ── */
  const resetForm = () => {
    setSelectedCustomer(null); setSelectedContract(null);
    setJobType(''); setSelectedSupervisor(null);
    setJobDescription(''); setRatePerSQFT(''); setTargetDate('');
    setSupervisorAcceptDttm(''); setActualCompletionDate('');
    setTasks([]);
    setStep1Error(''); setStep2Error('');
    setEditingJobID(null);
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

    setStep(1); setIsCreating(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  /* ── Step navigation ── */
  const goNext = () => {
    if (step === 1) {
      if (!jobType) { setStep1Error('Please select a job type.'); return; }
      if (!targetDate) { setStep1Error('Target completion date is required.'); return; }
      if (!ratePerSQFT || Number(ratePerSQFT) <= 0) { setStep1Error('Rate per SQFT must be greater than 0.'); return; }
      setStep1Error(''); setStep(2);
    }
  };
  const goBack = () => setStep(s => Math.max(1, s - 1));
  const handleBackToList = () => {
    setIsCreating(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 80);
  };

  /* ── Task operations ── */
  const handleAddHoardings = (selectedIds) => {
    const existingHoardingIDs = new Set(tasks.map(t => t.hoardingID));
    const toAdd = hoardings
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
      } else {
        const saved = await apiService.createJobRequest(jobPayload);
        savedJobID = saved?.jobRequestID ?? saved?.JobRequestID ?? 0;
        setEditingJobID(savedJobID); // ← mark as saved so photo buttons activate
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
      await refreshJobs();
      // ← removed: setIsCreating(false)  so form stays open for photos

    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save job.', 'error');
    } finally { setSaving(false); }
  };

  /* ── History table ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return jobRequests;
    return jobRequests.filter(j => {
      const cust = customers.find(c => c.customerID === j.customerID);
      return (cust?.customerName || '').toLowerCase().includes(q) ||
        (j.jobType || '').toLowerCase().includes(q) ||
        String(j.jobRequestID).includes(q) ||
        (j.jobStatus || '').toLowerCase().includes(q);
    });
  }, [jobRequests, search, customers]);

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

  const custName = (id) => customers.find(c => c.customerID === id)?.customerName || '—';
  const supName = (id) => supervisors.find(u => String(u.userID) === String(id))?.userName || '—';
  const getMyTasks = (jobID) => allJobTasks.filter(t => t.jobRequestID === jobID);

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
                      onChange={c => setSelectedContract(c)}
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
                    <label className="qt-label">Select Supervisor</label>
                    <ComboField
                      value={selectedSupervisor?.userID}
                      onChange={u => setSelectedSupervisor(u)}
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
                        onChange={e => { setTargetDate(e.target.value); setStep1Error(''); }} />
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
                    <table className="pg-table" style={{ tableLayout: 'auto' }}>
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
                              <tr key="__merged__" className="pg-tr" style={{
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
                                  <TaskStatusSelect value={row.status} onChange={val => {
                                    row.tasks.forEach(t => updateTask(t._id, 'status', val));
                                  }} />
                                </td>

                                <td className="pg-td">
                                  {allSubmitted ? (
                                    <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11.5, color: '#16a34a', fontWeight: 700 }}>
                                      {row.submitDttm ? fmtDateTime(row.submitDttm) : fmtDateTime(nowISO())}
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
                                  <button
                                    className="pg-btn-view"
                                    onClick={() => row.tasks.forEach(t => deleteTask(t._id))}
                                    title="Remove all merged tasks"
                                    style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', boxShadow: 'none' }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
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
                                <TaskStatusSelect value={row.status} onChange={val => updateTask(row._id, 'status', val)} />
                              </td>
                              <td className="pg-td">
                                {row.status === 'Submitted' ? (
                                  <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11.5, color: '#16a34a', fontWeight: 700 }}>
                                    {row.submitDttm ? fmtDateTime(row.submitDttm) : fmtDateTime(nowISO())}
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
                                <button
                                  className="pg-btn-view"
                                  onClick={() => deleteTask(row._id)}
                                  title="Remove task"
                                  style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', boxShadow: 'none' }}
                                >
                                  <Trash2 size={13} />
                                </button>
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
                        onClick={() => setIsCreating(false)}
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
                    <td colSpan={9} className="pg-td pg-empty" style={{ maxWidth: 'none' }}>
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
                      <td className="pg-td"><JobStatusBadge status={job.jobStatus} /></td>
                      <td className="pg-td">
                        <div className="pg-action-wrap">
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
          hoardings={hoardings}
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
          onUploaded={refreshAttachments}
        />
      )}
      {completeTarget && (
        <CompleteJobModal
          job={completeTarget.job}
          tasks={completeTarget.tasks}
          allHoardings={hoardings}
          onConfirm={handleComplete}
          onCancel={() => !completing && setCompleteTarget(null)}
          completing={completing}
        />
      )}
    </>
  );
}