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
import { apiService } from '../api/api';
import "./Common1.css";

/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */
const JOB_TYPES = [
  { value: 'Banner',   label: 'Banner',   icon: '🪧' },
  { value: 'Repair',   label: 'Repair',   icon: '🔧' },
  { value: 'Erection', label: 'Erection', icon: '🏗️' },
];
const JOB_STATUS_LIST  = ['Open', 'Accepted', 'In Progress', 'Submitted', 'Completed'];
const TASK_STATUS_LIST = ['Open', 'In Progress', 'Submitted'];
const PAGE_SIZE_OPTIONS = [5, 10, 15, 20];

const STEPS = [
  { n: 1, label: 'Job Details',        Icon: Briefcase  },
  { n: 2, label: 'Hoardings & Tasks',  Icon: Building2  },
];

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
const uid       = () => Math.random().toString(36).substr(2, 9);
const todayISO  = () => new Date().toISOString().split('T')[0];
const nowISO    = () => new Date().toISOString();

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

function normalizeList(res) {
  if (Array.isArray(res))          return res;
  if (Array.isArray(res?.$values)) return res.$values;
  if (Array.isArray(res?.data))    return res.data;
  if (Array.isArray(res?.items))   return res.items;
  return [];
}

function normalizeCustomer(raw) {
  return {
    customerID:   raw.customerID   ?? raw.CustomerID   ?? 0,
    customerName: raw.customerName ?? raw.CustomerName ?? '',
    city:         raw.city         ?? raw.City         ?? '',
    district:     raw.district     ?? raw.District     ?? '',
    phone1:       raw.phone1       ?? raw.Phone1       ?? '',
    gstNumber:    raw.gstNumber    ?? raw.GstNumber    ?? '',
  };
}

function normalizeContract(raw) {
  return {
    customerContractID: raw.customerContractID ?? raw.CustomerContractID ?? 0,
    customerID:         raw.customerID         ?? raw.CustomerID         ?? 0,
    hoardingID:         raw.hoardingID         ?? raw.HoardingID         ?? 0,
    startDate:          (raw.startDate         ?? raw.StartDate          ?? '').split('T')[0],
    endDate:            (raw.endDate           ?? raw.EndDate            ?? '').split('T')[0],
    status:             raw.status             ?? raw.Status             ?? '',
    amountPerFreq:      Number(raw.amountPerFreq ?? raw.AmountPerFreq    ?? 0),
  };
}

function normalizeSite(raw) {
  if (!raw) return null;
  return {
    siteID:       raw.siteID       ?? raw.SiteID       ?? 0,
    addressLine1: raw.addressLine1 ?? raw.AddressLine1 ?? '',
    addressLine2: raw.addressLine2 ?? raw.AddressLine2 ?? '',
    landmark:     raw.landmark     ?? raw.Landmark     ?? '',
    city:         raw.city         ?? raw.City         ?? '',
    district:     raw.district     ?? raw.District     ?? '',
  };
}

function normalizeUser(raw) {
  return {
    userID:   raw.userID   ?? raw.UserID   ?? raw.id     ?? 0,
    userName: raw.userName ?? raw.UserName ?? raw.name   ?? raw.fullName ?? raw.FullName ?? raw.email ?? '',
    email:    raw.email    ?? raw.Email    ?? '',
    role:     raw.role     ?? raw.Role     ?? raw.roleName ?? raw.RoleName ?? '',
    roleId:   Number(raw.roleId ?? raw.RoleId ?? raw.roleID ?? 0),
  };
}

function normalizeJobRequest(raw) {
  return {
    jobRequestID:         raw.jobRequestID         ?? raw.JobRequestID         ?? 0,
    customerID:           raw.customerID           ?? raw.CustomerID           ?? 0,
    customerContractID:   raw.customerContractID   ?? raw.CustomerContractID   ?? 0,
    jobType:              raw.jobType              ?? raw.JobType              ?? '',
    jobDescription:       raw.jobDescription       ?? raw.JobDescription       ?? '',
    supervisorID:         raw.iD ?? raw.ID ?? raw.id ?? raw.supervisorID ?? raw.SupervisorID ?? 0,
    supervisorAcceptDttm: raw.supervisorAcceptDttm ?? raw.SupervisorAcceptDttm ?? '',
    rateperSQFT:          Number(raw.rateperSQFT   ?? raw.RateperSQFT          ?? 0),
    totalAreaSQFT:        Number(raw.totalAreaSQFT ?? raw.TotalAreaSQFT        ?? 0),
    targetCompletionDate: (raw.targetCompletionDate ?? raw.TargetCompletionDate ?? '').split('T')[0],
    actualCompletionDate: (raw.actualCompletionDate ?? raw.ActualCompletionDate ?? '').split('T')[0],
    jobStatus:            raw.jobStatus            ?? raw.JobStatus            ?? 'Open',
  };
}

function normalizeJobTask(raw) {
  return {
    jobTaskID:            raw.jobTaskID            ?? raw.JobTaskID            ?? 0,
    jobRequestID:         raw.jobRequestID         ?? raw.JobRequestID         ?? 0,
    hoardingID:           raw.hoardingID           ?? raw.HoardingID           ?? 0,
    actualCompletionDate: (raw.actualCompletionDate ?? raw.ActualCompletionDate ?? '').split('T')[0],
    status:               raw.status               ?? raw.Status               ?? 'Open',
    submitDTTM:           raw.submitDTTM           ?? raw.SubmitDTTM           ?? '',
    lastUpdateDttm:       raw.lastUpdateDttm       ?? raw.LastUpdateDttm       ?? '',
    lastUpdatedBy:        raw.lastUpdatedBy        ?? raw.LastUpdatedBy        ?? 0,
  };
}

function getSiteAddress(h) {
  if (!h) return '';
  const s = h.site ? normalizeSite(h.site) : null;
  if (!s) return h.hoardingCode || '';
  const addr = [s.addressLine1, s.addressLine2].filter(Boolean).join(', ');
  const city = [s.city, s.district].filter(Boolean).join(', ');
  return [addr, city].filter(Boolean).join(' — ') || h.hoardingCode || '';
}

const newTaskRow = (h = null) => ({
  _id:                  uid(),
  jobTaskID:            0,
  hoardingID:           h?.hoardingID   || 0,
  hoardingCode:         h?.hoardingCode || '',
  siteAddress:          getSiteAddress(h),
  size:                 h ? `${h.width} X ${h.height}` : '',
  sqFt:                 h ? (h.width * h.height) : 0,
  actualCompletionDate: '',
  status:               'Open',
  submitDttm:           '',
  saved:                false,
});

/* ═══════════════════════════════════════════
   STATUS BADGES
═══════════════════════════════════════════ */
const JOB_STATUS_COLORS = {
  'Open':        { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  'Accepted':    { bg: '#fefce8', color: '#ca8a04', border: '#fde68a' },
  'In Progress': { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Submitted':   { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'Completed':   { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
};
const TASK_STATUS_COLORS = {
  'Open':        { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  'In Progress': { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Submitted':   { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
};

function JobStatusBadge({ status }) {
  const s = JOB_STATUS_COLORS[status] || JOB_STATUS_COLORS['Open'];
  return (
    <span style={{ display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:20,fontFamily:'Nunito,sans-serif',fontSize:11,fontWeight:700,background:s.bg,color:s.color,border:`1px solid ${s.border}`,whiteSpace:'nowrap' }}>
      {status || 'Open'}
    </span>
  );
}

function TaskStatusSelect({ value, onChange }) {
  const s = TASK_STATUS_COLORS[value] || TASK_STATUS_COLORS['Open'];
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        fontFamily:'Nunito,sans-serif', fontSize:12, fontWeight:700,
        padding:'4px 10px', borderRadius:7,
        border:`1.5px solid ${s.border}`,
        background: s.bg, color: s.color,
        cursor:'pointer', outline:'none',
        appearance:'none', WebkitAppearance:'none',
        paddingRight:22,
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239090a8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat:'no-repeat',
        backgroundPosition:'right 6px center',
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
  const [style, setStyle] = useState({ position:'fixed', top:0, left:0, width:0, zIndex:99999 });
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const upd = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const ph = panelRef.current?.offsetHeight || 260;
      const flipUp = (window.innerHeight - r.bottom) < ph + 8 && r.top > ph + 8;
      setStyle({ position:'fixed', top: flipUp ? r.top - ph - 4 : r.bottom + 4, left:r.left, width:r.width, zIndex:99999 });
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
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef    = useRef(null);
  const triggerRef = useRef(null);
  const panelRef   = useRef(null);
  const inputRef   = useRef(null);

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
  const clear  = (e) => { e.stopPropagation(); onChange(null); };

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div ref={triggerRef}
        className={`pg-field-wrap pg-combo-trigger pg-field-wrap--normal${disabled ? ' jb-disabled' : ''}`}
        onClick={openDD} tabIndex={disabled ? -1 : 0}
        onKeyDown={e => {
          if (!open && !disabled && (e.key==='ArrowDown'||e.key==='Enter'||e.key===' ')) { e.preventDefault(); openDD(); }
          else if (open && e.key==='Escape') close();
        }}
      >
        {Icon && <Icon size={14} color={disabled ? '#d0d0e0' : '#c0c0d8'} style={{ flexShrink:0 }}/>}
        <span className={`pg-combo-display${!selected ? ' pg-combo-display--placeholder' : ''}`}
          style={{ color: disabled ? '#c0c0d8' : undefined }}>
          {selected ? getLabel(selected) : placeholder || 'Select…'}
        </span>
        {selected && !disabled
          ? <X size={13} className="pg-combo-clear" onClick={clear}/>
          : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink:0 }}/>}
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position:'static' }}>
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink:0 }}/>
            <input ref={inputRef} className="pg-combo-search__input"
              placeholder={searchPlaceholder || 'Search…'}
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key==='Escape') close(); }}/>
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')}/>}
          </div>
          <div className="pg-combo-list">
            {filtered.length === 0
              ? <div className="pg-combo-empty">No options found</div>
              : filtered.map(o => (
                <div key={getValue(o)}
                  className={`pg-combo-option${String(getValue(o))===String(value??'') ? ' pg-combo-option--active' : ''}`}
                  onClick={() => select(o)} tabIndex={0}
                  onKeyDown={e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); select(o); } }}
                >
                  <div style={{ flex:1 }}>
                    <span className="pg-combo-option__name">{getLabel(o)}</span>
                    {getSecondary?.(o) && <span className="pg-combo-option__id">{getSecondary(o)}</span>}
                  </div>
                  {String(getValue(o))===String(value??'') && <Check size={12} color="#049edf" style={{ marginLeft:'auto', flexShrink:0 }}/>}
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
function HoardingSelectModal({ hoardings, filteredHoardingIds, existingIds, onAdd, onClose }) {
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(new Set());

  const isFiltered = filteredHoardingIds !== null;

  const base = useMemo(() =>
    isFiltered ? hoardings.filter(h => filteredHoardingIds.has(h.hoardingID)) : hoardings,
  [hoardings, filteredHoardingIds, isFiltered]);

  const display = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return base;
    return base.filter(h =>
      (h.hoardingCode || '').toLowerCase().includes(q) ||
      getSiteAddress(h).toLowerCase().includes(q) ||
      (h.site?.city || '').toLowerCase().includes(q)
    );
  }, [base, search]);

  const selectable  = display.filter(h => !existingIds.has(h.hoardingID));
  const allSelected = selectable.length > 0 && selectable.every(h => selected.has(h.hoardingID));
  const someSel     = selectable.some(h => selected.has(h.hoardingID));

  const toggle = (id) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    if (allSelected) setSelected(p => { const n = new Set(p); selectable.forEach(h => n.delete(h.hoardingID)); return n; });
    else             setSelected(p => { const n = new Set(p); selectable.forEach(h => n.add(h.hoardingID));   return n; });
  };

  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="pg-modal" style={{ maxWidth:640 }}>
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><Building2 size={20} color="#049edf"/></div>
            <div>
              <h5 className="pg-modal__title">Select Hoardings</h5>
              <p className="pg-modal__subtitle">
                {isFiltered
                  ? `${base.length} hoarding${base.length!==1?'s':''} from selected customer/contract`
                  : `All ${base.length} hoardings (no customer/contract filter)`}
              </p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15}/></button>
        </div>

        {/* Warning when unfiltered */}
        {!isFiltered && (
          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 16px',background:'rgba(245,158,11,0.07)',borderBottom:'1px solid rgba(245,158,11,0.18)',fontFamily:'Nunito,sans-serif',fontSize:12,color:'#b45309',fontWeight:600 }}>
            <AlertCircle size={13}/>
            Select a customer or contract in Step 1 to filter relevant hoardings.
          </div>
        )}

        <div style={{ padding:'12px 24px',borderBottom:'1px solid #f0f0f8' }}>
          <div className="pg-search-box">
            <Search size={13} color="#c0c0d8" style={{ flexShrink:0 }}/>
            <input placeholder="Search by site address or hoarding code…" value={search} onChange={e => setSearch(e.target.value)}/>
            {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')}/>}
          </div>
        </div>

        {/* Select all */}
        {selectable.length > 0 && (
          <div className="qt-select-all-row" onClick={toggleAll}>
            <div className={`qt-modal-check ${allSelected ? 'qt-modal-check--all' : someSel ? 'qt-modal-check--on' : ''}`}>
              {allSelected ? <Check size={12} color="#fff"/> : someSel ? <div style={{ width:8,height:2,background:'#049edf',borderRadius:2 }}/> : null}
            </div>
            <span>{allSelected ? 'Deselect All' : `Select All (${selectable.length})`}</span>
          </div>
        )}

        <div style={{ flex:1,overflowY:'auto',maxHeight:360 }}>
          {display.length === 0 ? (
            <div className="pg-empty__inner" style={{ padding:'32px 20px' }}>
              <Building2 size={32} color="#d0d0e8"/>
              <span className="pg-empty__label">{isFiltered ? 'No hoardings in this contract' : 'No hoardings found'}</span>
            </div>
          ) : display.map(h => {
            const checked   = selected.has(h.hoardingID);
            const alreadyIn = existingIds.has(h.hoardingID);
            const addr      = getSiteAddress(h);
            const siteCity  = [h.site?.city, h.site?.district].filter(Boolean).join(', ');
            return (
              <div key={h.hoardingID}
                onClick={() => !alreadyIn && toggle(h.hoardingID)}
                style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 24px',borderBottom:'1px solid #f8f8f8',cursor:alreadyIn?'not-allowed':'pointer',background:checked?'rgba(4,158,223,0.05)':'#fff',opacity:alreadyIn?0.5:1 }}
              >
                <div className={`qt-modal-check ${checked ? 'qt-modal-check--on' : ''}`}>
                  {checked && <Check size={12} color="#fff"/>}
                </div>
                <MapPin size={13} color="#c0c0d8" style={{ flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'Nunito,sans-serif',fontSize:13,fontWeight:700,color:'#1a1a2e' }}>
                    {addr || h.hoardingCode}
                    {alreadyIn && <span style={{ color:'#9090a8',fontWeight:600,fontSize:11 }}> · Already added</span>}
                  </div>
                  <div style={{ fontFamily:'Nunito,sans-serif',fontSize:11,color:'#9090a8',marginTop:2 }}>
                    Code: {h.hoardingCode} · {h.width}×{h.height} ft · {h.width*h.height} sq.ft
                    {siteCity ? ` · ${siteCity}` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pg-modal__foot">
          <span style={{ fontFamily:'Nunito,sans-serif',fontSize:12.5,color:'#9090a8',fontWeight:600 }}>{selected.size} selected</span>
          <div style={{ display:'flex',gap:10 }}>
            <button className="pg-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="pg-btn-save" onClick={() => onAdd(selected)} disabled={selected.size===0}>
              <Plus size={14}/> Add {selected.size>0?`(${selected.size})`:''}
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
      {type==='success' ? <CheckCircle2 size={15}/> : <AlertCircle size={15}/>}
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
      <ChevronUp   size={10} color={active&&sortDir==='asc'  ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__up"/>
      <ChevronDown size={10} color={active&&sortDir==='desc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__down"/>
    </span>
  );
}

/* ═══════════════════════════════════════════
   MAIN JOB PAGE
═══════════════════════════════════════════ */
export default function JobPage() {

  /* ── API data ── */
  const [customers,    setCustomers]    = useState([]);
  const [contracts,    setContracts]    = useState([]);
  const [hoardings,    setHoardings]    = useState([]);
  const [supervisors,  setSupervisors]  = useState([]);
  const [jobRequests,  setJobRequests]  = useState([]);
  const [allJobTasks,  setAllJobTasks]  = useState([]);

  /* ── UI ── */
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [apiError,   setApiError]   = useState('');
  const [toast,      setToast]      = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [step,       setStep]       = useState(1);
  const [step1Error, setStep1Error] = useState('');
  const [step2Error, setStep2Error] = useState('');
  const [editingJobID, setEditingJobID] = useState(null);
  const [showHoardModal, setShowHoardModal] = useState(false);

  /* ── Form ── */
  const [selectedCustomer,  setSelectedCustomer]  = useState(null);
  const [selectedContract,  setSelectedContract]  = useState(null);
  const [jobType,           setJobType]           = useState('');
  const [selectedSupervisor,setSelectedSupervisor]= useState(null);
  const [jobDescription,    setJobDescription]    = useState('');
  const [ratePerSQFT,       setRatePerSQFT]       = useState('');
  const [targetDate,        setTargetDate]        = useState('');
  const [supervisorAcceptDttm, setSupervisorAcceptDttm] = useState('');
  const [actualCompletionDate, setActualCompletionDate] = useState('');

  /* ── Inline tasks ── */
  const [tasks, setTasks] = useState([]);

  /* ── History table ── */
  const [search,    setSearch]    = useState('');
  const [sortKey,   setSortKey]   = useState('jobRequestID');
  const [sortDir,   setSortDir]   = useState('desc');
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSize]  = useState(10);

  const formRef = useRef(null);
  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  /* ── Computed ── */
  const totalAreaSQFT = useMemo(() =>
    tasks.reduce((s, t) => s + Number(t.sqFt || 0), 0),
  [tasks]);

  // Derive job request status from task states + supervisor acceptance
  const derivedJobStatus = useMemo(() => {
    if (tasks.length > 0 && tasks.every(t => t.status === 'Submitted')) return 'Submitted';
    if (supervisorAcceptDttm) return 'In Progress';
    if (editingJobID && selectedSupervisor) return 'Accepted';
    return 'Open';
  }, [tasks, supervisorAcceptDttm, editingJobID, selectedSupervisor]);

  // Contracts belonging to selected customer
  const customerContracts = useMemo(() => {
    if (!selectedCustomer) return [];
    return contracts.filter(c => c.customerID === selectedCustomer.customerID);
  }, [contracts, selectedCustomer]);

  // Hoarding IDs accessible from selected contract/customer
  const filteredHoardingIds = useMemo(() => {
    if (selectedContract) {
      const ids = new Set(
        contracts
          .filter(c => c.customerContractID === selectedContract.customerContractID)
          .map(c => c.hoardingID)
          .filter(Boolean)
      );
      return ids.size > 0 ? ids : null;
    }
    if (selectedCustomer) {
      const ids = new Set(
        contracts
          .filter(c => c.customerID === selectedCustomer.customerID)
          .map(c => c.hoardingID)
          .filter(Boolean)
      );
      return ids.size > 0 ? ids : null;
    }
    return null; // show all hoardings
  }, [selectedContract, selectedCustomer, contracts]);

  const existingTaskHoardingIds = useMemo(() =>
    new Set(tasks.map(t => t.hoardingID).filter(Boolean)),
  [tasks]);

  /* ── Load data ── */
useEffect(() => {
  (async () => {
    setLoading(true);
    try {
      const [cRaw, conRaw, hRaw, uRaw, jRaw, jtRaw] = await Promise.all([
        apiService.getAllCustomers()          .catch(() => []),  // ← add catch
        apiService.getAllCustomerContracts()  .catch(() => []),  // ← add catch
        apiService.getAllHoardings()          .catch(() => []),  // ← add catch
        apiService.getAllUsers()              .catch(() => []),
        apiService.getAllJobRequests()        .catch(() => []),
        apiService.getAllJobTasks()           .catch(() => []),
      ]);

      setCustomers(normalizeList(cRaw).map(normalizeCustomer));
      setContracts(normalizeList(conRaw).map(normalizeContract));
      setHoardings(normalizeList(hRaw));

      const allUsers = normalizeList(uRaw).map(normalizeUser);
      const sups = allUsers.filter(u =>
        u.role?.toLowerCase().includes('supervisor') || u.roleId === 3
      );
      setSupervisors(sups);

      setJobRequests(normalizeList(jRaw).map(normalizeJobRequest));
      setAllJobTasks(normalizeList(jtRaw).map(normalizeJobTask));

    } catch (err) {
      setApiError(err?.response?.data?.message || err?.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  })();
}, []);

  /* ── Refresh ── */
  const refreshJobs = useCallback(async () => {
    try {
      const [jRaw, jtRaw] = await Promise.all([
        apiService.getAllJobRequests(),
        apiService.getAllJobTasks(),
      ]);
      setJobRequests(normalizeList(jRaw).map(normalizeJobRequest));
      setAllJobTasks(normalizeList(jtRaw).map(normalizeJobTask));
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
    setTimeout(() => formRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 80);
  };

  /* ── Edit existing ── */
  const handleEdit = (job) => {
    const cust = customers.find(c => c.customerID === job.customerID)  || null;
    const cont = contracts.find(c => c.customerContractID === job.customerContractID) || null;
    const sup  = supervisors.find(u => u.userID === job.supervisorID)  || null;

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
    const builtTasks = myTasks.map(jt => {
      const h = hoardings.find(hh => hh.hoardingID === jt.hoardingID);
      return {
        _id:                  uid(),
        jobTaskID:            jt.jobTaskID,
        hoardingID:           jt.hoardingID,
        hoardingCode:         h?.hoardingCode || '',
        siteAddress:          getSiteAddress(h),
        size:                 h ? `${h.width} X ${h.height}` : '',
        sqFt:                 h ? (h.width * h.height) : 0,
        actualCompletionDate: jt.actualCompletionDate || '',
        status:               jt.status || 'Open',
        submitDttm:           jt.submitDTTM || '',
        saved:                true,
      };
    });
    setTasks(builtTasks);

    setStep(1); setIsCreating(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 80);
  };

  /* ── Step navigation ── */
  const goNext = () => {
    if (step === 1) {
      if (!jobType)    { setStep1Error('Please select a job type.'); return; }
      if (!targetDate) { setStep1Error('Target completion date is required.'); return; }
      if (!ratePerSQFT || Number(ratePerSQFT) <= 0) { setStep1Error('Rate per SQFT must be greater than 0.'); return; }
      setStep1Error(''); setStep(2);
    }
  };
  const goBack           = () => setStep(s => Math.max(1, s - 1));
  const handleBackToList = () => {
    setIsCreating(false);
    setTimeout(() => window.scrollTo({ top:0, behavior:'smooth' }), 80);
  };

  /* ── Task operations ── */
  const handleAddHoardings = (selectedIds) => {
    const toAdd = hoardings
      .filter(h => selectedIds.has(h.hoardingID) && !tasks.find(t => t.hoardingID === h.hoardingID))
      .map(h => newTaskRow(h));
    setTasks(p => [...p, ...toAdd]);
    setShowHoardModal(false);
  };

  const updateTask = useCallback((id, field, val) => {
    setTasks(prev => prev.map(t => {
      if (t._id !== id) return t;
      const u = { ...t, [field]: val };
      // Auto-set submit date when marking Submitted
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
        customerID:           selectedCustomer?.customerID    || 0,
        customerContractID:   selectedContract?.customerContractID || 0,
        jobType,
        jobDescription:       jobDescription || '',
        iD:                   selectedSupervisor?.userID      || 0,
        rateperSQFT:          Number(ratePerSQFT || 0),
        totalAreaSQFT,
        targetCompletionDate: targetDate,
        jobStatus:            derivedJobStatus,
      };

      let savedJobID = editingJobID;
      if (editingJobID) {
        await apiService.updateJobRequest({ ...jobPayload, jobRequestID: editingJobID });
      } else {
        const saved = await apiService.createJobRequest(jobPayload);
        savedJobID = saved?.jobRequestID ?? saved?.JobRequestID ?? 0;
      }

      await Promise.all(tasks.map(task => {
        const payload = {
          jobRequestID:         savedJobID,
          hoardingID:           task.hoardingID,
          actualCompletionDate: task.actualCompletionDate || todayISO(),
          status:               task.status,
          submitDTTM:           task.status === 'Submitted' ? (task.submitDttm || nowISO()) : nowISO(),
          lastUpdateDttm:       nowISO(),
          lastUpdatedBy:        userId,
        };
        if (task.saved && task.jobTaskID > 0) {
          return apiService.updateJobTask({ ...payload, jobTaskID: task.jobTaskID });
        }
        return apiService.createJobTask(payload);
      }));

      showToast(editingJobID ? 'Job updated successfully!' : 'Job created successfully!', 'success');
      await refreshJobs();
      setIsCreating(false);
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
  const paginated  = sorted.slice((page-1)*pageSize, page*pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d==='asc'?'desc':'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const pageNums = Array.from({ length:totalPages }, (_,i)=>i+1)
    .filter(p => p===1||p===totalPages||Math.abs(p-page)<=1)
    .reduce((acc,p,i,arr) => { if (i>0&&arr[i]-arr[i-1]>1) acc.push('…'); acc.push(p); return acc; }, []);

  const custName  = (id) => customers.find(c => c.customerID===id)?.customerName   || '—';
  const supName   = (id) => supervisors.find(u => u.userID===id)?.userName          || '—';
  const getMyTasks = (jobID) => allJobTasks.filter(t => t.jobRequestID === jobID);

  /* ── Job type badge styles ── */
  const jobTypeBadgeStyle = (type) => {
    const styles = {
      'Banner':   { bg:'rgba(4,158,223,0.09)',   color:'#049edf',   border:'rgba(4,158,223,0.25)'   },
      'Repair':   { bg:'rgba(245,158,11,0.09)',  color:'#d97706',   border:'rgba(245,158,11,0.25)'  },
      'Erection': { bg:'rgba(124,58,237,0.09)', color:'#7c3aed',   border:'rgba(124,58,237,0.25)'  },
    };
    return styles[type] || styles['Banner'];
  };

  /* ════════════════ RENDER ════════════════ */
  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',gap:14,flexDirection:'column' }}>
      <Loader2 size={32} color="#049edf" className="pg-spin"/>
      <span style={{ fontFamily:'Nunito,sans-serif',color:'#9090a8',fontSize:14 }}>Loading job data…</span>
    </div>
  );

  return (
    <>
      {saving && (
        <div className="qt-saving-overlay">
          <Loader2 size={32} color="#049edf" className="pg-spin"/>
          <div className="qt-saving-overlay__text">Saving job…</div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}

      <div className="pg-page">

        {/* ── Page Header ── */}
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">Job Management</h1>
            <p className="pg-header__subtitle">Create and manage hoarding <strong>job requests</strong> and tasks.</p>
          </div>
          <div style={{ display:'flex',gap:10,alignItems:'center' }}>
            {isCreating && (
              <button className="pg-btn-cancel" onClick={handleBackToList} style={{ display:'flex',alignItems:'center',gap:6 }}>
                <LayoutGrid size={13}/> Back to List
              </button>
            )}
            {!isCreating && (
              <button className="pg-btn-add" onClick={handleStartNew}>
                <Plus size={14}/> New Job
              </button>
            )}
          </div>
        </div>

        {apiError && (
          <div style={{ display:'flex',gap:8,alignItems:'center',padding:'10px 14px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:11,marginBottom:16,color:'#dc2626',fontSize:13,fontWeight:600,fontFamily:'Nunito,sans-serif' }}>
            <AlertCircle size={14}/> {apiError}
          </div>
        )}

        {/* ══════════════════════════════
            CREATION / EDIT FORM
        ══════════════════════════════ */}
        {isCreating && (
          <div ref={formRef} className="pg-container jb-form-container" style={{ marginBottom:20 }}>

            {/* Step bar */}
            <div className="qt-step-bar">
              {STEPS.map((s, i) => {
                const done   = step > s.n;
                const active = step === s.n;
                return (
                  <React.Fragment key={s.n}>
                    <div className={`qt-step${active?' qt-step--active':''}${done?' qt-step--done':''}`}>
                      <div className="qt-step__circle">
                        {done ? <Check size={14} color="#fff"/> : <s.Icon size={13} color={active?'#fff':'#b0b0c8'}/>}
                      </div>
                      <div className="qt-step__label">{s.label}</div>
                    </div>
                    {i < STEPS.length-1 && <div className={`qt-step__connector${done?' qt-step__connector--done':''}`}/>}
                  </React.Fragment>
                );
              })}
            </div>

            {/* ─── STEP 1: JOB DETAILS ─── */}
            {step === 1 && (
              <div className="qt-step-body">
                <div className="qt-form-grid">

                  {/* Customer */}
                  <div>
                    <label className="qt-label">
                      Customer <span className="qt-label--opt">(optional)</span>
                    </label>
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
                        <span style={{ color:'#049edf' }}>{customerContracts.length} contract{customerContracts.length!==1?'s':''}</span>
                      </div>
                    )}
                  </div>

                  {/* Customer Contract */}
                  <div>
                    <label className="qt-label">
                      Customer Contract <span className="qt-label--opt">(optional — filters hoardings)</span>
                    </label>
                    <ComboField
                      value={selectedContract?.customerContractID}
                      onChange={c => setSelectedContract(c)}
                      options={customerContracts}
                      placeholder={selectedCustomer
                        ? (customerContracts.length === 0 ? 'No contracts for this customer' : 'Select contract…')
                        : 'Select customer first'}
                      icon={FileText}
                      disabled={!selectedCustomer || customerContracts.length === 0}
                      getLabel={c => `Contract #${c.customerContractID}`}
                      getValue={c => c.customerContractID}
                      getSecondary={c => `${fmtDate(c.startDate)} → ${fmtDate(c.endDate)} · ${c.status || ''}`}
                      searchPlaceholder="Search contracts…"
                    />
                  </div>

                  {/* Job Type */}
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
                      searchPlaceholder="Banner / Repair / Erection"
                    />
                  </div>

                  {/* Select Supervisor */}
                  <div>
                    <label className="qt-label">Select Supervisor</label>
                    <ComboField
                      value={selectedSupervisor?.userID}
                      onChange={u => setSelectedSupervisor(u)}
                      options={supervisors}
                      placeholder={
                        supervisors.length === 0
                          ? 'No supervisors found in system'
                          : 'Select supervisor…'
                      }
                      icon={UserCheck}
                      disabled={supervisors.length === 0}
                      getLabel={u => u.userName}
                      getValue={u => u.userID}
                      getSecondary={u => u.email || u.role}
                      searchPlaceholder="Search supervisors…"
                    />
                    {supervisors.length === 0 && (
                      <div style={{ fontFamily:'Nunito,sans-serif',fontSize:11,color:'#f59e0b',marginTop:4,display:'flex',gap:5,alignItems:'center' }}>
                        <AlertCircle size={11}/> No users with Supervisor role found.
                      </div>
                    )}
                  </div>

                  {/* Job Description */}
                  <div className="qt-field-full">
                    <label className="qt-label">Job Description <span className="qt-label--opt">(optional)</span></label>
                    <div className="qt-input-wrap" style={{ alignItems:'flex-start', paddingTop:10 }}>
                      <Briefcase size={14} color="#c0c0d8" style={{ flexShrink:0, marginTop:2 }}/>
                      <textarea
                        className="qt-input jb-textarea"
                        value={jobDescription}
                        onChange={e => setJobDescription(e.target.value)}
                        placeholder="Describe the job scope, requirements, special instructions…"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Rate per SQFT */}
                  <div>
                    <label className="qt-label">Rate per SQFT <span className="qt-label--req">*</span></label>
                    <div className="qt-input-wrap">
                      <span style={{ fontSize:13, color:'#049edf', fontWeight:800, flexShrink:0 }}>₹</span>
                      <input className="qt-input" type="number" min="0" step="0.01"
                        value={ratePerSQFT}
                        onChange={e => { setRatePerSQFT(e.target.value); setStep1Error(''); }}
                        placeholder="0.00"/>
                    </div>
                  </div>

                  {/* Target Completion Date */}
                  <div>
                    <label className="qt-label">Target Completion Date <span className="qt-label--req">*</span></label>
                    <div className="qt-input-wrap">
                      <Calendar size={14} color="#c0c0d8" style={{ flexShrink:0 }}/>
                      <input className="qt-input" type="date" value={targetDate}
                        onChange={e => { setTargetDate(e.target.value); setStep1Error(''); }}/>
                    </div>
                  </div>

                  {/* Supervisor Accept Date — read only */}
                  <div>
                    <label className="qt-label">
                      Supervisor Accept Date <span className="qt-label--opt">(read-only)</span>
                    </label>
                    <div className="qt-input-wrap jb-readonly">
                      <Clock size={14} color="#d0d0e0" style={{ flexShrink:0 }}/>
                      <span className="jb-readonly-text">
                        {supervisorAcceptDttm ? fmtDateTime(supervisorAcceptDttm) : 'Pending supervisor acceptance…'}
                      </span>
                      <span style={{ fontSize:11, color:'#d0d0e0', flexShrink:0 }}>🔒</span>
                    </div>
                  </div>

                  {/* Actual Completion Date — read only */}
                  <div>
                    <label className="qt-label">
                      Actual Completion Date <span className="qt-label--opt">(read-only)</span>
                    </label>
                    <div className="qt-input-wrap jb-readonly">
                      <Calendar size={14} color="#d0d0e0" style={{ flexShrink:0 }}/>
                      <span className="jb-readonly-text">
                        {actualCompletionDate ? fmtDate(actualCompletionDate) : 'Not yet completed'}
                      </span>
                      <span style={{ fontSize:11, color:'#d0d0e0', flexShrink:0 }}>🔒</span>
                    </div>
                  </div>

                  {/* Job Status (derived) */}
                  <div>
                    <label className="qt-label">Job Status <span className="qt-label--opt">(auto-derived)</span></label>
                    <div style={{ marginTop:6 }}>
                      <JobStatusBadge status={derivedJobStatus}/>
                      <div style={{ fontFamily:'Nunito,sans-serif',fontSize:11,color:'#9090a8',marginTop:5,fontWeight:600 }}>
                        Updates automatically based on supervisor acceptance and task completion.
                      </div>
                    </div>
                  </div>

                </div>

                {step1Error && <div className="qt-error-banner"><AlertCircle size={14}/> {step1Error}</div>}

                <div className="qt-step-foot">
                  <button className="pg-btn-cancel" onClick={handleBackToList} style={{ display:'flex',alignItems:'center',gap:6 }}>
                    <LayoutGrid size={13}/> Back to List
                  </button>
                  <button className="pg-btn-save" onClick={goNext}>
                    Next: Hoardings &amp; Tasks <ArrowRight size={14}/>
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 2: HOARDINGS & TASKS ─── */}
            {step === 2 && (
              <div className="qt-step-body">

                {/* Job summary banner */}
                <div className="jb-summary-banner">
                  <div className="jb-summary-item">
                    <span className="jb-summary-label">Customer</span>
                    <span className="jb-summary-value">{selectedCustomer?.customerName || '—'}</span>
                  </div>
                  <div className="jb-summary-divider"/>
                  <div className="jb-summary-item">
                    <span className="jb-summary-label">Job Type</span>
                    <span className="jb-summary-value">{jobType || '—'}</span>
                  </div>
                  <div className="jb-summary-divider"/>
                  <div className="jb-summary-item">
                    <span className="jb-summary-label">Rate / Sq.Ft</span>
                    <span className="jb-summary-value">₹ {ratePerSQFT || '0'}</span>
                  </div>
                  <div className="jb-summary-divider"/>
                  <div className="jb-summary-item">
                    <span className="jb-summary-label">Total Area</span>
                    <span className="jb-summary-value" style={{ color:'#049edf',fontWeight:900 }}>
                      {totalAreaSQFT.toFixed(1)} sq.ft
                    </span>
                  </div>
                  <div className="jb-summary-divider"/>
                  <div className="jb-summary-item">
                    <span className="jb-summary-label">Target Date</span>
                    <span className="jb-summary-value">{fmtDate(targetDate)}</span>
                  </div>
                  <div className="jb-summary-divider"/>
                  <div className="jb-summary-item">
                    <span className="jb-summary-label">Status</span>
                    <JobStatusBadge status={derivedJobStatus}/>
                  </div>
                </div>

                {/* Tasks header */}
                <div className="qt-step2-head" style={{ marginTop:18 }}>
                  <div>
                    <div className="qt-step2-title">Hoarding Tasks</div>
                    <div className="qt-step2-sub">
                      {tasks.length} hoarding{tasks.length!==1?'s':''} · Total area: {totalAreaSQFT.toFixed(1)} sq.ft
                      {selectedContract
                        ? ` · Filtered by Contract #${selectedContract.customerContractID}`
                        : selectedCustomer
                          ? ` · Filtered by ${selectedCustomer.customerName}'s contracts`
                          : ' · Showing all hoardings'}
                    </div>
                  </div>
                  <button className="pg-btn-save" onClick={() => setShowHoardModal(true)}
                    style={{ display:'flex',alignItems:'center',gap:6 }}>
                    <Plus size={13}/> Add Hoardings
                  </button>
                </div>

                {/* Tasks table */}
                <div style={{ overflowX:'auto',border:'1px solid #f0f0f8',borderRadius:12,marginBottom:12 }}>
                  {tasks.length === 0 ? (
                    <div className="pg-empty__inner" style={{ padding:'44px 20px' }}>
                      <Building2 size={38} color="#d0d0e8"/>
                      <span className="pg-empty__label">No hoardings added yet</span>
                      <span style={{ fontFamily:'Nunito,sans-serif',fontSize:12,color:'#b0b0c8',fontWeight:600 }}>
                        Click "Add Hoardings" to get started
                      </span>
                    </div>
                  ) : (
                    <table className="pg-table" style={{ tableLayout:'auto' }}>
                      <thead>
                        <tr>
                          <th className="pg-th" style={{ width:40 }}>#</th>
                          <th className="pg-th" style={{ textAlign:'left',minWidth:200 }}>Site Address</th>
                          <th className="pg-th" style={{ minWidth:90 }}>Code</th>
                          <th className="pg-th" style={{ minWidth:90 }}>Size</th>
                          <th className="pg-th" style={{ minWidth:70 }}>Sq.Ft</th>
                          <th className="pg-th" style={{ minWidth:148 }}>Actual Completion</th>
                          <th className="pg-th" style={{ minWidth:140 }}>Task Status</th>
                          <th className="pg-th" style={{ minWidth:170 }}>Submit Date / Time</th>
                          <th className="pg-th" style={{ width:46 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((task, i) => (
                          <tr key={task._id} className="pg-tr"
                            style={{ background: task.status==='Submitted' ? 'rgba(22,163,74,0.03)' : undefined }}>
                            <td className="pg-td" style={{ textAlign:'center' }}>
                              <span style={{ fontFamily:'Nunito,sans-serif',fontSize:12,fontWeight:800,color:'#9090a8' }}>{i+1}</span>
                            </td>
                            <td className="pg-td">
                              <div style={{ fontFamily:'Nunito,sans-serif',fontSize:12.5,fontWeight:700,color:'#1a1a2e' }}>
                                {task.siteAddress || task.hoardingCode || '—'}
                              </div>
                            </td>
                            <td className="pg-td">
                              <span style={{ fontFamily:'Nunito,sans-serif',fontSize:12,color:'#049edf',fontWeight:700 }}>
                                {task.hoardingCode || '—'}
                              </span>
                            </td>
                            <td className="pg-td" style={{ textAlign:'center' }}>
                              <span style={{ fontFamily:'Nunito,sans-serif',fontSize:12,color:'#4a5568' }}>{task.size || '—'}</span>
                            </td>
                            <td className="pg-td" style={{ textAlign:'center' }}>
                              <span style={{ fontFamily:'Nunito,sans-serif',fontSize:13,fontWeight:900,color:'#1a1a2e' }}>{task.sqFt}</span>
                            </td>
                            <td className="pg-td">
                              <input className="qt-inline-input qt-date-input" type="date"
                                value={task.actualCompletionDate}
                                onChange={e => updateTask(task._id, 'actualCompletionDate', e.target.value)}/>
                            </td>
                            <td className="pg-td">
                              <TaskStatusSelect
                                value={task.status}
                                onChange={val => updateTask(task._id, 'status', val)}
                              />
                            </td>
                            <td className="pg-td">
                              {task.status === 'Submitted' ? (
                                <div style={{ fontFamily:'Nunito,sans-serif',fontSize:11.5,color:'#16a34a',fontWeight:700 }}>
                                  {task.submitDttm ? fmtDateTime(task.submitDttm) : fmtDateTime(nowISO())}
                                  <span style={{ fontSize:10,color:'#d0d0e0',marginLeft:4 }}>🔒</span>
                                </div>
                              ) : (
                                <span style={{ fontFamily:'Nunito,sans-serif',fontSize:12,color:'#d0d0e0',fontStyle:'italic' }}>
                                  Set status to Submitted
                                </span>
                              )}
                            </td>
                            <td className="pg-td">
                              <div className="pg-action-wrap">
                                <button className="pg-btn-view"
                                  onClick={() => deleteTask(task._id)} title="Remove task"
                                  style={{ background:'rgba(220,38,38,0.08)',boxShadow:'none',color:'#dc2626' }}>
                                  <Trash2 size={13}/>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {tasks.length > 0 && (
                        <tfoot>
                          <tr style={{ background:'#f5f5fd' }}>
                            <td colSpan={4} className="pg-td"
                              style={{ fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:12.5,color:'#5a5a78',textAlign:'right' }}>
                              Total Area SQFT →
                            </td>
                            <td className="pg-td" style={{ textAlign:'center',fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:14,color:'#049edf' }}>
                              {totalAreaSQFT.toFixed(1)}
                            </td>
                            <td colSpan={4}></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  )}
                </div>

                {step2Error && <div className="qt-error-banner"><AlertCircle size={14}/> {step2Error}</div>}

                <div className="qt-step-foot">
                  <div style={{ display:'flex',gap:10 }}>
                    <button className="pg-btn-cancel" onClick={handleBackToList} style={{ display:'flex',alignItems:'center',gap:6 }}>
                      <LayoutGrid size={13}/> Back to List
                    </button>
                    <button className="pg-btn-cancel" onClick={goBack} style={{ display:'flex',alignItems:'center',gap:6 }}>
                      <ArrowLeft size={13}/> Back
                    </button>
                  </div>
                  <button className="pg-btn-save" onClick={handleSave}
                    disabled={tasks.length===0||saving}
                    style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 24px',fontSize:14 }}>
                    <Check size={15}/> {editingJobID ? 'Update Job' : 'Create Job'}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ══════════════════════════════
            JOB REQUEST LIST
        ══════════════════════════════ */}
        {!isCreating && (
          <div className="pg-container">

            {/* Toolbar */}
            <div style={{ display:'flex',alignItems:'center',gap:12,padding:'16px 20px',borderBottom:'1px solid #f0f0f8',flexWrap:'wrap' }}>
              <div style={{ display:'flex',alignItems:'center',gap:7,flexShrink:0 }}>
                <div style={{ width:32,height:32,borderRadius:9,background:'rgba(4,158,223,0.10)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <Briefcase size={15} color="#049edf"/>
                </div>
                <div>
                  <div style={{ fontFamily:'Nunito,sans-serif',fontSize:16,fontWeight:900,color:'#1a1a2e',lineHeight:1 }}>{sorted.length}</div>
                  <div style={{ fontFamily:'Nunito,sans-serif',fontSize:11,fontWeight:600,color:'#9090a8',lineHeight:1,marginTop:2 }}>Job{sorted.length!==1?'s':''}</div>
                </div>
              </div>

              <div style={{ flex:1,minWidth:220,display:'flex',alignItems:'center',gap:9,padding:'9px 14px',background:'#f4f4fb',borderRadius:10,border:'1.5px solid #ececf8' }}>
                <Search size={14} color="#9090a8" style={{ flexShrink:0 }}/>
                <input
                  style={{ flex:1,border:'none',background:'transparent',outline:'none',fontFamily:'Nunito,sans-serif',fontSize:13,fontWeight:600,color:'#1a1a2e' }}
                  placeholder="Search by customer, job type, status, ID…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                {search && <X size={13} style={{ cursor:'pointer',color:'#9090a8',flexShrink:0 }} onClick={() => setSearch('')}/>}
              </div>

              <button onClick={refreshJobs}
                style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid #e8e8f4',background:'#fff',color:'#5a5a78',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontSize:12.5,fontWeight:700,flexShrink:0 }}>
                <RefreshCw size={13}/> Refresh
              </button>

              <button onClick={handleStartNew}
                style={{ display:'flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:9,border:'none',background:'#049edf',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontSize:13,fontWeight:800,flexShrink:0,boxShadow:'0 2px 8px rgba(4,158,223,0.25)' }}>
                <Plus size={14}/> New Job
              </button>
            </div>

            {/* Table */}
            <table className="pg-table">
              <thead>
                <tr>
                  {[
                    { key:'jobRequestID',         label:'Job ID',       w:'8%'  },
                    { key:'customerID',            label:'Customer',     w:'18%' },
                    { key:'jobType',               label:'Type',         w:'10%' },
                    { key:'_supervisor',           label:'Supervisor',   w:'14%', noSort:true },
                    { key:'targetCompletionDate',  label:'Target Date',  w:'11%' },
                    { key:'totalAreaSQFT',         label:'Area (sq.ft)', w:'9%'  },
                    { key:'_tasks',                label:'Tasks',        w:'9%',  noSort:true },
                    { key:'jobStatus',             label:'Status',       w:'11%' },
                    { key:'_action',               label:'Actions',      w:'10%', noSort:true },
                  ].map(col => (
                    <th key={col.key} style={{ width:col.w }}
                      className={['pg-th', col.noSort?'':'pg-th--sort'].filter(Boolean).join(' ')}
                      onClick={() => !col.noSort && handleSort(col.key)}>
                      <div className="pg-th__inner">
                        {col.label}
                        {!col.noSort
                          ? <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir}/>
                          : <Filter size={10} color="#d0d0e4" style={{ marginLeft:5 }}/>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="pg-td pg-empty" style={{ maxWidth:'none' }}>
                      <div className="pg-empty__inner">
                        <Briefcase size={36} color="#d0d0e8"/>
                        <span className="pg-empty__label">No job requests found</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(job => {
                  const myTasks      = getMyTasks(job.jobRequestID);
                  const submittedCnt = myTasks.filter(t => t.status === 'Submitted').length;
                  const jts = jobTypeBadgeStyle(job.jobType);
                  return (
                    <tr key={job.jobRequestID} className="pg-tr">
                      <td className="pg-td">
                        <span style={{ fontFamily:'Nunito,sans-serif',fontSize:12.5,fontWeight:800,color:'#049edf' }}>
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
                          <span style={{ fontFamily:'Nunito,sans-serif',fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:5,background:jts.bg,color:jts.color,border:`1px solid ${jts.border}`,whiteSpace:'nowrap' }}>
                            {job.jobType}
                          </span>
                        ) : <span style={{ color:'#c0c0d8' }}>—</span>}
                      </td>
                      <td className="pg-td pg-td--overflow">
                        <span className="pg-td__ellipsis" style={{ color:'#4a5568' }}>
                          {supName(job.supervisorID)}
                        </span>
                      </td>
                      <td className="pg-td">
                        <span style={{ fontFamily:'Nunito,sans-serif',fontSize:12.5,fontWeight:600,color:'#4a5568' }}>
                          {fmtDate(job.targetCompletionDate)}
                        </span>
                      </td>
                      <td className="pg-td" style={{ textAlign:'center' }}>
                        <span style={{ fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:13,color:'#1a1a2e' }}>
                          {job.totalAreaSQFT ? Number(job.totalAreaSQFT).toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="pg-td" style={{ textAlign:'center' }}>
                        {myTasks.length > 0 ? (
                          <div style={{ fontFamily:'Nunito,sans-serif',fontSize:12,fontWeight:700 }}>
                            <span style={{ color: submittedCnt===myTasks.length ? '#16a34a' : '#4a5568' }}>
                              {submittedCnt}
                            </span>
                            <span style={{ color:'#b0b0c8' }}>/{myTasks.length}</span>
                            <div style={{ fontSize:10,color:'#9090a8',marginTop:1 }}>submitted</div>
                          </div>
                        ) : (
                          <span style={{ color:'#c0c0d8',fontSize:12 }}>—</span>
                        )}
                      </td>
                      <td className="pg-td">
                        <JobStatusBadge status={job.jobStatus}/>
                      </td>
                      <td className="pg-td">
                        <div style={{ display:'flex',gap:7,alignItems:'center' }}>
                          <button onClick={() => handleEdit(job)} title="Edit job"
                            style={{ display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:8,border:'1.5px solid #049edf',color:'#049edf',background:'rgba(4,158,223,0.06)',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontSize:12,fontWeight:800,whiteSpace:'nowrap' }}>
                            <Edit2 size={12}/> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {sorted.length > pageSize && (
              <div className="pg-pagination">
                <div className="pg-pagination__left">
                  <button className="pg-pg-btn" disabled={page===1} onClick={()=>setPage(1)}><ChevronsLeft size={13}/></button>
                  <button className="pg-pg-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={13}/></button>
                  {pageNums.map((p,i) => p==='…'
                    ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span>
                    : <button key={p} className={`pg-pg-btn${page===p?' pg-pg-btn--active':''}`} onClick={()=>setPage(p)}>{p}</button>
                  )}
                  <button className="pg-pg-btn" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}><ChevronRight size={13}/></button>
                  <button className="pg-pg-btn" disabled={page===totalPages} onClick={()=>setPage(totalPages)}><ChevronsRight size={13}/></button>
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

      {/* Hoarding selector modal */}
      {showHoardModal && (
        <HoardingSelectModal
          hoardings={hoardings}
          filteredHoardingIds={filteredHoardingIds}
          existingIds={existingTaskHoardingIds}
          onAdd={handleAddHoardings}
          onClose={() => setShowHoardModal(false)}
        />
      )}
    </>
  );
}