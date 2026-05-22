import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  UserCircle, Plus, Phone, Home, Globe,
  Building2, MapPin, Search, Users, RefreshCw,
  X, AlertCircle, Check, Edit2, Eye, ChevronDown, ChevronUp,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Filter, Mail, Loader2, CheckCircle2,
} from 'lucide-react';
import './Common1.css';
import { apiService } from '../api/api';
import { useResizableColumns } from '../hooks/useResizableColumns';

/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */
const ROLE_OPTIONS      = ['Admin', 'Supervisor', 'Worker'];
const PAGE_SIZE_OPTIONS = [10, 12, 15, 20];

const ROLE_COLORS = {
  'Admin':      { color: '#dc2626', bg: 'rgba(220,38,38,0.09)',  border: 'rgba(220,38,38,0.22)'  },
  'Supervisor': { color: '#049edf', bg: 'rgba(4,158,223,0.09)',  border: 'rgba(4,158,223,0.22)'  },
  'Worker':     { color: '#16a34a', bg: 'rgba(22,163,74,0.09)',  border: 'rgba(22,163,74,0.22)'  },
};

const EMPTY_FORM = {
  firstName: '', lastName: '', phone1: '', phone2: '',
  email: '', addressLine1: '', addressLine2: '', addressLine3: '',
  city: '', district: '', country: 'India', role: '',
};

const FIELDS = [
  { key: 'firstName',    label: 'First Name',     placeholder: 'e.g. Ramesh',             required: true,  type: 'text',     col: 6  },
  { key: 'lastName',     label: 'Last Name',      placeholder: 'e.g. Patel',              required: true,  type: 'text',     col: 6  },
  { key: 'phone1',       label: 'Phone 1',        placeholder: 'e.g. 9876543210',         required: true,  type: 'tel',      col: 6  },
  { key: 'phone2',       label: 'Phone 2',        placeholder: 'e.g. 9876543211',         required: false, type: 'tel',      col: 6  },
  { key: 'email',        label: 'Email',          placeholder: 'e.g. ramesh@example.com', required: true,  type: 'email',    col: 12 },
  { key: 'addressLine1', label: 'Address Line 1', placeholder: 'Street / Building name',  required: true,  type: 'address',  col: 12 },
  { key: 'addressLine2', label: 'Address Line 2', placeholder: 'Area / Locality',         required: false, type: 'address',  col: 12 },
  { key: 'addressLine3', label: 'Address Line 3', placeholder: 'Landmark',                required: false, type: 'address',  col: 12 },
  { key: 'city',         label: 'City',           placeholder: 'e.g. Ahmedabad',          required: true,  type: 'text',     col: 6  },
  { key: 'district',     label: 'District',       placeholder: 'e.g. Ahmedabad',          required: true,  type: 'text',     col: 6  },
  { key: 'country',      label: 'Country',        placeholder: 'India',                   required: true,  type: 'readonly', col: 6  },
  { key: 'role',         label: 'Role',           placeholder: 'Select role…',            required: true,  type: 'select',   col: 6, options: ROLE_OPTIONS },
];

/* ═══════════════════════════════════════════
   VALIDATION
═══════════════════════════════════════════ */
const ADDRESS_REGEX = /^[\w\s,.\-/'&#()]{1,200}$/;
const TEXT_REGEX    = /^[a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s.\-]{0,99}$/;
const EMAIL_REGEX   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX   = /^\d{10}$/;

function validateField(key, value, type, required) {
  const v = (value || '').trim();
  if (required && !v) return 'This field is required';
  if (!v) return '';
  if (type === 'select' || type === 'readonly') return '';
  if (type === 'address' && !ADDRESS_REGEX.test(v)) return "Only letters, digits, spaces and , . - / ' & # ( ) are allowed";
  if (type === 'text'    && !TEXT_REGEX.test(v))    return 'Only letters, spaces, hyphens and dots are allowed';
  if (type === 'email'   && !EMAIL_REGEX.test(v))   return 'Enter a valid email address';
  if (type === 'tel'     && !PHONE_REGEX.test(v))   return 'Enter a valid 10-digit phone number';
  return '';
}

function runValidate(form) {
  const errs = {};
  FIELDS.forEach(({ key, required, type }) => {
    const e = validateField(key, form[key], type, required);
    if (e) errs[key] = e;
  });
  return errs;
}

/* ═══════════════════════════════════════════
   NORMALISE USER
═══════════════════════════════════════════ */
function normalizeUser(raw) {
  // Exhaustive ID lookup — covers every casing the .NET backend might return
  const id =
    raw.id        ?? raw.Id        ??   // ← API returns lowercase "id"
    raw.ID        ??
    raw.userID    ?? raw.UserID    ??
    raw.userId    ?? raw.UserId    ??
    raw.user_Id   ?? raw.user_ID   ??
    raw.user_id   ?? raw.User_Id   ?? null;

  // Last-resort: scan all keys for the first one that contains "id" and is numeric
  const resolvedId = id !== null ? id : (() => {
    const entry = Object.entries(raw).find(([k, v]) =>
      /^(user)?id$/i.test(k) &&
      (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v)))
    );
    if (entry) {
      console.warn(`normalizeUser: resolved ID from fallback field "${entry[0]}" = ${entry[1]}`);
      return entry[1];
    }
    console.error('normalizeUser: no ID found in', raw);
    return null;
  })();

  return {
    _id:          resolvedId,
    firstName:    raw.firstName ?? raw.FirstName ?? raw.first_Name              ?? '',
    lastName:     raw.lastName  ?? raw.LastName  ?? raw.last_Name               ?? '',
    phone1:       raw.phone1    ?? raw.Phone1    ?? raw.phone_1                 ?? '',
    phone2:       raw.phone2    ?? raw.Phone2    ?? raw.phone_2                 ?? '',
    email:        raw.email     ?? raw.Email                                    ?? '',
    addressLine1: raw.addressLine1 ?? raw.AddressLine1 ?? raw.address_Line_1   ?? '',
    addressLine2: raw.addressLine2 ?? raw.AddressLine2 ?? raw.address_Line_2   ?? '',
    addressLine3: raw.addressLine3 ?? raw.AddressLine3 ?? raw.address_Line_3   ?? '',
    city:         raw.city      ?? raw.City                                     ?? '',
    district:     raw.district  ?? raw.District                                 ?? '',
    country:      raw.country   ?? raw.Country                                  ?? 'India',
    role:         raw.role      ?? raw.Role      ?? raw.roleName                ?? '',
  };
}

const fullName = (u) => [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';

/* ═══════════════════════════════════════════
   SORT ICON
═══════════════════════════════════════════ */
function SortIcon({ col, sortKey, sortDir }) {
  const active = sortKey === col;
  return (
    <span className="pg-sort-icon">
      <ChevronUp   size={10} color={active && sortDir === 'asc'  ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__up"  />
      <ChevronDown size={10} color={active && sortDir === 'desc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__down"/>
    </span>
  );
}

/* ═══════════════════════════════════════════
   ROLE BADGE  — reuses pg-sitetype-pill class
═══════════════════════════════════════════ */
function RoleBadge({ role }) {
  const c = ROLE_COLORS[role];
  if (!c) return <span className="pg-td__dash">—</span>;
  return <span className="pg-sitetype-pill" style={{ color: c.color }}>{role}</span>;
}

/* ═══════════════════════════════════════════
   VIEW MODAL
═══════════════════════════════════════════ */
function ViewModal({ user, onClose, onEdit }) {
  if (!user) return null;

  const InfoRow = ({ icon: Icon, label, value, highlight }) =>
    value ? (
      <div className="pg-info-row">
        <div className={`pg-info-row__icon${highlight ? ' pg-info-row__icon--highlight' : ''}`}>
          <Icon size={14} color={highlight ? '#049edf' : '#a0a0c0'} />
        </div>
        <div className="pg-info-row__content">
          <div className="pg-info-row__label">{label}</div>
          <div className={`pg-info-row__value${highlight ? ' pg-info-row__value--highlight' : ''}`}>{value}</div>
        </div>
      </div>
    ) : null;

  return ReactDOM.createPortal(
    <div className="pg-overlay pg-overlay--view" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal pg-modal--view">
        <div className="pg-view__banner">
          <button className="pg-view__close" onClick={onClose}><X size={15} /></button>
          <div className="pg-view__banner-content">
            <div className="pg-view__avatar"><UserCircle size={30} color="#fff" /></div>
            <div>
              <h4 className="pg-view__name">{fullName(user)}</h4>
              {user.role && (
                <div className="pg-view__pill pg-view__pill--type" style={{ marginTop: 8 }}>
                  <span className="pg-view__pill-text pg-view__pill-text--type">{user.role}</span>
                </div>
              )}
            </div>
          </div>
          <div className="pg-view__pill">
            <MapPin size={11} color="rgba(255,255,255,0.85)" />
            <span className="pg-view__pill-text">
              {[user.city, user.district, user.country].filter(Boolean).join(', ')}
            </span>
          </div>
        </div>

        <div className="pg-view__body">
          <div className="pg-view__section-label">Contact</div>
          <InfoRow icon={Phone} label="Phone 1"       value={user.phone1}  highlight />
          <InfoRow icon={Phone} label="Phone 2"       value={user.phone2} />
          <InfoRow icon={Mail}  label="Email Address" value={user.email}   highlight />
          <div className="pg-view__section-label pg-view__section-label--mt">Address</div>
          <InfoRow icon={Home}      label="Address Line 1" value={user.addressLine1} />
          <InfoRow icon={Home}      label="Address Line 2" value={user.addressLine2} />
          <InfoRow icon={Home}      label="Address Line 3" value={user.addressLine3} />
          <InfoRow icon={Building2} label="City"           value={user.city} />
          <InfoRow icon={MapPin}    label="District"       value={user.district} />
          <InfoRow icon={Globe}     label="Country"        value={user.country} />
        </div>

        <div className="pg-view__foot">
          <button className="pg-btn-cancel" onClick={onClose}>Close</button>
          <button className="pg-view__btn-edit" onClick={() => { onClose(); onEdit(user); }}>
            <Edit2 size={13} /> Edit User
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   ADD / EDIT MODAL
   isEdit = true  → calls updateUser (PUT /Login/update)
   isEdit = false → calls registerUser (POST /Login/register)
═══════════════════════════════════════════ */
function UserModal({ onClose, onSaved, editData }) {
  const isEdit = !!editData;

  const [form,       setForm]       = useState(isEdit ? { ...editData } : { ...EMPTY_FORM });
  const [errors,     setErrors]     = useState({});
  const [touched,    setTouched]    = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [apiError,   setApiError]   = useState('');

  const handleChange = (key, value) => {
    setForm(p => ({ ...p, [key]: value }));
    setApiError('');
    if (touched[key]) {
      const f = FIELDS.find(f => f.key === key);
      setErrors(p => ({ ...p, [key]: validateField(key, value, f.type, f.required) }));
    }
  };

  const handleBlur = (key) => {
    setTouched(p => ({ ...p, [key]: true }));
    const f = FIELDS.find(f => f.key === key);
    setErrors(p => ({ ...p, [key]: validateField(key, form[key], f.type, f.required) }));
  };

  const handleSubmit = async () => {
    const allTouched = {};
    FIELDS.forEach(f => { allTouched[f.key] = true; });
    setTouched(allTouched);
    const errs = runValidate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    if (isEdit && (editData._id === null || editData._id === undefined)) {
      setApiError(
        'User ID is missing — cannot update. ' +
        'Check browser console (F12 → Console) for "normalizeUser: no ID found" to see the raw API response fields.'
      );
      return;
    }

    setSubmitting(true); setApiError('');
    try {
      if (isEdit) {
        await apiService.updateUser(editData._id, form);
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
        `${isEdit ? 'Update' : 'Registration'} failed. Please try again.`
      );
    } finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setForm(isEdit ? { ...editData } : { ...EMPTY_FORM });
    setErrors({});
    setTouched({});
    setApiError('');
    setSuccess(false);
  };

  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal">

        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><UserCircle size={20} color="#049edf" /></div>
            <div>
              <h5 className="pg-modal__title">{isEdit ? 'Edit User' : 'Add Registration'}</h5>
              <p className="pg-modal__subtitle">
                {isEdit ? `Editing: ${fullName(editData)}` : 'Fill in the user details and save.'}
              </p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="pg-modal__body">
          {success && (
            <div style={{ display:'flex',alignItems:'center',gap:9,padding:'12px 14px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,marginBottom:16,fontFamily:'Nunito,sans-serif',fontSize:13,fontWeight:700,color:'#16a34a' }}>
              <CheckCircle2 size={16}/>
              {isEdit ? 'User updated successfully!' : 'User registered successfully!'}
            </div>
          )}
          {apiError && (
            <div style={{ display:'flex',alignItems:'flex-start',gap:9,padding:'12px 14px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,marginBottom:16,fontFamily:'Nunito,sans-serif',fontSize:13,fontWeight:700,color:'#dc2626' }}>
              <AlertCircle size={16} style={{ flexShrink:0, marginTop:1 }}/> {apiError}
            </div>
          )}

          <div className="row g-3">
            {FIELDS.map(({ key, label, placeholder, required, type, col, options }) => {
              const hasErr = !!errors[key];
              const isRO   = type === 'readonly';
              const isSel  = type === 'select';
              const wrapCls = `pg-field-wrap ${isRO ? 'pg-field-wrap--readonly' : hasErr ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`;

              return (
                <div key={key} className={`col-12 col-sm-${col}`}>
                  <label className="pg-field-label">
                    {label}{' '}
                    {isRO
                      ? <span className="pg-field-label__fixed">🔒 Fixed</span>
                      : required
                        ? <span className="pg-field-label__required">*</span>
                        : <span className="pg-field-label__optional">(optional)</span>}
                  </label>

                  {isSel ? (
                    <>
                      <div className={wrapCls}>
                        <select
                          className="pg-field-input"
                          value={form[key]}
                          onChange={e => handleChange(key, e.target.value)}
                          onBlur={() => handleBlur(key)}
                          style={{
                            cursor: 'pointer',
                            appearance: 'none', WebkitAppearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239090a8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            paddingRight: 32,
                            color: form[key] ? '#1a1a2e' : '#b0b0c8',
                          }}
                        >
                          <option value="">{placeholder}</option>
                          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      {hasErr && (
                        <div className="pg-field-error">
                          <AlertCircle size={11} style={{ flexShrink:0, marginTop:1 }}/>
                          <span>{errors[key]}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className={wrapCls}>
                        <input
                          type={type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'text'}
                          placeholder={placeholder}
                          value={form[key]}
                          readOnly={isRO}
                          className={`pg-field-input${isRO ? ' pg-field-input--readonly' : ''}`}
                          onChange={e => !isRO && handleChange(key, e.target.value)}
                          onBlur={() => !isRO && handleBlur(key)}
                        />
                      </div>
                      {hasErr && (
                        <div className="pg-field-error">
                          <AlertCircle size={11} style={{ flexShrink:0, marginTop:1 }}/>
                          <span>{errors[key]}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <p className="pg-form__note">
            <span className="pg-field-label__required">*</span> Required fields &nbsp;·&nbsp; Optional fields may be left blank.
          </p>
        </div>

        <div className="pg-modal__foot">
          <button className="pg-btn-cancel" onClick={resetForm} disabled={submitting}>
            {isEdit ? 'Reset' : 'Reset'}
          </button>
          <button className="pg-btn-save" onClick={handleSubmit} disabled={submitting}>
            {success
              ? <><Check size={14}/> {isEdit ? 'Saved!' : 'Registered!'}</>
              : submitting
                ? <><RefreshCw size={13} className="pg-spin"/> Saving…</>
                : <><Plus size={14}/> {isEdit ? 'Save Changes' : 'Save Registration'}</>}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

/* ─── Mobile User Card ─── */
function UserCard({ u, onView, onEdit }) {
  const rc = ROLE_COLORS[u.role];
  return (
    <div className="pg-card">
      <div className="pg-card__header">
        <div className="pg-card__title-wrap">
          <div className="pg-card__title">{fullName(u)}</div>
          {u.role && rc && (
            <span className="pg-sitetype-pill" style={{ color: rc.color, marginTop: 4, display: 'inline-block' }}>
              {u.role}
            </span>
          )}
        </div>
        <div className="pg-card__actions">
          <button className="pg-card__btn-edit" onClick={() => onEdit(u)} title="Edit"><Edit2 size={13} /></button>
          <button className="pg-card__btn-view" onClick={() => onView(u)} title="View"><Eye size={13} /></button>
        </div>
      </div>
      <div className="pg-card__body">
        <div className="pg-card__grid2">
          <div className="pg-card__grid-cell">
            <Phone size={12} color="#c0c0d8" style={{ flexShrink: 0 }}/>
            <span className="pg-card__grid-text">{u.phone1 || '—'}</span>
          </div>
          {u.phone2 && (
            <div className="pg-card__grid-cell pg-card__grid-cell--muted">
              <Phone size={12} color="#c0c0d8" style={{ flexShrink: 0 }}/>
              <span className="pg-card__grid-text">{u.phone2}</span>
            </div>
          )}
        </div>
        {u.email && (
          <div className="pg-card__row">
            <Mail size={12} color="#c0c0d8" className="pg-card__row-icon"/>
            <span className="pg-card__row-text--ellipsis">{u.email}</span>
          </div>
        )}
        <div className="pg-card__row">
          <Building2 size={12} color="#c0c0d8" className="pg-card__row-icon"/>
          <span className="pg-card__row-text">{[u.city, u.district].filter(Boolean).join(', ') || '—'}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function RegistrationPage() {

  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editUser,  setEditUser]  = useState(null);   // null = Add, object = Edit
  const [viewUser,  setViewUser]  = useState(null);

  const [search,   setSearch]   = useState('');
  const [sortKey,  setSortKey]  = useState('firstName');
  const [sortDir,  setSortDir]  = useState('asc');
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(12);

  /* ── Resizable columns ── */
  const tableRef = useRef(null);
  const [tableReady, setTableReady] = useState(false);
  useEffect(() => { if (!loading) setTableReady(true); }, [loading]);
  useResizableColumns(tableRef, tableReady, [160, 130, 130, 190, 100, 110, 110, 80]);

  /* ── Fetch all users — /Login/get-all ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await apiService.getAllUsers();
      const list =
        Array.isArray(res)          ? res        :
        Array.isArray(res?.data)    ? res.data   :
        Array.isArray(res?.$values) ? res.$values : [];
      setUsers(list.map(normalizeUser));
    } catch (err) {
      setFetchError(
        err?.response?.data?.message ||
        err?.message                 ||
        'Failed to load users. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaved = useCallback(() => { fetchData(); }, [fetchData]);

  /* ── Open add or edit modal ── */
  const handleStartNew = () => { setEditUser(null); setShowModal(true); };
  const handleEdit     = (u) => { setEditUser({ ...u }); setShowModal(true); };
  const closeModal     = () => { setShowModal(false); setEditUser(null); };

  /* ── Filter / sort / paginate ── */
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      fullName(u).toLowerCase().includes(q) ||
      (u.email    || '').toLowerCase().includes(q) ||
      (u.phone1   || '').includes(search)          ||
      (u.city     || '').toLowerCase().includes(q) ||
      (u.district || '').toLowerCase().includes(q) ||
      (u.role     || '').toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = (sortKey === '_name' ? fullName(a) : (a[sortKey] || '')).toString().toLowerCase();
    const bv = (sortKey === '_name' ? fullName(b) : (b[sortKey] || '')).toString().toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const COLS = [
    { key: '_name',    label: 'Name',     w: '16%' },
    { key: 'phone1',   label: 'Phone 1',  w: '12%' },
    { key: 'phone2',   label: 'Phone 2',  w: '12%', tabletHide: true },
    { key: 'email',    label: 'Email',    w: '18%', tabletHide: true },
    { key: 'city',     label: 'City',     w: '10%' },
    { key: 'district', label: 'District', w: '10%', tabletHide: true },
    { key: 'role',     label: 'Role',     w: '10%' },
    { key: '_action',  label: 'Actions',  w: '9%',  noSort: true },
  ];

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',gap:14,flexDirection:'column' }}>
      <Loader2 size={32} color="#049edf" className="pg-spin"/>
      <span style={{ fontFamily:'Nunito,sans-serif',color:'#9090a8',fontSize:14 }}>Loading users…</span>
    </div>
  );

  /* ── Fetch error ── */
  if (fetchError) return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60vh',gap:14 }}>
      <AlertCircle size={28} color="#ef4444"/>
      <span style={{ fontFamily:'Nunito,sans-serif',color:'#ef4444',fontSize:14,fontWeight:600 }}>{fetchError}</span>
      <button className="pg-btn-add" onClick={fetchData}><RefreshCw size={13}/> Retry</button>
    </div>
  );

  return (
    <>
      <div className="pg-page">

        {/* Page Header */}
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">Registration</h1>
            <p className="pg-header__subtitle">
              Manage all <strong>registered users</strong> — Admin, Supervisor and Worker.
            </p>
          </div>
          <button className="pg-btn-add" onClick={handleStartNew}>
            <Plus size={14}/> Add Registration
          </button>
        </div>

        {/* Container */}
        <div className="pg-container">

          {/* Toolbar */}
          <div className="pg-toolbar">
            <div className="pg-toolbar__inner">
              <div className="pg-toolbar__count">
                <Users size={14} color="#9090a8"/>
                <span><strong>{filtered.length}</strong> user{filtered.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="pg-search-box">
                <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }}/>
                <input
                  placeholder="Search by name, email, city, district, role…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')}/>}
              </div>
              <button className="pg-pg-btn" onClick={fetchData} title="Refresh list" style={{ marginLeft: 'auto' }}>
                <RefreshCw size={13}/>
              </button>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="pg-desktop-table">
            <table className="pg-table" ref={tableRef}>
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      style={{ width: col.w }}
                      className={[
                        'pg-th',
                        col.noSort     ? '' : 'pg-th--sort',
                        col.tabletHide ? 'pg-tablet-hide' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => !col.noSort && handleSort(col.key)}
                    >
                      <div className="pg-th__inner">
                        {col.label}
                        {!col.noSort
                          ? <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir}/>
                          : <Filter size={10} color="#d0d0e4" style={{ marginLeft: 5 }}/>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="pg-td pg-empty" style={{ maxWidth: 'none' }}>
                      <div className="pg-empty__inner">
                        <Users size={36} color="#d0d0e8"/>
                        <span className="pg-empty__label">No users found</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((u, idx) => (
                  <tr key={u._id ?? idx} className="pg-tr">

                    {/* Name */}
                    <td className="pg-td pg-td--overflow">
                      <div className="pg-td__primary">{fullName(u)}</div>
                    </td>

                    {/* Phone 1 */}
                    <td className="pg-td">
                      <span style={{ color: '#4a5568' }}>{u.phone1 || '—'}</span>
                    </td>

                    {/* Phone 2 */}
                    <td className="pg-td pg-tablet-hide">
                      <span className="pg-td__muted">{u.phone2 || '—'}</span>
                    </td>

                    {/* Email */}
                    <td className="pg-td pg-td--overflow pg-tablet-hide">
                      <span className="pg-td__ellipsis" title={u.email}
                        style={{ color: u.email ? '#4a5568' : '#c0c0d8' }}>
                        {u.email || '—'}
                      </span>
                    </td>

                    {/* City */}
                    <td className="pg-td">
                      <span style={{ color: '#4a5568' }}>{u.city || '—'}</span>
                    </td>

                    {/* District */}
                    <td className="pg-td pg-tablet-hide">
                      <span style={{ color: '#4a5568' }}>{u.district || '—'}</span>
                    </td>

                    {/* Role */}
                    <td className="pg-td"><RoleBadge role={u.role}/></td>

                    {/* Actions — Edit + View (matches OwnerPage / SitePage pattern) */}
                    <td className="pg-td">
                      <div className="pg-action-wrap">
                        <button className="pg-btn-edit" onClick={() => handleEdit(u)} title="Edit">
                          <Edit2 size={13}/>
                        </button>
                        <button className="pg-btn-view" onClick={() => setViewUser(u)} title="View">
                          <Eye size={13}/>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <Users size={36} color="#d0d0e8"/>
                <span className="pg-empty__label">No users found</span>
              </div>
            ) : paginated.map((u, idx) => (
              <UserCard key={u._id ?? idx} u={u} onView={setViewUser} onEdit={handleEdit}/>
            ))}
          </div>

          {/* Pagination */}
          <div className="pg-pagination">
            <div className="pg-pagination__left">
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(1)}>
                <ChevronsLeft size={13}/>
              </button>
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={13}/>
              </button>
              {pageNums.map((p, i) =>
                p === '…'
                  ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span>
                  : <button key={p} className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`}
                      onClick={() => setPage(p)}>{p}</button>
              )}
              <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={13}/>
              </button>
              <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
                <ChevronsRight size={13}/>
              </button>
            </div>
            <div className="pg-pagination__right">
              <select className="pg-pagesize-select" value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="pg-pagination__text">Items per page</span>
              <span className="pg-pagination__text">
                {page} of {totalPages} pages ({sorted.length} items)
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Add / Edit modal */}
      {showModal && (
        <UserModal
          onClose={closeModal}
          onSaved={handleSaved}
          editData={editUser}
        />
      )}

      {/* View modal */}
      {viewUser && (
        <ViewModal
          user={viewUser}
          onClose={() => setViewUser(null)}
          onEdit={u => { setViewUser(null); handleEdit(u); }}
        />
      )}
    </>
  );
}