import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Plus, Phone, Home, Globe, Building2, MapPin, Search, Users, RefreshCw,
  X, AlertCircle, Check, Edit2, Eye, ChevronDown, ChevronUp,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Filter, Mail, Loader2, CheckCircle2, CreditCard, Percent, Landmark, Trash2
} from 'lucide-react';
import './Common1.css';
import { apiService } from '../api/api';
import { useResizableColumns } from '../hooks/useResizableColumns';

/* ═══════════════════════════════════════════
   CONSTANTS & SCHEMA
   ═══════════════════════════════════════════ */
const PAGE_SIZE_OPTIONS = [10, 12, 15, 20];

const STATUS_OPTIONS = ['Active', 'Inactive'];
const STATUS_COLORS = {
  'Active': { color: '#16a34a', bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.20)' },
  'Inactive': { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.20)' },
};

const EMPTY_FORM = {
  companyID: 0,
  companyName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
  contactPerson: '',
  mobileNo: '',
  email: '',
  website: '',
  gstin: '',
  panNo: '',
  bankName: '',
  branchName: '',
  accountNo: '',
  ifscCode: '',
  accountHolderName: '',
  isActive: true
};

const FIELDS = [
  // SECTION: Basic details
  { key: 'companyName', label: 'Company Name', placeholder: 'e.g. Jalaram Advertisers Pvt Ltd', required: true, type: 'text', col: 12 },
  
  // SECTION: Contact Info
  { key: 'contactPerson', label: 'Contact Person', placeholder: 'e.g. Ramesh Patel', required: true, type: 'text', col: 6 },
  { key: 'mobileNo', label: 'Mobile No', placeholder: 'e.g. 9876543210', required: true, type: 'tel', col: 6 },
  { key: 'email', label: 'Email Address', placeholder: 'e.g. ramesh@example.com', required: true, type: 'email', col: 6 },
  { key: 'website', label: 'Website', placeholder: 'e.g. www.jalaramad.com', required: false, type: 'text', col: 6 },
  
  // SECTION: Address details
  { key: 'addressLine1', label: 'Address Line 1', placeholder: 'Street / Building name', required: true, type: 'text', col: 12 },
  { key: 'addressLine2', label: 'Address Line 2', placeholder: 'Area / Locality (optional)', required: false, type: 'text', col: 12 },
  { key: 'city', label: 'City', placeholder: 'e.g. Ahmedabad', required: true, type: 'text', col: 4 },
  { key: 'state', label: 'State', placeholder: 'Select state…', required: true, type: 'state', col: 4 },
  { key: 'pincode', label: 'Pincode', placeholder: 'e.g. 380001', required: true, type: 'text', col: 4 },
  { key: 'country', label: 'Country', placeholder: 'India', required: true, type: 'readonly', col: 6 },
  { key: 'isActive', label: 'Status', placeholder: 'Select status…', required: true, type: 'status', col: 6 },
  
  // SECTION: Tax Details
  { key: 'gstin', label: 'GSTIN', placeholder: 'e.g. 24AAAAB1234C1Z0', required: false, type: 'gstin', col: 6 },
  { key: 'panNo', label: 'PAN No', placeholder: 'e.g. ABCDE1234F', required: false, type: 'pan', col: 6 },
  
  // SECTION: Bank Details
  { key: 'bankName', label: 'Bank Name', placeholder: 'e.g. HDFC Bank', required: false, type: 'text', col: 6 },
  { key: 'branchName', label: 'Branch Name', placeholder: 'e.g. Bodakdev', required: false, type: 'text', col: 6 },
  { key: 'accountHolderName', label: 'Account Holder Name', placeholder: 'e.g. Jalaram Advertisers', required: false, type: 'text', col: 6 },
  { key: 'accountNo', label: 'Account Number', placeholder: 'e.g. 50200098765432', required: false, type: 'text', col: 6 },
  { key: 'ifscCode', label: 'IFSC Code', placeholder: 'e.g. HDFC0000048', required: false, type: 'ifsc', col: 6 },
];

/* ═══════════════════════════════════════════
   VALIDATION REGEX & HELPER
   ═══════════════════════════════════════════ */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const PINCODE_REGEX = /^\d{6}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

function validateField(key, value, type, required) {
  const v = (value === null || value === undefined ? '' : value).toString().trim();
  if (required && !v) return 'This field is required';
  if (!v) return '';
  if (type === 'readonly') return '';
  if (type === 'email' && !EMAIL_REGEX.test(v)) return 'Enter a valid email address';
  if (type === 'tel' && !PHONE_REGEX.test(v)) return 'Enter a valid 10-digit mobile number';
  if (key === 'pincode' && !PINCODE_REGEX.test(v)) return 'Enter a valid 6-digit pincode';
  if (type === 'ifsc' && !IFSC_REGEX.test(v.toUpperCase())) return 'Enter a valid 11-character IFSC code (e.g. HDFC0000048)';
  if (type === 'gstin' && !GSTIN_REGEX.test(v.toUpperCase())) return 'Enter a valid 15-character GSTIN';
  if (type === 'pan' && !PAN_REGEX.test(v.toUpperCase())) return 'Enter a valid 10-character PAN number';
  return '';
}

function runValidate(form) {
  const errs = {};
  FIELDS.forEach(({ key, required, type }) => {
    const e = validateField(key, form[key], type, required);
    if (e) errs[key] = e;
  });
  return errs;
}

/* ═══════════════════════════════════════════
   NORMALIZE / SERIALIZE COMPANY DATA
   ═══════════════════════════════════════════ */
function normalizeCompany(raw) {
  return {
    companyID: raw.company_ID ?? raw.companyID ?? raw.CompanyID ?? 0,
    companyName: raw.company_Name ?? raw.companyName ?? raw.CompanyName ?? '',
    addressLine1: raw.address_Line1 ?? raw.addressLine1 ?? raw.AddressLine1 ?? '',
    addressLine2: raw.address_Line2 ?? raw.addressLine2 ?? raw.AddressLine2 ?? '',
    city: raw.city ?? raw.City ?? '',
    state: raw.state ?? raw.State ?? '',
    country: raw.country ?? raw.Country ?? 'India',
    pincode: raw.pincode ?? raw.Pincode ?? '',
    contactPerson: raw.contact_Person ?? raw.contactPerson ?? raw.ContactPerson ?? '',
    mobileNo: raw.mobile_No ?? raw.mobileNo ?? raw.MobileNo ?? '',
    email: raw.email ?? raw.Email ?? '',
    website: raw.website ?? raw.Website ?? '',
    gstin: raw.gstin ?? raw.Gstin ?? raw.GSTIN ?? '',
    panNo: raw.paN_No ?? raw.panNo ?? raw.PanNo ?? raw.PANNo ?? '',
    bankName: raw.bank_Name ?? raw.bankName ?? raw.BankName ?? '',
    branchName: raw.branch_Name ?? raw.branchName ?? raw.BranchName ?? '',
    accountNo: raw.account_No ?? raw.accountNo ?? raw.AccountNo ?? '',
    ifscCode: raw.ifsC_Code ?? raw.ifscCode ?? raw.IfscCode ?? raw.IFSCCode ?? '',
    accountHolderName: raw.account_Holder_Name ?? raw.accountHolderName ?? raw.AccountHolderName ?? '',
    isActive: raw.is_Active ?? raw.isActive ?? raw.IsActive ?? false,
  };
}

function serializeCompany(form) {
  return {
    companyID: Number(form.companyID ?? 0),
    companyName: String(form.companyName || '').trim(),
    addressLine1: String(form.addressLine1 || '').trim(),
    addressLine2: String(form.addressLine2 || '').trim(),
    city: String(form.city || '').trim(),
    state: String(form.state || '').trim(),
    country: String(form.country || '').trim(),
    pincode: String(form.pincode || '').trim(),
    contactPerson: String(form.contactPerson || '').trim(),
    mobileNo: String(form.mobileNo || '').trim(),
    email: String(form.email || '').trim(),
    website: String(form.website || '').trim(),
    gstin: String(form.gstin || '').trim().toUpperCase(),
    panNo: String(form.panNo || '').trim().toUpperCase(),
    bankName: String(form.bankName || '').trim(),
    branchName: String(form.branchName || '').trim(),
    accountNo: String(form.accountNo || '').trim(),
    ifscCode: String(form.ifscCode || '').trim().toUpperCase(),
    accountHolderName: String(form.accountHolderName || '').trim(),
    isActive: !!form.isActive
  };
}

/* ═══════════════════════════════════════════
   SORT / BADGE COMPONENTS
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

function StatusBadge({ isActive }) {
  const statusStr = isActive ? 'Active' : 'Inactive';
  const c = STATUS_COLORS[statusStr];
  if (!c) return <span className="pg-td__dash">—</span>;
  return (
    <span className="pg-sitetype-pill" style={{ color: c.color, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
      {statusStr}
    </span>
  );
}

/* ═══════════════════════════════════════════
   PORTAL DROPDOWN
   ═══════════════════════════════════════════ */
function PortalDropdown({ open, triggerRef, panelRef, children }) {
  const [style, setStyle] = useState({ position: 'fixed', top: 0, left: 0, width: 0, zIndex: 99999 });
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const panelH = panelRef.current?.offsetHeight || 120;
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

function StatusDropdown({ value, onChange, onBlur, hasError }) {
  const [open, setOpen] = useState(false);
  const [wasOpened, setWasOpened] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
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

  const select = (val) => { onChange(val); setOpen(false); setWasOpened(false); };
  const openDD = () => { setOpen(o => !o); setWasOpened(true); setTimeout(() => listRef.current?.querySelectorAll('.pg-combo-option')?.[0]?.focus(), 0); };
  const nav = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx = Array.from(items || []).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') close();
  };

  const statusLabel = value ? 'Active' : 'Inactive';
  const activeColor = STATUS_COLORS[statusLabel]?.color || '#c0c0d8';

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
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: activeColor,
          transition: 'background 0.2s',
        }} />
        <span className="pg-combo-display" style={{ color: activeColor }}>
          {statusLabel}
        </span>
        <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
      </div>

      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel pg-combo-panel--sm" style={{ position: 'static' }}>
          <div className="pg-combo-list" ref={listRef}>
            {STATUS_OPTIONS.map(opt => {
              const sc = STATUS_COLORS[opt];
              const optVal = opt === 'Active';
              return (
                <div
                  key={opt}
                  className={`pg-combo-option${optVal === value ? ' pg-combo-option--active' : ''}`}
                  onClick={() => select(optVal)}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(optVal); }
                    else nav(e);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc?.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700, color: sc?.color }}>
                      {opt}
                    </span>
                  </span>
                  {optVal === value && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ═══════════════════════════════════════════
   INDIA STATES CONSTANT
   ═══════════════════════════════════════════ */
const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

/* ═══════════════════════════════════════════
   STATE COMBO COMPONENT (using PortalDropdown)
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
      >
        <MapPin size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
        <span className={`pg-combo-display${!value ? ' pg-combo-display--placeholder' : ''}`}>
          {value || 'Select state…'}
        </span>
        {value
          ? <X size={13} className="pg-combo-clear" onClick={clear} />
          : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>

      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position: 'static' }}>
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="pg-combo-search__input"
              placeholder="Search state…"
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
   VIEW MODAL
   ═══════════════════════════════════════════ */
function ViewModal({ company, onClose, onEdit }) {
  if (!company) return null;

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

  return ReactDOM.createPortal(
    <div className="pg-overlay pg-overlay--view" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal pg-modal--view" style={{ maxWidth: 650 }}>
        <div className="pg-view__banner">
          <button className="pg-view__close" onClick={onClose}><X size={15} /></button>
          <div className="pg-view__banner-content">
            <div className="pg-view__avatar" style={{ borderRadius: 10, background: 'rgba(255,255,255,0.2)' }}>
              <Building2 size={30} color="#fff" />
            </div>
            <div>
              <h4 className="pg-view__name">{company.companyName}</h4>
              
              {/* Status pill */}
              <div className="pg-view__pill" style={{ marginTop: 8 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: company.isActive ? '#16a34a' : '#dc2626',
                  flexShrink: 0,
                }} />
                <span className="pg-view__pill-text" style={{ color: company.isActive ? '#16a34a' : '#dc2626' }}>
                  {company.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div className="pg-view__pill">
            <MapPin size={11} color="rgba(255,255,255,0.85)" />
            <span className="pg-view__pill-text">
              {[company.city, company.state, company.country].filter(Boolean).join(', ')}
            </span>
          </div>
        </div>

        <div className="pg-view__body" style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
          <div className="row g-4">
            
            {/* Column 1: Contact & Address */}
            <div className="col-12 col-md-6">
              <div className="pg-view__section-label">Contact Details</div>
              <InfoRow icon={Users} label="Contact Person" value={company.contactPerson} highlight />
              <InfoRow icon={Phone} label="Mobile Number" value={company.mobileNo} highlight />
              <InfoRow icon={Mail} label="Email Address" value={company.email} highlight />
              <InfoRow icon={Globe} label="Website" value={company.website} />

              <div className="pg-view__section-label pg-view__section-label--mt">Address</div>
              <InfoRow icon={Home} label="Address Line 1" value={company.addressLine1} />
              <InfoRow icon={Home} label="Address Line 2" value={company.addressLine2} />
              <InfoRow icon={Building2} label="City" value={company.city} />
              <InfoRow icon={MapPin} label="State / Pincode" value={`${company.state} - ${company.pincode}`} />
              <InfoRow icon={Globe} label="Country" value={company.country} />
            </div>

            {/* Column 2: Tax & Banking */}
            <div className="col-12 col-md-6">
              <div className="pg-view__section-label">Tax & Registration</div>
              <InfoRow icon={Percent} label="GSTIN" value={company.gstin} highlight />
              <InfoRow icon={CreditCard} label="PAN No" value={company.panNo} />

              <div className="pg-view__section-label pg-view__section-label--mt">Banking Details</div>
              <InfoRow icon={Landmark} label="Bank Name" value={company.bankName} highlight />
              <InfoRow icon={MapPin} label="Branch Name" value={company.branchName} />
              <InfoRow icon={Users} label="Account Holder" value={company.accountHolderName} />
              <InfoRow icon={CreditCard} label="Account Number" value={company.accountNo} />
              <InfoRow icon={Landmark} label="IFSC Code" value={company.ifscCode} />
            </div>

          </div>
        </div>

        <div className="pg-view__foot">
          <button className="pg-btn-cancel" onClick={onClose}>Close</button>
          <button className="pg-view__btn-edit" onClick={() => { onClose(); onEdit(company); }}>
            <Edit2 size={13} /> Edit Company
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   COMPANY FORM MODAL
   ═══════════════════════════════════════════ */
function CompanyModal({ onClose, onSaved, editData }) {
  const isEdit = !!editData;

  const [form, setForm] = useState(() => {
    if (isEdit) return { ...editData };
    const saved = sessionStorage.getItem('unsaved_company_details_form');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { ...EMPTY_FORM };
  });

  useEffect(() => {
    if (!isEdit) {
      sessionStorage.setItem('unsaved_company_details_form', JSON.stringify(form));
    }
  }, [form, isEdit]);

  const handleCancel = () => {
    sessionStorage.removeItem('unsaved_company_details_form');
    onClose();
  };
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (key, value) => {
    setForm(p => ({ ...p, [key]: value }));
    if (touched[key]) {
      const f = FIELDS.find(f => f.key === key);
      setErrors(p => ({ ...p, [key]: validateField(key, value, f.type, f.required) }));
    }
  };

  const handleBlur = (key) => {
    setTouched(p => ({ ...p, [key]: true }));
    const f = FIELDS.find(f => f.key === key);
    setErrors(p => ({ ...p, [key]: validateField(key, form[key], f.type, f.required) }));
  };

  const handleSubmit = async () => {
    const allTouched = {};
    FIELDS.forEach(f => { allTouched[f.key] = true; });
    setTouched(allTouched);
    
    const errs = runValidate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setApiError('');
    try {
      const payload = serializeCompany(form);
      let saved;
      if (isEdit) {
        const res = await apiService.updateCompanyDetails(payload);
        const raw = res?.data ?? res;
        saved = (raw && typeof raw === 'object' && (raw.company_ID ?? raw.companyID))
          ? normalizeCompany(raw)
          : { ...editData, ...form };
      } else {
        const res = await apiService.createCompanyDetails(payload);
        const raw = res?.data ?? res;
        saved = normalizeCompany(raw);
      }

      setSuccess(true);
      await new Promise(r => setTimeout(r, 600));
      // ── START: Clear unsaved draft on save success ──
      sessionStorage.removeItem('unsaved_company_details_form');
      // ── END: Clear unsaved draft on save success ──
      onSaved(saved, isEdit);
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to save Company details.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(isEdit ? { ...editData } : { ...EMPTY_FORM });
    setErrors({});
    setTouched({});
    setSuccess(false);
    setApiError('');
  };

  return ReactDOM.createPortal(
    <div className="pg-overlay">
      <div className="pg-modal" style={{ maxWidth: 800 }}>
        
         <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><Building2 size={20} color="#049edf" /></div>
            <div>
              <h5 className="pg-modal__title">{isEdit ? 'Edit Company Details' : 'Add Company Details'}</h5>
              <p className="pg-modal__subtitle">
                {isEdit ? `Editing: ${editData.companyName}` : 'Fill in the company details and save.'}
              </p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={handleCancel}><X size={15} /></button>
        </div>

        <div className="pg-modal__body" style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
          {apiError && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#dc2626', fontSize: 13, fontWeight: 600, marginBottom: 16, fontFamily: 'Nunito,sans-serif' }}>
              <AlertCircle size={15} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{apiError}</span>
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, marginBottom: 16, fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
              <CheckCircle2 size={16} />
              {isEdit ? 'Company details updated successfully!' : 'Company details saved successfully!'}
            </div>
          )}

          <div className="row g-3">
            {FIELDS.map(({ key, label, placeholder, required, type, col }) => {
              const hasErr = !!errors[key];
              const isRO = type === 'readonly';
              const isStatus = type === 'status';
              const wrapCls = `pg-field-wrap ${isRO ? 'pg-field-wrap--readonly' : hasErr ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`;

              return (
                <div key={key} className={`col-12 col-sm-${col}`}>
                  <label className="pg-field-label">
                    {label}{' '}
                    {isRO
                      ? <span className="pg-field-label__fixed">🔒 Fixed</span>
                      : required
                        ? <span className="pg-field-label__required">*</span>
                        : <span className="pg-field-label__optional">(optional)</span>}
                  </label>

                  {isStatus ? (
                    <>
                      <StatusDropdown
                        value={form[key]}
                        onChange={val => handleChange(key, val)}
                        onBlur={() => handleBlur(key)}
                        hasError={hasErr}
                      />
                      {hasErr && (
                        <div className="pg-field-error">
                          <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span>{errors[key]}</span>
                        </div>
                      )}
                    </>
                  ) : type === 'state' ? (
                    <>
                      <StateCombo
                        value={form[key]}
                        onChange={val => handleChange(key, val)}
                        onBlur={() => handleBlur(key)}
                        hasError={hasErr}
                      />
                      {hasErr && (
                        <div className="pg-field-error">
                          <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span>{errors[key]}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className={wrapCls}>
                        <input
                          type={type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'text'}
                          placeholder={placeholder}
                          value={form[key] === null || form[key] === undefined ? '' : form[key]}
                          readOnly={isRO}
                          className={`pg-field-input${isRO ? ' pg-field-input--readonly' : ''}`}
                          onChange={e => !isRO && handleChange(key, e.target.value)}
                          onBlur={() => !isRO && handleBlur(key)}
                        />
                      </div>
                      {hasErr && (
                        <div className="pg-field-error">
                          <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span>{errors[key]}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <p className="pg-form__note" style={{ marginTop: 20 }}>
            <span className="pg-field-label__required">*</span> Required fields &nbsp;·&nbsp; Optional fields may be left blank.
          </p>
        </div>

        <div className="pg-modal__foot">
          <button className="pg-btn-cancel" onClick={handleCancel} disabled={submitting}>Close</button>
          <button className="pg-btn-save" onClick={handleSubmit} disabled={submitting}>
            {success
              ? <><Check size={14} /> Saved!</>
              : submitting
                ? <><RefreshCw size={13} className="pg-spin" /> Saving…</>
                : <><Plus size={14} /> {isEdit ? 'Save Changes' : 'Save Company Details'}</>}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   MOBILE COMPANY CARD
   ═══════════════════════════════════════════ */
function CompanyCard({ company, onView, onEdit, loadingDetailId }) {
  const isLoading = loadingDetailId === company.companyID;
  return (
    <div className="pg-card">
      <div className="pg-card__header">
        <div className="pg-card__title-wrap">
          <div className="pg-card__title">{company.companyName}</div>
          <span className="pg-sitetype-pill" style={{ color: company.isActive ? '#16a34a' : '#dc2626', marginTop: 4, display: 'inline-block' }}>
            {company.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="pg-card__actions">
          {isLoading ? (
            <Loader2 size={13} className="pg-spin" color="#049edf" style={{ margin: '0 8px' }} />
          ) : (
            <>
              <button className="pg-card__btn-edit" onClick={() => onEdit(company)} title="Edit"><Edit2 size={13} /></button>
              <button className="pg-card__btn-view" onClick={() => onView(company)} title="View"><Eye size={13} /></button>
            </>
          )}
        </div>
      </div>
      <div className="pg-card__body">
        <div className="pg-card__grid2">
          <div className="pg-card__grid-cell">
            <Users size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <span className="pg-card__grid-text">{company.contactPerson || '—'}</span>
          </div>
          <div className="pg-card__grid-cell">
            <Phone size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <span className="pg-card__grid-text">{company.mobileNo || '—'}</span>
          </div>
        </div>
        {company.email && (
          <div className="pg-card__row">
            <Mail size={12} color="#c0c0d8" className="pg-card__row-icon" />
            <span className="pg-card__row-text--ellipsis">{company.email}</span>
          </div>
        )}
        <div className="pg-card__row">
          <Building2 size={12} color="#c0c0d8" className="pg-card__row-icon" />
          <span className="pg-card__row-text">{company.city || '—'}</span>
        </div>
        {company.gstin && (
          <div className="pg-card__row">
            <Percent size={12} color="#c0c0d8" className="pg-card__row-icon" />
            <span className="pg-card__row-text">GST: {company.gstin}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function CompanyDetailsPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [loadingDetailId, setLoadingDetailId] = useState(null);

  // ── START: Restore showModal if unsaved company details form exists ──
  // const [showModal, setShowModal] = useState(false);
  const [showModal, setShowModal] = useState(() => {
    return sessionStorage.getItem('unsaved_company_details_form') !== null;
  });
  // ── END: Restore showModal if unsaved company details form exists ──
  const [editCompany, setEditCompany] = useState(null); // null = Add, object = Edit
  const [viewCompany, setViewCompany] = useState(null);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('companyName');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await apiService.getAllCompanyDetails();
      const list =
        Array.isArray(res) ? res :
          Array.isArray(res?.data) ? res.data :
            Array.isArray(res?.$values) ? res.$values : [];
      setCompanies(list.map(normalizeCompany));
    } catch (err) {
      setFetchError(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load company details. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      setCompanies(prev => prev.map(c => c.companyID === saved.companyID ? saved : c));
    } else {
      setCompanies(prev => [saved, ...prev]);
    }
  };

  /* ── Resizable columns ── */
  const tableRef = useRef(null);
  const [tableReady, setTableReady] = useState(false);
  useEffect(() => { if (!loading) setTableReady(true); }, [loading]);
  useResizableColumns(tableRef, tableReady, [220, 150, 110, 170, 130, 90, 95]);

  const handleStartNew = () => { setEditCompany(null); setShowModal(true); };

  const handleView = async (c) => {
    if (loadingDetailId) return;
    setLoadingDetailId(c.companyID);
    try {
      const res = await apiService.getCompanyDetailsById(c.companyID);
      const raw = res?.data ?? res;
      setViewCompany(normalizeCompany(raw));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err?.message || 'Failed to fetch company details.');
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleEdit = async (c) => {
    if (loadingDetailId) return;
    setLoadingDetailId(c.companyID);
    try {
      const res = await apiService.getCompanyDetailsById(c.companyID);
      const raw = res?.data ?? res;
      setEditCompany(normalizeCompany(raw));
      setShowModal(true);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err?.message || 'Failed to fetch company details.');
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleEditDirect = (c) => {
    setEditCompany(c);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditCompany(null); };

  /* ── Filter / sort / paginate ── */
  const filtered = companies.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.companyName || '').toLowerCase().includes(q) ||
      (c.contactPerson || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.mobileNo || '').includes(search) ||
      (c.city || '').toLowerCase().includes(q) ||
      (c.gstin || '').toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = (a[sortKey] || '').toString().toLowerCase();
    const bv = (b[sortKey] || '').toString().toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const COLS = [
    { key: 'companyName', label: 'Company Name', w: '22%' },
    { key: 'contactPerson', label: 'Contact Person', w: '15%' },
    { key: 'mobileNo', label: 'Mobile No', w: '11%' },
    { key: 'email', label: 'Email', w: '17%', tabletHide: true },
    { key: 'gstin', label: 'GSTIN', w: '13%', tabletHide: true },
    { key: 'isActive', label: 'Status', w: '9%' },
    { key: '_action', label: 'Actions', w: '9.5%', noSort: true },
  ];

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
      <Loader2 size={32} color="#049edf" className="pg-spin" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>Loading company details…</span>
    </div>
  );

  /* ── Fetch error ── */
  if (fetchError) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14 }}>
      <AlertCircle size={28} color="#ef4444" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#ef4444', fontSize: 14, fontWeight: 600 }}>{fetchError}</span>
      <button className="pg-btn-add" onClick={fetchData}><RefreshCw size={13} /> Retry</button>
    </div>
  );

  return (
    <>
      <div className="pg-page">

        {/* Page Header */}
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">Company Details</h1>
            <p className="pg-header__subtitle">
              Manage your <strong>company profile</strong>, tax parameters, and banking information.
            </p>
          </div>
          <button className="pg-btn-add" onClick={handleStartNew}>
            <Plus size={14} /> Add Company
          </button>
        </div>

        {/* Container */}
        <div className="pg-container">

          {/* Toolbar */}
          <div className="pg-toolbar">
            <div className="pg-toolbar__inner">
              <div className="pg-toolbar__count">
                <Building2 size={14} color="#9090a8" />
                <span><strong>{filtered.length}</strong> compan{filtered.length !== 1 ? 'ies' : 'y'}</span>
              </div>
              <div className="pg-search-box" style={{ width: '400px' }}>
                <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
                <input
                  placeholder="Search by company name, contact, email, city or GSTIN…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="pg-desktop-table">
            <table className="pg-table" ref={tableRef}>
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      style={{ width: col.w }}
                      className={[
                        'pg-th',
                        col.noSort ? '' : 'pg-th--sort',
                        col.tabletHide ? 'pg-tablet-hide' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => !col.noSort && handleSort(col.key)}
                    >
                      <div className="pg-th__inner">
                        {col.label}
                        {!col.noSort
                          ? <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                          : <Filter size={10} color="#d0d0e4" style={{ marginLeft: 5 }} />}
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
                        <Building2 size={36} color="#d0d0e8" />
                        <span className="pg-empty__label">No company details found</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((c, idx) => (
                  <tr key={c.companyID ?? idx} className="pg-tr">

                    {/* Company Name */}
                    <td className="pg-td pg-td--overflow">
                      <div className="pg-td__primary" style={{ fontWeight: 700 }}>{c.companyName}</div>
                    </td>

                    {/* Contact Person */}
                    <td className="pg-td">
                      <span style={{ color: '#4a5568' }}>{c.contactPerson || '—'}</span>
                    </td>

                    {/* Mobile No */}
                    <td className="pg-td">
                      <span style={{ color: '#4a5568' }}>{c.mobileNo || '—'}</span>
                    </td>

                    {/* Email */}
                    <td className="pg-td pg-td--overflow pg-tablet-hide">
                      <span className="pg-td__ellipsis" title={c.email}
                        style={{ color: c.email ? '#4a5568' : '#c0c0d8' }}>
                        {c.email || '—'}
                      </span>
                    </td>

                    {/* GSTIN */}
                    <td className="pg-td pg-tablet-hide">
                      <span style={{ color: '#4a5568', fontFamily: 'monospace' }}>{c.gstin || '—'}</span>
                    </td>

                    {/* Status */}
                    <td className="pg-td"><StatusBadge isActive={c.isActive} /></td>

                    {/* Actions */}
                    <td className="pg-td">
                      <div className="pg-action-wrap">
                        {loadingDetailId === c.companyID ? (
                          <Loader2 size={13} className="pg-spin" color="#049edf" style={{ margin: '0 10px' }} />
                        ) : (
                          <>
                            <button className="pg-btn-edit" onClick={() => handleEdit(c)} title="Edit">
                              <Edit2 size={13} />
                            </button>
                            <button className="pg-btn-view" onClick={() => handleView(c)} title="View">
                              <Eye size={13} />
                            </button>
                          </>
                        )}
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
                <Building2 size={36} color="#d0d0e8" />
                <span className="pg-empty__label">No company details found</span>
              </div>
            ) : paginated.map((c, idx) => (
              <CompanyCard
                key={c.companyID ?? idx}
                company={c}
                onView={handleView}
                onEdit={handleEdit}
                loadingDetailId={loadingDetailId}
              />
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
                  : <button key={p} className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`}
                    onClick={() => setPage(p)}>{p}</button>
              )}
              <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={13} />
              </button>
              <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
                <ChevronsRight size={13} />
              </button>
            </div>
            <div className="pg-pagination__right">
              <select className="pg-pagesize-select" value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
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

      {/* Add / Edit modal */}
      {showModal && (
        <CompanyModal
          onClose={closeModal}
          onSaved={handleSaved}
          editData={editCompany}
        />
      )}

      {/* View modal */}
      {viewCompany && (
        <ViewModal
          company={viewCompany}
          onClose={() => setViewCompany(null)}
          onEdit={c => { setViewCompany(null); handleEditDirect(c); }}
        />
      )}
    </>
  );
}
