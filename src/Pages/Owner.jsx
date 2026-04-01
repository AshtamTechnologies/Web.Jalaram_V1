import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCircle, Plus, Phone, Home, Globe,
  Building2, MapPin, Search, Users, RefreshCw,
  X, AlertCircle, Check, Edit2, Eye, ChevronDown,
  ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Filter, Mail, Loader2
} from 'lucide-react';
import './Common1.css';
import { apiService } from '../api/api';

/* ─────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────── */
const EMPTY_FORM = {
  ownerName: '', alternateContactName: '', ownerAddress: '',
  phone1: '', phone2: '', city: '', district: '',
  state: '', country: 'India', emailAddress: '',
};

const NAME_REGEX  = /^[a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s.''\-]{0,99}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d][\d\s\-]{4,18}$/;

function validatePhone(value) {
  const v = (value || '').trim();
  if (!v) return '';
  if (!PHONE_REGEX.test(v))
    return 'Enter a valid phone / landline number (digits, spaces, hyphens, optional + prefix)';
  const digits = v.replace(/\D/g, '');
  if (digits.length < 6)  return `Too short — only ${digits.length} digit${digits.length === 1 ? '' : 's'} entered (minimum 6)`;
  if (digits.length > 15) return `Too long — ${digits.length} digits entered (maximum 15)`;
  return '';
}

const FIELDS = [
  { key: 'ownerName',            label: 'Owner Name',             icon: UserCircle, placeholder: 'e.g. Rajesh Mehta',              col: 6,  required: true,  type: 'name'     },
  { key: 'alternateContactName', label: 'Alternate Contact Name', icon: Users,      placeholder: 'e.g. R. Mehta',                  col: 6,  required: false, type: 'name'     },
  { key: 'ownerAddress',         label: 'Owner Address',          icon: Home,       placeholder: 'Street / Area',                  col: 12, required: false, type: 'text'     },
  { key: 'phone1',               label: 'Phone 1',                icon: Phone,      placeholder: '+91 98765 43210 or 079-27650000', col: 6,  required: true,  type: 'phone'    },
  { key: 'phone2',               label: 'Phone 2',                icon: Phone,      placeholder: '+91 79001 12233 or 0265-2xxxxxx', col: 6,  required: false, type: 'phone'    },
  { key: 'city',                 label: 'City',                   icon: Building2,  placeholder: 'e.g. Ahmedabad',                 col: 6,  required: true,  type: 'text'     },
  { key: 'district',             label: 'District',               icon: MapPin,     placeholder: 'e.g. Anand',                     col: 6,  required: true,  type: 'text'     },
  { key: 'state',                label: 'State',                  icon: MapPin,     placeholder: 'e.g. Gujarat',                   col: 6,  required: true,  type: 'text'     },
  { key: 'country',              label: 'Country',                icon: Globe,      placeholder: 'India',                          col: 6,  required: true,  type: 'readonly' },
  { key: 'emailAddress',         label: 'Email Address',          icon: Mail,       placeholder: 'example@email.com',              col: 12, required: false, type: 'email'    },
];

const PAGE_SIZE_OPTIONS = [10, 12, 15, 20];

function validateField(key, value, type, required) {
  const v = (value || '').trim();
  if (required && !v) return 'This field is required';
  if (!v) return '';
  if (type === 'name')  { if (!NAME_REGEX.test(v))  return "Only letters, spaces, and . ' - are allowed"; }
  if (type === 'phone') return validatePhone(v);
  if (type === 'email') { if (!EMAIL_REGEX.test(v)) return 'Enter a valid email address'; }
  return '';
}

/* ─────────────────────────────────────────
   normalizeOwner
   Confirmed from Swagger: API returns
   ownerID (capital ID), ownerName,
   alternateContactName, ownerAddress,
   phone1, phone2, city, district,
   state, country, emailAddress
───────────────────────────────────────── */
function normalizeOwner(raw) {
  console.log('Owner raw from API:', raw);

  // Swagger confirms the PK field is "ownerID"
  const id =
    raw.ownerID              ??   // ← confirmed from Swagger screenshot
    raw.ownerId              ??   // fallback camelCase variant
    raw.OwnerId              ??
    raw.owner_id             ??
    raw.id                   ??
    raw.Id                   ??
    null;

  if (id === null || id === undefined) {
    const fallback = Object.entries(raw).find(
      ([k, v]) =>
        (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v))) &&
        k.toLowerCase().includes('id')
    );
    if (fallback) {
      console.warn(`normalizeOwner: used fallback ID field "${fallback[0]}" = ${fallback[1]}`);
    }
    return buildOwner(fallback ? fallback[1] : undefined, raw);
  }

  return buildOwner(id, raw);
}

function buildOwner(id, raw) {
  return {
    _id:                  id,
    ownerName:            raw.ownerName            ?? raw.OwnerName            ?? '',
    alternateContactName: raw.alternateContactName ?? raw.AlternateContactName ?? '',
    ownerAddress:         raw.ownerAddress         ?? raw.OwnerAddress         ?? '',
    phone1:               raw.phone1               ?? raw.Phone1               ?? '',
    phone2:               raw.phone2               ?? raw.Phone2               ?? '',
    city:                 raw.city                 ?? raw.City                 ?? '',
    district:             raw.district             ?? raw.District             ?? '',
    state:                raw.state                ?? raw.State                ?? '',
    country:              raw.country              ?? raw.Country              ?? 'India',
    emailAddress:         raw.emailAddress         ?? raw.EmailAddress         ?? '',
  };
}

/* ─────────────────────────────────────────
   toPayload
   Sends plain camelCase keys — confirmed
   working from Swagger (ownerName, phone1…)
   The ownerID in PUT body is handled inside
   apiService.updateOwner in api.js
───────────────────────────────────────── */
function toPayload(form) {
  return {
    ownerName:            form.ownerName.trim(),
    alternateContactName: form.alternateContactName.trim(),
    ownerAddress:         form.ownerAddress.trim(),
    phone1:               form.phone1.trim(),
    phone2:               form.phone2.trim(),
    city:                 form.city.trim(),
    district:             form.district.trim(),
    state:                form.state.trim(),
    country:              form.country.trim(),
    emailAddress:         form.emailAddress.trim(),
  };
}

/* ─────────────────────────────────────────
   SORT ICON
───────────────────────────────────────── */
function SortIcon({ col, sortKey, sortDir }) {
  const active = sortKey === col;
  return (
    <span className="pg-sort-icon">
      <ChevronUp   size={10} color={active && sortDir === 'asc'  ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__up"   />
      <ChevronDown size={10} color={active && sortDir === 'desc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__down" />
    </span>
  );
}

/* ═══════════════════════════════════════════
   VIEW MODAL
═══════════════════════════════════════════ */
function ViewModal({ owner, onClose, onEdit }) {
  if (!owner) return null;

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

  return (
    <div className="pg-overlay pg-overlay--view" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal pg-modal--view">
        <div className="pg-view__banner">
          <button className="pg-view__close" onClick={onClose}><X size={15} /></button>
          <div className="pg-view__banner-content">
            <div className="pg-view__avatar"><UserCircle size={30} color="#fff" /></div>
            <div>
              <h4 className="pg-view__name">{owner.ownerName}</h4>
              {owner.alternateContactName && (
                <span className="pg-view__aka">Also known as: {owner.alternateContactName}</span>
              )}
            </div>
          </div>
          <div className="pg-view__pill">
            <MapPin size={11} color="rgba(255,255,255,0.85)" />
            <span className="pg-view__pill-text">
              {[owner.city, owner.district !== owner.city ? owner.district : null, owner.state, owner.country].filter(Boolean).join(', ')}
            </span>
          </div>
        </div>

        <div className="pg-view__body">
          <div className="pg-view__section-label">Contact</div>
          <InfoRow icon={Phone} label="Phone 1"       value={owner.phone1}       highlight />
          <InfoRow icon={Phone} label="Phone 2"       value={owner.phone2}       />
          <InfoRow icon={Mail}  label="Email Address" value={owner.emailAddress} highlight />
          <div className="pg-view__section-label pg-view__section-label--mt">Address</div>
          <InfoRow icon={Home}      label="Street / Area" value={owner.ownerAddress} />
          <InfoRow icon={Building2} label="City"          value={owner.city}         />
          <InfoRow icon={MapPin}    label="District"      value={owner.district}     />
          <InfoRow icon={MapPin}    label="State"         value={owner.state}        />
          <InfoRow icon={Globe}     label="Country"       value={owner.country}      />
        </div>

        <div className="pg-view__foot">
          <button className="pg-btn-cancel" onClick={onClose}>Close</button>
          <button className="pg-view__btn-edit" onClick={() => { onClose(); onEdit(owner); }}>
            <Edit2 size={13} /> Edit Owner
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ADD / EDIT MODAL
═══════════════════════════════════════════ */
function OwnerModal({ onClose, onSaved, editData }) {
  const isEdit = !!editData;
  const [form, setForm]             = useState(isEdit ? { ...editData } : { ...EMPTY_FORM });
  const [errors, setErrors]         = useState({});
  const [touched, setTouched]       = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [apiError, setApiError]     = useState('');

  const runValidate = (f) => {
    const e = {};
    FIELDS.forEach(({ key, required, type }) => {
      if (type === 'readonly') return;
      const err = validateField(key, f[key], type, required);
      if (err) e[key] = err;
    });
    return e;
  };

  const handleChange = (key, val) => {
    const updated = { ...form, [key]: val };
    setForm(updated);
    if (touched[key]) {
      const field = FIELDS.find(f => f.key === key);
      const err = validateField(key, val, field.type, field.required);
      setErrors(p => ({ ...p, [key]: err }));
    }
  };

  const handleBlur = (key) => {
    setTouched(p => ({ ...p, [key]: true }));
    const field = FIELDS.find(f => f.key === key);
    const err = validateField(key, form[key], field.type, field.required);
    setErrors(p => ({ ...p, [key]: err }));
  };

  const handleSubmit = async () => {
    const allTouched = {};
    FIELDS.forEach(f => { allTouched[f.key] = true; });
    setTouched(allTouched);

    const e = runValidate(form);
    if (Object.keys(e).length) { setErrors(e); return; }

    if (isEdit && (editData._id === undefined || editData._id === null)) {
      setApiError(
        'Owner ID is missing — cannot update. ' +
        'Open browser console and check "Owner raw from API:" to see the exact ID field name.'
      );
      return;
    }

    setSubmitting(true);
    setApiError('');

    try {
      const payload = toPayload(form);
      let saved;

      if (isEdit) {
        // PUT /Owner/{ownerID}  — ownerID is also injected into the body by apiService.updateOwner
        console.log(`Updating owner ID: ${editData._id}`, payload);
        const response = await apiService.updateOwner(editData._id, payload);
        // API may return the updated object or just a success message
        const raw = response?.data ?? response;
        saved = (raw && typeof raw === 'object' && (raw.ownerID ?? raw.ownerId ?? raw.id))
          ? normalizeOwner(raw)
          : { ...editData, ...form }; // fallback: merge edits locally
      } else {
        // POST /Owner
        const response = await apiService.createOwner(payload);
        const raw = response?.data ?? response;
        saved = normalizeOwner(raw);
      }

      setSuccess(true);
      await new Promise(r => setTimeout(r, 700));
      onSaved(saved, isEdit);
      onClose();

    } catch (err) {
      console.error('Save owner error:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.title   ||
        err?.response?.data          ||
        err?.message                 ||
        'Something went wrong. Please try again.';
      setApiError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal">

        {/* Header */}
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><UserCircle size={20} color="#049edf" /></div>
            <div>
              <h5 className="pg-modal__title">{isEdit ? 'Edit Owner' : 'Add New Owner'}</h5>
              <p className="pg-modal__subtitle">{isEdit ? `Editing: ${editData.ownerName}` : 'Fill in the details below'}</p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* API error banner */}
        {apiError && (
          <div className="pg-api-error">
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{apiError}</span>
          </div>
        )}

        {/* Form */}
        <div className="pg-modal__body">
          <div className="row g-3">
            {FIELDS.map(({ key, label, icon: Icon, placeholder, col, required, type }) => {
              const isReadonly = type === 'readonly';
              const hasError   = !!errors[key];
              let wrapClass = 'pg-field-wrap ';
              wrapClass += isReadonly ? 'pg-field-wrap--readonly' : hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal';

              return (
                <div key={key} className={`col-12 col-sm-${col}`}>
                  <label className="pg-field-label">
                    {label}{' '}
                    {isReadonly
                      ? <span className="pg-field-label__fixed">🔒 Fixed</span>
                      : required
                        ? <span className="pg-field-label__required">*</span>
                        : <span className="pg-field-label__optional">(optional)</span>}
                  </label>
                  <div className={wrapClass}>
                    <Icon size={14} color={hasError ? '#ef4444' : isReadonly ? '#049edf' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                    <input
                      readOnly={isReadonly}
                      placeholder={placeholder}
                      value={form[key] ?? ''}
                      onChange={e => !isReadonly && handleChange(key, e.target.value)}
                      onBlur={() => !isReadonly && handleBlur(key)}
                      className={`pg-field-input${isReadonly ? ' pg-field-input--readonly' : ''}`}
                    />
                  </div>
                  {hasError && (
                    <div className="pg-field-error">
                      <AlertCircle size={11} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span>{errors[key]}</span>
                    </div>
                  )}
                  {type === 'phone' && !hasError && touched[key] && (
                    <div className="pg-field-hint">
                      Mobile: +91 98765 43210 &nbsp;|&nbsp; Landline: 079-27650000
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="pg-form__note">
            <span className="pg-field-label__required">*</span> Required fields &nbsp;·&nbsp; Fields marked optional may be left blank
          </p>
        </div>

        {/* Footer */}
        <div className="pg-modal__foot">
          <button className="pg-btn-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="pg-btn-save" onClick={handleSubmit} disabled={submitting}>
            {success
              ? <><Check size={14} /> {isEdit ? 'Saved!' : 'Added!'}</>
              : submitting
                ? <><RefreshCw size={13} className="pg-spin" /> Saving…</>
                : <><Plus size={14} /> {isEdit ? 'Save Changes' : 'Add Owner'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Mobile Card ─── */
function OwnerCard({ o, onEdit, onView }) {
  return (
    <div className="pg-card">
      <div className="pg-card__header">
        <div className="pg-card__title-wrap">
          <div className="pg-card__title">{o.ownerName}</div>
          {o.alternateContactName && (
            <div className="pg-card__subtitle">{o.alternateContactName}</div>
          )}
        </div>
        <div className="pg-card__actions">
          <button className="pg-card__btn-edit" onClick={() => onEdit(o)} title="Edit"><Edit2 size={13} /></button>
          <button className="pg-card__btn-view" onClick={() => onView(o)} title="View"><Eye size={13} /></button>
        </div>
      </div>
      <div className="pg-card__body">
        {o.ownerAddress && (
          <div className="pg-card__row">
            <Home size={13} className="pg-card__row-icon" />
            <span className="pg-card__row-text">{o.ownerAddress}</span>
          </div>
        )}
        <div className="pg-card__grid2">
          <div className="pg-card__grid-cell">
            <Phone size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <span className="pg-card__grid-text">{o.phone1}</span>
          </div>
          {o.phone2 && (
            <div className="pg-card__grid-cell pg-card__grid-cell--muted">
              <Phone size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <span className="pg-card__grid-text">{o.phone2}</span>
            </div>
          )}
        </div>
        <div className="pg-card__row">
          <Building2 size={12} color="#c0c0d8" className="pg-card__row-icon" />
          <span className="pg-card__row-text">{o.city || '—'}</span>
        </div>
        {o.district && o.district !== o.city && (
          <div className="pg-card__row">
            <MapPin size={12} color="#c0c0d8" className="pg-card__row-icon" />
            <span className="pg-card__row-text">{o.district}</span>
          </div>
        )}
        {o.state && (
          <div className="pg-card__row">
            <MapPin size={12} color="#c0c0d8" className="pg-card__row-icon" />
            <span className="pg-card__row-text">{o.state}</span>
          </div>
        )}
        {o.emailAddress && (
          <div className="pg-card__row">
            <Mail size={12} color="#c0c0d8" className="pg-card__row-icon" />
            <span className="pg-card__row-text--ellipsis">{o.emailAddress}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   OWNER PAGE
═══════════════════════════════════════════ */
export default function OwnerPage() {
  const [owners, setOwners]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editOwner, setEditOwner] = useState(null);
  const [viewOwner, setViewOwner] = useState(null);

  const [search, setSearch]     = useState('');
  const [sortKey, setSortKey]   = useState('ownerName');
  const [sortDir, setSortDir]   = useState('asc');
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(12);

  /* ── Fetch all owners ── */
  const fetchOwners = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const response = await apiService.getAllOwners();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];
      console.log('Raw owners list from API:', list);
      setOwners(list.map(normalizeOwner));
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message                 ||
        'Failed to load owners. Please try again.';
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOwners(); }, [fetchOwners]);

  /* ── Search across all visible fields ── */
  const filtered = owners.filter(o => {
    const q = search.toLowerCase();
    return (
      (o.ownerName            || '').toLowerCase().includes(q) ||
      (o.alternateContactName || '').toLowerCase().includes(q) ||
      (o.city                 || '').toLowerCase().includes(q) ||
      (o.district             || '').toLowerCase().includes(q) ||
      (o.state                || '').toLowerCase().includes(q) ||
      (o.phone1               || '').includes(search)          ||
      (o.emailAddress         || '').toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = (a[sortKey] || '').toString().toLowerCase();
    const bv = (b[sortKey] || '').toString().toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

  /* ── Handlers ── */
  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      setOwners(prev => prev.map(x => x._id === saved._id ? saved : x));
    } else {
      setOwners(prev => [...prev, saved]);
      setPage(1);
    }
  };

  const handleEdit = (o) => {
    setEditOwner({ ...o });   // spread so modal gets a fresh copy
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditOwner(null); };
  const handleView = (o) => setViewOwner(o);
  const closeView  = () => setViewOwner(null);

  /* ── Table columns ── */
  const COLS = [
    { key: 'ownerName',    label: 'Owner Name', w: '15%' },
    { key: 'ownerAddress', label: 'Address',    w: '15%' },
    { key: 'phone1',       label: 'Phone 1',    w: '12%' },
    { key: 'phone2',       label: 'Phone 2',    w: '11%' },
    { key: 'city',         label: 'City',       w: '9%'  },
    { key: 'district',     label: 'District',   w: '9%'  },
    { key: 'state',        label: 'State',      w: '9%'  },
    { key: 'emailAddress', label: 'Email',      w: '12%' },
    { key: '_action',      label: 'Action',     w: '8%',  noSort: true },
  ];

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="pg-page">
        <div className="pg-loader">
          <Loader2 size={32} color="#049edf" className="pg-spin" />
          <span className="pg-loader__text">Loading owners…</span>
        </div>
      </div>
    );
  }

  /* ── Fetch error ── */
  if (fetchError) {
    return (
      <div className="pg-page">
        <div className="pg-fetch-error">
          <AlertCircle size={28} color="#ef4444" />
          <span className="pg-fetch-error__msg">{fetchError}</span>
          <button className="pg-btn-add" onClick={fetchOwners}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pg-page">

        {/* Page Header */}
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">Owners</h1>
            <p className="pg-header__subtitle">
              Manage all hoarding &amp; site <strong>owners</strong> in one place.
            </p>
          </div>
          <button className="pg-btn-add" onClick={() => { setEditOwner(null); setShowModal(true); }}>
            <Plus size={14} /> Add New Owner
          </button>
        </div>

        {/* Container */}
        <div className="pg-container">

          {/* Toolbar */}
          <div className="pg-toolbar">
            <div className="pg-toolbar__inner">
              <div className="pg-toolbar__count">
                <Users size={14} color="#9090a8" />
                <span><strong>{filtered.length}</strong> owner{filtered.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="pg-search-box">
                <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
                <input
                  placeholder="Search by name, city, district, state, phone, email…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
              </div>
              <button className="pg-pg-btn" onClick={fetchOwners} title="Refresh list" style={{ marginLeft: 'auto' }}>
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="pg-desktop-table">
            <table className="pg-table">
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      style={{ width: col.w }}
                      className={['pg-th', col.noSort ? '' : 'pg-th--sort'].filter(Boolean).join(' ')}
                      onClick={() => !col.noSort && handleSort(col.key)}
                    >
                      <div className="pg-th__inner">
                        {col.label}
                        {!col.noSort
                          ? <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                          : <Filter size={10} color="#d0d0e4" style={{ marginLeft: '5px' }} />}
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
                        <UserCircle size={36} color="#d0d0e8" />
                        <span className="pg-empty__label">No owners found</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(o => (
                  <tr key={o._id} className="pg-tr">

                    {/* Owner Name + Alternate */}
                    <td className="pg-td pg-td--overflow">
                      <div className="pg-td__primary">{o.ownerName || '—'}</div>
                      {o.alternateContactName && (
                        <div className="pg-td__secondary">{o.alternateContactName}</div>
                      )}
                    </td>

                    {/* Address */}
                    <td className="pg-td pg-td--overflow">
                      <span className="pg-td__ellipsis" title={o.ownerAddress}>
                        {o.ownerAddress || '—'}
                      </span>
                    </td>

                    {/* Phone 1 */}
                    <td className="pg-td">
                      <span style={{ color: '#4a5568' }}>{o.phone1 || '—'}</span>
                    </td>

                    {/* Phone 2 */}
                    <td className="pg-td">
                      <span className="pg-td__muted">{o.phone2 || '—'}</span>
                    </td>

                    {/* City — separate column */}
                    <td className="pg-td">
                      <span style={{ color: '#4a5568' }}>{o.city || '—'}</span>
                    </td>

                    {/* District — separate column */}
                    <td className="pg-td">
                      <span style={{ color: '#4a5568' }}>{o.district || '—'}</span>
                    </td>

                    {/* State — always visible */}
                    <td className="pg-td">
                      <span style={{ color: '#4a5568' }}>{o.state || '—'}</span>
                    </td>

                    {/* Email — always visible */}
                    <td className="pg-td pg-td--overflow">
                      <span
                        className="pg-td__ellipsis"
                        title={o.emailAddress}
                        style={{ color: o.emailAddress ? '#4a5568' : '#c0c0d8' }}
                      >
                        {o.emailAddress || '—'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="pg-td">
                      <div className="pg-action-wrap">
                        <button className="pg-btn-edit" onClick={() => handleEdit(o)} title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button className="pg-btn-view" onClick={() => handleView(o)} title="View">
                          <Eye size={13} />
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
                <UserCircle size={36} color="#d0d0e8" />
                <span className="pg-empty__label">No owners found</span>
              </div>
            ) : paginated.map(o => (
              <OwnerCard key={o._id} o={o} onEdit={handleEdit} onView={handleView} />
            ))}
          </div>

          {/* Pagination */}
          <div className="pg-pagination">
            <div className="pg-pagination__left">
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(1)}>
                <ChevronsLeft size={13} />
              </button>
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={13} />
              </button>
              {pageNums.map((p, i) =>
                p === '…'
                  ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span>
                  : <button
                      key={p}
                      className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`}
                      onClick={() => setPage(p)}
                    >{p}</button>
              )}
              <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={13} />
              </button>
              <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
                <ChevronsRight size={13} />
              </button>
            </div>
            <div className="pg-pagination__right">
              <select
                className="pg-pagesize-select"
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
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

      {showModal && (
        <OwnerModal
          onClose={closeModal}
          onSaved={handleSaved}
          editData={editOwner}
        />
      )}
      {viewOwner && (
        <ViewModal owner={viewOwner} onClose={closeView} onEdit={handleEdit} />
      )}
    </>
  );
}