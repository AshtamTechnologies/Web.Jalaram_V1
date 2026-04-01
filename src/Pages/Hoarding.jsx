import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Search, X, AlertCircle, Check, Edit2,
  RefreshCw, Calendar, DollarSign,
  Maximize2, Image as ImageIcon, Upload, Trash2,
  ZoomIn, ArrowLeft, Hash, Clock, Info,
  ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight,
  ChevronLeft, ChevronRight, MapPin, Layers,
  CheckCircle, Wrench, Eye, Replace, Loader2
} from 'lucide-react';
import { apiService } from '../api/api';   // ← adjust path to match your project
import './Common1.css';

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
// REMOVED: HOARDING_TYPE_LABELS and HOARDING_TYPE_OPTIONS (now fetched from API)
const MATERIAL_OPTIONS = ['Flex', 'Vinyl', 'Metal', 'LED', 'Acrylic'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Under Maintenance'];
const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];
const HISTORY_PER_PAGE = 3;

const EMPTY_VERSION = {
  effdt: '', material: '', hoardingType: '', status: 'Active',
  monthlyRent: '', width: '', height: '', siteID: '',
};

/* ─────────────────────────────────────────
   DATA HELPERS
───────────────────────────────────────── */
function groupHoardingsByCode(flatRecords) {
  const map = {};
  flatRecords.forEach((rec) => {
    const code = rec.hoardingCode;
    if (!map[code]) {
      map[code] = { hoardingCode: code, versions: [] };
    }
    map[code].versions.push({
      hoardingID: rec.hoardingID,
      effdt: rec.effdt ? rec.effdt.split('T')[0] : '',
      material: rec.material || '',
      hoardingType: rec.hoardingType || '',
      status: rec.status || '',
      monthlyRent: rec.monthlyRent ?? '',
      width: rec.width ?? '',
      height: rec.height ?? '',
      siteID: rec.siteID || '',
      photos: rec.photos || [],
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
  if (form.height === '' || form.height == null) e.height = 'Required';
  if (!form.siteID) e.siteID = 'Required';
  return e;
}

/* ─────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    'Active': { cls: 'hd-status-active', Icon: CheckCircle },
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

/* ─────────────────────────────────────────
   VERSION FORM
   — now receives hoardingTypes array from API
───────────────────────────────────────── */
function VersionForm({ form, errors, onChange, isNewEffdt, sites, hoardingTypes }) {
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
        <InputWrap error={errors.siteID} icon={MapPin}>
          <select
            className="pg-field-input"
            value={form.siteID || ''}
            onChange={e => onChange('siteID', Number(e.target.value))}
          >
            <option value="">Select site…</option>
            {sites.map(s => (
              <option key={s.siteID} value={s.siteID}>
                {s.addressLine1}{s.city ? `, ${s.city}` : ''}
              </option>
            ))}
          </select>
        </InputWrap>
        <FieldError msg={errors.siteID} />
      </div>

      {/* Material */}
      <div className="col-12 col-md-4">
        <FieldLabel label="Material" required />
        <InputWrap error={errors.material} icon={Layers}>
          <select
            className="pg-field-input"
            value={form.material || ''}
            onChange={e => onChange('material', e.target.value)}
          >
            <option value="">Select material…</option>
            {MATERIAL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </InputWrap>
        <FieldError msg={errors.material} />
      </div>

      {/* Hoarding Type — now dynamic from API */}
      <div className="col-12 col-md-4">
        <FieldLabel label="Hoarding Type" required />
        <InputWrap error={errors.hoardingType} icon={Maximize2}>
          <select
            className="pg-field-input"
            value={form.hoardingType || ''}
            onChange={e => onChange('hoardingType', Number(e.target.value))}
          >
            <option value="">Select type…</option>
            {hoardingTypes.map(t => (
              <option key={t.hoardingType} value={t.hoardingType}>
                {t.typeName}
              </option>
            ))}
          </select>
        </InputWrap>
        <FieldError msg={errors.hoardingType} />
      </div>

      {/* Status */}
      <div className="col-12 col-md-4">
        <FieldLabel label="Status" required />
        <InputWrap error={errors.status}>
          <select
            className="pg-field-input"
            value={form.status || ''}
            onChange={e => onChange('status', e.target.value)}
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </InputWrap>
        <FieldError msg={errors.status} />
      </div>

      {/* Monthly Rent */}
      <div className="col-12 col-md-4">
        <FieldLabel label="Monthly Rent (₹)" required />
        <InputWrap error={errors.monthlyRent} icon={DollarSign}>
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
            type="number" min="0" placeholder="e.g. 20"
            value={form.width || ''}
            onChange={e => onChange('width', e.target.value)}
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
            type="number" min="0" placeholder="e.g. 10"
            value={form.height || ''}
            onChange={e => onChange('height', e.target.value)}
          />
        </InputWrap>
        <FieldError msg={errors.height} />
      </div>

      {/* Auto-calculated Area */}
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
   PHOTO SECTION
───────────────────────────────────────── */
function PhotoSection({ photos = [], onAdd, onDelete, onReplace }) {
  const [lightbox, setLightbox] = useState(null);
  const addRef = useRef(null);
  const replaceRef = useRef(null);
  const [replacingId, setReplacingId] = useState(null);

  const handleAddFiles = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => onAdd({
        hoardingPhotoID: Date.now() + Math.random(),
        photoPath: ev.target.result,
        filename: file.name,
        uploadedOn: new Date().toISOString().slice(0, 10),
      });
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleReplaceFile = (e) => {
    const file = e.target.files[0];
    if (!file || replacingId == null) return;
    const reader = new FileReader();
    reader.onload = ev => {
      onReplace(replacingId, {
        photoPath: ev.target.result,
        filename: file.name,
        uploadedOn: new Date().toISOString().slice(0, 10),
      });
      setReplacingId(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const triggerReplace = (id) => {
    setReplacingId(id);
    setTimeout(() => replaceRef.current?.click(), 50);
  };

  return (
    <div className="hd-photo-wrap">
      <div className="hd-photo-header">
        <span className="hd-photo-title">
          <ImageIcon size={14} />
          Photos
          <span className="hd-photo-count">{photos.length}</span>
        </span>
        <button className="hd-btn-upload" onClick={() => addRef.current?.click()}>
          <Upload size={12} /> Upload
        </button>
        <input ref={addRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleAddFiles} />
        <input ref={replaceRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReplaceFile} />
      </div>

      {photos.length === 0 && (
        <div className="hd-empty-photos">
          <ImageIcon size={24} />
          <span>No photos yet — click Upload to add images</span>
        </div>
      )}

      {photos.length > 0 && (
        <div className="hd-photo-grid">
          {photos.map(p => (
            <div key={p.hoardingPhotoID} className="hd-photo-item">
              <img src={p.photoPath} alt={p.filename} />
              <div className="hd-photo-name">{p.filename}</div>
              <div className="hd-photo-overlay">
                <button className="hd-photo-action" onClick={() => setLightbox(p)} title="View"><ZoomIn size={12} /></button>
                <button className="hd-photo-action replace" onClick={() => triggerReplace(p.hoardingPhotoID)} title="Replace"><Replace size={12} /></button>
                <button className="hd-photo-action danger" onClick={() => onDelete(p.hoardingPhotoID)} title="Delete"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
          <label className="hd-upload-tile">
            <input type="file" accept="image/*" multiple onChange={handleAddFiles} style={{ display: 'none' }} />
            <Upload size={16} />
            <span>Add More</span>
          </label>
        </div>
      )}

      {lightbox && (
        <div className="hd-lightbox" onClick={() => setLightbox(null)}>
          <div className="hd-lightbox-inner" onClick={e => e.stopPropagation()}>
            <img src={lightbox.photoPath} alt={lightbox.filename} />
            <button className="hd-lightbox-close" onClick={() => setLightbox(null)}><X size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   EFFECTIVE DATE HISTORY
   — now receives hoardingTypeMap for label lookup
───────────────────────────────────────── */
function EffdtHistory({ versions, sites, hoardingTypeMap, activePanel, onView, onEdit }) {
  const [page, setPage] = useState(1);
  const sorted = [...versions].sort((a, b) => new Date(b.effdt) - new Date(a.effdt));
  const totalPages = Math.max(1, Math.ceil(sorted.length / HISTORY_PER_PAGE));
  const paged = sorted.slice((page - 1) * HISTORY_PER_PAGE, page * HISTORY_PER_PAGE);
  const globalIdx = (localIdx) => (page - 1) * HISTORY_PER_PAGE + localIdx;

  return (
    <>
      {/* Column headers */}
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
          <div key={v.hoardingID ?? v.effdt} className={`hd-effdt-row ${isSelected ? 'is-selected' : ''}`}>
            <div className="row align-items-center g-2">
              <div className="col-12 col-md-3">
                <div className="hd-effdt-date-pill">
                  <Calendar size={12} color="#9090a8" />
                  {fmtDate(v.effdt)}
                </div>
                {isLatest && <span className="hd-latest-tag ms-1">Latest</span>}
                <div className="d-md-none mt-1">
                  <span style={{ fontSize: 11.5, color: '#9090a8' }}>
                    {site ? `${site.addressLine1}, ${site.city}` : `Site ${v.siteID}`}
                  </span>
                </div>
              </div>
              <div className="col-6 col-md-2">
                <div className="hd-effdt-val">{v.material}</div>
                {/* Use hoardingTypeMap for label lookup */}
                <div className="hd-effdt-val muted">{hoardingTypeMap[v.hoardingType] || '—'}</div>
              </div>
              <div className="col-6 col-md-2">
                <div className="hd-effdt-val">{v.width} × {v.height} ft</div>
                <div className="hd-effdt-val muted">{v.width * v.height} sq ft</div>
              </div>
              <div className="col-6 col-md-2">
                <StatusBadge status={v.status} />
              </div>
              <div className="col-6 col-md-2">
                <span className="hd-effdt-val strong">{fmtCurrency(v.monthlyRent)}</span>
              </div>
              <div className="col-12 col-md-1">
                <div className="pg-action-wrap" style={{ justifyContent: 'flex-end' }}>
                  <button
                    className={`pg-btn-edit${isSelected && activePanel.mode === 'view' ? ' hd-btn-view-active' : ''}`}
                    onClick={() => onView(gi, v)} title="View details"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    className={`pg-btn-view${isSelected && activePanel.mode === 'edit' ? ' hd-btn-edit-active' : ''}`}
                    onClick={() => onEdit(gi, v)} title="Edit this version"
                  >
                    <Edit2 size={13} />
                  </button>
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
            <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={12} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`}
                onClick={() => setPage(p)}
              >{p}</button>
            ))}
            <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────
   FORM PAGE  (Add New / Edit Existing)
   — now receives hoardingTypes + hoardingTypeMap
───────────────────────────────────────── */
function HoardingFormPage({ mode, hoarding, sites, hoardingTypes, hoardingTypeMap, onBack, onRefresh }) {
  const isAdd = mode === 'add';
  const isEdit = mode === 'edit';

  const sortedVersions = hoarding
    ? [...hoarding.versions].sort((a, b) => new Date(b.effdt) - new Date(a.effdt))
    : [];

  // ── Add-mode state ──
  const [hoardingCode, setHoardingCode] = useState(hoarding?.hoardingCode || '');
  const [hcError, setHcError] = useState('');
  const [addForm, setAddForm] = useState({ ...EMPTY_VERSION });
  const [addErrors, setAddErrors] = useState({});

  // ── Edit panel state ──
  const [activePanel, setActivePanel] = useState(null);
  const [effdtForm, setEffdtForm] = useState({});
  const [effdtErrors, setEffdtErrors] = useState({});

  // ── Shared ──
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [apiErr, setApiErr] = useState('');

  const activeVersion = activePanel !== null ? sortedVersions[activePanel.idx] : null;

  // ── Panel helpers ──
  const scrollToPanel = () =>
    setTimeout(() => document.getElementById('hd-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);

  const openView = (idx, v) => {
    setActivePanel({ idx, mode: 'view' });
    setEffdtErrors({});
    setPhotos(v.photos || []);
    scrollToPanel();
  };
  const openEdit = (idx, v) => {
    setActivePanel({ idx, mode: 'edit' });
    setEffdtForm({ ...v });
    setEffdtErrors({});
    setPhotos(v.photos || []);
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
      status: 'Active',
      width: latest.width || '',
      height: latest.height || '',
    });
    setEffdtErrors({});
    setPhotos([]);
    scrollToPanel();
  };
  const closePanel = () => { setActivePanel(null); setEffdtErrors({}); };

  // ── Field change handlers ──
  const handleEffdtChange = (key, val) => {
    setEffdtForm(p => ({ ...p, [key]: val }));
    if (effdtErrors[key]) setEffdtErrors(p => ({ ...p, [key]: '' }));
  };
  const handleAddChange = (key, val) => {
    setAddForm(p => ({ ...p, [key]: val }));
    if (addErrors[key]) setAddErrors(p => ({ ...p, [key]: '' }));
  };

  // ── Photo handlers ──
  const addPhoto = (p) => setPhotos(prev => [...prev, p]);
  const deletePhoto = (id) => setPhotos(prev => prev.filter(p => p.hoardingPhotoID !== id));
  const replacePhoto = (id, d) => setPhotos(prev => prev.map(p => p.hoardingPhotoID === id ? { ...p, ...d } : p));

  /* ────────────────────────────────────
     SAVE: New Hoarding  (POST /Hoarding)
  ──────────────────────────────────── */
  const saveNewHoarding = async () => {
    let hasErr = false;
    if (!hoardingCode.trim()) { setHcError('Hoarding code is required'); hasErr = true; }
    const errs = validateVersion(addForm, true);
    if (Object.keys(errs).length) { setAddErrors(errs); hasErr = true; }
    if (hasErr) return;

    setSaving(true); setApiErr('');
    try {
      await apiService.createHoarding({
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
      setSaveOk(true);
      await onRefresh();
      setTimeout(() => onBack(), 1000);
    } catch (err) {
      setApiErr(
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'Save failed. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  /* ────────────────────────────────────
     SAVE: Edit / New effdt
  ──────────────────────────────────── */
  const saveEffdt = async () => {
    const isPanelNew = activePanel?.mode === 'new';
    const errs = validateVersion(effdtForm, isPanelNew);
    if (Object.keys(errs).length) { setEffdtErrors(errs); return; }

    setSaving(true); setApiErr('');
    try {
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
      }

      setSaveOk(true);
      await onRefresh();
      setTimeout(() => { setSaveOk(false); closePanel(); }, 900);
    } catch (err) {
      setApiErr(
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'Save failed. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  /* ─── RENDER ─── */
  return (
    <div className="hd-form-page">

      {/* ── Top Bar ── */}
      <div className="hd-topbar">
        <div className="hd-topbar-left">
          <button className="hd-back-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span className="d-none d-sm-inline">Back to Hoardings</span>
            <span className="d-inline d-sm-none">Back</span>
          </button>
          <div className="hd-topbar-divider" />
          <div>
            <div className="hd-topbar-title">
              {isAdd ? 'Add New Hoarding' : `Edit — ${hoarding?.hoardingCode}`}
            </div>
            <div className="hd-topbar-sub">
              {isAdd
                ? 'Fill all required fields'
                : `${sortedVersions.length} effective date version${sortedVersions.length !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
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
                            onChange={e => { setHoardingCode(e.target.value); setHcError(''); }}
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
                      form={addForm}
                      errors={addErrors}
                      onChange={handleAddChange}
                      isNewEffdt={true}
                      sites={sites}
                      hoardingTypes={hoardingTypes}
                    />
                    <PhotoSection photos={photos} onAdd={addPhoto} onDelete={deletePhoto} onReplace={replacePhoto} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ EDIT MODE ══ */}
          {isEdit && (
            <div className="row g-4">

              {/* Identity card */}
              <div className="col-12 col-xl-3">
                <div className="hd-section-card">
                  <div className="hd-section-head">
                    <div className="hd-section-icon-wrap"><Hash size={14} color="#049edf" /></div>
                    <div>
                      <div className="hd-section-title">Identity</div>
                      <div className="hd-section-sub">Read-only</div>
                    </div>
                  </div>
                  <div className="hd-identity-row">
                    <span className="hd-identity-label">Code</span>
                    <span className="hd-identity-val hd-code-val">{hoarding.hoardingCode}</span>
                  </div>
                  <div className="hd-identity-row">
                    <span className="hd-identity-label">Versions</span>
                    <span className="hd-identity-val"><Clock size={11} style={{ marginRight: 4 }} />{sortedVersions.length}</span>
                  </div>
                  <div className="hd-identity-row">
                    <span className="hd-identity-label">Latest</span>
                    <span className="hd-identity-val">{fmtDate(sortedVersions[0]?.effdt)}</span>
                  </div>
                  <div className="hd-identity-row">
                    <span className="hd-identity-label">Status</span>
                    <StatusBadge status={sortedVersions[0]?.status} />
                  </div>
                  <div className="hd-identity-actions">
                    <button className="pg-btn-add w-100" style={{ justifyContent: 'center' }} onClick={openNew}>
                      <Plus size={13} /> New Effective Date
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: history + panel */}
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
                    versions={sortedVersions}
                    sites={sites}
                    hoardingTypeMap={hoardingTypeMap}
                    activePanel={activePanel}
                    onView={openView}
                    onEdit={openEdit}
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
                            <div className="hd-section-sub">Read-only snapshot of this effective date</div>
                          </div>
                          <button className="hd-btn-outline-sm" onClick={() => openEdit(activePanel.idx, activeVersion)}>
                            <Edit2 size={12} /> Edit
                          </button>
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
                          <PhotoSection photos={photos} onAdd={addPhoto} onDelete={deletePhoto} onReplace={replacePhoto} />
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
                            form={effdtForm}
                            errors={effdtErrors}
                            onChange={handleEffdtChange}
                            isNewEffdt={false}
                            sites={sites}
                            hoardingTypes={hoardingTypes}
                          />
                          <PhotoSection photos={photos} onAdd={addPhoto} onDelete={deletePhoto} onReplace={replacePhoto} />
                        </div>
                        <div className="hd-form-footer">
                          <button className="pg-btn-cancel" onClick={closePanel} disabled={saving}>Cancel</button>
                          <button className="pg-btn-save" onClick={saveEffdt} disabled={saving}>
                            {saveOk
                              ? <><Check size={13} /> Saved!</>
                              : saving
                                ? <><Loader2 size={13} className="pg-spin" /> Saving…</>
                                : <><Check size={13} /> Save Changes</>}
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
                            <span>
                              A <strong>new effective date version</strong> will be added.
                              The existing version is preserved.
                              Set the date from which this version is effective.
                            </span>
                          </div>
                          <VersionForm
                            form={effdtForm}
                            errors={effdtErrors}
                            onChange={handleEffdtChange}
                            isNewEffdt={true}
                            sites={sites}
                            hoardingTypes={hoardingTypes}
                          />
                        </div>
                        <div className="hd-form-footer">
                          <button className="pg-btn-cancel" onClick={closePanel} disabled={saving}>Cancel</button>
                          <button className="pg-btn-save" onClick={saveEffdt} disabled={saving}>
                            {saveOk
                              ? <><Check size={13} /> Saved!</>
                              : saving
                                ? <><Loader2 size={13} className="pg-spin" /> Saving…</>
                                : <><Check size={13} /> Save</>}
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

      {/* STICKY BOTTOM FOOTER — shown only in Add mode */}
      {isAdd && (
        <div className="hd-form-footer hd-form-footer--sticky">
          <button className="pg-btn-cancel" onClick={onBack} disabled={saving}>Cancel</button>
          <button className="pg-btn-save" onClick={saveNewHoarding} disabled={saving}>
            {saveOk
              ? <><Check size={13} /> Saved!</>
              : saving
                ? <><Loader2 size={13} className="pg-spin" /> Saving…</>
                : <><Check size={13} /> Save Hoarding</>}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   GRID PAGE  (main list view)
───────────────────────────────────────── */
export default function HoardingPage() {
  // ── Data state ──
  const [hoardings, setHoardings] = useState([]);
  const [sites, setSites] = useState([]);
  const [hoardingTypes, setHoardingTypes] = useState([]);   // ← NEW: from API
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // ── UI state — persisted to sessionStorage so page refresh keeps context ──
  const [view, setView] = useState(() => sessionStorage.getItem('hd_view') || 'grid');
  const [formMode, setFormMode] = useState(() => sessionStorage.getItem('hd_formMode') || null);
  const [editTarget, setEditTarget] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('hd_editTarget')) || null; }
    catch { return null; }
  });

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('hoardingCode');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');

  // ── Persist navigation state to sessionStorage ──
  useEffect(() => {
    sessionStorage.setItem('hd_view', view);
    sessionStorage.setItem('hd_formMode', formMode || '');
    try {
      sessionStorage.setItem('hd_editTarget', editTarget ? JSON.stringify(editTarget) : '');
    } catch { /* ignore serialisation errors */ }
  }, [view, formMode, editTarget]);

  /* ──────────────────────────────────────
     LOAD DATA from API
     — now also fetches HoardingType list
  ────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [rawHoardings, rawSites, rawTypes] = await Promise.all([
        apiService.getAllHoardings(),
        apiService.getAllSites(),
        apiService.getAllHoardingTypes(),   // ← NEW
      ]);

      const grouped = groupHoardingsByCode(
        Array.isArray(rawHoardings) ? rawHoardings : []
      );
      setHoardings(grouped);
      setSites(Array.isArray(rawSites) ? rawSites : []);
      setHoardingTypes(Array.isArray(rawTypes) ? rawTypes : []);   // ← NEW
    } catch (err) {
      setLoadError(
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'Failed to load hoardings. Please refresh.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── After fresh data loads, re-sync editTarget so it has live version data ──
  useEffect(() => {
    if (view === 'form' && formMode === 'edit' && editTarget && hoardings.length > 0) {
      const fresh = hoardings.find(h => h.hoardingCode === editTarget.hoardingCode);
      if (fresh) setEditTarget(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoardings]);

  /* ──────────────────────────────────────
     BUILD DYNAMIC LABEL MAP
     e.g. { 1: 'Unipole', 2: 'Billboard', … }
     — replaces the old hardcoded HOARDING_TYPE_LABELS
  ────────────────────────────────────── */
  const hoardingTypeMap = Object.fromEntries(
    hoardingTypes.map(t => [t.hoardingType, t.typeName])
  );

  /* ──────────────────────────────────────
     BUILD TABLE ROWS
  ────────────────────────────────────── */
  const rows = hoardings.map(h => {
    const latest = latestVersion(h);
    const site = sites.find(s => s.siteID === latest?.siteID);
    return {
      hoardingCode: h.hoardingCode,
      siteLabel: site
        ? `${site.addressLine1}${site.city ? ', ' + site.city : ''}`
        : latest?.siteID ? `Site ${latest.siteID}` : '—',
      material: latest?.material || '',
      typeLabel: hoardingTypeMap[latest?.hoardingType] || '',   // ← uses dynamic map
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
      (r.hoardingCode.toLowerCase().includes(q) ||
        r.siteLabel.toLowerCase().includes(q) ||
        r.material.toLowerCase().includes(q) ||
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

  /* ── Navigation ── */
  const openAdd = () => {
    setFormMode('add');
    setEditTarget(null);
    setView('form');
  };

  const openEdit = (row) => {
    setFormMode('edit');
    setEditTarget(row._raw);
    setView('form');
  };

  const goBack = () => {
    sessionStorage.removeItem('hd_view');
    sessionStorage.removeItem('hd_formMode');
    sessionStorage.removeItem('hd_editTarget');
    setView('grid');
    setFormMode(null);
    setEditTarget(null);
  };

  /* ── Pagination numbers with ellipsis ── */
  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  /* ── Form view ── */
  if (view === 'form') {
    return (
      <HoardingFormPage
        mode={formMode}
        hoarding={editTarget}
        sites={sites}
        hoardingTypes={hoardingTypes}       // ← NEW
        hoardingTypeMap={hoardingTypeMap}   // ← NEW
        onBack={goBack}
        onRefresh={fetchAll}
      />
    );
  }

  /* ── Column definitions ── */
  const COLS = [
    { key: 'hoardingCode', label: 'Hoarding Code' },
    { key: 'siteLabel', label: 'Site' },
    { key: 'typeLabel', label: 'Type' },
    { key: 'material', label: 'Material', tabletHide: true },
    { key: 'status', label: 'Status' },
    { key: 'monthlyRent', label: 'Monthly Rent', tabletHide: true },
    { key: 'size', label: 'Size (W×H)', tabletHide: true, noSort: true },
    { key: '_action', label: 'Action', noSort: true },
  ];

  /* ── Grid render ── */
  return (
    <div className="pg-page">

      {/* Page Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-header__title">Hoardings</h1>
          <p className="pg-header__subtitle">
            Manage hoardings, <strong>effective date</strong> versions &amp; photos
          </p>
        </div>
        <button className="pg-btn-add" onClick={openAdd}><Plus size={14} /> Add New Hoarding</button>
      </div>

      {/* Global load error */}
      {loadError && (
        <div className="pg-field-error hd-api-error mb-3" style={{ margin: '0 0 16px 0' }}>
          <AlertCircle size={14} />
          <span>{loadError}</span>
          <button
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
            onClick={fetchAll}
          >
            Retry
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="pg-container">

        {/* Toolbar */}
        <div className="pg-toolbar">
          <div className="pg-toolbar__inner">

            {/* Count */}
            <div className="pg-toolbar__count">
              <Layers size={14} color="#9090a8" />
              <span>
                <strong>{loading ? '…' : filtered.length}</strong> hoarding{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Search */}
            <div className="pg-search-box">
              <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input
                placeholder="Search code, site, type, status…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              {search && (
                <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />
              )}
            </div>

            {/* RIGHT SIDE */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>

              {/* Status Filter */}
              <select
                className="hd-filter-select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Refresh Button */}
              <button
                className="pg-pg-btn"
                onClick={fetchAll}
                disabled={loading}
                title="Refresh list"
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <RefreshCw size={13} className={loading ? 'pg-spin' : ''} />
              </button>

            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#9090a8' }}>
            <Loader2 size={28} className="pg-spin" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13 }}>Loading hoardings…</div>
          </div>
        )}

        {/* Desktop Table */}
        {!loading && (
          <div className="pg-desktop-table">
            <table className="pg-table">
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      className={[
                        'pg-th',
                        !col.noSort && 'pg-th--sort',
                        col.tabletHide && 'pg-tablet-hide',
                      ].filter(Boolean).join(' ')}
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
                        <Layers size={36} color="#d0d0e8" />
                        <span className="pg-empty__label">No hoardings found</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(r => (
                  <tr key={r.hoardingCode} className="pg-tr">
                    <td className="pg-td">
                      <div className="pg-td__primary hd-code-cell">{r.hoardingCode}</div>
                    </td>
                    <td className="pg-td pg-td--overflow">
                      <span className="pg-td__ellipsis" title={r.siteLabel}>{r.siteLabel}</span>
                    </td>
                    <td className="pg-td">
                      <span className="hd-type-pill">{r.typeLabel || '—'}</span>
                    </td>
                    <td className="pg-td pg-tablet-hide">
                      <span className="pg-td__ellipsis">{r.material || '—'}</span>
                    </td>
                    <td className="pg-td">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="pg-td pg-tablet-hide">
                      <span className="pg-td__primary">{fmtCurrency(r.monthlyRent)}</span>
                    </td>
                    <td className="pg-td pg-tablet-hide">
                      <span className="pg-td__ellipsis">
                        {r.width && r.height ? `${r.width} × ${r.height} ft` : '—'}
                      </span>
                    </td>
                    <td className="pg-td">
                      <div className="pg-action-wrap">
                        <button className="pg-btn-view" onClick={() => openEdit(r)} title="Edit">
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

        {/* Mobile Cards */}
        {!loading && (
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <Layers size={36} color="#d0d0e8" />
                <span className="pg-empty__label">No hoardings found</span>
              </div>
            ) : paginated.map(r => (
              <div key={r.hoardingCode} className="pg-card">
                <div className="pg-card__header">
                  <div className="pg-card__title-wrap">
                    <div className="pg-card__title hd-code-cell">{r.hoardingCode}</div>
                    <div className="pg-card__subtitle">{r.siteLabel}</div>
                  </div>
                  <div className="pg-card__actions">
                    <button className="pg-card__btn-view" onClick={() => openEdit(r)} title="Edit">
                      <Edit2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="pg-card__body">
                  <div className="pg-card__row">
                    <Layers size={12} color="#c0c0d8" className="pg-card__row-icon" />
                    <span className="pg-card__row-text">{r.typeLabel} · {r.material}</span>
                  </div>
                  <div className="pg-card__row">
                    <DollarSign size={12} color="#c0c0d8" className="pg-card__row-icon" />
                    <span className="pg-card__row-text">{fmtCurrency(r.monthlyRent)} / month</span>
                  </div>
                  <div className="pg-card__row">
                    <Maximize2 size={12} color="#c0c0d8" className="pg-card__row-icon" />
                    <span className="pg-card__row-text">
                      {r.width && r.height
                        ? `${r.width} × ${r.height} ft (${r.width * r.height} sq ft)`
                        : '—'}
                    </span>
                  </div>
                  <div className="pg-card__row">
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
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
              <select
                className="pg-pagesize-select"
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
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