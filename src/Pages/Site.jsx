import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MapPin, Plus, Home, Globe,
  Building2, Search, RefreshCw,
  X, AlertCircle, Check, Edit2, Eye, ChevronDown,
  ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Filter, Layers, Navigation, UserCircle, Loader2
} from 'lucide-react';
import './Common1.css';
import { apiService } from '../api/api'; // ← adjust path if needed

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const SITE_TYPE_OPTIONS = ['Residential', 'Govt', 'Industrial', 'Terrace'];

const TYPE_COLORS = {
  Residential: { color: 'rgb(74, 85, 104)' },
  Govt:        { color: 'rgb(74, 85, 104)' },
  Industrial:  { color: 'rgb(74, 85, 104)' },
  Terrace:     { color: 'rgb(74, 85, 104)' },
};

const EMPTY_FORM = {
  addressLine1: '', addressLine2: '', addressLine3: '',
  landmark: '', city: '', district: '',
  siteType: '', country: 'India', ownerID: '',
};

const PAGE_SIZE_OPTIONS = [10, 12, 15, 20];

/* ─────────────────────────────────────────
   NORMALIZE HELPERS
   Handle camelCase / PascalCase from .NET API
───────────────────────────────────────── */
function normalizeSite(raw) {
  return {
    siteID:       raw.siteID       ?? raw.SiteID       ?? raw.id ?? raw.Id,
    addressLine1: raw.addressLine1 ?? raw.AddressLine1 ?? '',
    addressLine2: raw.addressLine2 ?? raw.AddressLine2 ?? '',
    addressLine3: raw.addressLine3 ?? raw.AddressLine3 ?? '',
    landmark:     raw.landmark     ?? raw.Landmark     ?? '',
    city:         raw.city         ?? raw.City         ?? '',
    district:     raw.district     ?? raw.District     ?? '',
    siteType:     raw.siteType     ?? raw.SiteType     ?? '',
    country:      raw.country      ?? raw.Country      ?? 'India',
    ownerID:      raw.ownerID      ?? raw.OwnerID      ?? raw.ownerId ?? raw.OwnerId ?? null,
  };
}

function normalizeOwner(raw) {
  return {
    _id:       raw.ownerID  ?? raw.OwnerID  ?? raw.ownerId ?? raw.OwnerId ?? raw.id ?? raw.Id,
    ownerName: raw.ownerName ?? raw.OwnerName ?? '',
  };
}

/* ─────────────────────────────────────────
   VALIDATION
───────────────────────────────────────── */
const ADDRESS_REGEX = /^[\w\s,.\-/'&#()]{1,200}$/;
const TEXT_REGEX    = /^[a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s.\-]{0,99}$/;

function validateTextField(key, value, type, required) {
  const v = (value || '').trim();
  if (required && !v) return 'This field is required';
  if (!v) return '';
  if (type === 'address' && !ADDRESS_REGEX.test(v))
    return "Only letters, digits, spaces and , . - / ' & # ( ) are allowed";
  if (type === 'text' && !TEXT_REGEX.test(v))
    return 'Only letters, spaces, hyphens and dots are allowed';
  return '';
}

const TEXT_FIELDS = [
  { key: 'addressLine1', label: 'Address Line 1', icon: Home,       placeholder: 'e.g. 14, Navrangpura',      col: 12, required: true,  type: 'address' },
  { key: 'addressLine2', label: 'Address Line 2', icon: Home,       placeholder: 'e.g. Near Gujarat College', col: 6,  required: false, type: 'address' },
  { key: 'addressLine3', label: 'Address Line 3', icon: Home,       placeholder: 'e.g. Opp. Fire Station',    col: 6,  required: false, type: 'address' },
  { key: 'landmark',     label: 'Landmark',       icon: Navigation, placeholder: 'e.g. Gujarat College',      col: 6,  required: false, type: 'address' },
  { key: 'city',         label: 'City',           icon: Building2,  placeholder: 'e.g. Ahmedabad',            col: 6,  required: true,  type: 'text'    },
  { key: 'district',     label: 'District',       icon: MapPin,     placeholder: 'e.g. Ahmedabad',            col: 6,  required: true,  type: 'text'    },
];

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
   OWNER COMBO-DROPDOWN
   Populated from GET /Owner API
═══════════════════════════════════════════ */
function OwnerCombo({ value, onChange, onBlur, hasError, owners }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef           = useRef(null);
  const inputRef          = useRef(null);

  const selected = owners.find(o => o._id === value || o._id === Number(value));

  const filtered = owners.filter(o =>
    o.ownerName.toLowerCase().includes(query.toLowerCase()) ||
    String(o._id).includes(query)
  );

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
        onBlur && onBlur();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onBlur]);

  const openDropdown = () => {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const select = (owner) => { onChange(owner._id); setOpen(false); setQuery(''); };

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
    onBlur && onBlur();
  };

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        className={`pg-field-wrap pg-combo-trigger ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        onClick={openDropdown}
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && openDropdown()}
      >
        <UserCircle size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
        <span className={`pg-combo-display${!selected ? ' pg-combo-display--placeholder' : ''}`}>
          {selected ? selected.ownerName : owners.length === 0 ? 'Loading owners…' : 'Select owner…'}
        </span>
        {selected
          ? <X size={13} className="pg-combo-clear" onClick={clear} />
          : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>

      {open && (
        <div className="pg-combo-panel">
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="pg-combo-search__input"
              placeholder="Search by name or ID…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
          </div>
          <div className="pg-combo-list">
            {owners.length === 0 ? (
              <div className="pg-combo-empty">No owners available</div>
            ) : filtered.length === 0 ? (
              <div className="pg-combo-empty">No owners match</div>
            ) : filtered.map(o => (
              <div
                key={o._id}
                className={`pg-combo-option${(o._id === value || o._id === Number(value)) ? ' pg-combo-option--active' : ''}`}
                onClick={() => select(o)}
              >
                <span className="pg-combo-option__name">{o.ownerName}</span>
                <span className="pg-combo-option__id">ID: {o._id}</span>
                {(o._id === value || o._id === Number(value)) && (
                  <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SITE-TYPE DROPDOWN
═══════════════════════════════════════════ */
function SiteTypeDropdown({ value, onChange, onBlur, hasError }) {
  const [open, setOpen] = useState(false);
  const wrapRef         = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        onBlur && onBlur();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onBlur]);

  const select = (v) => { onChange(v); setOpen(false); };
  const clear  = (e) => { e.stopPropagation(); onChange(''); onBlur && onBlur(); };
  const colors = value ? TYPE_COLORS[value] : null;

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        className={`pg-field-wrap pg-combo-trigger ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        onClick={() => setOpen(o => !o)}
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setOpen(o => !o)}
      >
        <Layers size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
        {value
          ? <span className="pg-sitetype-pill" style={{ color: colors.color }}>{value}</span>
          : <span className="pg-combo-display pg-combo-display--placeholder">Select site type…</span>}
        {value
          ? <X size={13} className="pg-combo-clear" onClick={clear} />
          : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>

      {open && (
        <div className="pg-combo-panel pg-combo-panel--sm">
          {SITE_TYPE_OPTIONS.map(opt => {
            const c = TYPE_COLORS[opt];
            return (
              <div
                key={opt}
                className={`pg-combo-option${opt === value ? ' pg-combo-option--active' : ''}`}
                onClick={() => select(opt)}
              >
                <span className="pg-sitetype-pill" style={{ color: c.color }}>{opt}</span>
                {opt === value && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   VIEW MODAL
═══════════════════════════════════════════ */
function ViewModal({ site, onClose, onEdit, owners }) {
  if (!site) return null;

  const owner      = owners.find(o => o._id === site.ownerID || o._id === Number(site.ownerID));
  const typeColors = site.siteType ? TYPE_COLORS[site.siteType] : null;

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
            <div className="pg-view__avatar"><MapPin size={28} color="#fff" /></div>
            <div>
              <h4 className="pg-view__name pg-view__name--site">{site.addressLine1}</h4>
              {site.addressLine2 && <span className="pg-view__aka">{site.addressLine2}</span>}
            </div>
          </div>
          <div className="pg-view__pill">
            <MapPin size={11} color="rgba(255,255,255,0.85)" />
            <span className="pg-view__pill-text">
              {[site.city, site.district !== site.city ? site.district : null, site.country].filter(Boolean).join(', ')}
            </span>
          </div>
          {site.siteType && (
            <div className="pg-view__pill pg-view__pill--type">
              <Layers size={10} color="rgba(255,255,255,0.8)" />
              <span className="pg-view__pill-text pg-view__pill-text--type">{site.siteType}</span>
            </div>
          )}
        </div>

        <div className="pg-view__body">
          <div className="pg-view__section-label">Address</div>
          <InfoRow icon={Home}       label="Address Line 1" value={site.addressLine1} highlight />
          <InfoRow icon={Home}       label="Address Line 2" value={site.addressLine2} />
          <InfoRow icon={Home}       label="Address Line 3" value={site.addressLine3} />
          <InfoRow icon={Navigation} label="Landmark"       value={site.landmark}     />

          <div className="pg-view__section-label pg-view__section-label--mt">Location & Classification</div>
          <InfoRow icon={Building2} label="City"     value={site.city}     />
          <InfoRow icon={MapPin}    label="District" value={site.district} />

          {site.siteType && (
            <div className="pg-info-row">
              <div className="pg-info-row__icon">
                <Layers size={14} color="#a0a0c0" />
              </div>
              <div className="pg-info-row__content">
                <div className="pg-info-row__label">Site Type</div>
                <span className="pg-sitetype-pill" style={{ color: typeColors?.color }}>
                  {site.siteType}
                </span>
              </div>
            </div>
          )}
          <InfoRow icon={Globe} label="Country" value={site.country} />

          <div className="pg-view__section-label pg-view__section-label--mt">Owner</div>
          <InfoRow
            icon={UserCircle}
            label="Owner"
            value={owner ? `${owner.ownerName} (ID: ${owner._id})` : site.ownerID ? `ID: ${site.ownerID}` : '—'}
            highlight
          />
        </div>

        <div className="pg-view__foot">
          <button className="pg-btn-cancel" onClick={onClose}>Close</button>
          <button className="pg-view__btn-edit" onClick={() => { onClose(); onEdit(site); }}>
            <Edit2 size={13} /> Edit Site
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ADD / EDIT MODAL  (with real API calls)
═══════════════════════════════════════════ */
function SiteModal({ onClose, onSaved, editData, owners }) {
  const isEdit = !!editData;
  const [form, setForm]             = useState(isEdit ? { ...editData } : { ...EMPTY_FORM });
  const [errors, setErrors]         = useState({});
  const [touched, setTouched]       = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [apiError, setApiError]     = useState('');

  const runValidate = (f) => {
    const e = {};
    TEXT_FIELDS.forEach(({ key, required, type }) => {
      const err = validateTextField(key, f[key], type, required);
      if (err) e[key] = err;
    });
    if (!f.ownerID) e.ownerID = 'Please select an owner';
    return e;
  };

  const handleChange = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (touched[key]) {
      const tf = TEXT_FIELDS.find(f => f.key === key);
      if (tf) {
        setErrors(p => ({ ...p, [key]: validateTextField(key, val, tf.type, tf.required) }));
      } else if (key === 'ownerID') {
        setErrors(p => ({ ...p, ownerID: val ? '' : 'Please select an owner' }));
      }
    }
  };

  const handleTextBlur = (key) => {
    setTouched(p => ({ ...p, [key]: true }));
    const tf = TEXT_FIELDS.find(f => f.key === key);
    if (tf) setErrors(p => ({ ...p, [key]: validateTextField(key, form[key], tf.type, tf.required) }));
  };

  const handleDropdownBlur = (key) => {
    setTouched(p => ({ ...p, [key]: true }));
    if (key === 'ownerID') setErrors(p => ({ ...p, ownerID: form.ownerID ? '' : 'Please select an owner' }));
  };

  const handleSubmit = async () => {
    const allTouched = {};
    [...TEXT_FIELDS.map(f => f.key), 'siteType', 'ownerID'].forEach(k => { allTouched[k] = true; });
    setTouched(allTouched);

    const e = runValidate(form);
    if (Object.keys(e).length) { setErrors(e); return; }

    // Guard: ensure siteID exists for edit
    if (isEdit && !editData.siteID) {
      setApiError('Site ID is missing — cannot update. Please refresh and try again.');
      return;
    }

    setSubmitting(true);
    setApiError('');

    try {
      let saved;

      if (isEdit) {
        // ── PUT /api/Site/{siteID} via apiService ─────────────
        const response = await apiService.updateSite(editData.siteID, form);
        saved = normalizeSite(response?.data ?? response ?? { ...form, siteID: editData.siteID });
      } else {
        // ── POST /api/Site via apiService ─────────────────────
        const response = await apiService.createSite(form);
        saved = normalizeSite(response?.data ?? response);
      }

      setSuccess(true);
      await new Promise(r => setTimeout(r, 700));
      onSaved(saved, isEdit);
      onClose();

    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.title   ||
        err?.message                 ||
        'Something went wrong. Please try again.';
      setApiError(msg);
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
            <div className="pg-modal__icon-wrap"><MapPin size={20} color="#049edf" /></div>
            <div>
              <h5 className="pg-modal__title">{isEdit ? 'Edit Site' : 'Add New Site'}</h5>
              <p className="pg-modal__subtitle">{isEdit ? `Editing: ${editData.addressLine1}` : 'Fill in the site details below'}</p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* API-level error banner */}
        {apiError && (
          <div className="pg-api-error">
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{apiError}</span>
          </div>
        )}

        {/* Form */}
        <div className="pg-modal__body">
          <div className="row g-3">

            {/* ── Text / address fields ── */}
            {TEXT_FIELDS.map(({ key, label, icon: Icon, placeholder, col, required, type }) => {
              const hasError = !!errors[key];
              return (
                <div key={key} className={`col-12 col-sm-${col}`}>
                  <label className="pg-field-label">
                    {label}{' '}
                    {required
                      ? <span className="pg-field-label__required">*</span>
                      : <span className="pg-field-label__optional">(optional)</span>}
                  </label>
                  <div className={`pg-field-wrap ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                    <Icon size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                    <input
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={e => handleChange(key, e.target.value)}
                      onBlur={() => handleTextBlur(key)}
                      className="pg-field-input"
                    />
                  </div>
                  {hasError && (
                    <div className="pg-field-error">
                      <AlertCircle size={11} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span>{errors[key]}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Site Type dropdown (col-6) ── */}
            <div className="col-12 col-sm-6">
              <label className="pg-field-label">
                Site Type <span className="pg-field-label__optional">(optional)</span>
              </label>
              <SiteTypeDropdown
                value={form.siteType}
                onChange={v => handleChange('siteType', v)}
                onBlur={() => handleDropdownBlur('siteType')}
                hasError={!!errors.siteType}
              />
              {errors.siteType && (
                <div className="pg-field-error">
                  <AlertCircle size={11} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{errors.siteType}</span>
                </div>
              )}
            </div>

            {/* ── Country (readonly, col-6) ── */}
            <div className="col-12 col-sm-6">
              <label className="pg-field-label">
                Country <span className="pg-field-label__fixed">🔒 Fixed</span>
              </label>
              <div className="pg-field-wrap pg-field-wrap--readonly">
                <Globe size={14} color="#049edf" style={{ flexShrink: 0 }} />
                <input readOnly value={form.country} className="pg-field-input pg-field-input--readonly" />
              </div>
            </div>

            {/* ── Owner combo-dropdown (full width) — fed from API ── */}
            <div className="col-12">
              <label className="pg-field-label">
                Owner <span className="pg-field-label__required">*</span>
                <span className="pg-field-label__hint"> — search by name or ID</span>
              </label>
              <OwnerCombo
                value={form.ownerID}
                onChange={v => handleChange('ownerID', v)}
                onBlur={() => handleDropdownBlur('ownerID')}
                hasError={!!errors.ownerID}
                owners={owners}
              />
              {errors.ownerID && (
                <div className="pg-field-error">
                  <AlertCircle size={11} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{errors.ownerID}</span>
                </div>
              )}
              {form.ownerID && !errors.ownerID && (
                <div className="pg-field-hint">
                  Owner ID stored: <strong>{form.ownerID}</strong>
                </div>
              )}
            </div>

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
                : <><Plus size={14} /> {isEdit ? 'Save Changes' : 'Add Site'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Mobile Site Card ─── */
function SiteCard({ s, onEdit, onView, owners }) {
  const typeColors = s.siteType ? TYPE_COLORS[s.siteType] : null;
  const owner      = owners.find(o => o._id === s.ownerID || o._id === Number(s.ownerID));
  return (
    <div className="pg-card">
      <div className="pg-card__header">
        <div className="pg-card__title-wrap">
          <div className="pg-card__title">{s.addressLine1}</div>
          {s.addressLine2 && <div className="pg-card__subtitle">{s.addressLine2}</div>}
        </div>
        <div className="pg-card__actions">
          <button className="pg-card__btn-edit" onClick={() => onEdit(s)} title="Edit"><Edit2 size={13} /></button>
          <button className="pg-card__btn-view" onClick={() => onView(s)} title="View"><Eye size={13} /></button>
        </div>
      </div>
      <div className="pg-card__body">
        {s.landmark && (
          <div className="pg-card__row">
            <Navigation size={12} color="#c0c0d8" className="pg-card__row-icon" />
            <span className="pg-card__row-text--ellipsis">{s.landmark}</span>
          </div>
        )}
        <div className="pg-card__row">
          <Building2 size={12} color="#c0c0d8" className="pg-card__row-icon" />
          <span className="pg-card__row-text">
            {s.city}{s.district !== s.city ? `, ${s.district}` : ''}
          </span>
        </div>
        {s.siteType && typeColors && (
          <div className="pg-card__row">
            <Layers size={12} color="#c0c0d8" className="pg-card__row-icon" />
            <span className="pg-sitetype-pill" style={{ color: typeColors.color }}>{s.siteType}</span>
          </div>
        )}
        {owner && (
          <div className="pg-card__row">
            <UserCircle size={12} color="#c0c0d8" className="pg-card__row-icon" />
            <span className="pg-card__row-text--ellipsis">{owner.ownerName} (ID: {owner._id})</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SITE PAGE
═══════════════════════════════════════════ */
export default function SitePage() {
  const [sites, setSites]           = useState([]);
  const [owners, setOwners]         = useState([]);  // ← fetched from GET /Owner
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editSite, setEditSite]   = useState(null);
  const [viewSite, setViewSite]   = useState(null);

  const [search, setSearch]     = useState('');
  const [sortKey, setSortKey]   = useState('addressLine1');
  const [sortDir, setSortDir]   = useState('asc');
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(12);

  /* ── Fetch sites + owners in parallel on mount ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      // Both APIs run in parallel for speed
      const [sitesRes, ownersRes] = await Promise.all([
        apiService.getAllSites(),
        apiService.getAllOwners(),
      ]);

      const siteList = Array.isArray(sitesRes)
        ? sitesRes
        : Array.isArray(sitesRes?.data) ? sitesRes.data : [];

      const ownerList = Array.isArray(ownersRes)
        ? ownersRes
        : Array.isArray(ownersRes?.data) ? ownersRes.data : [];

      setSites(siteList.map(normalizeSite));
      setOwners(ownerList.map(normalizeOwner));
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message                 ||
        'Failed to load data. Please try again.';
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Derived data ── */
  const filtered = sites.filter(s => {
    const q     = search.toLowerCase();
    const owner = owners.find(o => o._id === s.ownerID || o._id === Number(s.ownerID));
    return (
      (s.addressLine1 || '').toLowerCase().includes(q) ||
      (s.addressLine2 || '').toLowerCase().includes(q) ||
      (s.city         || '').toLowerCase().includes(q) ||
      (s.district     || '').toLowerCase().includes(q) ||
      (s.landmark     || '').toLowerCase().includes(q) ||
      (s.siteType     || '').toLowerCase().includes(q) ||
      (owner?.ownerName || '').toLowerCase().includes(q)
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

  // Called by SiteModal after successful POST or PUT
  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      setSites(prev => prev.map(x => x.siteID === saved.siteID ? saved : x));
    } else {
      setSites(prev => [...prev, saved]);
      setPage(1);
    }
  };

  const handleEdit = (s) => { setEditSite(s); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditSite(null); };
  const handleView = (s) => setViewSite(s);
  const closeView  = () => setViewSite(null);

  const COLS = [
    { key: 'addressLine1', label: 'Address Line 1',  w: '20%' },
    { key: 'addressLine2', label: 'Address Line 2',  w: '15%', tabletHide: true },
    { key: 'landmark',     label: 'Landmark',         w: '13%', tabletHide: true },
    { key: 'city',         label: 'City / District',  w: '13%' },
    { key: 'siteType',     label: 'Site Type',        w: '11%' },
    { key: 'ownerID',      label: 'Owner',            w: '14%', tabletHide: true },
    { key: 'country',      label: 'Country',          w: '8%',  tabletHide: true },
    { key: '_action',      label: 'Action',           w: '8%',  noSort: true },
  ];

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="pg-page">
        <div className="pg-loader">
          <Loader2 size={32} color="#049edf" className="pg-spin" />
          <span className="pg-loader__text">Loading sites…</span>
        </div>
      </div>
    );
  }

  /* ── Fetch error state ── */
  if (fetchError) {
    return (
      <div className="pg-page">
        <div className="pg-fetch-error">
          <AlertCircle size={28} color="#ef4444" />
          <span className="pg-fetch-error__msg">{fetchError}</span>
          <button className="pg-btn-add" onClick={fetchData}>
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
            <h1 className="pg-header__title">Sites</h1>
            <p className="pg-header__subtitle">
              Manage all hoarding &amp; advertising <strong>sites</strong> in one place.
            </p>
          </div>
          <button className="pg-btn-add" onClick={() => { setEditSite(null); setShowModal(true); }}>
            <Plus size={14} /> Add New Site
          </button>
        </div>

        {/* Container */}
        <div className="pg-container">

          {/* Toolbar */}
          <div className="pg-toolbar">
            <div className="pg-toolbar__inner">
              <div className="pg-toolbar__count">
                <MapPin size={14} color="#9090a8" />
                <span><strong>{filtered.length}</strong> site{filtered.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="pg-search-box">
                <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
                <input
                  placeholder="Search by address, city, owner, type…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
              </div>
              {/* Refresh button */}
              <button className="pg-pg-btn" onClick={fetchData} title="Refresh list" style={{ marginLeft: 'auto' }}>
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
                      className={['pg-th', col.noSort ? '' : 'pg-th--sort', col.tabletHide ? 'pg-tablet-hide' : ''].filter(Boolean).join(' ')}
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
                        <MapPin size={36} color="#d0d0e8" />
                        <span className="pg-empty__label">No sites found</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(s => {
                  const typeColors = s.siteType ? TYPE_COLORS[s.siteType] : null;
                  const owner      = owners.find(o => o._id === s.ownerID || o._id === Number(s.ownerID));
                  return (
                    <tr key={s.siteID} className="pg-tr">
                      <td className="pg-td pg-td--overflow">
                        <div className="pg-td__primary">{s.addressLine1}</div>
                        {s.addressLine3 && <div className="pg-td__secondary">{s.addressLine3}</div>}
                      </td>
                      <td className="pg-td pg-td--overflow pg-tablet-hide">
                        <span className="pg-td__ellipsis" title={s.addressLine2}>{s.addressLine2 || '—'}</span>
                      </td>
                      <td className="pg-td pg-td--overflow pg-tablet-hide">
                        <span className="pg-td__ellipsis" title={s.landmark}>{s.landmark || '—'}</span>
                      </td>
                      <td className="pg-td">
                        <span style={{ color: '#4a5568' }}>{s.city}</span>
                        {s.district !== s.city && <span className="pg-td__secondary">, {s.district}</span>}
                      </td>
                      <td className="pg-td">
                        {s.siteType && typeColors
                          ? <span className="pg-sitetype-pill" style={{ color: typeColors.color }}>{s.siteType}</span>
                          : <span className="pg-td__dash">—</span>}
                      </td>
                      <td className="pg-td pg-td--overflow pg-tablet-hide">
                        {owner
                          ? <div>
                              <div className="pg-td__primary" style={{ fontSize: '12.5px' }}>{owner.ownerName}</div>
                              <div className="pg-td__secondary">ID: {owner._id}</div>
                            </div>
                          : <span className="pg-td__dash">—</span>}
                      </td>
                      <td className="pg-td pg-tablet-hide">
                        <span style={{ color: '#4a5568' }}>{s.country}</span>
                      </td>
                      <td className="pg-td">
                        <div className="pg-action-wrap">
                          <button className="pg-btn-edit" onClick={() => handleEdit(s)} title="Edit"><Edit2 size={13} /></button>
                          <button className="pg-btn-view" onClick={() => handleView(s)} title="View"><Eye size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <MapPin size={36} color="#d0d0e8" />
                <span className="pg-empty__label">No sites found</span>
              </div>
            ) : paginated.map(s => (
              <SiteCard key={s.siteID} s={s} onEdit={handleEdit} onView={handleView} owners={owners} />
            ))}
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
        <SiteModal
          onClose={closeModal}
          onSaved={handleSaved}
          editData={editSite}
          owners={owners}
        />
      )}
      {viewSite && (
        <ViewModal site={viewSite} onClose={closeView} onEdit={handleEdit} owners={owners} />
      )}
    </>
  );
}