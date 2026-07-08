import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import {
  Plus, Search, X, AlertCircle, Check, Edit2,
  RefreshCw, Calendar,
  ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight,
  ChevronLeft, ChevronRight, MapPin, Loader2,
  FileText, ArrowLeft,
  Building2, Tag, MessageSquare, User, IndianRupee, Trash2,
  Paperclip, FileCheck, UploadCloud, Eye, Download,
  Image as ImageIcon,
} from 'lucide-react';
import { apiService, API_ROOT_URL } from '../api/api';
import './Common1.css';
// import './expense-attach.css';
import { useResizableColumns } from '../hooks/useResizableColumns';

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

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];



const EMPTY_ROW = {
  _rowId: '', expenseDate: '', expenseType: '',
  expenseDTL: '', amount: '', paidBy: '', comments: '',
};

/* ─────────────────────────────────────────
   ATTACHMENT HELPERS  (URL from api.js root)
───────────────────────────────────────── */
// In HoardingExpensePage.jsx — replace getAttachUrl:
function getAttachUrl(attach) {
  if (!attach) return null;
  const raw =
    attach.horadingExpenseFilePath ||  // server typo, camelCase
    attach.HoradingExpenseFilePath ||  // server typo, PascalCase (some serializers)
    attach.fileUrl ||
    attach.filePath ||
    attach.horadingExpenseFilePath ||
    attach.attachFilePath ||
    attach.url ||
    attach.path ||
    null;
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `${API_ROOT_URL}/${raw.replace(/^\/+/, '')}`;
}

// Also fix getAttachName:
function getAttachName(attach) {
  return (
    attach?.horadingExpenseFilename ||  // camelCase
    attach?.HoradingExpenseFilename ||  // PascalCase
    attach?.horadingExpenseFilename ||
    attach?.attachFilename ||
    attach?.fileName ||
    attach?.name ||
    'Attachment'
  );
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
function isImageFile(name = '') {
  return IMAGE_EXTS.includes(name.split('.').pop().toLowerCase());
}

function AttachFileIcon({ name, size = 11, color }) {
  return isImageFile(name)
    ? <ImageIcon size={size} color={color || '#15803d'} style={{ flexShrink: 0 }} />
    : <FileCheck size={size} color={color || '#15803d'} style={{ flexShrink: 0 }} />;
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtCurrency(v) {
  if (v === '' || v == null) return '—';
  return '₹' + Number(v).toLocaleString('en-IN');
}
function validateRow(row) {
  const e = {};
  if (!row.expenseDate) e.expenseDate = 'Required';
  if (!row.expenseType) e.expenseType = 'Required';
  if (!row.expenseDTL) e.expenseDTL = 'Required';
  if (row.amount === '' || row.amount == null) e.amount = 'Required';
  if (!row.paidBy) e.paidBy = 'Required';
  return e;
}
function getLatest(h) {
  return [...h.versions].sort((a, b) => new Date(b.effdt) - new Date(a.effdt))[0];
}
function makeRowId() {
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
function toDateInputValue(isoStr) {
  if (!isoStr) return '';
  return isoStr.split('T')[0];
}

/* ═══════════════════════════════════════════════════════
   PORTAL DROPDOWN
═══════════════════════════════════════════════════════ */
function PortalDropdown({ open, triggerRef, panelRef, children }) {
  const [style, setStyle] = useState({ position: 'fixed', top: 0, left: 0, width: 0, zIndex: 99999 });
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const panelH = panelRef.current?.offsetHeight || 260;
      const spaceBelow = window.innerHeight - r.bottom;
      const flipUp = spaceBelow < panelH + 8 && r.top > panelH + 8;
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
    const handler = (e) => {
      const inWrap = wrapRef.current && wrapRef.current.contains(e.target);
      const inPanel = panelRef.current && panelRef.current.contains(e.target);
      if (!inWrap && !inPanel) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, wrapRef, panelRef, onClose]);
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
   FORM FIELD HELPERS
───────────────────────────────────────── */
function FieldLabel({ label, required }) {
  return (
    <label className="pg-field-label">
      {label}{required && <span className="pg-field-label__required"> *</span>}
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
      <AlertCircle size={11} style={{ flexShrink: 0, marginTop: '1px' }} /><span>{msg}</span>
    </div>
  ) : null;
}

/* ═══════════════════════════════════════════
   COMBO DROPDOWN
═══════════════════════════════════════════ */
function ComboDropdown({ value, onChange, onBlur, hasError, placeholder, icon: Icon, options, searchable = false, emptyText = 'No options' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [wasOpened, setWasOpened] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const close = useCallback(() => { setOpen(false); setQuery(''); if (wasOpened) { onBlur?.(); setWasOpened(false); } }, [wasOpened, onBlur]);
  useOutsideClick(wrapRef, panelRef, open, close);

  const selected = options.find(o => String(o.value) === String(value));
  const filtered = searchable ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())) : options;

  const openDD = () => {
    setOpen(true); setWasOpened(true); setQuery('');
    setTimeout(() => {
      if (searchable) { inputRef.current?.focus(); return; }
      const items = listRef.current?.querySelectorAll('.pg-combo-option');
      if (items?.length) { const ai = Array.from(items).findIndex(el => el.classList.contains('pg-combo-option--active')); (ai >= 0 ? items[ai] : items[0])?.focus(); }
    }, 0);
  };
  const select = (opt) => { onChange(opt.value); setOpen(false); setQuery(''); setWasOpened(false); };
  const clear = (e) => { e.stopPropagation(); onChange(''); setOpen(false); setQuery(''); setWasOpened(false); onBlur?.(); };
  const arrowNav = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx = Array.from(items || []).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') close();
  };

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div ref={triggerRef} className={`pg-field-wrap pg-combo-trigger ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        onClick={openDD} tabIndex={0}
        onKeyDown={e => { if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDD(); } } else arrowNav(e); }}>
        {Icon && <Icon size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />}
        <span className={`pg-combo-display${!selected ? ' pg-combo-display--placeholder' : ''}`}>{selected ? selected.label : placeholder}</span>
        {selected ? <X size={13} className="pg-combo-clear" onClick={clear} /> : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position: 'static' }}>
          {searchable && (
            <div className="pg-combo-search">
              <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input ref={inputRef} className="pg-combo-search__input" placeholder="Search…" value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); listRef.current?.querySelectorAll('.pg-combo-option')?.[0]?.focus(); } else if (e.key === 'Escape') close(); }} />
              {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
            </div>
          )}
          <div className="pg-combo-list" ref={listRef}>
            {filtered.length === 0 ? <div className="pg-combo-empty">{emptyText}</div>
              : filtered.map(opt => (
                <div key={opt.value} className={`pg-combo-option${String(opt.value) === String(value) ? ' pg-combo-option--active' : ''}`}
                  onClick={() => select(opt)} tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(opt); } else arrowNav(e); }}>
                  <span className="pg-combo-option__name">{opt.label}</span>
                  {String(opt.value) === String(value) && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                </div>
              ))}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CELL COMBO DROPDOWN
═══════════════════════════════════════════ */
function CellComboDropdown({ value, onChange, options, hasError, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(wrapRef, panelRef, open, close);

  const selected = options.find(o => String(o.value) === String(value));
  const openDD = () => { setOpen(v => !v); setTimeout(() => { const items = listRef.current?.querySelectorAll('.exp-cell-combo-option'); if (items?.length) { const ai = Array.from(items).findIndex(el => el.classList.contains('exp-cell-combo-option--active')); (ai >= 0 ? items[ai] : items[0])?.focus(); } }, 0); };
  const select = (opt) => { onChange(opt.value); setOpen(false); };
  const clear = (e) => { e.stopPropagation(); onChange(''); setOpen(false); };
  const arrowNav = (e) => {
    const items = listRef.current?.querySelectorAll('.exp-cell-combo-option');
    const idx = Array.from(items || []).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') close();
  };

  return (
    <div className="exp-cell-combo-wrap" ref={wrapRef}>
      <div ref={triggerRef} className={`exp-cell-combo-trigger${hasError ? ' exp-cell-combo-trigger--err' : ''}`}
        tabIndex={0} onClick={openDD}
        onKeyDown={e => { if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDD(); } } else arrowNav(e); }}>
        <span className={`exp-cell-combo-display${!selected ? ' exp-cell-combo-display--placeholder' : ''}`}>{selected ? selected.label : placeholder}</span>
        {selected ? <X size={11} className="exp-cell-combo-clear" onClick={clear} /> : <ChevronDown size={11} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="exp-cell-combo-panel" style={{ position: 'static' }}>
          <div className="exp-cell-combo-list" ref={listRef}>
            {options.map(opt => (
              <div key={opt.value} className={`exp-cell-combo-option${String(opt.value) === String(value) ? ' exp-cell-combo-option--active' : ''}`}
                tabIndex={0} onClick={() => select(opt)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(opt); } else arrowNav(e); }}>
                <span>{opt.label}</span>
                {String(opt.value) === String(value) && <Check size={11} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ─────────────────────────────────────────
   HOARDING SEARCH WIDGET
───────────────────────────────────────── */
function HoardingSearchWidget({ hoardings, sites, value, onChange, error, disabled }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const selectedHoarding = hoardings.find(h => h.versions.some(v => v.hoardingID === Number(value)));

  useEffect(() => {
    if (!query.trim()) { setResults([]); setFocusedIdx(-1); return; }
    const q = query.toLowerCase();
    const matched = hoardings.filter(h => {
      const latest = getLatest(h);
      const site = sites.find(s => s.siteID === latest?.siteID);
      if (!site) return false;
      return ['addressLine1', 'addressLine2', 'addressLine3', 'landmark', 'city', 'district']
        .some(k => (site[k] || '').toLowerCase().includes(q)) ||
        (h.hoardingCode || '').toLowerCase().includes(q);
    });
    setResults(matched.slice(0, 12)); setFocusedIdx(-1);
  }, [query, hoardings, sites]);

  useEffect(() => { if (focusedIdx < 0 || !listRef.current) return; listRef.current.querySelectorAll('.exp-hoarding-option')[focusedIdx]?.scrollIntoView({ block: 'nearest' }); }, [focusedIdx]);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setFocusedIdx(-1); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectH = (h) => { onChange(getLatest(h)?.hoardingID); setQuery(''); setOpen(false); setResults([]); setFocusedIdx(-1); };
  const clearH = () => { onChange(''); setQuery(''); setResults([]); setFocusedIdx(-1); };

  const handleInputKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => (i + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx(i => (i - 1 + results.length) % results.length); }
    else if (e.key === 'Enter') { e.preventDefault(); if (focusedIdx >= 0 && results[focusedIdx]) selectH(results[focusedIdx]); }
    else if (e.key === 'Escape') { setOpen(false); setFocusedIdx(-1); }
  };

  return (
    <div className="exp-hoarding-widget" ref={wrapRef}>
      {!disabled && (
        <div className={`pg-field-wrap ${error ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'} exp-search-trigger`} onClick={() => setOpen(true)}>
          <Search size={14} color={error ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
          <input ref={inputRef} className="pg-field-input"
            placeholder="Type address, landmark, city, district or hoarding code…"
            value={query} autoComplete="off"
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleInputKeyDown}
          />
          {query && <X size={12} style={{ cursor: 'pointer', color: '#c0c0d8', flexShrink: 0 }} onClick={e => { e.stopPropagation(); setQuery(''); setResults([]); setFocusedIdx(-1); }} />}
        </div>
      )}
      {open && results.length > 0 && (
        <div className="exp-hoarding-dropdown" ref={listRef}>
          {results.map((h, idx) => {
            const latest = getLatest(h);
            const site = sites.find(s => s.siteID === latest?.siteID);
            const addr = site ? ['addressLine1', 'addressLine2', 'addressLine3', 'landmark', 'city', 'district'].map(k => site[k]).filter(Boolean).join(', ') : `Site ${latest?.siteID}`;
            return (
              <div key={h.hoardingCode} className={`exp-hoarding-option${idx === focusedIdx ? ' exp-hoarding-option--focused' : ''}`}
                onMouseDown={() => selectH(h)} onMouseEnter={() => setFocusedIdx(idx)}>
                <div className="exp-hoarding-option__code"><Building2 size={12} /> {h.hoardingCode}</div>
                <div className="exp-hoarding-option__addr">{addr}</div>
                <div className="exp-hoarding-option__meta">
                  <span>{latest?.material}</span><span className="exp-dot">·</span><span>{latest?.status}</span>
                  {latest?.width && latest?.height && <><span className="exp-dot">·</span><span>{latest.width}×{latest.height} ft</span></>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {open && query.trim() && results.length === 0 && (
        <div className="exp-hoarding-dropdown"><div className="exp-hoarding-empty"><MapPin size={18} /><span>No hoardings found</span></div></div>
      )}
      {value && selectedHoarding && (() => {
        const latest = getLatest(selectedHoarding);
        const site = latest ? sites.find(s => s.siteID === latest.siteID) : null;
        const addr = site ? ['addressLine1', 'addressLine2', 'addressLine3', 'landmark', 'city', 'district'].map(k => site[k]).filter(Boolean).join(', ') : '';
        return (
          <div className="exp-selected-hoarding">
            <div className="exp-selected-hoarding__inner">
              <div className="exp-selected-hoarding__icon"><Building2 size={16} color="#049edf" /></div>
              <div className="exp-selected-hoarding__info">
                <div className="exp-selected-hoarding__code">{selectedHoarding.hoardingCode}</div>
                <div className="exp-selected-hoarding__addr">{addr}</div>
                <div className="exp-selected-hoarding__chips">
                  {latest?.material && <span className="exp-chip">{latest.material}</span>}
                  {latest?.status && <span className={`exp-chip exp-chip--${latest.status === 'Active' ? 'green' : latest.status === 'Inactive' ? 'red' : 'yellow'}`}>{latest.status}</span>}
                  {latest?.width && latest?.height && <span className="exp-chip">{latest.width}×{latest.height} ft</span>}
                </div>
              </div>
              {!disabled && <button className="exp-selected-hoarding__clear" onClick={clearH} title="Clear"><X size={13} /></button>}
            </div>
          </div>
        );
      })()}
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
        <div className="exp-delete-modal__title">Delete Expense?</div>
        <div className="exp-delete-modal__sub">
          {row._expenseID
            ? <>This will permanently delete <strong>Expense #{row._expenseID}</strong> from the server. This cannot be undone.</>
            : <>This will remove this unsaved row from the list.</>}
        </div>
        <div className="exp-delete-modal__actions">
          <button className="pg-btn-cancel" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="exp-btn-delete-confirm" onClick={onConfirm} disabled={deleting}>
            {deleting ? <><Loader2 size={13} className="pg-spin" /> Deleting…</> : <><Trash2 size={13} /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ATTACH CELL  (table column)
   4 states: empty | new file | saved on server | uploading
═══════════════════════════════════════════════════════════════ */
function AttachCell({ rowId, expenseID, selectedFile, existingAttach, isUploading, onFileSelect, onFileClear }) {
  const inputRef = useRef(null);
  const trigger = () => inputRef.current?.click();
  const onPick = (e) => { const f = e.target.files?.[0]; if (f) onFileSelect(rowId, f); e.target.value = ''; };

  const fileInput = (
    <input ref={inputRef} type="file" style={{ display: 'none' }}
      onChange={onPick} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
  );

  /* STATE 4 — uploading */
  if (isUploading) {
    return (
      <div className="ea-cell">
        <div className="ea-uploading">
          <Loader2 size={12} className="pg-spin" style={{ flexShrink: 0 }} />
          <span>Uploading…</span>
        </div>
      </div>
    );
  }

  /* STATE 2 — new file selected, not yet saved */
  if (selectedFile) {
    return (
      <div className="ea-cell">
        {fileInput}
        <div className="ea-new-file">
          <div className="ea-new-file__name">
            <Paperclip size={11} color="#049edf" style={{ flexShrink: 0 }} />
            <span className="ea-new-file__text" title={selectedFile.name}>{selectedFile.name}</span>
            <button className="ea-new-file__remove" onClick={() => onFileClear(rowId)} title="Remove file"><X size={11} /></button>
          </div>
          <div className="ea-new-file__footer">
            <button className="ea-new-file__change" onClick={trigger}><RefreshCw size={9} /> Change file</button>
          </div>
        </div>
      </div>
    );
  }

  /* STATE 3 — attachment already on server */
  if (existingAttach) {
    const name = getAttachName(existingAttach);
    const fileUrl = getAttachUrl(existingAttach);

    const handleView = () => {
      if (fileUrl) window.open(fileUrl, '_blank', 'noopener,noreferrer');
    };
    const handleDownload = () => {
      if (!fileUrl) return;
      forceDownload(fileUrl, name);
    };

    return (
      <div className="ea-cell">
        {fileInput}
        <div className="ea-saved-card">
          {/* filename */}
          <div className="ea-saved-card__name" title={name}>
            <div className="ea-saved-card__icon">
              <AttachFileIcon name={name} size={12} />
            </div>
            <span className="ea-saved-card__text">{name}</span>
          </div>
          {/* action bar */}
          <div className="ea-saved-card__actions">
            <button
              className="ea-saved-card__btn ea-saved-card__btn--view"
              onClick={handleView}
              disabled={!fileUrl}
              title={fileUrl ? 'Open in new tab' : 'URL not available'}
            >
              <Eye size={10} /> View
            </button>
            <button
              className="ea-saved-card__btn ea-saved-card__btn--download"
              onClick={handleDownload}
              disabled={!fileUrl}
              title={fileUrl ? 'Download file' : 'URL not available'}
            >
              <Download size={10} /> Download
            </button>
            <button
              className="ea-saved-card__btn ea-saved-card__btn--replace"
              onClick={trigger}
              title="Replace with a new file"
            >
              <RefreshCw size={10} /> Replace
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* STATE 1 — nothing attached */
  return (
    <div className="ea-cell">
      {fileInput}
      <button className="ea-btn-attach" onClick={trigger}>
        <Paperclip size={11} /> Attach file
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ENTRY ATTACH FIELD  (inside add-expense form)
═══════════════════════════════════════════════════════════════ */
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
            <AttachFileIcon name={selectedFile.name} size={14} color="#049edf" />
            <span className="ea-entry-filled__name" title={selectedFile.name}>{selectedFile.name}</span>
            <div className="ea-entry-filled__actions">
              <button className="ea-entry-filled__btn" onClick={trigger}><RefreshCw size={10} /> Change</button>
              <button className="ea-entry-filled__btn ea-entry-filled__btn--remove" onClick={() => onFileClear(rowId)}><X size={10} /> Remove</button>
            </div>
          </div>
          <div className="ea-entry-hint">Will upload automatically when you save the expense.</div>
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

/* ─────────────────────────────────────────
   EXPENSE ENTRY PANEL
───────────────────────────────────────── */
function ExpenseEntryPanel({ row, errors, onChange, attachFile, onFileSelect, onFileClear, expenseTypeOptions = [] }) {
  return (
    <div className="exp-entry-panel">
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <FieldLabel label="Expense Date" required />
          <InputWrap error={errors.expenseDate} icon={Calendar}>
            <input className="pg-field-input" type="date" value={row.expenseDate}
              onChange={e => onChange('expenseDate', e.target.value)} />
          </InputWrap>
          <FieldError msg={errors.expenseDate} />
        </div>
        <div className="col-12 col-md-8">
          <FieldLabel label="Expense Type" required />
          <ComboDropdown value={row.expenseType} onChange={v => onChange('expenseType', v)} onBlur={() => { }}
            hasError={!!errors.expenseType} placeholder="Select expense type…" icon={Tag}
            options={expenseTypeOptions} searchable emptyText="No matching types" />
          <FieldError msg={errors.expenseType} />
        </div>
        <div className="col-12">
          <FieldLabel label="Expense Detail" required />
          <InputWrap error={errors.expenseDTL} icon={FileText}>
            <textarea className="pg-field-input exp-entry-textarea" rows={3}
              placeholder="Describe the expense in detail…"
              value={row.expenseDTL} onChange={e => onChange('expenseDTL', e.target.value)} />
          </InputWrap>
          <FieldError msg={errors.expenseDTL} />
        </div>
        <div className="col-12 col-md-6">
          <FieldLabel label="Amount (₹)" required />
          <InputWrap error={errors.amount} icon={IndianRupee}>
            <input className="pg-field-input" type="number" min="0" step="0.01"
              placeholder="e.g. 15000" value={row.amount}
              onChange={e => onChange('amount', e.target.value)} />
          </InputWrap>
          <FieldError msg={errors.amount} />
        </div>
        <div className="col-12 col-md-6">
          <FieldLabel label="Paid By" required />
          <InputWrap error={errors.paidBy} icon={User}>
            <input className="pg-field-input" placeholder="Name of person who paid"
              value={row.paidBy} onChange={e => onChange('paidBy', e.target.value)} />
          </InputWrap>
          <FieldError msg={errors.paidBy} />
        </div>
        <div className="col-12">
          <FieldLabel label="Comments" />
          <InputWrap error={errors.comments} icon={MessageSquare}>
            <textarea className="pg-field-input exp-entry-textarea" rows={3}
              placeholder="Optional remarks…"
              value={row.comments} onChange={e => onChange('comments', e.target.value)} />
          </InputWrap>
          <FieldError msg={errors.comments} />
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

/* ─────────────────────────────────────────
   EXPENSE ROWS TABLE
───────────────────────────────────────── */
function ExpenseRowsTable({ rows, rowErrors, onChangeRow, onDeleteRow, deletingRowId, attachFiles, existingAttaches, onFileSelect, onFileClear, uploadingRowIds, expenseTypeOptions = [] }) {
  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const DeleteBtn = ({ rowId }) => {
    const isDeleting = deletingRowId === rowId;
    return (
      <button className="exp-del-row-btn" onClick={() => !isDeleting && onDeleteRow(rowId)}
        title={isDeleting ? 'Deleting…' : 'Delete this expense'}
        disabled={isDeleting} style={{ opacity: isDeleting ? 0.6 : 1 }}>
        {isDeleting ? <Loader2 size={13} className="pg-spin" /> : <Trash2 size={13} />}
      </button>
    );
  };

  return (
    <div className="exp-rows-wrap">
      <div className="exp-rows-header">
        <div className="exp-rows-header__left"><FileText size={14} color="#049edf" /><span>Expense Entries ({rows.length})</span></div>
        <div className="exp-rows-header__total">Total: <strong>{fmtCurrency(total)}</strong></div>
      </div>

      {/* ─── Desktop ─── */}
      <div className="exp-rows-desktop">
        <div className="exp-rows-scroll">
          <table className="exp-rows-tbl">
            <thead>
              <tr>
                <th className="exp-col-idx">#</th>
                <th className="exp-col-date">Date <span className="exp-req">*</span></th>
                <th className="exp-col-type">Expense Type <span className="exp-req">*</span></th>
                <th className="exp-col-dtl">Expense Detail <span className="exp-req">*</span></th>
                <th className="exp-col-amt">Amount (₹) <span className="exp-req">*</span></th>
                <th className="exp-col-paid">Paid By <span className="exp-req">*</span></th>
                <th className="exp-col-cmt">Comments</th>
                <th style={{ minWidth: 170, width: 170 }}>
                  <span className="ea-col-head"><Paperclip size={11} /> Photo / Doc</span>
                </th>
                <th className="exp-col-del"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const errs = rowErrors[row._rowId] || {};
                const isDeleting = deletingRowId === row._rowId;
                const isUploading = uploadingRowIds?.has(row._rowId);
                const selFile = attachFiles[row._rowId] || null;
                const existing = row._expenseID ? (existingAttaches[row._expenseID] || null) : null;
                return (
                  <tr key={row._rowId}
                    className={`${Object.keys(errs).length ? 'exp-tbl-row exp-tbl-row--err' : 'exp-tbl-row'}${isDeleting ? ' exp-tbl-row--deleting' : ''}`}
                    style={{ opacity: isDeleting ? 0.5 : 1, pointerEvents: isDeleting ? 'none' : 'auto' }}>
                    <td className="exp-td exp-td-idx">{idx + 1}</td>
                    <td className="exp-td">
                      <input type="date" className={`exp-cell-input${errs.expenseDate ? ' exp-cell-input--err' : ''}`}
                        value={row.expenseDate} onChange={e => onChangeRow(row._rowId, 'expenseDate', e.target.value)} />
                      {errs.expenseDate && <div className="exp-cell-err">{errs.expenseDate}</div>}
                    </td>
                    <td className="exp-td">
                      <CellComboDropdown value={row.expenseType} onChange={v => onChangeRow(row._rowId, 'expenseType', v)}
                        options={expenseTypeOptions} hasError={!!errs.expenseType} placeholder="Select…" />
                      {errs.expenseType && <div className="exp-cell-err">{errs.expenseType}</div>}
                    </td>
                    <td className="exp-td">
                      <textarea className={`exp-cell-input exp-cell-scroll${errs.expenseDTL ? ' exp-cell-input--err' : ''}`}
                        placeholder="Detail…" value={row.expenseDTL}
                        onChange={e => onChangeRow(row._rowId, 'expenseDTL', e.target.value)} />
                      {errs.expenseDTL && <div className="exp-cell-err">{errs.expenseDTL}</div>}
                    </td>
                    <td className="exp-td">
                      <input type="number" min="0" step="0.01" className={`exp-cell-input${errs.amount ? ' exp-cell-input--err' : ''}`}
                        placeholder="0" value={row.amount}
                        onChange={e => onChangeRow(row._rowId, 'amount', e.target.value)} />
                      {errs.amount && <div className="exp-cell-err">{errs.amount}</div>}
                    </td>
                    <td className="exp-td">
                      <input className={`exp-cell-input${errs.paidBy ? ' exp-cell-input--err' : ''}`}
                        placeholder="Name…" value={row.paidBy}
                        onChange={e => onChangeRow(row._rowId, 'paidBy', e.target.value)} />
                      {errs.paidBy && <div className="exp-cell-err">{errs.paidBy}</div>}
                    </td>
                    <td className="exp-td">
                      <textarea className="exp-cell-input exp-cell-scroll" placeholder="Optional…"
                        value={row.comments} onChange={e => onChangeRow(row._rowId, 'comments', e.target.value)} />
                    </td>
                    <td className="exp-td" style={{ verticalAlign: 'top', paddingTop: 8 }}>
                      <AttachCell
                        rowId={row._rowId} expenseID={row._expenseID}
                        selectedFile={selFile} existingAttach={existing}
                        isUploading={isUploading}
                        onFileSelect={onFileSelect} onFileClear={onFileClear}
                      />
                    </td>
                    <td className="exp-td exp-td-del"><DeleteBtn rowId={row._rowId} /></td>
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
          const selFile = attachFiles[row._rowId] || null;
          const existing = row._expenseID ? (existingAttaches[row._expenseID] || null) : null;
          return (
            <div key={row._rowId} className={`exp-mob-card${Object.keys(errs).length ? ' exp-mob-card--err' : ''}`}
              style={{ opacity: isDeleting ? 0.5 : 1, pointerEvents: isDeleting ? 'none' : 'auto' }}>
              <div className="exp-mob-card__top">
                <span className="exp-mob-card__num">#{idx + 1}</span>
                <DeleteBtn rowId={row._rowId} />
              </div>
              <div className="row g-2">
                <div className="col-6">
                  <div className="exp-mob-label">Date <span className="exp-req">*</span></div>
                  <input type="date" className={`exp-cell-input${errs.expenseDate ? ' exp-cell-input--err' : ''}`}
                    value={row.expenseDate} onChange={e => onChangeRow(row._rowId, 'expenseDate', e.target.value)} />
                  {errs.expenseDate && <div className="exp-cell-err">{errs.expenseDate}</div>}
                </div>
                <div className="col-6">
                  <div className="exp-mob-label">Amount <span className="exp-req">*</span></div>
                  <input type="number" min="0" step="0.01" className={`exp-cell-input${errs.amount ? ' exp-cell-input--err' : ''}`}
                    placeholder="0" value={row.amount} onChange={e => onChangeRow(row._rowId, 'amount', e.target.value)} />
                  {errs.amount && <div className="exp-cell-err">{errs.amount}</div>}
                </div>
                <div className="col-12">
                  <div className="exp-mob-label">Expense Type <span className="exp-req">*</span></div>
                  <CellComboDropdown value={row.expenseType} onChange={v => onChangeRow(row._rowId, 'expenseType', v)}
                    options={expenseTypeOptions} hasError={!!errs.expenseType} placeholder="Select…" />
                  {errs.expenseType && <div className="exp-cell-err">{errs.expenseType}</div>}
                </div>
                <div className="col-12">
                  <div className="exp-mob-label">Detail <span className="exp-req">*</span></div>
                  <textarea className={`exp-cell-input exp-cell-scroll${errs.expenseDTL ? ' exp-cell-input--err' : ''}`}
                    placeholder="Detail…" value={row.expenseDTL}
                    onChange={e => onChangeRow(row._rowId, 'expenseDTL', e.target.value)} />
                  {errs.expenseDTL && <div className="exp-cell-err">{errs.expenseDTL}</div>}
                </div>
                <div className="col-6">
                  <div className="exp-mob-label">Paid By <span className="exp-req">*</span></div>
                  <input className={`exp-cell-input${errs.paidBy ? ' exp-cell-input--err' : ''}`}
                    placeholder="Name…" value={row.paidBy}
                    onChange={e => onChangeRow(row._rowId, 'paidBy', e.target.value)} />
                  {errs.paidBy && <div className="exp-cell-err">{errs.paidBy}</div>}
                </div>
                <div className="col-6">
                  <div className="exp-mob-label">Comments</div>
                  <textarea className="exp-cell-input exp-cell-scroll" placeholder="Optional…"
                    value={row.comments} onChange={e => onChangeRow(row._rowId, 'comments', e.target.value)} />
                </div>
                <div className="col-12">
                  <div className="exp-mob-label" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Paperclip size={11} color="#9090a8" /> Photo / Doc <span style={{ fontSize: 10, color: '#b0b0c8' }}>(optional)</span>
                  </div>
                  <AttachCell
                    rowId={row._rowId} expenseID={row._expenseID}
                    selectedFile={selFile} existingAttach={existing}
                    isUploading={isUploading}
                    onFileSelect={onFileSelect} onFileClear={onFileClear}
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
   EXPENSE FORM  (Add / Edit)
───────────────────────────────────────── */
function ExpenseForm({ mode, expense, hoardings, sites, allExpenses, onBack, expenseTypeOptions = [] }) {
  const isAdd = mode === 'add';

  const [hoardingID, setHoardingID] = useState(isAdd ? '' : (expense?.hoardingID || ''));
  const [hoardingError, setHoardingError] = useState('');

  const [rows, setRows] = useState(() => {
    if (isAdd || !expense) return [];
    const siblings = (allExpenses || []).filter(e => e.hoardingID === expense.hoardingID);
    const source = siblings.length > 0 ? siblings : [expense];
    return source.map(e => ({
      ...EMPTY_ROW, _rowId: makeRowId(), _expenseID: e.expenseID,
      expenseDate: toDateInputValue(e.expenseDate),
      expenseType: e.expenseType || '', expenseDTL: e.expenseDTL || '',
      amount: e.amount ?? '', paidBy: e.paidBy || '', comments: e.comments || '',
    }));
  });

  const [rowErrors, setRowErrors] = useState({});
  const emptyCurrentRow = () => ({ ...EMPTY_ROW, _rowId: makeRowId() });
  const [currentRow, setCurrentRow] = useState(emptyCurrentRow);
  const [currentErrors, setCurrentErrors] = useState({});
  const [showEntryForm, setShowEntryForm] = useState(isAdd);

  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [apiErr, setApiErr] = useState('');

  /* ── Attachment state ── */
  const [attachFiles, setAttachFiles] = useState({});
  const [existingAttaches, setExistingAttaches] = useState({});
  const [uploadingRowIds, setUploadingRowIds] = useState(new Set());
  const [attachLoadDone, setAttachLoadDone] = useState(isAdd);

  /* ── Per-row delete state ── */
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingRowId, setDeletingRowId] = useState(null);
  const [stagedDeletedExpenseIds, setStagedDeletedExpenseIds] = useState([]);

  /* ── Load existing attachments for all saved rows on edit mount ── */
  useEffect(() => {
    if (isAdd || rows.length === 0) { setAttachLoadDone(true); return; }
    const ids = rows.map(r => r._expenseID).filter(Boolean);
    if (!ids.length) { setAttachLoadDone(true); return; }


    let cancelled = false;
    Promise.allSettled(ids.map(id => apiService.getExpenseAttachByExpenseId(id))).then(results => {
      if (cancelled) return;


      const map = {};
      results.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value) map[ids[i]] = res.value;
      });


      setExistingAttaches(map);
      setAttachLoadDone(true);
    });
    return () => { cancelled = true; };
  }, []);

  /* ── File handlers ── */
  /* ── File handlers ── */
  const handleFileSelect = useCallback((rowId, file) => {
    setAttachFiles(prev => ({ ...prev, [rowId]: file }));
  }, []);
  const handleFileClear = useCallback((rowId) => {
    setAttachFiles(prev => { const n = { ...prev }; delete n[rowId]; return n; });
  }, []);

  /* ── Row handlers ── */
  const handleCurrentChange = (key, val) => {
    setCurrentRow(p => ({ ...p, [key]: val }));
    if (currentErrors[key]) setCurrentErrors(p => ({ ...p, [key]: '' }));
  };

  const handleAddRow = () => {
    const errs = validateRow(currentRow);
    if (Object.keys(errs).length) { setCurrentErrors(errs); return; }
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
    if (row) setDeleteTarget(row);
  };

  const confirmDeleteRow = () => {
    if (!deleteTarget) return;
    const row = deleteTarget;
    setDeleteTarget(null);
    if (row._expenseID) {
      setStagedDeletedExpenseIds(prev => [...prev, row._expenseID]);
    }
    setRows(prev => prev.filter(r => r._rowId !== row._rowId));
    setRowErrors(prev => { const n = { ...prev }; delete n[row._rowId]; return n; });
    setAttachFiles(prev => { const n = { ...prev }; delete n[row._rowId]; return n; });
  };

  /* ── Save ── */
  const handleSave = () => {
    if (!hoardingID) { setHoardingError('Required'); return; }
    setHoardingError('');
    const newRowErrors = {};
    let hasErr = false;
    rows.forEach(r => { const e = validateRow(r); if (Object.keys(e).length) { newRowErrors[r._rowId] = e; hasErr = true; } });
    const entryHasData = Object.entries(currentRow).filter(([k]) => k !== '_rowId').some(([, v]) => v !== '');
    if (showEntryForm && entryHasData) {
      const errs = validateRow(currentRow);
      if (Object.keys(errs).length) { setCurrentErrors(errs); return; }
      if (hasErr) { setRowErrors(newRowErrors); return; }
      _doSave([...rows, { ...currentRow }]); return;
    }
    if (rows.length === 0) { setApiErr('Please add at least one expense row.'); return; }
    if (hasErr) { setRowErrors(newRowErrors); return; }
    _doSave(rows);
  };

  const _doSave = async (allRows) => {
    setSaving(true); setApiErr('');
    const attachErrors = [];
    try {
      // Delete staged deleted expenses first
      if (stagedDeletedExpenseIds.length > 0) {
        for (const id of stagedDeletedExpenseIds) {
          await apiService.deleteExpense(id);
        }
      }

      for (const row of allRows) {
        const payload = {
          hoardingID: Number(hoardingID),
          expenseDate: row.expenseDate,
          expenseType: row.expenseType ? String(row.expenseType) : '',
          expenseDTL: row.expenseDTL,
          amount: Number(row.amount),
          paidBy: row.paidBy,
          comments: row.comments || '',
        };

        let resolvedID = row._expenseID;
        if (!row._expenseID) {
          const created = await apiService.createExpense(payload);
          resolvedID = created?.expenseID ?? created?.id ?? null;
        } else {
          await apiService.updateExpense(row._expenseID, payload);
        }

        const file = attachFiles[row._rowId];
        if (file && resolvedID) {
          setUploadingRowIds(prev => new Set(prev).add(row._rowId));
          try {
            const existing = existingAttaches[resolvedID];
            if (existing) {
              await apiService.updateExpenseAttach(existing, Number(hoardingID), resolvedID, file);
            } else {
              await apiService.createExpenseAttach(resolvedID, Number(hoardingID), file);
            }
          } catch (e) {
            attachErrors.push(e?.response?.data?.message || e?.message || 'Upload failed');
          } finally {
            setUploadingRowIds(prev => { const n = new Set(prev); n.delete(row._rowId); return n; });
          }
        }
      }

      if (attachErrors.length) {
        setApiErr(`Expenses saved, but ${attachErrors.length} attachment(s) failed: ${attachErrors[0]}`);
        setSaveOk(true);
        setTimeout(() => onBack(), 2500);
      } else {
        setSaveOk(true);
        setTimeout(() => onBack(), 700);
      }
    } catch (err) {
      setApiErr(err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  const totalAmount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const saveLabel = `Save ${rows.length > 0 ? rows.length : ''} Expense${rows.length !== 1 ? 's' : ''}`.trim();

  return (
    <div className="hd-form-page">
      {deleteTarget && (
        <DeleteRowModal row={deleteTarget} onConfirm={confirmDeleteRow}
          onCancel={() => setDeleteTarget(null)} deleting={!!deletingRowId} />
      )}

      <div className="hd-topbar">
        <div className="hd-topbar-left">
          <button className="hd-back-btn" onClick={onBack} disabled={saving}>
            <ArrowLeft size={14} />
            <span className="d-none d-sm-inline">Back to Expenses</span>
            <span className="d-inline d-sm-none">Back</span>
          </button>
          <div className="hd-topbar-divider" />
          <div>
            <div className="hd-topbar-title">{isAdd ? 'Add New Expenses' : `Edit Expenses — ${expense?.hoardingCode || `Hoarding #${expense?.hoardingID}`}`}</div>
            <div className="hd-topbar-sub">{isAdd ? 'Fill each expense and click "Add Expense Row" to queue, then save all' : 'Update expense details or add more rows for this hoarding'}</div>
          </div>
        </div>
      </div>

      <div className="hd-form-body">
        <div className="container-fluid px-0">
          {apiErr && (
            <div className="pg-field-error hd-api-error mb-3">
              <AlertCircle size={14} /><span>{apiErr}</span>
              <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }} onClick={() => setApiErr('')}>✕</button>
            </div>
          )}

          <div className="row g-4">

            {/* ── Hoarding Selection ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><Building2 size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Hoarding Selection</div>
                    <div className="hd-section-sub">{isAdd ? 'All expense rows will be linked to this hoarding' : 'Hoarding linked to this expense (locked)'}</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <FieldLabel label="Search Hoarding by Site Address" required />
                  <HoardingSearchWidget hoardings={hoardings} sites={sites} value={hoardingID}
                    onChange={val => { setHoardingID(val); if (val) setHoardingError(''); }}
                    error={hoardingError} disabled={!isAdd} />
                  <FieldError msg={hoardingError} />
                </div>
              </div>
            </div>

            {/* ── Expense Entry ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><FileText size={14} color="#049edf" /></div>
                  <div style={{ flex: 1 }}>
                    <div className="hd-section-title">Expense Entry</div>
                    <div className="hd-section-sub">
                      {isAdd
                        ? 'Add one or more expense rows for this hoarding'
                        : `${rows.length} expense row${rows.length !== 1 ? 's' : ''} · ${fmtCurrency(totalAmount)}`}
                    </div>
                  </div>
                  {!isAdd && (
                    <button className={`exp-toggle-btn${showEntryForm ? ' exp-toggle-btn--cancel' : ''}`}
                      onClick={() => { setShowEntryForm(v => !v); setCurrentErrors({}); }}>
                      {showEntryForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add Expense Row</>}
                    </button>
                  )}
                </div>

                {/* Hint banner */}
                <div className="ea-hint-banner">
                  <Paperclip size={12} color="#049edf" />
                  Each expense row has an optional <strong>Photo / Doc</strong> attachment — leave blank if not needed.
                </div>

                <div className="hd-section-body">
                  {showEntryForm && (
                    <>
                      <ExpenseEntryPanel
                        row={currentRow}
                        errors={currentErrors}
                        onChange={handleCurrentChange}
                        attachFile={attachFiles[currentRow._rowId] || null}
                        onFileSelect={handleFileSelect}
                        onFileClear={handleFileClear}
                        expenseTypeOptions={expenseTypeOptions}
                      />
                      <div className="exp-addrow-bar">
                        <button className="exp-btn-addrow" onClick={handleAddRow}><Plus size={14} /> Add Expense Row</button>
                        {rows.length > 0 && <span className="exp-addrow-hint">{rows.length} row{rows.length !== 1 ? 's' : ''} queued · {fmtCurrency(totalAmount)}</span>}
                      </div>
                    </>
                  )}

                  {!attachLoadDone && (
                    <div className="ea-loading-bar"><Loader2 size={13} className="pg-spin" /> Loading existing attachments…</div>
                  )}

                  <ExpenseRowsTable
                    rows={rows} rowErrors={rowErrors}
                    onChangeRow={handleChangeRow}
                    onDeleteRow={handleDeleteRow}
                    deletingRowId={deletingRowId}
                    attachFiles={attachFiles}
                    existingAttaches={existingAttaches}
                    onFileSelect={handleFileSelect}
                    onFileClear={handleFileClear}
                    uploadingRowIds={uploadingRowIds}
                    expenseTypeOptions={expenseTypeOptions}
                  />

                  {!isAdd && rows.length === 0 && !showEntryForm && (
                    <div className="exp-edit-empty">
                      <FileText size={28} color="#d0d0e8" />
                      <span>No expense rows. Click <strong>Add Expense Row</strong> above to add one.</span>
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

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function HoardingExpensePage() {
  const [hoardings, setHoardings] = useState([]);
  const [sites, setSites] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseTypeOptions, setExpenseTypeOptions] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingExp, setLoadingExp] = useState(true);
  const [loadError, setLoadError] = useState('');

  const tableRef = useRef(null);
  const [tableReady, setTableReady] = useState(false);
  const isLoading = loadingMeta || loadingExp;
  useEffect(() => { if (!isLoading) setTableReady(true); }, [isLoading]);
  useResizableColumns(tableRef, tableReady, [300, 200, 80]);

  const [view, setView] = useState('grid');
  const [formMode, setFormMode] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('hoardingCode');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchMeta = useCallback(async () => {
    setLoadingMeta(true); setLoadError('');
    try {
      const [rawHoardings, rawSites, rawExpenseTypes] = await Promise.all([
        apiService.getAllHoardings(),
        apiService.getAllSites(),
        apiService.getAllExpenseTypes().catch(() => [])
      ]);
      const map = {};
      (Array.isArray(rawHoardings) ? rawHoardings : []).forEach(rec => {
        const code = rec.hoardingCode;
        if (!map[code]) map[code] = { hoardingCode: code, versions: [] };
        map[code].versions.push({
          hoardingID: rec.hoardingID, effdt: rec.effdt ? rec.effdt.split('T')[0] : '',
          material: rec.material || '', hoardingType: rec.hoardingType || '', status: rec.status || '',
          monthlyRent: rec.monthlyRent ?? '', width: rec.width ?? '', height: rec.height ?? '', siteID: rec.siteID || '',
        });
      });
      setHoardings(Object.values(map));
      setSites(Array.isArray(rawSites) ? rawSites : []);

      const allTypes = Array.isArray(rawExpenseTypes) ? rawExpenseTypes : rawExpenseTypes?.data ?? rawExpenseTypes?.$values ?? [];
      const activeTypes = allTypes.filter(t => (t.status ?? t.Status ?? '').toLowerCase() === 'active');
      const mappedOptions = activeTypes.map(t => ({
        value: t.expenseTypeID ?? t.ExpenseTypeID,
        label: t.expenseTypeName ?? t.ExpenseTypeName
      }));
      setExpenseTypeOptions(mappedOptions);
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Failed to load data.');
    } finally { setLoadingMeta(false); }
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoadingExp(true);
    try {
      const raw = await apiService.getAllExpenses();
      setExpenses((Array.isArray(raw) ? raw : []).map(e => ({ ...e, expenseDate: toDateInputValue(e.expenseDate) })));
    } catch (err) { console.error('Failed to fetch expenses:', err); }
    finally { setLoadingExp(false); }
  }, []);

  useEffect(() => { fetchMeta(); fetchExpenses(); }, [fetchMeta, fetchExpenses]);

  // useEffect(() => {
  //   sessionStorage.setItem('exp_view', view);
  //   sessionStorage.setItem('exp_formMode', formMode || '');
  //   try { sessionStorage.setItem('exp_editTarget', editTarget ? JSON.stringify(editTarget) : ''); } catch {}
  // }, [view, formMode, editTarget]);

  const handleFormBack = useCallback(() => {
    sessionStorage.removeItem('exp_view'); sessionStorage.removeItem('exp_formMode'); sessionStorage.removeItem('exp_editTarget');
    setView('grid'); setEditTarget(null); fetchExpenses();
  }, [fetchExpenses]);

  const groupedRows = React.useMemo(() => {
    const map = {};
    expenses.forEach(exp => {
      const key = exp.hoardingID;
      if (!map[key]) {
        const hoarding = hoardings.find(h => h.versions.some(v => v.hoardingID === exp.hoardingID));
        const latest = hoarding ? getLatest(hoarding) : null;
        const site = latest ? sites.find(s => s.siteID === latest.siteID) : null;
        map[key] = {
          hoardingID: key,
          hoardingCode: hoarding?.hoardingCode || `ID ${key}`,
          siteLabel: site ? [site.addressLine1, site.city].filter(Boolean).join(', ') : `Hoarding ID ${key}`,
          totalAmount: 0, count: 0, _firstExpense: exp,
        };
      }
      map[key].totalAmount += Number(exp.amount) || 0;
      map[key].count += 1;
    });
    return Object.values(map);
  }, [expenses, hoardings, sites]);

  const filtered = groupedRows.filter(r => {
    const q = search.toLowerCase();
    return r.hoardingCode.toLowerCase().includes(q) || r.siteLabel.toLowerCase().includes(q) || String(r.hoardingID).includes(q);
  });

  const sortedRows = [...filtered].sort((a, b) => {
    if (sortKey === 'totalAmount') return sortDir === 'asc' ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount;
    const av = String(a[sortKey] ?? '').toLowerCase(), bv = String(b[sortKey] ?? '').toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginated = sortedRows.slice((page - 1) * pageSize, page * pageSize);
  const totalAmount = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => { if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…'); acc.push(p); return acc; }, []);

  const COLS = [
    { key: 'hoardingCode', label: 'Hoarding' },
    { key: 'totalAmount', label: 'Total Amount' },
    { key: '_action', label: 'Actions', noSort: true },
  ];

  if (view === 'form') {
    return (
      <ExpenseForm
        mode={formMode} expense={editTarget}
        hoardings={hoardings} sites={sites}
        allExpenses={expenses} onBack={handleFormBack}
        expenseTypeOptions={expenseTypeOptions}
      />
    );
  }

  return (
    <div className="pg-page">
      <div className="pg-header">
        <div>
          <h1 className="pg-header__title">Hoarding Expenses</h1>
          <p className="pg-header__subtitle">
            Track and manage all hoarding-related expenses
            {expenses.length > 0 && <> · Total: <strong>{fmtCurrency(totalAmount)}</strong></>}
          </p>
        </div>
        <button className="pg-btn-add" onClick={() => { setFormMode('add'); setEditTarget(null); setView('form'); }} disabled={isLoading}>
          <Plus size={14} /> Add Expense
        </button>
      </div>

      {!isLoading && expenses.length > 0 && (
        <div className="exp-stats-strip">
          {[
            { icon: <FileText size={16} color="#049edf" />, bg: 'rgba(4,158,223,0.1)', label: 'Total Expenses', val: expenses.length },
            { icon: <IndianRupee size={16} color="#16a34a" />, bg: 'rgba(22,163,74,0.1)', label: 'Total Amount', val: fmtCurrency(totalAmount) },
            { icon: <Building2 size={16} color="#6c63ff" />, bg: 'rgba(108,99,255,0.1)', label: 'Hoardings Covered', val: new Set(expenses.map(e => e.hoardingID)).size },
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
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
            onClick={() => { fetchMeta(); fetchExpenses(); }}>Retry</button>
        </div>
      )}

      <div className="pg-container">
        <div className="pg-toolbar">
          <div className="pg-toolbar__inner">
            <div className="pg-toolbar__count">
              <Building2 size={14} color="#9090a8" />
              <span><strong>{isLoading ? '…' : filtered.length}</strong> hoarding{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="pg-search-box">
              <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input placeholder="Search hoarding code or site…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
              {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
            </div>
            <button className="pg-pg-btn" onClick={() => { fetchMeta(); fetchExpenses(); }} title="Refresh"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={13} className={isLoading ? 'pg-spin' : ''} />
            </button>
          </div>
        </div>

        {isLoading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#9090a8' }}>
            <Loader2 size={28} className="pg-spin" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13 }}>Loading expenses…</div>
          </div>
        )}

        {!isLoading && expenses.length === 0 && (
          <div className="pg-empty" style={{ padding: '70px 20px' }}>
            <div className="pg-empty__inner">
              <FileText size={42} color="#d0d0e8" />
              <span className="pg-empty__label">No expenses recorded yet</span>
              <span style={{ fontSize: 12, color: '#b0b0c8', fontFamily: 'Nunito, sans-serif' }}>Click <strong>Add Expense</strong> to record the first one</span>
            </div>
          </div>
        )}

        {!isLoading && expenses.length > 0 && (
          <div className="pg-desktop-table">
            <table className="pg-table" ref={tableRef}>
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th key={col.key} className={['pg-th', !col.noSort && 'pg-th--sort'].filter(Boolean).join(' ')}
                      onClick={() => !col.noSort && (() => {
                        if (sortKey === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        else { setSortKey(col.key); setSortDir('asc'); }
                        setPage(1);
                      })()}>
                      <div className="pg-th__inner">{col.label}{!col.noSort && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={COLS.length} className="pg-td pg-empty">
                    <div className="pg-empty__inner"><FileText size={36} color="#d0d0e8" /><span className="pg-empty__label">No hoardings match your search</span></div>
                  </td></tr>
                ) : paginated.map(r => (
                  <tr key={r.hoardingID} className="pg-tr">
                    <td className="pg-td">
                      <div className="pg-td__primary hd-code-cell">{r.hoardingCode}</div>
                      <div style={{ fontSize: 11, color: '#9090a8', marginTop: 2 }}>{r.siteLabel}</div>
                      <div style={{ fontSize: 11, color: '#b0b0c8', marginTop: 1 }}>{r.count} expense{r.count !== 1 ? 's' : ''}</div>
                    </td>
                    <td className="pg-td"><span className="exp-amount-val">{fmtCurrency(r.totalAmount)}</span></td>
                    <td className="pg-td">
                      <div className="pg-action-wrap">
                        <button className="pg-btn-view" title="Edit"
                          onClick={() => { setFormMode('edit'); setEditTarget(r._firstExpense); setView('form'); }}>
                          <Edit2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && expenses.length > 0 && (
          <div className="pg-mobile-cards">
            {paginated.map(r => (
              <div key={r.hoardingID} className="pg-card">
                <div className="pg-card__header">
                  <div className="pg-card__title-wrap">
                    <div className="pg-card__title">{r.hoardingCode}</div>
                    <div className="pg-card__subtitle">{r.siteLabel}</div>
                  </div>
                  <div className="pg-card__actions">
                    <button className="pg-card__btn-view"
                      onClick={() => { setFormMode('edit'); setEditTarget(r._firstExpense); setView('form'); }}
                      title="Edit"><Edit2 size={13} /></button>
                  </div>
                </div>
                <div className="pg-card__body">
                  <div className="pg-card__row">
                    <IndianRupee size={12} color="#c0c0d8" className="pg-card__row-icon" />
                    <span className="pg-card__row-text" style={{ fontWeight: 800, color: '#1a1a2e' }}>{fmtCurrency(r.totalAmount)}</span>
                  </div>
                  <div className="pg-card__row">
                    <FileText size={12} color="#c0c0d8" className="pg-card__row-icon" />
                    <span className="pg-card__row-text">{r.count} expense{r.count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && expenses.length > 0 && (
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
              <span className="pg-pagination__text">{page} of {totalPages} pages ({sortedRows.length} items)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}