import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Plus, Search, X, AlertCircle, Check, Edit2,
  RefreshCw, Calendar, IndianRupee,
  Maximize2, Image as ImageIcon, Upload, Trash2,
  ZoomIn, ArrowLeft, Hash, Clock, Info, ShieldCheck,
  ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight,
  ChevronLeft, ChevronRight, MapPin, Layers,
  CheckCircle, Wrench, Eye, Replace, Loader2, AlertTriangle,
  User
} from 'lucide-react';
import { apiService, API_ROOT_URL } from '../api/api';
import './Common1.css';

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const MATERIAL_OPTIONS = ['Terrace Structure', 'Pillar Structure', 'Channel Set', 'Wooden Set'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Available', 'Occupied', 'Under Maintenance'];
const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];
const HISTORY_PER_PAGE = 3;

const EMPTY_VERSION = {
  effdt: '', material: '', hoardingType: '', status: 'Active',
  monthlyRent: '', width: '', height: '', siteID: '',
};

/* ─────────────────────────────────────────
   AUTH HELPER
───────────────────────────────────────── */
function getLoggedInUserId() {
  const directId = localStorage.getItem('userId');
  if (directId) return Number(directId);
  try {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    return Number(userData.userId || userData.id || userData.userID || 0);
  } catch { return 0; }
}

/* ─────────────────────────────────────────
   EFFDT → ISO DATETIME HELPER
───────────────────────────────────────── */
function toISODateTime(effdtRaw) {
  if (!effdtRaw) return new Date().toISOString();
  if (effdtRaw.includes('T')) return effdtRaw.endsWith('Z') ? effdtRaw : effdtRaw + 'Z';
  return new Date(effdtRaw + 'T00:00:00.000Z').toISOString();
}

/* ─────────────────────────────────────────
   DATA HELPERS
───────────────────────────────────────── */
function groupHoardingsByCode(flatRecords) {
  const map = {};
  flatRecords.forEach((rec) => {
    const code = rec.hoardingCode;
    if (!map[code]) map[code] = { hoardingCode: code, versions: [] };
    map[code].versions.push({
      hoardingID: rec.hoardingID,
      effdtRaw: rec.effdt || '',
      effdt: rec.effdt ? rec.effdt.split('T')[0] : '',
      material: rec.material || '',
      hoardingType: rec.hoardingType || '',
      status: rec.status || '',
      monthlyRent: rec.monthlyRent ?? '',
      width: rec.width ?? '',
      height: rec.height ?? '',
      siteID: rec.siteID || '',
    });
  });
  return Object.values(map);
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return d; }
}

function fmtCurrency(v) {
  if (v === '' || v == null) return '—';
  return '₹' + Number(v).toLocaleString('en-IN');
}

function latestVersion(h) {
  return [...h.versions].sort((a, b) => new Date(b.effdt) - new Date(a.effdt))[0];
}

function validateVersion(form, needEffdt) {
  const e = {};
  if (needEffdt && !form.effdt) e.effdt = 'Required';
  if (!form.material) e.material = 'Required';
  if (!form.hoardingType) e.hoardingType = 'Required';
  if (!form.status) e.status = 'Required';
  if (form.monthlyRent === '' || form.monthlyRent == null) e.monthlyRent = 'Required';
  if (form.width === '' || form.width == null) e.width = 'Required';
  else if (!Number.isInteger(Number(form.width)) || Number(form.width) <= 0)
    e.width = 'Must be a positive whole number';
  if (!form.siteID) e.siteID = 'Required';
  return e;
}

/* ─────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    'Active': { cls: 'hd-status-active', Icon: CheckCircle },
    'Available': { cls: 'hd-status-active', Icon: CheckCircle },
    'Inactive': { cls: 'hd-status-inactive', Icon: AlertCircle },
    'Under Maintenance': { cls: 'hd-status-maint', Icon: Wrench },
  };
  const { cls, Icon } = map[status] || { cls: 'hd-status-inactive', Icon: AlertCircle };
  return (
    <span className={`hd-status-badge ${cls}`}>
      <Icon size={10} />{status}
    </span>
  );
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
function FieldLabel({ label, required, readOnly }) {
  return (
    <label className="pg-field-label">
      {label}
      {required && <span className="pg-field-label__required"> *</span>}
      {readOnly && <span className="pg-field-label__fixed"> 🔒 Fixed</span>}
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
      <AlertCircle size={11} style={{ flexShrink: 0, marginTop: '1px' }} />
      <span>{msg}</span>
    </div>
  ) : null;
}

/* ═══════════════════════════════════════════════════════════════
   COMBO DROPDOWN  — portal-based so it always escapes overflow /
   backdrop-filter / stacking-context issues in modals & cards.
═══════════════════════════════════════════════════════════════ */
function ComboDropdown({
  value,
  onChange,
  onBlur,
  hasError,
  placeholder,
  icon: Icon,
  options,
  searchable = false,
  emptyText = 'No options',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [wasOpened, setWasOpened] = useState(false);
  const [panelStyle, setPanelStyle] = useState({ position: 'fixed', top: 0, left: 0, width: 0, zIndex: 99999 });

  const wrapRef = useRef(null);   // the whole combo wrapper
  const triggerRef = useRef(null);   // the visible trigger pill
  const panelRef = useRef(null);   // the floating panel
  const inputRef = useRef(null);   // search <input> inside panel
  const listRef = useRef(null);   // option list

  const selected = options.find(o => String(o.value) === String(value));

  const filtered = searchable
    ? options.filter(o =>
      o.label.toLowerCase().includes(query.toLowerCase()) ||
      (o.sub && o.sub.toLowerCase().includes(query.toLowerCase()))
    )
    : options;

  /* ── Position the portal panel under (or above) the trigger ── */
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const reposition = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const panelH = panelRef.current?.offsetHeight || 260;
      const flipUp = (window.innerHeight - r.bottom) < panelH + 8 && r.top > panelH + 8;
      setPanelStyle({
        position: 'fixed',
        top: flipUp ? r.top - panelH - 4 : r.bottom + 4,
        left: r.left,
        width: r.width,
        zIndex: 99999,
      });
    };

    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  /* ── Close on outside click ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const inWrap = wrapRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      if (!inWrap && !inPanel) {
        setOpen(false);
        setQuery('');
        if (wasOpened) { onBlur?.(); setWasOpened(false); }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, wasOpened, onBlur]);

  const openDropdown = () => {
    setOpen(true);
    setWasOpened(true);
    setQuery('');
    setTimeout(() => (
      searchable
        ? inputRef.current?.focus()
        : listRef.current?.querySelector('.pg-combo-option')?.focus()
    ), 0);
  };

  const closeDropdown = () => {
    setOpen(false);
    setQuery('');
    if (wasOpened) { onBlur?.(); setWasOpened(false); }
  };

  const select = (opt) => {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
    setWasOpened(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
    setWasOpened(false);
    onBlur?.();
  };

  /* Arrow-key navigation helpers */
  const navItems = () => listRef.current?.querySelectorAll('.pg-combo-option') ?? [];

  const handleTriggerKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); openDropdown();
      }
      return;
    }
    const items = navItems();
    const idx = Array.from(items).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') { closeDropdown(); }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); navItems()[0]?.focus(); }
    else if (e.key === 'Escape') { closeDropdown(); }
  };

  const handleOptionKeyDown = (e, opt) => {
    const items = navItems();
    const idx = Array.from(items).indexOf(e.currentTarget);
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(opt); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') { closeDropdown(); }
  };

  /* ── The floating panel rendered via portal ── */
  const panel = open ? ReactDOM.createPortal(
    <div ref={panelRef} style={panelStyle}>
      <div className="pg-combo-panel" style={{ position: 'static' }}>
        {searchable && (
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="pg-combo-search__input"
              placeholder="Search…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
          </div>
        )}
        <div className="pg-combo-list" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="pg-combo-empty">{emptyText}</div>
          ) : filtered.map(opt => (
            <div
              key={opt.value}
              className={`pg-combo-option${String(opt.value) === String(value) ? ' pg-combo-option--active' : ''}`}
              onClick={() => select(opt)}
              tabIndex={0}
              onKeyDown={e => handleOptionKeyDown(e, opt)}
            >
              <span className="pg-combo-option__name">{opt.label}</span>
              {opt.sub && <span className="pg-combo-option__id">{opt.sub}</span>}
              {String(opt.value) === String(value) && (
                <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      {/* Trigger */}
      <div
        ref={triggerRef}
        className={`pg-field-wrap pg-combo-trigger ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        onClick={openDropdown}
        tabIndex={0}
        onKeyDown={handleTriggerKeyDown}
      >
        {Icon && (
          <Icon size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
        )}
        <span className={`pg-combo-display${!selected ? ' pg-combo-display--placeholder' : ''}`}>
          {selected ? (
            <>
              {selected.label}
              {selected.sub && (
                <span className="pg-combo-option__id" style={{ marginLeft: 6 }}>{selected.sub}</span>
              )}
            </>
          ) : placeholder}
        </span>
        {selected
          ? <X size={13} className="pg-combo-clear" onClick={clear} />
          : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
        }
      </div>

      {/* Portal panel */}
      {panel}
    </div>
  );
}

/* ─────────────────────────────────────────
   VERSION FORM
───────────────────────────────────────── */
function VersionForm({ form, errors, onChange, isNewEffdt, sites, hoardingTypes }) {
  const siteOptions = sites.map(s => ({
    value: s.siteID,
    label: s.addressLine1,
    sub: s.city || '',
  }));

  const materialOptions = MATERIAL_OPTIONS.map(m => ({ value: m, label: m }));

  const typeOptions = hoardingTypes.map(t => ({
    value: t.hoardingType,
    label: t.typeName,
  }));

  const statusOptions = STATUS_OPTIONS.map(s => ({ value: s, label: s }));

  return (
    <div className="row g-3">

      {/* Effective Date */}
      <div className="col-12 col-md-4">
        <FieldLabel label="Effective Date" required={isNewEffdt} readOnly={!isNewEffdt} />
        <InputWrap error={errors.effdt} readOnly={!isNewEffdt} icon={Calendar}>
          <input
            className="pg-field-input"
            type="date"
            readOnly={!isNewEffdt}
            value={form.effdt || ''}
            onChange={e => isNewEffdt && onChange('effdt', e.target.value)}
            style={!isNewEffdt ? { color: '#049edf', cursor: 'not-allowed' } : {}}
          />
        </InputWrap>
        {!isNewEffdt && (
          <span className="pg-field-hint">Primary key — add a new version to change</span>
        )}
        <FieldError msg={errors.effdt} />
      </div>

      {/* Site */}
      <div className="col-12 col-md-4">
        <FieldLabel label="Site" required />
        <ComboDropdown
          value={form.siteID || ''}
          onChange={v => onChange('siteID', Number(v))}
          onBlur={() => { }}
          hasError={!!errors.siteID}
          placeholder="Select site…"
          icon={MapPin}
          options={siteOptions}
          searchable
          emptyText="No sites match"
        />
        <FieldError msg={errors.siteID} />
      </div>

      {/* Material */}
      <div className="col-12 col-md-4">
        <FieldLabel label="Material" required />
        <ComboDropdown
          value={form.material || ''}
          onChange={v => onChange('material', v)}
          onBlur={() => { }}
          hasError={!!errors.material}
          placeholder="Select material…"
          icon={Layers}
          options={materialOptions}
        />
        <FieldError msg={errors.material} />
      </div>

      {/* Hoarding Type */}
      <div className="col-12 col-md-4">
        <FieldLabel label="Hoarding Type" required />
        <ComboDropdown
          value={form.hoardingType || ''}
          onChange={v => onChange('hoardingType', Number(v))}
          onBlur={() => { }}
          hasError={!!errors.hoardingType}
          placeholder="Select type…"
          icon={Maximize2}
          options={typeOptions}
          searchable
          emptyText="No types match"
        />
        <FieldError msg={errors.hoardingType} />
      </div>

      {/* Status */}
      <div className="col-12 col-md-4">
        <FieldLabel label="Status" required />
        <ComboDropdown
          value={form.status || ''}
          onChange={v => onChange('status', v)}
          onBlur={() => { }}
          hasError={!!errors.status}
          placeholder="Select status…"
          icon={ShieldCheck}
          options={statusOptions}
        />
        <FieldError msg={errors.status} />
      </div>

      {/* Monthly Rent */}
      <div className="col-12 col-md-4">
        <FieldLabel label="Monthly Rent (₹)" required />
        <InputWrap error={errors.monthlyRent} icon={IndianRupee}>
          <input
            className="pg-field-input"
            type="number" min="0" placeholder="e.g. 25000"
            value={form.monthlyRent || ''}
            onChange={e => onChange('monthlyRent', e.target.value)}
          />
        </InputWrap>
        <FieldError msg={errors.monthlyRent} />
      </div>

      {/* Width */}
      <div className="col-12 col-md-4">
        <FieldLabel label="Width (ft)" required />
        <InputWrap error={errors.width}>
          <input
            className="pg-field-input"
            type="number" min="0" step="1" placeholder="e.g. 20"
            value={form.width || ''}
            onChange={e => onChange('width', e.target.value === '' ? '' : Math.floor(Number(e.target.value)))}
          />
        </InputWrap>
        <FieldError msg={errors.width} />
      </div>

      {/* Height */}
      <div className="col-12 col-md-4">
        <FieldLabel label="Height (ft)" required />
        <InputWrap error={errors.height}>
          <input
            className="pg-field-input"
            type="number" min="0" step="1" placeholder="e.g. 10"
            value={form.height || ''}
            onChange={e => onChange('height', e.target.value === '' ? '' : Math.floor(Number(e.target.value)))}
          />
        </InputWrap>
        <FieldError msg={errors.height} />
      </div>

      {/* Auto-calculated area */}
      {form.width && form.height && (
        <div className="col-12 col-md-4">
          <FieldLabel label="Area (sq ft)" />
          <InputWrap readOnly>
            <input
              className="pg-field-input" readOnly
              value={`${Number(form.width) * Number(form.height)} sq ft`}
              style={{ color: '#049edf', cursor: 'not-allowed' }}
            />
          </InputWrap>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   PHOTO HELPER
───────────────────────────────────────── */
export function isPhotoDefault(p) {
  if (!p) return false;
  return p.isDefault === true || p.isDefault === 'true' ||
         p.is_Default === true || p.is_Default === 'true' ||
         p.IsDefault === true || p.IsDefault === 'true';
}

/* ─────────────────────────────────────────
   PHOTO ADD MODAL (with isDefault checkbox)
───────────────────────────────────────── */
function PhotoAddModal({ files, existingPhotos = [], onConfirm, onClose }) {
  const hasExistingDefault = existingPhotos.some(p => isPhotoDefault(p));
  const existingDefaultPhoto = existingPhotos.find(p => isPhotoDefault(p));
  const [isDefault, setIsDefault] = useState(false);

  const previews = useRef(files.map(f => ({
    name: f.name,
    url: URL.createObjectURL(f),
  }))).current;

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
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 450,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', padding: '22px 22px 18px',
          animation: 'modalIn 0.24s cubic-bezier(0.22,1,0.36,1) both',
          fontFamily: 'Nunito, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(4,158,223,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Upload size={18} color="#049edf" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#1a1a2e' }}>
                Add Photo{files.length > 1 ? `s (${files.length})` : ''}
              </h3>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: '#7878a0' }}>
                Configure photos before staging
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090a8', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Previews */}
        <div style={{
          display: 'flex', gap: 10, overflowX: 'auto', padding: '6px 2px 10px', marginBottom: 14,
        }}>
          {previews.map((p, i) => (
            <div key={i} style={{
              position: 'relative', width: 88, height: 80, borderRadius: 8, overflow: 'hidden',
              border: '1.5px solid #ececf8', flexShrink: 0
            }}>
              <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', bottom: 0, insetInline: 0, background: 'rgba(0,0,0,0.65)',
                color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 4px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>{p.name}</div>
            </div>
          ))}
        </div>

        {/* isDefault Checkbox */}
        <div style={{
          background: hasExistingDefault ? '#fffbeb' : '#f8fafd',
          border: `1.5px solid ${hasExistingDefault ? '#fde68a' : '#e0e7ff'}`,
          borderRadius: 12, padding: '12px 14px', marginBottom: 16,
        }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: hasExistingDefault ? 'not-allowed' : 'pointer',
            opacity: hasExistingDefault ? 0.75 : 1,
            userSelect: 'none'
          }}>
            <input
              type="checkbox"
              checked={!hasExistingDefault && isDefault}
              disabled={hasExistingDefault}
              onChange={e => setIsDefault(e.target.checked)}
              style={{ width: 17, height: 17, accentColor: '#049edf', cursor: hasExistingDefault ? 'not-allowed' : 'pointer' }}
            />
            <span style={{ fontSize: 13, fontWeight: 800, color: hasExistingDefault ? '#92400e' : '#1a1a2e' }}>
              Set as default photo
            </span>
          </label>
          {hasExistingDefault && (
            <p style={{ margin: '6px 0 0 27px', fontSize: 11.5, fontWeight: 600, color: '#b45309', lineHeight: 1.4 }}>
              A default photo already exists{existingDefaultPhoto?.filename ? ` ("${existingDefaultPhoto.filename}")` : ''}. Delete or replace the existing default photo first to set a new default.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="pg-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="pg-btn-save" onClick={() => onConfirm(files, isDefault)}>
            <Check size={14} /> Add {files.length > 1 ? `${files.length} Photos` : 'Photo'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────
   PHOTO REPLACE MODAL (with isDefault checkbox)
───────────────────────────────────────── */
function PhotoReplaceModal({ photoToReplace, newFile, existingPhotos = [], onConfirm, onClose }) {
  const isCurrentDefault = isPhotoDefault(photoToReplace);
  const hasOtherDefault = existingPhotos.some(
    p => p.hoardingPhotoID !== photoToReplace.hoardingPhotoID && isPhotoDefault(p)
  );
  const otherDefaultPhoto = existingPhotos.find(
    p => p.hoardingPhotoID !== photoToReplace.hoardingPhotoID && isPhotoDefault(p)
  );

  const [isDefault, setIsDefault] = useState(isCurrentDefault && !hasOtherDefault);

  const newPreviewUrl = useRef(URL.createObjectURL(newFile)).current;

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
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', padding: '22px 22px 18px',
          animation: 'modalIn 0.24s cubic-bezier(0.22,1,0.36,1) both',
          fontFamily: 'Nunito, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(4,158,223,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Replace size={18} color="#049edf" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#1a1a2e' }}>
                Replace Photo
              </h3>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: '#7878a0' }}>
                Replacing "{photoToReplace.filename}"
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090a8', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* New Preview */}
        <div style={{
          width: '100%', height: 160, borderRadius: 10, overflow: 'hidden',
          border: '1.5px solid #ececf8', marginBottom: 14, position: 'relative'
        }}>
          <img src={newPreviewUrl} alt={newFile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{
            position: 'absolute', bottom: 0, insetInline: 0, background: 'rgba(0,0,0,0.65)',
            color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 8px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>New: {newFile.name}</div>
        </div>

        {/* isDefault Checkbox */}
        <div style={{
          background: hasOtherDefault ? '#fffbeb' : '#f8fafd',
          border: `1.5px solid ${hasOtherDefault ? '#fde68a' : '#e0e7ff'}`,
          borderRadius: 12, padding: '12px 14px', marginBottom: 16,
        }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: hasOtherDefault ? 'not-allowed' : 'pointer',
            opacity: hasOtherDefault ? 0.75 : 1,
            userSelect: 'none'
          }}>
            <input
              type="checkbox"
              checked={!hasOtherDefault && isDefault}
              disabled={hasOtherDefault}
              onChange={e => setIsDefault(e.target.checked)}
              style={{ width: 17, height: 17, accentColor: '#049edf', cursor: hasOtherDefault ? 'not-allowed' : 'pointer' }}
            />
            <span style={{ fontSize: 13, fontWeight: 800, color: hasOtherDefault ? '#92400e' : '#1a1a2e' }}>
              Set as default photo
            </span>
          </label>
          {hasOtherDefault && (
            <p style={{ margin: '6px 0 0 27px', fontSize: 11.5, fontWeight: 600, color: '#b45309', lineHeight: 1.4 }}>
              Another photo is already marked as default{otherDefaultPhoto?.filename ? ` ("${otherDefaultPhoto.filename}")` : ''}. Delete or replace that photo first to set this one as default.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="pg-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="pg-btn-save" onClick={() => onConfirm(photoToReplace, newFile, isDefault)}>
            <Check size={14} /> Confirm Replace
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────
   PHOTO SECTION
───────────────────────────────────────── */
function PhotoSection({
  hoardingID,
  effdtRaw,
  photos = [],
  onAddPhotos,
  onReplacePhoto,
  onDeletePhoto,
  readOnly = false,
  uploading = false,
  creatingNew = false,
}) {
  const [lightbox, setLightbox] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [replacingPhoto, setReplacingPhoto] = useState(null);
  const [pendingReplaceFile, setPendingReplaceFile] = useState(null);
  const [pendingAddFiles, setPendingAddFiles] = useState(null);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const addRef = useRef(null);
  const replaceRef = useRef(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const ALLOWED_LABEL = 'JPG, PNG, WEBP or GIF';

  const validateFiles = (files) => {
    const invalid = files.filter(f => !ALLOWED_TYPES.includes(f.type));
    if (invalid.length) {
      setPhotoError(`Unsupported file type: ${invalid.map(f => f.name).join(', ')}. Only ${ALLOWED_LABEL} are allowed.`);
      return false;
    }
    return true;
  };

  const handleAddFiles = (e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';
    if (!files.length) return;
    if (!validateFiles(files)) return;
    setPendingAddFiles(files);
  };

  const confirmAddPhotos = (files, isDefault) => {
    setPendingAddFiles(null);
    if (onAddPhotos) {
      onAddPhotos(files, isDefault);
    }
  };

  const handleReplaceFile = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !replacingPhoto) return;
    if (!validateFiles([file])) return;
    setPendingReplaceFile(file);
  };

  const confirmReplacePhoto = (photoToReplace, file, isDefault) => {
    setPendingReplaceFile(null);
    setReplacingPhoto(null);
    if (onReplacePhoto) {
      onReplacePhoto(photoToReplace, file, isDefault);
    }
  };

  const triggerReplace = (photo) => {
    setReplacingPhoto(photo);
    setTimeout(() => replaceRef.current?.click(), 50);
  };

  const handleDelete = (photo) => {
    setPhotoToDelete(photo);
  };

  const executeDelete = (photo) => {
    if (onDeletePhoto) {
      onDeletePhoto(photo);
    }
    setPhotoToDelete(null);
  };

  const resolvePhotoSrc = (p) => {
    const raw =
      p.photoUrl ?? p.photoPath ?? p.photo ??
      p.PhotoUrl ?? p.PhotoPath ?? p.Photo ??
      p.filePath ?? p.FilePath ?? '';
    if (!raw) return '';
    if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('http')) return raw;
    const base = (API_ROOT_URL || '').replace(/\/+$/, '');
    const rel = '/' + raw.replace(/^\/+/, '');
    return `${base}${rel}`;
  };

  const canUpload = !readOnly && (!!hoardingID || creatingNew);

  return (
    <div className="hd-photo-wrap">
      <div className="hd-photo-header">
        <span className="hd-photo-title">
          <ImageIcon size={14} />
          Photos
          <span className="hd-photo-count">{photos.length}</span>
          {uploading && <Loader2 size={12} className="pg-spin" style={{ marginLeft: 6 }} />}
        </span>
        {!readOnly && (
          <button
            className="hd-btn-upload"
            onClick={() => addRef.current?.click()}
            disabled={uploading || !canUpload}
            title={!canUpload ? 'Save the hoarding first' : `Upload photos (${ALLOWED_LABEL})`}
          >
            <Upload size={12} /> Upload
          </button>
        )}
        {!readOnly && (
          <>
            <input ref={addRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple style={{ display: 'none' }} onChange={handleAddFiles} />
            <input ref={replaceRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={handleReplaceFile} />
          </>
        )}
      </div>

      {!readOnly && photoError && (
        <div className="pg-field-error hd-api-error mb-2" style={{ marginBottom: 8 }}>
          <AlertCircle size={13} /><span>{photoError}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11 }} onClick={() => setPhotoError('')}>✕</button>
        </div>
      )}

      {photos.length === 0 && !uploading && (
        <div className="hd-empty-photos">
          <ImageIcon size={24} />
          <span>
            {readOnly
              ? 'No photos for this version'
              : canUpload
                ? `No photos yet — click Upload to add images (${ALLOWED_LABEL})`
                : 'Save the hoarding version first, then upload photos'}
          </span>
        </div>
      )}

      {photos.length > 0 && (
        <div className="hd-photo-grid">
          {photos.map((p) => (
            <div key={p.hoardingPhotoID} className="hd-photo-item" style={{ position: 'relative' }}>
              <img src={resolvePhotoSrc(p)} alt={p.filename} />
              {isPhotoDefault(p) && (
                <span
                  className="hd-default-badge"
                  style={{
                    position: 'absolute', top: 6, left: 6,
                    fontSize: 9, fontWeight: 900, color: '#fff',
                    background: 'linear-gradient(135deg, #049edf, #0284c7)',
                    boxShadow: '0 2px 6px rgba(4,158,223,0.45)',
                    padding: '2px 7px', borderRadius: 4,
                    fontFamily: 'Nunito,sans-serif', letterSpacing: 0.5,
                    zIndex: 2, textTransform: 'uppercase'
                  }}
                >
                  DEFAULT
                </span>
              )}
              <div className="hd-photo-name">{p.filename}</div>
              <div className="hd-photo-overlay">
                <button className="hd-photo-action" onClick={() => setLightbox(p)} title="View" disabled={uploading}>
                  <ZoomIn size={12} />
                </button>
                {!readOnly && !p._isJobPhoto && (
                  <button className="hd-photo-action replace" onClick={() => triggerReplace(p)} title="Replace" disabled={uploading}>
                    <Replace size={12} />
                  </button>
                )}
                {!readOnly && !p._isJobPhoto && (
                  <button className="hd-photo-action danger" onClick={() => handleDelete(p)} title="Delete" disabled={uploading}>
                    <Trash2 size={12} />
                  </button>
                )}
                {p._isJobPhoto && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, color: '#049edf',
                    background: 'rgba(4,158,223,0.12)',
                    padding: '2px 6px', borderRadius: 4,
                    fontFamily: 'Nunito,sans-serif',
                  }}>JOB</span>
                )}
              </div>
            </div>
          ))}
          {!readOnly && (
            <label className={`hd-upload-tile ${(!canUpload || uploading) ? 'hd-upload-tile--disabled' : ''}`}>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleAddFiles} style={{ display: 'none' }} disabled={!canUpload || uploading} />
              {uploading ? <Loader2 size={16} className="pg-spin" /> : <Upload size={16} />}
              <span>{uploading ? 'Uploading…' : 'Add More'}</span>
            </label>
          )}
        </div>
      )}

      {lightbox && ReactDOM.createPortal(
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <div style={{ position: 'relative', cursor: 'default' }} onClick={() => setLightbox(null)}>
            <img
              src={resolvePhotoSrc(lightbox)} alt={lightbox.filename}
              style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, display: 'block', cursor: 'pointer' }}
              onClick={() => setLightbox(null)}
            />
            <button
              onClick={() => setLightbox(null)}
              style={{ position: 'absolute', top: -12, right: -12, width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#fff', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
            ><X size={14} /></button>
          </div>
        </div>,
        document.body
      )}

      {/* Add Photo Modal with isDefault */}
      {pendingAddFiles && (
        <PhotoAddModal
          files={pendingAddFiles}
          existingPhotos={photos}
          onConfirm={confirmAddPhotos}
          onClose={() => setPendingAddFiles(null)}
        />
      )}

      {/* Replace Photo Modal with isDefault */}
      {pendingReplaceFile && replacingPhoto && (
        <PhotoReplaceModal
          photoToReplace={replacingPhoto}
          newFile={pendingReplaceFile}
          existingPhotos={photos}
          onConfirm={confirmReplacePhoto}
          onClose={() => { setPendingReplaceFile(null); setReplacingPhoto(null); }}
        />
      )}

      {photoToDelete && (
        <PhotoDeleteConfirmModal
          photo={photoToDelete}
          onConfirm={() => {
            executeDelete(photoToDelete);
            setPhotoToDelete(null);
          }}
          onClose={() => setPhotoToDelete(null)}
        />
      )}
    </div>
  );
}

function PhotoDeleteConfirmModal({ photo, onConfirm, onClose }) {
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (cancelBtnRef.current) {
      cancelBtnRef.current.focus();
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!photo) return null;

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
              Delete Photo?
            </h3>
            <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 600, color: '#7878a0', margin: '4px 0 0' }}>
              Confirm deleting this photo.
            </p>
          </div>
        </div>

        <div style={{
          fontFamily: 'Nunito,sans-serif', fontSize: 14, fontWeight: 600,
          color: '#4a5568', lineHeight: 1.5, marginBottom: 24,
        }}>
          Are you sure you want to delete the photo <strong>{photo.filename}</strong>? This action cannot be undone.
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

/* ─────────────────────────────────────────
   EFFDT HISTORY
───────────────────────────────────────── */
function EffdtHistory({ versions, sites, hoardingTypeMap, activePanel, onView, onEdit }) {
  const [page, setPage] = useState(1);
  const sorted = [...versions].sort((a, b) => new Date(b.effdt) - new Date(a.effdt));
  const totalPages = Math.max(1, Math.ceil(sorted.length / HISTORY_PER_PAGE));
  const paged = sorted.slice((page - 1) * HISTORY_PER_PAGE, page * HISTORY_PER_PAGE);
  const globalIdx = (localIdx) => (page - 1) * HISTORY_PER_PAGE + localIdx;

  return (
    <>
      <div className="hd-effdt-header d-none d-md-block">
        <div className="row align-items-center g-0">
          <div className="col-md-3"><span className="hd-effdt-col-head">Effective Date</span></div>
          <div className="col-md-2"><span className="hd-effdt-col-head">Material / Type</span></div>
          <div className="col-md-2"><span className="hd-effdt-col-head">Size</span></div>
          <div className="col-md-2"><span className="hd-effdt-col-head">Status</span></div>
          <div className="col-md-2"><span className="hd-effdt-col-head">Rent</span></div>
          <div className="col-md-1 text-end"><span className="hd-effdt-col-head">Actions</span></div>
        </div>
      </div>

      {paged.map((v, i) => {
        const gi = globalIdx(i);
        const isLatest = gi === 0;
        const isSelected = activePanel !== null && activePanel.idx === gi;
        const site = sites.find(s => s.siteID === v.siteID);
        return (
          <div key={`${v.hoardingID ?? ''}-${v.effdt ?? ''}-${gi}`} className={`hd-effdt-row ${isSelected ? 'is-selected' : ''}`}>
            <div className="row align-items-center g-2">
              <div className="col-12 col-md-3">
                <div className="hd-effdt-date-pill"><Calendar size={12} color="#9090a8" />{fmtDate(v.effdt)}</div>
                {isLatest && <span className="hd-latest-tag ms-1">Latest</span>}
                <div className="d-md-none mt-1">
                  <span style={{ fontSize: 11.5, color: '#9090a8' }}>
                    {site ? `${site.addressLine1}, ${site.city}` : `Site ${v.siteID}`}
                  </span>
                </div>
              </div>
              <div className="col-6 col-md-2">
                <div className="hd-effdt-val">{v.material}</div>
                <div className="hd-effdt-val muted">{hoardingTypeMap[v.hoardingType] || '—'}</div>
              </div>
              <div className="col-6 col-md-2">
                <div className="hd-effdt-val">{v.width} × {v.height} ft</div>
                <div className="hd-effdt-val muted">{v.width * v.height} sq ft</div>
              </div>
              <div className="col-6 col-md-2"><StatusBadge status={v.status} /></div>
              <div className="col-6 col-md-2"><span className="hd-effdt-val strong">{fmtCurrency(v.monthlyRent)}</span></div>
              <div className="col-12 col-md-1">
                <div className="pg-action-wrap" style={{ justifyContent: 'flex-end' }}>
                  <button className={`pg-btn-edit${isSelected && activePanel.mode === 'view' ? ' hd-btn-view-active' : ''}`} onClick={() => onView(gi, v)} title="View details"><Eye size={13} /></button>
                  <button className={`pg-btn-view${isSelected && activePanel.mode === 'edit' ? ' hd-btn-edit-active' : ''}`} onClick={() => onEdit(gi, v)} title="Edit this version"><Edit2 size={13} /></button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="hd-effdt-pg">
          <span className="pg-pagination__text">
            {(page - 1) * HISTORY_PER_PAGE + 1}–{Math.min(page * HISTORY_PER_PAGE, sorted.length)} of {sorted.length}
          </span>
          <div className="pg-pagination__left">
            <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={12} /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={12} /></button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────
   FORM PAGE
───────────────────────────────────────── */
function HoardingFormPage({ mode, hoarding, sites, hoardingTypes, hoardingTypeMap, onBack, onRefresh, existingHoardings = [] }) {
  const isAdd = mode === 'add';
  const isEdit = mode === 'edit';

  const sortedVersions = hoarding
    ? [...hoarding.versions].sort((a, b) => new Date(b.effdt) - new Date(a.effdt))
    : [];

  const [hoardingCode, setHoardingCode] = useState(() => {
    if (hoarding?.hoardingCode) return hoarding.hoardingCode;
    const saved = sessionStorage.getItem('unsaved_hoarding_form');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.hoardingCode) return parsed.hoardingCode;
      } catch (e) {}
    }
    return '';
  });
  const [hcError, setHcError] = useState('');
  const [addForm, setAddForm] = useState(() => {
    if (isEdit) return { ...EMPTY_VERSION };
    const saved = sessionStorage.getItem('unsaved_hoarding_form');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.addForm) return parsed.addForm;
      } catch (e) {}
    }
    return { ...EMPTY_VERSION };
  });
  const [addErrors, setAddErrors] = useState({});

  useEffect(() => {
    if (isAdd) {
      sessionStorage.setItem('unsaved_hoarding_form', JSON.stringify({ hoardingCode, addForm }));
    }
  }, [hoardingCode, addForm, isAdd]);

  const handleCancel = () => {
    sessionStorage.removeItem('unsaved_hoarding_form');
    onBack();
  };
  const [newlySavedHoardingID, setNewlySavedHoardingID] = useState(null);
  const [newlySavedEffdtRaw, setNewlySavedEffdtRaw] = useState('');
  const [activePanel, setActivePanel] = useState(null);
  const [effdtForm, setEffdtForm] = useState({});
  const [effdtErrors, setEffdtErrors] = useState({});
  const [photosMap, setPhotosMap] = useState({});
  const [photosLoading, setPhotosLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [availabilityConflict, setAvailabilityConflict] = useState(null);

  const [versionPhotos, setVersionPhotos] = useState([]);
  const [stagedNewPhotos, setStagedNewPhotos] = useState([]);
  const [stagedDeletedPhotos, setStagedDeletedPhotos] = useState([]);
  const [stagedReplacedPhotos, setStagedReplacedPhotos] = useState([]);

  const activeVersion = activePanel !== null && activePanel.idx >= 0
    ? sortedVersions[activePanel.idx]
    : null;
  const handleHoardingCodeChange = (val) => {
    setHoardingCode(val);
    if (!val.trim()) {
      setHcError('Hoarding code is required');
      return;
    }
    const duplicate = existingHoardings.some(
      h => h.hoardingCode.trim().toLowerCase() === val.trim().toLowerCase()
    );
    setHcError(duplicate
      ? 'This hoarding code is already registered. Please choose a different name.'
      : ''
    );
  };
  const loadPhotos = useCallback(async (hoardingID, effdt) => {
    if (!hoardingID) return;
    setPhotosLoading(true);
    try {
      const effdtFormatted = effdt ? effdt.split('T')[0] : '';
      let hoardingPhotos = [];
      if (effdtFormatted) {
        hoardingPhotos = await apiService.getPhotosByHoardingIDAndEffdt(hoardingID, effdtFormatted)
          .then(d =>
            Array.isArray(d) ? d :
              Array.isArray(d?.$values) ? d.$values :
                Array.isArray(d?.data) ? d.data : []
          )
          .catch(() => []);
      } else {
        hoardingPhotos = await apiService.getPhotosByHoardingID(hoardingID)
          .then(d =>
            Array.isArray(d) ? d :
              Array.isArray(d?.$values) ? d.$values :
                Array.isArray(d?.data) ? d.data : []
          )
          .catch(() => []);
      }

      setPhotosMap(prev => ({
        ...prev,
        [hoardingID]: hoardingPhotos,
      }));
      setVersionPhotos(hoardingPhotos);
      setStagedNewPhotos([]);
      setStagedDeletedPhotos([]);
      setStagedReplacedPhotos([]);
    } catch (err) {
      console.error('[loadPhotos] failed:', err);
      setPhotosMap(prev => ({ ...prev, [hoardingID]: [] }));
      setVersionPhotos([]);
    } finally { setPhotosLoading(false); }
  }, []);

  const handleAddPhotos = (files, isDefault = false) => {
    const fileList = Array.isArray(files) ? files : [files];
    fileList.forEach((file, idx) => {
      const tempId = 'new_' + Math.random().toString(36).substr(2, 9);
      const newPhoto = {
        hoardingPhotoID: tempId,
        filename: file.name,
        _file: file,
        photoUrl: URL.createObjectURL(file),
        isDefault: idx === 0 ? !!isDefault : false,
      };
      setVersionPhotos(prev => [...prev, newPhoto]);
      setStagedNewPhotos(prev => [...prev, newPhoto]);
    });
  };

  const handleReplacePhoto = (photoToReplace, file, isDefault) => {
    const isLocallyStaged = String(photoToReplace.hoardingPhotoID).startsWith('new_');
    const defaultVal = isDefault !== undefined ? !!isDefault : isPhotoDefault(photoToReplace);

    if (isLocallyStaged) {
      const updated = {
        ...photoToReplace,
        filename: file.name,
        _file: file,
        photoUrl: URL.createObjectURL(file),
        isDefault: defaultVal,
      };
      setVersionPhotos(prev => prev.map(p => p.hoardingPhotoID === photoToReplace.hoardingPhotoID ? updated : p));
      setStagedNewPhotos(prev => prev.map(p => p.hoardingPhotoID === photoToReplace.hoardingPhotoID ? updated : p));
    } else {
      const updated = {
        ...photoToReplace,
        filename: file.name,
        _file: file,
        photoUrl: URL.createObjectURL(file),
        isDefault: defaultVal,
      };
      setVersionPhotos(prev => prev.map(p => p.hoardingPhotoID === photoToReplace.hoardingPhotoID ? updated : p));
      setStagedReplacedPhotos(prev => [
        ...prev.filter(p => p.hoardingPhotoID !== photoToReplace.hoardingPhotoID),
        updated
      ]);
      setStagedDeletedPhotos(prev => prev.filter(p => p.hoardingPhotoID !== photoToReplace.hoardingPhotoID));
    }
  };

  const handleDeletePhoto = (photoToDelete) => {
    if (!String(photoToDelete.hoardingPhotoID).startsWith('new_')) {
      setStagedDeletedPhotos(prev => [...prev, photoToDelete]);
      setStagedReplacedPhotos(prev => prev.filter(p => p.hoardingPhotoID !== photoToDelete.hoardingPhotoID));
    } else {
      setStagedNewPhotos(prev => prev.filter(p => p.hoardingPhotoID !== photoToDelete.hoardingPhotoID));
    }
    setVersionPhotos(prev => prev.filter(p => p.hoardingPhotoID !== photoToDelete.hoardingPhotoID));
  };

  const photosFor = (hID) => (hID ? (photosMap[hID] || []) : []);
  const scrollToPanel = () =>
    setTimeout(() => document.getElementById('hd-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);

  const openView = (idx, v) => {
    setActivePanel({ idx, mode: 'view' });
    setEffdtErrors({});
    loadPhotos(v.hoardingID, v.effdtRaw || v.effdt);
    scrollToPanel();
  };

  const openEdit = (idx, v) => {
    setActivePanel({ idx, mode: 'edit' });
    setEffdtForm({ ...v });
    setEffdtErrors({});
    loadPhotos(v.hoardingID, v.effdtRaw || v.effdt);
    scrollToPanel();
  };

  const openNew = () => {
    const latest = sortedVersions[0] || {};
    setActivePanel({ idx: -1, mode: 'new' });
    setEffdtForm({
      ...EMPTY_VERSION,
      siteID: latest.siteID || '',
      material: latest.material || '',
      hoardingType: latest.hoardingType || '',
      status: 'Available',
      // status: 'Active',
      width: latest.width || '',
      height: latest.height || '',
    });
    setEffdtErrors({});
    scrollToPanel();
  };

  const closePanel = () => { setActivePanel(null); setEffdtErrors({}); };

  const handleEffdtChange = (key, val) => {
    setEffdtForm(p => ({ ...p, [key]: val }));
    if (effdtErrors[key]) setEffdtErrors(p => ({ ...p, [key]: '' }));
  };

  const handleAddChange = (key, val) => {
    setAddForm(p => ({ ...p, [key]: val }));
    if (addErrors[key]) setAddErrors(p => ({ ...p, [key]: '' }));
  };

  const saveNewHoarding = async () => {
    let hasErr = false;
    if (!hoardingCode.trim()) { setHcError('Hoarding code is required'); hasErr = true; }
    const errs = validateVersion(addForm, true);
    if (Object.keys(errs).length) { setAddErrors(errs); hasErr = true; }
    if (hasErr) return;

    setSaving(true); setApiErr('');
    try {
      const response = await apiService.createHoarding({
        hoardingCode: hoardingCode.trim(),
        effdt: addForm.effdt,
        material: addForm.material,
        hoardingType: addForm.hoardingType,
        status: addForm.status,
        monthlyRent: addForm.monthlyRent,
        width: addForm.width,
        height: addForm.height,
        siteID: addForm.siteID,
      });

      const savedID = response?.hoardingID || response?.id || null;
      if (savedID) {
        setNewlySavedHoardingID(savedID);
        setNewlySavedEffdtRaw(new Date(addForm.effdt + 'T00:00:00.000Z').toISOString());

        // Upload staged photos if any
        if (stagedNewPhotos.length > 0) {
          const userId = getLoggedInUserId();
          const todayDate = new Date().toISOString().split('T')[0];
          const effdtDateOnly = (addForm.effdt || '').split('T')[0] || todayDate;
          for (const np of stagedNewPhotos) {
            const fd = new FormData();
            fd.append('hoardingPhotoID', '0');
            fd.append('hoardingID', String(savedID));
            fd.append('effdt', effdtDateOnly);
            fd.append('photo', np._file, np.filename);
            fd.append('photoUrl', np.filename);
            fd.append('photoPath', np.filename);
            fd.append('filename', np.filename);
            fd.append('uploadedOn', todayDate);
            fd.append('lastUpdateDttm', todayDate);
            fd.append('lastUpdatedBy', String(userId));
            fd.append('isDefault', np.isDefault ? 'true' : 'false');
            await apiService.uploadHoardingPhoto(fd);
          }
        }
      }

      setSaveOk(true);
      await onRefresh();
      // ── START: Clear unsaved draft on save success ──
      sessionStorage.removeItem('unsaved_hoarding_form');
      // ── END: Clear unsaved draft on save success ──
      setTimeout(() => onBack(), 1200);
    } catch (err) {
      setApiErr(err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Save failed. Please try again.');
    } finally { setSaving(false); }
  };

  const saveEffdt = async () => {
    const isPanelNew = activePanel?.mode === 'new';
    const errs = validateVersion(effdtForm, isPanelNew);
    if (Object.keys(errs).length) { setEffdtErrors(errs); return; }

    setSaving(true); setApiErr('');
    try {
      const checkID = effdtForm.hoardingID || (sortedVersions.length > 0 ? sortedVersions[0].hoardingID : null);
      if (checkID) {
        const originalStatus = isPanelNew
          ? (sortedVersions.length > 0 ? sortedVersions[0].status : null)
          : activeVersion?.status;
        const currentStatus = effdtForm.status;

        // Check availability details if it's a new version OR if the status of an existing version is being changed
        if (isPanelNew || (originalStatus && currentStatus !== originalStatus)) {
          const details = await apiService.getHoardingAvailabilityDetails(checkID);
          const timeline = details?.timeline ?? details?.Timeline ?? [];
          if (timeline.length > 0) {
            // Check if the form's effective date is less than or equal to any of the contract/job end dates in the timeline.
            // If it is greater than all end dates, we allow saving.
            const formDateStr = effdtForm.effdt ? effdtForm.effdt.split('T')[0] : '';
            const hasConflict = timeline.some(item => {
              const itemEndDateRaw = item.endDate || item.EndDate || item.startDate || item.StartDate;
              if (!itemEndDateRaw) return true;
              const itemEndDateStr = String(itemEndDateRaw).split('T')[0];
              return formDateStr <= itemEndDateStr;
            });

            if (hasConflict) {
              setAvailabilityConflict(details);
              setSaving(false);
              return;
            }
          }
        }
      }

      if (isPanelNew) {
        await apiService.addHoardingEffdt(hoarding.hoardingCode, {
          effdt: effdtForm.effdt,
          material: effdtForm.material,
          hoardingType: effdtForm.hoardingType,
          status: effdtForm.status,
          monthlyRent: effdtForm.monthlyRent,
          width: effdtForm.width,
          height: effdtForm.height,
          siteID: effdtForm.siteID,
        });
      } else {
        await apiService.updateHoarding(effdtForm.hoardingID, {
          hoardingCode: hoarding.hoardingCode,
          effdt: effdtForm.effdt,
          material: effdtForm.material,
          hoardingType: effdtForm.hoardingType,
          status: effdtForm.status,
          monthlyRent: effdtForm.monthlyRent,
          width: effdtForm.width,
          height: effdtForm.height,
          siteID: effdtForm.siteID,
        });

        // Save photo changes
        const resolvedHID = effdtForm.hoardingID;
        if (stagedDeletedPhotos.length > 0) {
          for (const dp of stagedDeletedPhotos) {
            await apiService.deleteHoardingPhoto(dp.hoardingPhotoID);
          }
        }
        if (stagedReplacedPhotos.length > 0 && resolvedHID) {
          const userId = getLoggedInUserId();
          const todayDate = new Date().toISOString().split('T')[0];
          const effdtDateOnly = (effdtForm.effdtRaw || effdtForm.effdt || '').split('T')[0] || todayDate;
          for (const rp of stagedReplacedPhotos) {
            const fd = new FormData();
            fd.append('hoardingPhotoID', String(rp.hoardingPhotoID));
            fd.append('hoardingID', String(resolvedHID));
            fd.append('effdt', effdtDateOnly);
            fd.append('photo', rp._file, rp.filename);
            fd.append('photoUrl', rp.filename);
            fd.append('photoPath', rp.filename);
            fd.append('filename', rp.filename);
            fd.append('uploadedOn', todayDate);
            fd.append('lastUpdateDttm', todayDate);
            fd.append('lastUpdatedBy', String(userId));
            fd.append('isDefault', rp.isDefault ? 'true' : 'false');
            await apiService.updateHoardingPhoto(rp.hoardingPhotoID, fd);
          }
        }
        if (stagedNewPhotos.length > 0 && resolvedHID) {
          const userId = getLoggedInUserId();
          const todayDate = new Date().toISOString().split('T')[0];
          const effdtDateOnly = (effdtForm.effdtRaw || effdtForm.effdt || '').split('T')[0] || todayDate;
          for (const np of stagedNewPhotos) {
            const fd = new FormData();
            fd.append('hoardingPhotoID', '0');
            fd.append('hoardingID', String(resolvedHID));
            fd.append('effdt', effdtDateOnly);
            fd.append('photo', np._file, np.filename);
            fd.append('photoUrl', np.filename);
            fd.append('photoPath', np.filename);
            fd.append('filename', np.filename);
            fd.append('uploadedOn', todayDate);
            fd.append('lastUpdateDttm', todayDate);
            fd.append('lastUpdatedBy', String(userId));
            fd.append('isDefault', np.isDefault ? 'true' : 'false');
            await apiService.uploadHoardingPhoto(fd);
          }
        }
      }
      setSaveOk(true);
      await onRefresh();
      setTimeout(() => { setSaveOk(false); closePanel(); }, 900);
    } catch (err) {
      setApiErr(err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Save failed. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <div className="hd-form-page">
      <div className="hd-topbar">
        <div className="hd-topbar-left">
          <button className="hd-back-btn" onClick={handleCancel}>
            <ArrowLeft size={14} />
            <span className="d-none d-sm-inline">Back to Hoardings</span>
            <span className="d-inline d-sm-none">Back</span>
          </button>
          <div className="hd-topbar-divider" />
          <div>
            <div className="hd-topbar-title">{isAdd ? 'Add New Hoarding' : `Edit — ${hoarding?.hoardingCode}`}</div>
            <div className="hd-topbar-sub">
              {isAdd
                ? 'Fill all required fields'
                : `${sortedVersions.length} effective date version${sortedVersions.length !== 1 ? 's' : ''}`}
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

          {/* ══ ADD MODE ══ */}
          {isAdd && (
            <div className="row g-4">
              <div className="col-12">
                <div className="hd-section-card">
                  <div className="hd-section-head">
                    <div className="hd-section-icon-wrap"><Hash size={14} color="#049edf" /></div>
                    <div>
                      <div className="hd-section-title">Hoarding Identity</div>
                      <div className="hd-section-sub">Unique code for this hoarding</div>
                    </div>
                  </div>
                  <div className="hd-section-body">
                    <div className="row">
                      <div className="col-12 col-md-4">
                        <FieldLabel label="Hoarding Code" required />
                        <InputWrap error={hcError} icon={Hash}>
                          <input
                            className="pg-field-input"
                            placeholder="e.g. AMD-006"
                            value={hoardingCode}
                            onChange={e => handleHoardingCodeChange(e.target.value)}
                          />
                        </InputWrap>
                        <FieldError msg={hcError} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="hd-section-card">
                  <div className="hd-section-head">
                    <div className="hd-section-icon-wrap"><Calendar size={14} color="#049edf" /></div>
                    <div>
                      <div className="hd-section-title">Effective Date Details</div>
                      <div className="hd-section-sub">First version — set effective date and specs</div>
                    </div>
                  </div>
                  <div className="hd-section-body">
                    <VersionForm
                      form={addForm} errors={addErrors} onChange={handleAddChange}
                      isNewEffdt={true} sites={sites} hoardingTypes={hoardingTypes}
                    />
                    <PhotoSection
                      hoardingID={newlySavedHoardingID}
                      effdtRaw={newlySavedEffdtRaw}
                      photos={versionPhotos}
                      onAddPhotos={handleAddPhotos}
                      onReplacePhoto={handleReplacePhoto}
                      onDeletePhoto={handleDeletePhoto}
                      creatingNew={true}
                      uploading={saving}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ EDIT MODE ══ */}
          {isEdit && (
            <div className="row g-4">
              <div className="col-12 col-xl-3">
                <div className="hd-section-card">
                  <div className="hd-section-head">
                    <div className="hd-section-icon-wrap"><Hash size={14} color="#049edf" /></div>
                    <div>
                      <div className="hd-section-title">Identity</div>
                      <div className="hd-section-sub">Read-only</div>
                    </div>
                  </div>
                  <div className="hd-identity-row"><span className="hd-identity-label">Code</span><span className="hd-identity-val hd-code-val">{hoarding.hoardingCode}</span></div>
                  <div className="hd-identity-row"><span className="hd-identity-label">Versions</span><span className="hd-identity-val"><Clock size={11} style={{ marginRight: 4 }} />{sortedVersions.length}</span></div>
                  <div className="hd-identity-row"><span className="hd-identity-label">Latest</span><span className="hd-identity-val">{fmtDate(sortedVersions[0]?.effdt)}</span></div>
                  <div className="hd-identity-row"><span className="hd-identity-label">Status</span><StatusBadge status={sortedVersions[0]?.status} /></div>
                  <div className="hd-identity-actions">
                    <button className="pg-btn-add w-100" style={{ justifyContent: 'center' }} onClick={openNew}>
                      <Plus size={13} /> New Effective Date
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-12 col-xl-9">
                <div className="hd-section-card mb-4">
                  <div className="hd-section-head">
                    <div className="hd-section-icon-wrap"><Clock size={14} color="#049edf" /></div>
                    <div>
                      <div className="hd-section-title">
                        Effective Date History
                        <span className="hd-count-pill">{sortedVersions.length}</span>
                      </div>
                      <div className="hd-section-sub">
                        Click <Eye size={11} style={{ verticalAlign: 'middle' }} /> to view or{' '}
                        <Edit2 size={11} style={{ verticalAlign: 'middle' }} /> to edit a version
                      </div>
                    </div>
                  </div>
                  <EffdtHistory
                    versions={sortedVersions} sites={sites}
                    hoardingTypeMap={hoardingTypeMap}
                    activePanel={activePanel} onView={openView} onEdit={openEdit}
                  />
                </div>

                {activePanel !== null && (
                  <div id="hd-panel" className="hd-section-card hd-fade-in">

                    {/* VIEW panel */}
                    {activePanel.mode === 'view' && activeVersion && (
                      <>
                        <div className="hd-section-head">
                          <div className="hd-section-icon-wrap"><Eye size={14} color="#049edf" /></div>
                          <div className="flex-grow-1">
                            <div className="hd-section-title">View Version — {fmtDate(activeVersion.effdt)}</div>
                            <div className="hd-section-sub">Read-only snapshot</div>
                          </div>
                          <button className="hd-btn-outline-sm" onClick={() => openEdit(activePanel.idx, activeVersion)}><Edit2 size={12} /> Edit</button>
                          <button className="hd-btn-ghost-sm" onClick={closePanel}><X size={12} /></button>
                        </div>
                        <div className="hd-section-body">
                          <div className="row g-3">
                            {[
                              { label: 'Effective Date', value: fmtDate(activeVersion.effdt) },
                              { label: 'Site', value: sites.find(s => s.siteID === activeVersion.siteID)?.addressLine1 || `Site ${activeVersion.siteID}` },
                              { label: 'Material', value: activeVersion.material },
                              { label: 'Type', value: hoardingTypeMap[activeVersion.hoardingType] || '—' },
                              { label: 'Monthly Rent', value: fmtCurrency(activeVersion.monthlyRent) },
                              { label: 'Width', value: activeVersion.width ? `${activeVersion.width} ft` : '—' },
                              { label: 'Height', value: activeVersion.height ? `${activeVersion.height} ft` : '—' },
                              { label: 'Area', value: activeVersion.width && activeVersion.height ? `${activeVersion.width * activeVersion.height} sq ft` : '—' },
                            ].map(f => (
                              <div key={f.label} className="col-6 col-md-4 col-lg-3">
                                <div className="hd-view-field">
                                  <div className="hd-view-label">{f.label}</div>
                                  <div className="hd-view-val">{f.value}</div>
                                </div>
                              </div>
                            ))}
                            <div className="col-6 col-md-4 col-lg-3">
                              <div className="hd-view-field">
                                <div className="hd-view-label">Status</div>
                                <div className="hd-view-val"><StatusBadge status={activeVersion.status} /></div>
                              </div>
                            </div>
                          </div>
                          {photosLoading
                            ? <div style={{ textAlign: 'center', padding: '20px 0', color: '#9090a8' }}><Loader2 size={20} className="pg-spin" /></div>
                            : <PhotoSection
                              hoardingID={activeVersion.hoardingID}
                              effdtRaw={activeVersion.effdtRaw || activeVersion.effdt}
                              photos={photosFor(activeVersion.hoardingID)}
                              onPhotosChange={() => loadPhotos(activeVersion.hoardingID, activeVersion.effdtRaw || activeVersion.effdt)}
                              readOnly={true}
                            />
                          }
                        </div>
                      </>
                    )}

                    {/* EDIT panel */}
                    {activePanel.mode === 'edit' && (
                      <>
                        <div className="hd-section-head">
                          <div className="hd-section-icon-wrap"><Edit2 size={14} color="#049edf" /></div>
                          <div className="flex-grow-1">
                            <div className="hd-section-title">Edit Version — {fmtDate(effdtForm.effdt)}</div>
                            <div className="hd-section-sub">Modify fields for this effective date</div>
                          </div>
                          <button className="hd-btn-ghost-sm" onClick={closePanel}><X size={12} /></button>
                        </div>
                        <div className="hd-section-body">
                          <VersionForm
                            form={effdtForm} errors={effdtErrors} onChange={handleEffdtChange}
                            isNewEffdt={false} sites={sites} hoardingTypes={hoardingTypes}
                          />
                          {photosLoading
                            ? <div style={{ textAlign: 'center', padding: '20px 0', color: '#9090a8' }}><Loader2 size={20} className="pg-spin" /></div>
                            : <PhotoSection
                              hoardingID={effdtForm.hoardingID}
                              effdtRaw={effdtForm.effdtRaw || effdtForm.effdt}
                              photos={versionPhotos}
                              onAddPhotos={handleAddPhotos}
                              onReplacePhoto={handleReplacePhoto}
                              onDeletePhoto={handleDeletePhoto}
                              uploading={saving}
                            />
                          }
                        </div>
                        <div className="hd-form-footer">
                          <button className="pg-btn-cancel" onClick={closePanel} disabled={saving}>Cancel</button>
                          <button className="pg-btn-save" onClick={saveEffdt} disabled={saving}>
                            {saveOk ? <><Check size={13} /> Saved!</> : saving ? <><Loader2 size={13} className="pg-spin" /> Saving…</> : <><Check size={13} /> Save Changes</>}
                          </button>
                        </div>
                      </>
                    )}

                    {/* NEW EFFDT panel */}
                    {activePanel.mode === 'new' && (
                      <>
                        <div className="hd-section-head">
                          <div className="hd-section-icon-wrap"><Plus size={14} color="#049edf" /></div>
                          <div className="flex-grow-1">
                            <div className="hd-section-title">Add New Effective Date</div>
                            <div className="hd-section-sub">Previous version is preserved</div>
                          </div>
                          <button className="hd-btn-ghost-sm" onClick={closePanel}><X size={12} /></button>
                        </div>
                        <div className="hd-section-body">
                          <div className="hd-info-banner mb-3">
                            <Info size={13} style={{ flexShrink: 0 }} />
                            <span>A <strong>new effective date version</strong> will be added. Photos can be uploaded after saving.</span>
                          </div>
                          <VersionForm
                            form={effdtForm} errors={effdtErrors} onChange={handleEffdtChange}
                            isNewEffdt={true} sites={sites} hoardingTypes={hoardingTypes}
                          />
                        </div>
                        <div className="hd-form-footer">
                          <button className="pg-btn-cancel" onClick={closePanel} disabled={saving}>Cancel</button>
                          <button className="pg-btn-save" onClick={saveEffdt} disabled={saving}>
                            {saveOk ? <><Check size={13} /> Saved!</> : saving ? <><Loader2 size={13} className="pg-spin" /> Saving…</> : <><Check size={13} /> Save</>}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isAdd && (
        <div className="hd-form-footer hd-form-footer--sticky">
          <button className="pg-btn-cancel" onClick={handleCancel} disabled={saving}>Cancel</button>
          <button className="pg-btn-save" onClick={saveNewHoarding} disabled={saving}>
            {saveOk ? <><Check size={13} /> Saved!</> : saving ? <><Loader2 size={13} className="pg-spin" /> Saving…</> : <><Check size={13} /> Save Hoarding</>}
          </button>
        </div>
      )}
      {availabilityConflict && (
        <HoardingConflictModal
          conflict={availabilityConflict}
          onClose={() => setAvailabilityConflict(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   GRID PAGE
───────────────────────────────────────── */
/* ─────────────────────────────────────────
   GRID PAGE
───────────────────────────────────────── */

function useResizableColumns(tableRef, tableReady) {
  useEffect(() => {
    if (!tableReady) return;
    const table = tableRef.current;
    if (!table) return;

    const ths = Array.from(table.querySelectorAll('thead th'));
    const initialWidths = [140, 200, 110, 100, 110, 120, 110, 70];
    ths.forEach((th, i) => {
      th.style.width = (initialWidths[i] || 120) + 'px';
      th.style.position = 'relative';
      th.style.overflow = 'visible';
    });

    let startX, startW, activeTh;

    const onMouseMove = (e) => {
      if (!activeTh) return;
      const newW = Math.max(60, startW + (e.clientX - startX));
      activeTh.style.width = newW + 'px';
    };

    const onMouseUp = () => {
      if (activeTh) {
        activeTh.querySelector('.col-resizer')?.classList.remove('resizing');
        activeTh = null;
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    ths.forEach((header) => {
      header.querySelector('.col-resizer')?.remove();

      const resizer = document.createElement('div');
      resizer.className = 'col-resizer';
      resizer.style.cssText = `
        position: absolute; right: 0; top: 0;
        height: 100%; width: 8px;
        cursor: col-resize; user-select: none; z-index: 10;
        display: flex; align-items: center; justify-content: center;
      `;

      const line = document.createElement('div');
      line.style.cssText = `
        width: 2px; height: 60%;
        background: rgba(4,158,223,0.35);
        border-radius: 2px; pointer-events: none;
        transition: background 0.15s;
      `;
      resizer.appendChild(line);

      resizer.addEventListener('mouseenter', () => { line.style.background = '#049edf'; });
      resizer.addEventListener('mouseleave', () => {
        if (activeTh !== header) line.style.background = 'rgba(4,158,223,0.35)';
      });
      resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        activeTh = header;
        startX = e.clientX;
        startW = header.offsetWidth;
        line.style.background = '#049edf';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      header.appendChild(resizer);
    });

    return () => {
      ths.forEach(header => header.querySelector('.col-resizer')?.remove());
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [tableReady]);
}

export default function HoardingPage() {
  const [hoardings, setHoardings] = useState([]);
  const [sites, setSites] = useState([]);
  const [hoardingTypes, setHoardingTypes] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const tableRef = useRef(null);
  const [tableReady, setTableReady] = useState(false);

  useEffect(() => {
    if (!loading) setTableReady(true);
  }, [loading]);

  useResizableColumns(tableRef, tableReady);

  // ── START: Restore view and formMode if unsaved hoarding form exists ──
  // const [view, setView] = useState('grid');
  // const [formMode, setFormMode] = useState(null);
  const [view, setView] = useState(() => {
    return sessionStorage.getItem('unsaved_hoarding_form') !== null ? 'form' : 'grid';
  });
  const [formMode, setFormMode] = useState(() => {
    return sessionStorage.getItem('unsaved_hoarding_form') !== null ? 'add' : null;
  });
  // ── END: Restore view and formMode if unsaved hoarding form exists ──
  const [editTarget, setEditTarget] = useState(null);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('hoardingCode');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');

  // useEffect(() => {
  //   sessionStorage.setItem('hd_view', view);
  //   sessionStorage.setItem('hd_formMode', formMode || '');
  //   try { sessionStorage.setItem('hd_editTarget', editTarget ? JSON.stringify(editTarget) : ''); }
  //   catch { /* ignore */ }
  // }, [view, formMode, editTarget]);


  const fetchAll = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [rawHoardings, rawSites, rawTypes, rawOwners] = await Promise.all([
        apiService.getAllHoardings(),
        apiService.getAllSites(),
        apiService.getAllHoardingTypes(),
        apiService.getAllOwners(),
      ]);

      const extractArray = (res) => {
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.$values)) return res.$values;
        if (Array.isArray(res?.data)) return res.data;
        return [];
      };

      setHoardings(groupHoardingsByCode(extractArray(rawHoardings)));
      setSites(extractArray(rawSites));
      setHoardingTypes(extractArray(rawTypes));
      setOwners(extractArray(rawOwners));
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Failed to load hoardings.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (view === 'form' && formMode === 'edit' && editTarget && hoardings.length > 0) {
      const fresh = hoardings.find(h => h.hoardingCode === editTarget.hoardingCode);
      if (fresh) setEditTarget(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoardings]);

  const hoardingTypeMap = Object.fromEntries(hoardingTypes.map(t => [t.hoardingType, t.typeName]));

  const rows = hoardings.map(h => {
    const latest = latestVersion(h);
    const site = sites.find(s => s.siteID === latest?.siteID);
    const owner = site ? owners.find(o => Number(o.ownerID ?? o.OwnerID ?? o._id ?? 0) === Number(site.ownerID ?? site.OwnerID ?? 0)) : null;
    return {
      hoardingCode: h.hoardingCode,
      siteLabel: site ? `${site.addressLine1}${site.city ? ', ' + site.city : ''}` : latest?.siteID ? `Site ${latest.siteID}` : '—',
      // material: latest?.material || '',
      landlordName: owner ? (owner.ownerName ?? owner.OwnerName ?? '—') : '—', // show the land load name in the list
      typeLabel: hoardingTypeMap[latest?.hoardingType] || '',
      status: latest?.status || '',
      monthlyRent: latest?.monthlyRent ?? 0,
      width: latest?.width ?? 0,
      height: latest?.height ?? 0,
      _raw: h,
    };
  });

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return (
      (r.hoardingCode.toLowerCase().includes(q) || r.siteLabel.toLowerCase().includes(q) ||
        // r.material.toLowerCase().includes(q) ||
        r.landlordName.toLowerCase().includes(q) || // show the land load name in the list
        r.typeLabel.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q))
      && (statusFilter ? r.status === statusFilter : true)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = String(a[sortKey] ?? '').toLowerCase();
    const bv = String(b[sortKey] ?? '').toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const openAdd = () => { setFormMode('add'); setEditTarget(null); setView('form'); };
  const openEdit = (row) => { setFormMode('edit'); setEditTarget(row._raw); setView('form'); };
  const goBack = () => {
    sessionStorage.removeItem('hd_view');
    sessionStorage.removeItem('hd_formMode');
    sessionStorage.removeItem('hd_editTarget');
    setView('grid'); setFormMode(null); setEditTarget(null);
  };

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  if (view === 'form') {
    return (
      <HoardingFormPage
        mode={formMode} hoarding={editTarget}
        sites={sites} hoardingTypes={hoardingTypes} hoardingTypeMap={hoardingTypeMap}
        onBack={goBack} onRefresh={fetchAll}
        existingHoardings={hoardings}
      />
    );
  }

  const COLS = [
    { key: 'hoardingCode', label: 'Hoarding Code' },
    { key: 'siteLabel', label: 'Site' },
    { key: 'typeLabel', label: 'Type' },
    // { key: 'material', label: 'Material', tabletHide: true },
    { key: 'landlordName', label: 'Landlord', tabletHide: true }, // show the land load name in the list
    { key: 'status', label: 'Status' },
    { key: 'monthlyRent', label: 'Monthly Rent', tabletHide: true },
    { key: 'size', label: 'Size (W×H)', tabletHide: true, noSort: true },
    { key: '_action', label: 'Action', noSort: true },
  ];

  return (
    <div className="pg-page">
      <div className="pg-header">
        <div>
          <h1 className="pg-header__title">Maintain Hoarding</h1>
          <p className="pg-header__subtitle">Manage hoardings, <strong>effective date</strong> versions &amp; photos</p>
        </div>
        <button className="pg-btn-add" onClick={openAdd}><Plus size={14} /> Add New Hoarding</button>
      </div>

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
              <Layers size={14} color="#9090a8" />
              <span><strong>{loading ? '…' : filtered.length}</strong> hoarding{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="pg-search-box">
              <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input placeholder="Search code, site, type, status…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select className="hd-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="pg-pg-btn" onClick={fetchAll} disabled={loading} title="Refresh list" style={{ display: 'flex', alignItems: 'center' }}>
                <RefreshCw size={13} className={loading ? 'pg-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#9090a8' }}>
            <Loader2 size={28} className="pg-spin" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13 }}>Loading hoardings…</div>
          </div>
        )}

        {!loading && (
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
                  <tr><td colSpan={COLS.length} className="pg-td pg-empty">
                    <div className="pg-empty__inner"><Layers size={36} color="#d0d0e8" /><span className="pg-empty__label">No hoardings found</span></div>
                  </td></tr>
                ) : paginated.map(r => (
                  <tr key={r.hoardingCode} className="pg-tr">
                    <td className="pg-td"><div className="pg-td__primary hd-code-cell">{r.hoardingCode}</div></td>
                    <td className="pg-td pg-td--overflow"><span className="pg-td__ellipsis" title={r.siteLabel}>{r.siteLabel}</span></td>
                    <td className="pg-td"><span className="hd-type-pill">{r.typeLabel || '—'}</span></td>
                    {/* <td className="pg-td pg-tablet-hide"><span className="pg-td__ellipsis">{r.material || '—'}</span></td> */}
                    {/* show the land load name in the list */}
                    <td className="pg-td pg-tablet-hide"><span className="pg-td__ellipsis">{r.landlordName || '—'}</span></td>
                    <td className="pg-td"><StatusBadge status={r.status} /></td>
                    <td className="pg-td pg-tablet-hide"><span className="pg-td__primary">{fmtCurrency(r.monthlyRent)}</span></td>
                    <td className="pg-td pg-tablet-hide"><span className="pg-td__ellipsis">{r.width && r.height ? `${r.width} × ${r.height} ft` : '—'}</span></td>
                    <td className="pg-td">
                      <div className="pg-action-wrap">
                        <button className="pg-btn-view" onClick={() => openEdit(r)} title="Edit"><Edit2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}><Layers size={36} color="#d0d0e8" /><span className="pg-empty__label">No hoardings found</span></div>
            ) : paginated.map(r => (
              <div key={r.hoardingCode} className="pg-card">
                <div className="pg-card__header">
                  <div className="pg-card__title-wrap">
                    <div className="pg-card__title hd-code-cell">{r.hoardingCode}</div>
                    <div className="pg-card__subtitle">{r.siteLabel}</div>
                  </div>
                  <div className="pg-card__actions">
                    <button className="pg-card__btn-view" onClick={() => openEdit(r)} title="Edit"><Edit2 size={13} /></button>
                  </div>
                </div>
                <div className="pg-card__body">
                  {/* <div className="pg-card__row"><Layers size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="pg-card__row-text">{r.typeLabel} · {r.material}</span></div> */}
                  {/* show the land load name in the list */}
                  <div className="pg-card__row"><User size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="pg-card__row-text">{r.typeLabel} · {r.landlordName}</span></div>
                  <div className="pg-card__row"><IndianRupee size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="pg-card__row-text">{fmtCurrency(r.monthlyRent)} / month</span></div>
                  <div className="pg-card__row"><Maximize2 size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="pg-card__row-text">{r.width && r.height ? `${r.width} × ${r.height} ft (${r.width * r.height} sq ft)` : '—'}</span></div>
                  <div className="pg-card__row"><StatusBadge status={r.status} /></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
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
  );
}

/* ═══════════════════════════════════════════
   HOARDING AVAILABILITY CONFLICT MODAL
   Shows the timeline/details of where a hoarding is used 
   and prevents saving edits.
═══════════════════════════════════════════ */
function HoardingConflictModal({ conflict, onClose }) {
  if (!conflict) return null;
  const timeline = conflict.timeline ?? [];

  return ReactDOM.createPortal(
    <div className="pg-overlay" style={{ zIndex: 1070 }} onClick={onClose}>
      <div className="pg-modal" style={{ maxWidth: 620, width: '90%' }} onClick={e => e.stopPropagation()}>

        {/* Head */}
        <div className="pg-modal__head" style={{ borderBottom: '1.5px solid #fee2e2', background: '#fef2f2' }}>
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap" style={{ background: '#fecaca', color: '#dc2626' }}>
              <AlertCircle size={20} />
            </div>
            <div>
              <h5 className="pg-modal__title" style={{ color: '#991b1b', fontSize: 16 }}>Cannot Save Changes</h5>
              <p className="pg-modal__subtitle" style={{ color: '#b91c1c', fontSize: 12 }}>
                Hoarding <strong>{conflict.hoardingCode}</strong> is currently in use.
              </p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: '50vh' }}>
          <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#4b5563', lineHeight: 1.5, marginBottom: 16 }}>
            This hoarding is linked to active contracts or jobs. Changes to its specifications cannot be saved while it is in use. See the active usage details below:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {timeline.map((item, idx) => {
              const isContract = (item.sourceType || '').toLowerCase() === 'contract';
              return (
                <div key={idx} style={{
                  border: '1.5px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 14,
                  background: '#f9fafb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: 10.5,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: isContract ? 'rgba(4,158,223,0.1)' : 'rgba(108,99,255,0.1)',
                      color: isContract ? '#049edf' : '#6c63ff'
                    }}>
                      {item.sourceType} #{item.referenceId}
                    </span>
                    <span style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: 11,
                      fontWeight: 800,
                      color: item.status === 'Active' || item.status === 'Completed' ? '#16a34a' : '#d97706',
                      background: item.status === 'Active' || item.status === 'Completed' ? '#f0fdf4' : '#fffbeb',
                      padding: '2px 8px',
                      borderRadius: 12,
                      border: item.status === 'Active' || item.status === 'Completed' ? '1px solid #bbf7d0' : '1px solid #fde68a'
                    }}>
                      {item.periodStatus || item.status}
                    </span>
                  </div>

                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13.5, fontWeight: 800, color: '#1f2937' }}>
                    {item.customerName || '—'}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4b5563', fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}>
                    <Calendar size={12} color="#9090a8" />
                    <span>{fmtDate(item.startDate)} &rarr; {fmtDate(item.endDate)}</span>
                  </div>

                  {item.amount != null && (
                    <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IndianRupee size={12} color="#9090a8" />
                      <span>{item.amount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {item.comments && (
                    <div style={{
                      fontStyle: 'italic',
                      fontSize: 11.5,
                      color: '#6b7280',
                      borderTop: '1px solid #e5e7eb',
                      paddingTop: 6,
                      marginTop: 4,
                      fontFamily: 'Nunito, sans-serif'
                    }}>
                      "{item.comments}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Foot */}
        <div className="pg-modal__foot" style={{ justifyContent: 'flex-end', background: '#f9fafb', borderTop: '1px solid #f0f0f8' }}>
          <button className="pg-btn-cancel" style={{ background: '#374151', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 8, fontSize: 12.5, fontWeight: 700 }} onClick={onClose}>Close</button>
        </div>

      </div>
    </div>,
    document.body
  );
}