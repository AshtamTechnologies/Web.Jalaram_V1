import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  FileText, Plus, RefreshCw, Search, X,
  AlertCircle, Check, Edit2, Eye, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Hash, AlignLeft, Loader2, Trash2,
  AlertTriangle,
} from 'lucide-react';
import './Common1.css';
import { apiService } from '../api/api';

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];

/* ═══════════════════════════════════════════
   DELETE CONFIRM MODAL  (portal)
═══════════════════════════════════════════ */
function DeleteModal({ term, onConfirm, onCancel, deleting }) {
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
                Delete Term?
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
            Term with display order <strong style={{ color: '#dc2626' }}>#{term.order}</strong> will be permanently removed.
          </div>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 9, padding: '11px 14px',
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11,
            fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 600, color: '#991b1b', lineHeight: 1.5,
          }}>
            <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Customers using this term in quotations will no longer see it.</span>
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
   VIEW MODAL  (portal)
═══════════════════════════════════════════ */
function ViewModal({ term, onClose, onEdit }) {
  return ReactDOM.createPortal(
    <div className="pg-overlay pg-overlay--view" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal pg-modal--view">

        {/* Gradient banner */}
        <div style={{
          background: 'linear-gradient(135deg, #049edf 0%, #6c63ff 100%)',
          borderRadius: '20px 20px 0 0', padding: '22px 22px 18px', position: 'relative',
        }}>
          <button className="pg-view__close" onClick={onClose}><X size={15} /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.36)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <FileText size={22} color="#fff" />
            </div>
            <div>
              <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.72)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 3 }}>
                Customer Term
              </p>
              <h3 style={{ fontFamily: 'Nunito,sans-serif', fontSize: 16, fontWeight: 900, color: '#fff', margin: 0 }}>
                Term #{term.order}
              </h3>
            </div>
          </div>
          {/* Order pill */}
          <div style={{
            marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', background: 'rgba(255,255,255,0.15)', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.25)',
            fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
          }}>
            <Hash size={11} /> Display Order: <strong style={{ color: '#fff' }}>{term.order}</strong>
          </div>
        </div>

        {/* Body */}
        <div className="pg-view__body">
          <p className="pg-view__section-label">Description</p>
          <div className="pg-info-row">
            <div className="pg-info-row__icon pg-info-row__icon--highlight">
              <AlignLeft size={15} color="#049edf" />
            </div>
            <div className="pg-info-row__content">
              <p className="pg-info-row__label">Full Text</p>
              <p className="pg-info-row__value" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {term.description}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pg-view__foot">
          <button className="pg-btn-cancel" onClick={onClose}>Close</button>
          <button className="pg-view__btn-edit" onClick={() => { onClose(); onEdit(term); }}>
            <Edit2 size={13} /> Edit Term
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   ADD / EDIT MODAL  (portal — mirrors SiteModal)
═══════════════════════════════════════════ */
function TermModal({ initial, onSave, onClose, saving }) {
  const isEdit = !!initial?.termID;

  const [form, setForm]         = useState({ order: initial?.order ?? '', description: initial?.description ?? '' });
  const [errors, setErrors]     = useState({});
  const [touched, setTouched]   = useState({});
  const [success, setSuccess]   = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = (f) => {
    const e = {};
    if (f.order === '' || f.order === null || f.order === undefined)
      e.order = 'Display order is required.';
    else if (Number(f.order) < 0)
      e.order = 'Order must be zero or a positive number.';
    if (!String(f.description || '').trim())
      e.description = 'Description is required.';
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
    setTouched({ order: true, description: true });
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    setApiError('');
    try {
      await onSave(form);
      setSuccess(true);
    } catch (err) {
      setApiError(err?.response?.data?.message || err?.message || 'Something went wrong.');
    }
  };

  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal" style={{ maxWidth: 540 }}>

        {/* Header */}
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap">
              <FileText size={20} color="#049edf" />
            </div>
            <div>
              <h5 className="pg-modal__title">{isEdit ? 'Edit Term' : 'New Term'}</h5>
              <p className="pg-modal__subtitle">
                {isEdit ? `Editing term #${initial.order}` : 'Add a new customer term & condition'}
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

        {/* Body — Bootstrap grid, mirrors SiteModal */}
        <div className="pg-modal__body">
          <div className="row g-3">

            {/* Display Order */}
            <div className="col-12 col-sm-4">
              <label className="pg-field-label">
                Display Order <span className="pg-field-label__required">*</span>
              </label>
              <div className={`pg-field-wrap ${errors.order ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
                <Hash size={14} color={errors.order ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 1, 2, 3…"
                  value={form.order}
                  className="pg-field-input"
                  onChange={e => applyChange('order', e.target.value)}
                  onBlur={() => handleBlur('order')}
                />
              </div>
              {errors.order && (
                <div className="pg-field-error">
                  <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{errors.order}</span>
                </div>
              )}
              <p className="pg-field-hint">Determines the sequence in the printed list</p>
            </div>

            {/* Spacer for alignment */}
            <div className="col-12 col-sm-8" />

            {/* Description */}
            <div className="col-12">
              <label className="pg-field-label">
                Description <span className="pg-field-label__required">*</span>
              </label>
              <div
                className={`pg-field-wrap ${errors.description ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
                style={{ alignItems: 'flex-start', paddingTop: 10, paddingBottom: 10 }}
              >
                <AlignLeft size={14} color={errors.description ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0, marginTop: 1 }} />
                <textarea
                  className="pg-field-input"
                  placeholder="Enter the term or condition text…"
                  rows={5}
                  style={{ resize: 'vertical', minHeight: 110, lineHeight: 1.6 }}
                  value={form.description}
                  onChange={e => applyChange('description', e.target.value)}
                  onBlur={() => handleBlur('description')}
                />
              </div>
              {errors.description && (
                <div className="pg-field-error">
                  <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{errors.description}</span>
                </div>
              )}
              <p className="pg-field-hint">{String(form.description || '').length} characters</p>
            </div>

          </div>

          <p className="pg-form__note">
            <span className="pg-field-label__required">*</span> Required fields
          </p>
        </div>

        {/* Footer */}
        <div className="pg-modal__foot">
          <button className="pg-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="pg-btn-save" onClick={handleSubmit} disabled={saving}>
            {success
              ? <><Check size={14} /> {isEdit ? 'Saved!' : 'Created!'}</>
              : saving
                ? <><RefreshCw size={13} className="pg-spin" /> Saving…</>
                : <><Plus size={14} /> {isEdit ? 'Save Changes' : 'Add Term'}</>
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
export default function TermsPage() {
  const [terms,      setTerms]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search,     setSearch]     = useState('');
  const [sortDir,    setSortDir]    = useState('asc');
  const [page,       setPage]       = useState(1);
  const [pageSize,   setPageSize]   = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [editTerm,  setEditTerm]  = useState(null);
  const [viewTerm,  setViewTerm]  = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const data = await apiService.getAllCustomerTerms();
      setTerms(Array.isArray(data) ? data : data?.data ?? []);
      setPage(1);
    } catch (err) {
      setFetchError(err?.response?.data?.message || err?.message || 'Failed to load terms.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Save (called from modal; throws on error so modal catches it) ── */
  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editTerm?.termID) {
        await apiService.updateCustomerTerm(editTerm.termID, formData);
      } else {
        await apiService.createCustomerTerm(formData);
      }
      await new Promise(r => setTimeout(r, 500)); // let "Saved!" flash briefly
      setShowModal(false);
      setEditTerm(null);
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
      await apiService.deleteCustomerTerm(delTarget.termID);
      setDelTarget(null);
      fetchData();
    } catch {
      // keep modal open; TODO: surface error if needed
    } finally {
      setDeleting(false);
    }
  };

  /* ── Filter + sort ── */
  const filtered = terms
    .filter(t => {
      const q = search.toLowerCase();
      return !q || String(t.order).includes(q) || (t.description || '').toLowerCase().includes(q);
    })
    .sort((a, b) => sortDir === 'asc' ? a.order - b.order : b.order - a.order);

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

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
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>Loading terms…</span>
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
            <h1 className="pg-header__title">Customer Terms</h1>
            <p className="pg-header__subtitle">
              Manage terms &amp; conditions shown on customer quotations and documents.{' '}
              <strong>{terms.length} term{terms.length !== 1 ? 's' : ''} configured.</strong>
            </p>
          </div>
          <button className="pg-btn-add" onClick={() => { setEditTerm(null); setShowModal(true); }}>
            <Plus size={14} /> Add New Term
          </button>
        </div>

        {/* ── Main Container ── */}
        <div className="pg-container">

          {/* Toolbar */}
          <div className="pg-toolbar">
            <div className="pg-toolbar__inner">
              <div className="pg-toolbar__count">
                <FileText size={14} color="#9090a8" />
                <span><strong>{filtered.length}</strong> term{filtered.length !== 1 ? 's' : ''}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
                {/* Sort toggle */}
                <button
                  className="pg-pg-btn"
                  title={`Sort order ${sortDir === 'asc' ? 'descending' : 'ascending'}`}
                  style={{ width: 'auto', padding: '0 14px', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#7878a0' }}
                  onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                >
                  <Hash size={12} />
                  Order {sortDir === 'asc' ? '↑' : '↓'}
                </button>

                {/* Search */}
                <div className="pg-search-box">
                  <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
                  <input
                    placeholder="Search by order or description…"
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
                  <FileText size={36} color="#d0d0e8" />
                  <span className="pg-empty__label">
                    {search ? 'No terms match your search.' : 'No terms yet. Add your first one.'}
                  </span>
                  {!search && (
                    <button className="pg-btn-add" style={{ marginTop: 12 }}
                      onClick={() => { setEditTerm(null); setShowModal(true); }}>
                      <Plus size={14} /> Add Term
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <table className="pg-table" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 52 }} />
                  <col style={{ width: 86 }} />
                  <col />
                  <col style={{ width: 124 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="pg-th">#</th>
                    <th className="pg-th">Order</th>
                    <th className="pg-th">Description</th>
                    <th className="pg-th" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((term, idx) => (
                    <tr key={term.termID} className="pg-tr">

                      {/* Row index */}
                      <td className="pg-td" style={{ color: '#b0b0c8', fontWeight: 700, fontSize: 12 }}>
                        {(safePage - 1) * pageSize + idx + 1}
                      </td>

                      {/* Order badge */}
                      <td className="pg-td">
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          minWidth: 36, height: 36, borderRadius: 10,
                          background: 'linear-gradient(135deg, rgba(4,158,223,0.1), rgba(108,99,255,0.08))',
                          border: '1.5px solid rgba(4,158,223,0.2)',
                          fontFamily: 'Nunito,sans-serif', fontSize: 14, fontWeight: 900, color: '#049edf',
                        }}>
                          {term.order}
                        </span>
                      </td>

                      {/* Description — 2-line clamp */}
                      <td className="pg-td pg-td--overflow">
                        <p style={{
                          fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 600,
                          color: '#3a3a5c', lineHeight: 1.6, margin: 0,
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {term.description}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="pg-td">
                        <div className="pg-action-wrap" style={{ justifyContent: 'flex-end' }}>
                          {/* <button className="pg-btn-view" title="View" onClick={() => setViewTerm(term)}>
                            <Eye size={13} />
                          </button> */}
                          <button className="pg-btn-edit" title="Edit"
                            onClick={() => { setEditTerm(term); setShowModal(true); }}>
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="pg-btn-edit" title="Delete"
                            style={{ background: 'rgba(220,38,38,0.07)', borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626' }}
                            onClick={() => setDelTarget(term)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Mobile Cards ── */}
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <FileText size={36} color="#d0d0e8" />
                <span className="pg-empty__label">{search ? 'No terms match.' : 'No terms yet.'}</span>
              </div>
            ) : paginated.map(term => (
              <div key={term.termID} className="pg-card">
                <div className="pg-card__header">
                  <div className="pg-card__title-wrap">
                    <div className="pg-card__title">Term #{term.order}</div>
                    <div className="pg-card__subtitle">Display order: {term.order}</div>
                  </div>
                  <div className="pg-card__actions">
                    <button className="pg-card__btn-view" onClick={() => setViewTerm(term)}><Eye size={13} /></button>
                    <button className="pg-card__btn-edit" onClick={() => { setEditTerm(term); setShowModal(true); }}><Edit2 size={13} /></button>
                    <button
                      className="pg-card__btn-edit"
                      style={{ background: 'rgba(220,38,38,0.08)', border: '1.5px solid rgba(220,38,38,0.2)' }}
                      onClick={() => setDelTarget(term)}
                    >
                      <Trash2 size={13} color="#dc2626" />
                    </button>
                  </div>
                </div>
                <div className="pg-card__body">
                  <div className="pg-card__row">
                    <AlignLeft size={12} color="#c0c0d8" className="pg-card__row-icon" />
                    <span className="pg-card__row-text">{term.description}</span>
                  </div>
                </div>
              </div>
            ))}
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
        <TermModal
          initial={editTerm}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTerm(null); }}
          saving={saving}
        />
      )}
      {viewTerm && (
        <ViewModal
          term={viewTerm}
          onClose={() => setViewTerm(null)}
          onEdit={t => { setViewTerm(null); setEditTerm(t); setShowModal(true); }}
        />
      )}
      {delTarget && (
        <DeleteModal
          term={delTarget}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
          deleting={deleting}
        />
      )}
    </>
  );
}