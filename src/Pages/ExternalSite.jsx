import React, { useState, useRef, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  MapPin, Plus, Home, Globe,
  Building2, Search, RefreshCw,
  X, AlertCircle, Check, Edit2, Eye, ChevronDown, ShieldCheck,
  ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Filter, Layers, Navigation, UserCircle, Loader2, ToggleLeft,
  AlertTriangle, CheckCircle, Users, Hash,
} from 'lucide-react';
import './Common1.css';
import { apiService } from '../api/api';
import { useResizableColumns } from '../hooks/useResizableColumns';

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const SITE_TYPE_OPTIONS = [
  'Residential', 'Commercial', 'Panchayat', 'Nagar Palika',
  'Maha Nagar Palika', 'PWD', 'Immigation', 'Farm', 'Dandi Marg', 'No Record'
];
const STATUS_OPTIONS = ['Active', 'Inactive'];

const TYPE_COLORS = {
  Residential: { color: '#4a5568' },
  Commercial: { color: '#4a5568' },
  Panchayat: { color: '#4a5568' },
  'Nagar Palika': { color: '#4a5568' },
  'Maha Nagar Palika': { color: '#4a5568' },
  PWD: { color: '#4a5568' },
  Immigation: { color: '#4a5568' },
  Farm: { color: '#4a5568' },
  'Dandi Marg': { color: '#4a5568' },
  'No Record': { color: '#4a5568' },
};

const STATUS_COLORS = {
  Active: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  Inactive: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

function StatusBadge({ status }) {
  if (!status) return <span className="pg-td__dash">—</span>;
  const isOk = status.toLowerCase() === 'active';
  const cls = isOk ? 'hd-status-active' : 'hd-status-inactive';
  const Icon = isOk ? CheckCircle : AlertCircle;
  return (
    <span className={`hd-status-badge ${cls}`}>
      <Icon size={10} />
      {status}
    </span>
  );
}

const GUJARAT_DISTRICTS = [
  'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha',
  'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod',
  'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath',
  'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar',
  'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal',
  'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat',
  'Surendranagar', 'Tapi', 'Vadodara', 'Valsad',
];

const EMPTY_FORM = {
  addressLine1: '',
  addressLine2: '',
  addressLine3: '',
  landmark: '',
  city: '',
  district: '',
  state: 'Gujarat',
  pincode: '',
  siteType: '',
  country: 'India',
  vendorID: '',
  status: 'Active',
};

const PAGE_SIZE_OPTIONS = [10, 12, 15, 20];

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
      const flipUp = (window.innerHeight - r.bottom) < panelH + 8 && r.top > panelH + 8;
      setStyle({
        position: 'fixed',
        top: flipUp ? r.top - panelH - 4 : r.bottom + 4,
        left: r.left,
        width: r.width,
        zIndex: 99999
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, triggerRef, panelRef]);

  if (!open) return null;
  return ReactDOM.createPortal(<div ref={panelRef} style={style}>{children}</div>, document.body);
}

function useOutsideClick(wrapRef, panelRef, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!(wrapRef.current?.contains(e.target)) && !(panelRef.current?.contains(e.target))) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, wrapRef, panelRef, onClose]);
}

/* ─────────────────────────────────────────
   NORMALIZE HELPERS
───────────────────────────────────────── */
function normalizeOutsideSite(raw) {
  const rawStatus = raw.status ?? raw.Status;
  const statusStr =
    rawStatus === true || rawStatus === 1 || rawStatus === '1' ? 'Active'
      : rawStatus === false || rawStatus === 0 || rawStatus === '0' ? 'Inactive'
        : typeof rawStatus === 'string' ? rawStatus
          : 'Active';

  return {
    outsideSiteID: raw.outsideSiteID ?? raw.OutsideSiteID ?? raw.id ?? raw.Id ?? 0,
    addressLine1: raw.addressLine1 ?? raw.AddressLine1 ?? '',
    addressLine2: raw.addressLine2 ?? raw.AddressLine2 ?? '',
    addressLine3: raw.addressLine3 ?? raw.AddressLine3 ?? '',
    landmark: raw.landmark ?? raw.Landmark ?? '',
    city: raw.city ?? raw.City ?? '',
    district: raw.district ?? raw.District ?? '',
    state: raw.state ?? raw.State ?? 'Gujarat',
    pincode: raw.pincode ?? raw.Pincode ?? '',
    siteType: SITE_TYPE_OPTIONS.includes(raw.siteType ?? raw.SiteType ?? '')
      ? (raw.siteType ?? raw.SiteType)
      : '',
    country: raw.country ?? raw.Country ?? 'India',
    vendorID: raw.vendorID ?? raw.VendorID ?? raw.vendorId ?? raw.VendorId ?? null,
    status: statusStr,
  };
}

function normalizeVendor(raw) {
  return {
    _id: raw.vendorID ?? raw.VendorID ?? raw.vendorId ?? raw.VendorId ?? raw.id ?? raw.Id,
    vendorName: raw.vendorName ?? raw.VendorName ?? raw.name ?? raw.Name ?? '',
    phone: raw.phone ?? raw.Phone ?? raw.phone1 ?? raw.Phone1 ?? '',
    city: raw.city ?? raw.City ?? '',
  };
}

/* ─────────────────────────────────────────
   VALIDATION
───────────────────────────────────────── */
const ADDRESS_REGEX = /^[\w\s,.\-/'&#()]{1,200}$/;
const TEXT_REGEX = /^[a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s.\-]{0,99}$/;

function validateTextField(key, value, type, required) {
  const v = (value || '').trim();
  if (required && !v) return 'This field is required';
  if (!v) return '';
  if (type === 'address' && !ADDRESS_REGEX.test(v)) return "Only letters, digits, spaces and , . - / ' & # ( ) are allowed";
  if (type === 'text' && !TEXT_REGEX.test(v)) return 'Only letters, spaces, hyphens and dots are allowed';
  if (type === 'pincode' && v && !/^\d{6}$/.test(v)) return 'Pincode must be 6 digits';
  return '';
}

const TEXT_FIELDS = [
  { key: 'addressLine1', label: 'Address Line 1', icon: Home, placeholder: 'e.g. 14, Ring Road Cross', col: 12, required: true, type: 'address' },
  { key: 'addressLine2', label: 'Add-Facing', icon: Home, placeholder: 'e.g. Near Bus Stand', col: 6, required: false, type: 'address' },
  { key: 'addressLine3', label: 'Add-Towords', icon: Home, placeholder: 'e.g. Opp. City Mall', col: 6, required: false, type: 'address' },
  { key: 'landmark', label: 'Landmark', icon: Navigation, placeholder: 'e.g. Near City Center', col: 6, required: false, type: 'address' },
  { key: 'city', label: 'City', icon: Building2, placeholder: 'e.g. Anand', col: 6, required: true, type: 'text' },
  { key: 'pincode', label: 'Pincode', icon: Hash, placeholder: 'e.g. 388001', col: 6, required: false, type: 'pincode' },
];

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

/* ═══════════════════════════════════════════
   DISTRICT COMBO
═══════════════════════════════════════════ */
function DistrictCombo({ value, onChange, onBlur, hasError }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [wasOpened, setWasOpened] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    if (wasOpened) { onBlur?.(); setWasOpened(false); }
  }, [wasOpened, onBlur]);

  useOutsideClick(wrapRef, panelRef, open, close);

  const filtered = GUJARAT_DISTRICTS.filter(d => d.toLowerCase().includes(query.toLowerCase()));
  const openDD = () => {
    setOpen(true);
    setWasOpened(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const select = (d) => { onChange(d); setOpen(false); setQuery(''); setWasOpened(false); };
  const clear = (e) => { e.stopPropagation(); onChange(''); setOpen(false); setQuery(''); setWasOpened(false); onBlur?.(); };

  const nav = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx = Array.from(items || []).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') close();
  };

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        ref={triggerRef}
        className={`pg-field-wrap pg-combo-trigger ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        onClick={openDD}
        tabIndex={0}
        onKeyDown={e => {
          if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDD(); }
          } else nav(e);
        }}
      >
        <MapPin size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
        <span className={`pg-combo-display${!value ? ' pg-combo-display--placeholder' : ''}`}>
          {value || 'Select district…'}
        </span>
        {value ? <X size={13} className="pg-combo-clear" onClick={clear} /> : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
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
            {filtered.length === 0 ? (
              <div className="pg-combo-empty">No districts match</div>
            ) : (
              filtered.map(d => (
                <div
                  key={d}
                  className={`pg-combo-option${d === value ? ' pg-combo-option--active' : ''}`}
                  onClick={() => select(d)}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(d); }
                    else nav(e);
                  }}
                >
                  <span className="pg-combo-option__name">{d}</span>
                  {d === value && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                </div>
              ))
            )}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ═══════════════════════════════════════════
   VENDOR COMBO
═══════════════════════════════════════════ */
function VendorCombo({ value, onChange, onBlur, hasError, vendors }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [wasOpened, setWasOpened] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    if (wasOpened) { onBlur?.(); setWasOpened(false); }
  }, [wasOpened, onBlur]);

  useOutsideClick(wrapRef, panelRef, open, close);

  const selected = vendors.find(v => v._id === value || v._id === Number(value));
  const filtered = vendors.filter(v =>
    (v.vendorName || '').toLowerCase().includes(query.toLowerCase()) ||
    String(v._id).includes(query) ||
    (v.city || '').toLowerCase().includes(query.toLowerCase())
  );

  const openDD = () => {
    setOpen(true);
    setWasOpened(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const select = (v) => { onChange(v._id); setOpen(false); setQuery(''); setWasOpened(false); };
  const clear = (e) => { e.stopPropagation(); onChange(''); setOpen(false); setQuery(''); setWasOpened(false); onBlur?.(); };

  const nav = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx = Array.from(items || []).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') close();
  };

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        ref={triggerRef}
        className={`pg-field-wrap pg-combo-trigger ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        onClick={openDD}
        tabIndex={0}
        onKeyDown={e => {
          if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDD(); }
          } else nav(e);
        }}
      >
        <Building2 size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
        <span className={`pg-combo-display${!selected ? ' pg-combo-display--placeholder' : ''}`}>
          {selected ? selected.vendorName : vendors.length === 0 ? 'Loading vendors…' : 'Select vendor…'}
        </span>
        {selected ? <X size={13} className="pg-combo-clear" onClick={clear} /> : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position: 'static' }}>
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="pg-combo-search__input"
              placeholder="Search by name or ID…"
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
            {vendors.length === 0 ? (
              <div className="pg-combo-empty">No vendors available</div>
            ) : filtered.length === 0 ? (
              <div className="pg-combo-empty">No vendors match</div>
            ) : (
              filtered.map(v => (
                <div
                  key={v._id}
                  className={`pg-combo-option${(v._id === value || v._id === Number(value)) ? ' pg-combo-option--active' : ''}`}
                  onClick={() => select(v)}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(v); }
                    else nav(e);
                  }}
                >
                  <span className="pg-combo-option__name">{v.vendorName}</span>
                  <span className="pg-combo-option__id">ID: {v._id}</span>
                  {(v._id === value || v._id === Number(value)) && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                </div>
              ))
            )}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ═══════════════════════════════════════════
   VENDOR FILTER COMBO (TOOLBAR)
═══════════════════════════════════════════ */
function VendorFilterCombo({ value, onChange, vendors }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);
  useOutsideClick(wrapRef, panelRef, open, close);

  const selected = vendors.find(v => String(v._id) === String(value));
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q
      ? vendors.filter(v =>
          (v.vendorName || '').toLowerCase().includes(q) ||
          String(v._id).includes(q) ||
          (v.city || '').toLowerCase().includes(q)
        )
      : vendors;
  }, [vendors, query]);

  const openDD = () => {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const select = (v) => { onChange(v ? String(v._id) : ''); setOpen(false); setQuery(''); };
  const clear = (e) => { e.stopPropagation(); onChange(''); setOpen(false); setQuery(''); };

  const nav = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx = Array.from(items || []).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') close();
  };

  return (
    <div className="pg-combo-wrap" ref={wrapRef} style={{ minWidth: 175, maxWidth: 220 }}>
      <div
        ref={triggerRef}
        className="pg-field-wrap pg-combo-trigger pg-field-wrap--normal"
        onClick={openDD}
        tabIndex={0}
        onKeyDown={e => {
          if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDD(); }
          } else nav(e);
        }}
        style={{
          background: '#f8f8fd',
          border: '1.5px solid #e8e8f4',
          borderRadius: 11,
          padding: '8px 12px',
          minHeight: 'unset',
          height: 38,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Building2 size={13} color="#049edf" style={{ flexShrink: 0 }} />
        <span
          className={`pg-combo-display${!selected ? ' pg-combo-display--placeholder' : ''}`}
          style={{ fontSize: 13, fontWeight: 700, color: selected ? '#1a1a2e' : '#4a5568' }}
        >
          {selected ? selected.vendorName : 'All Vendors'}
        </span>
        {selected ? (
          <X size={12} className="pg-combo-clear" onClick={clear} />
        ) : (
          <ChevronDown size={13} color="#9090a8" style={{ flexShrink: 0 }} />
        )}
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position: 'static' }}>
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="pg-combo-search__input"
              placeholder="Search vendor…"
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
            <div
              className={`pg-combo-option${!value ? ' pg-combo-option--active' : ''}`}
              onClick={() => select(null)}
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(null); }
                else nav(e);
              }}
            >
              <span className="pg-combo-option__name">All Vendors</span>
              {!value && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
            </div>
            {filtered.length === 0 ? (
              <div className="pg-combo-empty">No vendors match</div>
            ) : (
              filtered.map(v => (
                <div
                  key={v._id}
                  className={`pg-combo-option${String(v._id) === String(value) ? ' pg-combo-option--active' : ''}`}
                  onClick={() => select(v)}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(v); }
                    else nav(e);
                  }}
                >
                  <span className="pg-combo-option__name">{v.vendorName}</span>
                  <span className="pg-combo-option__id">ID: {v._id}</span>
                  {String(v._id) === String(value) && (
                    <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SITE TYPE DROPDOWN
═══════════════════════════════════════════ */
function SiteTypeDropdown({ value, onChange, onBlur, hasError }) {
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

  useOutsideClick(wrapRef, panelRef, open, close);
  const select = (v) => { onChange(v); setOpen(false); setWasOpened(false); };
  const clear = (e) => { e.stopPropagation(); onChange(''); setOpen(false); setWasOpened(false); onBlur?.(); };
  const openDD = () => { setOpen(o => !o); setWasOpened(true); setTimeout(() => listRef.current?.querySelectorAll('.pg-combo-option')?.[0]?.focus(), 0); };

  const nav = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx = Array.from(items || []).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') close();
  };

  const colors = (value && TYPE_COLORS[value]) ? TYPE_COLORS[value] : null;

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        ref={triggerRef}
        className={`pg-field-wrap pg-combo-trigger ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        onClick={openDD}
        tabIndex={0}
        onKeyDown={e => {
          if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDD(); }
          } else nav(e);
        }}
      >
        <Layers size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
        {value && colors ? (
          <span className="pg-sitetype-pill" style={{ color: colors.color }}>{value}</span>
        ) : (
          <span className="pg-combo-display pg-combo-display--placeholder">{value || 'Select site type…'}</span>
        )}
        {value ? <X size={13} className="pg-combo-clear" onClick={clear} /> : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel pg-combo-panel--sm" style={{ position: 'static' }}>
          <div className="pg-combo-list" ref={listRef}>
            {SITE_TYPE_OPTIONS.map(opt => (
              <div
                key={opt}
                className={`pg-combo-option${opt === value ? ' pg-combo-option--active' : ''}`}
                onClick={() => select(opt)}
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(opt); }
                  else nav(e);
                }}
              >
                <span className="pg-sitetype-pill" style={{ color: TYPE_COLORS[opt].color }}>{opt}</span>
                {opt === value && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STATUS DROPDOWN
═══════════════════════════════════════════ */
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

  useOutsideClick(wrapRef, panelRef, open, close);
  const select = (v) => { onChange(v); setOpen(false); setWasOpened(false); };
  const clear = (e) => { e.stopPropagation(); onChange(''); setOpen(false); setWasOpened(false); onBlur?.(); };
  const openDD = () => { setOpen(o => !o); setWasOpened(true); setTimeout(() => listRef.current?.querySelectorAll('.pg-combo-option')?.[0]?.focus(), 0); };

  const nav = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx = Array.from(items || []).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') close();
  };

  const colors = (value && STATUS_COLORS[value]) ? STATUS_COLORS[value] : null;

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        ref={triggerRef}
        className={`pg-field-wrap pg-combo-trigger ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        onClick={openDD}
        tabIndex={0}
        onKeyDown={e => {
          if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDD(); }
          } else nav(e);
        }}
      >
        <ShieldCheck size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
        {value && colors ? (
          <span className="pg-sitetype-pill" style={{ color: colors.color, backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}>
            {value}
          </span>
        ) : (
          <span className="pg-combo-display pg-combo-display--placeholder">{value || 'Select status…'}</span>
        )}
        {value ? <X size={13} className="pg-combo-clear" onClick={clear} /> : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel pg-combo-panel--sm" style={{ position: 'static' }}>
          <div className="pg-combo-list" ref={listRef}>
            {STATUS_OPTIONS.map(opt => (
              <div
                key={opt}
                className={`pg-combo-option${opt === value ? ' pg-combo-option--active' : ''}`}
                onClick={() => select(opt)}
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(opt); }
                  else nav(e);
                }}
              >
                <span className="pg-sitetype-pill" style={{ color: STATUS_COLORS[opt].color, backgroundColor: STATUS_COLORS[opt].bg, border: `1px solid ${STATUS_COLORS[opt].border}` }}>
                  {opt}
                </span>
                {opt === value && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   INACTIVE WARNING MODAL
═══════════════════════════════════════════════════ */
function InactiveWarningModal({ onConfirm, onCancel, saving }) {
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99998,
        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          animation: 'modalIn 0.24s cubic-bezier(0.22,1,0.36,1) both',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', padding: '22px 24px 18px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.22)', border: '2px solid rgba(255,255,255,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 18, color: '#fff', marginBottom: 2 }}>Inactivate External Site?</div>
              <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>Setting this site to inactive</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 14, fontWeight: 600, color: '#4a5568', lineHeight: 1.7, marginBottom: 14 }}>
            Are you sure you want to set this external site to <strong style={{ color: '#dc2626' }}>Inactive</strong>?
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '0 24px 22px' }}>
          <button
            onClick={onCancel} disabled={saving}
            style={{ padding: '10px 22px', borderRadius: 11, background: '#f5f5fb', border: '1.5px solid #e8e8f0', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: 13, color: '#7878a0' }}
          >
            No, Keep Active
          </button>
          <button
            onClick={onConfirm} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 11, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 13, boxShadow: '0 4px 14px rgba(217,119,6,0.38)', opacity: saving ? 0.75 : 1 }}
          >
            {saving ? <><Loader2 size={13} className="pg-spin" /> Saving…</> : <><Check size={13} /> Yes, Inactivate</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   ADD / EDIT MODAL
═══════════════════════════════════════════ */
function ExternalSiteModal({ onClose, onSaved, editData, vendors, changeTab }) {
  const isEdit = !!editData;
  const originalStatus = isEdit ? (editData?.status || 'Active') : 'Active';

  const [form, setForm] = useState(() => {
    if (isEdit) return { ...editData };
    const saved = sessionStorage.getItem('unsaved_external_site_form');
    const newVendorId = sessionStorage.getItem('newly_created_vendor_id');
    if (newVendorId) {
      sessionStorage.removeItem('newly_created_vendor_id');
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (newVendorId) {
          parsed.vendorID = Number(newVendorId);
        }
        return parsed;
      } catch (e) {}
    }
    if (newVendorId) {
      return { ...EMPTY_FORM, vendorID: Number(newVendorId) };
    }
    return { ...EMPTY_FORM };
  });

  useEffect(() => {
    if (!isEdit) {
      sessionStorage.setItem('unsaved_external_site_form', JSON.stringify(form));
    }
  }, [form, isEdit]);

  const handleCancel = () => {
    sessionStorage.removeItem('unsaved_external_site_form');
    sessionStorage.removeItem('newly_created_vendor_id');
    onClose();
  };

  const handleAddNewVendor = () => {
    sessionStorage.setItem('unsaved_external_site_form', JSON.stringify(form));
    sessionStorage.setItem('redirect_after_vendor_save', 'external-sites');
    sessionStorage.setItem('open_vendor_modal', 'true');
    if (typeof changeTab === 'function') {
      changeTab('vendors');
    }
  };

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showWarning, setShowWarning] = useState(false);

  const applyChange = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (touched[key]) {
      if (key === 'district') setErrors(p => ({ ...p, district: val ? '' : 'Please select a district' }));
      else if (key === 'vendorID') setErrors(p => ({ ...p, vendorID: val ? '' : 'Please select a vendor' }));
      else if (key === 'status') setErrors(p => ({ ...p, status: val ? '' : 'Please select a status' }));
      else {
        const tf = TEXT_FIELDS.find(f => f.key === key);
        if (tf) setErrors(p => ({ ...p, [key]: validateTextField(key, val, tf.type, tf.required) }));
      }
    }
  };

  const handleChange = (key, val) => {
    if (key === 'status' && isEdit && originalStatus === 'Active' && val === 'Inactive') {
      setShowWarning(true);
      return;
    }
    applyChange(key, val);
  };

  const handleConfirmInactive = () => {
    setShowWarning(false);
    applyChange('status', 'Inactive');
  };

  const handleCancelInactive = () => setShowWarning(false);

  const handleTextBlur = (key) => {
    setTouched(p => ({ ...p, [key]: true }));
    const tf = TEXT_FIELDS.find(f => f.key === key);
    if (tf) setErrors(p => ({ ...p, [key]: validateTextField(key, form[key], tf.type, tf.required) }));
  };

  const handleDropdownBlur = (key) => {
    setTouched(p => ({ ...p, [key]: true }));
    if (key === 'district') setErrors(p => ({ ...p, district: form.district ? '' : 'Please select a district' }));
    if (key === 'vendorID') setErrors(p => ({ ...p, vendorID: form.vendorID ? '' : 'Please select a vendor' }));
    if (key === 'status') setErrors(p => ({ ...p, status: form.status ? '' : 'Please select a status' }));
  };

  const runValidate = (f) => {
    const e = {};
    TEXT_FIELDS.forEach(({ key, required, type }) => {
      const err = validateTextField(key, f[key], type, required);
      if (err) e[key] = err;
    });
    if (!f.district) e.district = 'Please select a district';
    if (!f.vendorID) e.vendorID = 'Please select a vendor';
    if (!f.status) e.status = 'Please select a status';
    return e;
  };

  const handleSubmit = async () => {
    const allTouched = {};
    [...TEXT_FIELDS.map(f => f.key), 'district', 'siteType', 'vendorID', 'status'].forEach(k => { allTouched[k] = true; });
    setTouched(allTouched);
    const e = runValidate(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    if (isEdit && !editData.outsideSiteID) { setApiError('External Site ID missing — cannot update.'); return; }

    setSubmitting(true);
    setApiError('');
    try {
      if (isEdit) {
        await apiService.updateOutsideSite(editData.outsideSiteID, form);
      } else {
        await apiService.createOutsideSite(form);
      }

      setSuccess(true);
      await new Promise(r => setTimeout(r, 600));
      sessionStorage.removeItem('unsaved_external_site_form');
      onSaved();
      onClose();
    } catch (err) {
      setApiError(err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <>
      {showWarning && (
        <InactiveWarningModal
          onConfirm={handleConfirmInactive}
          onCancel={handleCancelInactive}
          saving={false}
        />
      )}

      <div className="pg-overlay">
        <div className="pg-modal" style={{ maxWidth: 640 }}>
          <div className="pg-modal__head">
            <div className="pg-modal__head-left">
              <div className="pg-modal__icon-wrap">
                <Globe size={20} color="#049edf" />
              </div>
              <div>
                <h5 className="pg-modal__title">{isEdit ? 'Edit External Site' : 'Add New External Site'}</h5>
                <p className="pg-modal__subtitle">
                  {isEdit ? `Editing: ${editData.addressLine1}` : 'Fill in the external site details below'}
                </p>
              </div>
            </div>
            <button className="pg-modal__close" onClick={handleCancel}><X size={15} /></button>
          </div>

          {apiError && (
            <div style={{ margin: '0 24px 4px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11, color: '#dc2626', fontSize: 12.5, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /><span>{apiError}</span>
            </div>
          )}

          <div className="pg-modal__body">
            <div className="row g-3">
              {TEXT_FIELDS.map(({ key, label, icon: Icon, placeholder, col, required, type }) => {
                const hasErr = !!errors[key];
                return (
                  <div key={key} className={`col-12 col-sm-${col}`}>
                    <label className="pg-field-label">
                      {label} {required
                        ? <span className="pg-field-label__required">*</span>
                        : <span className="pg-field-label__optional">(optional)</span>}
                    </label>
                    <div className={`pg-field-wrap ${hasErr ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                      <Icon size={14} color={hasErr ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                      <input
                        placeholder={placeholder}
                        value={form[key]}
                        className="pg-field-input"
                        onChange={e => handleChange(key, e.target.value)}
                        onBlur={() => handleTextBlur(key)}
                      />
                    </div>
                    {hasErr && (
                      <div className="pg-field-error">
                        <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} /><span>{errors[key]}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* District */}
              <div className="col-12 col-sm-6">
                <label className="pg-field-label">District <span className="pg-field-label__required">*</span></label>
                <DistrictCombo
                  value={form.district}
                  onChange={v => handleChange('district', v)}
                  onBlur={() => handleDropdownBlur('district')}
                  hasError={!!errors.district}
                />
                {errors.district && (
                  <div className="pg-field-error">
                    <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} /><span>{errors.district}</span>
                  </div>
                )}
              </div>

              {/* State */}
              <div className="col-12 col-sm-6">
                <label className="pg-field-label">State <span className="pg-field-label__optional">(optional)</span></label>
                <div className="pg-field-wrap pg-field-wrap--normal">
                  <MapPin size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
                  <input
                    placeholder="e.g. Gujarat"
                    value={form.state}
                    className="pg-field-input"
                    onChange={e => handleChange('state', e.target.value)}
                  />
                </div>
              </div>

              {/* Site Type */}
              <div className="col-12 col-sm-6">
                <label className="pg-field-label">Site Type <span className="pg-field-label__optional">(optional)</span></label>
                <SiteTypeDropdown
                  value={form.siteType}
                  onChange={v => handleChange('siteType', v)}
                  onBlur={() => handleDropdownBlur('siteType')}
                  hasError={!!errors.siteType}
                />
              </div>

              {/* Status */}
              <div className="col-12 col-sm-6">
                <label className="pg-field-label">
                  Status <span className="pg-field-label__required">*</span>
                </label>
                <StatusDropdown
                  value={form.status}
                  onChange={v => handleChange('status', v)}
                  onBlur={() => handleDropdownBlur('status')}
                  hasError={!!errors.status}
                />
                {errors.status && (
                  <div className="pg-field-error">
                    <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} /><span>{errors.status}</span>
                  </div>
                )}
              </div>

              {/* Country */}
              <div className="col-12 col-sm-6">
                <label className="pg-field-label">Country <span className="pg-field-label__fixed">🔒 Fixed</span></label>
                <div className="pg-field-wrap pg-field-wrap--readonly">
                  <Globe size={14} color="#049edf" style={{ flexShrink: 0 }} />
                  <input readOnly value={form.country} className="pg-field-input pg-field-input--readonly" />
                </div>
              </div>

              {/* Vendor Selector */}
              <div className="col-12">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label className="pg-field-label" style={{ marginBottom: 0 }}>
                    Vendor <span className="pg-field-label__required">*</span>
                    <span className="pg-field-label__hint"> — search by vendor name or ID</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddNewVendor}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'none',
                      border: 'none',
                      color: '#049edf',
                      fontFamily: 'Nunito,sans-serif',
                      fontSize: 12.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: 6,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                  >
                    <Plus size={13} color="#049edf" />
                    <span>Add New Vendor</span>
                  </button>
                </div>
                <VendorCombo
                  value={form.vendorID}
                  onChange={v => handleChange('vendorID', v)}
                  onBlur={() => handleDropdownBlur('vendorID')}
                  hasError={!!errors.vendorID}
                  vendors={vendors}
                />
                {errors.vendorID && (
                  <div className="pg-field-error">
                    <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} /><span>{errors.vendorID}</span>
                  </div>
                )}
                {form.vendorID && !errors.vendorID && (
                  <div className="pg-field-hint">Vendor ID stored: <strong>{form.vendorID}</strong></div>
                )}
              </div>
            </div>

            <p className="pg-form__note">
              <span className="pg-field-label__required">*</span> Required fields &nbsp;·&nbsp; Optional fields may be left blank
            </p>
          </div>

          <div className="pg-modal__foot">
            <button className="pg-btn-cancel" onClick={handleCancel} disabled={submitting}>Cancel</button>
            <button className="pg-btn-save" onClick={handleSubmit} disabled={submitting}>
              {success
                ? <><Check size={14} /> {isEdit ? 'Saved!' : 'Added!'}</>
                : submitting
                  ? <><RefreshCw size={13} className="pg-spin" /> Saving…</>
                  : <><Plus size={14} /> {isEdit ? 'Save Changes' : 'Add External Site'}</>
              }
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ─── Mobile External Site Card ─── */
function ExternalSiteCard({ s, onEdit, vendors }) {
  const typeColors = (s.siteType && TYPE_COLORS[s.siteType]) ? TYPE_COLORS[s.siteType] : null;
  const vendor = vendors.find(v => v._id === s.vendorID || v._id === Number(s.vendorID));
  return (
    <div className="pg-card">
      <div className="pg-card__header">
        <div className="pg-card__title-wrap">
          <div className="pg-card__title">{s.addressLine1}</div>
          {s.addressLine2 && <div className="pg-card__subtitle">{s.addressLine2}</div>}
        </div>
        <div className="pg-card__actions">
          <button className="pg-card__btn-edit" onClick={() => onEdit(s)}><Edit2 size={13} /></button>
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
          <span className="pg-card__row-text">{s.city}{s.district !== s.city ? `, ${s.district}` : ''}</span>
        </div>
        {s.siteType && typeColors && (
          <div className="pg-card__row">
            <Layers size={12} color="#c0c0d8" className="pg-card__row-icon" />
            <span className="pg-sitetype-pill" style={{ color: typeColors.color }}>{s.siteType}</span>
          </div>
        )}
        {s.status && (
          <div className="pg-card__row">
            <ToggleLeft size={12} color="#c0c0d8" className="pg-card__row-icon" />
            <StatusBadge status={s.status} />
          </div>
        )}
        {vendor && (
          <div className="pg-card__row">
            <Users size={12} color="#c0c0d8" className="pg-card__row-icon" />
            <span className="pg-card__row-text--ellipsis">{vendor.vendorName} (ID: {vendor._id})</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EXTERNAL SITE PAGE
═══════════════════════════════════════════ */
export default function ExternalSitePage({ changeTab }) {
  const [sites, setSites] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  
  const [showModal, setShowModal] = useState(() => {
    return (
      sessionStorage.getItem('unsaved_external_site_form') !== null ||
      sessionStorage.getItem('newly_created_vendor_id') !== null
    );
  });

  useEffect(() => {
    if (sessionStorage.getItem('unsaved_external_site_form') !== null || sessionStorage.getItem('newly_created_vendor_id') !== null) {
      setShowModal(true);
    }
  }, []);

  const [editSite, setEditSite] = useState(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('addressLine1');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');

  const tableRef = useRef(null);
  const [tableReady, setTableReady] = useState(false);
  useEffect(() => { if (!loading) setTableReady(true); }, [loading]);
  useResizableColumns(tableRef, tableReady, [180, 130, 110, 120, 100, 90, 130, 70, 70]);

  const [refreshing, setRefreshing] = useState(false);

  /* ── Fetch from server ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [sitesRes, vendorsRes] = await Promise.all([
        vendorFilter
          ? apiService.getOutsideSitesByVendorId(vendorFilter)
          : apiService.getAllOutsideSites(),
        apiService.getAllVendors()
      ]);

      const siteList = Array.isArray(sitesRes)
        ? sitesRes
        : Array.isArray(sitesRes?.data)
          ? sitesRes.data
          : Array.isArray(sitesRes?.$values)
            ? sitesRes.$values
            : [];

      const vendorList = Array.isArray(vendorsRes)
        ? vendorsRes
        : Array.isArray(vendorsRes?.data)
          ? vendorsRes.data
          : Array.isArray(vendorsRes?.$values)
            ? vendorsRes.$values
            : [];

      setSites(siteList.map(normalizeOutsideSite));
      setVendors(vendorList.map(normalizeVendor));
    } catch (err) {
      setFetchError(err?.response?.data?.message || err?.message || 'Failed to load external sites data.');
    } finally {
      setLoading(false);
    }
  }, [vendorFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setFetchError('');
    setSearch('');
    setStatusFilter('');
    setVendorFilter('');
    setPage(1);
    try {
      const [sitesRes, vendorsRes] = await Promise.all([
        apiService.getAllOutsideSites(),
        apiService.getAllVendors()
      ]);

      const siteList = Array.isArray(sitesRes)
        ? sitesRes
        : Array.isArray(sitesRes?.data)
          ? sitesRes.data
          : Array.isArray(sitesRes?.$values)
            ? sitesRes.$values
            : [];

      const vendorList = Array.isArray(vendorsRes)
        ? vendorsRes
        : Array.isArray(vendorsRes?.data)
          ? vendorsRes.data
          : Array.isArray(vendorsRes?.$values)
            ? vendorsRes.$values
            : [];

      setSites(siteList.map(normalizeOutsideSite));
      setVendors(vendorList.map(normalizeVendor));
    } catch (err) {
      setFetchError(err?.response?.data?.message || err?.message || 'Failed to load external sites data.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const handleEditClick = async (site) => {
    try {
      // Fetch full details by ID to ensure accurate prefill
      const res = await apiService.getOutsideSiteById(site.outsideSiteID).catch(() => null);
      const data = res?.data ?? res ?? site;
      setEditSite(normalizeOutsideSite(data));
      setShowModal(true);
    } catch {
      setEditSite(site);
      setShowModal(true);
    }
  };

  const filtered = sites.filter(s => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (vendorFilter && String(s.vendorID) !== String(vendorFilter)) return false;

    const q = search.toLowerCase();
    const vendor = vendors.find(v => v._id === s.vendorID || v._id === Number(s.vendorID));
    return (
      (s.addressLine1 || '').toLowerCase().includes(q) ||
      (s.addressLine2 || '').toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q) ||
      (s.district || '').toLowerCase().includes(q) ||
      (s.landmark || '').toLowerCase().includes(q) ||
      (s.siteType || '').toLowerCase().includes(q) ||
      (s.status || '').toLowerCase().includes(q) ||
      (vendor?.vendorName || '').toLowerCase().includes(q)
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

  const handleSaved = useCallback(() => { fetchData(); }, [fetchData]);

  const COLS = [
    { key: 'addressLine1', label: 'Address Line 1', w: '18%' },
    { key: 'addressLine2', label: 'Address Line 2', w: '13%', tabletHide: true },
    { key: 'landmark', label: 'Landmark', w: '11%', tabletHide: true },
    { key: 'city', label: 'City / District', w: '12%' },
    { key: 'siteType', label: 'Site Type', w: '10%' },
    { key: 'status', label: 'Status', w: '9%' },
    { key: 'vendorID', label: 'Vendor', w: '13%', tabletHide: true },
    { key: 'country', label: 'Country', w: '7%', tabletHide: true },
    { key: '_action', label: 'Action', w: '7%', noSort: true },
  ];

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  if (loading && sites.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
      <Loader2 size={32} color="#049edf" className="pg-spin" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>Loading external sites…</span>
    </div>
  );

  if (fetchError && sites.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
      <AlertCircle size={28} color="#ef4444" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#ef4444', fontSize: 14 }}>{fetchError}</span>
      <button className="pg-btn-add" onClick={fetchData}><RefreshCw size={13} /> Retry</button>
    </div>
  );

  return (
    <>
      <div className="pg-page">
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">External Sites</h1>
            <p className="pg-header__subtitle">Manage all outside &amp; vendor advertising <strong>sites</strong> in one place.</p>
          </div>
          <button className="pg-btn-add" onClick={() => { setEditSite(null); setShowModal(true); }}>
            <Plus size={14} /> Add New External Site
          </button>
        </div>

        <div className="pg-container">
          <div className="pg-toolbar">
            <div className="pg-toolbar__inner">
              <div className="pg-toolbar__count">
                <Globe size={14} color="#9090a8" />
                <span><strong>{filtered.length}</strong> site{filtered.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="pg-search-box">
                <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
                <input
                  placeholder="Search by address, city, district, vendor, type, status…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
              </div>

              {/* Vendor Filter (System Dropdown UI) */}
              <VendorFilterCombo
                value={vendorFilter}
                onChange={v => { setVendorFilter(v); setPage(1); }}
                vendors={vendors}
              />

              {/* Status Filter */}
              <select
                className="hd-filter-select"
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              <button
                className="pg-pg-btn"
                onClick={handleRefresh}
                title="Refresh"
                style={{ marginLeft: 'auto' }}
                disabled={refreshing || loading}
              >
                <RefreshCw size={13} className={refreshing ? 'pg-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="pg-desktop-table">
            <table className="pg-table" ref={tableRef}>
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
                        {!col.noSort ? (
                          <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                        ) : (
                          <Filter size={10} color="#d0d0e4" style={{ marginLeft: 5 }} />
                        )}
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
                        <Globe size={36} color="#d0d0e8" />
                        <span className="pg-empty__label">No external sites found</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(s => {
                  const typeColors = s.siteType ? TYPE_COLORS[s.siteType] : null;
                  const vendor = vendors.find(v => v._id === s.vendorID || v._id === Number(s.vendorID));
                  return (
                    <tr key={s.outsideSiteID} className="pg-tr">
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
                        {s.siteType && typeColors ? (
                          <span className="pg-sitetype-pill" style={{ color: typeColors.color }}>{s.siteType}</span>
                        ) : (
                          <span className="pg-td__dash">—</span>
                        )}
                      </td>
                      <td className="pg-td"><StatusBadge status={s.status} /></td>
                      <td className="pg-td pg-td--overflow pg-tablet-hide">
                        {vendor ? (
                          <div>
                            <div className="pg-td__primary" style={{ fontSize: '12.5px' }}>{vendor.vendorName}</div>
                            <div className="pg-td__secondary">ID: {vendor._id}</div>
                          </div>
                        ) : (
                          <span className="pg-td__dash">—</span>
                        )}
                      </td>
                      <td className="pg-td pg-tablet-hide">
                        <span style={{ color: '#4a5568' }}>{s.country}</span>
                      </td>
                      <td className="pg-td">
                        <div className="pg-action-wrap">
                          <button className="pg-btn-view" onClick={() => handleEditClick(s)} title="Edit">
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

          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <Globe size={36} color="#d0d0e8" />
                <span className="pg-empty__label">No external sites found</span>
              </div>
            ) : (
              paginated.map(s => (
                <ExternalSiteCard
                  key={s.outsideSiteID}
                  s={s}
                  onEdit={handleEditClick}
                  vendors={vendors}
                />
              ))
            )}
          </div>

          <div className="pg-pagination">
            <div className="pg-pagination__left">
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
              {pageNums.map((p, i) => p === '…' ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span> : <button key={p} className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>)}
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
        <ExternalSiteModal
          onClose={() => { setShowModal(false); setEditSite(null); }}
          onSaved={handleSaved}
          editData={editSite}
          vendors={vendors}
          changeTab={changeTab}
        />
      )}
    </>
  );
}
