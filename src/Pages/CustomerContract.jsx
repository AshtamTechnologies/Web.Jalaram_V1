import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Plus, Search, X, AlertCircle, Check, Edit2,
  RefreshCw, Calendar, ChevronUp, ChevronDown,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Loader2, FileText, Eye, ArrowLeft, Building2, User,
  IndianRupee, Clock, Trash2, ShieldCheck, MessageSquare,
  CreditCard, TrendingUp, MapPin, Tag, Percent, SlidersHorizontal,
  Users, Paperclip, Upload, Image, File, Download, AlertTriangle,
} from 'lucide-react';
import { apiService } from '../api/api';
import './Common1.css';
import { useResizableColumns } from '../hooks/useResizableColumns';

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];
const STATUS_OPTIONS = ['Active', 'Expired', 'Terminated', 'Pending'];

const FILE_UPLOAD_TYPE_OPTIONS = [
  { value: 'Contract', label: 'Contract Document' },
  { value: 'Banner Design', label: 'Banner Design' },
  { value: 'Other', label: 'Other' },
];

const PAYMENT_FREQ_FALLBACK = [
  { value: 1, label: 'Monthly' },
  { value: 2, label: 'Quarterly' },
  { value: 3, label: 'Half-Yearly' },
  { value: 4, label: 'Yearly' },
];

const EMPTY_FORM = {
  customerID: '',
  hoardingID: '',
  startDate: '',
  endDate: '',
  contractOrigValue: '',
  paymentFreqID: '',
  amountPerFreq: '',
  advancePaid: '',
  status: 'Active',
  discountAmount: '',
  adjustmentAmount: '',
  contractFinalValue: '',
  comments: '',
};

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function fmtCurrency(v) {
  if (v === '' || v == null || isNaN(Number(v))) return '—';
  return '₹' + Number(v).toLocaleString('en-IN');
}
function freqLabel(id, freqs) {
  return freqs.find(f => String(f.value) === String(id))?.label || '—';
}
function statusStyle(s) {
  switch (s) {
    case 'Active': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
    case 'Expired': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    case 'Terminated': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    case 'Pending': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    default: return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
  }
}
function deduplicateHoardings(hoardings) {
  const map = new Map();
  for (const h of hoardings) {
    const code = h.hoardingCode;
    if (!map.has(code)) { map.set(code, h); }
    else {
      const existing = map.get(code);
      const ed = existing.effdt ? new Date(existing.effdt).getTime() : existing.hoardingID;
      const cd = h.effdt ? new Date(h.effdt).getTime() : h.hoardingID;
      if (cd > ed) map.set(code, h);
    }
  }
  return Array.from(map.values());
}
function hoardingLabel(h) {
  if (!h) return '';
  const parts = [h.hoardingCode];
  if (h.material) parts.push(h.material);
  if (h.width && h.height) parts.push(`${h.width}x${h.height}`);
  return parts.filter(Boolean).join(' - ');
}
function normalizeContract(raw) {
  return {
    customerContractID: raw.customerContractID ?? raw.CustomerContractID,
    customerID: raw.customerID ?? raw.CustomerID,
    hoardingID: raw.hoardingID ?? raw.HoardingID,
    startDate: (raw.startDate ?? raw.StartDate ?? '').split('T')[0],
    endDate: (raw.endDate ?? raw.EndDate ?? '').split('T')[0],
    contractOrigValue: raw.contractOrigValue ?? raw.ContractOrigValue ?? '',
    paymentFreqID: raw.paymentFreqID ?? raw.PaymentFreqID ?? '',
    amountPerFreq: raw.amountPerFreq ?? raw.AmountPerFreq ?? '',
    advancePaid: raw.advancePaid ?? raw.AdvancePaid ?? '',
    status: raw.status ?? raw.Status ?? '',
    discountAmount: raw.discountAmount ?? raw.DiscountAmount ?? '',
    adjustmentAmount: raw.adjustmentAmount ?? raw.AdjustmentAmount ?? '',
    contractFinalValue: raw.contractFinalValue ?? raw.ContractFinalValue ?? '',
    comments: raw.comments ?? raw.Comments ?? '',
    lastUpdatedBy: raw.lastUpdatedBy ?? raw.LastUpdatedBy ?? '',
    lastUpdateDttm: raw.lastUpdateDttm ?? raw.LastUpdateDttm ?? '',
  };
}
function normalizeAttach(raw) {
  return {
    custContractAttachID: raw.custContractAttachID ?? raw.CustContractAttachID,
    customerContractID: raw.customerContractID ?? raw.CustomerContractID,
    ownerID: raw.ownerID ?? raw.OwnerID ?? 0,
    hoardingID: raw.hoardingID ?? raw.HoardingID ?? 0,
    fileUploadType: raw.fileUploadType ?? raw.FileUploadType ?? '',
    contractFilePath: raw.contractFilePath ?? raw.ContractFilePath ?? '',
    contractFilename: raw.contractFilename ?? raw.ContractFilename ?? '',
    lastUpdateDttm: raw.lastUpdateDttm ?? raw.LastUpdateDttm ?? '',
  };
}
function isImageFile(filename) {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename || '');
}
function isPdfFile(filename) {
  return /\.pdf$/i.test(filename || '');
}
function fileTypeIcon(filename) {
  if (isImageFile(filename)) return <Image size={16} color="#6c63ff" />;
  if (isPdfFile(filename)) return <FileText size={16} color="#dc2626" />;
  return <File size={16} color="#049edf" />;
}
function uploadTypeStyle(type) {
  switch (type) {
    case 'Contract': return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    case 'Banner Design': return { bg: '#f5f3ff', color: '#6c63ff', border: '#ddd6fe' };
    default: return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
  }
}
function detectHoardingConflict(form, contracts, currentContractID) {
  if (!form.hoardingID || !form.startDate || !form.endDate) return null;
  const fStart = new Date(form.startDate);
  const fEnd = new Date(form.endDate);
  const conflict = contracts.find(c => {
    if (Number(c.hoardingID) !== Number(form.hoardingID)) return false;
    if (currentContractID && c.customerContractID === currentContractID) return false;
    if (c.status === 'Expired' || c.status === 'Terminated') return false;
    const cStart = new Date(c.startDate);
    const cEnd = new Date(c.endDate);
    return fStart <= cEnd && fEnd >= cStart;
  });
  return conflict || null;
}

function validateForm(form, contracts = [], currentContractID = null) {
  const e = {};
  if (!form.customerID) e.customerID = 'Customer is required';
  if (!form.hoardingID) e.hoardingID = 'Hoarding is required';
  if (!form.startDate) e.startDate = 'Start date is required';
  if (!form.endDate) e.endDate = 'End date is required';
  if (form.startDate && form.endDate && form.endDate <= form.startDate)
    e.endDate = 'End date must be after start date';

  // ── Double-booking check ──────────────────────────────────────────
  if (!e.hoardingID && !e.startDate && !e.endDate) {
    const conflict = detectHoardingConflict(form, contracts, currentContractID);
    if (conflict) {
      e.hoardingID = `Already booked ${fmtDate(conflict.startDate)} → ${fmtDate(conflict.endDate)} (Contract #${conflict.customerContractID})`;
      e.startDate = 'Overlaps with an existing booking';
      e.endDate = 'Overlaps with an existing booking';
    }
  }

  if (form.contractOrigValue === '' || form.contractOrigValue == null)
    e.contractOrigValue = 'Contract value is required';
  else if (isNaN(Number(form.contractOrigValue)) || Number(form.contractOrigValue) < 0)
    e.contractOrigValue = 'Must be a valid positive number';
  if (!form.paymentFreqID) e.paymentFreqID = 'Payment frequency is required';
  if (form.amountPerFreq === '' || form.amountPerFreq == null)
    e.amountPerFreq = 'Amount per frequency is required';
  else if (isNaN(Number(form.amountPerFreq)) || Number(form.amountPerFreq) < 0)
    e.amountPerFreq = 'Must be a valid positive number';
  if (!form.status) e.status = 'Status is required';
  return e;
}

/* ─────────────────────────────────────────
   SORT ICON
───────────────────────────────────────── */
function SortIcon({ col, sortKey, sortDir }) {
  const active = sortKey === col;
  return (
    <span className="pg-sort-icon">
      <ChevronUp size={10} color={active && sortDir === 'asc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__up" />
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
   CURRENCY INPUT
───────────────────────────────────────── */
function CurrencyInput({ value, onChange, placeholder, readOnly }) {
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
      readOnly={readOnly}
      style={readOnly ? { cursor: 'not-allowed', color: '#049edf', fontWeight: 700 } : {}}
    />
  );
}

/* ═══════════════════════════════════════════
   COMBO DROPDOWN
═══════════════════════════════════════════ */
function ComboDropdown({ value, onChange, onBlur, hasError, placeholder, icon: Icon, options }) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setFocusedIndex(-1); onBlur && onBlur();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onBlur]);

  const select = (opt) => { onChange(opt.value); setOpen(false); setFocusedIndex(-1); };
  const clear = (e) => { e.stopPropagation(); onChange(''); setOpen(false); setFocusedIndex(-1); onBlur && onBlur(); };

  const handleKeyDown = (e) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (focusedIndex >= 0 && options[focusedIndex]) select(options[focusedIndex]); }
    else if (e.key === 'Escape') { setOpen(false); setFocusedIndex(-1); onBlur && onBlur(); }
  };

  return (
    <div className="lc-search-widget" ref={wrapRef}>
      <div className={`pg-field-wrap ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(o => !o)} tabIndex={0} onKeyDown={handleKeyDown}>
        {Icon && <Icon size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />}
        <span style={{ flex: 1, fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: selected ? 700 : 500, color: selected ? '#1a1a2e' : '#b0b0c8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
          {selected ? selected.label : placeholder}
        </span>
        {selected
          ? <X size={13} style={{ flexShrink: 0, cursor: 'pointer', color: '#c0c0d8' }} onClick={clear} />
          : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>
      {open && (
        <div className="lc-dropdown">
          {options.map((opt, idx) => (
            <div key={opt.value}
              className={`lc-dropdown-option${String(opt.value) === String(value) ? ' lc-dropdown-option--focused' : ''}${idx === focusedIndex ? ' lc-dropdown-option--focused' : ''}`}
              onMouseEnter={() => setFocusedIndex(idx)} onMouseDown={() => select(opt)}>
              <div className="lc-dropdown-option__name" style={{ color: String(opt.value) === String(value) ? '#049edf' : '#1a1a2e' }}>{opt.label}</div>
              {String(opt.value) === String(value) && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CUSTOMER SEARCH WIDGET
═══════════════════════════════════════════ */
function CustomerSearchWidget({ customers, value, onChange, error, disabled }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapRef = useRef(null);

  const selected = customers.find(c => c.customerID === Number(value) || c.customerID === value);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(customers.filter(c =>
      (c.customerName || '').toLowerCase().includes(q) ||
      (c.phone1 || '').toLowerCase().includes(q) ||
      String(c.customerID).includes(q)
    ).slice(0, 10));
    setFocusedIndex(-1);
  }, [query, customers]);

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
        const c = results[focusedIndex];
        onChange(c.customerID); setQuery(''); setOpen(false); setResults([]); setFocusedIndex(-1);
      }
    } else if (e.key === 'Escape') { setOpen(false); setFocusedIndex(-1); }
  };

  return (
    <div className="lc-search-widget" ref={wrapRef}>
      {!disabled && (
        <div className={`pg-field-wrap ${error ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
          style={{ cursor: 'text' }} onClick={() => setOpen(true)}>
          <Search size={14} color={error ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
          <input className="pg-field-input" placeholder="Search customer by name, phone or ID..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off" />
          {query && <X size={12} style={{ cursor: 'pointer', color: '#c0c0d8', flexShrink: 0 }}
            onClick={e => { e.stopPropagation(); setQuery(''); setResults([]); setFocusedIndex(-1); }} />}
        </div>
      )}
      {open && results.length > 0 && (
        <div className="lc-dropdown">
          {results.map((c, idx) => (
            <div key={c.customerID}
              className={`lc-dropdown-option${idx === focusedIndex ? ' lc-dropdown-option--focused' : ''}`}
              onMouseEnter={() => setFocusedIndex(idx)}
              onMouseDown={() => { onChange(c.customerID); setQuery(''); setOpen(false); setResults([]); setFocusedIndex(-1); }}>
              <div className="lc-dropdown-option__name">
                <Users size={12} /> {c.customerName}
                <span style={{ color: '#b0b0c8', fontWeight: 600, fontSize: 11, marginLeft: 8 }}>ID: {c.customerID}</span>
              </div>
              {c.phone1 && <div className="lc-dropdown-option__sub">{c.phone1}</div>}
            </div>
          ))}
        </div>
      )}
      {open && query.trim() && results.length === 0 && (
        <div className="lc-dropdown">
          <div className="lc-dropdown-empty"><Users size={18} /><span>No customers found</span></div>
        </div>
      )}
      {value && selected && (
        <div className="lc-selected-card">
          <div className="lc-selected-card__icon"><Users size={15} color="#049edf" /></div>
          <div className="lc-selected-card__info">
            <div className="lc-selected-card__name">{selected.customerName}</div>
            {selected.phone1 && <div className="lc-selected-card__sub">{selected.phone1}</div>}
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
          <div className="lc-selected-card__icon"><Users size={15} color="#049edf" /></div>
          <div className="lc-selected-card__info"><div className="lc-selected-card__name">Customer ID: {value}</div></div>
          {!disabled && <button className="lc-selected-card__clear" onClick={() => onChange('')}><X size={12} /></button>}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   HOARDING LOOKUP MODAL
═══════════════════════════════════════════ */
function HoardingLookupModal({ hoardings, sites, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [sortK, setSortK] = useState('hoardingCode');
  const [sortD, setSortD] = useState('asc');
  const inputRef = useRef(null);

  const siteMap = Object.fromEntries(sites.map(s => [s.siteID, s]));

  const filtered = hoardings.filter(h => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const site = siteMap[h.siteID];
    const addr = [site?.addressLine1, site?.addressLine2, site?.city, site?.district].filter(Boolean).join(' ').toLowerCase();
    return (
      (h.hoardingCode || '').toLowerCase().includes(q) ||
      (h.material || '').toLowerCase().includes(q) ||
      (h.status || '').toLowerCase().includes(q) ||
      addr.includes(q) ||
      String(h.hoardingID).includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = String(a[sortK] ?? '').toLowerCase();
    const bv = String(b[sortK] ?? '').toLowerCase();
    return sortD === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const handleSort = (key) => { if (sortK === key) setSortD(d => d === 'asc' ? 'desc' : 'asc'); else { setSortK(key); setSortD('asc'); } };

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const hSt = (s) => {
    switch (s) {
      case 'Active': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'Inactive': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'Under Maintenance': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
      default: return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
    }
  };

  return ReactDOM.createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99997, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 820, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg,#049edf,#0284c7)', padding: '20px 24px 16px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 17, color: '#fff' }}>Select Hoarding</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>{hoardings.length} hoarding{hoardings.length !== 1 ? 's' : ''} available</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #f0f0f8', flexShrink: 0, background: '#fafafe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid #e8e8f4', borderRadius: 10, padding: '9px 14px' }}>
            <Search size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input ref={inputRef} style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: 'none' }}
              placeholder="Search by code, material, city or status…" value={query} onChange={e => setQuery(e.target.value)} />
            {query && <X size={13} style={{ cursor: 'pointer', color: '#c0c0d8', flexShrink: 0 }} onClick={() => setQuery('')} />}
          </div>
          {query && <div style={{ marginTop: 6, fontFamily: 'Nunito, sans-serif', fontSize: 11.5, color: '#9090a8', fontWeight: 600 }}>{sorted.length} result{sorted.length !== 1 ? 's' : ''} for "{query}"</div>}
        </div>
        {sorted.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
            <Building2 size={40} color="#d0d0e8" />
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#9090a8', fontSize: 14 }}>{query ? `No hoardings match "${query}"` : 'No hoardings available'}</div>
          </div>
        )}
        {sorted.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: '#f8f8fd' }}>
                  {[{ key: 'hoardingCode', label: 'Code' }, { key: 'material', label: 'Material' }, { key: null, label: 'Size' }, { key: null, label: 'Site / Address' }, { key: 'status', label: 'Status' }, { key: 'monthlyRent', label: 'Monthly Rent' }, { key: null, label: '' }].map((col, i) => (
                    <th key={i} onClick={() => col.key && handleSort(col.key)} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#7878a0', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1.5px solid #e8e8f4', cursor: col.key ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {col.label}
                        {col.key && <span style={{ display: 'flex', flexDirection: 'column' }}><ChevronUp size={9} color={sortK === col.key && sortD === 'asc' ? '#049edf' : '#d0d0e4'} /><ChevronDown size={9} color={sortK === col.key && sortD === 'desc' ? '#049edf' : '#d0d0e4'} style={{ marginTop: -2 }} /></span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((h, idx) => {
                  const site = siteMap[h.siteID];
                  const addr = site ? [site.addressLine1, site.city, site.district].filter(Boolean).join(', ') : `Site ${h.siteID}`;
                  const st = hSt(h.status);
                  return (
                    <tr key={h.hoardingID} onClick={() => onSelect(h)} style={{ cursor: 'pointer', background: idx % 2 === 0 ? '#fff' : '#fafafe', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f8ff'} onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafe'}>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8' }}>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 13, color: '#049edf' }}>{h.hoardingCode}</div>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#b0b0c8', fontWeight: 600, marginTop: 1 }}>ID: {h.hoardingID}</div>
                      </td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8' }}><span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#4a5568' }}>{h.material || '—'}</span></td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8', whiteSpace: 'nowrap' }}>
                        {h.width && h.height ? (<><div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#4a5568' }}>{h.width} × {h.height} ft</div><div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#b0b0c8', fontWeight: 600 }}>{h.width * h.height} sq ft</div></>) : <span style={{ color: '#c0c0d8' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8', maxWidth: 200 }}>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={addr}>
                          <MapPin size={11} color="#c0c0d8" style={{ marginRight: 4, verticalAlign: 'middle' }} />{addr}
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: 11, fontWeight: 800, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}>{h.status || '—'}</span>
                      </td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800, color: '#1a1a2e' }}>{h.monthlyRent ? fmtCurrency(h.monthlyRent) : '—'}</span>
                      </td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8', textAlign: 'right' }}>
                        <button onClick={() => onSelect(h)} style={{ padding: '6px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#049edf,#0284c7)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(4,158,223,0.3)', whiteSpace: 'nowrap' }}>
                          <Check size={12} /> Select
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafe', flexShrink: 0 }}>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600 }}>Click a row or <strong>Select</strong> to choose a hoarding</span>
          <button onClick={onClose} className="pg-btn-cancel" style={{ fontSize: 12 }}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   HOARDING PICKER FIELD
═══════════════════════════════════════════ */
function HoardingPickerField({ hoardings, sites, value, onChange, error, disabled }) {
  const [modalOpen, setModalOpen] = useState(false);
  const selected = hoardings.find(h => h.hoardingID === Number(value) || h.hoardingID === value);
  const siteMap = Object.fromEntries(sites.map(s => [s.siteID, s]));

  const hSt = selected?.status ? (() => {
    switch (selected.status) {
      case 'Active': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'Inactive': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'Under Maintenance': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
      default: return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
    }
  })() : null;

  return (
    <div>
      {!disabled && (
        <button type="button" onClick={() => setModalOpen(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${error ? '#ef4444' : '#e8e8f4'}`, background: '#fff', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontSize: 13, color: value ? '#1a1a2e' : '#b0b0c8', fontWeight: value ? 700 : 500, boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none', transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#049edf'}
          onMouseLeave={e => e.currentTarget.style.borderColor = error ? '#ef4444' : '#e8e8f4'}>
          <Building2 size={14} color={error ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, textAlign: 'left' }}>
            {value
              ? (selected ? `${selected.hoardingCode}${selected.width && selected.height ? ` · ${selected.width}×${selected.height} ft` : ''}` : `Hoarding ID: ${value}`)
              : 'Click to browse & select hoarding…'}
          </span>
          {value
            ? <X size={13} color="#c0c0d8" style={{ flexShrink: 0 }} onClick={e => { e.stopPropagation(); onChange(''); }} />
            : <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
        </button>
      )}
      {value && selected && (() => {
        const site = siteMap[selected.siteID];
        const addr = site ? [site.addressLine1, site.city, site.district].filter(Boolean).join(', ') : '';
        return (
          <div className="lc-selected-card" style={{ marginTop: 8 }}>
            <div className="lc-selected-card__icon"><Building2 size={15} color="#6c63ff" /></div>
            <div className="lc-selected-card__info" style={{ flex: 1 }}>
              <div className="lc-selected-card__name" style={{ color: '#6c63ff' }}>
                {selected.hoardingCode}
                {selected.width && selected.height && <span style={{ color: '#9090a8', fontWeight: 500, marginLeft: 8, fontSize: 12 }}>{selected.width}×{selected.height} ft</span>}
              </div>
              <div className="lc-selected-card__sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 3 }}>
                {selected.material && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#7878a0' }}><Tag size={10} /> {selected.material}</span>}
                {hSt && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 10, background: hSt.bg, color: hSt.color, border: `1px solid ${hSt.border}`, fontSize: 10.5, fontWeight: 800 }}>{selected.status}</span>}
                {selected.monthlyRent && <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>{fmtCurrency(selected.monthlyRent)}/mo</span>}
                {addr && <span style={{ fontSize: 11, color: '#9090a8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} /> {addr}</span>}
              </div>
            </div>
            {!disabled && (
              <>
                <button onClick={() => setModalOpen(true)} style={{ background: 'rgba(4,158,223,0.08)', border: '1px solid rgba(4,158,223,0.2)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', color: '#049edf', fontSize: 11, fontWeight: 800, fontFamily: 'Nunito, sans-serif', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                  <RefreshCw size={11} /> Change
                </button>
                <button className="lc-selected-card__clear" onClick={() => onChange('')} title="Clear"><X size={12} /></button>
              </>
            )}
          </div>
        );
      })()}
      {modalOpen && <HoardingLookupModal hoardings={hoardings} sites={sites} onSelect={(h) => { onChange(h.hoardingID); setModalOpen(false); }} onClose={() => setModalOpen(false)} />}
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
        <div className="exp-delete-modal__sub">Contract <strong>#{contract.customerContractID}</strong> will be permanently removed.</div>
        <div className="exp-delete-modal__actions">
          <button className="pg-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="exp-btn-delete-confirm" onClick={onConfirm}><Trash2 size={13} /> Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ATTACHMENT DELETE CONFIRM MODAL
═══════════════════════════════════════════ */
function AttachDeleteModal({ attach, onConfirm, onCancel }) {
  return ReactDOM.createPortal(
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, padding: '28px 28px 22px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fef2f2', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <Trash2 size={22} color="#dc2626" />
        </div>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 17, color: '#1a1a2e', marginBottom: 6 }}>Delete Attachment?</div>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 22, lineHeight: 1.5 }}>
          <strong style={{ color: '#374151' }}>{attach?.contractFilename || 'This file'}</strong> will be permanently removed.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="pg-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="exp-btn-delete-confirm" onClick={onConfirm} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Trash2 size={13} /> Delete</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   ATTACHMENT SECTION
═══════════════════════════════════════════ */
const API_ROOT_URL = 'https://api.jalaram-ad.ashtamtechnologies.com';

function AttachmentSection({ customerContractID, hoardingID, ownerID, onAttachmentsChange }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [newFile, setNewFile] = useState(null);
  const [newType, setNewType] = useState('');
  const [typeErr, setTypeErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadOk, setUploadOk] = useState(false);

  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceType, setReplaceType] = useState('');
  const [replaceErr, setReplaceErr] = useState('');
  const [replacing, setReplacing] = useState(false);

  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);

  // Use a ref so fetchAttachments never needs onAttachmentsChange in its deps
  // This prevents the infinite re-render loop
  const onAttachmentsChangeRef = useRef(onAttachmentsChange);
  useEffect(() => { onAttachmentsChangeRef.current = onAttachmentsChange; }, [onAttachmentsChange]);

  const fetchAttachments = useCallback(async () => {
    if (!customerContractID) return;
    setLoading(true);
    try {
      const list = await apiService.getCustContractAttachments(customerContractID);
      const normalized = (Array.isArray(list) ? list : []).map(normalizeAttach);
      setAttachments(normalized);
      onAttachmentsChangeRef.current?.(normalized);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [customerContractID]); // ← onAttachmentsChange intentionally NOT here (using ref instead)

  useEffect(() => { fetchAttachments(); }, [fetchAttachments]);

  /* ── Upload new ── */
  const handleUpload = async () => {
    setTypeErr(''); setUploadErr('');
    if (!newFile) return;
    if (!newType) { setTypeErr('Please select a document type'); return; }
    setUploading(true);
    try {
      await apiService.createCustContractAttach({
        customerContractID,
        ownerID: Number(ownerID) || 0,
        hoardingID: Number(hoardingID) || 0,
        fileUploadType: newType,
        file: newFile,
      });
      setUploadOk(true);
      setNewFile(null); setNewType('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchAttachments();
      setTimeout(() => setUploadOk(false), 2000);
    } catch (err) {
      setUploadErr(err?.response?.data?.message || err?.message || 'Upload failed.');
    } finally { setUploading(false); }
  };

  /* ── Replace existing ── */
  const handleReplace = async () => {
    setReplaceErr('');
    if (!replaceFile) return;
    if (!replaceType) { setReplaceErr('Please select a document type'); return; }
    setReplacing(true);
    try {
      await apiService.updateCustContractAttach({
        custContractAttachID: editTarget.custContractAttachID,
        customerContractID,
        ownerID: Number(ownerID) || editTarget.ownerID || 0,
        hoardingID: Number(hoardingID) || 0,
        fileUploadType: replaceType,
        file: replaceFile,
      });
      setEditTarget(null); setReplaceFile(null); setReplaceType('');
      if (replaceInputRef.current) replaceInputRef.current.value = '';
      await fetchAttachments();
    } catch (err) {
      setReplaceErr(err?.response?.data?.message || err?.message || 'Update failed.');
    } finally { setReplacing(false); }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiService.deleteCustContractAttach(deleteTarget.custContractAttachID);
      setAttachments(prev => {
        const updated = prev.filter(a => a.custContractAttachID !== deleteTarget.custContractAttachID);
        onAttachmentsChangeRef.current?.(updated);
        return updated;
      });
    } catch { /* silent */ }
    finally { setDeleteTarget(null); }
  };

  const fileUrl = (a) => {
    const p = a.contractFilePath || a.contractFilename || '';
    if (!p) return null;
    if (p.startsWith('http')) return p;
    return `${API_ROOT_URL}/${p.replace(/^\/?/, '')}`;
  };

  return (
    <div className="hd-section-card" style={{ marginTop: 0 }}>
      <div className="hd-section-head">
        <div className="hd-section-icon-wrap"><Paperclip size={14} color="#049edf" /></div>
        <div>
          <div className="hd-section-title">Attachments</div>
          <div className="hd-section-sub">Upload contract documents or hoarding images</div>
        </div>
        {attachments.length > 0 && (
          <span style={{ marginLeft: 'auto', background: 'rgba(4,158,223,0.1)', color: '#049edf', border: '1px solid rgba(4,158,223,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 11.5, fontWeight: 800, fontFamily: 'Nunito, sans-serif' }}>
            {attachments.length} file{attachments.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="hd-section-body">

        {!customerContractID && (
          <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Nunito, sans-serif', fontSize: 12.5, color: '#92400e', fontWeight: 700 }}>
            <AlertTriangle size={14} color="#d97706" />
            Save the contract first, then you can upload attachments.
          </div>
        )}

        {customerContractID && (
          <div style={{ background: '#f8f8fd', border: '1.5px dashed #d0d0e8', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800, color: '#7878a0', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={13} /> Upload New Attachment
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: '1 1 160px', minWidth: 150 }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11.5, fontWeight: 700, color: '#9090a8', marginBottom: 4 }}>Document Type *</div>
                <select
                  value={newType}
                  onChange={e => { setNewType(e.target.value); setTypeErr(''); }}
                  style={{ width: '100%', padding: '9px 10px', border: `1.5px solid ${typeErr ? '#ef4444' : '#e0e0f0'}`, borderRadius: 8, fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: newType ? '#1a1a2e' : '#b0b0c8', background: '#fff', cursor: 'pointer', outline: 'none' }}>
                  <option value="">Select type…</option>
                  {FILE_UPLOAD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {typeErr && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: '#ef4444', fontSize: 11, fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}><AlertCircle size={11} />{typeErr}</div>}
              </div>

              <div style={{ flex: '2 1 220px' }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11.5, fontWeight: 700, color: '#9090a8', marginBottom: 4 }}>File *</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #e0e0f0', borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}>
                  <Upload size={13} color="#c0c0d8" />
                  <span style={{ flex: 1, fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: newFile ? 700 : 500, color: newFile ? '#1a1a2e' : '#b0b0c8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {newFile ? newFile.name : 'Choose file…'}
                  </span>
                  {newFile && <X size={12} color="#c0c0d8" onClick={e => { e.stopPropagation(); setNewFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} />}
                </div>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => setNewFile(e.target.files?.[0] || null)} />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 0 }}>
                <button
                  onClick={handleUpload}
                  disabled={!newFile || uploading}
                  style={{ padding: '9px 18px', borderRadius: 8, background: newFile ? 'linear-gradient(135deg,#049edf,#0284c7)' : '#e8e8f4', color: newFile ? '#fff' : '#b0b0c8', border: 'none', cursor: newFile ? 'pointer' : 'not-allowed', fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', boxShadow: newFile ? '0 2px 8px rgba(4,158,223,0.3)' : 'none', transition: 'all 0.15s', marginTop: 20 }}>
                  {uploadOk
                    ? <><Check size={13} /> Uploaded!</>
                    : uploading
                      ? <><Loader2 size={13} className="pg-spin" /> Uploading…</>
                      : <><Upload size={13} /> Upload</>}
                </button>
              </div>
            </div>
            {uploadErr && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>
                <AlertCircle size={13} />{uploadErr}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9090a8', fontFamily: 'Nunito, sans-serif', fontSize: 13 }}>
            <Loader2 size={20} className="pg-spin" style={{ marginBottom: 6 }} /><br />Loading attachments…
          </div>
        )}

        {!loading && attachments.length === 0 && customerContractID && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#b0b0c8', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600 }}>
            <Paperclip size={30} color="#d8d8ee" style={{ marginBottom: 8 }} /><br />No attachments yet
          </div>
        )}

        {!loading && attachments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #f0f0f8', borderRadius: 10, overflow: 'hidden' }}>
            {attachments.map((a, idx) => {
              const ts = uploadTypeStyle(a.fileUploadType);
              const url = fileUrl(a);
              const isImg = isImageFile(a.contractFilename);
              const isEditing = editTarget?.custContractAttachID === a.custContractAttachID;

              return (
                <div key={a.custContractAttachID} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafe', borderBottom: idx < attachments.length - 1 ? '1px solid #f0f0f8' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', flexWrap: 'wrap' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: isImg ? '#f5f3ff' : '#eff6ff', border: `1px solid ${isImg ? '#ddd6fe' : '#bfdbfe'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {fileTypeIcon(a.contractFilename)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 13, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.contractFilename || 'Unnamed file'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 12, background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`, fontSize: 10.5, fontWeight: 800, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}>
                          {a.fileUploadType || '—'}
                        </span>
                        {a.lastUpdateDttm && (
                          <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#b0b0c8', fontWeight: 600 }}>
                            {new Date(a.lastUpdateDttm).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {isImg && url && (
                        <button title="Preview" onClick={() => setPreviewUrl(url)}
                          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e8e8f4', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c63ff' }}>
                          <Eye size={14} />
                        </button>
                      )}
                      {url && (
                        <a href={url} target="_blank" rel="noreferrer" title="Download / Open"
                          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e8e8f4', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#049edf', textDecoration: 'none' }}>
                          <Download size={14} />
                        </a>
                      )}
                      <button title="Replace file" onClick={() => { setEditTarget(a); setReplaceType(a.fileUploadType || ''); setReplaceFile(null); setReplaceErr(''); if (replaceInputRef.current) replaceInputRef.current.value = ''; }}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e8e8f4', background: isEditing ? '#eff6ff' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#049edf' }}>
                        <Edit2 size={14} />
                      </button>
                      <button title="Delete" onClick={() => setDeleteTarget(a)}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div style={{ padding: '10px 14px 14px', background: '#f0f8ff', borderTop: '1px solid #bfdbfe' }}>
                      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, color: '#1d4ed8', marginBottom: 10 }}>Replace this file</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: '1 1 150px' }}>
                          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11.5, fontWeight: 700, color: '#9090a8', marginBottom: 4 }}>Document Type *</div>
                          <select
                            value={replaceType}
                            onChange={e => { setReplaceType(e.target.value); setReplaceErr(''); }}
                            style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${replaceErr ? '#ef4444' : '#bfdbfe'}`, borderRadius: 8, fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: replaceType ? '#1a1a2e' : '#b0b0c8', background: '#fff', cursor: 'pointer', outline: 'none' }}>
                            <option value="">Select type…</option>
                            {FILE_UPLOAD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: '2 1 200px' }}>
                          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11.5, fontWeight: 700, color: '#9090a8', marginBottom: 4 }}>New file *</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}
                            onClick={() => replaceInputRef.current?.click()}>
                            <Upload size={13} color="#c0c0d8" />
                            <span style={{ flex: 1, fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: replaceFile ? 700 : 500, color: replaceFile ? '#1a1a2e' : '#b0b0c8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {replaceFile ? replaceFile.name : 'Choose replacement…'}
                            </span>
                            {replaceFile && <X size={12} color="#c0c0d8" onClick={e => { e.stopPropagation(); setReplaceFile(null); if (replaceInputRef.current) replaceInputRef.current.value = ''; }} />}
                          </div>
                          <input ref={replaceInputRef} type="file" style={{ display: 'none' }} onChange={e => setReplaceFile(e.target.files?.[0] || null)} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => { setEditTarget(null); setReplaceFile(null); setReplaceErr(''); }} className="pg-btn-cancel" style={{ fontSize: 12 }}>Cancel</button>
                          <button onClick={handleReplace} disabled={!replaceFile || replacing}
                            style={{ padding: '8px 16px', borderRadius: 8, background: replaceFile ? 'linear-gradient(135deg,#049edf,#0284c7)' : '#e8e8f4', color: replaceFile ? '#fff' : '#b0b0c8', border: 'none', cursor: replaceFile ? 'pointer' : 'not-allowed', fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, boxShadow: replaceFile ? '0 2px 8px rgba(4,158,223,0.3)' : 'none' }}>
                            {replacing ? <><Loader2 size={12} className="pg-spin" /> Saving…</> : <><Check size={12} /> Save</>}
                          </button>
                        </div>
                      </div>
                      {replaceErr && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>
                          <AlertCircle size={13} />{replaceErr}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {previewUrl && ReactDOM.createPortal(
        <div onClick={() => setPreviewUrl(null)} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }}>
            <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.5)', display: 'block' }} />
            <button onClick={() => setPreviewUrl(null)} style={{ position: 'absolute', top: -14, right: -14, width: 32, height: 32, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              <X size={15} color="#374151" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {deleteTarget && <AttachDeleteModal attach={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CONTRACT FORM
═══════════════════════════════════════════ */
function ContractForm({ mode, contract, customers, hoardings, sites, paymentFreqs, contracts, landContracts = [], hoardingMaps = [], onBack, onSave }) {
  const isAdd = mode === 'add';
  const currentContractID = isAdd ? null : (contract?.customerContractID ?? null);
const checkLandContractWarning = (hoardingID, endDate) => {
  if (!hoardingID || !endDate) { setLandContractWarning(null); return; }

  // Find all land contract maps for this hoarding
  const maps = hoardingMaps.filter(m =>
    Number(m.hoardingID ?? m.HoardingID) === Number(hoardingID)
  );

  if (!maps.length) { setLandContractWarning(null); return; }

  for (const map of maps) {
    const lcID = map.landContractID ?? map.LandContractID;
    const lc = landContracts.find(c => Number(c.landContractID) === Number(lcID));
    if (!lc || !lc.endDate) continue;

    if (endDate > lc.endDate) {
      setLandContractWarning({
        landContractID: lc.landContractID,
        landContractEnd: lc.endDate,
        status: lc.status,
      });
      return;
    }
  }

  setLandContractWarning(null);
};
  const [form, setForm] = useState(() =>
    isAdd ? { ...EMPTY_FORM } : {
      customerID: contract?.customerID ?? '',
      hoardingID: contract?.hoardingID ?? '',
      startDate: contract?.startDate ?? '',
      endDate: contract?.endDate ?? '',
      contractOrigValue: contract?.contractOrigValue ?? '',
      paymentFreqID: contract?.paymentFreqID ?? '',
      amountPerFreq: contract?.amountPerFreq ?? '',
      advancePaid: contract?.advancePaid ?? '',
      status: contract?.status ?? 'Active',
      discountAmount: contract?.discountAmount ?? '',
      adjustmentAmount: contract?.adjustmentAmount ?? '',
      contractFinalValue: contract?.contractFinalValue ?? '',
      comments: contract?.comments ?? '',
    }
  );

  const [savedContractID, setSavedContractID] = useState(
    isAdd ? null : (contract?.customerContractID ?? null)
  );

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [liveConflict, setLiveConflict] = useState(null);        // ← must be here
const [landContractWarning, setLandContractWarning] = useState(null);

  // ── New states for attachment flow ──
  const [contractSaved, setContractSaved] = useState(!isAdd); // true immediately in edit mode
  const [attachmentList, setAttachmentList] = useState([]);
  const [bannerErr, setBannerErr] = useState('');

  // Stable callback — avoids infinite re-render in AttachmentSection
  const handleAttachmentsChange = useCallback((list) => {
    setAttachmentList(list);
    // Auto-clear the banner error once a Banner Design is uploaded
    setBannerErr(prev =>
      prev && list.some(a => a.fileUploadType === 'Banner Design') ? '' : prev
    );
  }, []);

  const freqOptions = paymentFreqs.length ? paymentFreqs : PAYMENT_FREQ_FALLBACK;

const set = (key, val) => {
  setForm(p => {
    const next = { ...p, [key]: val };
    if (key === 'hoardingID' || key === 'startDate' || key === 'endDate') {
      setLiveConflict(detectHoardingConflict(next, contracts, currentContractID));
      checkLandContractWarning(
        key === 'hoardingID' ? val : next.hoardingID,
        key === 'endDate' ? val : next.endDate
      );
    }
    return next;
  });
  if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
};

  useEffect(() => {
    const orig = Number(String(form.contractOrigValue).replace(/,/g, '')) || 0;
    const disc = Number(String(form.discountAmount).replace(/,/g, '')) || 0;
    const adj = Number(String(form.adjustmentAmount).replace(/,/g, '')) || 0;
    const final = orig - disc + adj;
    setForm(p => ({ ...p, contractFinalValue: final >= 0 ? final : 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.contractOrigValue, form.discountAmount, form.adjustmentAmount]);

  /* ── Save contract ── */
  const handleSave = async () => {
    const errs = validateForm(form, contracts, currentContractID);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true); setApiErr('');
    try {
      const payload = {
        customerContractID: isAdd ? 0 : contract.customerContractID,
        customerID: Number(form.customerID),
        hoardingID: Number(form.hoardingID),
        startDate: form.startDate,
        endDate: form.endDate,
        contractOrigValue: Number(String(form.contractOrigValue).replace(/,/g, '')) || 0,
        paymentFreqID: Number(form.paymentFreqID),
        amountPerFreq: Number(String(form.amountPerFreq).replace(/,/g, '')) || 0,
        advancePaid: Number(String(form.advancePaid).replace(/,/g, '')) || 0,
        status: form.status,
        discountAmount: Number(String(form.discountAmount).replace(/,/g, '')) || 0,
        adjustmentAmount: Number(String(form.adjustmentAmount).replace(/,/g, '')) || 0,
        contractFinalValue: Number(String(form.contractFinalValue).replace(/,/g, '')) || 0,
        comments: form.comments || '',
      };

      let saved;
      if (isAdd) {
        const res = await apiService.createCustomerContract(payload);
        saved = normalizeContract(res?.data ?? res ?? payload);
      } else {
        const res = await apiService.updateCustomerContract(payload);
        saved = normalizeContract(res?.data ?? res ?? { ...payload, customerContractID: contract.customerContractID });
      }

      if (saved.customerContractID) setSavedContractID(saved.customerContractID);

      setSaveOk(true);
      onSave(saved, isAdd);

      if (isAdd) {
        // Stay on the form — user must upload a Banner Design image next
        setContractSaved(true);
        setTimeout(() => setSaveOk(false), 2500);
      } else {
        // Edit mode: navigate back after short delay
        setTimeout(() => onBack(), 900);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Save failed.';
      setApiErr(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setSaving(false); }
  };

  /* ── Finish (add mode only) — validates banner image ── */
  const handleFinish = () => {
    const hasBanner = attachmentList.some(a => a.fileUploadType === 'Banner Design');
    if (!hasBanner) {
      setBannerErr('Banner Design image is required. Please upload one before finishing.');
      // Scroll to attachment section
      document.querySelector('.hd-attach-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    onBack();
  };

  const hasBanner = attachmentList.some(a => a.fileUploadType === 'Banner Design');

  return (
    <div className="hd-form-page">
      <div className="hd-topbar">
        <div className="hd-topbar-left">
          <button className="hd-back-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span className="d-none d-sm-inline">Back to Contracts</span>
            <span className="d-inline d-sm-none">Back</span>
          </button>
          <div className="hd-topbar-divider" />
          <div>
            <div className="hd-topbar-title">{isAdd ? 'Add Customer Contract' : `Edit Contract #${contract?.customerContractID}`}</div>
            <div className="hd-topbar-sub">{isAdd ? 'Fill in the details to create a new customer contract' : 'Update customer contract details'}</div>
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

          {/* ── Live double-booking warning ── */}
          {liveConflict && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 16px', marginBottom: 16,
              background: '#fef2f2', border: '1.5px solid #fecaca',
              borderRadius: 10, fontFamily: 'Nunito, sans-serif',
            }}>
              <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#dc2626', marginBottom: 3 }}>
                  Hoarding Already Booked
                </div>
                <div style={{ fontWeight: 600, fontSize: 12.5, color: '#991b1b', lineHeight: 1.55 }}>
                  This hoarding is booked under{' '}
                  <strong>Contract #{liveConflict.customerContractID}</strong>{' '}
                  from <strong>{fmtDate(liveConflict.startDate)}</strong> to{' '}
                  <strong>{fmtDate(liveConflict.endDate)}</strong>
                  {liveConflict.status && (
                    <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 10, background: '#fee2e2', color: '#dc2626', fontSize: 11, fontWeight: 800, border: '1px solid #fca5a5' }}>
                      {liveConflict.status}
                    </span>
                  )}.
                  {' '}Please select different dates or a different hoarding.
                </div>
              </div>
            </div>
          )}
{landContractWarning && (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '12px 16px', marginBottom: 16,
    background: '#fffbeb', border: '1.5px solid #fde68a',
    borderRadius: 10, fontFamily: 'Nunito, sans-serif',
  }}>
    <AlertCircle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
    <div>
      <div style={{ fontWeight: 800, fontSize: 13, color: '#d97706', marginBottom: 3 }}>
        Land Contract Ends Before Customer Contract
      </div>
      <div style={{ fontWeight: 600, fontSize: 12.5, color: '#92400e', lineHeight: 1.55 }}>
        The land contract <strong>#{landContractWarning.landContractID}</strong> for this hoarding
        ends on <strong>{fmtDate(landContractWarning.landContractEnd)}.</strong>
      </div>
    </div>
  </div>
)}
          {/* ── Step indicator (add mode only) ── */}
          {/* {isAdd && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, background: '#f8f8fd', border: '1px solid #e8e8f4', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: contractSaved ? 'rgba(22,163,74,0.06)' : 'rgba(4,158,223,0.06)', borderRight: '1px solid #e8e8f4' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: contractSaved ? '#16a34a' : '#049edf', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {contractSaved ? <Check size={13} color="#fff" /> : <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, color: '#fff' }}>1</span>}
                </div>
                <div>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800, color: contractSaved ? '#16a34a' : '#049edf' }}>Contract Details</div>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600 }}>{contractSaved ? 'Saved' : 'Fill & save'}</div>
                </div>
              </div>
              <div style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: hasBanner ? 'rgba(22,163,74,0.06)' : contractSaved ? 'rgba(4,158,223,0.06)' : 'transparent', opacity: contractSaved ? 1 : 0.45 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: hasBanner ? '#16a34a' : contractSaved ? '#049edf' : '#d0d0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {hasBanner ? <Check size={13} color="#fff" /> : <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, color: '#fff' }}>2</span>}
                </div>
                <div>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800, color: hasBanner ? '#16a34a' : contractSaved ? '#049edf' : '#9090a8' }}>Banner Image</div>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600 }}>{hasBanner ? 'Uploaded ✓' : 'Required'}</div>
                </div>
              </div>
            </div>
          )} */}

          <div className="row g-4">

            {/* ── Customer & Hoarding ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><Users size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Customer &amp; Hoarding</div>
                    <div className="hd-section-sub">Select the customer and hoarding for this contract</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Customer" required />
                      <CustomerSearchWidget customers={customers} value={form.customerID} onChange={val => set('customerID', val)} error={errors.customerID} disabled={!isAdd} />
                      <FieldError msg={errors.customerID} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Hoarding" required />
                      <HoardingPickerField hoardings={hoardings} sites={sites} value={form.hoardingID} onChange={val => set('hoardingID', val)} error={errors.hoardingID} disabled={!isAdd} />
                      <FieldError msg={errors.hoardingID} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Duration & Status ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><Calendar size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Contract Duration</div>
                    <div className="hd-section-sub">Set the start date, end date and status</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <FieldLabel label="Start Date" required />
                      <InputWrap error={errors.startDate} icon={Calendar}>
                        <input className="pg-field-input" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                      </InputWrap>
                      <FieldError msg={errors.startDate} />
                    </div>
                    <div className="col-12 col-md-4">
                      <FieldLabel label="End Date" required />
                      <InputWrap error={errors.endDate} icon={Calendar}>
                        <input className="pg-field-input" type="date" value={form.endDate} min={form.startDate || undefined} onChange={e => set('endDate', e.target.value)} />
                      </InputWrap>
                      <FieldError msg={errors.endDate} />
                    </div>
                    <div className="col-12 col-md-4">
                      <FieldLabel label="Status" required />
                      <ComboDropdown value={form.status} onChange={val => set('status', val)} onBlur={() => { }} hasError={!!errors.status} placeholder="Select status…" icon={ShieldCheck} options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))} />
                      <FieldError msg={errors.status} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Financial Details ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><IndianRupee size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Financial Details</div>
                    <div className="hd-section-sub">Contract value, payment schedule, discounts and adjustments</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Original Contract Value (Rs.)" required />
                      <InputWrap error={errors.contractOrigValue} icon={IndianRupee}>
                        <CurrencyInput value={form.contractOrigValue} onChange={val => set('contractOrigValue', val)} placeholder="e.g. 5,00,000" />
                      </InputWrap>
                      <FieldError msg={errors.contractOrigValue} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Payment Frequency" required />
                      <ComboDropdown value={form.paymentFreqID} onChange={val => set('paymentFreqID', val)} onBlur={() => { }} hasError={!!errors.paymentFreqID} placeholder="Select frequency…" icon={CreditCard} options={freqOptions} />
                      <FieldError msg={errors.paymentFreqID} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Amount per Frequency (Rs.)" required />
                      <InputWrap error={errors.amountPerFreq} icon={IndianRupee}>
                        <CurrencyInput value={form.amountPerFreq} onChange={val => set('amountPerFreq', val)} placeholder="e.g. 25,000" />
                      </InputWrap>
                      <FieldError msg={errors.amountPerFreq} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Advance Paid (Rs.)" optional />
                      <InputWrap icon={IndianRupee}>
                        <CurrencyInput value={form.advancePaid} onChange={val => set('advancePaid', val)} placeholder="e.g. 50,000" />
                      </InputWrap>
                    </div>
                    <div className="col-12 col-md-4">
                      <FieldLabel label="Discount Amount (Rs.)" optional />
                      <InputWrap icon={IndianRupee}>
                        <CurrencyInput value={form.discountAmount} onChange={val => set('discountAmount', val)} placeholder="e.g. 10,000" />
                      </InputWrap>
                    </div>
                    <div className="col-12 col-md-4">
                      <FieldLabel label="Adjustment Amount (Rs.)" optional />
                      <InputWrap icon={IndianRupee}>
                        <CurrencyInput value={form.adjustmentAmount} onChange={val => set('adjustmentAmount', val)} placeholder="e.g. 5,000" />
                      </InputWrap>
                    </div>
                    <div className="col-12 col-md-4">
                      <FieldLabel label="Final Contract Value (Rs.)" />
                      <div style={{ position: 'relative' }}>
                        <InputWrap icon={IndianRupee}>
                          <CurrencyInput value={form.contractFinalValue} onChange={() => { }} placeholder="Auto-calculated" readOnly />
                        </InputWrap>
                        <div style={{ marginTop: 4, fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600 }}>
                          = Original − Discount + Adjustment
                        </div>
                      </div>
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
                    <div className="hd-section-sub">Any remarks about this contract</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <FieldLabel label="Comments" optional />
                  <InputWrap icon={MessageSquare}>
                    <textarea className="pg-field-input lc-textarea" rows={3}
                      placeholder="Any notes or remarks..." value={form.comments}
                      onChange={e => set('comments', e.target.value)} />
                  </InputWrap>
                </div>
              </div>
            </div>

            {/* ── Attachments ── */}
            <div className="col-12 hd-attach-section">

              {/* Banner requirement notice / error bar */}
              {contractSaved && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '11px 16px', marginBottom: 10,
                  background: bannerErr ? '#fef2f2' : '#fffbeb',
                  border: `1.5px solid ${bannerErr ? '#fecaca' : '#fde68a'}`,
                  borderRadius: 10,
                  fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700,
                  color: bannerErr ? '#dc2626' : '#92400e',
                  transition: 'all 0.2s',
                }}>
                  <AlertTriangle size={15} color={bannerErr ? '#dc2626' : '#d97706'} style={{ flexShrink: 0 }} />
                  <span>
                    {bannerErr
                      ? bannerErr
                      : 'Required: Upload at least one Banner Design image to complete this contract.'}
                  </span>
                  {hasBanner && (
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, color: '#16a34a', fontWeight: 800, fontSize: 12 }}>
                      <Check size={13} /> Banner uploaded
                    </span>
                  )}
                </div>
              )}

              {(() => {
                const selectedHoarding = hoardings.find(h => h.hoardingID === Number(form.hoardingID) || h.hoardingID === form.hoardingID);
                const selectedSite = sites.find(s => s.siteID === selectedHoarding?.siteID);
                const resolvedOwnerID = selectedSite?.ownerID ?? 0;
                return (
                  <AttachmentSection
                    customerContractID={savedContractID}
                    hoardingID={form.hoardingID}
                    ownerID={resolvedOwnerID}
                    onAttachmentsChange={handleAttachmentsChange}
                  />
                );
              })()}
            </div>

          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="hd-form-footer hd-form-footer--sticky">
        <button className="pg-btn-cancel" onClick={onBack} disabled={saving}>
          {isAdd && contractSaved ? 'Back to Contracts' : 'Cancel'}
        </button>

        {/* Save button — shown only when contract not yet saved (add) or always in edit */}
        {(!isAdd || !contractSaved) && (
          <button
            className="pg-btn-save"
            onClick={handleSave}
            disabled={saving || !!liveConflict}
            title={liveConflict ? 'Resolve the double-booking conflict before saving' : ''}
            style={liveConflict ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
          >
            {saveOk
              ? <><Check size={13} /> Saved!</>
              : saving
                ? <><Loader2 size={13} className="pg-spin" /> Saving...</>
                : liveConflict
                  ? <><AlertCircle size={13} /> Booking Conflict</>
                  : <><Check size={13} /> {isAdd ? 'Save Contract' : 'Update Contract'}</>}
          </button>
        )}

        {/* Finish button — shown in add mode after contract is saved */}
        {isAdd && contractSaved && (
          <button
            className="pg-btn-save"
            onClick={handleFinish}
            style={{
              background: hasBanner
                ? 'linear-gradient(135deg,#16a34a,#15803d)'
                : 'linear-gradient(135deg,#049edf,#0284c7)',
            }}
          >
            <Check size={13} />
            {hasBanner ? 'Finish & Go Back' : 'Finish (Banner Required)'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function CustomerContractPage() {
  const [customers, setCustomers] = useState([]);
  const [hoardings, setHoardings] = useState([]);
  const [sites, setSites] = useState([]);
  const [paymentFreqs, setPaymentFreqs] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [landContracts, setLandContracts] = useState([]);      // ← add
const [hoardingMaps, setHoardingMaps] = useState([]);         // ← add
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [view, setView] = useState('grid');
  const [formMode, setFormMode] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState('startDate');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const tableRef = useRef(null);
  const [tableReady, setTableReady] = useState(false);
  useEffect(() => { if (!loadingMeta) setTableReady(true); }, [loadingMeta]);
  useResizableColumns(tableRef, tableReady, [60, 160, 160, 110, 110, 130, 100, 90]);

  const fetchAll = useCallback(async () => {
    setLoadingMeta(true); setLoadError('');
    try {
const [rawCustomers, rawHoardings, rawSites, rawContracts, rawFreqs, rawLandContracts, rawMaps] = await Promise.all([
  apiService.getAllCustomers(),
  apiService.getAllHoardings(),
  apiService.getAllSites(),
  apiService.getAllCustomerContracts(),
  apiService.getAllPaymentFreqs(),
  apiService.getAllLandContracts(),
  apiService.getAllLandContractHoardingMaps(),
]);
      setCustomers(Array.isArray(rawCustomers) ? rawCustomers : rawCustomers?.data ?? []);
      setHoardings(
        Array.isArray(rawHoardings) ? deduplicateHoardings(rawHoardings)
          : Array.isArray(rawHoardings?.data) ? deduplicateHoardings(rawHoardings.data) : []
      );
      setSites(Array.isArray(rawSites) ? rawSites : rawSites?.data ?? []);
      const freqList = Array.isArray(rawFreqs) ? rawFreqs : rawFreqs?.data ?? [];
      setPaymentFreqs(freqList.map(f => ({
        value: f.paymentFreqID ?? f.PaymentFreqID ?? f.id,
        label: f.freqName ?? f.FreqName ?? f.name ?? f.label ?? String(f.paymentFreqID),
      })));
      const list = Array.isArray(rawContracts) ? rawContracts : rawContracts?.data ?? [];
      setContracts(list.map(normalizeContract));
      const lcList = Array.isArray(rawLandContracts) ? rawLandContracts : rawLandContracts?.data ?? [];
setLandContracts(lcList.map(c => ({
  landContractID: c.landContractID ?? c.LandContractID,
  startDate: (c.startDate ?? c.StartDate ?? '').split('T')[0],
  endDate: (c.endDate ?? c.EndDate ?? '').split('T')[0],
  status: c.status ?? c.Status ?? '',
})));

const mapList = Array.isArray(rawMaps) ? rawMaps : rawMaps?.data ?? [];
setHoardingMaps(mapList);
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Failed to load data.');
    } finally { setLoadingMeta(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = (record, isNew) => {
    if (isNew) setContracts(prev => [record, ...prev]);
    else setContracts(prev => prev.map(c => c.customerContractID === record.customerContractID ? record : c));
  };

  const handleDelete = async (id) => {
    try {
      await apiService.deleteCustomerContract(id);
      setContracts(prev => prev.filter(c => c.customerContractID !== id));
    } catch (err) { console.error('Delete failed:', err); }
    finally { setDeleteTarget(null); }
  };

  const freqOptions = paymentFreqs.length ? paymentFreqs : PAYMENT_FREQ_FALLBACK;

  const tableRows = contracts.map(c => {
    const customer = customers.find(cu => cu.customerID === c.customerID);
    const hoarding = hoardings.find(h => h.hoardingID === c.hoardingID);
    return {
      customerContractID: c.customerContractID,
      customerName: customer?.customerName || `Customer ID ${c.customerID}`,
      hoardingLabel: hoarding ? hoardingLabel(hoarding) : `Hoarding ID ${c.hoardingID}`,
      startDate: c.startDate || '',
      endDate: c.endDate || '',
      contractFinalValue: c.contractFinalValue ?? c.contractOrigValue ?? 0,
      status: c.status || '',
      _raw: c,
    };
  });

  const filtered = tableRows.filter(r => {
    const q = search.toLowerCase();
    const match =
      r.customerName.toLowerCase().includes(q) ||
      r.hoardingLabel.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      String(r.customerContractID).includes(q);
    return match && (!statusFilter || r.status === statusFilter);
  });

  const sortedRows = [...filtered].sort((a, b) => {
    if (sortKey === 'contractFinalValue')
      return sortDir === 'asc' ? a.contractFinalValue - b.contractFinalValue : b.contractFinalValue - a.contractFinalValue;
    const av = String(a[sortKey] ?? '').toLowerCase();
    const bv = String(b[sortKey] ?? '').toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginated = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const totalValue = contracts.reduce((s, c) => s + (Number(c.contractFinalValue) || 0), 0);
  const activeCount = contracts.filter(c => c.status === 'Active').length;
  const endedCount = contracts.filter(c => c.status === 'Expired' || c.status === 'Terminated').length;

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => { if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('...'); acc.push(p); return acc; }, []);

  const COLS = [
    { key: 'customerContractID', label: '#ID' },
    { key: 'customerName', label: 'Customer' },
    { key: 'hoardingLabel', label: 'Hoarding', tabletHide: true },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date', tabletHide: true },
    { key: 'contractFinalValue', label: 'Final Value' },
    { key: 'status', label: 'Status' },
    { key: '_action', label: 'Actions', noSort: true },
  ];

  if (view === 'form') {
    return (
<ContractForm
  mode={formMode} contract={editTarget}
  customers={customers} hoardings={hoardings} sites={sites} paymentFreqs={freqOptions}
  contracts={contracts}
  landContracts={landContracts}
  hoardingMaps={hoardingMaps}
  onBack={() => { setView('grid'); setEditTarget(null); }}
  onSave={handleSave}
/>
    );
  }

  return (
    <div className="pg-page">
      <div className="pg-header">
        <div>
          <h1 className="pg-header__title">Customer Contracts</h1>
          <p className="pg-header__subtitle">
            Manage all advertising contracts with customers
            {contracts.length > 0 && <> — Total: <strong>{fmtCurrency(totalValue)}</strong></>}
          </p>
        </div>
        <button className="pg-btn-add"
          onClick={() => { setFormMode('add'); setEditTarget(null); setView('form'); }}
          disabled={loadingMeta}>
          <Plus size={14} /> Add Contract
        </button>
      </div>

      {!loadingMeta && contracts.length > 0 && (
        <div className="exp-stats-strip">
          {[
            { icon: <FileText size={16} color="#049edf" />, bg: 'rgba(4,158,223,0.1)', label: 'Total Contracts', val: contracts.length },
            { icon: <IndianRupee size={16} color="#16a34a" />, bg: 'rgba(22,163,74,0.1)', label: 'Total Value', val: fmtCurrency(totalValue) },
            { icon: <ShieldCheck size={16} color="#16a34a" />, bg: 'rgba(22,163,74,0.1)', label: 'Active', val: activeCount },
            { icon: <Clock size={16} color="#dc2626" />, bg: 'rgba(220,38,38,0.08)', label: 'Expired/Ended', val: endedCount },
          ].map(s => (
            <div key={s.label} className="exp-stat-item">
              <div className="exp-stat-item__icon" style={{ background: s.bg }}>{s.icon}</div>
              <div><div className="exp-stat-item__label">{s.label}</div><div className="exp-stat-item__val">{s.val}</div></div>
            </div>
          ))}
        </div>
      )}

      {loadError && (
        <div className="pg-field-error hd-api-error mb-3" style={{ margin: '0 0 16px 0' }}>
          <AlertCircle size={14} /><span>{loadError}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }} onClick={fetchAll}>Retry</button>
        </div>
      )}

      <div className="pg-container">
        <div className="pg-toolbar">
          <div className="pg-toolbar__inner">
            <div className="pg-toolbar__count">
              <FileText size={14} color="#9090a8" />
              <span><strong>{loadingMeta ? '...' : filtered.length}</strong> contract{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="pg-search-box">
              <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input placeholder="Search customer, hoarding, status..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
              {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
            </div>
            <select className="hd-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="pg-pg-btn" onClick={fetchAll} title="Refresh" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={13} className={loadingMeta ? 'pg-spin' : ''} />
            </button>
          </div>
        </div>

        {loadingMeta && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#9090a8' }}>
            <Loader2 size={28} className="pg-spin" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13 }}>Loading data...</div>
          </div>
        )}

        {!loadingMeta && contracts.length === 0 && (
          <div className="pg-empty" style={{ padding: '70px 20px' }}>
            <div className="pg-empty__inner">
              <FileText size={42} color="#d0d0e8" />
              <span className="pg-empty__label">No contracts recorded yet</span>
              <span style={{ fontSize: 12, color: '#b0b0c8' }}>Click <strong>Add Contract</strong> to create the first one</span>
            </div>
          </div>
        )}

        {!loadingMeta && contracts.length > 0 && (
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
                  <tr><td colSpan={COLS.length} className="pg-td pg-empty">
                    <div className="pg-empty__inner"><FileText size={36} color="#d0d0e8" /><span className="pg-empty__label">No contracts match your search</span></div>
                  </td></tr>
                ) : paginated.map(r => {
                  const st = statusStyle(r.status);
                  return (
                    <tr key={r.customerContractID} className="pg-tr">
                      <td className="pg-td"><span className="lc-id-badge">#{r.customerContractID}</span></td>
                      <td className="pg-td"><div className="pg-td__primary">{r.customerName}</div></td>
                      <td className="pg-td pg-td--overflow pg-tablet-hide"><span className="pg-td__ellipsis" title={r.hoardingLabel}>{r.hoardingLabel}</span></td>
                      <td className="pg-td"><span className="pg-td__primary">{fmtDate(r.startDate)}</span></td>
                      <td className="pg-td pg-tablet-hide"><span className="pg-td__primary">{fmtDate(r.endDate)}</span></td>
                      <td className="pg-td"><span className="lc-amount-val">{fmtCurrency(r.contractFinalValue)}</span></td>
                      <td className="pg-td">
                        <span className="lc-status-badge" style={{ background: st.bg, color: st.color, borderColor: st.border }}>{r.status}</span>
                      </td>
                      <td className="pg-td">
                        <div className="pg-action-wrap">
                          <button className="pg-btn-view" title="Edit" onClick={() => { setFormMode('edit'); setEditTarget(r._raw); setView('form'); }}><Edit2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loadingMeta && contracts.length > 0 && (
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <FileText size={36} color="#d0d0e8" /><span className="pg-empty__label">No contracts match</span>
              </div>
            ) : paginated.map(r => {
              const st = statusStyle(r.status);
              return (
                <div key={r.customerContractID} className="pg-card">
                  <div className="pg-card__header">
                    <div className="pg-card__title-wrap">
                      <div className="pg-card__title"><span className="lc-id-badge">#{r.customerContractID}</span>&nbsp; {r.customerName}</div>
                      <div className="pg-card__subtitle">{r.hoardingLabel}</div>
                    </div>
                    <div className="pg-card__actions">
                      <button className="pg-card__btn-view" onClick={() => { setFormMode('edit'); setEditTarget(r._raw); setView('form'); }} title="Edit"><Edit2 size={13} /></button>
                      <button className="exp-btn-delete" onClick={() => setDeleteTarget(r._raw)} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="pg-card__body">
                    <div className="pg-card__row"><Calendar size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="pg-card__row-text">{fmtDate(r.startDate)} → {fmtDate(r.endDate)}</span></div>
                    <div className="pg-card__row"><IndianRupee size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="pg-card__row-text" style={{ fontWeight: 800, color: '#1a1a2e' }}>{fmtCurrency(r.contractFinalValue)}</span></div>
                    <div className="pg-card__row"><ShieldCheck size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="lc-status-badge" style={{ background: st.bg, color: st.color, borderColor: st.border }}>{r.status}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loadingMeta && contracts.length > 0 && (
          <div className="pg-pagination">
            <div className="pg-pagination__left">
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
              {pageNums.map((p, i) => p === '...'
                ? <span key={`e${i}`} className="pg-pg-ellipsis">...</span>
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
              <span className="pg-pagination__text">{page} of {totalPages} pages ({sortedRows.length} items)</span>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteConfirmModal contract={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget.customerContractID)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}