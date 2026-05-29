import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  HardHat, Plus, Home, Globe,
  Building2, Search, RefreshCw,
  X, AlertCircle, Check, Edit2,
  ChevronDown, ChevronUp,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Filter, MapPin, Phone, Mail, UserCircle, Loader2, Briefcase,
} from 'lucide-react';
import './Common1.css';
import { apiService } from '../api/api';
import { useResizableColumns } from '../hooks/useResizableColumns';

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const GUJARAT_DISTRICTS = [
  'Ahmedabad','Amreli','Anand','Aravalli','Banaskantha',
  'Bharuch','Bhavnagar','Botad','Chhota Udaipur','Dahod',
  'Dang','Devbhoomi Dwarka','Gandhinagar','Gir Somnath',
  'Jamnagar','Junagadh','Kheda','Kutch','Mahisagar',
  'Mehsana','Morbi','Narmada','Navsari','Panchmahal',
  'Patan','Porbandar','Rajkot','Sabarkantha','Surat',
  'Surendranagar','Tapi','Vadodara','Valsad',
];

const EMPTY_FORM = {
  firstName: '', lastName: '',
  phone1: '', phone2: '',
  email: '',
  addressLine1: '', addressLine2: '', addressLine3: '',
  city: '', district: '', country: 'India',
  role: 'Worker',   // fixed / read-only
};

const PAGE_SIZE_OPTIONS = [10, 12, 15, 20];

/* ─────────────────────────────────────────
   VALIDATION
───────────────────────────────────────── */
const NAME_REGEX    = /^[a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s.\-]{0,49}$/;
const ADDRESS_REGEX = /^[\w\s,.\-/'&#()]{1,200}$/;
const PHONE_REGEX   = /^[0-9+\-\s()]{7,20}$/;
const EMAIL_REGEX   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CITY_REGEX    = /^[a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s.\-]{0,99}$/;

function validateField(key, value) {
  const v = (value || '').trim();
  switch (key) {
    case 'firstName':
    case 'lastName':
      if (!v) return 'This field is required';
      if (!NAME_REGEX.test(v)) return 'Only letters, spaces, hyphens and dots are allowed';
      return '';
    case 'email':
      if (!v) return 'Email is required';
      if (!EMAIL_REGEX.test(v)) return 'Enter a valid email address';
      return '';
    case 'phone1':
      if (!v) return 'Primary phone is required';
      if (!PHONE_REGEX.test(v)) return 'Enter a valid phone number';
      return '';
    case 'phone2':
      if (v && !PHONE_REGEX.test(v)) return 'Enter a valid phone number';
      return '';
    case 'addressLine1':
      if (!v) return 'Address Line 1 is required';
      if (!ADDRESS_REGEX.test(v)) return "Only letters, digits, spaces and , . - / ' & # ( ) are allowed";
      return '';
    case 'addressLine2':
    case 'addressLine3':
      if (v && !ADDRESS_REGEX.test(v)) return "Only letters, digits, spaces and , . - / ' & # ( ) are allowed";
      return '';
    case 'city':
      if (!v) return 'City is required';
      if (!CITY_REGEX.test(v)) return 'Only letters, spaces, hyphens and dots are allowed';
      return '';
    case 'district':
      if (!v) return 'Please select a district';
      return '';
    default:
      return '';
  }
}

const REQUIRED_FIELDS = ['firstName','lastName','email','phone1','addressLine1','city','district'];

/* ─────────────────────────────────────────
   PORTAL DROPDOWN
───────────────────────────────────────── */
function PortalDropdown({ open, triggerRef, panelRef, children }) {
  const [style, setStyle] = useState({ position: 'fixed', top: 0, left: 0, width: 0, zIndex: 99999 });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const panelH = panelRef.current?.offsetHeight || 260;
      const flipUp = (window.innerHeight - r.bottom) < panelH + 8 && r.top > panelH + 8;
      setStyle({ position: 'fixed', top: flipUp ? r.top - panelH - 4 : r.bottom + 4, left: r.left, width: r.width, zIndex: 99999 });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open, triggerRef, panelRef]);

  if (!open) return null;
  return ReactDOM.createPortal(<div ref={panelRef} style={style}>{children}</div>, document.body);
}

function useOutsideClick(wrapRef, panelRef, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!(wrapRef.current?.contains(e.target)) && !(panelRef.current?.contains(e.target))) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, wrapRef, panelRef, onClose]);
}

/* ─────────────────────────────────────────
   DISTRICT COMBO
───────────────────────────────────────── */
function DistrictCombo({ value, onChange, onBlur, hasError }) {
  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState('');
  const [wasOpened, setWasOpened] = useState(false);
  const wrapRef    = useRef(null); const triggerRef = useRef(null);
  const panelRef   = useRef(null); const inputRef   = useRef(null); const listRef = useRef(null);

  const close  = useCallback(() => { setOpen(false); setQuery(''); if (wasOpened) { onBlur?.(); setWasOpened(false); } }, [wasOpened, onBlur]);
  useOutsideClick(wrapRef, panelRef, open, close);

  const filtered = GUJARAT_DISTRICTS.filter(d => d.toLowerCase().includes(query.toLowerCase()));
  const openDD   = () => { setOpen(true); setWasOpened(true); setQuery(''); setTimeout(() => inputRef.current?.focus(), 0); };
  const select   = (d) => { onChange(d); setOpen(false); setQuery(''); setWasOpened(false); };
  const clear    = (e) => { e.stopPropagation(); onChange(''); setOpen(false); setQuery(''); setWasOpened(false); onBlur?.(); };
  const nav      = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx   = Array.from(items || []).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') close();
  };

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        ref={triggerRef}
        className={`pg-field-wrap pg-combo-trigger ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        onClick={openDD} tabIndex={0}
        onKeyDown={e => { if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDD(); } } else nav(e); }}
      >
        <MapPin size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
        <span className={`pg-combo-display${!value ? ' pg-combo-display--placeholder' : ''}`}>{value || 'Select district…'}</span>
        {value ? <X size={13} className="pg-combo-clear" onClick={clear} /> : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position: 'static' }}>
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input ref={inputRef} className="pg-combo-search__input" placeholder="Search district…" value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); listRef.current?.querySelectorAll('.pg-combo-option')?.[0]?.focus(); } else if (e.key === 'Escape') close(); }} />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
          </div>
          <div className="pg-combo-list" ref={listRef}>
            {filtered.length === 0
              ? <div className="pg-combo-empty">No districts match</div>
              : filtered.map(d => (
                <div key={d}
                  className={`pg-combo-option${d === value ? ' pg-combo-option--active' : ''}`}
                  onClick={() => select(d)} tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(d); } else nav(e); }}
                >
                  <span className="pg-combo-option__name">{d}</span>
                  {d === value && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                </div>
              ))}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ─────────────────────────────────────────
   SORT ICON
───────────────────────────────────────── */
function SortIcon({ col, sortKey, sortDir }) {
  const active = sortKey === col;
  return (
    <span className="pg-sort-icon">
      <ChevronUp   size={10} color={active && sortDir === 'asc'  ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__up" />
      <ChevronDown size={10} color={active && sortDir === 'desc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__down" />
    </span>
  );
}

/* ═══════════════════════════════════════════
   WORKER MODAL
═══════════════════════════════════════════ */
function WorkerModal({ onClose, onSaved, editData }) {
  const isEdit = !!editData;

  const [form, setForm]             = useState(isEdit ? { ...editData } : { ...EMPTY_FORM });
  const [errors, setErrors]         = useState({});
  const [touched, setTouched]       = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [apiError, setApiError]     = useState('');

  const applyChange = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (touched[key]) setErrors(p => ({ ...p, [key]: validateField(key, val) }));
  };

  const handleBlur = (key) => {
    setTouched(p => ({ ...p, [key]: true }));
    setErrors(p => ({ ...p, [key]: validateField(key, form[key]) }));
  };

  const runValidate = (f) => {
    const e = {};
    REQUIRED_FIELDS.forEach(k => { const err = validateField(k, f[k]); if (err) e[k] = err; });
    // optional fields with format rules
    ['phone2', 'addressLine2', 'addressLine3'].forEach(k => { const err = validateField(k, f[k]); if (err) e[k] = err; });
    return e;
  };

  const handleSubmit = async () => {
    const allTouched = {};
    [...REQUIRED_FIELDS, 'phone2', 'addressLine2', 'addressLine3'].forEach(k => { allTouched[k] = true; });
    setTouched(allTouched);
    const e = runValidate(form);
    if (Object.keys(e).length) { setErrors(e); return; }

    setSubmitting(true); setApiError('');
    try {
      if (isEdit) {
        await apiService.updateUser(editData.id, form);
      } else {
        await apiService.registerUser(form);
      }
      setSuccess(true);
      await new Promise(r => setTimeout(r, 600));
      onSaved();
      onClose();
    } catch (err) {
      setApiError(
        err?.response?.data?.message ||
        err?.response?.data?.title   ||
        err?.message                 ||
        'Something went wrong.'
      );
    } finally { setSubmitting(false); }
  };

  /* ── Field definitions ── */
  const TEXT_FIELDS = [
    { key: 'firstName',    label: 'First Name',     icon: UserCircle, placeholder: 'e.g. Ramesh',                col: 6,  required: true  },
    { key: 'lastName',     label: 'Last Name',      icon: UserCircle, placeholder: 'e.g. Patel',                 col: 6,  required: true  },
    { key: 'email',        label: 'Email Address',  icon: Mail,       placeholder: 'e.g. ramesh@example.com',    col: 12, required: true  },
    { key: 'phone1',       label: 'Phone 1',        icon: Phone,      placeholder: 'e.g. +91 98765 43210',       col: 6,  required: true  },
    { key: 'phone2',       label: 'Phone 2',        icon: Phone,      placeholder: 'e.g. +91 91234 56789',       col: 6,  required: false },
    { key: 'addressLine1', label: 'Address Line 1', icon: Home,       placeholder: 'e.g. 14, Navrangpura',       col: 12, required: true  },
    { key: 'addressLine2', label: 'Address Line 2', icon: Home,       placeholder: 'e.g. Near Gujarat College',  col: 6,  required: false },
    { key: 'addressLine3', label: 'Address Line 3', icon: Home,       placeholder: 'e.g. Opp. Fire Station',     col: 6,  required: false },
    { key: 'city',         label: 'City',           icon: Building2,  placeholder: 'e.g. Ahmedabad',             col: 6,  required: true  },
  ];

  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal">

        {/* Header */}
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><HardHat size={20} color="#049edf" /></div>
            <div>
              <h5 className="pg-modal__title">{isEdit ? 'Edit Worker' : 'Register New Worker'}</h5>
              <p className="pg-modal__subtitle">
                {isEdit
                  ? `Editing: ${editData.firstName} ${editData.lastName}`
                  : 'Fill in the worker details below'}
              </p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* API error */}
        {apiError && (
          <div style={{ margin: '0 24px 4px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11, color: '#dc2626', fontSize: 12.5, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /><span>{apiError}</span>
          </div>
        )}

        {/* Body */}
        <div className="pg-modal__body">
          <div className="row g-3">

            {TEXT_FIELDS.map(({ key, label, icon: Icon, placeholder, col, required }) => {
              const hasErr = !!errors[key];
              return (
                <div key={key} className={`col-12 col-sm-${col}`}>
                  <label className="pg-field-label">
                    {label}&nbsp;
                    {required
                      ? <span className="pg-field-label__required">*</span>
                      : <span className="pg-field-label__optional">(optional)</span>}
                  </label>
                  <div className={`pg-field-wrap ${hasErr ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                    <Icon size={14} color={hasErr ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                    <input
                      placeholder={placeholder}
                      value={form[key]}
                      className="pg-field-input"
                      onChange={e => applyChange(key, e.target.value)}
                      onBlur={() => handleBlur(key)}
                      type={key === 'email' ? 'email' : 'text'}
                    />
                  </div>
                  {hasErr && (
                    <div className="pg-field-error">
                      <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} /><span>{errors[key]}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* District combo */}
            <div className="col-12 col-sm-6">
              <label className="pg-field-label">District <span className="pg-field-label__required">*</span></label>
              <DistrictCombo
                value={form.district}
                onChange={v => applyChange('district', v)}
                onBlur={() => handleBlur('district')}
                hasError={!!errors.district}
              />
              {errors.district && (
                <div className="pg-field-error">
                  <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} /><span>{errors.district}</span>
                </div>
              )}
            </div>

            {/* Country — read-only */}
            <div className="col-12 col-sm-6">
              <label className="pg-field-label">Country <span className="pg-field-label__fixed">🔒 Fixed</span></label>
              <div className="pg-field-wrap pg-field-wrap--readonly">
                <Globe size={14} color="#049edf" style={{ flexShrink: 0 }} />
                <input readOnly value={form.country} className="pg-field-input pg-field-input--readonly" />
              </div>
            </div>

            {/* Role — read-only */}
            <div className="col-12 col-sm-6">
              <label className="pg-field-label">Role <span className="pg-field-label__fixed">🔒 Fixed</span></label>
              <div className="pg-field-wrap pg-field-wrap--readonly">
                <Briefcase size={14} color="#049edf" style={{ flexShrink: 0 }} />
                <input readOnly value="Worker" className="pg-field-input pg-field-input--readonly" />
              </div>
            </div>

          </div>

          <p className="pg-form__note">
            <span className="pg-field-label__required">*</span> Required fields &nbsp;·&nbsp; Optional fields may be left blank
          </p>
        </div>

        {/* Footer */}
        <div className="pg-modal__foot">
          <button className="pg-btn-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="pg-btn-save" onClick={handleSubmit} disabled={submitting}>
            {success
              ? <><Check size={14} /> {isEdit ? 'Saved!' : 'Registered!'}</>
              : submitting
                ? <><RefreshCw size={13} className="pg-spin" /> Saving…</>
                : <><Plus size={14} /> {isEdit ? 'Save Changes' : 'Register Worker'}</>
            }
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────
   NORMALIZE HELPER
───────────────────────────────────────── */
function normalizeWorker(raw) {
  return {
    id:          raw.id          ?? raw.Id          ?? 0,
    firstName:   raw.first_Name  ?? raw.firstName   ?? raw.First_Name   ?? '',
    lastName:    raw.last_Name   ?? raw.lastName    ?? raw.Last_Name    ?? '',
    email:       raw.email       ?? raw.Email       ?? '',
    phone1:      raw.phone_1     ?? raw.phone1      ?? raw.Phone_1      ?? '',
    phone2:      raw.phone_2     ?? raw.phone2      ?? raw.Phone_2      ?? '',
    addressLine1:raw.address_Line_1 ?? raw.addressLine1 ?? '',
    addressLine2:raw.address_Line_2 ?? raw.addressLine2 ?? '',
    addressLine3:raw.address_Line_3 ?? raw.addressLine3 ?? '',
    city:        raw.city        ?? raw.City        ?? '',
    district:    raw.district    ?? raw.District    ?? '',
    country:     raw.country     ?? raw.Country     ?? 'India',
    role:        raw.role        ?? raw.Role        ?? '',
  };
}

/* ─── Mobile Worker Card ─── */
function WorkerCard({ w, onEdit }) {
  return (
    <div className="pg-card">
      <div className="pg-card__header">
        <div className="pg-card__title-wrap">
          <div className="pg-card__title">{w.firstName} {w.lastName}</div>
          {w.email && <div className="pg-card__subtitle">{w.email}</div>}
        </div>
        <div className="pg-card__actions">
          <button className="pg-card__btn-edit" onClick={() => onEdit(w)}><Edit2 size={13} /></button>
        </div>
      </div>
      <div className="pg-card__body">
        {w.phone1 && <div className="pg-card__row"><Phone size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="pg-card__row-text">{w.phone1}</span></div>}
        {w.city   && <div className="pg-card__row"><Building2 size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="pg-card__row-text">{w.city}{w.district ? `, ${w.district}` : ''}</span></div>}
        {w.addressLine1 && <div className="pg-card__row"><Home size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="pg-card__row-text--ellipsis">{w.addressLine1}</span></div>}
        <div className="pg-card__row"><Briefcase size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="pg-sitetype-pill" style={{ color: 'rgb(74,85,104)' }}>Worker</span></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   WORKERS PAGE
═══════════════════════════════════════════ */
export default function WorkersPage() {
  const [workers, setWorkers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editWorker, setEditWorker] = useState(null);
  const [search, setSearch]         = useState('');
  const [sortKey, setSortKey]       = useState('firstName');
  const [sortDir, setSortDir]       = useState('asc');
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(12);

  const tableRef   = useRef(null);
  const [tableReady, setTableReady] = useState(false);
  useEffect(() => { if (!loading) setTableReady(true); }, [loading]);
  useResizableColumns(tableRef, tableReady, [140, 140, 180, 130, 110, 130, 100, 80]);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await apiService.getAllUsers();
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      // Only show workers (role === 'Worker' or 'worker')
      const workers = list
        .filter(u => (u.role ?? u.Role ?? '').toLowerCase() === 'worker')
        .map(normalizeWorker);
      setWorkers(workers);
    } catch (err) {
      setFetchError(err?.response?.data?.message || err?.message || 'Failed to load workers.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = workers.filter(w => {
    const q = search.toLowerCase();
    return (
      (w.firstName   || '').toLowerCase().includes(q) ||
      (w.lastName    || '').toLowerCase().includes(q) ||
      (w.email       || '').toLowerCase().includes(q) ||
      (w.phone1      || '').toLowerCase().includes(q) ||
      (w.city        || '').toLowerCase().includes(q) ||
      (w.district    || '').toLowerCase().includes(q) ||
      (w.addressLine1|| '').toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = (a[sortKey] || '').toString().toLowerCase();
    const bv = (b[sortKey] || '').toString().toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);
  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleSaved = useCallback(() => { fetchData(); }, [fetchData]);

  const COLS = [
    { key: 'firstName',    label: 'First Name',  w: '14%' },
    { key: 'lastName',     label: 'Last Name',   w: '14%' },
    { key: 'email',        label: 'Email',       w: '18%' },
    { key: 'phone1',       label: 'Phone 1',     w: '12%', tabletHide: true },
    { key: 'phone2',       label: 'Phone 2',     w: '11%', tabletHide: true },
    { key: 'city',         label: 'City / District', w: '13%' },
    { key: 'addressLine1', label: 'Address',     w: '10%', tabletHide: true },
    { key: '_action',      label: 'Action',      w: '8%',  noSort: true },
  ];

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => { if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…'); acc.push(p); return acc; }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
      <Loader2 size={32} color="#049edf" className="pg-spin" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>Loading workers…</span>
    </div>
  );

  if (fetchError) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
      <AlertCircle size={28} color="#ef4444" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#ef4444', fontSize: 14 }}>{fetchError}</span>
      <button className="pg-btn-add" onClick={fetchData}><RefreshCw size={13} /> Retry</button>
    </div>
  );

  return (
    <>
      <div className="pg-page">
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">Workers</h1>
            <p className="pg-header__subtitle">Register and manage all field <strong>workers</strong> in one place.</p>
          </div>
          <button className="pg-btn-add" onClick={() => { setEditWorker(null); setShowModal(true); }}>
            <Plus size={14} /> Register Worker
          </button>
        </div>

        <div className="pg-container">
          <div className="pg-toolbar">
            <div className="pg-toolbar__inner">
              <div className="pg-toolbar__count">
                <HardHat size={14} color="#9090a8" />
                <span><strong>{filtered.length}</strong> worker{filtered.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="pg-search-box">
                <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
                <input
                  placeholder="Search by name, email, phone, city, district…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
              </div>
              <button className="pg-pg-btn" onClick={fetchData} title="Refresh" style={{ marginLeft: 'auto' }}><RefreshCw size={13} /></button>
            </div>
          </div>

          {/* Desktop table */}
          <div className="pg-desktop-table">
            <table className="pg-table" ref={tableRef}>
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      style={{ width: col.w }}
                      className={['pg-th', col.noSort ? '' : 'pg-th--sort', col.tabletHide ? 'pg-tablet-hide' : ''].filter(Boolean).join(' ')}
                      onClick={() => !col.noSort && handleSort(col.key)}
                    >
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
                    <td colSpan={COLS.length} className="pg-td pg-empty" style={{ maxWidth: 'none' }}>
                      <div className="pg-empty__inner"><HardHat size={36} color="#d0d0e8" /><span className="pg-empty__label">No workers found</span></div>
                    </td>
                  </tr>
                ) : paginated.map(w => (
                  <tr key={w.id} className="pg-tr">
                    <td className="pg-td"><div className="pg-td__primary">{w.firstName}</div></td>
                    <td className="pg-td"><div className="pg-td__primary">{w.lastName}</div></td>
                    <td className="pg-td pg-td--overflow">
                      <span className="pg-td__ellipsis" title={w.email}>{w.email || '—'}</span>
                    </td>
                    <td className="pg-td pg-tablet-hide">{w.phone1 || <span className="pg-td__dash">—</span>}</td>
                    <td className="pg-td pg-tablet-hide">{w.phone2 || <span className="pg-td__dash">—</span>}</td>
                    <td className="pg-td">
                      <span style={{ color: '#4a5568' }}>{w.city}</span>
                      {w.district && w.district !== w.city && <span className="pg-td__secondary">, {w.district}</span>}
                    </td>
                    <td className="pg-td pg-td--overflow pg-tablet-hide">
                      <span className="pg-td__ellipsis" title={w.addressLine1}>{w.addressLine1 || '—'}</span>
                    </td>
                    <td className="pg-td">
                      <div className="pg-action-wrap">
                        <button className="pg-btn-view" onClick={() => { setEditWorker(w); setShowModal(true); }} title="Edit">
                          <Edit2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="pg-mobile-cards">
            {paginated.length === 0
              ? <div className="pg-empty__inner" style={{ padding: '40px 20px' }}><HardHat size={36} color="#d0d0e8" /><span className="pg-empty__label">No workers found</span></div>
              : paginated.map(w => <WorkerCard key={w.id} w={w} onEdit={w => { setEditWorker(w); setShowModal(true); }} />)
            }
          </div>

          {/* Pagination */}
          <div className="pg-pagination">
            <div className="pg-pagination__left">
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
              {pageNums.map((p, i) =>
                p === '…'
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
        </div>
      </div>

      {showModal && (
        <WorkerModal
          onClose={() => { setShowModal(false); setEditWorker(null); }}
          onSaved={handleSaved}
          editData={editWorker}
        />
      )}
    </>
  );
}