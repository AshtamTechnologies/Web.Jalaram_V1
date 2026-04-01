import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, X, AlertCircle, Check, Edit2,
  RefreshCw, Calendar, ChevronUp, ChevronDown,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Loader2, FileText, Eye, ArrowLeft, Building2, User,
  IndianRupee, MapPin, Clock, Hash, Upload, Trash2,
  ShieldCheck, MessageSquare, CreditCard, TrendingUp,
} from 'lucide-react';
import { apiService } from '../api/api';
import './Common1.css';


/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];

const STATUS_OPTIONS = ['Active', 'Expired', 'Terminated', 'Pending'];

const PAYMENT_FREQ_OPTIONS = [
  { id: 1, label: 'Monthly'    },
  { id: 2, label: 'Quarterly'  },
  { id: 3, label: 'Half-Yearly'},
  { id: 4, label: 'Yearly'     },
];

const EMPTY_FORM = {
  ownerID:            '',
  siteID:             '',
  startDate:          '',
  endDate:            '',
  totalContractValue: '',
  paymentFreqID:      '',
  amountPerFreq:      '',
  advancePaid:        '',
  status:             'Active',
  landContractdocument: null,
  comments:           '',
};

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return d; }
}
function fmtCurrency(v) {
  if (v === '' || v == null || isNaN(Number(v))) return '—';
  return '₹' + Number(v).toLocaleString('en-IN');
}
function freqLabel(id) {
  return PAYMENT_FREQ_OPTIONS.find(f => f.id === Number(id))?.label || '—';
}
function statusStyle(s) {
  switch (s) {
    case 'Active':     return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
    case 'Expired':    return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    case 'Terminated': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    case 'Pending':    return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    default:           return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
  }
}

/* Validation — mirrors DB constraints */
function validateForm(form) {
  const e = {};
  if (!form.ownerID)            e.ownerID            = 'Owner is required';
  if (!form.siteID)             e.siteID             = 'Site is required';
  if (!form.startDate)          e.startDate          = 'Start date is required';
  if (!form.endDate)            e.endDate            = 'End date is required';
  if (form.startDate && form.endDate && form.endDate <= form.startDate)
                                e.endDate            = 'End date must be after start date';
  if (form.totalContractValue === '' || form.totalContractValue == null)
                                e.totalContractValue = 'Total contract value is required';
  else if (isNaN(Number(form.totalContractValue)) || Number(form.totalContractValue) < 0)
                                e.totalContractValue = 'Must be a valid positive number';
  if (!form.paymentFreqID)      e.paymentFreqID      = 'Payment frequency is required';
  if (form.amountPerFreq === '' || form.amountPerFreq == null)
                                e.amountPerFreq      = 'Amount per frequency is required';
  else if (isNaN(Number(form.amountPerFreq)) || Number(form.amountPerFreq) < 0)
                                e.amountPerFreq      = 'Must be a valid positive number';
  if (form.advancePaid !== '' && form.advancePaid != null && isNaN(Number(form.advancePaid)))
                                e.advancePaid        = 'Must be a valid number';
  if (!form.status)             e.status             = 'Status is required';
  return e;
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
   FORM FIELD HELPERS
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
function InputWrap({ error, readOnly, icon: Icon, children }) {
  return (
    <div className={`pg-field-wrap ${error ? 'pg-field-wrap--error' : readOnly ? 'pg-field-wrap--readonly' : 'pg-field-wrap--normal'}`}>
      {Icon && <Icon size={14} color={error ? '#ef4444' : readOnly ? '#049edf' : '#c0c0d8'} style={{ flexShrink: 0 }} />}
      {children}
    </div>
  );
}
function FieldError({ msg }) {
  return msg ? (
    <div className="pg-field-error">
      <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{msg}</span>
    </div>
  ) : null;
}

/* ─────────────────────────────────────────
   OWNER SEARCH WIDGET
───────────────────────────────────────── */
function OwnerSearchWidget({ owners, value, onChange, error, disabled }) {
  const [query, setQuery]     = useState('');
  const [open, setOpen]       = useState(false);
  const [results, setResults] = useState([]);
  const wrapRef               = useRef(null);

  const selected = owners.find(o => o.ownerID === Number(value));

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(
      owners.filter(o =>
        (o.ownerName || '').toLowerCase().includes(q) ||
        (o.phone     || '').toLowerCase().includes(q) ||
        String(o.ownerID).includes(q)
      ).slice(0, 10)
    );
  }, [query, owners]);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="lc-search-widget" ref={wrapRef}>
      {!disabled && (
        <div
          className={`pg-field-wrap ${error ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
          style={{ cursor: 'text' }}
          onClick={() => setOpen(true)}
        >
          <Search size={14} color={error ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
          <input
            className="pg-field-input"
            placeholder="Search owner by name or phone…"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            autoComplete="off"
          />
          {query && <X size={12} style={{ cursor: 'pointer', color: '#c0c0d8' }} onClick={e => { e.stopPropagation(); setQuery(''); setResults([]); }} />}
        </div>
      )}

      {open && results.length > 0 && (
        <div className="lc-dropdown">
          {results.map(o => (
            <div key={o.ownerID} className="lc-dropdown-option" onMouseDown={() => { onChange(o.ownerID); setQuery(''); setOpen(false); setResults([]); }}>
              <div className="lc-dropdown-option__name"><User size={12} /> {o.ownerName}</div>
              {o.phone && <div className="lc-dropdown-option__sub">{o.phone}</div>}
            </div>
          ))}
        </div>
      )}
      {open && query.trim() && results.length === 0 && (
        <div className="lc-dropdown">
          <div className="lc-dropdown-empty"><User size={18} /><span>No owners found</span></div>
        </div>
      )}

      {value && selected && (
        <div className="lc-selected-card">
          <div className="lc-selected-card__icon"><User size={15} color="#049edf" /></div>
          <div className="lc-selected-card__info">
            <div className="lc-selected-card__name">{selected.ownerName}</div>
            {selected.phone && <div className="lc-selected-card__sub">{selected.phone}</div>}
          </div>
          {!disabled && (
            <button className="lc-selected-card__clear" onClick={() => onChange('')} title="Clear"><X size={12} /></button>
          )}
        </div>
      )}
      {value && !selected && (
        <div className="lc-selected-card">
          <div className="lc-selected-card__icon"><User size={15} color="#049edf" /></div>
          <div className="lc-selected-card__info">
            <div className="lc-selected-card__name">Owner ID: {value}</div>
          </div>
          {!disabled && <button className="lc-selected-card__clear" onClick={() => onChange('')}><X size={12} /></button>}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   SITE SEARCH WIDGET
───────────────────────────────────────── */
function SiteSearchWidget({ sites, value, onChange, error, disabled }) {
  const [query, setQuery]     = useState('');
  const [open, setOpen]       = useState(false);
  const [results, setResults] = useState([]);
  const wrapRef               = useRef(null);

  const selected = sites.find(s => s.siteID === Number(value));

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(
      sites.filter(s =>
        (s.addressLine1 || '').toLowerCase().includes(q) ||
        (s.city         || '').toLowerCase().includes(q) ||
        (s.district     || '').toLowerCase().includes(q) ||
        (s.landmark     || '').toLowerCase().includes(q) ||
        String(s.siteID).includes(q)
      ).slice(0, 10)
    );
  }, [query, sites]);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const addrStr = (s) =>
    [s.addressLine1, s.addressLine2, s.landmark, s.city, s.district].filter(Boolean).join(', ');

  return (
    <div className="lc-search-widget" ref={wrapRef}>
      {!disabled && (
        <div
          className={`pg-field-wrap ${error ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
          style={{ cursor: 'text' }}
          onClick={() => setOpen(true)}
        >
          <Search size={14} color={error ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
          <input
            className="pg-field-input"
            placeholder="Search site by address, city, district…"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            autoComplete="off"
          />
          {query && <X size={12} style={{ cursor: 'pointer', color: '#c0c0d8' }} onClick={e => { e.stopPropagation(); setQuery(''); setResults([]); }} />}
        </div>
      )}

      {open && results.length > 0 && (
        <div className="lc-dropdown">
          {results.map(s => (
            <div key={s.siteID} className="lc-dropdown-option" onMouseDown={() => { onChange(s.siteID); setQuery(''); setOpen(false); setResults([]); }}>
              <div className="lc-dropdown-option__name"><MapPin size={12} /> {addrStr(s) || `Site #${s.siteID}`}</div>
              {s.city && <div className="lc-dropdown-option__sub">{[s.city, s.district].filter(Boolean).join(', ')}</div>}
            </div>
          ))}
        </div>
      )}
      {open && query.trim() && results.length === 0 && (
        <div className="lc-dropdown">
          <div className="lc-dropdown-empty"><MapPin size={18} /><span>No sites found</span></div>
        </div>
      )}

      {value && selected && (
        <div className="lc-selected-card">
          <div className="lc-selected-card__icon"><MapPin size={15} color="#6c63ff" /></div>
          <div className="lc-selected-card__info">
            <div className="lc-selected-card__name" style={{ color: '#6c63ff' }}>{addrStr(selected) || `Site #${selected.siteID}`}</div>
            {selected.city && <div className="lc-selected-card__sub">{[selected.city, selected.district].filter(Boolean).join(', ')}</div>}
          </div>
          {!disabled && (
            <button className="lc-selected-card__clear" onClick={() => onChange('')}><X size={12} /></button>
          )}
        </div>
      )}
      {value && !selected && (
        <div className="lc-selected-card">
          <div className="lc-selected-card__icon"><MapPin size={15} color="#6c63ff" /></div>
          <div className="lc-selected-card__info">
            <div className="lc-selected-card__name">Site ID: {value}</div>
          </div>
          {!disabled && <button className="lc-selected-card__clear" onClick={() => onChange('')}><X size={12} /></button>}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────── */
function DeleteConfirmModal({ contract, onConfirm, onCancel }) {
  return (
    <div className="pg-overlay" onClick={onCancel}>
      <div className="exp-delete-modal" onClick={e => e.stopPropagation()}>
        <div className="exp-delete-modal__icon"><Trash2 size={22} color="#dc2626" /></div>
        <div className="exp-delete-modal__title">Delete Contract?</div>
        <div className="exp-delete-modal__sub">
          Contract <strong>#{contract.landContractID}</strong> will be permanently removed. This action cannot be undone.
        </div>
        <div className="exp-delete-modal__actions">
          <button className="pg-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="exp-btn-delete-confirm" onClick={onConfirm}><Trash2 size={13} /> Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   VIEW MODAL
───────────────────────────────────────── */
function ContractViewModal({ contract, owners, sites, onClose, onEdit }) {
  if (!contract) return null;
  const owner = owners.find(o => o.ownerID === contract.ownerID);
  const site  = sites.find(s => s.siteID  === contract.siteID);
  const addrStr = site
    ? [site.addressLine1, site.addressLine2, site.landmark, site.city, site.district].filter(Boolean).join(', ')
    : `Site ID ${contract.siteID}`;
  const st = statusStyle(contract.status);

  return (
    <div className="pg-overlay" onClick={onClose}>
      <div className="pg-modal lc-view-modal" onClick={e => e.stopPropagation()}>

        {/* Banner */}
        <div className="lc-view-banner">
          <button className="pg-view__close" onClick={onClose}><X size={14} /></button>
          <div className="lc-view-banner__inner">
            <div className="lc-view-banner__icon"><FileText size={22} color="#fff" /></div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="lc-view-banner__id">Contract #{contract.landContractID}</div>
              <div className="lc-view-banner__owner">{owner?.ownerName || `Owner ID ${contract.ownerID}`}</div>
            </div>
            <span className="lc-view-banner__status" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }}>
              {contract.status}
            </span>
          </div>
          <div className="lc-view-banner__site">
            <MapPin size={12} /><span>{addrStr}</span>
          </div>
        </div>

        {/* Body */}
        <div className="pg-view__body">
          <div className="row g-3 mt-0">
            {[
              { label: 'Start Date',  value: fmtDate(contract.startDate),           Icon: Calendar     },
              { label: 'End Date',    value: fmtDate(contract.endDate),             Icon: Calendar     },
              { label: 'Total Value', value: fmtCurrency(contract.totalContractValue), Icon: IndianRupee },
              { label: 'Pay Freq',    value: freqLabel(contract.paymentFreqID),     Icon: CreditCard   },
              { label: 'Amt/Freq',    value: fmtCurrency(contract.amountPerFreq),   Icon: TrendingUp   },
              { label: 'Advance Paid',value: fmtCurrency(contract.advancePaid),     Icon: IndianRupee  },
            ].map(f => (
              <div key={f.label} className="col-6">
                <div className="pg-info-row">
                  <div className="pg-info-row__icon pg-info-row__icon--highlight"><f.Icon size={14} color="#049edf" /></div>
                  <div className="pg-info-row__content">
                    <div className="pg-info-row__label">{f.label}</div>
                    <div className="pg-info-row__value">{f.value}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Status full-width */}
            <div className="col-12">
              <div className="pg-info-row">
                <div className="pg-info-row__icon pg-info-row__icon--highlight"><ShieldCheck size={14} color="#049edf" /></div>
                <div className="pg-info-row__content">
                  <div className="pg-info-row__label">Status</div>
                  <div className="pg-info-row__value">
                    <span className="lc-status-badge" style={{ background: st.bg, color: st.color, borderColor: st.border }}>
                      {contract.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Site */}
            <div className="col-12">
              <div className="pg-info-row">
                <div className="pg-info-row__icon"><MapPin size={14} color="#9090a8" /></div>
                <div className="pg-info-row__content">
                  <div className="pg-info-row__label">Site Address</div>
                  <div className="pg-info-row__value">{addrStr}</div>
                </div>
              </div>
            </div>

            {/* Document */}
            {contract.landContractdocument && (
              <div className="col-12">
                <div className="pg-info-row">
                  <div className="pg-info-row__icon"><Upload size={14} color="#9090a8" /></div>
                  <div className="pg-info-row__content">
                    <div className="pg-info-row__label">Contract Document</div>
                    <div className="pg-info-row__value lc-doc-attached">
                      <FileText size={13} /> Document attached
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comments */}
            {contract.comments && (
              <div className="col-12">
                <div className="pg-info-row">
                  <div className="pg-info-row__icon"><MessageSquare size={14} color="#9090a8" /></div>
                  <div className="pg-info-row__content">
                    <div className="pg-info-row__label">Comments</div>
                    <div className="pg-info-row__value">{contract.comments}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Meta */}
            {contract.lastUpdatedBy && (
              <div className="col-12">
                <div className="pg-info-row">
                  <div className="pg-info-row__icon"><User size={14} color="#9090a8" /></div>
                  <div className="pg-info-row__content">
                    <div className="pg-info-row__label">Last Updated By</div>
                    <div className="pg-info-row__value">{contract.lastUpdatedBy}{contract.lastUpdateDttm && <span style={{ color: '#9090a8', fontWeight: 600, fontSize: 12 }}> · {fmtDate(contract.lastUpdateDttm?.split?.('T')?.[0] ?? '')}</span>}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pg-view__foot">
          <button className="pg-btn-cancel" onClick={onClose}>Close</button>
          <button className="pg-view__btn-edit" onClick={() => { onClose(); onEdit(); }}><Edit2 size={13} /> Edit</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   CONTRACT FORM  (Add / Edit)
───────────────────────────────────────── */
function ContractForm({ mode, contract, owners, sites, onBack, onSave }) {
  const isAdd = mode === 'add';

  const [form, setForm] = useState(() =>
    isAdd
      ? { ...EMPTY_FORM }
      : {
          ownerID:            contract?.ownerID            ?? '',
          siteID:             contract?.siteID             ?? '',
          startDate:          contract?.startDate          ?? '',
          endDate:            contract?.endDate            ?? '',
          totalContractValue: contract?.totalContractValue ?? '',
          paymentFreqID:      contract?.paymentFreqID      ?? '',
          amountPerFreq:      contract?.amountPerFreq      ?? '',
          advancePaid:        contract?.advancePaid        ?? '',
          status:             contract?.status             ?? 'Active',
          landContractdocument: null,
          comments:           contract?.comments           ?? '',
        }
  );
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [saveOk,  setSaveOk]  = useState(false);
  const [apiErr,  setApiErr]  = useState('');
  const fileRef               = useRef(null);

  const set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
  };

  const handleSave = () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true); setApiErr('');
    setTimeout(() => {
      try {
        const now = new Date().toISOString();
        onSave({
          landContractID:       isAdd ? (Date.now() + Math.random()) : contract.landContractID,
          ownerID:              Number(form.ownerID),
          siteID:               Number(form.siteID),
          startDate:            form.startDate,
          endDate:              form.endDate,
          totalContractValue:   Number(form.totalContractValue),
          paymentFreqID:        Number(form.paymentFreqID),
          amountPerFreq:        Number(form.amountPerFreq),
          advancePaid:          form.advancePaid !== '' ? Number(form.advancePaid) : null,
          status:               form.status,
          landContractdocument: form.landContractdocument,
          comments:             form.comments || '',
          lastUpdatedBy:        'Admin',
          lastUpdateDttm:       now,
        }, isAdd);
        setSaving(false); setSaveOk(true);
        setTimeout(() => onBack(), 700);
      } catch (err) {
        setApiErr(err?.message || 'Save failed. Please try again.');
        setSaving(false);
      }
    }, 500);
  };

  return (
    <div className="hd-form-page">
      {/* Top bar */}
      <div className="hd-topbar">
        <div className="hd-topbar-left">
          <button className="hd-back-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span className="d-none d-sm-inline">Back to Contracts</span>
            <span className="d-inline d-sm-none">Back</span>
          </button>
          <div className="hd-topbar-divider" />
          <div>
            <div className="hd-topbar-title">
              {isAdd ? 'Add New Land Contract' : `Edit Contract #${contract?.landContractID}`}
            </div>
            <div className="hd-topbar-sub">
              {isAdd ? 'Fill in the details and save the contract' : 'Update land contract details'}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="hd-form-body">
        <div className="container-fluid px-0">
          {apiErr && (
            <div className="pg-field-error hd-api-error mb-3">
              <AlertCircle size={14} /><span>{apiErr}</span>
            </div>
          )}

          <div className="row g-4">

            {/* ── Section 1: Owner & Site ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><User size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Owner &amp; Site</div>
                    <div className="hd-section-sub">Link this contract to an owner and a site</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Owner" required />
                      <OwnerSearchWidget
                        owners={owners}
                        value={form.ownerID}
                        onChange={val => set('ownerID', val)}
                        error={errors.ownerID}
                        disabled={!isAdd}
                      />
                      <FieldError msg={errors.ownerID} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Site" required />
                      <SiteSearchWidget
                        sites={sites}
                        value={form.siteID}
                        onChange={val => set('siteID', val)}
                        error={errors.siteID}
                        disabled={!isAdd}
                      />
                      <FieldError msg={errors.siteID} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 2: Contract Duration ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><Calendar size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Contract Duration</div>
                    <div className="hd-section-sub">Set the start and end dates for this contract</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Start Date" required />
                      <InputWrap error={errors.startDate} icon={Calendar}>
                        <input
                          className="pg-field-input" type="date"
                          value={form.startDate}
                          onChange={e => set('startDate', e.target.value)}
                        />
                      </InputWrap>
                      <FieldError msg={errors.startDate} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="End Date" required />
                      <InputWrap error={errors.endDate} icon={Calendar}>
                        <input
                          className="pg-field-input" type="date"
                          value={form.endDate}
                          min={form.startDate || undefined}
                          onChange={e => set('endDate', e.target.value)}
                        />
                      </InputWrap>
                      <FieldError msg={errors.endDate} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Status" required />
                      <InputWrap error={errors.status} icon={ShieldCheck}>
                        <select className="pg-field-input" value={form.status} onChange={e => set('status', e.target.value)}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </InputWrap>
                      <FieldError msg={errors.status} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 3: Financial Details ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><IndianRupee size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Financial Details</div>
                    <div className="hd-section-sub">Contract value, payment schedule and advance</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Total Contract Value (₹)" required />
                      <InputWrap error={errors.totalContractValue} icon={IndianRupee}>
                        <input
                          className="pg-field-input" type="number" min="0" step="0.01"
                          placeholder="e.g. 500000"
                          value={form.totalContractValue}
                          onChange={e => set('totalContractValue', e.target.value)}
                        />
                      </InputWrap>
                      <FieldError msg={errors.totalContractValue} />
                    </div>

                    <div className="col-12 col-md-6">
                      <FieldLabel label="Payment Frequency" required />
                      <InputWrap error={errors.paymentFreqID} icon={CreditCard}>
                        <select className="pg-field-input" value={form.paymentFreqID} onChange={e => set('paymentFreqID', e.target.value)}>
                          <option value="">Select frequency…</option>
                          {PAYMENT_FREQ_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                        </select>
                      </InputWrap>
                      <FieldError msg={errors.paymentFreqID} />
                    </div>

                    <div className="col-12 col-md-6">
                      <FieldLabel label="Amount per Frequency (₹)" required />
                      <InputWrap error={errors.amountPerFreq} icon={TrendingUp}>
                        <input
                          className="pg-field-input" type="number" min="0" step="0.01"
                          placeholder="e.g. 25000"
                          value={form.amountPerFreq}
                          onChange={e => set('amountPerFreq', e.target.value)}
                        />
                      </InputWrap>
                      <FieldError msg={errors.amountPerFreq} />
                    </div>

                    <div className="col-12 col-md-6">
                      <FieldLabel label="Advance Paid (₹)" optional />
                      <InputWrap error={errors.advancePaid} icon={IndianRupee}>
                        <input
                          className="pg-field-input" type="number" min="0" step="0.01"
                          placeholder="e.g. 50000"
                          value={form.advancePaid}
                          onChange={e => set('advancePaid', e.target.value)}
                        />
                      </InputWrap>
                      <FieldError msg={errors.advancePaid} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 4: Document & Comments ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><FileText size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Document &amp; Notes</div>
                    <div className="hd-section-sub">Upload contract document and add remarks</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    {/* Document upload */}
                    <div className="col-12">
                      <FieldLabel label="Contract Document" optional />
                      <input
                        ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.png"
                        style={{ display: 'none' }}
                        onChange={e => set('landContractdocument', e.target.files[0] || null)}
                      />
                      {form.landContractdocument ? (
                        <div className="lc-file-attached">
                          <FileText size={15} color="#049edf" />
                          <span className="lc-file-attached__name">{form.landContractdocument.name}</span>
                          <button className="lc-file-attached__remove" onClick={() => { set('landContractdocument', null); fileRef.current.value = ''; }}>
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button className="lc-upload-btn" onClick={() => fileRef.current.click()}>
                          <Upload size={15} />
                          <span>Click to upload PDF, Word or image</span>
                        </button>
                      )}
                      {!isAdd && !form.landContractdocument && contract?.landContractdocument && (
                        <div className="pg-field-hint" style={{ marginTop: 6 }}>
                          ⚠ Previous document on record. Upload new to replace.
                        </div>
                      )}
                    </div>

                    {/* Comments */}
                    <div className="col-12">
                      <FieldLabel label="Comments" optional />
                      <InputWrap error={errors.comments} icon={MessageSquare}>
                        <textarea
                          className="pg-field-input lc-textarea"
                          rows={3}
                          placeholder="Any notes or remarks about this contract…"
                          value={form.comments}
                          onChange={e => set('comments', e.target.value)}
                        />
                      </InputWrap>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="hd-form-footer hd-form-footer--sticky">
        <button className="pg-btn-cancel" onClick={onBack} disabled={saving}>Cancel</button>
        <button className="pg-btn-save" onClick={handleSave} disabled={saving}>
          {saveOk
            ? <><Check size={13} /> Saved!</>
            : saving
              ? <><Loader2 size={13} className="pg-spin" /> Saving…</>
              : <><Check size={13} /> {isAdd ? 'Save Contract' : 'Update Contract'}</>}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function LandContractPage() {
  const [owners,       setOwners]      = useState([]);
  const [sites,        setSites]       = useState([]);
  const [loadingMeta,  setLoadingMeta] = useState(true);
  const [loadError,    setLoadError]   = useState('');
  const [contracts,    setContracts]   = useState([]);

  const [view,         setView]        = useState(() => sessionStorage.getItem('lc_view')     || 'grid');
  const [formMode,     setFormMode]    = useState(() => sessionStorage.getItem('lc_formMode') || null);
  const [editTarget,   setEditTarget]  = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('lc_editTarget')) || null; } catch { return null; }
  });
  const [viewTarget,   setViewTarget]  = useState(null);
  const [deleteTarget, setDeleteTarget]= useState(null);
  const [search,       setSearch]      = useState('');
  const [statusFilter, setStatusFilter]= useState('');
  const [sortKey,      setSortKey]     = useState('startDate');
  const [sortDir,      setSortDir]     = useState('desc');
  const [page,         setPage]        = useState(1);
  const [pageSize,     setPageSize]    = useState(10);

  /* Fetch owners & sites */
  const fetchMeta = useCallback(async () => {
    setLoadingMeta(true); setLoadError('');
    try {
      const [rawOwners, rawSites] = await Promise.all([
        apiService.getAllOwners(),
        apiService.getAllSites(),
      ]);
      setOwners(Array.isArray(rawOwners) ? rawOwners : []);
      setSites(Array.isArray(rawSites)   ? rawSites  : []);
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Failed to load data.');
    } finally { setLoadingMeta(false); }
  }, []);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);
  useEffect(() => {
    sessionStorage.setItem('lc_view',     view);
    sessionStorage.setItem('lc_formMode', formMode || '');
    try { sessionStorage.setItem('lc_editTarget', editTarget ? JSON.stringify(editTarget) : ''); } catch { /* */ }
  }, [view, formMode, editTarget]);

  const handleSave = (record, isNew) => {
    setContracts(prev =>
      isNew
        ? [record, ...prev]
        : prev.map(c => c.landContractID === record.landContractID ? record : c)
    );
  };
  const handleDelete = (id) => {
    setContracts(prev => prev.filter(c => c.landContractID !== id));
    setDeleteTarget(null);
  };

  /* Enrich rows */
  const tableRows = contracts.map(c => {
    const owner = owners.find(o => o.ownerID === c.ownerID);
    const site  = sites.find(s  => s.siteID  === c.siteID);
    return {
      landContractID:    c.landContractID,
      ownerName:         owner?.ownerName || `Owner ID ${c.ownerID}`,
      siteLabel:         site ? [site.addressLine1, site.city].filter(Boolean).join(', ') : `Site ID ${c.siteID}`,
      startDate:         c.startDate   || '',
      endDate:           c.endDate     || '',
      totalContractValue:c.totalContractValue ?? 0,
      paymentFreqID:     c.paymentFreqID,
      status:            c.status || '',
      _raw: c,
    };
  });

  const filtered = tableRows.filter(r => {
    const q = search.toLowerCase();
    const matchQ =
      r.ownerName.toLowerCase().includes(q) ||
      r.siteLabel.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)    ||
      String(r.landContractID).includes(q);
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchQ && matchStatus;
  });

  const sortedRows = [...filtered].sort((a, b) => {
    if (sortKey === 'totalContractValue') {
      return sortDir === 'asc'
        ? a.totalContractValue - b.totalContractValue
        : b.totalContractValue - a.totalContractValue;
    }
    const av = String(a[sortKey] ?? '').toLowerCase();
    const bv = String(b[sortKey] ?? '').toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginated  = sortedRows.slice((page - 1) * pageSize, page * pageSize);
  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const totalValue   = contracts.reduce((s, c) => s + (Number(c.totalContractValue) || 0), 0);
  const activeCount  = contracts.filter(c => c.status === 'Active').length;
  const expiredCount = contracts.filter(c => c.status === 'Expired' || c.status === 'Terminated').length;

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p); return acc;
    }, []);

  const COLS = [
    { key: 'landContractID',     label: '#ID'       },
    { key: 'ownerName',          label: 'Owner'     },
    { key: 'siteLabel',          label: 'Site', tabletHide: true },
    { key: 'startDate',          label: 'Start Date'},
    { key: 'endDate',            label: 'End Date',  tabletHide: true },
    { key: 'totalContractValue', label: 'Total Value'},
    { key: 'status',             label: 'Status'    },
    { key: '_action',            label: 'Actions',  noSort: true },
  ];

  /* FORM VIEW */
  if (view === 'form') {
    return (
      <ContractForm
        mode={formMode}
        contract={editTarget}
        owners={owners}
        sites={sites}
        onBack={() => {
          sessionStorage.removeItem('lc_view');
          sessionStorage.removeItem('lc_formMode');
          sessionStorage.removeItem('lc_editTarget');
          setView('grid'); setEditTarget(null);
        }}
        onSave={handleSave}
      />
    );
  }

  /* GRID VIEW */
  return (
    <div className="pg-page">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-header__title">Land Contracts</h1>
          <p className="pg-header__subtitle">
            Manage all land contracts between owners and sites
            {contracts.length > 0 && <> · Total: <strong>{fmtCurrency(totalValue)}</strong></>}
          </p>
        </div>
        <button
          className="pg-btn-add"
          onClick={() => { setFormMode('add'); setEditTarget(null); setView('form'); }}
          disabled={loadingMeta}
        >
          <Plus size={14} /> Add Contract
        </button>
      </div>

      {/* Stats Strip */}
      {!loadingMeta && contracts.length > 0 && (
        <div className="exp-stats-strip">
          {[
            { icon: <FileText size={16} color="#049edf" />,    bg: 'rgba(4,158,223,0.1)',   label: 'Total Contracts', val: contracts.length    },
            { icon: <IndianRupee size={16} color="#16a34a" />, bg: 'rgba(22,163,74,0.1)',   label: 'Total Value',     val: fmtCurrency(totalValue) },
            { icon: <ShieldCheck size={16} color="#16a34a" />, bg: 'rgba(22,163,74,0.1)',   label: 'Active',          val: activeCount          },
            { icon: <Clock size={16} color="#dc2626" />,       bg: 'rgba(220,38,38,0.08)',  label: 'Expired/Ended',   val: expiredCount         },
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
      )}

      {/* Load error */}
      {loadError && (
        <div className="pg-field-error hd-api-error mb-3" style={{ margin: '0 0 16px 0' }}>
          <AlertCircle size={14} /><span>{loadError}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }} onClick={fetchMeta}>Retry</button>
        </div>
      )}

      <div className="pg-container">
        {/* Toolbar */}
        <div className="pg-toolbar">
          <div className="pg-toolbar__inner">
            <div className="pg-toolbar__count">
              <FileText size={14} color="#9090a8" />
              <span><strong>{loadingMeta ? '…' : filtered.length}</strong> contract{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="pg-search-box">
              <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input
                placeholder="Search owner, site, status…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
            </div>
            <select
              className="hd-filter-select"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              className="pg-pg-btn"
              onClick={fetchMeta}
              title="Refresh"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <RefreshCw size={13} className={loadingMeta ? 'pg-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Loading */}
        {loadingMeta && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#9090a8' }}>
            <Loader2 size={28} className="pg-spin" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13 }}>Loading data…</div>
          </div>
        )}

        {/* Empty */}
        {!loadingMeta && contracts.length === 0 && (
          <div className="pg-empty" style={{ padding: '70px 20px' }}>
            <div className="pg-empty__inner">
              <FileText size={42} color="#d0d0e8" />
              <span className="pg-empty__label">No contracts recorded yet</span>
              <span style={{ fontSize: 12, color: '#b0b0c8', fontFamily: 'Nunito, sans-serif' }}>
                Click <strong>Add Contract</strong> to create the first one
              </span>
            </div>
          </div>
        )}

        {/* Desktop Table */}
        {!loadingMeta && contracts.length > 0 && (
          <div className="pg-desktop-table">
            <table className="pg-table">
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      className={['pg-th', !col.noSort && 'pg-th--sort', col.tabletHide && 'pg-tablet-hide'].filter(Boolean).join(' ')}
                      onClick={() => !col.noSort && handleSort(col.key)}
                    >
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
                  <tr><td colSpan={COLS.length} className="pg-td pg-empty">
                    <div className="pg-empty__inner">
                      <FileText size={36} color="#d0d0e8" />
                      <span className="pg-empty__label">No contracts match your search</span>
                    </div>
                  </td></tr>
                ) : paginated.map(r => {
                  const st = statusStyle(r.status);
                  return (
                    <tr key={r.landContractID} className="pg-tr">
                      <td className="pg-td">
                        <span className="lc-id-badge">#{r.landContractID}</span>
                      </td>
                      <td className="pg-td">
                        <div className="pg-td__primary">{r.ownerName}</div>
                      </td>
                      <td className="pg-td pg-td--overflow pg-tablet-hide">
                        <span className="pg-td__ellipsis" title={r.siteLabel}>{r.siteLabel}</span>
                      </td>
                      <td className="pg-td">
                        <span className="pg-td__primary">{fmtDate(r.startDate)}</span>
                      </td>
                      <td className="pg-td pg-tablet-hide">
                        <span className="pg-td__primary">{fmtDate(r.endDate)}</span>
                      </td>
                      <td className="pg-td">
                        <span className="lc-amount-val">{fmtCurrency(r.totalContractValue)}</span>
                      </td>
                      <td className="pg-td">
                        <span
                          className="lc-status-badge"
                          style={{ background: st.bg, color: st.color, borderColor: st.border }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="pg-td">
                        <div className="pg-action-wrap">
                          <button className="pg-btn-edit" title="View"   onClick={() => setViewTarget(r._raw)}><Eye   size={13} /></button>
                          <button className="pg-btn-view" title="Edit"   onClick={() => { setFormMode('edit'); setEditTarget(r._raw); setView('form'); }}><Edit2 size={13} /></button>
                          <button className="exp-btn-delete" title="Delete" onClick={() => setDeleteTarget(r._raw)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Cards */}
        {!loadingMeta && contracts.length > 0 && (
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <FileText size={36} color="#d0d0e8" />
                <span className="pg-empty__label">No contracts match your search</span>
              </div>
            ) : paginated.map(r => {
              const st = statusStyle(r.status);
              return (
                <div key={r.landContractID} className="pg-card">
                  <div className="pg-card__header">
                    <div className="pg-card__title-wrap">
                      <div className="pg-card__title">
                        <span className="lc-id-badge">#{r.landContractID}</span>&nbsp; {r.ownerName}
                      </div>
                      <div className="pg-card__subtitle">{r.siteLabel}</div>
                    </div>
                    <div className="pg-card__actions">
                      <button className="pg-card__btn-edit" onClick={() => setViewTarget(r._raw)} title="View"><Eye size={13} /></button>
                      <button className="pg-card__btn-view" onClick={() => { setFormMode('edit'); setEditTarget(r._raw); setView('form'); }} title="Edit"><Edit2 size={13} /></button>
                      <button className="exp-btn-delete" onClick={() => setDeleteTarget(r._raw)} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="pg-card__body">
                    <div className="pg-card__row">
                      <Calendar size={12} color="#c0c0d8" className="pg-card__row-icon" />
                      <span className="pg-card__row-text">{fmtDate(r.startDate)} → {fmtDate(r.endDate)}</span>
                    </div>
                    <div className="pg-card__row">
                      <IndianRupee size={12} color="#c0c0d8" className="pg-card__row-icon" />
                      <span className="pg-card__row-text" style={{ fontWeight: 800, color: '#1a1a2e' }}>{fmtCurrency(r.totalContractValue)}</span>
                    </div>
                    <div className="pg-card__row">
                      <ShieldCheck size={12} color="#c0c0d8" className="pg-card__row-icon" />
                      <span className="lc-status-badge" style={{ background: st.bg, color: st.color, borderColor: st.border }}>{r.status}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loadingMeta && contracts.length > 0 && (
          <div className="pg-pagination">
            <div className="pg-pagination__left">
              <button className="pg-pg-btn" disabled={page === 1}          onClick={() => setPage(1)}><ChevronsLeft  size={13} /></button>
              <button className="pg-pg-btn" disabled={page === 1}          onClick={() => setPage(p => p - 1)}><ChevronLeft  size={13} /></button>
              {pageNums.map((p, i) => p === '…'
                ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span>
                : <button key={p} className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              )}
              <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight  size={13} /></button>
              <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={13} /></button>
            </div>
            <div className="pg-pagination__right">
              <select className="pg-pagesize-select" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="pg-pagination__text">Items per page</span>
              <span className="pg-pagination__text">{page} of {totalPages} pages ({sortedRows.length} items)</span>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewTarget && (
        <ContractViewModal
          contract={viewTarget}
          owners={owners}
          sites={sites}
          onClose={() => setViewTarget(null)}
          onEdit={() => { setFormMode('edit'); setEditTarget(viewTarget); setView('form'); setViewTarget(null); }}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          contract={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget.landContractID)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}