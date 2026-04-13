import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, X, AlertCircle, Check, Edit2,
  RefreshCw, Calendar, ChevronUp, ChevronDown,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Loader2, FileText, ArrowLeft, Building2, User,
  IndianRupee, ShieldCheck, MessageSquare,
  CreditCard, TrendingUp, Hash, Landmark, Banknote,
  Receipt, Clock, CheckCircle2,
} from 'lucide-react';
import { apiService } from '../api/api';
import './Common1.css';
import { useResizableColumns } from '../hooks/useResizableColumns';

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];

const PAYMENT_MODE_OPTIONS = [
  { value: 'Cash',          label: 'Cash' },
  { value: 'Cheque',        label: 'Cheque' },
  { value: 'NEFT',          label: 'NEFT' },
  { value: 'RTGS',          label: 'RTGS' },
  { value: 'UPI',           label: 'UPI' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Demand Draft',  label: 'Demand Draft' },
];

const PAYMENT_PURPOSE_OPTIONS = [
  { value: 'Monthly Rent',       label: 'Monthly Rent' },
  { value: 'Quarterly Rent',     label: 'Quarterly Rent' },
  { value: 'Advance Payment',    label: 'Advance Payment' },
  { value: 'Security Deposit',   label: 'Security Deposit' },
  { value: 'Half-Yearly Rent',   label: 'Half-Yearly Rent' },
  { value: 'Yearly Rent',        label: 'Yearly Rent' },
  { value: 'Other',              label: 'Other' },
];

const EMPTY_FORM = {
  ownerID: '',
  landContractID: '',
  hoardingID: '',
  paymentDate: '',
  paymentPurpose: '',
  amountPaid: '',
  paymentMode: '',
  nextDueDate: '',
  bankName: '',
  referenceNumber: '',
  paidBy: '',
  comments: '',
};

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '—';
  try {
    const s = typeof d === 'string' ? d.split('T')[0] : d;
    return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return d; }
}

function fmtNumber(v) {
  if (v === '' || v == null || isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('en-IN');
}

function fmtCurrency(v) {
  if (v === '' || v == null || isNaN(Number(v))) return '—';
  return '₹' + Number(v).toLocaleString('en-IN');
}

function paymentModeStyle(mode) {
  switch (mode) {
    case 'Cash':          return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
    case 'Cheque':        return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    case 'NEFT':          return { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe' };
    case 'RTGS':          return { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
    case 'UPI':           return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
    case 'Bank Transfer': return { bg: '#f0f9ff', color: '#0284c7', border: '#bae6fd' };
    case 'Demand Draft':  return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    default:              return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
  }
}

function normalizePayment(raw) {
  return {
    landPaymentID:   raw.landPaymentID   ?? raw.LandPaymentID   ?? 0,
    ownerID:         raw.ownerID         ?? raw.OwnerID         ?? '',
    landContractID:  raw.landContractID  ?? raw.LandContractID  ?? '',
    hoardingID:      raw.hoardingID      ?? raw.HoardingID      ?? '',
    paymentDate:     (raw.paymentDate    ?? raw.PaymentDate     ?? '').split('T')[0],
    paymentPurpose:  raw.paymentPurpose  ?? raw.PaymentPurpose  ?? '',
    amountPaid:      raw.amountPaid      ?? raw.AmountPaid      ?? '',
    paymentMode:     raw.paymentMode     ?? raw.PaymentMode     ?? '',
    nextDueDate:     (raw.nextDueDate    ?? raw.NextDueDate     ?? '').split('T')[0],
    bankName:        raw.bankName        ?? raw.BankName        ?? '',
    referenceNumber: raw.referenceNumber ?? raw.ReferenceNumber ?? '',
    paidBy:          raw.paidBy          ?? raw.PaidBy          ?? '',
    comments:        raw.comments        ?? raw.Comments        ?? '',
    lastUpdatedBy:   raw.lastUpdatedBy   ?? raw.LastUpdatedBy   ?? '',
    lastUpdateDttm:  raw.lastUpdateDttm  ?? raw.LastUpdateDttm  ?? '',
  };
}

function validateForm(form) {
  const e = {};
  if (!form.ownerID)        e.ownerID        = 'Owner is required';
  if (!form.landContractID) e.landContractID  = 'Contract is required';
  if (!form.paymentDate)    e.paymentDate     = 'Payment date is required';
  if (!form.paymentPurpose) e.paymentPurpose  = 'Payment purpose is required';
  if (form.amountPaid === '' || form.amountPaid == null)
    e.amountPaid = 'Amount paid is required';
  else if (isNaN(Number(form.amountPaid)) || Number(form.amountPaid) <= 0)
    e.amountPaid = 'Must be a valid positive number';
  if (!form.paymentMode)    e.paymentMode     = 'Payment mode is required';
  if (!form.paidBy)         e.paidBy          = 'Paid by is required';
  if (form.nextDueDate && form.paymentDate && form.nextDueDate < form.paymentDate)
    e.nextDueDate = 'Next due date must be after payment date';
  return e;
}

function hoardingLabel(h) {
  if (!h) return '';
  const parts = [h.hoardingCode];
  if (h.material) parts.push(h.material);
  if (h.width && h.height) parts.push(`${h.width}x${h.height}`);
  return parts.filter(Boolean).join(' - ');
}

/* ─────────────────────────────────────────
   SORT ICON
───────────────────────────────────────── */
function SortIcon({ col, sortKey, sortDir }) {
  const active = sortKey === col;
  return (
    <span className="pg-sort-icon">
      <ChevronUp  size={10} color={active && sortDir === 'asc'  ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__up"   />
      <ChevronDown size={10} color={active && sortDir === 'desc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__down" />
    </span>
  );
}

/* ─────────────────────────────────────────
   SMALL HELPERS
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
   CURRENCY INPUT
───────────────────────────────────────── */
function CurrencyInput({ value, onChange, placeholder, disabled }) {
  const toDisplay = (raw) => {
    if (raw === '' || raw == null) return '';
    const n = Number(String(raw).replace(/,/g, ''));
    return isNaN(n) ? String(raw).replace(/,/g, '') : n.toLocaleString('en-IN');
  };
  const handleChange = (e) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) onChange(raw);
  };
  return (
    <input
      className="pg-field-input"
      value={toDisplay(value)}
      onChange={handleChange}
      placeholder={placeholder}
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
    />
  );
}

/* ═══════════════════════════════════════════
   COMBO DROPDOWN
═══════════════════════════════════════════ */
function ComboDropdown({
  value, onChange, onBlur, hasError, placeholder,
  icon: Icon, options, searchable = false, emptyText = 'No options', disabled = false,
}) {
  const [open, setOpen]               = useState(false);
  const [query, setQuery]             = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));
  const filtered = searchable
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setQuery(''); setFocusedIndex(-1);
        onBlur && onBlur();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onBlur]);

  const openDropdown = () => {
    if (disabled) return;
    setOpen(true); setFocusedIndex(-1); setQuery('');
    if (searchable) setTimeout(() => inputRef.current?.focus(), 0);
  };

  const select = (opt) => {
    onChange(opt.value); setOpen(false); setQuery(''); setFocusedIndex(-1);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange(''); setOpen(false); setQuery(''); setFocusedIndex(-1);
    onBlur && onBlur();
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDropdown(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (focusedIndex >= 0 && filtered[focusedIndex]) select(filtered[focusedIndex]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); setFocusedIndex(-1); onBlur && onBlur(); }
  };

  return (
    <div className="lc-search-widget" ref={wrapRef}>
      <div
        className={`pg-field-wrap ${hasError ? 'pg-field-wrap--error' : disabled ? 'pg-field-wrap--readonly' : 'pg-field-wrap--normal'}`}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none' }}
        onClick={openDropdown}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
        {Icon && <Icon size={14} color={hasError ? '#ef4444' : disabled ? '#b0b0c8' : '#c0c0d8'} style={{ flexShrink: 0 }} />}
        <span style={{
          flex: 1, fontFamily: 'Nunito, sans-serif', fontSize: 13,
          fontWeight: selected ? 700 : 500,
          color: selected ? '#1a1a2e' : disabled ? '#b0b0c8' : '#b0b0c8',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
        }}>
          {selected ? selected.label : placeholder}
        </span>
        {selected && !disabled
          ? <X size={13} style={{ flexShrink: 0, cursor: 'pointer', color: '#c0c0d8' }} onClick={clear} />
          : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
        }
      </div>

      {open && !disabled && (
        <div className="lc-dropdown">
          {searchable && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderBottom: '1px solid #f0f0f8', background: '#f8f8fd' }}>
              <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 600, color: '#1a1a2e' }}
                placeholder="Search…"
                value={query}
                onChange={e => { setQuery(e.target.value); setFocusedIndex(-1); }}
                onKeyDown={handleKeyDown}
              />
              {query && <X size={11} style={{ cursor: 'pointer', color: '#c0c0d8' }} onClick={() => setQuery('')} />}
            </div>
          )}
          {filtered.length === 0
            ? <div className="lc-dropdown-empty"><span>{emptyText}</span></div>
            : filtered.map((opt, idx) => (
              <div
                key={opt.value}
                className={`lc-dropdown-option${String(opt.value) === String(value) ? ' lc-dropdown-option--focused' : ''}${idx === focusedIndex ? ' lc-dropdown-option--focused' : ''}`}
                onMouseEnter={() => setFocusedIndex(idx)}
                onMouseDown={() => select(opt)}
              >
                <div className="lc-dropdown-option__name" style={{ color: String(opt.value) === String(value) ? '#049edf' : '#1a1a2e' }}>
                  {opt.label}
                </div>
                {String(opt.value) === String(value) && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   OWNER SEARCH WIDGET
═══════════════════════════════════════════ */
function OwnerSearchWidget({ owners, value, onChange, error, disabled }) {
  const [query, setQuery]             = useState('');
  const [open, setOpen]               = useState(false);
  const [results, setResults]         = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapRef = useRef(null);

  const selected = owners.find(o => o.ownerID === Number(value) || o.ownerID === value);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(
      owners.filter(o =>
        (o.ownerName || '').toLowerCase().includes(q) ||
        (o.phone1    || '').toLowerCase().includes(q) ||
        (o.phone     || '').toLowerCase().includes(q) ||
        String(o.ownerID).includes(q)
      ).slice(0, 10)
    );
    setFocusedIndex(-1);
  }, [query, owners]);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setFocusedIndex(-1); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && results[focusedIndex]) {
        const o = results[focusedIndex];
        onChange(o.ownerID); setQuery(''); setOpen(false); setResults([]); setFocusedIndex(-1);
      }
    } else if (e.key === 'Escape') { setOpen(false); setFocusedIndex(-1); }
  };

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
            placeholder="Search owner by name, phone or ID..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {query && (
            <X size={12} style={{ cursor: 'pointer', color: '#c0c0d8', flexShrink: 0 }}
              onClick={e => { e.stopPropagation(); setQuery(''); setResults([]); setFocusedIndex(-1); }} />
          )}
        </div>
      )}

      {open && results.length > 0 && (
        <div className="lc-dropdown">
          {results.map((o, idx) => (
            <div key={o.ownerID}
              className={`lc-dropdown-option${idx === focusedIndex ? ' lc-dropdown-option--focused' : ''}`}
              onMouseEnter={() => setFocusedIndex(idx)}
              onMouseDown={() => { onChange(o.ownerID); setQuery(''); setOpen(false); setResults([]); setFocusedIndex(-1); }}
            >
              <div className="lc-dropdown-option__name">
                <User size={12} /> {o.ownerName}
                <span style={{ color: '#b0b0c8', fontWeight: 600, fontSize: 11, marginLeft: 8 }}>ID: {o.ownerID}</span>
              </div>
              {(o.phone1 || o.phone) && <div className="lc-dropdown-option__sub">{o.phone1 || o.phone}</div>}
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
            {(selected.phone1 || selected.phone) && (
              <div className="lc-selected-card__sub">{selected.phone1 || selected.phone}</div>
            )}
          </div>
          {!disabled && (
            <button className="lc-selected-card__clear" onClick={() => { onChange(''); setQuery(''); }} title="Clear">
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {value && !selected && (
        <div className="lc-selected-card">
          <div className="lc-selected-card__icon"><User size={15} color="#049edf" /></div>
          <div className="lc-selected-card__info"><div className="lc-selected-card__name">Owner ID: {value}</div></div>
          {!disabled && <button className="lc-selected-card__clear" onClick={() => onChange('')}><X size={12} /></button>}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CONTRACT DROPDOWN (filtered by owner)
═══════════════════════════════════════════ */
function ContractDropdown({ contracts, ownerID, value, onChange, error, disabled }) {
  const ownerContracts = ownerID
    ? contracts.filter(c => String(c.ownerID) === String(ownerID))
    : [];

  const options = ownerContracts.map(c => ({
    value: c.landContractID,
    label: `Contract #${c.landContractID} — ${fmtDate(c.startDate)} to ${fmtDate(c.endDate)} (${c.status})`,
    _raw: c,
  }));

  const isDisabled = disabled || !ownerID;
  const placeholder = !ownerID
    ? 'Select an owner first...'
    : ownerContracts.length === 0
      ? 'No contracts for this owner'
      : 'Select a contract...';

  return (
    <ComboDropdown
      value={value}
      onChange={onChange}
      onBlur={() => {}}
      hasError={!!error}
      placeholder={placeholder}
      icon={FileText}
      options={options}
      searchable={options.length > 5}
      emptyText="No contracts found"
      disabled={isDisabled}
    />
  );
}

/* ═══════════════════════════════════════════
   PAYMENT FORM
═══════════════════════════════════════════ */
function PaymentForm({ mode, payment, owners, hoardings, contracts, onBack, onSave }) {
  const isAdd = mode === 'add';

  const [form, setForm] = useState(() =>
    isAdd ? { ...EMPTY_FORM } : {
      ownerID:         payment?.ownerID         ?? '',
      landContractID:  payment?.landContractID  ?? '',
      hoardingID:      payment?.hoardingID      ?? '',
      paymentDate:     payment?.paymentDate     ?? '',
      paymentPurpose:  payment?.paymentPurpose  ?? '',
      amountPaid:      payment?.amountPaid      ?? '',
      paymentMode:     payment?.paymentMode     ?? '',
      nextDueDate:     payment?.nextDueDate     ?? '',
      bankName:        payment?.bankName        ?? '',
      referenceNumber: payment?.referenceNumber ?? '',
      paidBy:          payment?.paidBy          ?? '',
      comments:        payment?.comments        ?? '',
    }
  );

  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);
  const [saveOk, setSaveOk]   = useState(false);
  const [apiErr, setApiErr]   = useState('');

  // When contract changes, auto-fill hoardingID
  useEffect(() => {
    if (form.landContractID) {
      const contract = contracts.find(c => String(c.landContractID) === String(form.landContractID));
      if (contract?.hoardingID) {
        setForm(prev => ({ ...prev, hoardingID: contract.hoardingID }));
      }
    }
  }, [form.landContractID, contracts]);

  const set = (key, val) => {
    setForm(prev => {
      const updated = { ...prev, [key]: val };
      if (key === 'ownerID') {
        updated.landContractID = '';
        updated.hoardingID     = '';
      }
      if (key === 'landContractID') {
        updated.hoardingID = '';
      }
      return updated;
    });
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
    if (key === 'ownerID') setErrors(prev => ({ ...prev, landContractID: '', hoardingID: '' }));
  };

  // Determine if bank/reference fields should show
  const showBankFields = ['Cheque', 'NEFT', 'RTGS', 'Bank Transfer', 'Demand Draft'].includes(form.paymentMode);

  const handleSave = async () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true); setApiErr('');
    try {
      const payload = {
        landPaymentID:   isAdd ? 0 : payment.landPaymentID,
        ownerID:         Number(form.ownerID),
        landContractID:  Number(form.landContractID),
        hoardingID:      Number(form.hoardingID) || 0,
        paymentDate:     form.paymentDate,
        paymentPurpose:  form.paymentPurpose,
        amountPaid:      Number(form.amountPaid),
        paymentMode:     form.paymentMode,
        nextDueDate:     form.nextDueDate || null,
        bankName:        form.bankName        || '',
        referenceNumber: form.referenceNumber || '',
        paidBy:          form.paidBy,
        comments:        form.comments        || '',
      };

      let saved;
      if (isAdd) {
        const res = await apiService.createLandPayment(payload);
        saved = normalizePayment(res?.data ?? res ?? payload);
      } else {
        const res = await apiService.updateLandPayment(payment.landPaymentID, payload);
        saved = normalizePayment(res?.data ?? res ?? { ...payload, landPaymentID: payment.landPaymentID });
      }

      setSaveOk(true);
      await new Promise(r => setTimeout(r, 700));
      onSave(saved, isAdd);
      onBack();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Save failed.';
      setApiErr(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  const selectedHoarding = hoardings.find(h =>
    h.hoardingID === Number(form.hoardingID) || h.hoardingID === form.hoardingID
  );

  return (
    <div className="hd-form-page">
      <div className="hd-topbar">
        <div className="hd-topbar-left">
          <button className="hd-back-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span className="d-none d-sm-inline">Back to Payments</span>
            <span className="d-inline d-sm-none">Back</span>
          </button>
          <div className="hd-topbar-divider" />
          <div>
            <div className="hd-topbar-title">
              {isAdd ? 'Record New Land Payment' : `Edit Payment #${payment?.landPaymentID}`}
            </div>
            <div className="hd-topbar-sub">
              {isAdd ? 'Enter payment details and save' : 'Update land payment details'}
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

            {/* ── Owner & Contract ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><User size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Owner &amp; Contract</div>
                    <div className="hd-section-sub">Link this payment to an owner and land contract</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">

                    {/* Owner */}
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

                    {/* Contract */}
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Land Contract" required />
                      <ContractDropdown
                        contracts={contracts}
                        ownerID={form.ownerID}
                        value={form.landContractID}
                        onChange={val => set('landContractID', val)}
                        error={errors.landContractID}
                        disabled={!isAdd}
                      />
                      <FieldError msg={errors.landContractID} />
                    </div>

                    {/* Hoarding (auto-filled, read-only display) */}
                    {selectedHoarding && (
                      <div className="col-12">
                        <div className="lc-selected-card" style={{ margin: 0 }}>
                          <div className="lc-selected-card__icon"><Building2 size={15} color="#6c63ff" /></div>
                          <div className="lc-selected-card__info">
                            <div className="lc-selected-card__name" style={{ color: '#6c63ff' }}>
                              {selectedHoarding.hoardingCode}
                              {selectedHoarding.width && selectedHoarding.height && (
                                <span style={{ color: '#9090a8', fontWeight: 500, marginLeft: 8 }}>
                                  {selectedHoarding.width}x{selectedHoarding.height} ft
                                </span>
                              )}
                            </div>
                            <div className="lc-selected-card__sub">
                              {[selectedHoarding.material, selectedHoarding.status].filter(Boolean).join(' · ')}
                              <span style={{ color: '#b0b0c8', fontSize: 11, marginLeft: 8 }}>Auto-filled from contract</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Payment Details ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><IndianRupee size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Payment Details</div>
                    <div className="hd-section-sub">Date, amount, purpose and payment method</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">

                    {/* Payment Date */}
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Payment Date" required />
                      <InputWrap error={errors.paymentDate} icon={Calendar}>
                        <input
                          className="pg-field-input" type="date"
                          value={form.paymentDate}
                          onChange={e => set('paymentDate', e.target.value)}
                        />
                      </InputWrap>
                      <FieldError msg={errors.paymentDate} />
                    </div>

                    {/* Next Due Date */}
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Next Due Date" optional />
                      <InputWrap error={errors.nextDueDate} icon={Calendar}>
                        <input
                          className="pg-field-input" type="date"
                          value={form.nextDueDate}
                          min={form.paymentDate || undefined}
                          onChange={e => set('nextDueDate', e.target.value)}
                        />
                      </InputWrap>
                      <FieldError msg={errors.nextDueDate} />
                    </div>

                    {/* Amount Paid */}
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Amount Paid (Rs.)" required />
                      <InputWrap error={errors.amountPaid} icon={IndianRupee}>
                        <CurrencyInput
                          value={form.amountPaid}
                          onChange={val => set('amountPaid', val)}
                          placeholder="e.g. 25,000"
                        />
                      </InputWrap>
                      <FieldError msg={errors.amountPaid} />
                    </div>

                    {/* Payment Purpose */}
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Payment Purpose" required />
                      <ComboDropdown
                        value={form.paymentPurpose}
                        onChange={val => set('paymentPurpose', val)}
                        onBlur={() => {}}
                        hasError={!!errors.paymentPurpose}
                        placeholder="Select purpose…"
                        icon={Receipt}
                        options={PAYMENT_PURPOSE_OPTIONS}
                      />
                      <FieldError msg={errors.paymentPurpose} />
                    </div>

                    {/* Payment Mode */}
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Payment Mode" required />
                      <ComboDropdown
                        value={form.paymentMode}
                        onChange={val => set('paymentMode', val)}
                        onBlur={() => {}}
                        hasError={!!errors.paymentMode}
                        placeholder="Select mode…"
                        icon={CreditCard}
                        options={PAYMENT_MODE_OPTIONS}
                      />
                      <FieldError msg={errors.paymentMode} />
                    </div>

                    {/* Paid By */}
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Paid By" required />
                      <InputWrap error={errors.paidBy} icon={User}>
                        <input
                          className="pg-field-input"
                          placeholder="Name of person / company who paid"
                          value={form.paidBy}
                          onChange={e => set('paidBy', e.target.value)}
                          autoComplete="off"
                        />
                      </InputWrap>
                      <FieldError msg={errors.paidBy} />
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* ── Bank & Reference (conditional) ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><Landmark size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Bank &amp; Reference Details</div>
                    <div className="hd-section-sub">
                      {showBankFields
                        ? 'Fill bank and reference info for this payment mode'
                        : 'Applicable for Cheque, NEFT, RTGS, Bank Transfer, DD'}
                    </div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Bank Name" optional />
                      <InputWrap error={errors.bankName} icon={Landmark}>
                        <input
                          className="pg-field-input"
                          placeholder={showBankFields ? 'e.g. State Bank of India' : 'N/A for this payment mode'}
                          value={form.bankName}
                          onChange={e => set('bankName', e.target.value)}
                          autoComplete="off"
                          disabled={!showBankFields}
                          style={!showBankFields ? { color: '#b0b0c8', cursor: 'not-allowed' } : {}}
                        />
                      </InputWrap>
                      <FieldError msg={errors.bankName} />
                    </div>

                    <div className="col-12 col-md-6">
                      <FieldLabel label="Reference / Cheque Number" optional />
                      <InputWrap error={errors.referenceNumber} icon={Hash}>
                        <input
                          className="pg-field-input"
                          placeholder={showBankFields ? 'Transaction / Cheque number' : 'N/A for this payment mode'}
                          value={form.referenceNumber}
                          onChange={e => set('referenceNumber', e.target.value)}
                          autoComplete="off"
                          disabled={!showBankFields}
                          style={!showBankFields ? { color: '#b0b0c8', cursor: 'not-allowed' } : {}}
                        />
                      </InputWrap>
                      <FieldError msg={errors.referenceNumber} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Comments ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><MessageSquare size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Notes</div>
                    <div className="hd-section-sub">Any additional remarks about this payment</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <FieldLabel label="Comments" optional />
                      <InputWrap icon={MessageSquare}>
                        <textarea
                          className="pg-field-input lc-textarea" rows={3}
                          placeholder="Any notes or remarks about this payment..."
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

      <div className="hd-form-footer hd-form-footer--sticky">
        <button className="pg-btn-cancel" onClick={onBack} disabled={saving}>Cancel</button>
        <button className="pg-btn-save" onClick={handleSave} disabled={saving}>
          {saveOk
            ? <><Check size={13} /> Saved!</>
            : saving
              ? <><Loader2 size={13} className="pg-spin" /> Saving...</>
              : <><Check size={13} /> {isAdd ? 'Save Payment' : 'Update Payment'}</>}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function LandPaymentPage() {
  const [owners,    setOwners]    = useState([]);
  const [hoardings, setHoardings] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [payments,  setPayments]  = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadError,   setLoadError]   = useState('');

  const [view,       setView]       = useState('grid');
  const [formMode,   setFormMode]   = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const [search,       setSearch]       = useState('');
  const [modeFilter,   setModeFilter]   = useState('');
  const [sortKey,      setSortKey]      = useState('paymentDate');
  const [sortDir,      setSortDir]      = useState('desc');
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState(10);

  const tableRef = useRef(null);
  const [tableReady, setTableReady] = useState(false);
  useEffect(() => { if (!loadingMeta) setTableReady(true); }, [loadingMeta]);
  useResizableColumns(tableRef, tableReady, [60, 150, 150, 110, 110, 130, 120, 110, 80]);

  const fetchAll = useCallback(async () => {
    setLoadingMeta(true); setLoadError('');
    try {
      const [rawOwners, rawHoardings, rawContracts, rawPayments] = await Promise.all([
        apiService.getAllOwners(),
        apiService.getAllHoardings(),
        apiService.getAllLandContracts(),
        apiService.getAllLandPayments(),
      ]);

      setOwners(
        Array.isArray(rawOwners) ? rawOwners : Array.isArray(rawOwners?.data) ? rawOwners.data : []
      );
      setHoardings(
        Array.isArray(rawHoardings) ? rawHoardings : Array.isArray(rawHoardings?.data) ? rawHoardings.data : []
      );

      const contractList = Array.isArray(rawContracts)
        ? rawContracts
        : Array.isArray(rawContracts?.data) ? rawContracts.data : [];
      setContracts(contractList.map(c => ({
        landContractID: c.landContractID ?? c.LandContractID,
        ownerID:        c.ownerID        ?? c.OwnerID,
        hoardingID:     c.hoardingID     ?? c.HoardingID,
        startDate:      (c.startDate     ?? c.StartDate ?? '').split('T')[0],
        endDate:        (c.endDate       ?? c.EndDate   ?? '').split('T')[0],
        status:         c.status         ?? c.Status    ?? '',
      })));

      const list = Array.isArray(rawPayments)
        ? rawPayments
        : Array.isArray(rawPayments?.data) ? rawPayments.data : [];
      setPayments(list.map(normalizePayment));
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Failed to load data.');
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = (record, isNew) => {
    if (isNew) setPayments(prev => [record, ...prev]);
    else setPayments(prev => prev.map(p => p.landPaymentID === record.landPaymentID ? record : p));
  };

  /* ── Derived table rows ── */
  const tableRows = payments.map(p => {
    const owner    = owners.find(o => o.ownerID === Number(p.ownerID) || o.ownerID === p.ownerID);
    const hoarding = hoardings.find(h => h.hoardingID === Number(p.hoardingID) || h.hoardingID === p.hoardingID);
    return {
      landPaymentID:  p.landPaymentID,
      ownerName:      owner?.ownerName || `Owner ID ${p.ownerID}`,
      hoardingLabel:  hoarding ? hoardingLabel(hoarding) : `Hoarding ID ${p.hoardingID}`,
      landContractID: p.landContractID,
      paymentDate:    p.paymentDate || '',
      nextDueDate:    p.nextDueDate || '',
      paymentPurpose: p.paymentPurpose || '',
      amountPaid:     p.amountPaid ?? 0,
      paymentMode:    p.paymentMode || '',
      paidBy:         p.paidBy || '',
      _raw: p,
    };
  });

  const filtered = tableRows.filter(r => {
    const q = search.toLowerCase();
    const matchQ =
      r.ownerName.toLowerCase().includes(q)     ||
      r.hoardingLabel.toLowerCase().includes(q) ||
      r.paymentPurpose.toLowerCase().includes(q)||
      r.paymentMode.toLowerCase().includes(q)   ||
      r.paidBy.toLowerCase().includes(q)        ||
      String(r.landPaymentID).includes(q)       ||
      String(r.landContractID).includes(q);
    return matchQ && (!modeFilter || r.paymentMode === modeFilter);
  });

  const sortedRows = [...filtered].sort((a, b) => {
    if (sortKey === 'amountPaid')
      return sortDir === 'asc' ? a.amountPaid - b.amountPaid : b.amountPaid - a.amountPaid;
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

  /* ── Stats ── */
  const totalPaid   = payments.reduce((s, p) => s + (Number(p.amountPaid) || 0), 0);
  const cashCount   = payments.filter(p => p.paymentMode === 'Cash').length;
  const onlineCount = payments.filter(p => ['NEFT', 'RTGS', 'UPI', 'Bank Transfer'].includes(p.paymentMode)).length;

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('...');
      acc.push(p);
      return acc;
    }, []);

  const COLS = [
    { key: 'landPaymentID',  label: '#ID' },
    { key: 'ownerName',      label: 'Owner' },
    { key: 'hoardingLabel',  label: 'Hoarding',   tabletHide: true },
    { key: 'paymentDate',    label: 'Pay Date' },
    { key: 'nextDueDate',    label: 'Next Due',   tabletHide: true },
    { key: 'paymentPurpose', label: 'Purpose',    tabletHide: true },
    { key: 'amountPaid',     label: 'Amount' },
    { key: 'paymentMode',    label: 'Mode' },
    { key: '_action',        label: 'Actions',    noSort: true },
  ];

  /* ── Form view ── */
  if (view === 'form') {
    return (
      <PaymentForm
        mode={formMode}
        payment={editTarget}
        owners={owners}
        hoardings={hoardings}
        contracts={contracts}
        onBack={() => { setView('grid'); setEditTarget(null); }}
        onSave={handleSave}
      />
    );
  }

  /* ── Grid view ── */
  return (
    <div className="pg-page">
      <div className="pg-header">
        <div>
          <h1 className="pg-header__title">Land Payments</h1>
          <p className="pg-header__subtitle">
            Track all land rental payments to owners
            {payments.length > 0 && <> — Total Paid: <strong>{fmtCurrency(totalPaid)}</strong></>}
          </p>
        </div>
        <button
          className="pg-btn-add"
          onClick={() => { setFormMode('add'); setEditTarget(null); setView('form'); }}
          disabled={loadingMeta}
        >
          <Plus size={14} /> Record Payment
        </button>
      </div>

      {/* Stats Strip */}
      {!loadingMeta && payments.length > 0 && (
        <div className="exp-stats-strip">
          {[
            { icon: <Receipt size={16} color="#049edf" />,      bg: 'rgba(4,158,223,0.1)',    label: 'Total Payments',  val: payments.length },
            { icon: <IndianRupee size={16} color="#16a34a" />,  bg: 'rgba(22,163,74,0.1)',    label: 'Total Paid',      val: fmtCurrency(totalPaid) },
            { icon: <Banknote size={16} color="#d97706" />,     bg: 'rgba(217,119,6,0.08)',   label: 'Cash Payments',   val: cashCount },
            { icon: <CheckCircle2 size={16} color="#7c3aed" />, bg: 'rgba(124,58,237,0.08)',  label: 'Online Payments', val: onlineCount },
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

      {/* Load Error */}
      {loadError && (
        <div className="pg-field-error hd-api-error mb-3" style={{ margin: '0 0 16px 0' }}>
          <AlertCircle size={14} /><span>{loadError}</span>
          <button
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
            onClick={fetchAll}
          >Retry</button>
        </div>
      )}

      <div className="pg-container">
        {/* Toolbar */}
        <div className="pg-toolbar">
          <div className="pg-toolbar__inner">
            <div className="pg-toolbar__count">
              <Receipt size={14} color="#9090a8" />
              <span><strong>{loadingMeta ? '...' : filtered.length}</strong> payment{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="pg-search-box">
              <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input
                placeholder="Search owner, hoarding, purpose, ref..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
            </div>
            <select
              className="hd-filter-select"
              value={modeFilter}
              onChange={e => { setModeFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Modes</option>
              {PAYMENT_MODE_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <button
              className="pg-pg-btn"
              onClick={fetchAll}
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
            <div style={{ fontSize: 13 }}>Loading payments...</div>
          </div>
        )}

        {/* Empty */}
        {!loadingMeta && payments.length === 0 && (
          <div className="pg-empty" style={{ padding: '70px 20px' }}>
            <div className="pg-empty__inner">
              <Receipt size={42} color="#d0d0e8" />
              <span className="pg-empty__label">No payments recorded yet</span>
              <span style={{ fontSize: 12, color: '#b0b0c8' }}>
                Click <strong>Record Payment</strong> to add the first one
              </span>
            </div>
          </div>
        )}

        {/* Desktop Table */}
        {!loadingMeta && payments.length > 0 && (
          <div className="pg-desktop-table">
            <table className="pg-table" ref={tableRef}>
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
                  <tr>
                    <td colSpan={COLS.length} className="pg-td pg-empty">
                      <div className="pg-empty__inner">
                        <Receipt size={36} color="#d0d0e8" />
                        <span className="pg-empty__label">No payments match your search</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(r => {
                  const mst = paymentModeStyle(r.paymentMode);
                  return (
                    <tr key={r.landPaymentID} className="pg-tr">
                      <td className="pg-td"><span className="lc-id-badge">#{r.landPaymentID}</span></td>
                      <td className="pg-td">
                        <div className="pg-td__primary">{r.ownerName}</div>
                        <div style={{ fontSize: 11, color: '#9090a8', marginTop: 1 }}>Contract #{r.landContractID}</div>
                      </td>
                      <td className="pg-td pg-td--overflow pg-tablet-hide">
                        <span className="pg-td__ellipsis" title={r.hoardingLabel}>{r.hoardingLabel}</span>
                      </td>
                      <td className="pg-td"><span className="pg-td__primary">{fmtDate(r.paymentDate)}</span></td>
                      <td className="pg-td pg-tablet-hide">
                        <span className="pg-td__primary">{fmtDate(r.nextDueDate)}</span>
                      </td>
                      <td className="pg-td pg-tablet-hide">
                        <span style={{ fontSize: 12, color: '#5a5a7a', fontWeight: 600 }}>{r.paymentPurpose || '—'}</span>
                      </td>
                      <td className="pg-td">
                        <span className="lc-amount-val">{fmtCurrency(r.amountPaid)}</span>
                      </td>
                      <td className="pg-td">
                        <span className="lc-status-badge" style={{ background: mst.bg, color: mst.color, borderColor: mst.border }}>
                          {r.paymentMode || '—'}
                        </span>
                      </td>
                      <td className="pg-td">
                        <div className="pg-action-wrap">
                          <button
                            className="pg-btn-view" title="Edit"
                            onClick={() => { setFormMode('edit'); setEditTarget(r._raw); setView('form'); }}
                          >
                            <Edit2 size={13} />
                          </button>
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
        {!loadingMeta && payments.length > 0 && (
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <Receipt size={36} color="#d0d0e8" />
                <span className="pg-empty__label">No payments match</span>
              </div>
            ) : paginated.map(r => {
              const mst = paymentModeStyle(r.paymentMode);
              return (
                <div key={r.landPaymentID} className="pg-card">
                  <div className="pg-card__header">
                    <div className="pg-card__title-wrap">
                      <div className="pg-card__title">
                        <span className="lc-id-badge">#{r.landPaymentID}</span>&nbsp; {r.ownerName}
                      </div>
                      <div className="pg-card__subtitle">{r.hoardingLabel}</div>
                    </div>
                    <div className="pg-card__actions">
                      <button className="pg-card__btn-view" onClick={() => { setFormMode('edit'); setEditTarget(r._raw); setView('form'); }} title="Edit"><Edit2 size={13} /></button>
                    </div>
                  </div>
                  <div className="pg-card__body">
                    <div className="pg-card__row">
                      <Calendar size={12} color="#c0c0d8" className="pg-card__row-icon" />
                      <span className="pg-card__row-text">{fmtDate(r.paymentDate)}</span>
                      {r.nextDueDate && (
                        <span style={{ color: '#9090a8', fontSize: 11, marginLeft: 4 }}>→ Due: {fmtDate(r.nextDueDate)}</span>
                      )}
                    </div>
                    <div className="pg-card__row">
                      <IndianRupee size={12} color="#c0c0d8" className="pg-card__row-icon" />
                      <span className="pg-card__row-text" style={{ fontWeight: 800, color: '#1a1a2e' }}>{fmtCurrency(r.amountPaid)}</span>
                      <span style={{ color: '#9090a8', fontSize: 11, marginLeft: 4 }}>{r.paymentPurpose}</span>
                    </div>
                    <div className="pg-card__row">
                      <CreditCard size={12} color="#c0c0d8" className="pg-card__row-icon" />
                      <span className="lc-status-badge" style={{ background: mst.bg, color: mst.color, borderColor: mst.border }}>
                        {r.paymentMode || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loadingMeta && payments.length > 0 && (
          <div className="pg-pagination">
            <div className="pg-pagination__left">
              <button className="pg-pg-btn" disabled={page === 1}          onClick={() => setPage(1)}><ChevronsLeft  size={13} /></button>
              <button className="pg-pg-btn" disabled={page === 1}          onClick={() => setPage(p => p - 1)}><ChevronLeft  size={13} /></button>
              {pageNums.map((p, i) =>
                p === '...'
                  ? <span key={`e${i}`} className="pg-pg-ellipsis">...</span>
                  : <button key={p} className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              )}
              <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></button>
              <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={13} /></button>
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
              <span className="pg-pagination__text">{page} of {totalPages} pages ({sortedRows.length} items)</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}