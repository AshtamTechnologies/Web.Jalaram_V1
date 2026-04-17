import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Plus, Search, X, AlertCircle, Check, Edit2,
  RefreshCw, ChevronUp, ChevronDown,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Loader2, Eye, ArrowLeft, User, Users,
  MessageSquare, MapPin, Phone, Building2,
  Trash2, Shield, Globe,
} from 'lucide-react';
import { apiService } from '../api/api';
import './Common1.css';
import { useResizableColumns } from '../hooks/useResizableColumns';

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];

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
  customerName:   '',
  addressLine1:   '',
  addressLine2:   '',
  addressLine3:   '',
  city:           '',
  district:       '',
  country:        'India',   // hardcoded
  phone1:         '',
  phone2:         '',
  authorizedName: '',
  gstNumber:      '',
};

/* ═══════════════════════════════════════════
   PORTAL DROPDOWN — escapes overflow/backdrop
═══════════════════════════════════════════ */
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
      if (!wrapRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, wrapRef, panelRef, onClose]);
}

/* ═══════════════════════════════════════════
   DISTRICT COMBO
═══════════════════════════════════════════ */
function DistrictCombo({ value, onChange, hasError }) {
  const [open,       setOpen]       = useState(false);
  const [query,      setQuery]      = useState('');
  const wrapRef    = useRef(null);
  const triggerRef = useRef(null);
  const panelRef   = useRef(null);
  const inputRef   = useRef(null);
  const listRef    = useRef(null);

  const close    = useCallback(() => { setOpen(false); setQuery(''); }, []);
  const openDD   = ()  => { setOpen(true); setQuery(''); setTimeout(() => inputRef.current?.focus(), 0); };
  const select   = (d) => { onChange(d); setOpen(false); setQuery(''); };
  const clear    = (e) => { e.stopPropagation(); onChange(''); setOpen(false); setQuery(''); };

  useOutsideClick(wrapRef, panelRef, open, close);

  const filtered = GUJARAT_DISTRICTS.filter(d => d.toLowerCase().includes(query.toLowerCase()));

  const nav = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx   = Array.from(items || []).indexOf(document.activeElement);
    if      (e.key === 'ArrowDown')  { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape')     close();
  };

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        ref={triggerRef}
        className={`pg-field-wrap pg-combo-trigger ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        onClick={openDD}
        tabIndex={0}
        onKeyDown={e => {
          if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDD(); } }
          else nav(e);
        }}
      >
        <MapPin size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
        <span className={`pg-combo-display${!value ? ' pg-combo-display--placeholder' : ''}`}>
          {value || 'Select district…'}
        </span>
        {value
          ? <X size={13} className="pg-combo-clear" onClick={clear} />
          : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
        }
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position: 'static' }}>
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="pg-combo-search__input"
              placeholder="Search district…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); listRef.current?.querySelectorAll('.pg-combo-option')?.[0]?.focus(); }
                else if (e.key === 'Escape') close();
              }}
            />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
          </div>
          <div className="pg-combo-list" ref={listRef}>
            {filtered.length === 0
              ? <div className="pg-combo-empty">No districts match</div>
              : filtered.map(d => (
                <div
                  key={d}
                  className={`pg-combo-option${d === value ? ' pg-combo-option--active' : ''}`}
                  onClick={() => select(d)}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(d); } else nav(e); }}
                >
                  <span className="pg-combo-option__name">{d}</span>
                  {d === value && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                </div>
              ))
            }
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function normalizeCustomer(raw) {
  return {
    customerID:     raw.customerID     ?? raw.CustomerID     ?? 0,
    customerName:   raw.customerName   ?? raw.CustomerName   ?? '',
    addressLine1:   raw.addressLine1   ?? raw.AddressLine1   ?? '',
    addressLine2:   raw.addressLine2   ?? raw.AddressLine2   ?? '',
    addressLine3:   raw.addressLine3   ?? raw.AddressLine3   ?? '',
    city:           raw.city           ?? raw.City           ?? '',
    district:       raw.district       ?? raw.District       ?? '',
    country:        'India',   // always India
    phone1:         raw.phone1         ?? raw.Phone1         ?? '',
    phone2:         raw.phone2         ?? raw.Phone2         ?? '',
    authorizedName: raw.authorizedName ?? raw.AuthorizedName ?? '',
    gstNumber:      raw.gstNumber      ?? raw.GstNumber      ?? '',
    lastUpdatedBy:  raw.lastUpdatedBy  ?? raw.LastUpdatedBy  ?? '',
    lastUpdateDttm: raw.lastUpdateDttm ?? raw.LastUpdateDttm ?? '',
  };
}

function validateForm(form) {
  const e = {};
  if (!form.customerName?.trim())  e.customerName  = 'Customer name is required';
  if (!form.addressLine1?.trim())  e.addressLine1  = 'Address is required';
  if (!form.city?.trim())          e.city          = 'City is required';
  // country is hardcoded to 'India' — no validation needed
  if (!form.phone1?.trim())        e.phone1        = 'Primary phone is required';
  if (form.gstNumber?.trim() && !/^[0-9A-Z]{15}$/.test(form.gstNumber.trim()))
    e.gstNumber = 'GST number must be 15 alphanumeric characters';
  return e;
}

function fullAddress(c) {
  return [c.addressLine1, c.addressLine2, c.addressLine3, c.city, c.district, c.country]
    .filter(Boolean).join(', ');
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

/* ─────────────────────────────────────────
   FIELD HELPERS
───────────────────────────────────────── */
function FieldLabel({ label, required, optional }) {
  return (
    <label className="pg-field-label">
      {label}
      {required && <span className="pg-field-label__required"> *</span>}
      {optional && <span className="pg-field-label__optional"> (optional)</span>}
    </label>
  );
}
function InputWrap({ error, icon: Icon, children }) {
  return (
    <div className={`pg-field-wrap ${error ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
      {Icon && <Icon size={14} color={error ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />}
      {children}
    </div>
  );
}
function FieldError({ msg }) {
  return msg ? (
    <div className="pg-field-error">
      <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} /><span>{msg}</span>
    </div>
  ) : null;
}

/* ─────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────── */
function DeleteConfirmModal({ customer, onConfirm, onCancel }) {
  return (
    <div className="pg-overlay" onClick={onCancel}>
      <div className="exp-delete-modal" onClick={e => e.stopPropagation()}>
        <div className="exp-delete-modal__icon"><Trash2 size={22} color="#dc2626" /></div>
        <div className="exp-delete-modal__title">Delete Customer?</div>
        <div className="exp-delete-modal__sub">
          <strong>{customer.customerName}</strong> will be permanently removed.
        </div>
        <div className="exp-delete-modal__actions">
          <button className="pg-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="exp-btn-delete-confirm" onClick={onConfirm}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   VIEW MODAL
───────────────────────────────────────── */
function CustomerViewModal({ customer, onClose, onEdit }) {
  if (!customer) return null;

  const rows = [
    { label: 'Address Line 1',   value: customer.addressLine1,   Icon: MapPin    },
    { label: 'Address Line 2',   value: customer.addressLine2,   Icon: MapPin    },
    { label: 'Address Line 3',   value: customer.addressLine3,   Icon: MapPin    },
    { label: 'City',             value: customer.city,           Icon: Building2 },
    { label: 'District',         value: customer.district,       Icon: Building2 },
    { label: 'Country',          value: customer.country,        Icon: Building2 },
    { label: 'Phone 1',          value: customer.phone1,         Icon: Phone     },
    { label: 'Phone 2',          value: customer.phone2,         Icon: Phone     },
    { label: 'Authorized Name',  value: customer.authorizedName, Icon: User      },
    { label: 'GST Number',       value: customer.gstNumber,      Icon: Shield    },
  ].filter(r => r.value?.trim());

  return (
    <div className="pg-overlay" onClick={onClose}>
      <div className="pg-modal lc-view-modal" onClick={e => e.stopPropagation()}>
        {/* Banner */}
        <div className="lc-view-banner">
          <button className="pg-view__close" onClick={onClose}><X size={14} /></button>
          <div className="lc-view-banner__inner">
            <div className="lc-view-banner__icon">
              <Users size={22} color="#fff" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="lc-view-banner__id">Customer #{customer.customerID}</div>
              <div className="lc-view-banner__owner">{customer.customerName}</div>
            </div>
          </div>
          {customer.city && (
            <div className="lc-view-banner__site">
              <MapPin size={12} />
              <span>{[customer.city, customer.district, customer.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="pg-view__body">
          <div className="row g-3 mt-0">
            {rows.map(f => (
              <div key={f.label} className="col-6">
                <div className="pg-info-row">
                  <div className="pg-info-row__icon pg-info-row__icon--highlight">
                    <f.Icon size={14} color="#049edf" />
                  </div>
                  <div className="pg-info-row__content">
                    <div className="pg-info-row__label">{f.label}</div>
                    <div className="pg-info-row__value">{f.value}</div>
                  </div>
                </div>
              </div>
            ))}
            {customer.lastUpdatedBy && (
              <div className="col-12">
                <div className="pg-info-row">
                  <div className="pg-info-row__icon"><User size={14} color="#9090a8" /></div>
                  <div className="pg-info-row__content">
                    <div className="pg-info-row__label">Last Updated By</div>
                    <div className="pg-info-row__value">{customer.lastUpdatedBy}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pg-view__foot">
          <button className="pg-btn-cancel" onClick={onClose}>Close</button>
          <button className="pg-view__btn-edit" onClick={() => { onClose(); onEdit(); }}>
            <Edit2 size={13} /> Edit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CUSTOMER FORM  (Add / Edit)
═══════════════════════════════════════════ */
function CustomerForm({ mode, customer, onBack, onSave }) {
  const isAdd = mode === 'add';

  const [form, setForm] = useState(() =>
    isAdd ? { ...EMPTY_FORM } : {
      customerName:   customer?.customerName   ?? '',
      addressLine1:   customer?.addressLine1   ?? '',
      addressLine2:   customer?.addressLine2   ?? '',
      addressLine3:   customer?.addressLine3   ?? '',
      city:           customer?.city           ?? '',
      district:       customer?.district       ?? '',
      country:        'India',   // hardcoded
      phone1:         customer?.phone1         ?? '',
      phone2:         customer?.phone2         ?? '',
      authorizedName: customer?.authorizedName ?? '',
      gstNumber:      customer?.gstNumber      ?? '',
    }
  );

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [apiErr, setApiErr] = useState('');

  const set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
  };

  const handleSave = async () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true); setApiErr('');
    try {
      const payload = { ...form, customerID: isAdd ? 0 : customer.customerID };
      let saved;
      if (isAdd) {
        const res = await apiService.createCustomer(payload);
        saved = normalizeCustomer(res?.data ?? res ?? payload);
      } else {
        const res = await apiService.updateCustomer(payload);
        saved = normalizeCustomer(res?.data ?? res ?? { ...payload });
      }
      setSaveOk(true);
      await new Promise(r => setTimeout(r, 700));
      onSave(saved, isAdd);
      onBack();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Save failed.';
      setApiErr(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setSaving(false); }
  };

  return (
    <div className="hd-form-page">
      {/* Top bar */}
      <div className="hd-topbar">
        <div className="hd-topbar-left">
          <button className="hd-back-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span className="d-none d-sm-inline">Back to Customers</span>
            <span className="d-inline d-sm-none">Back</span>
          </button>
          <div className="hd-topbar-divider" />
          <div>
            <div className="hd-topbar-title">
              {isAdd ? 'Add New Customer' : `Edit Customer #${customer?.customerID}`}
            </div>
            <div className="hd-topbar-sub">
              {isAdd ? 'Fill in the details to create a new customer' : 'Update customer details'}
            </div>
          </div>
        </div>
      </div>

      <div className="hd-form-body">
        <div className="container-fluid px-0">
          {apiErr && (
            <div className="pg-field-error hd-api-error mb-3">
              <AlertCircle size={14} /><span>{apiErr}</span>
            </div>
          )}

          <div className="row g-4">

            {/* ── Basic Info ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><Users size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Basic Information</div>
                    <div className="hd-section-sub">Customer name and contact person</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Customer Name" required />
                      <InputWrap error={errors.customerName} icon={Users}>
                        <input className="pg-field-input" placeholder="e.g. Jalaram Advertising"
                          value={form.customerName} onChange={e => set('customerName', e.target.value)} />
                      </InputWrap>
                      <FieldError msg={errors.customerName} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Authorized Person Name" optional />
                      <InputWrap error={errors.authorizedName} icon={User}>
                        <input className="pg-field-input" placeholder="e.g. Ramesh Patel"
                          value={form.authorizedName} onChange={e => set('authorizedName', e.target.value)} />
                      </InputWrap>
                      <FieldError msg={errors.authorizedName} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Contact ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><Phone size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Contact Details</div>
                    <div className="hd-section-sub">Phone numbers for this customer</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Phone 1" required />
                      <InputWrap error={errors.phone1} icon={Phone}>
                        <input className="pg-field-input" placeholder="e.g. 9876543210"
                          value={form.phone1} onChange={e => set('phone1', e.target.value)} />
                      </InputWrap>
                      <FieldError msg={errors.phone1} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Phone 2" optional />
                      <InputWrap error={errors.phone2} icon={Phone}>
                        <input className="pg-field-input" placeholder="e.g. 9876543211"
                          value={form.phone2} onChange={e => set('phone2', e.target.value)} />
                      </InputWrap>
                      <FieldError msg={errors.phone2} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Address ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><MapPin size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Address</div>
                    <div className="hd-section-sub">Full address of the customer</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <FieldLabel label="Address Line 1" required />
                      <InputWrap error={errors.addressLine1} icon={MapPin}>
                        <input className="pg-field-input" placeholder="Street / Building name"
                          value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} />
                      </InputWrap>
                      <FieldError msg={errors.addressLine1} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Address Line 2" optional />
                      <InputWrap icon={MapPin}>
                        <input className="pg-field-input" placeholder="Area / Locality"
                          value={form.addressLine2} onChange={e => set('addressLine2', e.target.value)} />
                      </InputWrap>
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Address Line 3" optional />
                      <InputWrap icon={MapPin}>
                        <input className="pg-field-input" placeholder="Landmark"
                          value={form.addressLine3} onChange={e => set('addressLine3', e.target.value)} />
                      </InputWrap>
                    </div>
                    <div className="col-12 col-md-4">
                      <FieldLabel label="City" required />
                      <InputWrap error={errors.city} icon={Building2}>
                        <input className="pg-field-input" placeholder="e.g. Anand"
                          value={form.city} onChange={e => set('city', e.target.value)} />
                      </InputWrap>
                      <FieldError msg={errors.city} />
                    </div>
                    <div className="col-12 col-md-4">
                      <FieldLabel label="District" optional />
                      <DistrictCombo
                        value={form.district}
                        onChange={val => set('district', val)}
                        hasError={!!errors.district}
                      />
                      <FieldError msg={errors.district} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="pg-field-label">
                        Country <span style={{ fontSize: 11, color: '#049edf', fontWeight: 700 }}>🔒 Fixed</span>
                      </label>
                      <div className="pg-field-wrap pg-field-wrap--readonly">
                        <Globe size={14} color="#049edf" style={{ flexShrink: 0 }} />
                        <input readOnly value="India" className="pg-field-input pg-field-input--readonly" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── GST ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><Shield size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Tax Information</div>
                    <div className="hd-section-sub">GST registration details</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FieldLabel label="GST Number" optional />
                      <InputWrap error={errors.gstNumber} icon={Shield}>
                        <input
                          className="pg-field-input"
                          placeholder="e.g. 24AAAAA0000A1Z5"
                          value={form.gstNumber}
                          onChange={e => set('gstNumber', e.target.value.toUpperCase())}
                          maxLength={15}
                          style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        />
                      </InputWrap>
                      <FieldError msg={errors.gstNumber} />
                      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#b0b0c8', fontWeight: 600, marginTop: 4 }}>
                        15-character alphanumeric GST identification number
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="hd-form-footer hd-form-footer--sticky">
        <button className="pg-btn-cancel" onClick={onBack} disabled={saving}>Cancel</button>
        <button className="pg-btn-save" onClick={handleSave} disabled={saving}>
          {saveOk
            ? <><Check size={13} /> Saved!</>
            : saving
              ? <><Loader2 size={13} className="pg-spin" /> Saving...</>
              : <><Check size={13} /> {isAdd ? 'Save Customer' : 'Update Customer'}</>}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function CustomerPage() {
  const [customers,   setCustomers]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState('');

  const [view,        setView]        = useState('grid');   // 'grid' | 'form'
  const [formMode,    setFormMode]    = useState(null);     // 'add' | 'edit'
  const [editTarget,  setEditTarget]  = useState(null);
  const [viewTarget,  setViewTarget]  = useState(null);
  const [deleteTarget,setDeleteTarget]= useState(null);

  const [search,      setSearch]      = useState('');
  const [sortKey,     setSortKey]     = useState('customerName');
  const [sortDir,     setSortDir]     = useState('asc');
  const [page,        setPage]        = useState(1);
  const [pageSize,    setPageSize]    = useState(10);

  /* ── Resizable columns ── */
  const tableRef    = useRef(null);
  const [tableReady, setTableReady] = useState(false);
  useEffect(() => { if (!loading) setTableReady(true); }, [loading]);
  useResizableColumns(tableRef, tableReady, [60, 180, 140, 130, 130, 130, 90]);

  /* ── Fetch ── */
  const fetchCustomers = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const raw  = await apiService.getAllCustomers();
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      setCustomers(list.map(normalizeCustomer));
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Failed to load customers.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  /* ── Save handler ── */
  const handleSave = (record, isNew) => {
    if (isNew) setCustomers(prev => [record, ...prev]);
    else setCustomers(prev => prev.map(c => c.customerID === record.customerID ? record : c));
  };

  /* ── Delete handler ── */
  const handleDelete = async (id) => {
    try {
      await apiService.deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.customerID !== id));
    } catch (err) { console.error('Delete failed:', err); }
    finally { setDeleteTarget(null); }
  };

  /* ── Filter + sort ── */
  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      c.customerName.toLowerCase().includes(q)   ||
      c.phone1.toLowerCase().includes(q)          ||
      c.city.toLowerCase().includes(q)            ||
      c.gstNumber.toLowerCase().includes(q)       ||
      c.authorizedName.toLowerCase().includes(q)  ||
      String(c.customerID).includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = String(a[sortKey] ?? '').toLowerCase();
    const bv = String(b[sortKey] ?? '').toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  /* ── Page numbers ── */
  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('...');
      acc.push(p);
      return acc;
    }, []);

  const COLS = [
    { key: 'customerID',     label: '#ID' },
    { key: 'customerName',   label: 'Customer Name' },
    { key: 'phone1',         label: 'Phone',        tabletHide: true },
    { key: 'city',           label: 'City' },
    { key: 'authorizedName', label: 'Auth. Person',  tabletHide: true },
    { key: 'gstNumber',      label: 'GST No.',       tabletHide: true },
    { key: '_action',        label: 'Actions',       noSort: true },
  ];

  /* ── Form view ── */
  if (view === 'form') {
    return (
      <CustomerForm
        mode={formMode}
        customer={editTarget}
        onBack={() => { setView('grid'); setEditTarget(null); }}
        onSave={handleSave}
      />
    );
  }

  /* ── Stats ── */
  const citySet    = new Set(customers.map(c => c.city).filter(Boolean));
  const gstCount   = customers.filter(c => c.gstNumber?.trim()).length;

  return (
    <div className="pg-page">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-header__title">Customers</h1>
          <p className="pg-header__subtitle">
            Manage all customer records and their contact details
            {customers.length > 0 && <> — <strong>{customers.length}</strong> total</>}
          </p>
        </div>
        <button
          className="pg-btn-add"
          onClick={() => { setFormMode('add'); setEditTarget(null); setView('form'); }}
          disabled={loading}
        >
          <Plus size={14} /> Add Customer
        </button>
      </div>

      {/* Stats strip */}
      {/* {!loading && customers.length > 0 && (
        <div className="exp-stats-strip">
          {[
            { icon: <Users size={16} color="#049edf" />,    bg: 'rgba(4,158,223,0.1)',  label: 'Total Customers', val: customers.length },
            { icon: <MapPin size={16} color="#6c63ff" />,   bg: 'rgba(108,99,255,0.1)', label: 'Cities',          val: citySet.size },
            { icon: <Shield size={16} color="#16a34a" />,   bg: 'rgba(22,163,74,0.1)',  label: 'GST Registered',  val: gstCount },
            { icon: <User   size={16} color="#d97706" />,   bg: 'rgba(217,119,6,0.1)',  label: 'With Auth Person', val: customers.filter(c => c.authorizedName?.trim()).length },
          ].map(s => (
            <div key={s.label} className="exp-stat-item">
              <div className="exp-stat-item__icon" style={{ background: s.bg }}>{s.icon}</div>
              <div>
                <div className="exp-stat-item__label">{s.label}</div>
                <div className="exp-stat-item__val">{s.val}</div>
              </div>
            </div>
          ))}
        </div>
      )} */}

      {/* Load error */}
      {loadError && (
        <div className="pg-field-error hd-api-error mb-3" style={{ margin: '0 0 16px 0' }}>
          <AlertCircle size={14} /><span>{loadError}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
            onClick={fetchCustomers}>Retry</button>
        </div>
      )}

      <div className="pg-container">
        {/* Toolbar */}
        <div className="pg-toolbar">
          <div className="pg-toolbar__inner">
            <div className="pg-toolbar__count">
              <Users size={14} color="#9090a8" />
              <span><strong>{loading ? '...' : filtered.length}</strong> customer{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="pg-search-box">
              <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input
                placeholder="Search name, phone, city, GST..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
            </div>
            <button className="pg-pg-btn" onClick={fetchCustomers} title="Refresh"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={13} className={loading ? 'pg-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#9090a8' }}>
            <Loader2 size={28} className="pg-spin" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13 }}>Loading customers...</div>
          </div>
        )}

        {/* Empty state */}
        {!loading && customers.length === 0 && (
          <div className="pg-empty" style={{ padding: '70px 20px' }}>
            <div className="pg-empty__inner">
              <Users size={42} color="#d0d0e8" />
              <span className="pg-empty__label">No customers added yet</span>
              <span style={{ fontSize: 12, color: '#b0b0c8' }}>
                Click <strong>Add Customer</strong> to create the first one
              </span>
            </div>
          </div>
        )}

        {/* ── Desktop Table ── */}
        {!loading && customers.length > 0 && (
          <div className="pg-desktop-table">
            <table className="pg-table" ref={tableRef}>
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th key={col.key}
                      className={['pg-th', !col.noSort && 'pg-th--sort', col.tabletHide && 'pg-tablet-hide'].filter(Boolean).join(' ')}
                      onClick={() => !col.noSort && handleSort(col.key)}>
                      <div className="pg-th__inner">
                        {col.label}
                        {!col.noSort && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="pg-td pg-empty">
                      <div className="pg-empty__inner">
                        <Users size={36} color="#d0d0e8" />
                        <span className="pg-empty__label">No customers match your search</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(c => (
                  <tr key={c.customerID} className="pg-tr">
                    {/* ID */}
                    <td className="pg-td">
                      <span className="lc-id-badge">#{c.customerID}</span>
                    </td>
                    {/* Name */}
                    <td className="pg-td">
                      <div className="pg-td__primary" style={{ fontWeight: 700 }}>{c.customerName}</div>
                      {c.authorizedName && (
                        <div style={{ fontSize: 11, color: '#9090a8', fontWeight: 600, marginTop: 2 }}>
                          {c.authorizedName}
                        </div>
                      )}
                    </td>
                    {/* Phone */}
                    <td className="pg-td pg-tablet-hide">
                      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#1a1a2e' }}>{c.phone1 || '—'}</div>
                      {c.phone2 && <div style={{ fontSize: 11, color: '#9090a8', fontWeight: 600 }}>{c.phone2}</div>}
                    </td>
                    {/* City */}
                    <td className="pg-td">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {c.city && <MapPin size={11} color="#c0c0d8" />}
                        <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 600, color: '#4a5568' }}>
                          {[c.city, c.district].filter(Boolean).join(', ') || '—'}
                        </span>
                      </div>
                    </td>
                    {/* Auth person */}
                    <td className="pg-td pg-tablet-hide">
                      <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 600, color: '#4a5568' }}>
                        {c.authorizedName || '—'}
                      </span>
                    </td>
                    {/* GST */}
                    <td className="pg-td pg-tablet-hide">
                      {c.gstNumber ? (
                        <span style={{
                          fontFamily: 'Nunito, sans-serif', fontSize: 11.5, fontWeight: 800,
                          color: '#16a34a', background: '#f0fdf4',
                          border: '1px solid #bbf7d0', borderRadius: 6,
                          padding: '2px 7px', letterSpacing: '0.04em',
                        }}>
                          {c.gstNumber}
                        </span>
                      ) : <span style={{ color: '#c0c0d8', fontSize: 12 }}>—</span>}
                    </td>
                    {/* Actions */}
                    <td className="pg-td">
                      <div className="pg-action-wrap">
                        <button className="pg-btn-view" title="View"
                          onClick={() => setViewTarget(c)}>
                          <Eye size={13} />
                        </button>
                        <button className="pg-btn-view" title="Edit"
                          onClick={() => { setFormMode('edit'); setEditTarget(c); setView('form'); }}>
                          <Edit2 size={13} />
                        </button>
                        <button className="exp-btn-delete" title="Delete"
                          onClick={() => setDeleteTarget(c)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Mobile Cards ── */}
        {!loading && customers.length > 0 && (
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <Users size={36} color="#d0d0e8" />
                <span className="pg-empty__label">No customers match</span>
              </div>
            ) : paginated.map(c => (
              <div key={c.customerID} className="pg-card">
                <div className="pg-card__header">
                  <div className="pg-card__title-wrap">
                    <div className="pg-card__title">
                      <span className="lc-id-badge">#{c.customerID}</span>&nbsp; {c.customerName}
                    </div>
                    {c.authorizedName && (
                      <div className="pg-card__subtitle">{c.authorizedName}</div>
                    )}
                  </div>
                  <div className="pg-card__actions">
                    <button className="pg-card__btn-edit" onClick={() => setViewTarget(c)} title="View">
                      <Eye size={13} />
                    </button>
                    <button className="pg-card__btn-view"
                      onClick={() => { setFormMode('edit'); setEditTarget(c); setView('form'); }}
                      title="Edit">
                      <Edit2 size={13} />
                    </button>
                    <button className="exp-btn-delete" onClick={() => setDeleteTarget(c)} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="pg-card__body">
                  {c.phone1 && (
                    <div className="pg-card__row">
                      <Phone size={12} color="#c0c0d8" className="pg-card__row-icon" />
                      <span className="pg-card__row-text">{c.phone1}{c.phone2 ? ` · ${c.phone2}` : ''}</span>
                    </div>
                  )}
                  {(c.city || c.district) && (
                    <div className="pg-card__row">
                      <MapPin size={12} color="#c0c0d8" className="pg-card__row-icon" />
                      <span className="pg-card__row-text">{[c.city, c.district, c.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {c.gstNumber && (
                    <div className="pg-card__row">
                      <Shield size={12} color="#c0c0d8" className="pg-card__row-icon" />
                      <span className="pg-card__row-text" style={{ fontWeight: 800, color: '#16a34a', letterSpacing: '0.04em' }}>{c.gstNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && customers.length > 0 && (
          <div className="pg-pagination">
            <div className="pg-pagination__left">
              <button className="pg-pg-btn" disabled={page === 1}           onClick={() => setPage(1)}><ChevronsLeft  size={13} /></button>
              <button className="pg-pg-btn" disabled={page === 1}           onClick={() => setPage(p => p - 1)}><ChevronLeft  size={13} /></button>
              {pageNums.map((p, i) => p === '...'
                ? <span key={`e${i}`} className="pg-pg-ellipsis">...</span>
                : <button key={p} className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              )}
              <button className="pg-pg-btn" disabled={page === totalPages}  onClick={() => setPage(p => p + 1)}><ChevronRight  size={13} /></button>
              <button className="pg-pg-btn" disabled={page === totalPages}  onClick={() => setPage(totalPages)}><ChevronsRight size={13} /></button>
            </div>
            <div className="pg-pagination__right">
              <select className="pg-pagesize-select" value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="pg-pagination__text">Items per page</span>
              <span className="pg-pagination__text">{page} of {totalPages} pages ({sorted.length} items)</span>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewTarget && (
        <CustomerViewModal
          customer={viewTarget}
          onClose={() => setViewTarget(null)}
          onEdit={() => { setFormMode('edit'); setEditTarget(viewTarget); setView('form'); setViewTarget(null); }}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          customer={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget.customerID)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}