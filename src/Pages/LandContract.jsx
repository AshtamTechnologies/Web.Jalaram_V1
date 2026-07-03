import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import {
  Plus, Search, X, AlertCircle, Check, Edit2,
  RefreshCw, Calendar, ChevronUp, ChevronDown,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Loader2, FileText, Eye, ArrowLeft, Building2, User,
  IndianRupee, Clock, Upload, Trash2,
  ShieldCheck, MessageSquare, CreditCard, TrendingUp,
  Download, ExternalLink, MapPin, Tag, Paperclip, AlertTriangle
} from 'lucide-react';
import { apiService, API_ROOT_URL } from '../api/api';
import './Common1.css';
import { useResizableColumns } from '../hooks/useResizableColumns';

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];
const STATUS_OPTIONS = ['Active', 'InActive', 'Pending'];

const PAYMENT_FREQ_FALLBACK = [
  { value: 1, label: 'Monthly' },
  { value: 2, label: 'Quarterly' },
  { value: 3, label: 'Half-Yearly' },
  { value: 4, label: 'Yearly' },
];

/* EMPTY_FORM */
const EMPTY_FORM = {
  ownerID: '', startDate: '', endDate: '',
  totalContractValue: '', paymentFreqID: '', amountPerFreq: '',
  advancePaid: '', status: 'Active', comments: '',
};

const forceDownload = async (url, filename) => {
  try {
    let cleanUrl = url.split('?')[0];
    if (process.env.NODE_ENV === 'development' && cleanUrl.startsWith(API_ROOT_URL)) {
      cleanUrl = cleanUrl.replace(API_ROOT_URL, window.location.origin);
    }
    const downloadUrl = `${cleanUrl}?t=${Date.now()}`;
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers,
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    const localUrl = URL.createObjectURL(blob);
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

/* Attachment file validation */
const ATTACH_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];
const ATTACH_ALLOWED_LABEL = 'PDF, Word (.doc/.docx), JPG or PNG';
const ATTACH_MAX_MB = 30;


/* ── Persist original filenames in localStorage ── */
const ATTACH_NAME_KEY = 'lc_attach_names';
function saveAttachName(attachId, name) {
  try {
    const map = JSON.parse(localStorage.getItem(ATTACH_NAME_KEY) || '{}');
    map[String(attachId)] = name;
    localStorage.setItem(ATTACH_NAME_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}
function getAttachName(attachId) {
  try {
    const map = JSON.parse(localStorage.getItem(ATTACH_NAME_KEY) || '{}');
    return map[String(attachId)] || null;
  } catch { return null; }
}
function deleteAttachName(attachId) {
  try {
    const map = JSON.parse(localStorage.getItem(ATTACH_NAME_KEY) || '{}');
    delete map[String(attachId)];
    localStorage.setItem(ATTACH_NAME_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function fmtNumber(v) {
  if (v === '' || v == null || isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('en-IN');
}
function fmtCurrency(v) {
  if (v === '' || v == null || isNaN(Number(v))) return '—';
  return '₹' + Number(v).toLocaleString('en-IN');
}
function freqLabel(id, paymentFreqs) {
  return paymentFreqs.find(f => String(f.value) === String(id))?.label || '—';
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
    landContractID: raw.landContractID ?? raw.LandContractID,
    ownerID: raw.ownerID ?? raw.OwnerID,
    hoardingID: raw.hoardingID ?? raw.HoardingID,
    startDate: (raw.startDate ?? raw.StartDate ?? '').split('T')[0],
    endDate: (raw.endDate ?? raw.EndDate ?? '').split('T')[0],
    totalContractValue: raw.totalContractValue ?? raw.TotalContractValue ?? '',
    paymentFreqID: raw.paymentFreqID ?? raw.PaymentFreqID ?? '',
    amountPerFreq: raw.amountPerFreq ?? raw.AmountPerFreq ?? '',
    advancePaid: raw.advancePaid ?? raw.AdvancePaid ?? '',
    status: raw.status ?? raw.Status ?? '',
    comments: raw.comments ?? raw.Comments ?? '',
    lastUpdatedBy: raw.lastUpdatedBy ?? raw.LastUpdatedBy ?? '',
    lastUpdateDttm: raw.lastUpdateDttm ?? raw.LastUpdateDttm ?? '',
  };
}
function normalizeAttachment(raw) {

  const filePath = raw.contractFilePath ?? raw.ContractFilePath ?? '';
  const rawName = raw.contractFilename ?? raw.ContractFilename ?? raw.fileName ?? raw.FileName ?? '';
  const fileName = rawName.trim() || null;

  const attachID =
    raw.landContractAttachID ??
    raw.LandContractAttachID ??
    raw.landContractAttachId ??
    raw.LandContractAttachId ??
    raw.attachID ??
    raw.AttachID ??
    raw.id ??
    raw.Id ??
    null;

  return {
    landContractAttachID: attachID,
    landContractID: raw.landContractID ?? raw.LandContractID,
    ownerID: raw.ownerID ?? raw.OwnerID,
    hoardingID: raw.hoardingID ?? raw.HoardingID,
    contractFilePath: filePath,
    contractFilename: fileName,
    fileUrl: filePath
  ? (filePath.startsWith('http') ? filePath : `${API_ROOT_URL}${filePath}`)
  : null,
    lastUpdateDttm: raw.lastUpdateDttm ?? raw.LastUpdateDttm ?? '',
  };
}

/* ─────────────────────────────────────────
   VALIDATE FORM
───────────────────────────────────────── */
function validateForm(form, isAdd = true) {
  const e = {};
  if (!form.ownerID) e.ownerID = 'Owner is required';
  if (!form.startDate) e.startDate = 'Start date is required';
  if (!form.endDate) e.endDate = 'End date is required';
  if (form.startDate && form.endDate && form.endDate <= form.startDate)
    e.endDate = 'End date must be after start date';
  if (form.totalContractValue === '' || form.totalContractValue == null)
    e.totalContractValue = 'Total contract value is required';
  else if (isNaN(Number(form.totalContractValue)) || Number(form.totalContractValue) < 0)
    e.totalContractValue = 'Must be a valid positive number';
  if (!form.paymentFreqID) e.paymentFreqID = 'Payment frequency is required';
  if (form.amountPerFreq === '' || form.amountPerFreq == null)
    e.amountPerFreq = 'Amount per frequency is required';
  else if (isNaN(Number(form.amountPerFreq)) || Number(form.amountPerFreq) < 0)
    e.amountPerFreq = 'Must be a valid positive number';
  if (form.advancePaid !== '' && form.advancePaid != null && isNaN(Number(form.advancePaid)))
    e.advancePaid = 'Must be a valid number';
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
      <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} /><span>{msg}</span>
    </div>
  ) : null;
}

/* ─────────────────────────────────────────
   CURRENCY INPUT
───────────────────────────────────────── */
function CurrencyInput({ value, onChange, placeholder }) {
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
    <input className="pg-field-input" value={toDisplay(value)} onChange={handleChange}
      placeholder={placeholder} inputMode="numeric" autoComplete="off" />
  );
}

/* ═══════════════════════════════════════════
   COMBO DROPDOWN
═══════════════════════════════════════════ */
function ComboDropdown({ value, onChange, onBlur, hasError, placeholder, icon: Icon, options, searchable = false, emptyText = 'No options' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));
  const filtered = searchable ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())) : options;

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setQuery(''); setFocusedIndex(-1); onBlur && onBlur();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onBlur]);

  const openDropdown = () => { setOpen(true); setFocusedIndex(-1); setQuery(''); if (searchable) setTimeout(() => inputRef.current?.focus(), 0); };
  const select = (opt) => { onChange(opt.value); setOpen(false); setQuery(''); setFocusedIndex(-1); };
  const clear = (e) => { e.stopPropagation(); onChange(''); setOpen(false); setQuery(''); setFocusedIndex(-1); onBlur && onBlur(); };

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
      <div className={`pg-field-wrap ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        style={{ cursor: 'pointer', userSelect: 'none' }} onClick={openDropdown} tabIndex={0} onKeyDown={handleKeyDown}>
        {Icon && <Icon size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />}
        <span style={{ flex: 1, fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: selected ? 700 : 500, color: selected ? '#1a1a2e' : '#b0b0c8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
          {selected ? selected.label : placeholder}
        </span>
        {selected ? <X size={13} style={{ flexShrink: 0, cursor: 'pointer', color: '#c0c0d8' }} onClick={clear} /> : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>
      {open && (
        <div className="lc-dropdown">
          {searchable && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderBottom: '1px solid #f0f0f8', background: '#f8f8fd' }}>
              <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input ref={inputRef} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 600, color: '#1a1a2e' }}
                placeholder="Search…" value={query} onChange={e => { setQuery(e.target.value); setFocusedIndex(-1); }} onKeyDown={handleKeyDown} />
              {query && <X size={11} style={{ cursor: 'pointer', color: '#c0c0d8' }} onClick={() => setQuery('')} />}
            </div>
          )}
          {filtered.length === 0
            ? <div className="lc-dropdown-empty"><span>{emptyText}</span></div>
            : filtered.map((opt, idx) => (
              <div key={opt.value}
                className={`lc-dropdown-option${String(opt.value) === String(value) ? ' lc-dropdown-option--focused' : ''}${idx === focusedIndex ? ' lc-dropdown-option--focused' : ''}`}
                onMouseEnter={() => setFocusedIndex(idx)} onMouseDown={() => select(opt)}>
                <div className="lc-dropdown-option__name" style={{ color: String(opt.value) === String(value) ? '#049edf' : '#1a1a2e' }}>{opt.label}</div>
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
    setResults(owners.filter(o =>
      (o.ownerName || '').toLowerCase().includes(q) ||
      (o.phone1 || '').toLowerCase().includes(q) ||
      (o.phone || '').toLowerCase().includes(q) ||
      String(o.ownerID).includes(q)
    ).slice(0, 10));
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
        <div className={`pg-field-wrap ${error ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
          style={{ cursor: 'text' }} onClick={() => setOpen(true)}>
          <Search size={14} color={error ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
          <input className="pg-field-input" placeholder="Search owner by name, phone or ID..."
            value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)} onKeyDown={handleKeyDown} autoComplete="off" />
          {query && <X size={12} style={{ cursor: 'pointer', color: '#c0c0d8', flexShrink: 0 }}
            onClick={e => { e.stopPropagation(); setQuery(''); setResults([]); setFocusedIndex(-1); }} />}
        </div>
      )}
      {open && results.length > 0 && (
        <div className="lc-dropdown">
          {results.map((o, idx) => (
            <div key={o.ownerID}
              className={`lc-dropdown-option${idx === focusedIndex ? ' lc-dropdown-option--focused' : ''}`}
              onMouseEnter={() => setFocusedIndex(idx)}
              onMouseDown={() => { onChange(o.ownerID); setQuery(''); setOpen(false); setResults([]); setFocusedIndex(-1); }}>
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
        <div className="lc-dropdown"><div className="lc-dropdown-empty"><User size={18} /><span>No owners found</span></div></div>
      )}
      {value && selected && (
        <div className="lc-selected-card">
          <div className="lc-selected-card__icon"><User size={15} color="#049edf" /></div>
          <div className="lc-selected-card__info">
            <div className="lc-selected-card__name">{selected.ownerName}</div>
            {(selected.phone1 || selected.phone) && <div className="lc-selected-card__sub">{selected.phone1 || selected.phone}</div>}
          </div>
          {!disabled && <button className="lc-selected-card__clear" onClick={() => { onChange(''); setQuery(''); }} title="Clear"><X size={12} /></button>}
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

/* ═══════════════════════════════════════════════════════════
   HOARDING LOOKUP MODAL — MULTI-SELECT
═══════════════════════════════════════════════════════════ */
function HoardingLookupModal({ hoardings, sites, ownerID, onSelectMultiple, onClose, alreadyMappedIds = new Set() }) {
  const [query, setQuery] = useState('');
  const [sortK, setSortK] = useState('hoardingCode');
  const [sortD, setSortD] = useState('asc');
  const [selected, setSelected] = useState(new Set());
  const inputRef = useRef(null);

  const ownerSiteIds = new Set(
    sites.filter(s => ownerID && (s.ownerID === Number(ownerID) || s.ownerID === ownerID)).map(s => s.siteID)
  );

  const ownerHoardings = ownerID
    ? hoardings.filter(h => ownerSiteIds.has(h.siteID) && !alreadyMappedIds.has(Number(h.hoardingID)))
    : hoardings.filter(h => !alreadyMappedIds.has(Number(h.hoardingID)));

  const filtered = ownerHoardings.filter(h => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (h.hoardingCode || '').toLowerCase().includes(q) ||
      (h.material || '').toLowerCase().includes(q) ||
      (h.status || '').toLowerCase().includes(q) ||
      String(h.hoardingID).includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = String(a[sortK] ?? '').toLowerCase();
    const bv = String(b[sortK] ?? '').toLowerCase();
    return sortD === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const handleSort = (key) => {
    if (sortK === key) setSortD(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortK(key); setSortD('asc'); }
  };

  const toggleOne = (hoardingID) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(hoardingID)) next.delete(hoardingID);
      else next.add(hoardingID);
      return next;
    });
  };

  const allChecked = sorted.length > 0 && sorted.every(h => selected.has(h.hoardingID));
  const someChecked = sorted.some(h => selected.has(h.hoardingID)) && !allChecked;

  const toggleAll = () => {
    if (allChecked) {
      setSelected(prev => {
        const next = new Set(prev);
        sorted.forEach(h => next.delete(h.hoardingID));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        sorted.forEach(h => next.add(h.hoardingID));
        return next;
      });
    }
  };

  const handleConfirm = () => {
    const picked = hoardings.filter(h => selected.has(h.hoardingID));
    onSelectMultiple(picked);
    onClose();
  };

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const hoardingStatusStyle = (s) => {
    switch (s) {
      case 'Active': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'Inactive': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'Under Maintenance': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
      default: return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
    }
  };

  /* Inline checkbox style */
  const cbStyle = (checked) => ({
    width: 17, height: 17, borderRadius: 5,
    border: `2px solid ${checked ? '#049edf' : '#d0d0e0'}`,
    background: checked ? '#049edf' : '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, cursor: 'pointer', transition: 'all 0.12s',
  });

  return ReactDOM.createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99997, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 760, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden', animation: 'modalIn 0.22s cubic-bezier(0.22,1,0.36,1) both' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#049edf,#0284c7)', padding: '20px 24px 16px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 17, color: '#fff' }}>Select Hoardings</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
              {ownerHoardings.length} hoarding{ownerHoardings.length !== 1 ? 's' : ''} available · select one or more
            </div>
          </div>
          {selected.size > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 20, padding: '5px 14px', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {selected.size} selected
            </div>
          )}
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #f0f0f8', flexShrink: 0, background: '#fafafe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid #e8e8f4', borderRadius: 10, padding: '9px 14px' }}>
            <Search size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input ref={inputRef} style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: 'none' }}
              placeholder="Search by code, material or status…" value={query} onChange={e => setQuery(e.target.value)} />
            {query && <X size={13} style={{ cursor: 'pointer', color: '#c0c0d8', flexShrink: 0 }} onClick={() => setQuery('')} />}
          </div>
          {query && (
            <div style={{ marginTop: 6, fontFamily: 'Nunito, sans-serif', fontSize: 11.5, color: '#9090a8', fontWeight: 600 }}>
              {sorted.length} result{sorted.length !== 1 ? 's' : ''} for "{query}"
            </div>
          )}
        </div>

        {/* Empty states */}
        {ownerHoardings.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
            <Building2 size={40} color="#d0d0e8" />
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#9090a8', fontSize: 14 }}>No hoardings available for this owner</div>
          </div>
        )}
        {ownerHoardings.length > 0 && sorted.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
            <Search size={36} color="#d0d0e8" />
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#9090a8', fontSize: 14 }}>No hoardings match "{query}"</div>
          </div>
        )}

        {/* Table — only Code, Material, Size, Status */}
        {sorted.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: '#f8f8fd' }}>
                  {/* Select-all checkbox */}
                  <th style={{ padding: '10px 14px', width: 46, borderBottom: '1.5px solid #e8e8f4' }}>
                    <div
                      style={cbStyle(allChecked)}
                      onClick={toggleAll}
                      title={allChecked ? 'Deselect all' : 'Select all'}
                    >
                      {(allChecked || someChecked) && (
                        someChecked
                          ? <div style={{ width: 8, height: 2, background: '#fff', borderRadius: 2 }} />
                          : <Check size={10} color="#fff" strokeWidth={3} />
                      )}
                    </div>
                  </th>
                  {[
                    { key: 'hoardingCode', label: 'Code' },
                    { key: 'material', label: 'Material' },
                    { key: null, label: 'Size' },
                    { key: 'status', label: 'Status' },
                  ].map((col, i) => (
                    <th key={i} onClick={() => col.key && handleSort(col.key)}
                      style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#7878a0', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1.5px solid #e8e8f4', cursor: col.key ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {col.label}
                        {col.key && (
                          <span style={{ display: 'flex', flexDirection: 'column' }}>
                            <ChevronUp size={9} color={sortK === col.key && sortD === 'asc' ? '#049edf' : '#d0d0e4'} />
                            <ChevronDown size={9} color={sortK === col.key && sortD === 'desc' ? '#049edf' : '#d0d0e4'} style={{ marginTop: -2 }} />
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((h, idx) => {
                  const isChecked = selected.has(h.hoardingID);
                  const st = hoardingStatusStyle(h.status);
                  return (
                    <tr
                      key={h.hoardingID}
                      onClick={() => toggleOne(h.hoardingID)}
                      style={{ cursor: 'pointer', background: isChecked ? '#f0f8ff' : idx % 2 === 0 ? '#fff' : '#fafafe', transition: 'background 0.1s', borderLeft: isChecked ? '3px solid #049edf' : '3px solid transparent' }}
                      onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = '#f5f9ff'; }}
                      onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafe'; }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8', width: 46 }}>
                        <div style={cbStyle(isChecked)}>
                          {isChecked && <Check size={10} color="#fff" strokeWidth={3} />}
                        </div>
                      </td>
                      {/* Code */}
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8' }}>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 13, color: '#049edf' }}>{h.hoardingCode}</div>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#b0b0c8', fontWeight: 600, marginTop: 1 }}>ID: {h.hoardingID}</div>
                      </td>
                      {/* Material */}
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8' }}>
                        <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#4a5568' }}>{h.material || '—'}</span>
                      </td>
                      {/* Size */}
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8', whiteSpace: 'nowrap' }}>
                        {h.width && h.height ? (
                          <>
                            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#4a5568' }}>{h.width} × {h.height} ft</div>
                            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#b0b0c8', fontWeight: 600 }}>{h.width * h.height} sq ft</div>
                          </>
                        ) : <span style={{ color: '#c0c0d8' }}>—</span>}
                      </td>
                      {/* Status */}
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: 11, fontWeight: 800, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}>
                          {h.status || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #f0f0f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafe', flexShrink: 0, gap: 12 }}>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600 }}>
            {selected.size === 0
              ? 'Click rows to select hoardings'
              : <><strong style={{ color: '#049edf' }}>{selected.size}</strong> hoarding{selected.size !== 1 ? 's' : ''} selected</>
            }
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="pg-btn-cancel" style={{ fontSize: 12 }}>Cancel</button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              style={{ padding: '8px 20px', borderRadius: 9, background: selected.size > 0 ? 'linear-gradient(135deg,#049edf,#0284c7)' : '#e0e0f0', color: selected.size > 0 ? '#fff' : '#a0a0b8', border: 'none', cursor: selected.size > 0 ? 'pointer' : 'not-allowed', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, boxShadow: selected.size > 0 ? '0 2px 8px rgba(4,158,223,0.3)' : 'none', transition: 'all 0.15s' }}
            >
              <Check size={13} />
              Add {selected.size > 0 ? `${selected.size} ` : ''}Hoarding{selected.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════════
   CONTRACT ATTACHMENTS SECTION
═══════════════════════════════════════════════════════════ */
function ContractAttachmentsSection({
  contractId,
  ownerID,
  hoardingID,
  attachments = [],
  onAddAttachment,
  onReplaceAttachment,
  onDeleteAttachment,
  loading = false,
}) {
  const [fileError, setFileError] = useState('');
  const [replacingId, setReplacingId] = useState(null);
  const [attachToDelete, setAttachToDelete] = useState(null);
  const uploadRef = useRef(null);
  const replaceRef = useRef(null);

  const validateFile = (file) => {
    if (!ATTACH_ALLOWED_TYPES.includes(file.type))
      return `Invalid type "${file.name}". Allowed: ${ATTACH_ALLOWED_LABEL}.`;
    if (file.size > ATTACH_MAX_MB * 1024 * 1024)
      return `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — exceeds ${ATTACH_MAX_MB} MB limit.`;
    return null;
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const err = validateFile(file);
    if (err) { setFileError(err); return; }
    setFileError('');
    if (onAddAttachment) onAddAttachment(file);
  };

  const handleReplace = (e, target) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const err = validateFile(file);
    if (err) { setFileError(err); setReplacingId(null); return; }
    setFileError('');
    if (onReplaceAttachment) onReplaceAttachment(target, file);
    setReplacingId(null);
  };

  const handleDelete = (att) => {
    const uuidPattern = /^\d+_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.([\w]+)$/i;
    const rawFilename = att.contractFilename || att.contractFilePath?.split('/').pop() || '';
    const uuidMatch = rawFilename.match(uuidPattern);
    const name = uuidMatch ? `Contract-Document-${att.landContractAttachID}.${uuidMatch[1]}` : rawFilename || 'Document';
    setAttachToDelete({ target: att, name });
  };

  const executeDelete = (target) => {
    if (onDeleteAttachment) onDeleteAttachment(target);
    setAttachToDelete(null);
  };

  return (
    <div className="hd-section-card">
      <div className="hd-section-head">
        <div className="hd-section-icon-wrap"><Paperclip size={14} color="#049edf" /></div>
        <div>
          <div className="hd-section-title">Contract Documents</div>
          <div className="hd-section-sub">Upload and manage multiple contract attachments (PDF, Word, Images)</div>
        </div>
      </div>
      <div className="hd-section-body">
        <input ref={uploadRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleUpload} />
        <input ref={replaceRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => { if (replacingId) handleReplace(e, replacingId); }} />

        {fileError && (
          <div className="pg-field-error" style={{ marginBottom: 12 }}>
            <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{fileError}</span>
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11 }} onClick={() => setFileError('')}>✕</button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '28px 0', textAlign: 'center', color: '#9090a8' }}>
            <Loader2 size={22} className="pg-spin" style={{ marginBottom: 8 }} />
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600 }}>Loading attachments…</div>
          </div>
        ) : (
          <>
            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {attachments.map((att) => {
                  const uuidPattern = /^\d+_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.([\w]+)$/i;
                  const rawFilename = att.contractFilename || att.contractFilePath?.split('/').pop() || '';
                  const uuidMatch = rawFilename.match(uuidPattern);
                  const name = uuidMatch ? `Contract-Document-${att.landContractAttachID}.${uuidMatch[1]}` : rawFilename || 'Document';

                  const isNew = !att.landContractAttachID;

                  return (
                    <div key={att.landContractAttachID || att.tempId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8f8fd', border: '1.5px solid #e8e8f4', borderRadius: 10 }}>
                      <FileText size={16} color="#049edf" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: att.fileUrl ? 'pointer' : 'default', textDecoration: att.fileUrl ? 'underline' : 'none' }}
                          onClick={() => att.fileUrl && window.open(att.fileUrl, '_blank')}>
                          {name}
                        </div>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#b0b0c8', fontWeight: 600, marginTop: 1 }}>
                          {isNew ? 'Staged (Unsaved)' : `Attachment #${att.landContractAttachID}`}
                          {!isNew && att.lastUpdateDttm && (<span style={{ marginLeft: 8 }}>· {fmtDate(att.lastUpdateDttm?.split?.('T')?.[0] ?? '')}</span>)}
                        </div>
                      </div>
                      {att.fileUrl && (
                        <button onClick={() => window.open(att.fileUrl, '_blank')} title="View document"
                          style={{ background: 'rgba(4,158,223,0.08)', border: '1px solid rgba(4,158,223,0.2)', borderRadius: 6, padding: '4px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#049edf', fontSize: 11, fontWeight: 700, flexShrink: 0, fontFamily: 'Nunito, sans-serif' }}>
                          <ExternalLink size={11} /> View
                        </button>
                      )}
                      {att.fileUrl && !isNew && (
                        <button onClick={() => forceDownload(att.fileUrl, name)} title="Download document"
                          style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 6, padding: '4px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontSize: 11, fontWeight: 700, flexShrink: 0, fontFamily: 'Nunito, sans-serif' }}>
                          <Download size={11} /> Download
                        </button>
                      )}
                      <button onClick={() => { setReplacingId(att); replaceRef.current.click(); }} title="Replace with a new file"
                        style={{ background: 'rgba(109,99,255,0.08)', border: '1px solid rgba(109,99,255,0.2)', borderRadius: 6, padding: '4px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#6c63ff', fontSize: 11, fontWeight: 700, flexShrink: 0, fontFamily: 'Nunito, sans-serif' }}>
                        <RefreshCw size={11} /> Replace
                      </button>
                      <button onClick={() => handleDelete(att)} title="Delete attachment"
                        style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#dc2626' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {attachments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0 14px', color: '#b0b0c8' }}>
                <Paperclip size={28} color="#d0d0e8" style={{ marginBottom: 8 }} />
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700, color: '#9090a8' }}>No documents attached yet</div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#c0c0d8', marginTop: 3 }}>Click the button below to upload your first document</div>
              </div>
            )}
            <button className="lc-upload-btn" onClick={() => { setFileError(''); uploadRef.current.click(); }}>
              <Upload size={14} /> Add Document — {ATTACH_ALLOWED_LABEL} (max {ATTACH_MAX_MB} MB)
            </button>
            {attachments.length > 0 && (
              <div style={{ marginTop: 8, fontFamily: 'Nunito, sans-serif', fontSize: 11.5, color: '#9090a8', fontWeight: 600 }}>
                {attachments.length} document{attachments.length !== 1 ? 's' : ''} attached · You can add more or replace/delete existing ones
              </div>
            )}
          </>
        )}
      </div>

      {attachToDelete && (
        <AttachmentDeleteConfirmModal
          fileName={attachToDelete.name}
          onConfirm={() => {
            executeDelete(attachToDelete.target);
            setAttachToDelete(null);
          }}
          onClose={() => setAttachToDelete(null)}
        />
      )}
    </div>
  );
}



function AttachmentDeleteConfirmModal({ fileName, onConfirm, onClose }) {
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (cancelBtnRef.current) cancelBtnRef.current.focus();
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 22, width: '100%', maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', padding: '24px 24px 20px',
          animation: 'modalIn 0.24s cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: '#fffbeb', border: '2px solid #fde68a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={20} color="#d97706" />
          </div>
          <div>
            <h3 style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 18, color: '#1a1a2e', margin: 0 }}>
              Delete Document?
            </h3>
            <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 600, color: '#7878a0', margin: '4px 0 0' }}>
              Confirm deleting this attachment.
            </p>
          </div>
        </div>

        <div style={{
          fontFamily: 'Nunito,sans-serif', fontSize: 14, fontWeight: 600,
          color: '#4a5568', lineHeight: 1.5, marginBottom: 24,
        }}>
          Are you sure you want to delete the document <strong>{fileName}</strong>? This action cannot be undone.
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
        }}>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px', borderRadius: 10, border: '1.5px solid #fca5a5',
              background: '#fff', color: '#dc2626', cursor: 'pointer',
              fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 800,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.background = '#fef2f2'; }}
            onMouseLeave={e => { e.target.style.background = '#fff'; }}
          >
            Yes, Delete
          </button>

          <button
            ref={cancelBtnRef}
            onClick={onClose}
            style={{
              padding: '11px 24px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#049edf,#6c63ff)',
              color: '#fff', cursor: 'pointer',
              fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 800,
              boxShadow: '0 4px 12px rgba(108,99,255,0.2)',
            }}
          >
            No, Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════════
   CONTRACT HOARDING MAP SECTION — multi-select add
═══════════════════════════════════════════════════════════ */
function ContractHoardingMapSection({ contractId, ownerID, hoardings, sites, selectedHoardings = [], onAddHoardings, onRemoveHoarding, loading = false }) {
  const [pickOpen, setPickOpen] = useState(false);
  const [mapToDelete, setMapToDelete] = useState(null);

  const mappedHoardingIds = new Set(selectedHoardings.map(h => Number(h.hoardingID)));

  const handleAddMultiple = (pickedHoardings) => {
    if (onAddHoardings) onAddHoardings(pickedHoardings);
  };

  const handleDelete = (hoardingID, hoardingCode) => {
    setMapToDelete({ id: hoardingID, code: hoardingCode });
  };

  const executeDelete = (hoardingID) => {
    if (onRemoveHoarding) onRemoveHoarding(hoardingID);
  };

  const ownerSiteIds = new Set(
    sites.filter(s => ownerID && (s.ownerID === Number(ownerID) || s.ownerID === ownerID)).map(s => s.siteID)
  );

  const availableHoardings = ownerID
    ? hoardings.filter(h => ownerSiteIds.has(h.siteID) && !mappedHoardingIds.has(Number(h.hoardingID)))
    : hoardings.filter(h => !mappedHoardingIds.has(Number(h.hoardingID)));

  const siteMap = Object.fromEntries(sites.map((s) => [s.siteID, s]));

  return (
    <div className="hd-section-card">
      <div className="hd-section-head">
        <div className="hd-section-icon-wrap"><Building2 size={14} color="#6c63ff" /></div>
        <div>
          <div className="hd-section-title">Hoardings</div>
          <div className="hd-section-sub">Manage all hoardings linked to this contract</div>
        </div>
      </div>
      <div className="hd-section-body">
        {loading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#9090a8' }}>
            <Loader2 size={22} className="pg-spin" style={{ marginBottom: 8 }} />
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600 }}>Loading hoarding mappings…</div>
          </div>
        ) : (
          <>
            {selectedHoardings.length > 0 && (
              /* ── Compact table: Code, Material, Size, Status ── */
              <div style={{ marginBottom: 14, border: '1.5px solid #e8e8f4', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f8fd' }}>
                      {['Code', 'Material', 'Size', 'Status', ''].map((h, i) => (
                        <th key={i} style={{ padding: '9px 13px', textAlign: 'left', fontSize: 11, fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#7878a0', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1.5px solid #e8e8f4', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedHoardings.map((h, idx) => {
                      const hSt = h?.status ? (() => {
                        switch (h.status) {
                          case 'Active': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
                          case 'Inactive': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
                          case 'Under Maintenance': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
                          default: return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
                        }
                      })() : { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };

                      return (
                        <tr key={h.hoardingID} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafe' }}>
                          {/* Code */}
                          <td style={{ padding: '10px 13px', borderBottom: '1px solid #f0f0f8' }}>
                            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 12.5, color: '#6c63ff' }}>
                              {h.hoardingCode}
                            </div>
                          </td>
                          {/* Material */}
                          <td style={{ padding: '10px 13px', borderBottom: '1px solid #f0f0f8' }}>
                            <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#4a5568' }}>{h.material || '—'}</span>
                          </td>
                          {/* Size */}
                          <td style={{ padding: '10px 13px', borderBottom: '1px solid #f0f0f8', whiteSpace: 'nowrap' }}>
                            {h.width && h.height ? (
                              <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#4a5568' }}>
                                {h.width} × {h.height} ft
                              </span>
                            ) : <span style={{ color: '#c0c0d8' }}>—</span>}
                          </td>
                          {/* Status */}
                          <td style={{ padding: '10px 13px', borderBottom: '1px solid #f0f0f8' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, background: hSt.bg, color: hSt.color, border: `1px solid ${hSt.border}`, fontSize: 11, fontWeight: 800, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}>
                              {h.status || '—'}
                            </span>
                          </td>
                          {/* Delete */}
                          <td style={{ padding: '10px 13px', borderBottom: '1px solid #f0f0f8', textAlign: 'right' }}>
                            <button onClick={() => handleDelete(h.hoardingID, h.hoardingCode)} title="Remove hoarding from this contract"
                              style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selectedHoardings.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0 14px', color: '#b0b0c8' }}>
                <Building2 size={28} color="#d0d0e8" style={{ marginBottom: 8 }} />
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700, color: '#9090a8' }}>No hoardings mapped yet</div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#c0c0d8', marginTop: 3 }}>Click the button below to link hoardings</div>
              </div>
            )}

            <button className="lc-upload-btn"
              onClick={() => { setPickOpen(true); }}
              disabled={availableHoardings.length === 0}>
              {availableHoardings.length === 0
                ? <><Check size={14} /> All available hoardings already mapped</>
                : <><Plus size={14} /> Add Hoardings to Contract</>
              }
            </button>

            {selectedHoardings.length > 0 && (
              <div style={{ marginTop: 8, fontFamily: 'Nunito, sans-serif', fontSize: 11.5, color: '#9090a8', fontWeight: 600 }}>
                {selectedHoardings.length} hoarding{selectedHoardings.length !== 1 ? 's' : ''} mapped · Remove any entry using the delete button
              </div>
            )}
          </>
        )}
      </div>

      {pickOpen && (
        <HoardingLookupModal
          hoardings={availableHoardings}
          sites={sites}
          ownerID={ownerID}
          alreadyMappedIds={mappedHoardingIds}
          onSelectMultiple={handleAddMultiple}
          onClose={() => setPickOpen(false)}
        />
      )}

      {mapToDelete && (
        <HoardingMappingDeleteConfirmModal
          hoardingCode={mapToDelete.code}
          onConfirm={() => {
            executeDelete(mapToDelete.id);
            setMapToDelete(null);
          }}
          onClose={() => setMapToDelete(null)}
        />
      )}
    </div>
  );
}

function HoardingMappingDeleteConfirmModal({ hoardingCode, onConfirm, onClose }) {
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (cancelBtnRef.current) cancelBtnRef.current.focus();
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 22, width: '100%', maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', padding: '24px 24px 20px',
          animation: 'modalIn 0.24s cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: '#fffbeb', border: '2px solid #fde68a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={20} color="#d97706" />
          </div>
          <div>
            <h3 style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 18, color: '#1a1a2e', margin: 0 }}>
              Unlink Hoarding?
            </h3>
            <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 600, color: '#7878a0', margin: '4px 0 0' }}>
              Confirm removing this link.
            </p>
          </div>
        </div>

        <div style={{
          fontFamily: 'Nunito,sans-serif', fontSize: 14, fontWeight: 600,
          color: '#4a5568', lineHeight: 1.5, marginBottom: 24,
        }}>
          Are you sure you want to unlink hoarding <strong>{hoardingCode}</strong> from this contract?
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
        }}>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px', borderRadius: 10, border: '1.5px solid #fca5a5',
              background: '#fff', color: '#dc2626', cursor: 'pointer',
              fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 800,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.background = '#fef2f2'; }}
            onMouseLeave={e => { e.target.style.background = '#fff'; }}
          >
            Yes, Unlink
          </button>

          <button
            ref={cancelBtnRef}
            onClick={onClose}
            style={{
              padding: '11px 24px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#049edf,#6c63ff)',
              color: '#fff', cursor: 'pointer',
              fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 800,
              boxShadow: '0 4px 12px rgba(108,99,255,0.2)',
            }}
          >
            No, Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────── */
function DeleteConfirmModal({ contract, onConfirm, onCancel }) {
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (cancelBtnRef.current) cancelBtnRef.current.focus();
    const handleKeyDown = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 22, width: '100%', maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', padding: '24px 24px 20px',
          animation: 'modalIn 0.24s cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: '#fef2f2', border: '2px solid #fee2e2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trash2 size={20} color="#dc2626" />
          </div>
          <div>
            <h3 style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 18, color: '#1a1a2e', margin: 0 }}>
              Delete Contract?
            </h3>
            <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 600, color: '#7878a0', margin: '4px 0 0' }}>
              This action cannot be undone.
            </p>
          </div>
        </div>

        <div style={{
          fontFamily: 'Nunito,sans-serif', fontSize: 14, fontWeight: 600,
          color: '#4a5568', lineHeight: 1.5, marginBottom: 24,
        }}>
          Are you sure you want to permanently delete contract <strong>#{contract.landContractID}</strong>?
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
        }}>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px', borderRadius: 10, border: '1.5px solid #fca5a5',
              background: '#fff', color: '#dc2626', cursor: 'pointer',
              fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 800,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.background = '#fef2f2'; }}
            onMouseLeave={e => { e.target.style.background = '#fff'; }}
          >
            Yes, Delete
          </button>

          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            style={{
              padding: '11px 24px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#049edf,#6c63ff)',
              color: '#fff', cursor: 'pointer',
              fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 800,
              boxShadow: '0 4px 12px rgba(108,99,255,0.2)',
            }}
          >
            No, Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
/* ─────────────────────────────────────────
   INACTIVATE CONFIRM MODAL
───────────────────────────────────────── */
function InactivateContractModal({ onConfirm, onCancel }) {
  return (
    <div className="pg-overlay" onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 420,
        margin: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        overflow: 'hidden', animation: 'modalIn 0.22s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {/* Orange header */}
        <div style={{
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          padding: '20px 24px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AlertCircle size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 17, color: '#fff' }}>
              Inactivate This Contract?
            </div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
              This will affect all linked hoardings
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px 8px' }}>
          <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13.5, color: '#374151', fontWeight: 600, lineHeight: 1.65, margin: 0 }}>
            If you set this contract to <strong style={{ color: '#dc2626' }}>Inactive</strong>, all hoardings currently linked
            to this contract will also be <strong style={{ color: '#ea580c' }}>automatically set to Inactive</strong>.
          </p>
          <div style={{
            marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '11px 14px', background: '#fffbeb',
            border: '1.5px solid #fde68a', borderRadius: 10,
          }}>
            <AlertCircle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, color: '#92400e', fontWeight: 600, lineHeight: 1.55 }}>
              You can re-activate individual hoardings later from the Hoardings page if needed.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '18px 24px 22px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onCancel} style={{
            padding: '9px 22px', borderRadius: 10, border: '1.5px solid #e5e7eb',
            background: '#f9fafb', cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700, color: '#6b7280',
          }}>
            No, Keep Active
          </button>
          <button onClick={onConfirm} style={{
            padding: '9px 22px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, color: '#fff',
            boxShadow: '0 4px 14px rgba(234,88,12,0.35)',
          }}>
            <Check size={13} /> Yes, Inactivate
          </button>
        </div>
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────
   VIEW MODAL
───────────────────────────────────────── */
function ContractViewModal({ contract, owners, hoardings, paymentFreqs, onClose, onEdit }) {
  if (!contract) return null;
  const owner = owners.find(o => o.ownerID === contract.ownerID);
  const hoarding = hoardings.find(h => h.hoardingID === contract.hoardingID);
  const st = statusStyle(contract.status);

  return (
    <div className="pg-overlay" onClick={onClose}>
      <div className="pg-modal lc-view-modal" onClick={e => e.stopPropagation()}>
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
          {hoarding && <div className="lc-view-banner__site"><Building2 size={12} /><span>{hoardingLabel(hoarding)}</span></div>}
        </div>

        <div className="pg-view__body">
          <div className="row g-3 mt-0">
            {hoarding && (
              <div className="col-12">
                <div className="pg-info-row">
                  <div className="pg-info-row__icon pg-info-row__icon--highlight"><Building2 size={14} color="#6c63ff" /></div>
                  <div className="pg-info-row__content">
                    <div className="pg-info-row__label">Hoarding</div>
                    <div className="pg-info-row__value" style={{ color: '#6c63ff', fontWeight: 700 }}>
                      {hoarding.hoardingCode}
                      {hoarding.width && hoarding.height && <span style={{ color: '#9090a8', fontWeight: 500, marginLeft: 8 }}>{hoarding.width}x{hoarding.height} ft</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#9090a8', marginTop: 2 }}>
                      {[hoarding.material, hoarding.status, hoarding.monthlyRent ? `Monthly Rent: Rs.${fmtNumber(hoarding.monthlyRent)}` : null].filter(Boolean).join(' - ')}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {[
              { label: 'Start Date', value: fmtDate(contract.startDate), Icon: Calendar },
              { label: 'End Date', value: fmtDate(contract.endDate), Icon: Calendar },
              { label: 'Total Value', value: fmtCurrency(contract.totalContractValue), Icon: IndianRupee },
              { label: 'Pay Freq', value: freqLabel(contract.paymentFreqID, paymentFreqs), Icon: CreditCard },
              { label: 'Amt/Freq', value: fmtCurrency(contract.amountPerFreq), Icon: TrendingUp },
              { label: 'Advance Paid', value: fmtCurrency(contract.advancePaid), Icon: IndianRupee },
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
            <div className="col-12">
              <div className="pg-info-row">
                <div className="pg-info-row__icon pg-info-row__icon--highlight"><ShieldCheck size={14} color="#049edf" /></div>
                <div className="pg-info-row__content">
                  <div className="pg-info-row__label">Status</div>
                  <div className="pg-info-row__value">
                    <span className="lc-status-badge" style={{ background: st.bg, color: st.color, borderColor: st.border }}>{contract.status}</span>
                  </div>
                </div>
              </div>
            </div>
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
            {contract.lastUpdatedBy && (
              <div className="col-12">
                <div className="pg-info-row">
                  <div className="pg-info-row__icon"><User size={14} color="#9090a8" /></div>
                  <div className="pg-info-row__content">
                    <div className="pg-info-row__label">Last Updated By</div>
                    <div className="pg-info-row__value">
                      {contract.lastUpdatedBy}
                      {contract.lastUpdateDttm && (
                        <span style={{ color: '#9090a8', fontWeight: 600, fontSize: 12 }}>
                          {' - '}{fmtDate(contract.lastUpdateDttm?.split?.('T')?.[0] ?? '')}
                        </span>
                      )}
                    </div>
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

/* ═══════════════════════════════════════════
   CONTRACT FORM
═══════════════════════════════════════════ */
function ContractForm({ mode, contract, owners, hoardings, sites, paymentFreqs, onBack, onSave }) {
  const isAdd = mode === 'add';

  const [form, setForm] = useState(() =>
    isAdd ? { ...EMPTY_FORM } : {
      ownerID: contract?.ownerID ?? '',
      startDate: contract?.startDate ?? '',
      endDate: contract?.endDate ?? '',
      totalContractValue: contract?.totalContractValue ?? '',
      paymentFreqID: contract?.paymentFreqID ?? '',
      amountPerFreq: contract?.amountPerFreq ?? '',
      advancePaid: contract?.advancePaid ?? '',
      status: contract?.status ?? 'Active',
      comments: contract?.comments ?? '',
    }
  );

  /* selectedHoardings: array of hoarding objects chosen in the multi-select modal (ADD mode) */
  const [selectedHoardings, setSelectedHoardings] = useState([]);
  const [hoardingModalOpen, setHoardingModalOpen] = useState(false);

  const [errors, setErrors] = useState({});
  const [inactivateConfirmPending, setInactivateConfirmPending] = useState(false); // ADD THIS
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [formStep, setFormStep] = useState('details');
  const [savedContract, setSavedContract] = useState(null);

  // Staged states for EDIT mode
  const [stagedAttachments, setStagedAttachments] = useState([]);
  const [stagedDeletedAttachIds, setStagedDeletedAttachIds] = useState([]);
  const [stagedNewAttachments, setStagedNewAttachments] = useState([]);

  const [stagedHoardingMaps, setStagedHoardingMaps] = useState([]);
  const [stagedDeletedMapIds, setStagedDeletedMapIds] = useState([]);
  const [stagedNewHoardingIds, setStagedNewHoardingIds] = useState([]);

  const [loadingStagedData, setLoadingStagedData] = useState(false);

  useEffect(() => {
    if (isAdd || !contract?.landContractID) return;
    
    let active = true;
    const loadStagedData = async () => {
      setLoadingStagedData(true);
      try {
        // Load Maps
        const mapsRaw = await apiService.getLandContractHoardingMaps(contract.landContractID);
        const mapList = Array.isArray(mapsRaw) ? mapsRaw : Array.isArray(mapsRaw?.data) ? mapsRaw.data : [];
        const loadedMappedHoardings = mapList.map(m => {
          const hoardingID = m.hoardingID ?? m.HoardingID;
          const h = hoardings.find(x => Number(x.hoardingID) === Number(hoardingID));
          return h ? { ...h, _mapId: m.landContrHrdngMapID ?? m.LandContrHrdngMapID } : { hoardingID, hoardingCode: `ID: ${hoardingID}`, _mapId: m.landContrHrdngMapID ?? m.LandContrHrdngMapID };
        });
        
        // Load Attachments
        const attachRaw = await apiService.getLandContractAttachments(contract.landContractID);
        const attachList = Array.isArray(attachRaw) ? attachRaw : Array.isArray(attachRaw?.data) ? attachRaw.data : [];
        const loadedAttachments = attachList.map(item => {
          const norm = normalizeAttachment(item);
          const saved = getAttachName(norm.landContractAttachID);
          if (saved) norm.contractFilename = saved;
          return norm;
        });

        if (active) {
          setStagedHoardingMaps(loadedMappedHoardings);
          setStagedAttachments(loadedAttachments);
        }
      } catch (err) {
        console.error('Failed to load staged mappings & attachments:', err);
      } finally {
        if (active) setLoadingStagedData(false);
      }
    };
    
    loadStagedData();
    return () => { active = false; };
  }, [isAdd, contract, hoardings]);

  const handleAddHoardings = (pickedHoardings) => {
    pickedHoardings.forEach(h => {
      if (!stagedHoardingMaps.some(x => Number(x.hoardingID) === Number(h.hoardingID))) {
        setStagedHoardingMaps(prev => [...prev, h]);
        setStagedNewHoardingIds(prev => [...prev, h.hoardingID]);
      }
    });
  };

  const handleRemoveHoarding = (hoardingID) => {
    const matched = stagedHoardingMaps.find(x => Number(x.hoardingID) === Number(hoardingID));
    if (matched && matched._mapId) {
      setStagedDeletedMapIds(prev => [...prev, matched._mapId]);
    }
    setStagedNewHoardingIds(prev => prev.filter(id => Number(id) !== Number(hoardingID)));
    setStagedHoardingMaps(prev => prev.filter(x => Number(x.hoardingID) !== Number(hoardingID)));
  };

  const handleAddAttachment = (file) => {
    const tempId = 'temp_' + Math.random().toString(36).substr(2, 9);
    const newAttach = {
      tempId,
      contractFilename: file.name,
      _file: file,
    };
    setStagedAttachments(prev => [...prev, newAttach]);
    setStagedNewAttachments(prev => [...prev, newAttach]);
  };

  const handleReplaceAttachment = (target, file) => {
    if (target.landContractAttachID) {
      setStagedDeletedAttachIds(prev => [...prev, target.landContractAttachID]);
    } else {
      setStagedNewAttachments(prev => prev.filter(x => x.tempId !== target.tempId));
    }
    const tempId = 'temp_' + Math.random().toString(36).substr(2, 9);
    const newAttach = {
      tempId,
      contractFilename: file.name,
      _file: file,
    };
    setStagedAttachments(prev => prev.map(x => (x.landContractAttachID === target.landContractAttachID && target.landContractAttachID) || (x.tempId === target.tempId) ? newAttach : x));
    setStagedNewAttachments(prev => [...prev, newAttach]);
  };

  const handleDeleteAttachment = (target) => {
    if (target.landContractAttachID) {
      setStagedDeletedAttachIds(prev => [...prev, target.landContractAttachID]);
    } else {
      setStagedNewAttachments(prev => prev.filter(x => x.tempId !== target.tempId));
    }
    setStagedAttachments(prev => prev.filter(x => (target.landContractAttachID ? x.landContractAttachID !== target.landContractAttachID : x.tempId !== target.tempId)));
  };

  const freqOptions = paymentFreqs.length ? paymentFreqs : PAYMENT_FREQ_FALLBACK;

  const set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
  };

  const handleSave = async () => {
    const errs = validateForm(form, isAdd);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true); setApiErr('');
    try {
      const payload = {
        landContractID: isAdd ? 0 : contract.landContractID,
        ownerID: Number(form.ownerID),
        startDate: form.startDate,
        endDate: form.endDate,
        totalContractValue: Number(form.totalContractValue),
        paymentFreqID: Number(form.paymentFreqID),
        amountPerFreq: Number(form.amountPerFreq),
        advancePaid: form.advancePaid !== '' && form.advancePaid != null ? Number(form.advancePaid) : 0,
        status: form.status,
        comments: form.comments || '',
      };

      let saved;
      if (isAdd) {
        const res = await apiService.createLandContract(payload);
        saved = normalizeContract(res?.data ?? res ?? payload);

        /* Auto-create hoarding maps for all selected hoardings */
        if (selectedHoardings.length && saved.landContractID) {
          await Promise.allSettled(
            selectedHoardings.map(h =>
              apiService.createLandContractHoardingMap({
                landContractID: saved.landContractID,
                ownerID: Number(form.ownerID),
                hoardingID: Number(h.hoardingID),
              })
            )
          );
          /* Patch first hoardingID onto local record for any label lookups */
          if (selectedHoardings[0]) {
            saved = { ...saved, hoardingID: Number(selectedHoardings[0].hoardingID) };
          }
        }
      } else {
        const res = await apiService.updateLandContract(payload);
        saved = normalizeContract(res?.data ?? res ?? { ...payload, landContractID: contract.landContractID });

        // 1. Delete staged deleted maps
        if (stagedDeletedMapIds.length > 0) {
          for (const mapId of stagedDeletedMapIds) {
            await apiService.deleteLandContractHoardingMap(mapId);
          }
        }

        // 2. Create staged new maps
        if (stagedNewHoardingIds.length > 0) {
          for (const hId of stagedNewHoardingIds) {
            await apiService.createLandContractHoardingMap({
              landContractID: contract.landContractID,
              ownerID: Number(form.ownerID),
              hoardingID: Number(hId),
            });
          }
        }

        // 3. Delete staged deleted attachments
        if (stagedDeletedAttachIds.length > 0) {
          for (const attachId of stagedDeletedAttachIds) {
            await apiService.deleteLandContractAttach(attachId);
            deleteAttachName(attachId);
          }
        }

        // 4. Upload staged new attachments
        if (stagedNewAttachments.length > 0) {
          const firstHId = (stagedHoardingMaps[0]?.hoardingID) || contract.hoardingID || 0;
          for (const np of stagedNewAttachments) {
            const resAttach = await apiService.uploadLandContractAttach(contract.landContractID, Number(form.ownerID), firstHId, np._file);
            const savedAtt = normalizeAttachment(resAttach?.data ?? resAttach);
            if (savedAtt?.landContractAttachID) {
              saveAttachName(savedAtt.landContractAttachID, np.contractFilename);
            }
          }
        }

        // If status changed to InActive, inactivate all mapped hoardings
        if (payload.status === 'InActive') {
          try {
            // 1. Get all hoarding maps for this contract
            const maps = await apiService.getLandContractHoardingMaps(contract.landContractID);
            const mapList = Array.isArray(maps) ? maps : Array.isArray(maps?.data) ? maps.data : [];

            // 2. For each mapped hoarding, add a NEW effective-date row (today, Inactive)
            await Promise.allSettled(
              mapList.map(async (m) => {
                const hoardingID = m.hoardingID ?? m.HoardingID;
                const hoardingData = hoardings.find(h => Number(h.hoardingID) === Number(hoardingID));
                if (!hoardingData) return;
                await apiService.addHoardingEffdt(hoardingData.hoardingCode, {
                  effdt: new Date().toISOString().split('T')[0], // today's date
                  material: hoardingData.material,
                  hoardingType: hoardingData.hoardingType,
                  status: 'Inactive',
                  monthlyRent: hoardingData.monthlyRent,
                  width: hoardingData.width,
                  height: hoardingData.height,
                  siteID: hoardingData.siteID,
                });
              })
            );
          } catch (err) {
            console.error('Failed to inactivate linked hoardings:', err);
          }
        }
      }

      setSaveOk(true);
      onSave(saved, isAdd);
      await new Promise(r => setTimeout(r, 700));

      if (isAdd) {
        setSavedContract(saved);
        setFormStep('attachments');
        setSaveOk(false);
      } else {
        onBack();
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Save failed.';
      setApiErr(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setSaving(false); }
  };

  /* ─── Hoarding status badge helper ─── */
  const hSt = (status) => {
    switch (status) {
      case 'Active': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'Inactive': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'Under Maintenance': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
      default: return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
    }
  };

  /* ═══════════════════════════════
     STEP 2: Attachments + Hoarding Map
  ═══════════════════════════════ */
  if (formStep === 'attachments' && savedContract) {
    return (
      <div className="hd-form-page">
        <div className="hd-topbar">
          <div className="hd-topbar-left">
            <div>
              <div className="hd-topbar-title">Contract Saved — Upload Documents &amp; Manage Hoardings</div>
              <div className="hd-topbar-sub">
                Contract <strong>#{savedContract.landContractID}</strong> created successfully. Attach documents and add more hoardings (all optional).
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 20, flexShrink: 0 }}>
            <Check size={13} color="#16a34a" />
            <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800, color: '#16a34a' }}>Contract #{savedContract.landContractID} Saved</span>
          </div>
        </div>

        <div className="hd-form-body">
          <div className="container-fluid px-0">
            {/* Summary card */}
            <div className="hd-section-card" style={{ marginBottom: 0 }}>
              <div className="hd-section-head">
                <div className="hd-section-icon-wrap"><FileText size={14} color="#16a34a" /></div>
                <div>
                  <div className="hd-section-title" style={{ color: '#16a34a' }}>Contract Summary</div>
                  <div className="hd-section-sub">Your contract has been recorded</div>
                </div>
              </div>
              <div className="hd-section-body">
                <div className="row g-2">
                  {[
                    { label: 'Contract ID', value: `#${savedContract.landContractID}` },
                    { label: 'Period', value: `${fmtDate(savedContract.startDate)} → ${fmtDate(savedContract.endDate)}` },
                    { label: 'Total Value', value: fmtCurrency(savedContract.totalContractValue) },
                    { label: 'Status', value: savedContract.status },
                  ].map(f => (
                    <div key={f.label} className="col-6 col-md-3">
                      <div style={{ background: '#f8f8fd', border: '1.5px solid #e8e8f4', borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{f.label}</div>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#1a1a2e', fontWeight: 800 }}>{f.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ height: 16 }} />

            <ContractHoardingMapSection
              contractId={savedContract.landContractID}
              ownerID={savedContract.ownerID}
              hoardings={hoardings}
              sites={sites}
            />

            <div style={{ height: 16 }} />

            <ContractAttachmentsSection
              contractId={savedContract.landContractID}
              ownerID={savedContract.ownerID}
              hoardingID={savedContract.hoardingID}
            />
          </div>
        </div>

        <div className="hd-form-footer hd-form-footer--sticky">
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600 }}>
            Changes are saved automatically — click Done when finished
          </div>
          <button className="pg-btn-save" onClick={onBack}>
            <Check size={13} /> Done
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════
     STEP 1 / EDIT: Details form
  ═══════════════════════════════ */
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
            <div className="hd-topbar-title">{isAdd ? 'Add New Land Contract' : `Edit Contract #${contract?.landContractID}`}</div>
            <div className="hd-topbar-sub">{isAdd ? 'Fill in the details — documents & hoardings can be managed after saving' : 'Update contract details and manage hoardings & documents below'}</div>
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

            {/* ── Owner & Hoardings (ADD mode) ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><Building2 size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Owner {isAdd ? '& Hoardings' : ''}</div>
                    <div className="hd-section-sub">
                      {isAdd
                        ? 'Select an owner, then choose one or more hoardings'
                        : 'Owner is locked for existing contracts — manage hoardings in the section below'}
                    </div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    {/* Owner */}
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Owner" required />
                      <OwnerSearchWidget
                        owners={owners} value={form.ownerID}
                        onChange={val => { set('ownerID', val); setSelectedHoardings([]); }}
                        error={errors.ownerID} disabled={!isAdd}
                      />
                      <FieldError msg={errors.ownerID} />
                    </div>

                    {/* Multi-hoarding picker — ADD mode only */}
                    {isAdd && (
                      <div className="col-12 col-md-6">
                        <FieldLabel label="Hoardings" optional />

                        {/* Trigger button */}
                        <button
                          type="button"
                          disabled={!form.ownerID}
                          onClick={() => form.ownerID && setHoardingModalOpen(true)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', borderRadius: 10,
                            border: `1.5px solid ${!form.ownerID ? '#e8e8f4' : '#e8e8f4'}`,
                            background: !form.ownerID ? '#f8f8fd' : '#fff',
                            cursor: !form.ownerID ? 'not-allowed' : 'pointer',
                            fontFamily: 'Nunito, sans-serif', fontSize: 13,
                            color: !form.ownerID ? '#b0b0c8' : '#1a1a2e', fontWeight: 600,
                            transition: 'border-color 0.15s',
                          }}
                          onMouseEnter={e => { if (form.ownerID) e.currentTarget.style.borderColor = '#049edf'; }}
                          onMouseLeave={e => { if (form.ownerID) e.currentTarget.style.borderColor = '#e8e8f4'; }}
                        >
                          <Building2 size={14} color={!form.ownerID ? '#d0d0e0' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                          <span style={{ flex: 1, textAlign: 'left' }}>
                            {!form.ownerID
                              ? 'Select an owner first…'
                              : selectedHoardings.length > 0
                                ? `${selectedHoardings.length} hoarding${selectedHoardings.length !== 1 ? 's' : ''} selected`
                                : 'Browse & select hoardings…'}
                          </span>
                          {selectedHoardings.length > 0
                            ? <RefreshCw size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
                            : <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
                        </button>

                        {/* Selected hoardings — compact table: Code, Material, Size, Status */}
                        {selectedHoardings.length > 0 && (
                          <div style={{ marginTop: 10, border: '1.5px solid #e8e8f4', borderRadius: 12, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#f8f8fd' }}>
                                  {['Code', 'Material', 'Size', 'Status', ''].map((h, i) => (
                                    <th key={i} style={{ padding: '8px 11px', textAlign: 'left', fontSize: 10.5, fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#9090a8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1.5px solid #e8e8f4' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {selectedHoardings.map((h, idx) => {
                                  const st = hSt(h.status);
                                  return (
                                    <tr key={h.hoardingID} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafe' }}>
                                      <td style={{ padding: '9px 11px', borderBottom: '1px solid #f0f0f8' }}>
                                        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 12.5, color: '#6c63ff' }}>{h.hoardingCode}</div>
                                      </td>
                                      <td style={{ padding: '9px 11px', borderBottom: '1px solid #f0f0f8' }}>
                                        <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: '#4a5568' }}>{h.material || '—'}</span>
                                      </td>
                                      <td style={{ padding: '9px 11px', borderBottom: '1px solid #f0f0f8', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: '#4a5568' }}>
                                          {h.width && h.height ? `${h.width}×${h.height} ft` : '—'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '9px 11px', borderBottom: '1px solid #f0f0f8' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: 10.5, fontWeight: 800, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}>
                                          {h.status || '—'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '9px 11px', borderBottom: '1px solid #f0f0f8', textAlign: 'right' }}>
                                        <button
                                          onClick={() => setSelectedHoardings(prev => prev.filter(x => x.hoardingID !== h.hoardingID))}
                                          title="Remove"
                                          style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}
                                        >
                                          <X size={11} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {!form.ownerID && (
                          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: '#f0f8ff', border: '1px solid #bae6fd', borderRadius: 8, fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600, color: '#0369a1' }}>
                            <Building2 size={12} color="#0369a1" style={{ flexShrink: 0 }} />
                            Select an owner above to browse hoardings
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Contract Duration ── */}
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
                        <input className="pg-field-input" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                      </InputWrap>
                      <FieldError msg={errors.startDate} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="End Date" required />
                      <InputWrap error={errors.endDate} icon={Calendar}>
                        <input className="pg-field-input" type="date" value={form.endDate} min={form.startDate || undefined} onChange={e => set('endDate', e.target.value)} />
                      </InputWrap>
                      <FieldError msg={errors.endDate} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Status" required />
                      <ComboDropdown
                        value={form.status}
                        onChange={val => {
                          if (val === 'InActive' && form.status !== 'InActive') {
                            setInactivateConfirmPending(true);
                          } else {
                            set('status', val);
                          }
                        }}
                        onBlur={() => { }}
                        hasError={!!errors.status} placeholder="Select status…" icon={ShieldCheck}
                        options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
                      />
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
                    <div className="hd-section-sub">Contract value, payment schedule and advance</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Total Contract Value (Rs.)" required />
                      <InputWrap error={errors.totalContractValue} icon={IndianRupee}>
                        <CurrencyInput value={form.totalContractValue} onChange={val => set('totalContractValue', val)} placeholder="e.g. 5,00,000" />
                      </InputWrap>
                      <FieldError msg={errors.totalContractValue} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Payment Frequency" required />
                      <ComboDropdown
                        value={form.paymentFreqID} onChange={val => set('paymentFreqID', val)} onBlur={() => { }}
                        hasError={!!errors.paymentFreqID} placeholder={paymentFreqs.length ? 'Select frequency…' : 'Loading…'}
                        icon={CreditCard} options={freqOptions}
                      />
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
                      <InputWrap error={errors.advancePaid} icon={IndianRupee}>
                        <CurrencyInput value={form.advancePaid} onChange={val => set('advancePaid', val)} placeholder="e.g. 50,000" />
                      </InputWrap>
                      <FieldError msg={errors.advancePaid} />
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
                  <InputWrap error={errors.comments} icon={MessageSquare}>
                    <textarea
                      className="pg-field-input lc-textarea" rows={3}
                      placeholder="Any notes or remarks about this contract..."
                      value={form.comments}
                      onChange={e => set('comments', e.target.value)}
                    />
                  </InputWrap>
                </div>
              </div>
            </div>

            {/* ── Hoarding map (EDIT mode) ── */}
            {!isAdd && contract?.landContractID && (
              <div className="col-12">
                <ContractHoardingMapSection
                  contractId={contract.landContractID}
                  ownerID={contract.ownerID}
                  hoardings={hoardings}
                  sites={sites}
                  selectedHoardings={stagedHoardingMaps}
                  onAddHoardings={handleAddHoardings}
                  onRemoveHoarding={handleRemoveHoarding}
                  loading={loadingStagedData}
                />
              </div>
            )}

            {/* ── Documents (EDIT mode) ── */}
            {!isAdd && contract?.landContractID && (
              <div className="col-12">
                <ContractAttachmentsSection
                  contractId={contract.landContractID}
                  ownerID={contract.ownerID}
                  hoardingID={contract.hoardingID}
                  attachments={stagedAttachments}
                  onAddAttachment={handleAddAttachment}
                  onReplaceAttachment={handleReplaceAttachment}
                  onDeleteAttachment={handleDeleteAttachment}
                  loading={loadingStagedData}
                />
              </div>
            )}

            {/* Info hint for ADD mode */}
            {isAdd && (
              <div className="col-12">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', background: '#f0f8ff', border: '1.5px solid #bae6fd', borderRadius: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(4,158,223,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Paperclip size={16} color="#0369a1" />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, color: '#0c4a6e', marginBottom: 3 }}>Documents &amp; Additional Hoardings After Saving</div>
                    <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600, color: '#0369a1', lineHeight: 1.6 }}>
                      After saving, you'll be taken to a screen where you can attach documents (PDF, Word, JPG, PNG) and link more hoardings. Selected hoardings above will be auto-linked. Click Done to skip optional steps.
                    </div>
                  </div>
                </div>
              </div>
            )}

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
              : <><Check size={13} /> {isAdd ? 'Save Contract' : 'Update Contract'}</>}
        </button>
      </div>

      {/* Multi-hoarding selection modal */}
      {hoardingModalOpen && (
        <HoardingLookupModal
          hoardings={hoardings}
          sites={sites} DeleteConfirmModal
          ownerID={form.ownerID}
          alreadyMappedIds={new Set(selectedHoardings.map(h => Number(h.hoardingID)))}
          onSelectMultiple={(picked) => {
            setSelectedHoardings(prev => {
              const existingIds = new Set(prev.map(h => h.hoardingID));
              return [...prev, ...picked.filter(h => !existingIds.has(h.hoardingID))];
            });
          }}
          onClose={() => setHoardingModalOpen(false)}
        />
      )}
      {inactivateConfirmPending && (
        <InactivateContractModal
          onCancel={() => setInactivateConfirmPending(false)}
          onConfirm={() => { set('status', 'InActive'); setInactivateConfirmPending(false); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function LandContractPage() {
  const [owners, setOwners] = useState([]);
  const [hoardings, setHoardings] = useState([]);
  const [sites, setSites] = useState([]);
  const [paymentFreqs, setPaymentFreqs] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [contracts, setContracts] = useState([]);

  const [view, setView] = useState('grid');
  const [formMode, setFormMode] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
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
  useResizableColumns(tableRef, tableReady, [60, 160, 110, 110, 130, 100, 90]);

  const fetchMeta = useCallback(async () => {
    setLoadingMeta(true); setLoadError('');
    try {
      const [rawOwners, rawHoardings, rawSites, rawContracts, rawFreqs] = await Promise.all([
        apiService.getAllOwners(),
        apiService.getAllHoardings(),
        apiService.getAllSites(),
        apiService.getAllLandContracts(),
        apiService.getAllPaymentFreqs(),
      ]);

      setOwners(Array.isArray(rawOwners) ? rawOwners : Array.isArray(rawOwners?.data) ? rawOwners.data : []);
      setHoardings(
        Array.isArray(rawHoardings) ? deduplicateHoardings(rawHoardings)
          : Array.isArray(rawHoardings?.data) ? deduplicateHoardings(rawHoardings.data) : []
      );
      setSites(Array.isArray(rawSites) ? rawSites : Array.isArray(rawSites?.data) ? rawSites.data : []);

      const freqList = Array.isArray(rawFreqs) ? rawFreqs : Array.isArray(rawFreqs?.data) ? rawFreqs.data : [];
      setPaymentFreqs(freqList.map(f => ({
        value: f.paymentFreqID ?? f.PaymentFreqID ?? f.id,
        label: f.freqName ?? f.FreqName ?? f.name ?? f.label ?? String(f.paymentFreqID),
      })));

      const list = Array.isArray(rawContracts) ? rawContracts : Array.isArray(rawContracts?.data) ? rawContracts.data : [];
      setContracts(list.map(normalizeContract));
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Failed to load data.');
    } finally { setLoadingMeta(false); }
  }, []);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  // useEffect(() => {
  //   sessionStorage.setItem('lc_view', view);
  //   sessionStorage.setItem('lc_formMode', formMode || '');
  //   try { sessionStorage.setItem('lc_editTarget', editTarget ? JSON.stringify(editTarget) : ''); } catch { /**/ }
  // }, [view, formMode, editTarget]);

  const handleSave = (record, isNew) => {
    if (isNew) setContracts(prev => [record, ...prev]);
    else setContracts(prev => prev.map(c => c.landContractID === record.landContractID ? record : c));
  };

  const handleDelete = async (id) => {
    try {
      await apiService.deleteLandContract(id);
      setContracts(prev => prev.filter(c => c.landContractID !== id));
    } catch (err) { console.error('Delete failed:', err); }
    finally { setDeleteTarget(null); }
  };

  const freqOptions = paymentFreqs.length ? paymentFreqs : PAYMENT_FREQ_FALLBACK;

  const tableRows = contracts.map(c => {
    const owner = owners.find(o => o.ownerID === c.ownerID);
    return {
      landContractID: c.landContractID,
      ownerName: owner?.ownerName || `Owner ID ${c.ownerID}`,
      startDate: c.startDate || '',
      endDate: c.endDate || '',
      totalContractValue: c.totalContractValue ?? 0,
      paymentFreqID: c.paymentFreqID,
      status: c.status || '',
      _raw: c,
    };
  });

  const filtered = tableRows.filter(r => {
    const q = search.toLowerCase();
    const matchQ =
      r.ownerName.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      String(r.landContractID).includes(q);
    return matchQ && (!statusFilter || r.status === statusFilter);
  });

  const sortedRows = [...filtered].sort((a, b) => {
    if (sortKey === 'totalContractValue')
      return sortDir === 'asc' ? a.totalContractValue - b.totalContractValue : b.totalContractValue - a.totalContractValue;
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

  const totalValue = contracts.reduce((s, c) => s + (Number(c.totalContractValue) || 0), 0);
  const activeCount = contracts.filter(c => c.status === 'Active').length;
  const expiredCount = contracts.filter(c => c.status === 'Expired' || c.status === 'Terminated').length;

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => { if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('...'); acc.push(p); return acc; }, []);

  /* Table columns — Hoarding column removed */
  const COLS = [
    { key: 'landContractID', label: '#ID' },
    { key: 'ownerName', label: 'Owner' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date', tabletHide: true },
    { key: 'totalContractValue', label: 'Total Value' },
    { key: 'status', label: 'Status' },
    { key: '_action', label: 'Actions', noSort: true },
  ];

  if (view === 'form') {
    return (
      <ContractForm
        mode={formMode} contract={editTarget}
        owners={owners} hoardings={hoardings} sites={sites} paymentFreqs={freqOptions}
        onBack={() => {
          setView('grid'); setEditTarget(null);
        }}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="pg-page">
      <div className="pg-header">
        <div>
          <h1 className="pg-header__title">Land Contracts</h1>
          <p className="pg-header__subtitle">
            Manage all land contracts between owners and hoardings
            {contracts.length > 0 && <> — Total: <strong>{fmtCurrency(totalValue)}</strong></>}
          </p>
        </div>
        <button className="pg-btn-add"
          onClick={() => { setFormMode('add'); setEditTarget(null); setView('form'); }}
          disabled={loadingMeta}>
          <Plus size={14} /> Add Contract
        </button>
      </div>

      {/* {!loadingMeta && contracts.length > 0 && (
        <div className="exp-stats-strip">
          {[
            { icon: <FileText size={16} color="#049edf" />, bg: 'rgba(4,158,223,0.1)', label: 'Total Contracts', val: contracts.length },
            { icon: <IndianRupee size={16} color="#16a34a" />, bg: 'rgba(22,163,74,0.1)', label: 'Total Value', val: fmtCurrency(totalValue) },
            { icon: <ShieldCheck size={16} color="#16a34a" />, bg: 'rgba(22,163,74,0.1)', label: 'Active', val: activeCount },
            { icon: <Clock size={16} color="#dc2626" />, bg: 'rgba(220,38,38,0.08)', label: 'Expired/Ended', val: expiredCount },
          ].map(s => (
            <div key={s.label} className="exp-stat-item">
              <div className="exp-stat-item__icon" style={{ background: s.bg }}>{s.icon}</div>
              <div><div className="exp-stat-item__label">{s.label}</div><div className="exp-stat-item__val">{s.val}</div></div>
            </div>
          ))}
        </div>
      )} */}

      {loadError && (
        <div className="pg-field-error hd-api-error mb-3" style={{ margin: '0 0 16px 0' }}>
          <AlertCircle size={14} /><span>{loadError}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }} onClick={fetchMeta}>Retry</button>
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
              <input placeholder="Search owner, status..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
              {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
            </div>
            <select className="hd-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="pg-pg-btn" onClick={fetchMeta} title="Refresh" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
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
                    <tr key={r.landContractID} className="pg-tr">
                      <td className="pg-td"><span className="lc-id-badge">#{r.landContractID}</span></td>
                      <td className="pg-td"><div className="pg-td__primary">{r.ownerName}</div></td>
                      <td className="pg-td"><span className="pg-td__primary">{fmtDate(r.startDate)}</span></td>
                      <td className="pg-td pg-tablet-hide"><span className="pg-td__primary">{fmtDate(r.endDate)}</span></td>
                      <td className="pg-td"><span className="lc-amount-val">{fmtCurrency(r.totalContractValue)}</span></td>
                      <td className="pg-td">
                        <span className="lc-status-badge" style={{ background: st.bg, color: st.color, borderColor: st.border }}>{r.status}</span>
                      </td>
                      <td className="pg-td">
                        <div className="pg-action-wrap">
                          <button className="pg-btn-view" title="Edit"
                            onClick={() => { setFormMode('edit'); setEditTarget(r._raw); setView('form'); }}>
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

        {!loadingMeta && contracts.length > 0 && (
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <FileText size={36} color="#d0d0e8" /><span className="pg-empty__label">No contracts match</span>
              </div>
            ) : paginated.map(r => {
              const st = statusStyle(r.status);
              return (
                <div key={r.landContractID} className="pg-card">
                  <div className="pg-card__header">
                    <div className="pg-card__title-wrap">
                      <div className="pg-card__title"><span className="lc-id-badge">#{r.landContractID}</span>&nbsp; {r.ownerName}</div>
                    </div>
                    <div className="pg-card__actions">
                      <button className="pg-card__btn-edit" onClick={() => setViewTarget(r._raw)} title="View"><Eye size={13} /></button>
                      <button className="pg-card__btn-view" onClick={() => { setFormMode('edit'); setEditTarget(r._raw); setView('form'); }} title="Edit"><Edit2 size={13} /></button>
                      <button className="exp-btn-delete" onClick={() => setDeleteTarget(r._raw)} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="pg-card__body">
                    <div className="pg-card__row"><Calendar size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="pg-card__row-text">{fmtDate(r.startDate)} to {fmtDate(r.endDate)}</span></div>
                    <div className="pg-card__row"><IndianRupee size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="pg-card__row-text" style={{ fontWeight: 800, color: '#1a1a2e' }}>{fmtCurrency(r.totalContractValue)}</span></div>
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

      {viewTarget && (
        <ContractViewModal contract={viewTarget} owners={owners} hoardings={hoardings} paymentFreqs={freqOptions}
          onClose={() => setViewTarget(null)}
          onEdit={() => { setFormMode('edit'); setEditTarget(viewTarget); setView('form'); setViewTarget(null); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal contract={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget.landContractID)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}