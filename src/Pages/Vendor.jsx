import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  UserCircle, Plus, Phone, Home, Globe,
  Building2, MapPin, Search, Users, RefreshCw,
  X, AlertCircle, Check, Edit2, Eye, ChevronDown,
  ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Filter, Mail, Loader2, ShieldCheck, CreditCard, Hash
} from 'lucide-react';
import './Common1.css';
import { apiService } from '../api/api';
import { useResizableColumns } from '../hooks/useResizableColumns';

/* ─────────────────────────────────────────
   CONSTANTS & HELPERS
 ───────────────────────────────────────── */
const EMPTY_FORM = {
  vendorID: 0,
  vendorName: '',
  contactPerson: '',
  mobileNo: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  panNo: '',
  bankName: '',
  branchName: '',
  accountNo: '',
  ifscCode: '',
  isActive: true,
  hoardingId: [],
};

const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

// Districts mapping removed

const NAME_REGEX = /^[a-zA-Z0-9\u00C0-\u024F][a-zA-Z0-9\u00C0-\u024F\s.''\-]{0,99}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d][\d\s\-]{4,18}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const PAGE_SIZE_OPTIONS = [10, 12, 15, 20];

const FIELDS = [
  { key: 'vendorName', label: 'Vendor Name', icon: UserCircle, placeholder: 'e.g. ABC Industrial Supplies Pvt. Ltd.', col: 6, required: true, type: 'text' },
  { key: 'contactPerson', label: 'Contact Person', icon: Users, placeholder: 'e.g. Rahul Sharma', col: 6, required: false, type: 'text' },
  { key: 'mobileNo', label: 'Mobile No', icon: Phone, placeholder: 'e.g. 9876543210', col: 6, required: true, type: 'phone' },
  { key: 'email', label: 'Email Address', icon: Mail, placeholder: 'e.g. info@abcindustrial.com', col: 6, required: false, type: 'email' },
  { key: 'address', label: 'Address', icon: Home, placeholder: 'e.g. Plot No. 24, Phase II, GIDC Estate', col: 12, required: false, type: 'text' },
  { key: 'state', label: 'State', icon: MapPin, placeholder: '', col: 6, required: true, type: 'combo-state' },
  { key: 'city', label: 'City', icon: Building2, placeholder: 'e.g. Ahmedabad', col: 6, required: true, type: 'text' },
  { key: 'pincode', label: 'Pincode', icon: MapPin, placeholder: 'e.g. 382445', col: 6, required: false, type: 'text' },
  { key: 'gstin', label: 'GSTIN', icon: ShieldCheck, placeholder: 'e.g. 24AABCA1234F1Z5', col: 6, required: false, type: 'gstin' },
  { key: 'panNo', label: 'PAN Number', icon: ShieldCheck, placeholder: 'e.g. AABCA1234F', col: 6, required: false, type: 'pan' },
  { key: 'bankName', label: 'Bank Name', icon: Building2, placeholder: 'e.g. State Bank of India', col: 6, required: false, type: 'text' },
  { key: 'branchName', label: 'Branch Name', icon: Building2, placeholder: 'e.g. Naroda Branch', col: 6, required: false, type: 'text' },
  { key: 'accountNo', label: 'Account Number', icon: CreditCard, placeholder: 'e.g. 123456789012', col: 6, required: false, type: 'text' },
  { key: 'ifscCode', label: 'IFSC Code', icon: Hash, placeholder: 'e.g. SBIN0001234', col: 6, required: false, type: 'ifsc' },
  { key: 'hoardingId', label: 'External Hoardings', icon: Building2, placeholder: '', col: 12, required: true, type: 'combo-hoarding' },
  { key: 'isActive', label: 'Status', icon: ShieldCheck, placeholder: '', col: 6, required: true, type: 'combo-status' },
];

function validatePhone(value) {
  const stringVal = (value === undefined || value === null) ? '' : String(value);
  const v = stringVal.trim();
  if (!v) return '';
  if (!PHONE_REGEX.test(v))
    return 'Enter a valid phone number (digits, spaces, hyphens, optional + prefix)';
  const digits = v.replace(/\D/g, '');
  if (digits.length < 6) return `Too short — only ${digits.length} digits (minimum 6)`;
  if (digits.length > 15) return `Too long — ${digits.length} digits (maximum 15)`;
  return '';
}

function validateField(key, value, type, required) {
  if (required) {
    if (Array.isArray(value)) {
      if (value.length === 0) return 'This field is required';
    } else {
      const stringVal = (value === undefined || value === null) ? '' : String(value);
      const v = stringVal.trim();
      if (!v && typeof value !== 'boolean') return 'This field is required';
    }
  }

  const stringVal = (value === undefined || value === null) ? '' : String(value);
  const v = stringVal.trim();
  if (!v && typeof value !== 'boolean') return '';
  if (type === 'name') { if (!NAME_REGEX.test(v)) return "Only letters, numbers, spaces, and . ' - are allowed"; }
  if (type === 'phone') return validatePhone(v);
  if (type === 'email') { if (!EMAIL_REGEX.test(v)) return 'Enter a valid email address'; }
  if (type === 'gstin') { if (!GSTIN_REGEX.test(v.toUpperCase())) return 'Enter a valid 15-character GSTIN'; }
  if (type === 'pan') { if (!PAN_REGEX.test(v.toUpperCase())) return 'Enter a valid 10-character PAN number'; }
  if (type === 'ifsc') { if (!IFSC_REGEX.test(v.toUpperCase())) return 'Enter a valid 11-character IFSC (e.g. SBIN0001234)'; }
  return '';
}

function parseArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object' && Array.isArray(val.$values)) return val.$values;
  return [];
}

function getLatestActiveExternalHoardings(hoardings) {
  const activeHoardings = hoardings.filter(h => h.status?.toLowerCase() === 'active');
  const latestMap = {};
  activeHoardings.forEach(h => {
    const id = h.hoardingID;
    if (!latestMap[id]) {
      latestMap[id] = h;
    } else {
      const currentEffdt = new Date(latestMap[id].effdt || 0).getTime();
      const newEffdt = new Date(h.effdt || 0).getTime();
      if (newEffdt > currentEffdt) {
        latestMap[id] = h;
      }
    }
  });
  return Object.values(latestMap);
}

function normalizeVendor(raw) {
  return {
    vendorID: raw.vendor_ID ?? raw.vendorID ?? 0,
    vendorName: raw.vendor_Name ?? raw.vendorName ?? '',
    contactPerson: raw.contact_Person ?? raw.contactPerson ?? '',
    mobileNo: raw.mobile_No ?? raw.mobileNo ?? '',
    email: raw.email ?? '',
    address: raw.address ?? '',
    city: raw.city ?? '',
    state: raw.state ?? '',
    pincode: raw.pincode ?? '',
    gstin: raw.gstin ?? '',
    panNo: raw.paN_No ?? raw.panNo ?? '',
    bankName: raw.bank_Name ?? raw.bankName ?? '',
    branchName: raw.branch_Name ?? raw.branchName ?? '',
    accountNo: raw.account_No ?? raw.accountNo ?? '',
    ifscCode: raw.ifsC_Code ?? raw.ifscCode ?? '',
    isActive: raw.is_Active ?? raw.isActive ?? true,
    hoardingId: parseArray(raw.hoardingId ?? raw.hoardingID ?? raw.hoarding_Id),
  };
}

function toPayload(form) {
  return {
    vendorID: Number(form.vendorID ?? 0),
    vendorName: String(form.vendorName || '').trim(),
    contactPerson: String(form.contactPerson || '').trim(),
    mobileNo: String(form.mobileNo || '').trim(),
    email: String(form.email || '').trim(),
    address: String(form.address || '').trim(),
    city: String(form.city || '').trim(),
    state: String(form.state || '').trim(),
    pincode: String(form.pincode || '').trim(),
    gstin: String(form.gstin || '').trim().toUpperCase(),
    panNo: String(form.panNo || '').trim().toUpperCase(),
    bankName: String(form.bankName || '').trim(),
    branchName: String(form.branchName || '').trim(),
    accountNo: String(form.accountNo || '').trim(),
    ifscCode: String(form.ifscCode || '').trim().toUpperCase(),
    isActive: !!form.isActive,
    hoardingId: (form.hoardingId || []).map(Number),
  };
}

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

/* ═══════════════════════════════════════════
   STATUS COMBOS
 ═══════════════════════════════════════════ */
function StatusDropdown({ value, onChange }) {
  return (
    <div className="pg-field-wrap pg-field-wrap--normal">
      <ShieldCheck size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
      <select
        className="pg-field-input"
        value={value ? 'Active' : 'Inactive'}
        onChange={e => onChange(e.target.value === 'Active')}
        style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}
      >
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PORTAL DROPDOWN
   ═══════════════════════════════════════════ */
function PortalDropdown({ children, open, triggerRef, panelRef }) {
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      setCoords({
        top: rect.bottom + scrollY,
        left: rect.left + scrollX,
        width: rect.width
      });
    }
  }, [triggerRef]);

  useEffect(() => {
    if (open) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [open, updateCoords]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        top: coords.top + 4,
        left: coords.left,
        width: coords.width,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   STATE COMBO
   ═══════════════════════════════════════════ */
function StateCombo({ value, onChange, onBlur, hasError }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [wasOpened, setWasOpened] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = INDIA_STATES.filter(s =>
    s.toLowerCase().includes(query.toLowerCase())
  );

  const close = useCallback(() => {
    setOpen(false); setQuery('');
    if (wasOpened) { onBlur?.(); setWasOpened(false); }
  }, [wasOpened, onBlur]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!wrapRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) close();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, close]);

  const openDropdown = () => {
    setOpen(true); setWasOpened(true); setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const select = (state) => { onChange(state); setOpen(false); setQuery(''); setWasOpened(false); };

  const clear = (e) => {
    e.stopPropagation();
    onChange(''); setOpen(false); setQuery(''); setWasOpened(false); onBlur?.();
  };

  const handleTriggerKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDropdown(); }
      return;
    }
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx = Array.from(items || []).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') close();
  };

  const handleSearchKeyDown = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    if (e.key === 'ArrowDown') { e.preventDefault(); items?.[0]?.focus(); }
    else if (e.key === 'Escape') close();
  };

  const handleOptionKeyDown = (e, opt) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(opt); }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const items = listRef.current?.querySelectorAll('.pg-combo-option');
      const idx = Array.from(items).indexOf(e.currentTarget);
      (items[idx + 1] || items[0])?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const items = listRef.current?.querySelectorAll('.pg-combo-option');
      const idx = Array.from(items).indexOf(e.currentTarget);
      (items[idx - 1] || items[items.length - 1])?.focus();
    } else if (e.key === 'Escape') close();
  };

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        ref={triggerRef}
        className={`pg-field-wrap pg-combo-trigger ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        onClick={openDropdown} tabIndex={0} onKeyDown={handleTriggerKeyDown}
        style={{ cursor: 'pointer' }}
      >
        <MapPin size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: value ? 700 : 500, color: value ? '#1a1a2e' : '#b0b0c8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
          {value || 'Select state…'}
        </span>
        {value
          ? <X size={13} style={{ cursor: 'pointer', color: '#c0c0d8', flexShrink: 0 }} onClick={clear} />
          : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>

      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position: 'static' }}>
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="pg-combo-search__input"
              placeholder="Search state..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
          </div>
          <div className="pg-combo-list" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="pg-combo-empty">No states match</div>
            ) : filtered.map(s => (
              <div
                key={s}
                className={`pg-combo-option${s === value ? ' pg-combo-option--active' : ''}`}
                onClick={() => select(s)} tabIndex={0}
                onKeyDown={e => handleOptionKeyDown(e, s)}
              >
                <span className="pg-combo-option__name">{s}</span>
                {s === value && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DISTRICT COMBO
 ═══════════════════════════════════════════ */
// DistrictCombo component removed

/* ═══════════════════════════════════════════
   SORT ICON
 ═══════════════════════════════════════════ */
function SortIcon({ col, sortKey, sortDir }) {
  const active = sortKey === col;
  return (
    <span className="pg-sort-icon">
      <ChevronUp size={10} color={active && sortDir === 'asc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__up" />
      <ChevronDown size={10} color={active && sortDir === 'desc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__down" />
    </span>
  );
}

/* ═══════════════════════════════════════════
   STATUS BADGE
 ═══════════════════════════════════════════ */
function StatusBadge({ isActive }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 20, fontFamily: 'Nunito,sans-serif', fontSize: 11,
      fontWeight: 700, background: isActive ? '#f0fdf4' : '#fef2f2',
      color: isActive ? '#16a34a' : '#dc2626',
      border: `1px solid ${isActive ? '#bbf7d0' : '#fecaca'}`, whiteSpace: 'nowrap',
    }}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

/* ═══════════════════════════════════════════
   VENDOR CARD (For mobile view)
 ═══════════════════════════════════════════ */
function VendorCard({ vendor, onViewDetail, onEdit }) {
  return (
    <div className="pg-card">
      <div className="pg-card__header">
        <div className="pg-card__title-wrap">
          <div className="pg-card__title" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
            {vendor.vendorName}
          </div>
          <div style={{ marginTop: 4, fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, color: '#9090a8' }}>
            ID: #{vendor.vendorID} {vendor.contactPerson ? `· ${vendor.contactPerson}` : ''}
          </div>
        </div>
        <div className="pg-card__actions">
          <button className="pg-btn-edit" onClick={() => onEdit(vendor)} title="Edit">
            <Edit2 size={13} />
          </button>
          <button className="pg-btn-view" onClick={() => onViewDetail(vendor)} title="View detail">
            <Eye size={13} />
          </button>
        </div>
      </div>

      <div className="pg-card__body">
        <div className="pg-card__row">
          <Phone size={12} className="pg-card__row-icon" />
          <span className="pg-card__row-text">{vendor.mobileNo}</span>
        </div>

        {vendor.email && (
          <div className="pg-card__row">
            <Mail size={12} className="pg-card__row-icon" />
            <span className="pg-card__row-text" style={{ wordBreak: 'break-all' }}>{vendor.email}</span>
          </div>
        )}

        <div className="pg-card__row">
          <MapPin size={12} className="pg-card__row-icon" />
          <span className="pg-card__row-text">
            {[vendor.city, vendor.state].filter(Boolean).join(', ') || '—'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, paddingTop: 8, borderTop: '1px solid #eeeefc' }}>
          <StatusBadge isActive={vendor.isActive} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   VIEW DETAILS MODAL
 ═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   HOARDING MULTI SELECT COMBO
 ═══════════════════════════════════════════ */
function HoardingMultiSelectCombo({ value, options, onChange, loading, hasError }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);

  const selectedIds = Array.isArray(value) ? value : [];

  const filtered = options.filter(opt => {
    const q = query.toLowerCase();
    return (
      (opt.hoardingCode || '').toLowerCase().includes(q) ||
      (opt.material || '').toLowerCase().includes(q)
    );
  });

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (!wrapRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, close]);

  const toggleOpen = () => {
    setOpen(!open);
    if (!open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleToggleOption = (id) => {
    let next;
    if (selectedIds.includes(id)) {
      next = selectedIds.filter(x => x !== id);
    } else {
      next = [...selectedIds, id];
    }
    onChange(next);
  };

  const selectedOptions = options.filter(opt => selectedIds.includes(opt.hoardingID));

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        ref={triggerRef}
        className={`pg-field-wrap pg-combo-trigger ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        onClick={toggleOpen}
        style={{ cursor: 'pointer', minHeight: '38px', height: 'auto', padding: '6px 12px' }}
      >
        <Building2 size={14} color="#c0c0d8" style={{ flexShrink: 0, marginTop: selectedOptions.length > 0 ? 4 : 0 }} />
        
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4, minWidth: 0 }}>
          {selectedOptions.length === 0 ? (
            <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 500, color: '#b0b0c8' }}>
              {loading ? 'Loading external hoardings...' : 'Select external hoardings…'}
            </span>
          ) : (
            selectedOptions.map(opt => (
              <div
                key={opt.hoardingID}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'rgba(4,158,223,0.08)',
                  border: '1px solid rgba(4,158,223,0.2)',
                  borderRadius: 6,
                  padding: '2px 6px',
                  gap: 4,
                  fontSize: 12,
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 700,
                  color: '#049edf',
                  maxWidth: '100%',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.hoardingCode} ({opt.material})
                </span>
                <X
                  size={12}
                  style={{ cursor: 'pointer', flexShrink: 0, color: '#80c8eb' }}
                  onClick={() => handleToggleOption(opt.hoardingID)}
                />
              </div>
            ))
          )}
        </div>

        <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0, marginLeft: 'auto' }} />
      </div>

      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position: 'static', maxHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <div className="pg-combo-search" style={{ flexShrink: 0 }}>
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="pg-combo-search__input"
              placeholder="Search hoardings..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
          </div>
          <div className="pg-combo-list" style={{ overflowY: 'auto', flex: 1, maxHeight: '200px' }}>
            {loading ? (
              <div className="pg-combo-empty" style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                <Loader2 size={12} className="pg-spin" color="#049edf" /> Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="pg-combo-empty">No hoardings match</div>
            ) : (
              filtered.map(opt => {
                const isSelected = selectedIds.includes(opt.hoardingID);
                return (
                  <div
                    key={opt.hoardingID}
                    className={`pg-combo-option${isSelected ? ' pg-combo-option--active' : ''}`}
                    onClick={() => handleToggleOption(opt.hoardingID)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      style={{ cursor: 'pointer', accentColor: '#049edf' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span className="pg-combo-option__name" style={{ fontWeight: 700, fontSize: '12.5px' }}>
                        {opt.hoardingCode}
                      </span>
                      <span style={{ fontSize: '11px', color: '#9090a8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {opt.material} · Rent: ₹{opt.monthlyRent || '0'} · {opt.width}x{opt.height} ft
                      </span>
                    </div>
                    {isSelected && <Check size={12} color="#049edf" style={{ flexShrink: 0 }} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ═══════════════════════════════════════════
   VIEW DETAILS MODAL
 ═══════════════════════════════════════════ */
function ViewModal({ vendor, onClose, onEdit }) {
  const [hoardingDetails, setHoardingDetails] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHoardingDetails = async () => {
      const ids = vendor.hoardingId || [];
      if (ids.length === 0) return;
      setLoading(true);
      try {
        const data = await apiService.getAllExternalHoardings();
        const list = Array.isArray(data) ? data : data?.$values ?? data?.data ?? [];
        const latest = getLatestActiveExternalHoardings(list);
        const filtered = latest.filter(h => ids.map(Number).includes(Number(h.hoardingID)));
        setHoardingDetails(filtered);
      } catch (err) {
        console.error("Failed to load hoarding details for view:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHoardingDetails();
  }, [vendor.hoardingId]);

  if (!vendor) return null;

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
    <div className="pg-overlay pg-overlay--view" /* onClick={e => e.target === e.currentTarget && onClose()} */>
      <div className="pg-modal pg-modal--view" style={{ maxWidth: 580 }}>
        <div className="pg-view__banner">
          <button className="pg-view__close" onClick={onClose}><X size={15} /></button>
          <div className="pg-view__banner-content">
            <div className="pg-view__avatar"><UserCircle size={30} color="#fff" /></div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h4 className="pg-view__name" style={{ wordBreak: 'break-word', margin: 0 }}>{vendor.vendorName}</h4>
                <StatusBadge isActive={vendor.isActive} />
              </div>
              {vendor.contactPerson && (
                <div className="pg-view__aka" style={{ marginTop: 4 }}>Contact Person: {vendor.contactPerson}</div>
              )}
            </div>
          </div>
          <div className="pg-view__pill">
            <MapPin size={11} color="rgba(255,255,255,0.85)" />
            <span className="pg-view__pill-text">
              {[vendor.city, vendor.state].filter(Boolean).join(', ') || '—'}
            </span>
          </div>
        </div>

        <div className="pg-view__body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <div className="pg-view__section-label">General & Contact</div>
          <InfoRow icon={Phone} label="Mobile Number" value={vendor.mobileNo} highlight />
          <InfoRow icon={Mail} label="Email Address" value={vendor.email} highlight />
          <InfoRow icon={Home} label="Address" value={vendor.address} />
          <InfoRow icon={MapPin} label="Pincode" value={vendor.pincode} />

          <div className="pg-view__section-label pg-view__section-label--mt">Tax & Registration</div>
          <InfoRow icon={ShieldCheck} label="GSTIN" value={vendor.gstin} highlight />
          <InfoRow icon={ShieldCheck} label="PAN Number" value={vendor.panNo} />

          <div className="pg-view__section-label pg-view__section-label--mt">Bank Account Details</div>
          <InfoRow icon={Building2} label="Bank Name" value={vendor.bankName} />
          <InfoRow icon={Building2} label="Branch Name" value={vendor.branchName} />
          <InfoRow icon={CreditCard} label="Account Number" value={vendor.accountNo} />
          <InfoRow icon={Hash} label="IFSC Code" value={vendor.ifscCode} highlight />

          {loading ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 16 }}>
              <Loader2 size={14} className="pg-spin" color="#049edf" />
              <span style={{ fontSize: 13, color: '#9090a8', fontFamily: 'Nunito,sans-serif' }}>Loading associated hoardings...</span>
            </div>
          ) : hoardingDetails.length > 0 && (
            <>
              <div className="pg-view__section-label pg-view__section-label--mt">Associated External Hoardings</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {hoardingDetails.map(h => (
                  <div
                    key={h.hoardingID}
                    style={{
                      background: 'rgba(4,158,223,0.08)',
                      border: '1px solid rgba(4,158,223,0.2)',
                      borderRadius: 8,
                      padding: '6px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: 120,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e' }}>{h.hoardingCode}</span>
                    <span style={{ fontSize: 11, color: '#7878a0', marginTop: 2 }}>{h.material}</span>
                    <span style={{ fontSize: 11, color: '#9090a8', marginTop: 1 }}>{h.width}x{h.height} ft</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="pg-view__foot">
          <button className="pg-btn-cancel" onClick={onClose}>Close</button>
          <button className="pg-view__btn-edit" onClick={() => { onClose(); onEdit(vendor); }}>
            <Edit2 size={13} /> Edit Vendor
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ADD / EDIT MODAL
 ═══════════════════════════════════════════ */
function VendorFormModal({ onClose, onSaved, editData }) {
  const isEdit = !!editData;
  const [form, setForm] = useState(isEdit ? { ...editData } : { ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const [availableHoardings, setAvailableHoardings] = useState([]);
  const [allExternalHoardings, setAllExternalHoardings] = useState([]);
  const [loadingHoardings, setLoadingHoardings] = useState(false);

  useEffect(() => {
    const fetchHoardings = async () => {
      setLoadingHoardings(true);
      try {
        const [availRes, allRes] = await Promise.all([
          apiService.getAllExternalAvailableForVendor().catch(() => []),
          apiService.getAllExternalHoardings().catch(() => []),
        ]);
        const availList = Array.isArray(availRes) ? availRes : availRes?.$values ?? availRes?.data ?? [];
        const allList = Array.isArray(allRes) ? allRes : allRes?.$values ?? allRes?.data ?? [];
        setAvailableHoardings(availList);
        setAllExternalHoardings(allList);
      } catch (err) {
        console.error('Failed to load external hoardings:', err);
      } finally {
        setLoadingHoardings(false);
      }
    };
    fetchHoardings();
  }, []);

  const dropdownOptions = useMemo(() => {
    const availFiltered = getLatestActiveExternalHoardings(availableHoardings);
    const allFiltered = getLatestActiveExternalHoardings(allExternalHoardings);
    const availIds = new Set(availFiltered.map(h => h.hoardingID));

    const currentAssignedIds = (form.hoardingId || []).map(Number);
    const extraAssigned = allFiltered.filter(h =>
      currentAssignedIds.includes(Number(h.hoardingID)) && !availIds.has(h.hoardingID)
    );

    return [...availFiltered, ...extraAssigned];
  }, [availableHoardings, allExternalHoardings, form.hoardingId]);

  useEffect(() => {
    if (isEdit && editData?.vendorID) {
      const fetchDetail = async () => {
        try {
          const res = await apiService.getVendorById(editData.vendorID);
          const raw = res?.data ?? res;
          if (raw) {
            setForm(normalizeVendor(raw));
          }
        } catch (err) {
          console.error('Failed to load vendor details by ID:', err);
        }
      };
      fetchDetail();
    }
  }, [isEdit, editData]);

  const runValidate = (f) => {
    const e = {};
    FIELDS.forEach(({ key, required, type }) => {
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

    setSubmitting(true);
    setApiError('');

    try {
      const payload = toPayload(form);
      let saved;

      if (isEdit) {
        // PUT accepts the same payload structure as POST (camelCase keys)
        const response = await apiService.updateVendor(payload);
        const raw = response?.data ?? response;
        saved = (raw && typeof raw === 'object' && (raw.vendor_ID ?? raw.vendorID))
          ? normalizeVendor(raw)
          : { ...editData, ...form };
      } else {
        const response = await apiService.createVendor(payload);
        const raw = response?.data ?? response;
        saved = normalizeVendor(raw);
      }

      setSuccess(true);
      await new Promise(r => setTimeout(r, 600));
      onSaved(saved, isEdit);
      onClose();
    } catch (err) {
      console.error('Save vendor error:', err);
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to save Vendor details.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="pg-overlay">
      <div className="pg-modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><UserCircle size={20} color="#049edf" /></div>
            <div>
              <h5 className="pg-modal__title">{isEdit ? 'Edit Vendor' : 'Add New Vendor'}</h5>
              <p className="pg-modal__subtitle">{isEdit ? `Editing: ${editData.vendorName}` : 'Provide details for the new vendor'}</p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* API error banner */}
        {apiError && (
          <div style={{ margin: '0 24px 8px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11, color: '#dc2626', fontSize: 13, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertCircle size={15} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>{apiError}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="pg-modal__body" style={{ padding: '16px 24px' }}>
          <div className="row g-3">
            {FIELDS.map(f => {
              const isFieldTouched = touched[f.key];
              const fieldError = errors[f.key];

              return (
                <div key={f.key} className={`col-12 col-md-${f.col}`}>
                  <FieldLabel label={f.label} required={f.required} optional={!f.required} />
                  
                  {f.type === 'combo-state' ? (
                    <StateCombo
                      value={form.state}
                      onChange={val => handleChange('state', val)}
                      onBlur={() => handleBlur('state')}
                      hasError={isFieldTouched && !!fieldError}
                    />
                  ) : f.type === 'combo-status' ? (
                    <StatusDropdown
                      value={form.isActive}
                      onChange={val => handleChange('isActive', val)}
                    />
                  ) : f.type === 'combo-hoarding' ? (
                    <HoardingMultiSelectCombo
                      value={form.hoardingId}
                      options={dropdownOptions}
                      onChange={val => handleChange('hoardingId', val)}
                      loading={loadingHoardings}
                      hasError={isFieldTouched && !!fieldError}
                    />
                  ) : (
                    <InputWrap error={isFieldTouched && !!fieldError} icon={f.icon}>
                      <input
                        className="pg-field-input"
                        placeholder={f.placeholder}
                        value={form[f.key] ?? ''}
                        onChange={e => handleChange(f.key, e.target.value)}
                        onBlur={() => handleBlur(f.key)}
                        autoComplete="off"
                      />
                    </InputWrap>
                  )}
                  {isFieldTouched && <FieldError msg={fieldError} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pg-modal__foot" style={{ padding: '16px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="pg-btn-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="pg-btn-add"
            onClick={handleSubmit}
            disabled={submitting || success}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="pg-spin" /> Saving...
              </>
            ) : success ? (
              <>
                <Check size={14} /> Saved!
              </>
            ) : (
              <>
                <Check size={14} /> Save Vendor
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   MAIN VENDOR PAGE
 ═══════════════════════════════════════════ */
export default function VendorPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  /* -- Filter & Search -- */
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('vendorID');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* -- Modals -- */
  const [detailVendor, setDetailVendor] = useState(null);
  const [formVendor, setFormVendor] = useState(null); // EMPTY_FORM triggers Add, existing triggers Edit

  const tableRef = useRef(null);
  const [tableReady, setTableReady] = useState(false);
  useEffect(() => { if (!loading) setTableReady(true); }, [loading]);
  useResizableColumns(tableRef, tableReady, [60, 160, 120, 140, 120, 100, 80, 80]);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const data = await apiService.getAllVendors();
      const list = (Array.isArray(data) ? data : data?.$values ?? data?.data ?? []).map(normalizeVendor);
      setVendors(list);
    } catch (err) {
      console.error('Failed to load vendors:', err);
      setApiError(err?.response?.data?.message || err?.message || 'Failed to fetch vendors from the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      setVendors(prev => prev.map(v => v.vendorID === saved.vendorID ? saved : v));
    } else {
      setVendors(prev => [saved, ...prev]);
    }
    loadVendors();
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  /* -- Filter / Sort -- */
  const filtered = vendors.filter(v => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      String(v.vendorID).includes(q) ||
      (v.vendorName || '').toLowerCase().includes(q) ||
      (v.contactPerson || '').toLowerCase().includes(q) ||
      (v.mobileNo || '').toLowerCase().includes(q) ||
      (v.city || '').toLowerCase().includes(q) ||
      (v.gstin || '').toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let av = a[sortKey];
    let bv = b[sortKey];

    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();

    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 14 }}>
      <Loader2 size={32} color="#049edf" className="pg-spin" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>Loading vendors...</span>
    </div>
  );

  return (
    <>
      {detailVendor && (
        <ViewModal
          vendor={detailVendor}
          onClose={() => setDetailVendor(null)}
          onEdit={(v) => setFormVendor(v)}
        />
      )}

      {formVendor && (
        <VendorFormModal
          editData={formVendor.vendorID ? formVendor : null}
          onClose={() => setFormVendor(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="pg-page">
        {/* Page Header */}
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">Vendors</h1>
            <p className="pg-header__subtitle">
              Manage your registered <strong>suppliers and service vendors</strong>.
            </p>
          </div>
          <button className="pg-btn-add" onClick={() => setFormVendor(EMPTY_FORM)}>
            <Plus size={16} /> Add Vendor
          </button>
        </div>

        {apiError && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11, marginBottom: 16, color: '#dc2626', fontSize: 13, fontWeight: 600, fontFamily: 'Nunito,sans-serif' }}>
            <AlertCircle size={14} /> {apiError}
          </div>
        )}

        {/* Toolbar & Container */}
        <div className="pg-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #f0f0f8', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(4,158,223,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={15} color="#049edf" />
              </div>
              <div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 16, fontWeight: 900, color: '#1a1a2e', lineHeight: 1 }}>{sorted.length}</div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 600, color: '#9090a8', lineHeight: 1, marginTop: 2 }}>
                  Vendor{sorted.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Search Box */}
            <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: '#f4f4fb', borderRadius: 10, border: '1.5px solid #ececf8' }}>
              <Search size={14} color="#9090a8" style={{ flexShrink: 0 }} />
              <input
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}
                placeholder="Search by ID, name, contact person, mobile, city..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && <X size={13} style={{ cursor: 'pointer', color: '#9090a8', flexShrink: 0 }} onClick={() => setSearch('')} />}
            </div>

            <button
              onClick={loadVendors}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1.5px solid #e8e8f4', background: '#fff', color: '#5a5a78', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="pg-desktop-table" style={{ overflowX: 'auto' }}>
            <table ref={tableRef} className="pg-table" style={{ minWidth: 900, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  {[
                    { key: 'vendorID', label: 'ID', w: '6%' },
                    { key: 'vendorName', label: 'Vendor Name', w: '24%' },
                    { key: 'contactPerson', label: 'Contact Person', w: '16%' },
                    { key: 'mobileNo', label: 'Mobile No', w: '14%' },
                    { key: 'city', label: 'City', w: '12%' },
                    { key: 'state', label: 'State', w: '12%' },
                    { key: 'isActive', label: 'Status', w: '10%' },
                    { key: null, label: 'Actions', w: '6%' }
                  ].map((col, idx) => (
                    <th
                      key={idx} style={{ width: col.w }}
                      className={['pg-th', col.key ? 'pg-th--sort' : ''].filter(Boolean).join(' ')}
                      onClick={() => col.key && handleSort(col.key)}
                    >
                      <div className="pg-th__inner">
                        {col.label}
                        {col.key && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="pg-td pg-empty">
                      <div className="pg-empty__inner">
                        <Users size={36} color="#d0d0e8" />
                        <span className="pg-empty__label">No vendors found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map(v => (
                    <tr key={v.vendorID} className="pg-tr">
                      <td className="pg-td" style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 800, color: '#049edf' }}>
                        #{v.vendorID}
                      </td>
                      <td className="pg-td pg-td--overflow" style={{ fontWeight: 800, color: '#1a1a2e' }}>
                        <span className="pg-td__ellipsis" title={v.vendorName}>{v.vendorName}</span>
                      </td>
                      <td className="pg-td pg-td--overflow">
                        <span className="pg-td__ellipsis" title={v.contactPerson || '—'}>{v.contactPerson || <span style={{ color: '#c0c0d8' }}>—</span>}</span>
                      </td>
                      <td className="pg-td" style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700 }}>
                        {v.mobileNo}
                      </td>
                      <td className="pg-td pg-td--overflow">
                        <span className="pg-td__ellipsis" title={v.city}>{v.city || '—'}</span>
                      </td>
                      <td className="pg-td pg-td--overflow">
                        <span className="pg-td__ellipsis" title={v.state}>{v.state || '—'}</span>
                      </td>
                      <td className="pg-td">
                        <StatusBadge isActive={v.isActive} />
                      </td>
                      <td className="pg-td">
                        <div className="pg-action-wrap">
                          <button className="pg-btn-edit" onClick={() => setFormVendor(v)} title="Edit" style={{ width: 28, height: 28 }}>
                            <Edit2 size={12} />
                          </button>
                          <button className="pg-btn-view" onClick={() => setDetailVendor(v)} title="View detail" style={{ width: 28, height: 28 }}>
                            <Eye size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <Users size={36} color="#d0d0e8" />
                <span className="pg-empty__label">No vendors found</span>
              </div>
            ) : (
              paginated.map(v => (
                <VendorCard
                  key={v.vendorID}
                  vendor={v}
                  onViewDetail={setDetailVendor}
                  onEdit={setFormVendor}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {sorted.length > pageSize && (
            <div className="pg-pagination">
              <div className="pg-pagination__left">
                <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
                <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
                {pageNums.map((p, i) => p === '…'
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
          )}
        </div>
      </div>
    </>
  );
}
