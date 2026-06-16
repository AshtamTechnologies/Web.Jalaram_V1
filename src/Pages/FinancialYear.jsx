import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
    CalendarDays, Plus, RefreshCw, X, AlertCircle,
    ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight,
    ChevronLeft, ChevronRight, Filter, Loader2,
    Edit2, Check, CheckCircle2, Circle,
    Calendar, ToggleLeft, ToggleRight,
    BadgeCheck,
} from 'lucide-react';
import './Common1.css';
import { apiService } from '../api/api';               // ← adjust path if needed
import { useResizableColumns } from '../hooks/useResizableColumns'; // ← adjust path if needed

/* ─────────────────────────────────────────
   THIN API WRAPPER  (uses centralised apiService)
───────────────────────────────────────── */
const fyApi = {
    getAll:  ()     => apiService.getAllFinancialYears(),
    create:  (data) => apiService.createFinancialYear(data),
    update:  (data) => apiService.updateFinancialYear(data),
};

/* ─────────────────────────────────────────
   NORMALIZE
───────────────────────────────────────── */
function normalizeRecord(raw) {
    return {
        financialYearID:           raw.financialYearID           ?? raw.FinancialYearID           ?? 0,
        financialYearBeginDate:   (raw.financialYearBeginDate    ?? raw.FinancialYearBeginDate    ?? '').split('T')[0],
        financialYearEndDate:     (raw.financialYearEndDate      ?? raw.FinancialYearEndDate      ?? '').split('T')[0],
        financialYearAbbrevation:  raw.financialYearAbbrevation  ?? raw.FinancialYearAbbrevation  ?? '',
        currentlyOpen:             raw.currentlyOpen             ?? raw.CurrentlyOpen             ?? false,
    };
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtDate(d) {
    if (!d) return '—';
    try {
        return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
        });
    } catch { return d; }
}

const EMPTY_FORM = {
    financialYearBeginDate:  '',
    financialYearEndDate:    '',
    financialYearAbbrevation: '',
    currentlyOpen:           false,
};

const PAGE_SIZE_OPTIONS = [10, 12, 15, 20];

/* ─────────────────────────────────────────
   VALIDATION
───────────────────────────────────────── */
function validate(form) {
    const errs = {};
    if (!form.financialYearBeginDate)
        errs.financialYearBeginDate = 'Begin date is required';
    if (!form.financialYearEndDate)
        errs.financialYearEndDate = 'End date is required';
    if (
        form.financialYearBeginDate &&
        form.financialYearEndDate &&
        form.financialYearEndDate <= form.financialYearBeginDate
    )
        errs.financialYearEndDate = 'End date must be after begin date';
    if (!form.financialYearAbbrevation.trim())
        errs.financialYearAbbrevation = 'Abbreviation is required';
    else if (form.financialYearAbbrevation.trim().length > 20)
        errs.financialYearAbbrevation = 'Max 20 characters';
    return errs;
}

/* ─────────────────────────────────────────
   SORT ICON
───────────────────────────────────────── */
function SortIcon({ col, sortKey, sortDir }) {
    const active = sortKey === col;
    return (
        <span className="pg-sort-icon">
            <ChevronUp   size={10} color={active && sortDir === 'asc'  ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__up"   />
            <ChevronDown size={10} color={active && sortDir === 'desc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__down" />
        </span>
    );
}

/* ─────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────── */
function StatusBadge({ open }) {
    return open ? (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 11px', borderRadius: 20,
            background: '#f0fdf4', color: '#16a34a',
            border: '1px solid #bbf7d0',
            fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800,
        }}>
            <CheckCircle2 size={11} /> Open
        </span>
    ) : (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 11px', borderRadius: 20,
            background: '#f8f8fd', color: '#9090a8',
            border: '1px solid #e0e0f0',
            fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800,
        }}>
            <Circle size={11} /> Closed
        </span>
    );
}

/* ══════════════════════════════════════════
   ADD / EDIT MODAL
══════════════════════════════════════════ */
function FYModal({ onClose, onSaved, editData }) {
    const isEdit = !!editData;
    const [form,       setForm]       = useState(isEdit ? { ...editData } : { ...EMPTY_FORM });
    const [errors,     setErrors]     = useState({});
    const [touched,    setTouched]    = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [success,    setSuccess]    = useState(false);
    const [apiError,   setApiError]   = useState('');

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
            if (isEdit) {
                await fyApi.update({ ...form, financialYearID: editData.financialYearID });
            } else {
                await fyApi.create(form);
            }
            setSuccess(true);
            await new Promise(r => setTimeout(r, 600));
            onSaved();
            onClose();
        } catch (err) {
            // apiService axios interceptor rejects with the axios error object
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.title   ||
                err?.message                 ||
                'Something went wrong.';
            setApiError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const FieldLabel = ({ label, required, optional }) => (
        <label className="pg-field-label">
            {label}
            {required && <span className="pg-field-label__required"> *</span>}
            {optional && <span className="pg-field-label__optional"> (optional)</span>}
        </label>
    );

    return ReactDOM.createPortal(
        <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="pg-modal" style={{ maxWidth: 540 }}>

                {/* Head */}
                <div className="pg-modal__head">
                    <div className="pg-modal__head-left">
                        <div className="pg-modal__icon-wrap">
                            <CalendarDays size={20} color="#049edf" />
                        </div>
                        <div>
                            <h5 className="pg-modal__title">
                                {isEdit ? 'Edit Financial Year' : 'Add Financial Year'}
                            </h5>
                            <p className="pg-modal__subtitle">
                                {isEdit
                                    ? `Editing: ${editData.financialYearAbbrevation}`
                                    : 'Define a new financial year period'}
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

                        {/* Abbreviation */}
                        <div className="col-12">
                            <FieldLabel label="Financial Year Abbreviation" required />
                            <div className={`pg-field-wrap ${errors.financialYearAbbrevation ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                                <BadgeCheck size={14} color={errors.financialYearAbbrevation ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                                <input
                                    className="pg-field-input"
                                    placeholder="e.g. FY 2025-26"
                                    value={form.financialYearAbbrevation}
                                    onChange={e => handleChange('financialYearAbbrevation', e.target.value)}
                                    onBlur={() => handleBlur('financialYearAbbrevation')}
                                />
                            </div>
                            {errors.financialYearAbbrevation && (
                                <div className="pg-field-error">
                                    <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{errors.financialYearAbbrevation}</span>
                                </div>
                            )}
                        </div>

                        {/* Begin Date */}
                        <div className="col-12 col-sm-6">
                            <FieldLabel label="Begin Date" required />
                            <div className={`pg-field-wrap ${errors.financialYearBeginDate ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                                <Calendar size={14} color={errors.financialYearBeginDate ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                                <input
                                    type="date"
                                    className="pg-field-input"
                                    value={form.financialYearBeginDate}
                                    onChange={e => handleChange('financialYearBeginDate', e.target.value)}
                                    onBlur={() => handleBlur('financialYearBeginDate')}
                                />
                            </div>
                            {errors.financialYearBeginDate && (
                                <div className="pg-field-error">
                                    <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{errors.financialYearBeginDate}</span>
                                </div>
                            )}
                        </div>

                        {/* End Date */}
                        <div className="col-12 col-sm-6">
                            <FieldLabel label="End Date" required />
                            <div className={`pg-field-wrap ${errors.financialYearEndDate ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                                <Calendar size={14} color={errors.financialYearEndDate ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                                <input
                                    type="date"
                                    className="pg-field-input"
                                    value={form.financialYearEndDate}
                                    onChange={e => handleChange('financialYearEndDate', e.target.value)}
                                    onBlur={() => handleBlur('financialYearEndDate')}
                                />
                            </div>
                            {errors.financialYearEndDate && (
                                <div className="pg-field-error">
                                    <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{errors.financialYearEndDate}</span>
                                </div>
                            )}
                        </div>

                        {/* Currently Open toggle */}
                        <div className="col-12">
                            <FieldLabel label="Status" />
                            <div
                                onClick={() => handleChange('currentlyOpen', !form.currentlyOpen)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '11px 14px', borderRadius: 11, cursor: 'pointer',
                                    background: form.currentlyOpen ? 'rgba(22,163,74,0.05)' : '#f8f8fd',
                                    border: `1.5px solid ${form.currentlyOpen ? '#bbf7d0' : '#e8e8f4'}`,
                                    transition: 'all 0.15s', userSelect: 'none',
                                }}>
                                {form.currentlyOpen
                                    ? <ToggleRight size={22} color="#16a34a" style={{ flexShrink: 0 }} />
                                    : <ToggleLeft  size={22} color="#c0c0d8" style={{ flexShrink: 0 }} />}
                                <div>
                                    <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800, color: form.currentlyOpen ? '#16a34a' : '#7878a0' }}>
                                        {form.currentlyOpen ? 'Currently Open' : 'Closed'}
                                    </div>
                                    <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 600, color: '#9090a8', marginTop: 1 }}>
                                        {form.currentlyOpen
                                            ? 'This financial year is active'
                                            : 'This financial year is not active'}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <p className="pg-form__note">
                        <span className="pg-field-label__required">*</span> Required fields
                    </p>
                </div>

                {/* Footer */}
                <div className="pg-modal__foot">
                    <button className="pg-btn-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button className="pg-btn-save"   onClick={handleSubmit} disabled={submitting}>
                        {success
                            ? <><Check size={14} /> {isEdit ? 'Saved!' : 'Added!'}</>
                            : submitting
                                ? <><RefreshCw size={13} className="pg-spin" /> Saving…</>
                                : <><Plus size={14} /> {isEdit ? 'Save Changes' : 'Add Financial Year'}</>
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
function FYCard({ fy, onEdit }) {
    return (
        <div className="pg-card">
            <div className="pg-card__header">
                <div className="pg-card__title-wrap">
                    <div className="pg-card__title">{fy.financialYearAbbrevation || `FY #${fy.financialYearID}`}</div>
                    <div className="pg-card__subtitle">ID #{fy.financialYearID}</div>
                </div>
                <div className="pg-card__actions">
                    <button className="pg-card__btn-edit" onClick={() => onEdit(fy)} title="Edit">
                        <Edit2 size={13} />
                    </button>
                </div>
            </div>
            <div className="pg-card__body">
                <div className="pg-card__row">
                    <Calendar size={12} color="#c0c0d8" className="pg-card__row-icon" />
                    <span className="pg-card__row-text">
                        {fmtDate(fy.financialYearBeginDate)} → {fmtDate(fy.financialYearEndDate)}
                    </span>
                </div>
                <div className="pg-card__row">
                    <ToggleLeft size={12} color="#c0c0d8" className="pg-card__row-icon" />
                    <StatusBadge open={fy.currentlyOpen} />
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════
   FINANCIAL YEAR PAGE  (main export)
══════════════════════════════════════════ */
export default function FinancialYearPage() {
    const [records,     setRecords]     = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [fetchError,  setFetchError]  = useState('');
    const [showModal,   setShowModal]   = useState(false);
    const [editRecord,  setEditRecord]  = useState(null);
    const [search,      setSearch]      = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open' | 'closed'
    const [sortKey,     setSortKey]     = useState('financialYearBeginDate');
    const [sortDir,     setSortDir]     = useState('desc');
    const [page,        setPage]        = useState(1);
    const [pageSize,    setPageSize]    = useState(12);
    const tableRef   = useRef(null);
    const [tableReady, setTableReady] = useState(false);

    // Column widths match COLS order:
    // ID | Abbreviation | Begin Date | End Date | Status | Action
    useResizableColumns(tableRef, tableReady, [70, 220, 160, 160, 160, 100]);

    /* ── Fetch ── */
    const fetchData = useCallback(async () => {
        setLoading(true);
        setFetchError('');
        try {
            const raw  = await fyApi.getAll();
            const list = Array.isArray(raw)
                ? raw
                : Array.isArray(raw?.data)
                    ? raw.data
                    : Array.isArray(raw?.$values)
                        ? raw.$values
                        : [];
            setRecords(list.map(normalizeRecord));
            setTableReady(false);                      // reset so hook re-runs
            setTimeout(() => setTableReady(true), 0);  // flip after DOM paints
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.title   ||
                err?.message                 ||
                'Failed to load financial years.';
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
            r.financialYearAbbrevation.toLowerCase().includes(q) ||
            String(r.financialYearID).includes(q)               ||
            r.financialYearBeginDate.includes(q)                ||
            r.financialYearEndDate.includes(q);
        const matchStatus =
            statusFilter === 'all'                               ||
            (statusFilter === 'open'   &&  r.currentlyOpen)     ||
            (statusFilter === 'closed' && !r.currentlyOpen);
        return matchSearch && matchStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
        let av = a[sortKey], bv = b[sortKey];
        if (typeof av === 'boolean') { av = av ? 1 : 0; bv = bv ? 1 : 0; }
        if (typeof av === 'string')  av = av.toLowerCase();
        if (typeof bv === 'string')  bv = bv.toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 :  1;
        if (av > bv) return sortDir === 'asc' ?  1 : -1;
        return 0;
    });

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
        setPage(1);
    };

    const openCount   = records.filter(r =>  r.currentlyOpen).length;
    const closedCount = records.filter(r => !r.currentlyOpen).length;

    const COLS = [
        { key: 'financialYearID',          label: 'ID',           w: '7%'  },
        { key: 'financialYearAbbrevation', label: 'Abbreviation', w: '22%' },
        { key: 'financialYearBeginDate',   label: 'Begin Date',   w: '18%' },
        { key: 'financialYearEndDate',     label: 'End Date',     w: '18%' },
        { key: 'currentlyOpen',            label: 'Status',       w: '18%' },
        { key: '_action',                  label: 'Action',       w: '10%', noSort: true },
    ];

    /* smart page-number pills with ellipsis */
    const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
        .reduce((acc, p, i, arr) => {
            if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
            acc.push(p);
            return acc;
        }, []);

    /* ── Loading state ── */
    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
            <Loader2 size={32} color="#049edf" className="pg-spin" />
            <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>
                Loading financial years…
            </span>
        </div>
    );

    /* ── Error state ── */
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
                        <h1 className="pg-header__title">Financial Years</h1>
                        <p className="pg-header__subtitle">
                            Manage <strong>financial year</strong> periods and their active status.
                        </p>
                    </div>
                    <button
                        className="pg-btn-add"
                        onClick={() => { setEditRecord(null); setShowModal(true); }}
                    >
                        <Plus size={14} /> Add Financial Year
                    </button>
                </div>
                {/* ── Table container ── */}
                <div className="pg-container">

                    {/* Toolbar */}
                    <div className="pg-toolbar">
                        <div className="pg-toolbar__inner">
                            <div className="pg-toolbar__count">
                                <CalendarDays size={14} color="#9090a8" />
                                <span>
                                    <strong>{filtered.length}</strong> year{filtered.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="pg-search-box" style={{ flex: 1, maxWidth: 320 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0c0d8" strokeWidth="2.5">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    placeholder="Search by abbreviation, date…"
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                />
                                {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
                            </div>

                            {/* Status filter pills */}
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                {[
                                    { key: 'all',    label: 'All'    },
                                    { key: 'open',   label: 'Open'   },
                                    { key: 'closed', label: 'Closed' },
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
                        <table ref={tableRef} className="pg-table" style={{ minWidth: 560 }}>
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
                                                <CalendarDays size={36} color="#d0d0e8" />
                                                <span className="pg-empty__label">No financial years found</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginated.map(fy => (
                                    <tr key={fy.financialYearID} className="pg-tr">

                                        {/* ID */}
                                        <td className="pg-td">
                                            <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, color: '#049edf', fontSize: 12 }}>
                                                #{fy.financialYearID}
                                            </span>
                                        </td>

                                        {/* Abbreviation */}
                                        <td className="pg-td">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{
                                                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                                    background: 'linear-gradient(135deg,rgba(4,158,223,0.12),rgba(108,99,255,0.09))',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <CalendarDays size={13} color="#049edf" />
                                                </div>
                                                <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, color: '#1a1a2e', fontSize: 13 }}>
                                                    {fy.financialYearAbbrevation || '—'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Begin Date */}
                                        <td className="pg-td">
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#4a5568', fontSize: 12, fontFamily: 'Nunito,sans-serif', fontWeight: 700 }}>
                                                <Calendar size={11} color="#c0c0d8" /> {fmtDate(fy.financialYearBeginDate)}
                                            </span>
                                        </td>

                                        {/* End Date */}
                                        <td className="pg-td">
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#4a5568', fontSize: 12, fontFamily: 'Nunito,sans-serif', fontWeight: 700 }}>
                                                <Calendar size={11} color="#c0c0d8" /> {fmtDate(fy.financialYearEndDate)}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="pg-td">
                                            <StatusBadge open={fy.currentlyOpen} />
                                        </td>

                                        {/* Action */}
                                        <td className="pg-td">
                                            <div className="pg-action-wrap">
                                                <button
                                                    className="pg-btn-edit"
                                                    title="Edit"
                                                    onClick={() => { setEditRecord(fy); setShowModal(true); }}
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
                                    <CalendarDays size={36} color="#d0d0e8" />
                                    <span className="pg-empty__label">No financial years found</span>
                                </div>
                            )
                            : paginated.map(fy => (
                                <FYCard
                                    key={fy.financialYearID}
                                    fy={fy}
                                    onEdit={r => { setEditRecord(r); setShowModal(true); }}
                                />
                            ))
                        }
                    </div>

                    {/* ── Pagination ── */}
                    <div className="pg-pagination">
                        <div className="pg-pagination__left">
                            <button className="pg-pg-btn" disabled={page === 1}          onClick={() => setPage(1)}>              <ChevronsLeft  size={13} /></button>
                            <button className="pg-pg-btn" disabled={page === 1}          onClick={() => setPage(p => p - 1)}>     <ChevronLeft   size={13} /></button>
                            {pageNums.map((p, i) =>
                                p === '…'
                                    ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span>
                                    : <button key={p} className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                            )}
                            <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>     <ChevronRight  size={13} /></button>
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
                <FYModal
                    onClose={() => { setShowModal(false); setEditRecord(null); }}
                    onSaved={fetchData}
                    editData={editRecord}
                />
            )}
        </>
    );
}