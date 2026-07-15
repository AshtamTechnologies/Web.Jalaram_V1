import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  IndianRupee, Plus, RefreshCw, Search, X,
  AlertCircle, Check, Edit2, Eye, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Hash, Loader2, Trash2,
  AlertTriangle, CheckCircle2,
  ChevronUp, ChevronDown, Filter,
} from 'lucide-react';
import './Common1.css';
import { apiService } from '../api/api';
import { useResizableColumns } from '../hooks/useResizableColumns';

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];
const STATUS_OPTIONS = ['Active', 'Inactive'];
const STATUS_COLORS = {
  'Active': { color: '#16a34a', bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.20)' },
  'Inactive': { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.20)' },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { color: '#4a5568' };
  return (
    <span className="pg-sitetype-pill" style={{ color: c.color, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
      {status}
    </span>
  );
}

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
   DELETE CONFIRM MODAL (portal)
═══════════════════════════════════════════ */
function DeleteModal({ expenseType, onConfirm, onCancel, deleting }) {
  const name = expenseType.expenseTypeName ?? expenseType.ExpenseTypeName ?? '';
  const id = expenseType.expenseTypeID ?? expenseType.ExpenseTypeID ?? 0;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          animation: 'modalIn 0.24s cubic-bezier(0.22,1,0.36,1) both',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Red header strip */}
        <div style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', padding: '22px 24px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,0.22)', border: '2px solid rgba(255,255,255,0.38)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Trash2 size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 18, color: '#fff', marginBottom: 2 }}>
                Delete Expense Type?
              </div>
              <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>
                This action cannot be undone
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 14, fontWeight: 600, color: '#4a5568', lineHeight: 1.7, marginBottom: 14 }}>
            Expense type <strong style={{ color: '#dc2626' }}>{name}</strong> (ID #{id}) will be permanently removed.
          </div>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 9, padding: '11px 14px',
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11,
            fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 600, color: '#991b1b', lineHeight: 1.5,
          }}>
            <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Make sure no expense records are currently using this type.</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '0 24px 22px' }}>
          <button
            onClick={onCancel} disabled={deleting}
            style={{ padding: '10px 22px', borderRadius: 11, background: '#f5f5fb', border: '1.5px solid #e8e8f0', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: 13, color: '#7878a0' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm} disabled={deleting}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 11,
              background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none',
              cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 13,
              boxShadow: '0 4px 14px rgba(220,38,38,0.38)', opacity: deleting ? 0.75 : 1,
            }}
          >
            {deleting ? <><Loader2 size={13} className="pg-spin" /> Deleting…</> : <><Trash2 size={13} /> Delete</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   VIEW MODAL (portal)
═══════════════════════════════════════════ */
function ViewModal({ expenseType, onClose, onEdit }) {
  const name = expenseType.expenseTypeName ?? expenseType.ExpenseTypeName ?? '';
  const id = expenseType.expenseTypeID ?? expenseType.ExpenseTypeID ?? 0;
  const status = expenseType.status ?? expenseType.Status ?? 'Active';

  return ReactDOM.createPortal(
    <div className="pg-overlay pg-overlay--view" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal pg-modal--view" style={{ maxWidth: 450 }}>

        {/* Gradient banner */}
        <div style={{
          background: 'linear-gradient(135deg, #049edf 0%, #6c63ff 100%)',
          borderRadius: '20px 20px 0 0', padding: '22px 22px 18px', position: 'relative',
        }}>
          <button className="pg-view__close" onClick={onClose}><X size={15} /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.2)', border: '2px solid rgba(255, 255, 255, 0.36)',
              display: 'flex', alignItems: 'center', justifycontent: 'center', flexShrink: 0,
            }}>
              <IndianRupee size={22} color="#fff" />
            </div>
            <div>
              <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.72)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 3 }}>
                Expense Type Details
              </p>
              <h3 style={{ fontFamily: 'Nunito,sans-serif', fontSize: 16, fontWeight: 900, color: '#fff', margin: 0 }}>
                {name}
              </h3>
            </div>
          </div>
          {/* ID badge */}
          <div style={{
            marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', background: 'rgba(255,255,255,0.15)', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.25)',
            fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
          }}>
            ID: <strong style={{ color: '#fff' }}>#{id}</strong>
          </div>
        </div>

        {/* Body */}
        <div className="pg-view__body">
          <p className="pg-view__section-label">General Info</p>
          <div className="pg-info-row">
            <div className="pg-info-row__icon pg-info-row__icon--highlight">
              <IndianRupee size={15} color="#049edf" />
            </div>
            <div className="pg-info-row__content">
              <p className="pg-info-row__label">Expense Type Name</p>
              <p className="pg-info-row__value" style={{ fontWeight: 700, color: '#1a1a2e' }}>
                {name}
              </p>
            </div>
          </div>
          <div className="pg-info-row" style={{ marginTop: 12 }}>
            <div className="pg-info-row__icon">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status]?.color || '#a0a0c0' }} />
            </div>
            <div className="pg-info-row__content">
              <p className="pg-info-row__label">Status</p>
              <p className="pg-info-row__value" style={{ color: STATUS_COLORS[status]?.color, fontWeight: 700 }}>
                {status}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pg-view__foot">
          <button className="pg-btn-cancel" onClick={onClose}>Close</button>
          <button className="pg-view__btn-edit" onClick={() => { onClose(); onEdit(expenseType); }}>
            <Edit2 size={13} /> Edit Type
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   ADD / EDIT MODAL (portal)
═══════════════════════════════════════════ */
function ExpenseTypeModal({ initial, onSave, onClose, saving }) {
  const isEdit = !!initial?.expenseTypeID || !!initial?.ExpenseTypeID;
  const expenseTypeID = initial?.expenseTypeID ?? initial?.ExpenseTypeID ?? 0;

  const [form, setForm] = useState({
    expenseTypeName: initial?.expenseTypeName ?? initial?.ExpenseTypeName ?? '',
    status: initial?.status ?? initial?.Status ?? 'Active',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = (f) => {
    const e = {};
    if (!String(f.expenseTypeName || '').trim()) {
      e.expenseTypeName = 'Expense type name is required.';
    }
    if (!f.status) {
      e.status = 'Status is required.';
    }
    return e;
  };

  const applyChange = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (touched[key]) {
      setErrors(p => ({ ...p, [key]: validate({ ...form, [key]: val })[key] || '' }));
    }
  };

  const handleBlur = (key) => {
    setTouched(p => ({ ...p, [key]: true }));
    setErrors(p => ({ ...p, [key]: validate(form)[key] || '' }));
  };

  const handleSubmit = async () => {
    setTouched({ expenseTypeName: true, status: true });
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    setApiError('');
    try {
      await onSave({
        expenseTypeID,
        expenseTypeName: form.expenseTypeName,
        status: form.status,
      });
      setSuccess(true);
    } catch (err) {
      setApiError(err?.response?.data?.message || err?.message || 'Something went wrong.');
    }
  };

  return ReactDOM.createPortal(
    <div className="pg-overlay">
      <div className="pg-modal" style={{ maxWidth: 500 }}>

        {/* Header */}
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap">
              <IndianRupee size={20} color="#049edf" />
            </div>
            <div>
              <h5 className="pg-modal__title">{isEdit ? 'Edit Expense Type' : 'New Expense Type'}</h5>
              <p className="pg-modal__subtitle">
                {/* {isEdit ? `Editing expense type ID #${expenseTypeID}` : 'Add a new category for office or site expenses'} */}
                {isEdit ? `Editing expense type ID #${expenseTypeID}` : 'Add a new Hoarding expenses'}
              </p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* API error banner */}
        {apiError && (
          <div style={{
            margin: '0 24px 4px', padding: '10px 14px',
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11,
            color: '#dc2626', fontSize: 12.5, fontWeight: 600,
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{apiError}</span>
          </div>
        )}

        {/* Body */}
        <div className="pg-modal__body">
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, marginBottom: 16, fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
              <CheckCircle2 size={16} />
              {isEdit ? 'Expense Type updated successfully!' : 'Expense Type created successfully!'}
            </div>
          )}

          <div className="row g-3">

            {/* Expense Type Name */}
            <div className="col-12">
              <label className="pg-field-label">
                Expense Type Name <span className="pg-field-label__required">*</span>
              </label>
              <div className={`pg-field-wrap ${errors.expenseTypeName ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                <IndianRupee size={14} color={errors.expenseTypeName ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="e.g. Printing, Labour, Travelling…"
                  value={form.expenseTypeName}
                  className="pg-field-input"
                  onChange={e => applyChange('expenseTypeName', e.target.value)}
                  onBlur={() => handleBlur('expenseTypeName')}
                />
              </div>
              {errors.expenseTypeName && (
                <div className="pg-field-error">
                  <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{errors.expenseTypeName}</span>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="col-12 col-sm-6">
              <label className="pg-field-label">
                Status <span className="pg-field-label__required">*</span>
              </label>
              <div className={`pg-field-wrap ${errors.status ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                <select
                  value={form.status}
                  className="pg-field-input"
                  onChange={e => applyChange('status', e.target.value)}
                  onBlur={() => handleBlur('status')}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', padding: '2px 0', fontWeight: 600, color: '#4a5568' }}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              {errors.status && (
                <div className="pg-field-error">
                  <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{errors.status}</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="pg-modal__foot">
          <button className="pg-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="pg-btn-save" onClick={handleSubmit} disabled={saving}>
            {success
              ? <><Check size={14} /> {isEdit ? 'Saved!' : 'Created!'}</>
              : saving
                ? <><RefreshCw size={13} className="pg-spin" /> Saving…</>
                : <><Plus size={14} /> {isEdit ? 'Save Changes' : 'Add Type'}</>
            }
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function ExpenseTypePage() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [sortKey, setSortKey] = useState('expenseTypeName');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const tableRef = useRef(null);
  const [tableReady, setTableReady] = useState(false);
  useEffect(() => { if (!loading) setTableReady(true); }, [loading]);
  useResizableColumns(tableRef, tableReady, [60, 100, 320, 180, 140]);

  const COLS = [
    { key: '_idx', label: '#', w: '8%', noSort: true },
    { key: 'expenseTypeID', label: 'Type ID', w: '12%' },
    { key: 'expenseTypeName', label: 'Expense Type Name', w: '48%' },
    { key: 'status', label: 'Status', w: '20%' },
    { key: '_action', label: 'Actions', w: '12%', noSort: true },
  ];

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const [showModal, setShowModal] = useState(false);
  const [editType, setEditType] = useState(null);
  const [viewType, setViewType] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await apiService.getAllExpenseTypes();
      const data = Array.isArray(res) ? res : res?.data ?? res?.$values ?? [];
      setTypes(data);
      setPage(1);
    } catch (err) {
      setFetchError(err?.response?.data?.message || err?.message || 'Failed to load expense types.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Save ── */
  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editType?.expenseTypeID || editType?.ExpenseTypeID) {
        const id = editType.expenseTypeID ?? editType.ExpenseTypeID;
        await apiService.updateExpenseType(id, formData);
      } else {
        await apiService.createExpenseType(formData);
      }
      await new Promise(r => setTimeout(r, 500));
      setShowModal(false);
      setEditType(null);
      fetchData();
    } catch (err) {
      setSaving(false);
      throw err;
    }
    setSaving(false);
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      const id = delTarget.expenseTypeID ?? delTarget.ExpenseTypeID;
      await apiService.deleteExpenseType(id);
      setDelTarget(null);
      fetchData();
    } catch {
      // Keep modal open on error
    } finally {
      setDeleting(false);
    }
  };

  /* ── Filter & Sort ── */
  const filtered = types
    .filter(t => {
      const q = search.toLowerCase();
      const name = (t.expenseTypeName ?? t.ExpenseTypeName ?? '').toLowerCase();
      const status = (t.status ?? t.Status ?? '').toLowerCase();
      const id = String(t.expenseTypeID ?? t.ExpenseTypeID ?? '');
      const matchSearch = !q || name.includes(q) || status.includes(q) || id.includes(q);
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && status === 'active') ||
        (statusFilter === 'inactive' && status === 'inactive');
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let av = a[sortKey] ?? a[sortKey === 'expenseTypeID' ? 'ExpenseTypeID' : sortKey === 'expenseTypeName' ? 'ExpenseTypeName' : 'Status'] ?? '';
      let bv = b[sortKey] ?? b[sortKey === 'expenseTypeID' ? 'ExpenseTypeID' : sortKey === 'expenseTypeName' ? 'ExpenseTypeName' : 'Status'] ?? '';
      if (typeof av === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p); return acc;
    }, []);

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
      <Loader2 size={32} color="#049edf" className="pg-spin" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>Loading expense types…</span>
    </div>
  );

  /* ── Fetch error ── */
  if (fetchError) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
      <AlertCircle size={28} color="#ef4444" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#ef4444', fontSize: 14 }}>{fetchError}</span>
      <button className="pg-btn-add" onClick={fetchData}><RefreshCw size={13} /> Retry</button>
    </div>
  );

  return (
    <>
      <div className="pg-page">

        {/* ── Page Header ── */}
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">Hoarding Expense Types</h1>
            {/* <p className="pg-header__subtitle">
              Manage category classifications for site, vehicle, and office expenses.{' '}
              <strong>{types.length} category{types.length !== 1 ? 'ies' : ''} configured.</strong>
            </p> */}
          </div>
          <button className="pg-btn-add" onClick={() => { setEditType(null); setShowModal(true); }}>
            <Plus size={14} /> Add Expense Type
          </button>
        </div>

        {/* ── Main Container ── */}
        <div className="pg-container">

          {/* Toolbar */}
          <div className="pg-toolbar">
            <div className="pg-toolbar__inner">
              <div className="pg-toolbar__count">
                <IndianRupee size={14} color="#9090a8" />
                <span><strong>{filtered.length}</strong> type{filtered.length !== 1 ? 's' : ''}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
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

                {/* Search */}
                <div className="pg-search-box">
                  <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
                  <input
                    placeholder="Search by ID, name or status…"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                  />
                  {search && <X size={12} className="pg-search-clear" onClick={() => { setSearch(''); setPage(1); }} />}
                </div>

                {/* Refresh */}
                <button className="pg-pg-btn" onClick={fetchData} title="Refresh">
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Desktop Table ── */}
          <div className="pg-desktop-table">
            {paginated.length === 0 ? (
              <div className="pg-empty">
                <div className="pg-empty__inner">
                  <IndianRupee size={36} color="#d0d0e8" />
                  <span className="pg-empty__label">
                    {search
                      ? 'No expense types match your search.'
                      : statusFilter === 'active'
                        ? 'No active expense types found.'
                        : statusFilter === 'inactive'
                          ? 'No inactive expense types found.'
                          : 'No expense types yet. Add your first one.'}
                  </span>
                  {!search && statusFilter === 'all' && (
                    <button className="pg-btn-add" style={{ marginTop: 12 }}
                      onClick={() => { setEditType(null); setShowModal(true); }}>
                      <Plus size={14} /> Add Type
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <table ref={tableRef} className="pg-table" style={{ tableLayout: 'fixed' }}>
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
                            : col.key === '_action' ? <Filter size={10} color="#d0d0e4" style={{ marginLeft: 5 }} /> : null}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((item, idx) => {
                    const id = item.expenseTypeID ?? item.ExpenseTypeID ?? 0;
                    const name = item.expenseTypeName ?? item.ExpenseTypeName ?? '';
                    const status = item.status ?? item.Status ?? 'Active';

                    return (
                      <tr key={id} className="pg-tr">
                        {/* Row index */}
                        <td className="pg-td" style={{ color: '#b0b0c8', fontWeight: 700, fontSize: 12 }}>
                          {(safePage - 1) * pageSize + idx + 1}
                        </td>

                        {/* ID Badge */}
                        <td className="pg-td">
                          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, color: '#9090a8' }}>
                            #{id}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="pg-td pg-td--overflow">
                          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 700, color: '#1a1a2e' }}>
                            {name}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="pg-td">
                          <StatusBadge status={status} />
                        </td>

                        {/* Actions */}
                        <td className="pg-td">
                          <div className="pg-action-wrap" style={{ justifyContent: 'flex-end' }}>
                            <button className="pg-btn-view" title="View" onClick={() => setViewType(item)}>
                              <Eye size={13} />
                            </button>
                            <button className="pg-btn-edit" title="Edit"
                              onClick={() => { setEditType(item); setShowModal(true); }}>
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="pg-btn-edit" title="Delete"
                              style={{ background: 'rgba(220,38,38,0.07)', borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626' }}
                              onClick={() => setDelTarget(item)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Mobile Cards ── */}
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <IndianRupee size={36} color="#d0d0e8" />
                <span className="pg-empty__label">
                  {search
                    ? 'No types match.'
                    : statusFilter === 'active'
                      ? 'No active expense types found.'
                      : statusFilter === 'inactive'
                        ? 'No inactive expense types found.'
                        : 'No types yet.'}
                </span>
              </div>
            ) : paginated.map(item => {
              const id = item.expenseTypeID ?? item.ExpenseTypeID ?? 0;
              const name = item.expenseTypeName ?? item.ExpenseTypeName ?? '';
              const status = item.status ?? item.Status ?? 'Active';

              return (
                <div key={id} className="pg-card">
                  <div className="pg-card__header">
                    <div className="pg-card__title-wrap">
                      <div className="pg-card__title">{name}</div>
                      <div className="pg-card__subtitle">ID: #{id}</div>
                    </div>
                    <div className="pg-card__actions">
                      <button className="pg-card__btn-view" onClick={() => setViewType(item)}><Eye size={13} /></button>
                      <button className="pg-card__btn-edit" onClick={() => { setEditType(item); setShowModal(true); }}><Edit2 size={13} /></button>
                      <button
                        className="pg-card__btn-edit"
                        style={{ background: 'rgba(220,38,38,0.08)', border: '1.5px solid rgba(220,38,38,0.2)' }}
                        onClick={() => setDelTarget(item)}
                      >
                        <Trash2 size={13} color="#dc2626" />
                      </button>
                    </div>
                  </div>
                  <div className="pg-card__body">
                    <div className="pg-card__row">
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#9090a8', marginRight: 8 }}>Status:</span>
                      <StatusBadge status={status} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {filtered.length > 0 && (
            <div className="pg-pagination">
              <div className="pg-pagination__left">
                <button className="pg-pg-btn" disabled={safePage === 1} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
                <button className="pg-pg-btn" disabled={safePage === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
                {pageNums.map((p, i) =>
                  p === '…'
                    ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span>
                    : <button key={p} className={`pg-pg-btn${p === safePage ? ' pg-pg-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                )}
                <button className="pg-pg-btn" disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></button>
                <button className="pg-pg-btn" disabled={safePage === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={13} /></button>
              </div>
              <div className="pg-pagination__right">
                <select className="pg-pagesize-select" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="pg-pagination__text">Items per page</span>
                <span className="pg-pagination__text">{safePage} of {totalPages} pages ({filtered.length} items)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Portalled modals (always on top) ── */}
      {showModal && (
        <ExpenseTypeModal
          initial={editType}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditType(null); }}
          saving={saving}
        />
      )}
      {viewType && (
        <ViewModal
          expenseType={viewType}
          onClose={() => setViewType(null)}
          onEdit={t => { setViewType(null); setEditType(t); setShowModal(true); }}
        />
      )}
      {delTarget && (
        <DeleteModal
          expenseType={delTarget}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
          deleting={deleting}
        />
      )}
    </>
  );
}
