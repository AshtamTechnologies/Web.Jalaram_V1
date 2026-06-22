import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
    Hash, Plus, RefreshCw, X, AlertCircle,
    ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight,
    ChevronLeft, ChevronRight, Filter, Loader2,
    Edit2, Check, CheckCircle2, Circle,
    ToggleLeft, ToggleRight, Type, Minus,
    AlignLeft, ListOrdered, Settings2,
} from 'lucide-react';
import './Common1.css';
import { apiService } from '../api/api';                               // ← adjust path if needed
import { useResizableColumns } from '../hooks/useResizableColumns'; // ← adjust path if needed

/* ─────────────────────────────────────────
   API WRAPPER
───────────────────────────────────────── */
const seriesApi = {
    getAll: () => apiService.getAllSeriesIDs(),
    create: (data) => apiService.createSeriesID(data),
    update: (id, data) => apiService.updateSeriesID(id, data),
};

/* ─────────────────────────────────────────
   NORMALIZE
───────────────────────────────────────── */
function normalizeRecord(raw) {
    return {
        seriesID: raw.seriesID ?? raw.SeriesID ?? 0,
        seriesType: raw.seriesType ?? raw.SeriesType ?? '',
        initialCharacters: raw.initialCharacters ?? raw.InitialCharacters ?? '',
        delimiter: raw.delimiter ?? raw.Delimiter ?? '',
        lastNumberUsed: raw.lastNumberUsed ?? raw.LastNumberUsed ?? 0,
        useCurrentFY: raw.useCurrentFY ?? raw.UseCurrentFY ?? false,
        format: raw.format ?? raw.Format ?? '',
        isActive: raw.isActive ?? raw.IsActive ?? false,
    };
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const EMPTY_FORM = {
    seriesType: '',
    initialCharacters: '',
    delimiter: '',
    lastNumberUsed: '',
    useCurrentFY: false,
    format: '',
    isActive: true,
};

const PAGE_SIZE_OPTIONS = [10, 12, 15, 20];

function validate(form) {
    const errs = {};
    if (!form.seriesType)
        errs.seriesType = 'Series type is required';

    if (!form.initialCharacters.trim())
        errs.initialCharacters = 'Initial characters are required';
    else if (form.initialCharacters.trim().length > 20)
        errs.initialCharacters = 'Max 20 characters';

    if (!form.format.trim())
        errs.format = 'Format is required';
    else if (form.format.trim().length > 100)
        errs.format = 'Max 100 characters';

    if (form.lastNumberUsed !== '' && isNaN(Number(form.lastNumberUsed)))
        errs.lastNumberUsed = 'Must be a number';

    return errs;
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
   STATUS BADGE
───────────────────────────────────────── */
function ActiveBadge({ active }) {
    return active ? (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 11px', borderRadius: 20,
            background: '#f0fdf4', color: '#16a34a',
            border: '1px solid #bbf7d0',
            fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800,
        }}>
            <CheckCircle2 size={11} /> Active
        </span>
    ) : (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 11px', borderRadius: 20,
            background: '#f8f8fd', color: '#9090a8',
            border: '1px solid #e0e0f0',
            fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800,
        }}>
            <Circle size={11} /> Inactive
        </span>
    );
}

function FYBadge({ use }) {
    return use ? (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 11px', borderRadius: 20,
            background: 'rgba(4,158,223,0.08)', color: '#049edf',
            border: '1px solid rgba(4,158,223,0.25)',
            fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800,
        }}>
            <CheckCircle2 size={11} /> Yes
        </span>
    ) : (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 11px', borderRadius: 20,
            background: '#f8f8fd', color: '#9090a8',
            border: '1px solid #e0e0f0',
            fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800,
        }}>
            <Minus size={11} /> No
        </span>
    );
}

/* ─────────────────────────────────────────
   FIELD LABEL
───────────────────────────────────────── */
const FieldLabel = ({ label, required }) => (
    <label className="pg-field-label">
        {label}
        {required && <span className="pg-field-label__required"> *</span>}
    </label>
);

/* ─────────────────────────────────────────
   TOGGLE ROW
───────────────────────────────────────── */
function ToggleRow({ value, onChange, label, activeLabel, inactiveLabel, activeColor = '#049edf', activeBg = 'rgba(4,158,223,0.05)', activeBorder = 'rgba(4,158,223,0.25)' }) {
    return (
        <div
            onClick={() => onChange(!value)}
            style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 11, cursor: 'pointer',
                background: value ? activeBg : '#f8f8fd',
                border: `1.5px solid ${value ? activeBorder : '#e8e8f4'}`,
                transition: 'all 0.15s', userSelect: 'none',
            }}>
            {value
                ? <ToggleRight size={22} color={activeColor} style={{ flexShrink: 0 }} />
                : <ToggleLeft size={22} color="#c0c0d8" style={{ flexShrink: 0 }} />}
            <div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800, color: value ? activeColor : '#7878a0' }}>
                    {value ? activeLabel : inactiveLabel}
                </div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 600, color: '#9090a8', marginTop: 1 }}>
                    {label}
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════
   ADD / EDIT MODAL
══════════════════════════════════════════ */
function SeriesModal({ onClose, onSaved, editData }) {
    const isEdit = !!editData;
    const [form, setForm] = useState(isEdit
        ? { ...editData, lastNumberUsed: String(editData.lastNumberUsed ?? 0) }
        : { ...EMPTY_FORM });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [apiError, setApiError] = useState('');

    const handleChange = (key, val) => {
        setForm(p => ({ ...p, [key]: val }));
        if (touched[key]) {
            const e = validate({ ...form, [key]: val });
            setErrors(p => ({ ...p, [key]: e[key] || '' }));
        }
    };

    const handleBlur = (key) => {
        setTouched(p => ({ ...p, [key]: true }));
        const e = validate(form);
        setErrors(p => ({ ...p, [key]: e[key] || '' }));
    };

    const handleSubmit = async () => {
        const allTouched = {};
        Object.keys(EMPTY_FORM).forEach(k => { allTouched[k] = true; });
        setTouched(allTouched);
        const e = validate(form);
        if (Object.keys(e).length) { setErrors(e); return; }

        setSubmitting(true);
        setApiError('');
        try {
            const payload = {
                seriesType: form.seriesType.trim(),
                initialCharacters: form.initialCharacters.trim(),
                delimiter: form.delimiter,
                lastNumberUsed: Number(form.lastNumberUsed) || 0,
                useCurrentFY: form.useCurrentFY,
                format: form.format.trim(),
                isActive: form.isActive,
            };
            if (isEdit) {
                await seriesApi.update(editData.seriesID, payload);
            } else {
                await seriesApi.create(payload);
            }
            setSuccess(true);
            await new Promise(r => setTimeout(r, 600));
            onSaved();
            onClose();
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.title ||
                err?.message ||
                'Something went wrong.';
            setApiError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return ReactDOM.createPortal(
        // <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="pg-overlay">
            <div className="pg-modal" style={{ maxWidth: 580 }}>

                {/* Head */}
                <div className="pg-modal__head">
                    <div className="pg-modal__head-left">
                        <div className="pg-modal__icon-wrap">
                            <Hash size={20} color="#049edf" />
                        </div>
                        <div>
                            <h5 className="pg-modal__title">
                                {isEdit ? 'Edit Series' : 'Add Series'}
                            </h5>
                            <p className="pg-modal__subtitle">
                                {isEdit
                                    ? `Editing: ${editData.seriesType}`
                                    : 'Configure a new series ID pattern'}
                            </p>
                        </div>
                    </div>
                    <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
                </div>

                {/* API error */}
                {apiError && (
                    <div style={{
                        margin: '0 24px 4px', padding: '10px 14px',
                        background: '#fef2f2', border: '1px solid #fecaca',
                        borderRadius: 11, color: '#dc2626', fontSize: 12.5,
                        fontWeight: 600, display: 'flex', gap: 8, alignItems: 'flex-start',
                    }}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{apiError}</span>
                    </div>
                )}

                {/* Body */}
                <div className="pg-modal__body">
                    <div className="row g-3">

                        {/* Series Type */}
                        <div className="col-12 col-sm-6">
                            <FieldLabel label="Series Type" required />
                            <div className={`pg-field-wrap ${errors.seriesType ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                                <Settings2 size={14} color={errors.seriesType ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                                <select
                                    className="pg-field-input"
                                    value={form.seriesType}
                                    onChange={e => handleChange('seriesType', e.target.value)}
                                    onBlur={() => handleBlur('seriesType')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <option value="">— Select type —</option>
                                    <option value="Performa Invoice">Performa Invoice</option>
                                    <option value="Quotation">Quotation</option>
                                </select>
                            </div>
                            {errors.seriesType && (
                                <div className="pg-field-error">
                                    <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{errors.seriesType}</span>
                                </div>
                            )}
                        </div>

                        {/* Initial Characters */}
                        <div className="col-12 col-sm-6">
                            <FieldLabel label="Initial Characters" required />
                            <div className={`pg-field-wrap ${errors.initialCharacters ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                                <Type size={14} color={errors.initialCharacters ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                                <input
                                    className="pg-field-input"
                                    placeholder="e.g. INV, QT"
                                    value={form.initialCharacters}
                                    onChange={e => handleChange('initialCharacters', e.target.value)}
                                    onBlur={() => handleBlur('initialCharacters')}
                                />
                            </div>
                            {errors.initialCharacters && (
                                <div className="pg-field-error">
                                    <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{errors.initialCharacters}</span>
                                </div>
                            )}
                        </div>

                        {/* Delimiter */}
                        <div className="col-12 col-sm-6">
                            <FieldLabel label="Delimiter" />
                            <div className="pg-field-wrap pg-field-wrap--normal">
                                <Minus size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
                                <input
                                    className="pg-field-input"
                                    placeholder='e.g.  /  -  _'
                                    value={form.delimiter}
                                    onChange={e => handleChange('delimiter', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Last Number Used */}
                        <div className="col-12 col-sm-6">
                            <FieldLabel label="Last Number Used" />
                            <div className={`pg-field-wrap ${errors.lastNumberUsed ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                                <ListOrdered size={14} color={errors.lastNumberUsed ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                                <input
                                    type="number"
                                    className="pg-field-input"
                                    placeholder="0"
                                    value={form.lastNumberUsed}
                                    onChange={e => handleChange('lastNumberUsed', e.target.value)}
                                    onBlur={() => handleBlur('lastNumberUsed')}
                                    min={0}
                                />
                            </div>
                            {errors.lastNumberUsed && (
                                <div className="pg-field-error">
                                    <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{errors.lastNumberUsed}</span>
                                </div>
                            )}
                        </div>

                        {/* Format */}
                        <div className="col-12">
                            <FieldLabel label="Format" required />
                            <div className={`pg-field-wrap ${errors.format ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                                <AlignLeft size={14} color={errors.format ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                                <input
                                    className="pg-field-input"
                                    placeholder="e.g. {PREFIX}{DELIM}{FY}{DELIM}{SEQ}"
                                    value={form.format}
                                    onChange={e => handleChange('format', e.target.value)}
                                    onBlur={() => handleBlur('format')}
                                />
                            </div>
                            {errors.format && (
                                <div className="pg-field-error">
                                    <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{errors.format}</span>
                                </div>
                            )}
                        </div>

                        {/* Use Current FY toggle */}
                        <div className="col-12 col-sm-6">
                            <FieldLabel label="Use Current Financial Year" />
                            <ToggleRow
                                value={form.useCurrentFY}
                                onChange={val => handleChange('useCurrentFY', val)}
                                label="Include current FY in series"
                                activeLabel="Use Current FY"
                                inactiveLabel="Don't Use FY"
                                activeColor="#049edf"
                                activeBg="rgba(4,158,223,0.05)"
                                activeBorder="rgba(4,158,223,0.25)"
                            />
                        </div>

                        {/* Is Active toggle */}
                        <div className="col-12 col-sm-6">
                            <FieldLabel label="Status" />
                            <ToggleRow
                                value={form.isActive}
                                onChange={val => handleChange('isActive', val)}
                                label="Series availability"
                                activeLabel="Active"
                                inactiveLabel="Inactive"
                                activeColor="#16a34a"
                                activeBg="rgba(22,163,74,0.05)"
                                activeBorder="#bbf7d0"
                            />
                        </div>

                    </div>

                    <p className="pg-form__note">
                        <span className="pg-field-label__required">*</span> Required fields
                    </p>
                </div>

                {/* Footer */}
                <div className="pg-modal__foot">
                    <button className="pg-btn-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button className="pg-btn-save" onClick={handleSubmit} disabled={submitting}>
                        {success
                            ? <><Check size={14} /> {isEdit ? 'Saved!' : 'Added!'}</>
                            : submitting
                                ? <><RefreshCw size={13} className="pg-spin" /> Saving…</>
                                : <><Plus size={14} /> {isEdit ? 'Save Changes' : 'Add Series'}</>
                        }
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
}

/* ─────────────────────────────────────────
   MOBILE CARD
───────────────────────────────────────── */
function SeriesCard({ rec, onEdit }) {
    return (
        <div className="pg-card">
            <div className="pg-card__header">
                <div className="pg-card__title-wrap">
                    <div className="pg-card__title">{rec.seriesType || `Series #${rec.seriesID}`}</div>
                    <div className="pg-card__subtitle">ID #{rec.seriesID}</div>
                </div>
                <div className="pg-card__actions">
                    <button className="pg-card__btn-edit" onClick={() => onEdit(rec)} title="Edit">
                        <Edit2 size={13} />
                    </button>
                </div>
            </div>
            <div className="pg-card__body">
                <div className="pg-card__row">
                    <Type size={12} color="#c0c0d8" className="pg-card__row-icon" />
                    <span className="pg-card__row-text">
                        <strong>{rec.initialCharacters}</strong>
                        {rec.delimiter ? ` ${rec.delimiter} ` : ' '}
                        <span style={{ color: '#9090a8', fontSize: 11 }}>{rec.format}</span>
                    </span>
                </div>
                <div className="pg-card__row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    <ActiveBadge active={rec.isActive} />
                    <FYBadge use={rec.useCurrentFY} />
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════
   SERIES SETUP PAGE  (main export)
══════════════════════════════════════════ */
export default function SeriesSetupPage() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
    const [sortKey, setSortKey] = useState('seriesType');
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const tableRef = useRef(null);
    const [tableReady, setTableReady] = useState(false);

    // Column widths: ID | Series Type | Prefix | Delimiter | Format | Last# | Use FY | Status | Action
    useResizableColumns(tableRef, tableReady, [60, 160, 110, 90, 180, 90, 90, 100, 80]);

    /* ── Fetch ── */
    const fetchData = useCallback(async () => {
        setLoading(true);
        setFetchError('');
        try {
            const raw = await seriesApi.getAll();
            const list = Array.isArray(raw)
                ? raw
                : Array.isArray(raw?.data)
                    ? raw.data
                    : Array.isArray(raw?.$values)
                        ? raw.$values
                        : [];
            setRecords(list.map(normalizeRecord));
            setTableReady(false);
            setTimeout(() => setTableReady(true), 0);
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.title ||
                err?.message ||
                'Failed to load series setup.';
            setFetchError(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── Derived ── */
    const filtered = records.filter(r => {
        const q = search.toLowerCase();
        const matchSearch =
            r.seriesType.toLowerCase().includes(q) ||
            r.initialCharacters.toLowerCase().includes(q) ||
            r.format.toLowerCase().includes(q) ||
            String(r.seriesID).includes(q);
        const matchStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && r.isActive) ||
            (statusFilter === 'inactive' && !r.isActive);
        return matchSearch && matchStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
        let av = a[sortKey], bv = b[sortKey];
        if (typeof av === 'boolean') { av = av ? 1 : 0; bv = bv ? 1 : 0; }
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
        setPage(1);
    };

    const activeCount = records.filter(r => r.isActive).length;
    const inactiveCount = records.filter(r => !r.isActive).length;

    const COLS = [
        { key: 'seriesID', label: 'ID', w: '6%' },
        { key: 'seriesType', label: 'Series Type', w: '13%' },
        { key: 'initialCharacters', label: 'Prefix', w: '10%' },
        { key: 'delimiter', label: 'Delimiter', w: '8%' },
        { key: 'format', label: 'Format', w: '18%' },
        { key: 'lastNumberUsed', label: 'Last #', w: '8%' },
        { key: 'useCurrentFY', label: 'Use FY', w: '8%' },
        { key: 'isActive', label: 'Status', w: '9%' },
        { key: '_action', label: 'Action', w: '7%', noSort: true },
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
            <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>
                Loading series setup…
            </span>
        </div>
    );

    /* ── Error ── */
    if (fetchError) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
            <AlertCircle size={28} color="#ef4444" />
            <span style={{ fontFamily: 'Nunito,sans-serif', color: '#ef4444', fontSize: 14 }}>{fetchError}</span>
            <button className="pg-btn-add" onClick={fetchData}><RefreshCw size={13} /> Retry</button>
        </div>
    );

    /* ── Main render ── */
    return (
        <>
            <div className="pg-page">

                {/* ── Header ── */}
                <div className="pg-header" style={{ marginBottom: 16 }}>
                    <div>
                        <h1 className="pg-header__title">Series Setup</h1>
                        <p className="pg-header__subtitle">
                            Manage <strong>series ID</strong> patterns used for numbering documents.
                        </p>
                    </div>
                    <button
                        className="pg-btn-add"
                        onClick={() => { setEditRecord(null); setShowModal(true); }}
                    >
                        <Plus size={14} /> Add Series
                    </button>
                </div>
                {/* ── Table container ── */}
                <div className="pg-container">

                    {/* Toolbar */}
                    <div className="pg-toolbar">
                        <div className="pg-toolbar__inner">
                            <div className="pg-toolbar__count">
                                <Hash size={14} color="#9090a8" />
                                <span>
                                    <strong>{filtered.length}</strong> series{filtered.length !== 1 ? '' : ''}
                                </span>
                            </div>

                            <div className="pg-search-box" style={{ flex: 1, maxWidth: 320 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0c0d8" strokeWidth="2.5">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    placeholder="Search by type, prefix, format…"
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                />
                                {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
                            </div>

                            {/* Status filter pills */}
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                {[
                                    { key: 'all', label: 'All' },
                                    { key: 'active', label: 'Active' },
                                    { key: 'inactive', label: 'Inactive' },
                                ].map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => { setStatusFilter(f.key); setPage(1); }}
                                        style={{
                                            padding: '5px 11px', borderRadius: 20, whiteSpace: 'nowrap',
                                            cursor: 'pointer', transition: 'all 0.15s',
                                            border: statusFilter === f.key
                                                ? '1.5px solid #049edf'
                                                : '1.5px solid #e8e8f4',
                                            background: statusFilter === f.key
                                                ? 'rgba(4,158,223,0.08)'
                                                : '#f8f8fd',
                                            color: statusFilter === f.key ? '#049edf' : '#7878a0',
                                            fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800,
                                        }}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            <button className="pg-pg-btn" onClick={fetchData} title="Refresh" style={{ marginLeft: 'auto' }}>
                                <RefreshCw size={13} />
                            </button>
                        </div>
                    </div>

                    {/* ── Desktop table ── */}
                    <div className="pg-desktop-table">
                        <table ref={tableRef} className="pg-table" style={{ minWidth: 760 }}>
                            <thead>
                                <tr>
                                    {COLS.map(col => (
                                        <th
                                            key={col.key}
                                            style={{ width: col.w }}
                                            className={['pg-th', col.noSort ? '' : 'pg-th--sort'].filter(Boolean).join(' ')}
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
                                                <Hash size={36} color="#d0d0e8" />
                                                <span className="pg-empty__label">No series found</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginated.map(rec => (
                                    <tr key={rec.seriesID} className="pg-tr">

                                        {/* ID */}
                                        <td className="pg-td">
                                            <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, color: '#049edf', fontSize: 12 }}>
                                                #{rec.seriesID}
                                            </span>
                                        </td>

                                        {/* Series Type */}
                                        <td className="pg-td">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{
                                                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                                    background: 'linear-gradient(135deg,rgba(4,158,223,0.12),rgba(108,99,255,0.09))',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <Hash size={13} color="#049edf" />
                                                </div>
                                                <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, color: '#1a1a2e', fontSize: 13 }}>
                                                    {rec.seriesType || '—'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Prefix */}
                                        <td className="pg-td">
                                            <span style={{
                                                fontFamily: 'monospace', fontWeight: 700, fontSize: 12,
                                                background: 'rgba(4,158,223,0.08)', color: '#049edf',
                                                padding: '3px 8px', borderRadius: 6,
                                            }}>
                                                {rec.initialCharacters || '—'}
                                            </span>
                                        </td>

                                        {/* Delimiter */}
                                        <td className="pg-td">
                                            <span style={{
                                                fontFamily: 'monospace', fontWeight: 700, fontSize: 13,
                                                background: '#f4f4fb', color: '#7878a0',
                                                padding: '3px 8px', borderRadius: 6,
                                            }}>
                                                {rec.delimiter || <span style={{ color: '#c0c0d8' }}>—</span>}
                                            </span>
                                        </td>

                                        {/* Format */}
                                        <td className="pg-td" style={{ maxWidth: 180 }}>
                                            <span style={{
                                                fontFamily: 'monospace', fontSize: 11, color: '#4a5568',
                                                display: 'block', overflow: 'hidden',
                                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }} title={rec.format}>
                                                {rec.format || '—'}
                                            </span>
                                        </td>

                                        {/* Last # */}
                                        <td className="pg-td">
                                            <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: 13, color: '#4a5568' }}>
                                                {rec.lastNumberUsed ?? 0}
                                            </span>
                                        </td>

                                        {/* Use FY */}
                                        <td className="pg-td">
                                            <FYBadge use={rec.useCurrentFY} />
                                        </td>

                                        {/* Status */}
                                        <td className="pg-td">
                                            <ActiveBadge active={rec.isActive} />
                                        </td>

                                        {/* Action */}
                                        <td className="pg-td">
                                            <div className="pg-action-wrap">
                                                <button
                                                    className="pg-btn-edit"
                                                    title="Edit"
                                                    onClick={() => { setEditRecord(rec); setShowModal(true); }}
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                            </div>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Mobile cards ── */}
                    <div className="pg-mobile-cards">
                        {paginated.length === 0
                            ? (
                                <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                                    <Hash size={36} color="#d0d0e8" />
                                    <span className="pg-empty__label">No series found</span>
                                </div>
                            )
                            : paginated.map(rec => (
                                <SeriesCard
                                    key={rec.seriesID}
                                    rec={rec}
                                    onEdit={r => { setEditRecord(r); setShowModal(true); }}
                                />
                            ))
                        }
                    </div>

                    {/* ── Pagination ── */}
                    <div className="pg-pagination">
                        <div className="pg-pagination__left">
                            <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(1)}>              <ChevronsLeft size={13} /></button>
                            <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>     <ChevronLeft size={13} /></button>
                            {pageNums.map((p, i) =>
                                p === '…'
                                    ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span>
                                    : <button key={p} className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                            )}
                            <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>     <ChevronRight size={13} /></button>
                            <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>     <ChevronsRight size={13} /></button>
                        </div>
                        <div className="pg-pagination__right">
                            <select
                                className="pg-pagesize-select"
                                value={pageSize}
                                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                            >
                                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <span className="pg-pagination__text">/ page</span>
                            <span className="pg-pagination__text">{page}/{totalPages}</span>
                        </div>
                    </div>

                </div>{/* pg-container */}
            </div>{/* pg-page */}

            {/* ── Modal (portal) ── */}
            {showModal && (
                <SeriesModal
                    onClose={() => { setShowModal(false); setEditRecord(null); }}
                    onSaved={fetchData}
                    editData={editRecord}
                />
            )}
        </>
    );
}