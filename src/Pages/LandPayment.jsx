import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Search, X, AlertCircle, Check, Edit2,
  RefreshCw, Calendar, ChevronUp, ChevronDown,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Loader2, FileText, ArrowLeft, Building2, User,
  IndianRupee, MessageSquare,
  CreditCard, Hash, Landmark, Trash2, UploadCloud,
  Receipt, Clock, CheckCircle2, Banknote, ListChecks,
  Paperclip, FileCheck, Eye, Download, Image as ImageIcon,
} from 'lucide-react';
import { apiService, API_ROOT_URL } from '../api/api';
import './Common1.css';
import { useResizableColumns } from '../hooks/useResizableColumns';

const forceDownload = async (url, filename) => {
  try {
    const cleanUrl = url.split('?')[0];
    const downloadUrl = `${cleanUrl}?t=${Date.now()}`;
    const response = await axios.get(downloadUrl, {
      responseType: 'blob',
    });
    const localUrl = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = localUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(localUrl);
  } catch (err) {
    console.error('Download failed, fallback to direct link', err);
    window.open(url, '_blank');
  }
};

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];

const PAYMENT_MODE_OPTIONS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'NEFT', label: 'NEFT' },
  { value: 'RTGS', label: 'RTGS' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Demand Draft', label: 'Demand Draft' },
];

const PAYMENT_PURPOSE_OPTIONS = [
  { value: 'Monthly Rent', label: 'Monthly Rent' },
  { value: 'Quarterly Rent', label: 'Quarterly Rent' },
  { value: 'Advance Payment', label: 'Advance Payment' },
  { value: 'Security Deposit', label: 'Security Deposit' },
  { value: 'Half-Yearly Rent', label: 'Half-Yearly Rent' },
  { value: 'Yearly Rent', label: 'Yearly Rent' },
  { value: 'Other', label: 'Other' },
];

const EMPTY_ROW = {
  _rowId: '',
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

function fmtCurrency(v) {
  if (v === '' || v == null || isNaN(Number(v))) return '—';
  return '₹' + Number(v).toLocaleString('en-IN');
}

function makeRowId() {
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function paymentModeStyle(mode) {
  switch (mode) {
    case 'Cash': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
    case 'Cheque': return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    case 'NEFT': return { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe' };
    case 'RTGS': return { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
    case 'UPI': return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
    case 'Bank Transfer': return { bg: '#f0f9ff', color: '#0284c7', border: '#bae6fd' };
    case 'Demand Draft': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    default: return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
  }
}

function normalizePayment(raw) {
  return {
    landPaymentID: raw.landPaymentID ?? raw.LandPaymentID ?? 0,
    ownerID: raw.ownerID ?? raw.OwnerID ?? '',
    landContractID: raw.landContractID ?? raw.LandContractID ?? '',
    hoardingID: raw.hoardingID ?? raw.HoardingID ?? '',
    paymentDate: (raw.paymentDate ?? raw.PaymentDate ?? '').split('T')[0],
    paymentPurpose: raw.paymentPurpose ?? raw.PaymentPurpose ?? '',
    amountPaid: raw.amountPaid ?? raw.AmountPaid ?? '',
    paymentMode: raw.paymentMode ?? raw.PaymentMode ?? '',
    nextDueDate: (raw.nextDueDate ?? raw.NextDueDate ?? '').split('T')[0],
    bankName: raw.bankName ?? raw.BankName ?? '',
    referenceNumber: raw.referenceNumber ?? raw.ReferenceNumber ?? '',
    paidBy: raw.paidBy ?? raw.PaidBy ?? '',
    comments: raw.comments ?? raw.Comments ?? '',
    lastUpdatedBy: raw.lastUpdatedBy ?? raw.LastUpdatedBy ?? '',
    lastUpdateDttm: raw.lastUpdateDttm ?? raw.LastUpdateDttm ?? '',
  };
}

function validateRow(row, maxVal) {
  const e = {};
  if (!row.paymentDate) e.paymentDate = 'Required';
  if (!row.paymentPurpose) e.paymentPurpose = 'Required';
  if (row.amountPaid === '' || row.amountPaid == null) e.amountPaid = 'Required';
  else if (isNaN(Number(row.amountPaid)) || Number(row.amountPaid) <= 0) e.amountPaid = 'Must be positive';
  else if (maxVal != null && maxVal > 0 && Number(row.amountPaid) > Number(maxVal)) {
    e.amountPaid = `Cannot exceed Contract Value (${maxVal.toLocaleString('en-IN')})`;
  }
  if (!row.paymentMode) e.paymentMode = 'Required';
  if (!row.paidBy) e.paidBy = 'Required';
  if (row.nextDueDate && row.paymentDate && row.nextDueDate < row.paymentDate)
    e.nextDueDate = 'Must be after payment date';
  if (row.referenceNumber && row.referenceNumber.length > 30)
    e.referenceNumber = 'Max 30 characters';
  return e;
}
/* ─────────────────────────────────────────
   LAND PAYMENT ATTACHMENT HELPERS
───────────────────────────────────────── */
const LP_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
function lpIsImage(name = '') {
  return LP_IMAGE_EXTS.includes(name.split('.').pop().toLowerCase());
}
function lpGetUrl(attach) {
  if (!attach) return null;
  const raw =
    attach.landPymntFilePath ||
    attach.LandPymntFilePath ||
    attach.fileUrl ||
    attach.filePath ||
    attach.url ||
    attach.path ||
    null;
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `${API_ROOT_URL}/${raw.replace(/^\/+/, '')}`;
}
function lpGetName(attach) {
  return (
    attach?.landPymntFilename ||
    attach?.LandPymntFilename ||
    attach?.fileName ||
    attach?.name ||
    'Attachment'
  );
}

function LPAttachCell({ rowId, selectedFile, existingAttach, isUploading, onFileSelect, onFileClear }) {
  const inputRef = useRef(null);
  const trigger = () => inputRef.current?.click();
  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (f) onFileSelect(rowId, f);
    e.target.value = '';
  };
  const fileInput = (
    <input ref={inputRef} type="file" style={{ display: 'none' }}
      onChange={onPick} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
  );

  /* uploading */
  if (isUploading) return (
    <div className="ea-cell">
      <div className="ea-uploading">
        <Loader2 size={12} className="pg-spin" style={{ flexShrink: 0 }} />
        <span>Uploading…</span>
      </div>
    </div>
  );

  /* new file staged */
  if (selectedFile) return (
    <div className="ea-cell">
      {fileInput}
      <div className="ea-new-file">
        <div className="ea-new-file__name">
          <Paperclip size={11} color="#049edf" style={{ flexShrink: 0 }} />
          <span className="ea-new-file__text" title={selectedFile.name}>{selectedFile.name}</span>
          <button className="ea-new-file__remove" onClick={() => onFileClear(rowId)}>
            <X size={11} />
          </button>
        </div>
        <div className="ea-new-file__footer">
          <button className="ea-new-file__change" onClick={trigger}>
            <RefreshCw size={9} /> Change file
          </button>
        </div>
      </div>
    </div>
  );

  /* saved on server */
  if (existingAttach) {
    const name = lpGetName(existingAttach);
    const url = lpGetUrl(existingAttach);
    return (
      <div className="ea-cell">
        {fileInput}
        <div className="ea-saved-card">
          <div className="ea-saved-card__name" title={name}>
            <div className="ea-saved-card__icon">
              {lpIsImage(name)
                ? <ImageIcon size={12} color="#15803d" style={{ flexShrink: 0 }} />
                : <FileCheck size={12} color="#15803d" style={{ flexShrink: 0 }} />}
            </div>
            <span className="ea-saved-card__text">{name}</span>
          </div>
          <div className="ea-saved-card__actions">
            <button className="ea-saved-card__btn ea-saved-card__btn--view"
              onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')}
              disabled={!url} title={url ? 'Open in new tab' : 'URL not available'}>
              <Eye size={10} /> View
            </button>
            <button className="ea-saved-card__btn ea-saved-card__btn--download"
              onClick={() => {
                if (!url) return;
                forceDownload(url, name);
              }}
              disabled={!url}>
              <Download size={10} /> Download
            </button>
            <button className="ea-saved-card__btn ea-saved-card__btn--replace" onClick={trigger}>
              <RefreshCw size={10} /> Replace
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* empty */
  return (
    <div className="ea-cell">
      {fileInput}
      <button className="ea-btn-attach" onClick={trigger}>
        <Paperclip size={11} /> Attach file
      </button>
    </div>
  );
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapRef = useRef(null);
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
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapRef = useRef(null);

  const selected = owners.find(o => o.ownerID === Number(value) || o.ownerID === value);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(
      owners.filter(o =>
        (o.ownerName || '').toLowerCase().includes(q) ||
        (o.phone1 || '').toLowerCase().includes(q) ||
        (o.phone || '').toLowerCase().includes(q) ||
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
function ContractDropdown({ contracts, hoardings, hoardingMaps = [], ownerID, value, onChange, error, disabled }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapRef = useRef(null);

  const ownerContracts = ownerID
    ? contracts.filter(c => String(c.ownerID) === String(ownerID))
    : [];

const enriched = ownerContracts.map(c => {
  // Try direct hoardingID on contract first
  let h = hoardings.find(hh => Number(hh.hoardingID) === Number(c.hoardingID));

  // If not found, look up via hoarding map table
  if (!h) {
    const map = hoardingMaps.find(m =>
      Number(m.landContractID ?? m.LandContractID) === Number(c.landContractID)
    );
    if (map) {
      const mapHID = map.hoardingID ?? map.HoardingID;
      h = hoardings.find(hh => Number(hh.hoardingID) === Number(mapHID));
    }
  }

  const parts = [];
  if (h?.hoardingCode) parts.push(h.hoardingCode);
  if (h?.width && h?.height) parts.push(`${h.width}×${h.height} ft`);
  if (h?.material) parts.push(h.material);

  return {
    ...c,
    hoardingCode: h?.hoardingCode || '',
    hoardingInfo: parts.join(' · ') || `Contract #${c.landContractID}`,
    dateRange: `${fmtDate(c.startDate)} → ${fmtDate(c.endDate)}`,
    statusLabel: c.status || 'Unknown',
  };
});

  const filtered = query.trim()
    ? enriched.filter(c =>
      c.hoardingCode.toLowerCase().includes(query.toLowerCase()) ||
      c.hoardingInfo.toLowerCase().includes(query.toLowerCase()) ||
      c.statusLabel.toLowerCase().includes(query.toLowerCase()) ||
      String(c.landContractID).includes(query)
    )
    : enriched;

  const selected = enriched.find(c => String(c.landContractID) === String(value));

  useEffect(() => {
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const isDisabled = disabled || !ownerID;
  const placeholder = !ownerID
    ? 'Select an owner first...'
    : ownerContracts.length === 0
      ? 'No contracts for this owner'
      : 'Search by hoarding code, size, material...';

  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && filtered[focusedIndex]) {
        onChange(filtered[focusedIndex].landContractID);
        setQuery(''); setOpen(false); setFocusedIndex(-1);
      }
    } else if (e.key === 'Escape') { setOpen(false); setFocusedIndex(-1); }
  };

  const statusStyle = (s) => {
    if (!s) return { color: '#9090a8', background: '#f0f0f8' };
    const lower = s.toLowerCase();
    if (lower === 'active') return { color: '#16a34a', background: '#f0fdf4' };
    if (lower === 'inactive') return { color: '#dc2626', background: '#fef2f2' };
    if (lower === 'expired') return { color: '#d97706', background: '#fffbeb' };
    return { color: '#7c3aed', background: '#faf5ff' };
  };

  return (
    <div className="lc-search-widget" ref={wrapRef}>
      {!isDisabled && (
        <div
          className={`pg-field-wrap ${error ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
          style={{ cursor: 'text' }}
          onClick={() => { if (!isDisabled) setOpen(true); }}
        >
          <Search size={14} color={error ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
          <input
            className="pg-field-input"
            placeholder={placeholder}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            disabled={isDisabled}
          />
          {query && (
            <X size={12} style={{ cursor: 'pointer', color: '#c0c0d8', flexShrink: 0 }}
              onClick={e => { e.stopPropagation(); setQuery(''); setFocusedIndex(-1); }} />
          )}
        </div>
      )}

      {isDisabled && (
        <div className="pg-field-wrap pg-field-wrap--readonly">
          <FileText size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#c0c0d8', fontFamily: 'Nunito, sans-serif', fontWeight: 500 }}>
            {placeholder}
          </span>
        </div>
      )}

      {open && !isDisabled && (
        <div className="lc-dropdown">
          {filtered.length === 0 ? (
            <div className="lc-dropdown-empty">
              <FileText size={18} />
              <span>{query ? 'No contracts match your search' : 'No contracts for this owner'}</span>
            </div>
          ) : filtered.map((c, idx) => {
            const st = statusStyle(c.statusLabel);
            return (
              <div
                key={c.landContractID}
                className={`lc-dropdown-option${idx === focusedIndex ? ' lc-dropdown-option--focused' : ''}`}
                onMouseEnter={() => setFocusedIndex(idx)}
                onMouseDown={() => {
                  onChange(c.landContractID);
                  setQuery(''); setOpen(false); setFocusedIndex(-1);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="lc-dropdown-option__name" style={{
                    color: String(c.landContractID) === String(value) ? '#049edf' : '#1a1a2e',
                    flex: 1,
                  }}>
                    <Building2 size={12} style={{ marginRight: 4, flexShrink: 0 }} />
                    {c.hoardingInfo}
                    <span style={{ color: '#b0b0c8', fontWeight: 600, fontSize: 11, marginLeft: 8 }}>
                      #{c.landContractID}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px',
                    borderRadius: 20, ...st,
                  }}>
                    {c.statusLabel}
                  </span>
                  {String(c.landContractID) === String(value) && (
                    <Check size={12} color="#049edf" style={{ flexShrink: 0 }} />
                  )}
                </div>
                <div className="lc-dropdown-option__sub" style={{ marginTop: 3 }}>
                  <Calendar size={10} style={{ marginRight: 4 }} />
                  {c.dateRange}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {value && selected && (
        <div className="lc-selected-card">
          <div className="lc-selected-card__icon"><FileText size={15} color="#049edf" /></div>
          <div className="lc-selected-card__info">
            <div className="lc-selected-card__name">{selected.hoardingInfo}
              <span style={{ color: '#b0b0c8', fontWeight: 600, fontSize: 11, marginLeft: 8 }}>
                #{selected.landContractID}
              </span>
            </div>
            <div className="lc-selected-card__sub">
              <Calendar size={10} style={{ marginRight: 3 }} />
              {selected.dateRange}
              <span style={{
                marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '1px 6px',
                borderRadius: 20, ...statusStyle(selected.statusLabel),
              }}>
                {selected.statusLabel}
              </span>
            </div>
          </div>
          {!disabled && (
            <button className="lc-selected-card__clear"
              onClick={() => { onChange(''); setQuery(''); }}
              title="Clear">
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {value && !selected && (
        <div className="lc-selected-card">
          <div className="lc-selected-card__icon"><FileText size={15} color="#049edf" /></div>
          <div className="lc-selected-card__info">
            <div className="lc-selected-card__name">Contract ID: {value}</div>
          </div>
          {!disabled && (
            <button className="lc-selected-card__clear" onClick={() => onChange('')}><X size={12} /></button>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DELETE ROW CONFIRM MODAL
═══════════════════════════════════════════ */
function DeleteRowModal({ row, onConfirm, onCancel, deleting }) {
  return (
    <div className="pg-overlay" style={{ zIndex: 99998 }} onClick={onCancel}>
      <div className="exp-delete-modal" onClick={e => e.stopPropagation()}>
        <div className="exp-delete-modal__icon"><Trash2 size={22} color="#dc2626" /></div>
        <div className="exp-delete-modal__title">Delete Payment?</div>
        <div className="exp-delete-modal__sub">
          {row._paymentID
            ? <>This will permanently delete <strong>Payment #{row._paymentID}</strong> from the server. This cannot be undone.</>
            : <>This will remove this unsaved row from the list.</>}
        </div>
        <div className="exp-delete-modal__actions">
          <button className="pg-btn-cancel" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="exp-btn-delete-confirm" onClick={onConfirm} disabled={deleting}>
            {deleting
              ? <><Loader2 size={13} className="pg-spin" /> Deleting…</>
              : <><Trash2 size={13} /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PAYMENT ROWS TABLE  (inline editable)
═══════════════════════════════════════════ */
function PaymentRowsTable({
  rows, rowErrors, onChangeRow, onDeleteRow, deletingRowId,
  attachFiles, existingAttaches, uploadingRowIds, onFileSelect, onFileClear,
}) {
  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + (Number(r.amountPaid) || 0), 0);

  const DeleteBtn = ({ rowId }) => {
    const isDeleting = deletingRowId === rowId;
    return (
      <button className="exp-del-row-btn"
        onClick={() => !isDeleting && onDeleteRow(rowId)}
        title={isDeleting ? 'Deleting…' : 'Delete'}
        disabled={isDeleting} style={{ opacity: isDeleting ? 0.6 : 1 }}>
        {isDeleting ? <Loader2 size={13} className="pg-spin" /> : <Trash2 size={13} />}
      </button>
    );
  };

  return (
    <div className="exp-rows-wrap">
      <div className="exp-rows-header">
        <div className="exp-rows-header__left">
          <Receipt size={14} color="#049edf" />
          <span>Payment Entries ({rows.length})</span>
        </div>
        <div className="exp-rows-header__total">Total: <strong>{fmtCurrency(total)}</strong></div>
      </div>

      {/* ─── Desktop ─── */}
      <div className="exp-rows-desktop">
        <div className="exp-rows-scroll">
          <table className="exp-rows-tbl">
            <thead>
              <tr>
                <th className="exp-col-idx">#</th>
                <th>Pay Date <span className="exp-req">*</span></th>
                <th>Purpose <span className="exp-req">*</span></th>
                <th>Amount (₹) <span className="exp-req">*</span></th>
                <th>Mode <span className="exp-req">*</span></th>
                <th>Paid By <span className="exp-req">*</span></th>
                <th>Next Due</th>
                <th>Bank</th>
                <th>Reference</th>
                <th>Comments</th>
                <th>
                  <span className="ea-col-head">
                    <Paperclip size={11} /> Photo / Doc
                  </span>
                </th>
                <th className="exp-col-del"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const errs = rowErrors[row._rowId] || {};
                const isDeleting = deletingRowId === row._rowId;
                const isUploading = uploadingRowIds?.has(row._rowId);
                const selFile = attachFiles?.[row._rowId] || null;
                const existing = row._paymentID
                  ? (existingAttaches?.[row._paymentID] || null)
                  : null;
                const showBank = ['Cheque', 'NEFT', 'RTGS', 'Bank Transfer', 'Demand Draft']
                  .includes(row.paymentMode);

                return (
                  <tr key={row._rowId}
                    className={`${Object.keys(errs).length ? 'exp-tbl-row exp-tbl-row--err' : 'exp-tbl-row'}${isDeleting ? ' exp-tbl-row--deleting' : ''}`}
                    style={{ opacity: isDeleting ? 0.5 : 1, pointerEvents: isDeleting ? 'none' : 'auto' }}>

                    <td className="exp-td exp-td-idx">{idx + 1}</td>

                    {/* Pay Date */}
                    <td className="exp-td">
                      <input type="date"
                        className={`exp-cell-input${errs.paymentDate ? ' exp-cell-input--err' : ''}`}
                        value={row.paymentDate}
                        onChange={e => onChangeRow(row._rowId, 'paymentDate', e.target.value)} />
                      {errs.paymentDate && <div className="exp-cell-err">{errs.paymentDate}</div>}
                    </td>

                    {/* Purpose */}
                    <td className="exp-td">
                      <select
                        className={`exp-cell-input${errs.paymentPurpose ? ' exp-cell-input--err' : ''}`}
                        value={row.paymentPurpose}
                        onChange={e => onChangeRow(row._rowId, 'paymentPurpose', e.target.value)}>
                        <option value="">Select…</option>
                        {PAYMENT_PURPOSE_OPTIONS.map(o =>
                          <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      {errs.paymentPurpose && <div className="exp-cell-err">{errs.paymentPurpose}</div>}
                    </td>

                    {/* Amount */}
                    <td className="exp-td">
                      <input type="number" min="0"
                        className={`exp-cell-input${errs.amountPaid ? ' exp-cell-input--err' : ''}`}
                        placeholder="0" value={row.amountPaid}
                        onChange={e => onChangeRow(row._rowId, 'amountPaid', e.target.value)} />
                      {errs.amountPaid && <div className="exp-cell-err">{errs.amountPaid}</div>}
                    </td>

                    {/* Mode */}
                    <td className="exp-td">
                      <select
                        className={`exp-cell-input${errs.paymentMode ? ' exp-cell-input--err' : ''}`}
                        value={row.paymentMode}
                        onChange={e => onChangeRow(row._rowId, 'paymentMode', e.target.value)}>
                        <option value="">Select…</option>
                        {PAYMENT_MODE_OPTIONS.map(o =>
                          <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      {errs.paymentMode && <div className="exp-cell-err">{errs.paymentMode}</div>}
                    </td>

                    {/* Paid By */}
                    <td className="exp-td">
                      <input
                        className={`exp-cell-input${errs.paidBy ? ' exp-cell-input--err' : ''}`}
                        placeholder="Name…" value={row.paidBy}
                        onChange={e => onChangeRow(row._rowId, 'paidBy', e.target.value)} />
                      {errs.paidBy && <div className="exp-cell-err">{errs.paidBy}</div>}
                    </td>

                    {/* Next Due */}
                    <td className="exp-td">
                      <input type="date"
                        className={`exp-cell-input${errs.nextDueDate ? ' exp-cell-input--err' : ''}`}
                        value={row.nextDueDate} min={row.paymentDate || undefined}
                        onChange={e => onChangeRow(row._rowId, 'nextDueDate', e.target.value)} />
                      {errs.nextDueDate && <div className="exp-cell-err">{errs.nextDueDate}</div>}
                    </td>

                    {/* Bank */}
                    <td className="exp-td">
                      <input className="exp-cell-input"
                        placeholder={showBank ? 'Bank name…' : 'N/A'}
                        value={row.bankName}
                        onChange={e => onChangeRow(row._rowId, 'bankName', e.target.value)}
                        disabled={!showBank}
                        style={!showBank ? { color: '#b0b0c8', cursor: 'not-allowed' } : {}} />
                    </td>

                    {/* Reference */}
                    <td className="exp-td">
                      <input className={`exp-cell-input${errs.referenceNumber ? ' exp-cell-input--err' : ''}`}
                        placeholder={showBank ? 'Ref / Cheque no…' : 'N/A'}
                        value={row.referenceNumber}
                        onChange={e => onChangeRow(row._rowId, 'referenceNumber', e.target.value)}
                        disabled={!showBank}
                        style={!showBank ? { color: '#b0b0c8', cursor: 'not-allowed' } : {}} />
                      {errs.referenceNumber && <div className="exp-cell-err">{errs.referenceNumber}</div>}
                    </td>

                    {/* Comments */}
                    <td className="exp-td">
                      <textarea className="exp-cell-input exp-cell-scroll"
                        placeholder="Optional…" value={row.comments}
                        style={{ resize: 'none', minHeight: 38 }}
                        onChange={e => onChangeRow(row._rowId, 'comments', e.target.value)} />
                    </td>

                    {/* Photo / Doc */}
                    <td className="exp-td" style={{ verticalAlign: 'top', paddingTop: 8 }}>
                      <LPAttachCell
                        rowId={row._rowId}
                        selectedFile={selFile}
                        existingAttach={existing}
                        isUploading={isUploading}
                        onFileSelect={onFileSelect}
                        onFileClear={onFileClear}
                      />
                    </td>

                    <td className="exp-td exp-td-del">
                      <DeleteBtn rowId={row._rowId} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Mobile ─── */}
      <div className="exp-rows-mobile">
        {rows.map((row, idx) => {
          const errs = rowErrors[row._rowId] || {};
          const isDeleting = deletingRowId === row._rowId;
          const isUploading = uploadingRowIds?.has(row._rowId);
          const selFile = attachFiles?.[row._rowId] || null;
          const existing = row._paymentID
            ? (existingAttaches?.[row._paymentID] || null) : null;
          const showBank = ['Cheque', 'NEFT', 'RTGS', 'Bank Transfer', 'Demand Draft']
            .includes(row.paymentMode);

          return (
            <div key={row._rowId}
              className={`exp-mob-card${Object.keys(errs).length ? ' exp-mob-card--err' : ''}`}
              style={{ opacity: isDeleting ? 0.5 : 1, pointerEvents: isDeleting ? 'none' : 'auto' }}>
              <div className="exp-mob-card__top">
                <span className="exp-mob-card__num">#{idx + 1}</span>
                <button className="exp-del-row-btn" onClick={() => onDeleteRow(row._rowId)}>
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="row g-2">
                <div className="col-6">
                  <div className="exp-mob-label">Pay Date <span className="exp-req">*</span></div>
                  <input type="date"
                    className={`exp-cell-input${errs.paymentDate ? ' exp-cell-input--err' : ''}`}
                    value={row.paymentDate}
                    onChange={e => onChangeRow(row._rowId, 'paymentDate', e.target.value)} />
                </div>
                <div className="col-6">
                  <div className="exp-mob-label">Amount <span className="exp-req">*</span></div>
                  <input type="number" min="0"
                    className={`exp-cell-input${errs.amountPaid ? ' exp-cell-input--err' : ''}`}
                    placeholder="0" value={row.amountPaid}
                    onChange={e => onChangeRow(row._rowId, 'amountPaid', e.target.value)} />
                </div>
                <div className="col-12">
                  <div className="exp-mob-label">Purpose <span className="exp-req">*</span></div>
                  <select className={`exp-cell-input${errs.paymentPurpose ? ' exp-cell-input--err' : ''}`}
                    value={row.paymentPurpose}
                    onChange={e => onChangeRow(row._rowId, 'paymentPurpose', e.target.value)}>
                    <option value="">Select…</option>
                    {PAYMENT_PURPOSE_OPTIONS.map(o =>
                      <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <div className="exp-mob-label">Mode <span className="exp-req">*</span></div>
                  <select className={`exp-cell-input${errs.paymentMode ? ' exp-cell-input--err' : ''}`}
                    value={row.paymentMode}
                    onChange={e => onChangeRow(row._rowId, 'paymentMode', e.target.value)}>
                    <option value="">Select…</option>
                    {PAYMENT_MODE_OPTIONS.map(o =>
                      <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <div className="exp-mob-label">Paid By <span className="exp-req">*</span></div>
                  <input className={`exp-cell-input${errs.paidBy ? ' exp-cell-input--err' : ''}`}
                    placeholder="Name…" value={row.paidBy}
                    onChange={e => onChangeRow(row._rowId, 'paidBy', e.target.value)} />
                </div>
                <div className="col-6">
                  <div className="exp-mob-label">Next Due</div>
                  <input type="date" className="exp-cell-input"
                    value={row.nextDueDate} min={row.paymentDate || undefined}
                    onChange={e => onChangeRow(row._rowId, 'nextDueDate', e.target.value)} />
                </div>
                {showBank && (<>
                  <div className="col-6">
                    <div className="exp-mob-label">Bank</div>
                    <input className="exp-cell-input" placeholder="Bank name…"
                      value={row.bankName}
                      onChange={e => onChangeRow(row._rowId, 'bankName', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <div className="exp-mob-label">Reference</div>
                    <input className={`exp-cell-input${errs.referenceNumber ? ' exp-cell-input--err' : ''}`} placeholder="Ref / Cheque no…"
                      value={row.referenceNumber}
                      onChange={e => onChangeRow(row._rowId, 'referenceNumber', e.target.value)} />
                    {errs.referenceNumber && <div className="exp-cell-err">{errs.referenceNumber}</div>}
                  </div>
                </>)}
                <div className="col-12">
                  <div className="exp-mob-label">Comments</div>
                  <textarea className="exp-cell-input exp-cell-scroll" placeholder="Optional…"
                    value={row.comments}
                    onChange={e => onChangeRow(row._rowId, 'comments', e.target.value)} />
                </div>
                <div className="col-12">
                  <div className="exp-mob-label" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Paperclip size={11} color="#9090a8" /> Photo / Doc
                    <span style={{ fontSize: 10, color: '#b0b0c8' }}>(optional)</span>
                  </div>
                  <LPAttachCell
                    rowId={row._rowId}
                    selectedFile={selFile}
                    existingAttach={existing}
                    isUploading={isUploading}
                    onFileSelect={onFileSelect}
                    onFileClear={onFileClear}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   QUICK-ADD PANEL  (single new row form)
───────────────────────────────────────── */
function QuickAddPanel({ row, errors, onChange, attachFile, onFileSelect, onFileClear }) {
  const showBank = ['Cheque', 'NEFT', 'RTGS', 'Bank Transfer', 'Demand Draft'].includes(row.paymentMode);
  return (
    <div className="exp-entry-panel">
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <FieldLabel label="Payment Date" required />
          <InputWrap error={errors.paymentDate} icon={Calendar}>
            <input className="pg-field-input" type="date" value={row.paymentDate}
              onChange={e => onChange('paymentDate', e.target.value)} />
          </InputWrap>
          <FieldError msg={errors.paymentDate} />
        </div>
        <div className="col-12 col-md-4">
          <FieldLabel label="Next Due Date" optional />
          <InputWrap error={errors.nextDueDate} icon={Calendar}>
            <input className="pg-field-input" type="date" value={row.nextDueDate}
              min={row.paymentDate || undefined}
              onChange={e => onChange('nextDueDate', e.target.value)} />
          </InputWrap>
          <FieldError msg={errors.nextDueDate} />
        </div>
        <div className="col-12 col-md-4">
          <FieldLabel label="Amount Paid (Rs.)" required />
          <InputWrap error={errors.amountPaid} icon={IndianRupee}>
            <CurrencyInput value={row.amountPaid} onChange={val => onChange('amountPaid', val)} placeholder="e.g. 25,000" />
          </InputWrap>
          <FieldError msg={errors.amountPaid} />
        </div>
        <div className="col-12 col-md-4">
          <FieldLabel label="Payment Purpose" required />
          <ComboDropdown
            value={row.paymentPurpose} onChange={val => onChange('paymentPurpose', val)}
            onBlur={() => { }} hasError={!!errors.paymentPurpose}
            placeholder="Select purpose…" icon={ListChecks} options={PAYMENT_PURPOSE_OPTIONS}
          />
          <FieldError msg={errors.paymentPurpose} />
        </div>
        <div className="col-12 col-md-4">
          <FieldLabel label="Payment Mode" required />
          <ComboDropdown
            value={row.paymentMode} onChange={val => onChange('paymentMode', val)}
            onBlur={() => { }} hasError={!!errors.paymentMode}
            placeholder="Select mode…" icon={CreditCard} options={PAYMENT_MODE_OPTIONS}
          />
          <FieldError msg={errors.paymentMode} />
        </div>
        <div className="col-12 col-md-4">
          <FieldLabel label="Paid By" required />
          <InputWrap error={errors.paidBy} icon={User}>
            <input className="pg-field-input" placeholder="Name of person / company"
              value={row.paidBy} onChange={e => onChange('paidBy', e.target.value)} autoComplete="off" />
          </InputWrap>
          <FieldError msg={errors.paidBy} />
        </div>
        {showBank && (
          <>
            <div className="col-12 col-md-6">
              <FieldLabel label="Bank Name" optional />
              <InputWrap icon={Landmark}>
                <input className="pg-field-input" placeholder="e.g. State Bank of India"
                  value={row.bankName} onChange={e => onChange('bankName', e.target.value)} autoComplete="off" />
              </InputWrap>
            </div>
            <div className="col-12 col-md-6">
              <FieldLabel label="Reference / Cheque Number" optional />
              <InputWrap error={errors.referenceNumber} icon={Hash}>
                <input className="pg-field-input" placeholder="Transaction / Cheque number"
                  value={row.referenceNumber} onChange={e => onChange('referenceNumber', e.target.value)} autoComplete="off" />
              </InputWrap>
              <FieldError msg={errors.referenceNumber} />
            </div>
          </>
        )}
        <div className="col-12">
          <FieldLabel label="Comments" optional />
          <InputWrap icon={MessageSquare}>
            <textarea className="pg-field-input lc-textarea" rows={2}
              placeholder="Any notes or remarks about this payment..."
              value={row.comments} onChange={e => onChange('comments', e.target.value)} />
          </InputWrap>
        </div>
        <div className="col-12">
          <EntryAttachField
            rowId={row._rowId}
            selectedFile={attachFile}
            onFileSelect={onFileSelect}
            onFileClear={onFileClear}
          />
        </div>
      </div>
    </div>
  );
}
function EntryAttachField({ rowId, selectedFile, onFileSelect, onFileClear }) {
  const inputRef = useRef(null);
  const trigger = () => inputRef.current?.click();
  const onPick = (e) => { const f = e.target.files?.[0]; if (f) onFileSelect(rowId, f); e.target.value = ''; };

  return (
    <div className={`ea-entry-section${selectedFile ? ' ea-entry-section--filled' : ''}`}>
      <input ref={inputRef} type="file" style={{ display: 'none' }}
        onChange={onPick} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />

      <div className="ea-entry-section__label">
        <Paperclip size={12} color="#049edf" />
        <strong>Photo / Document</strong>
        <span className="ea-entry-optional">(optional)</span>
      </div>

      {selectedFile ? (
        <>
          <div className="ea-entry-filled">
            {lpIsImage(selectedFile.name)
              ? <ImageIcon size={14} color="#049edf" style={{ flexShrink: 0 }} />
              : <FileCheck size={14} color="#049edf" style={{ flexShrink: 0 }} />}
            <span className="ea-entry-filled__name" title={selectedFile.name}>{selectedFile.name}</span>
            <div className="ea-entry-filled__actions">
              <button className="ea-entry-filled__btn" onClick={trigger}><RefreshCw size={10} /> Change</button>
              <button className="ea-entry-filled__btn ea-entry-filled__btn--remove" onClick={() => onFileClear(rowId)}><X size={10} /> Remove</button>
            </div>
          </div>
          <div className="ea-entry-hint">Will upload automatically when you save the payment.</div>
        </>
      ) : (
        <button className="ea-entry-zone" onClick={trigger}>
          <UploadCloud size={16} />
          <span>Click to attach a photo or document</span>
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PAYMENT FORM  (Add / Edit — grouped design)
═══════════════════════════════════════════ */
function PaymentForm({ mode, groupKey, allPayments, owners, hoardings, contracts, hoardingMaps = [], onBack, onRefresh }) {
  const isAdd = mode === 'add';
  /* ── Attachment state ── */
  const [attachFiles, setAttachFiles] = useState({});
  const [existingAttaches, setExistingAttaches] = useState({});
  const [uploadingRowIds, setUploadingRowIds] = useState(new Set());
  const [attachLoadDone, setAttachLoadDone] = useState(isAdd);
  // ownerID + landContractID selection (only changeable in add mode)
  const [ownerID, setOwnerID] = useState(() => {
    if (isAdd) return '';
    return String(allPayments.find(p => `${p.ownerID}_${p.landContractID}` === groupKey)?.ownerID || '');
  });
  const [landContractID, setLandContractID] = useState(() => {
    if (isAdd) return '';
    return String(allPayments.find(p => `${p.ownerID}_${p.landContractID}` === groupKey)?.landContractID || '');
  });
  const [ownerError, setOwnerError] = useState('');
  const [contractError, setContractError] = useState('');

  // Build initial rows from existing payments for this group
  const [rows, setRows] = useState(() => {
    if (isAdd) return [];
    return allPayments
      .filter(p => `${p.ownerID}_${p.landContractID}` === groupKey)
      .map(p => ({
        ...EMPTY_ROW,
        _rowId: makeRowId(),
        _paymentID: p.landPaymentID,
        paymentDate: p.paymentDate || '',
        paymentPurpose: p.paymentPurpose || '',
        amountPaid: p.amountPaid ?? '',
        paymentMode: p.paymentMode || '',
        nextDueDate: p.nextDueDate || '',
        bankName: p.bankName || '',
        referenceNumber: p.referenceNumber || '',
        paidBy: p.paidBy || '',
        comments: p.comments || '',
      }));
  });
  /* ── Load attachments on edit mount ── */
  useEffect(() => {
    if (isAdd || rows.length === 0) { setAttachLoadDone(true); return; }
    const ids = rows.map(r => r._paymentID).filter(Boolean);
    if (!ids.length) { setAttachLoadDone(true); return; }
    let cancelled = false;
    Promise.allSettled(ids.map(id => apiService.getLandPaymentAttachByPaymentId(id)))
      .then(results => {
        if (cancelled) return;
        const map = {};
        results.forEach((res, i) => {
          if (res.status === 'fulfilled' && res.value) map[ids[i]] = res.value;
        });
        setExistingAttaches(map);
        setAttachLoadDone(true);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── File handlers ── */
  const handleFileSelect = useCallback((rowId, file) => {
    setAttachFiles(prev => ({ ...prev, [rowId]: file }));
  }, []);

  const handleFileClear = useCallback((rowId) => {
    setAttachFiles(prev => { const n = { ...prev }; delete n[rowId]; return n; });
  }, []);
  const [rowErrors, setRowErrors] = useState({});
  const emptyCurrentRow = () => ({ ...EMPTY_ROW, _rowId: makeRowId() });
  const [currentRow, setCurrentRow] = useState(emptyCurrentRow);
  const [currentErrors, setCurrentErrors] = useState({});
  const [showEntryForm, setShowEntryForm] = useState(isAdd);

  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingRowId, setDeletingRowId] = useState(null);
  const [stagedDeletedPaymentIds, setStagedDeletedPaymentIds] = useState([]);

  const errorRef = useRef(null);

  useEffect(() => {
    if (apiErr) {
      // Small delay to ensure the DOM element is rendered and laid out
      const timer = setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [apiErr]);

  // auto-fill hoardingID from contract
  const getHoardingIDForContract = (cid) => {
    const c = contracts.find(c => String(c.landContractID) === String(cid));
    return c?.hoardingID || 0;
  };

  const handleCurrentChange = (key, val) => {
    setCurrentRow(p => ({ ...p, [key]: val }));
    if (currentErrors[key]) setCurrentErrors(p => ({ ...p, [key]: '' }));
  };

  const handleAddRow = () => {
    const contract = contracts.find(c => String(c.landContractID) === String(landContractID));
    const maxVal = contract ? Number(contract.totalContractValue) : null;
    const errs = validateRow(currentRow, maxVal);
    if (Object.keys(errs).length) {
      setCurrentErrors(errs);
      setTimeout(() => {
        const firstErr = document.querySelector('.exp-entry-panel .pg-field-wrap--error');
        if (firstErr) {
          const input = firstErr.querySelector('input, select, textarea');
          if (input) input.focus();
          else firstErr.focus();
        }
      }, 50);
      return;
    }
    setRows(prev => [...prev, { ...currentRow }]);
    setCurrentRow(emptyCurrentRow());
    setCurrentErrors({});
    if (!isAdd) setShowEntryForm(false);
  };

  const handleChangeRow = (rowId, key, val) => {
    setRows(prev => prev.map(r => r._rowId === rowId ? { ...r, [key]: val } : r));
    if (rowErrors[rowId]?.[key]) setRowErrors(prev => ({ ...prev, [rowId]: { ...prev[rowId], [key]: '' } }));
  };

  const handleDeleteRow = (rowId) => {
    const row = rows.find(r => r._rowId === rowId);
    if (!row) return;
    setDeleteTarget(row);
  };

  const confirmDeleteRow = () => {
    if (!deleteTarget) return;
    const row = deleteTarget;
    setDeleteTarget(null);
    if (row._paymentID) {
      setStagedDeletedPaymentIds(prev => [...prev, row._paymentID]);
    }
    setRows(prev => prev.filter(r => r._rowId !== row._rowId));
    setRowErrors(prev => { const n = { ...prev }; delete n[row._rowId]; return n; });
    setAttachFiles(prev => { const n = { ...prev }; delete n[row._rowId]; return n; });
  };

  const handleSave = () => {
    let hasHeaderErr = false;
    if (!ownerID) { setOwnerError('Owner is required'); hasHeaderErr = true; }
    else setOwnerError('');
    if (!landContractID) { setContractError('Contract is required'); hasHeaderErr = true; }
    else setContractError('');
    if (hasHeaderErr) {
      setTimeout(() => {
        const firstErr = document.querySelector('.pg-field-wrap--error');
        if (firstErr) {
          const input = firstErr.querySelector('input, select, textarea');
          if (input) input.focus();
          else firstErr.focus();
        }
      }, 50);
      return;
    }

    const contract = contracts.find(c => String(c.landContractID) === String(landContractID));
    const maxVal = contract ? Number(contract.totalContractValue) : 0;

    const newRowErrors = {};
    let hasErr = false;
    rows.forEach(r => { const e = validateRow(r, maxVal); if (Object.keys(e).length) { newRowErrors[r._rowId] = e; hasErr = true; } });

    const entryHasData = Object.entries(currentRow)
      .filter(([k]) => k !== '_rowId')
      .some(([, v]) => v !== '');

    let allRowsToSave = [...rows];
    if (showEntryForm && entryHasData) {
      const errs = validateRow(currentRow, maxVal);
      if (Object.keys(errs).length) {
        setCurrentErrors(errs);
        setTimeout(() => {
          const firstErr = document.querySelector('.exp-entry-panel .pg-field-wrap--error');
          if (firstErr) {
            const input = firstErr.querySelector('input, select, textarea');
            if (input) input.focus();
            else firstErr.focus();
          }
        }, 50);
        return;
      }
      if (hasErr) {
        setRowErrors(newRowErrors);
        setTimeout(() => {
          const firstErr = document.querySelector('.exp-rows-wrap .exp-cell-input--err');
          if (firstErr) {
            firstErr.focus();
          }
        }, 50);
        return;
      }
      allRowsToSave.push({ ...currentRow });
    }

    if (allRowsToSave.length === 0) { setApiErr('Please add at least one payment row.'); return; }
    if (hasErr) {
      setRowErrors(newRowErrors);
      setTimeout(() => {
        const firstErr = document.querySelector('.exp-rows-wrap .exp-cell-input--err');
        if (firstErr) {
          firstErr.focus();
        }
      }, 50);
      return;
    }

    const sumPaid = allRowsToSave.reduce((s, r) => s + (Number(r.amountPaid) || 0), 0);
    if (maxVal > 0 && sumPaid > maxVal) {
      setApiErr(`Total payments (${fmtCurrency(sumPaid)}) cannot exceed the Land Contract amount (${fmtCurrency(maxVal)}).`);
      return;
    }

    _doSave(allRowsToSave);
  };

  const _doSave = async (allRows) => {
    setSaving(true); setApiErr('');
    const contract = contracts.find(c => String(c.landContractID) === String(landContractID));
    const hoardingID = Number(contract?.hoardingID || 0);
    const attachErrors = [];
    try {
      // Delete staged deleted payments first
      if (stagedDeletedPaymentIds.length > 0) {
        for (const id of stagedDeletedPaymentIds) {
          await apiService.deleteLandPayment(id);
        }
      }

      for (const row of allRows) {
        const payload = {
          ownerID: Number(ownerID),
          landContractID: Number(landContractID),
          hoardingID,
          paymentDate: row.paymentDate,
          paymentPurpose: row.paymentPurpose,
          amountPaid: Number(row.amountPaid),
          paymentMode: row.paymentMode,
          nextDueDate: row.nextDueDate || null,
          bankName: row.bankName || '',
          referenceNumber: row.referenceNumber || '',
          paidBy: row.paidBy,
          comments: row.comments || '',
        };

        let resolvedID = row._paymentID;
        if (!row._paymentID) {
          const created = await apiService.createLandPayment(payload);
          resolvedID = created?.landPaymentID ?? created?.id ?? null;
        } else {
          await apiService.updateLandPayment(row._paymentID, payload);
        }

        const file = attachFiles[row._rowId];
        if (file && resolvedID) {
          setUploadingRowIds(prev => new Set(prev).add(row._rowId));
          try {
            const existing = existingAttaches[resolvedID];
            if (existing) {
              await apiService.updateLandPaymentAttach(
                existing, resolvedID, Number(ownerID),
                Number(landContractID), hoardingID, file
              );
            } else {
              await apiService.createLandPaymentAttach(
                resolvedID, Number(ownerID),
                Number(landContractID), hoardingID, file
              );
            }
          } catch (e) {
            attachErrors.push(e?.response?.data?.message || e?.message || 'Upload failed');
          } finally {
            setUploadingRowIds(prev => { const n = new Set(prev); n.delete(row._rowId); return n; });
          }
        }
      }

      if (attachErrors.length) {
        setApiErr(`Payments saved, but ${attachErrors.length} attachment(s) failed: ${attachErrors[0]}`);
        setSaveOk(true);
        setTimeout(() => { onRefresh(); onBack(); }, 2500);
      } else {
        setSaveOk(true);
        setTimeout(() => { onRefresh(); onBack(); }, 700);
      }
    } catch (err) {
      setApiErr(err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const totalAmount = rows.reduce((s, r) => s + (Number(r.amountPaid) || 0), 0);
  const saveLabel = `Save ${rows.length > 0 ? rows.length : ''} Payment${rows.length !== 1 ? 's' : ''}`.trim();

  // resolve display info
  const owner = owners.find(o => o.ownerID === Number(ownerID) || String(o.ownerID) === String(ownerID));
  const contract = contracts.find(c => String(c.landContractID) === String(landContractID));
  const hoarding = hoardings.find(h => h.hoardingID === Number(contract?.hoardingID));
  const editTitle = owner && contract
    ? `${owner.ownerName} — Contract #${contract.landContractID}${hoarding ? ` · ${hoardingLabel(hoarding)}` : ''}`
    : `Group: ${groupKey}`;

  return (
    <div className="hd-form-page">
      {deleteTarget && (
        <DeleteRowModal
          row={deleteTarget}
          onConfirm={confirmDeleteRow}
          onCancel={() => setDeleteTarget(null)}
          deleting={!!deletingRowId}
        />
      )}

      <div className="hd-topbar">
        <div className="hd-topbar-left">
          <button className="hd-back-btn" onClick={onBack} disabled={saving}>
            <ArrowLeft size={14} />
            <span className="d-none d-sm-inline">Back to Payments</span>
            <span className="d-inline d-sm-none">Back</span>
          </button>
          <div className="hd-topbar-divider" />
          <div>
            <div className="hd-topbar-title">
              {isAdd ? 'Record New Land Payments' : `Edit Payments — ${editTitle}`}
            </div>
            <div className="hd-topbar-sub">
              {isAdd
                ? 'Select owner & contract, then add one or more payment rows'
                : `${rows.length} payment row${rows.length !== 1 ? 's' : ''} · ${fmtCurrency(totalAmount)}`}
            </div>
          </div>
        </div>
      </div>

      <div className="hd-form-body">
        <div className="container-fluid px-0">
          {apiErr && (
            <div ref={errorRef} className="pg-field-error hd-api-error mb-3">
              <AlertCircle size={14} /><span>{apiErr}</span>
              <button
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                onClick={() => setApiErr('')}
              >✕</button>
            </div>
          )}

          <div className="row g-4">

            {/* ── Owner & Contract (locked in edit mode) ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><User size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Owner &amp; Contract</div>
                    <div className="hd-section-sub">
                      {isAdd
                        ? 'All payment rows will be linked to this owner and contract'
                        : 'Owner and contract are locked for existing payment group'}
                    </div>
                  </div>
                </div>
                <div className="ea-hint-banner">
                  <Paperclip size={12} color="#049edf" />
                  Each payment row has an optional <strong>Photo / Doc</strong> attachment — leave blank if not needed.
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Owner" required />
                      <OwnerSearchWidget
                        owners={owners}
                        value={ownerID}
                        onChange={val => {
                          setOwnerID(val);
                          setLandContractID('');
                          if (val) setOwnerError('');
                        }}
                        error={ownerError}
                        disabled={!isAdd}
                      />
                      <FieldError msg={ownerError} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Land Contract" required />
                      <ContractDropdown
                        contracts={contracts}
                        hoardings={hoardings}
                        hoardingMaps={hoardingMaps}
                        ownerID={ownerID}
                        value={landContractID}
                        onChange={val => {
                          setLandContractID(val);
                          if (val) setContractError('');
                        }}
                        error={contractError}
                        disabled={!isAdd}
                      />
                      <FieldError msg={contractError} />
                    </div>
                    {contract && (
                      <div className="col-12 mt-2">
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 14px',
                          borderRadius: 10,
                          background: 'rgba(4, 158, 223, 0.05)',
                          border: '1.5px solid rgba(4, 158, 223, 0.15)',
                          fontFamily: 'Nunito, sans-serif',
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#1a1a2e',
                        }}>
                          <IndianRupee size={15} color="#049edf" />
                          <span>Land Contract Amount: </span>
                          <strong style={{ color: '#049edf', fontSize: 14 }}>
                            {fmtCurrency(contract.totalContractValue)}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Payment Entries ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><Receipt size={14} color="#049edf" /></div>
                  <div style={{ flex: 1 }}>
                    <div className="hd-section-title">Payment Entries</div>
                    <div className="hd-section-sub">
                      {isAdd
                        ? 'Add one or more payment rows for this contract'
                        : `${rows.length} payment row${rows.length !== 1 ? 's' : ''} · ${fmtCurrency(totalAmount)}`}
                    </div>
                  </div>
                  {!isAdd && (
                    <button
                      className={`exp-toggle-btn${showEntryForm ? ' exp-toggle-btn--cancel' : ''}`}
                      onClick={() => { setShowEntryForm(v => !v); setCurrentErrors({}); }}
                    >
                      {showEntryForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add Payment Row</>}
                    </button>
                  )}
                </div>
                <div className="hd-section-body">
                  {showEntryForm && (
                    <>
                      <QuickAddPanel
                        row={currentRow}
                        errors={currentErrors}
                        onChange={handleCurrentChange}
                        attachFile={attachFiles[currentRow._rowId] || null}
                        onFileSelect={handleFileSelect}
                        onFileClear={handleFileClear}
                      />
                      <div className="exp-addrow-bar">
                        <button className="exp-btn-addrow" onClick={handleAddRow}>
                          <Plus size={14} /> Add Payment Row
                        </button>
                        {rows.length > 0 && (
                          <span className="exp-addrow-hint">
                            {rows.length} row{rows.length !== 1 ? 's' : ''} queued · {fmtCurrency(totalAmount)}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                  {!attachLoadDone && (
                    <div className="ea-loading-bar">
                      <Loader2 size={13} className="pg-spin" /> Loading existing attachments…
                    </div>
                  )}
                  <PaymentRowsTable
                    rows={rows}
                    rowErrors={rowErrors}
                    onChangeRow={handleChangeRow}
                    onDeleteRow={handleDeleteRow}
                    deletingRowId={deletingRowId}
                    attachFiles={attachFiles}
                    existingAttaches={existingAttaches}
                    uploadingRowIds={uploadingRowIds}
                    onFileSelect={handleFileSelect}
                    onFileClear={handleFileClear}
                  />

                  {!isAdd && rows.length === 0 && !showEntryForm && (
                    <div className="exp-edit-empty">
                      <Receipt size={28} color="#d0d0e8" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hd-form-footer hd-form-footer--sticky">
        <button className="pg-btn-cancel" onClick={onBack} disabled={saving}>Cancel</button>
        <button className="pg-btn-save" onClick={handleSave}
          disabled={saving || !!deletingRowId || uploadingRowIds.size > 0}>
          {saveOk
            ? <><Check size={13} /> Saved!</>
            : saving
              ? <><Loader2 size={13} className="pg-spin" /> Saving…</>
              : uploadingRowIds.size > 0
                ? <><Loader2 size={13} className="pg-spin" /> Uploading…</>
                : <><Check size={13} /> {saveLabel}</>}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function LandPaymentPage() {
  const [owners, setOwners] = useState([]);
  const [hoardings, setHoardings] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [hoardingMaps, setHoardingMaps] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [view, setView] = useState('grid');
  const [formMode, setFormMode] = useState(null);
  const [editGroupKey, setEditGroupKey] = useState(null); // "ownerID_contractID"

  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [sortKey, setSortKey] = useState('ownerName');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const tableRef = useRef(null);
  const [tableReady, setTableReady] = useState(false);
  useEffect(() => { if (!loadingMeta) setTableReady(true); }, [loadingMeta]);
  useResizableColumns(tableRef, tableReady, [200, 180, 100, 110, 80]);

  const fetchAll = useCallback(async () => {
    setLoadingMeta(true); setLoadError('');
    try {
const [rawOwners, rawHoardings, rawContracts, rawPayments, rawMaps] = await Promise.all([
  apiService.getAllOwners(),
  apiService.getAllHoardings(),
  apiService.getAllLandContracts(),
  apiService.getAllLandPayments(),
  apiService.getAllLandContractHoardingMaps(),
]);

      setOwners(Array.isArray(rawOwners) ? rawOwners : Array.isArray(rawOwners?.data) ? rawOwners.data : []);
      setHoardings(Array.isArray(rawHoardings) ? rawHoardings : Array.isArray(rawHoardings?.data) ? rawHoardings.data : []);

      const contractList = Array.isArray(rawContracts)
        ? rawContracts
        : Array.isArray(rawContracts?.data) ? rawContracts.data : [];
      setContracts(contractList.map(c => ({
        landContractID: c.landContractID ?? c.LandContractID,
        ownerID: c.ownerID ?? c.OwnerID,
        hoardingID: c.hoardingID ?? c.HoardingID,
        startDate: (c.startDate ?? c.StartDate ?? '').split('T')[0],
        endDate: (c.endDate ?? c.EndDate ?? '').split('T')[0],
        status: c.status ?? c.Status ?? '',
        totalContractValue: c.totalContractValue ?? c.TotalContractValue ?? 0,
      })));

      const list = Array.isArray(rawPayments)
        ? rawPayments
        : Array.isArray(rawPayments?.data) ? rawPayments.data : [];
      setPayments(list.map(normalizePayment));
      setPayments(list.map(normalizePayment));

const mapList = Array.isArray(rawMaps) ? rawMaps : Array.isArray(rawMaps?.data) ? rawMaps.data : [];  // ← add
setHoardingMaps(mapList);  // ← add
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Failed to load data.');
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Group payments by ownerID + landContractID ── */
  const groupedRows = React.useMemo(() => {
    const map = {};
    payments.forEach(p => {
      const key = `${p.ownerID}_${p.landContractID}`;
      if (!map[key]) {
        const owner = owners.find(o => o.ownerID === Number(p.ownerID) || o.ownerID === p.ownerID);
        const contract = contracts.find(c => String(c.landContractID) === String(p.landContractID));

        // 1) Try hoardingID directly on the payment
        let hoarding = hoardings.find(h => h.hoardingID === Number(p.hoardingID) || h.hoardingID === p.hoardingID);

        // 2) Fallback: use contract.hoardingID
        if (!hoarding && contract?.hoardingID) {
          hoarding = hoardings.find(h => Number(h.hoardingID) === Number(contract.hoardingID));
        }

        // 3) Fallback: look up via hoardingMaps table
        if (!hoarding) {
          const mapEntry = hoardingMaps.find(m =>
            Number(m.landContractID ?? m.LandContractID) === Number(p.landContractID)
          );
          if (mapEntry) {
            const mapHID = mapEntry.hoardingID ?? mapEntry.HoardingID;
            hoarding = hoardings.find(h => Number(h.hoardingID) === Number(mapHID));
          }
        }
        map[key] = {
          groupKey: key,
          ownerID: p.ownerID,
          landContractID: p.landContractID,
          ownerName: owner?.ownerName || `Owner ID ${p.ownerID}`,
          hoardingLabel: hoarding ? hoardingLabel(hoarding) : `Hoarding ID ${p.hoardingID}`,
          contractStatus: contract?.status || '',
          totalAmount: 0,
          count: 0,
          modes: new Set(),
          lastPaymentDate: '',
          _firstPayment: p,
        };
      }
      map[key].totalAmount += Number(p.amountPaid) || 0;
      map[key].count += 1;
      if (p.paymentMode) map[key].modes.add(p.paymentMode);
      if (p.paymentDate && p.paymentDate > map[key].lastPaymentDate) {
        map[key].lastPaymentDate = p.paymentDate;
      }
    });
    return Object.values(map);
  }, [payments, owners, hoardings, contracts, hoardingMaps]);

  const filtered = groupedRows.filter(r => {
    const q = search.toLowerCase();
    const matchQ =
      r.ownerName.toLowerCase().includes(q) ||
      r.hoardingLabel.toLowerCase().includes(q) ||
      String(r.landContractID).includes(q) ||
      String(r.ownerID).includes(q);
    const matchMode = !modeFilter || r.modes.has(modeFilter);
    return matchQ && matchMode;
  });

  const sortedRows = [...filtered].sort((a, b) => {
    if (sortKey === 'totalAmount')
      return sortDir === 'asc' ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount;
    if (sortKey === 'count')
      return sortDir === 'asc' ? a.count - b.count : b.count - a.count;
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

  /* ── Stats ── */
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amountPaid) || 0), 0);
  const cashCount = payments.filter(p => p.paymentMode === 'Cash').length;
  const onlineCount = payments.filter(p => ['NEFT', 'RTGS', 'UPI', 'Bank Transfer'].includes(p.paymentMode)).length;

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('...');
      acc.push(p);
      return acc;
    }, []);

  const COLS = [
    { key: 'ownerName', label: 'Owner' },
    { key: 'hoardingLabel', label: 'Hoarding', tabletHide: true },
    { key: 'totalAmount', label: 'Total Paid' },
    { key: 'count', label: 'Payments', tabletHide: true },
    { key: '_action', label: 'Actions', noSort: true },
  ];

  const contractStatusStyle = (s) => {
    if (!s) return { color: '#9090a8', background: '#f0f0f8' };
    const l = s.toLowerCase();
    if (l === 'active') return { color: '#16a34a', background: '#f0fdf4' };
    if (l === 'inactive') return { color: '#dc2626', background: '#fef2f2' };
    if (l === 'expired') return { color: '#d97706', background: '#fffbeb' };
    return { color: '#7c3aed', background: '#faf5ff' };
  };

  /* ── Form view ── */
  if (view === 'form') {
    return (
<PaymentForm
  mode={formMode}
  groupKey={editGroupKey}
  allPayments={payments}
  owners={owners}
  hoardings={hoardings}
  contracts={contracts}
hoardingMaps={hoardingMaps}
  onBack={() => { setView('grid'); setEditGroupKey(null); }}
  onRefresh={fetchAll}
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
          onClick={() => { setFormMode('add'); setEditGroupKey(null); setView('form'); }}
          disabled={loadingMeta}
        >
          <Plus size={14} /> Record Payment
        </button>
      </div>

      {/* Stats Strip */}
      {!loadingMeta && payments.length > 0 && (
        <div className="exp-stats-strip">
          {[
            { icon: <Receipt size={16} color="#049edf" />, bg: 'rgba(4,158,223,0.1)', label: 'Total Payments', val: payments.length },
            { icon: <IndianRupee size={16} color="#16a34a" />, bg: 'rgba(22,163,74,0.1)', label: 'Total Paid', val: fmtCurrency(totalPaid) },
            { icon: <Banknote size={16} color="#d97706" />, bg: 'rgba(217,119,6,0.08)', label: 'Cash Payments', val: cashCount },
            { icon: <CheckCircle2 size={16} color="#7c3aed" />, bg: 'rgba(124,58,237,0.08)', label: 'Online Payments', val: onlineCount },
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
              <User size={14} color="#9090a8" />
              <span>
                <strong>{loadingMeta ? '...' : filtered.length}</strong> owner–contract
                {filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="pg-search-box">
              <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input
                placeholder="Search owner, hoarding, contract ID..."
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

        {/* Desktop Table — grouped rows */}
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
                  const cst = contractStatusStyle(r.contractStatus);
                  const modesArr = Array.from(r.modes).slice(0, 3);
                  return (
                    <tr key={r.groupKey} className="pg-tr">
                      {/* Owner */}
                      <td className="pg-td">
                        <div className="pg-td__primary">{r.ownerName}</div>
                        <div style={{ fontSize: 11, color: '#9090a8', marginTop: 1 }}>
                          Contract #{r.landContractID}
                          {r.contractStatus && (
                            <span style={{
                              marginLeft: 6, fontSize: 10, fontWeight: 700,
                              padding: '1px 6px', borderRadius: 20, ...cst,
                            }}>
                              {r.contractStatus}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Hoarding */}
                      <td className="pg-td pg-tablet-hide">
                        <span className="pg-td__ellipsis" title={r.hoardingLabel}>{r.hoardingLabel}</span>
                        {r.lastPaymentDate && (
                          <div style={{ fontSize: 11, color: '#9090a8', marginTop: 1 }}>
                            Last: {fmtDate(r.lastPaymentDate)}
                          </div>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="pg-td">
                        <span className="exp-amount-val">{fmtCurrency(r.totalAmount)}</span>
                      </td>

                      {/* Count + modes */}
                      <td className="pg-td pg-tablet-hide">
                        <div style={{ fontSize: 12, color: '#5a5a7a', fontWeight: 700 }}>
                          {r.count} payment{r.count !== 1 ? 's' : ''}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
                          {modesArr.map(m => {
                            const mst = paymentModeStyle(m);
                            return (
                              <span key={m} className="lc-status-badge"
                                style={{ background: mst.bg, color: mst.color, borderColor: mst.border, fontSize: 10 }}>
                                {m}
                              </span>
                            );
                          })}
                          {r.modes.size > 3 && (
                            <span style={{ fontSize: 10, color: '#9090a8', alignSelf: 'center' }}>
                              +{r.modes.size - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="pg-td">
                        <div className="pg-action-wrap">
                          <button
                            className="pg-btn-view" title="View / Edit"
                            onClick={() => {
                              setFormMode('edit');
                              setEditGroupKey(r.groupKey);
                              setView('form');
                            }}
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
              const modesArr = Array.from(r.modes).slice(0, 2);
              return (
                <div key={r.groupKey} className="pg-card">
                  <div className="pg-card__header">
                    <div className="pg-card__title-wrap">
                      <div className="pg-card__title">{r.ownerName}</div>
                      <div className="pg-card__subtitle">{r.hoardingLabel}</div>
                    </div>
                    <div className="pg-card__actions">
                      <button
                        className="pg-card__btn-view"
                        onClick={() => { setFormMode('edit'); setEditGroupKey(r.groupKey); setView('form'); }}
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="pg-card__body">
                    <div className="pg-card__row">
                      <IndianRupee size={12} color="#c0c0d8" className="pg-card__row-icon" />
                      <span className="pg-card__row-text" style={{ fontWeight: 800, color: '#1a1a2e' }}>
                        {fmtCurrency(r.totalAmount)}
                      </span>
                      <span style={{ color: '#9090a8', fontSize: 11, marginLeft: 4 }}>
                        {r.count} payment{r.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="pg-card__row">
                      <FileText size={12} color="#c0c0d8" className="pg-card__row-icon" />
                      <span className="pg-card__row-text">Contract #{r.landContractID}</span>
                    </div>
                    {r.lastPaymentDate && (
                      <div className="pg-card__row">
                        <Calendar size={12} color="#c0c0d8" className="pg-card__row-icon" />
                        <span className="pg-card__row-text">Last: {fmtDate(r.lastPaymentDate)}</span>
                      </div>
                    )}
                    {modesArr.length > 0 && (
                      <div className="pg-card__row" style={{ flexWrap: 'wrap', gap: 4 }}>
                        <CreditCard size={12} color="#c0c0d8" className="pg-card__row-icon" />
                        {modesArr.map(m => {
                          const mst = paymentModeStyle(m);
                          return (
                            <span key={m} className="lc-status-badge"
                              style={{ background: mst.bg, color: mst.color, borderColor: mst.border, fontSize: 10 }}>
                              {m}
                            </span>
                          );
                        })}
                      </div>
                    )}
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
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
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