import React, {
  useState, useEffect, useCallback, useMemo,
  useRef, useLayoutEffect,
} from 'react';
import ReactDOM from 'react-dom';
import {
  Plus, X, Search, Loader2,
  ChevronDown, Check, AlertCircle, RefreshCw,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, ChevronUp,
  Edit2, Filter,
  Calendar, CheckCircle2,
  Briefcase,
  User, FileText, Image,
  CreditCard, Wallet,
} from 'lucide-react';
import { apiService, API_ROOT_URL } from '../api/api';
import "./Common1.css";

/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */
const PAGE_SIZE_OPTIONS = [5, 10, 15, 20];

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
const todayISO = () => new Date().toISOString().split('T')[0];

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const fmtCurrency = (n) => {
  if (n === null || n === undefined || n === '') return '—';
  return '₹ ' + Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
};

function normalizeList(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.$values)) return res.$values;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  return [];
}

function normalizeJobRequest(raw) {
  return {
    jobRequestID:        raw.jobRequestID        ?? raw.JobRequestID        ?? 0,
    customerID:          raw.customerID           ?? raw.CustomerID           ?? 0,
    jobType:             raw.jobType              ?? raw.JobType              ?? '',
    jobDescription:      raw.jobDescription       ?? raw.JobDescription       ?? '',
    totalAreaSQFT:       Number(raw.totalAreaSQFT ?? raw.TotalAreaSQFT        ?? 0),
    rateperSQFT:         Number(raw.rateperSQFT   ?? raw.RateperSQFT          ?? 0),
    targetCompletionDate:(raw.targetCompletionDate ?? raw.TargetCompletionDate ?? '').split('T')[0],
    jobStatus:           raw.jobStatus            ?? raw.JobStatus            ?? '',
  };
}

function normalizeCustomer(raw) {
  return {
    customerID:   raw.customerID   ?? raw.CustomerID   ?? 0,
    customerName: raw.customerName ?? raw.CustomerName ?? '',
    city:         raw.city         ?? raw.City         ?? '',
  };
}

function normalizePayment(raw) {
  return {
    jobPaymentID:      raw.jobPaymentID      ?? raw.JobPaymentID      ?? 0,
    jobRequestID:      raw.jobRequestID      ?? raw.JobRequestID      ?? 0,
    paymentDate:       (raw.paymentDate      ?? raw.PaymentDate       ?? '').split('T')[0],
    calculatedAmount:  Number(raw.calculatedAmount  ?? raw.CalculatedAmount  ?? 0),
    paidAmount:        Number(raw.paidAmount        ?? raw.PaidAmount        ?? 0),
    remainingAmount:   Number(raw.remainingAmount   ?? raw.RemainingAmount   ?? 0),
    paidBY:            raw.paidBY  ?? raw.PaidBY  ?? raw.paidBy  ?? raw.PaidBy  ?? '',
    receiptPhoto:      raw.receiptPhoto      ?? raw.ReceiptPhoto      ?? '',
    comments:          raw.comments          ?? raw.Comments          ?? '',
    lastUpdateDttm:    raw.lastUpdateDttm    ?? raw.LastUpdateDttm    ?? '',
    lastUpdatedBy:     raw.lastUpdatedBy     ?? raw.LastUpdatedBy     ?? 0,
  };
}

function normalizeAttachment(raw) {
  return {
    jobPaymentAttachID: raw.jobPaymentAttachID ?? raw.JobPaymentAttachID ?? raw.id ?? raw.ID ?? 0,
    jobPaymentID:       raw.jobPaymentID       ?? raw.JobPaymentID       ?? 0,
    jobRequestID:       raw.jobRequestID       ?? raw.JobRequestID       ?? 0,
    receiptFilePath:    raw.receiptFilePath    ?? raw.ReceiptFilePath    ?? '',
    receiptFilename:    raw.receiptFilename    ?? raw.ReceiptFilename    ?? '',
  };
}

function buildImageUrl(att) {
  const path = att.receiptFilePath ?? att.ReceiptFilePath ?? '';
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_ROOT_URL}${path}`;
}

/* ═══════════════════════════════════════════
   STATUS BADGE
═══════════════════════════════════════════ */
const PAYMENT_STATUS_COLORS = {
  'Paid':     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'Partial':  { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  'Unpaid':   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  'Overpaid': { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
};

function getPaymentStatus(payment) {
  const calc = Number(payment.calculatedAmount ?? 0);
  const paid = Number(payment.paidAmount ?? 0);
  if (paid === 0) return 'Unpaid';
  if (paid >= calc) return paid > calc ? 'Overpaid' : 'Paid';
  return 'Partial';
}

function PaymentStatusBadge({ payment }) {
  const status = getPaymentStatus(payment);
  const s = PAYMENT_STATUS_COLORS[status] || PAYMENT_STATUS_COLORS['Unpaid'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 20, fontFamily: 'Nunito,sans-serif', fontSize: 11,
      fontWeight: 700, background: s.bg, color: s.color,
      border: `1px solid ${s.border}`, whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}

/* ═══════════════════════════════════════════
   SORT ICON
═══════════════════════════════════════════ */
function SortIcon({ col, sortKey, sortDir }) {
  const active = sortKey === col;
  return (
    <span className="pg-sort-icon">
      <ChevronUp   size={10} color={active && sortDir === 'asc'  ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__up"   />
      <ChevronDown size={10} color={active && sortDir === 'desc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__down" />
    </span>
  );
}

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`qt-toast qt-toast--${type}`}>
      {type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {msg}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PORTAL DROPDOWN
═══════════════════════════════════════════ */
function PortalDropdown({ open, triggerRef, panelRef, children }) {
  const [style, setStyle] = useState({ position: 'fixed', top: 0, left: 0, width: 0, zIndex: 99999 });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const upd = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const ph = panelRef.current?.offsetHeight || 260;
      const flipUp = (window.innerHeight - r.bottom) < ph + 8 && r.top > ph + 8;
      setStyle({
        position: 'fixed',
        top: flipUp ? r.top - ph - 4 : r.bottom + 4,
        left: r.left, width: r.width, zIndex: 99999,
      });
    };
    upd();
    window.addEventListener('scroll', upd, true);
    window.addEventListener('resize', upd);
    return () => {
      window.removeEventListener('scroll', upd, true);
      window.removeEventListener('resize', upd);
    };
  }, [open, triggerRef, panelRef]);

  if (!open) return null;
  return ReactDOM.createPortal(
    <div ref={panelRef} style={style}>{children}</div>,
    document.body
  );
}

function useOutsideClick(wrapRef, panelRef, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!wrapRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, wrapRef, panelRef, onClose]);
}

/* ═══════════════════════════════════════════
   JOB REQUEST COMBO
═══════════════════════════════════════════ */
function JobComboField({ value, onChange, options, disabled }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef    = useRef(null);
  const triggerRef = useRef(null);
  const panelRef   = useRef(null);
  const inputRef   = useRef(null);

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);
  useOutsideClick(wrapRef, panelRef, open, close);

  const selected = options.find(o => o.jobRequestID === value);
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return options;
    return options.filter(o =>
      String(o.jobRequestID).includes(q) ||
      (o.jobType || '').toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q)
    );
  }, [options, query]);

  const openDD = () => { if (disabled) return; setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); };
  const select = (o) => { onChange(o); setOpen(false); setQuery(''); };
  const clear  = (e) => { e.stopPropagation(); onChange(null); };

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        ref={triggerRef}
        className={`pg-field-wrap pg-combo-trigger pg-field-wrap--normal${disabled ? ' jb-disabled' : ''}`}
        onClick={openDD} tabIndex={disabled ? -1 : 0}
      >
        <Briefcase size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
        <span className={`pg-combo-display${!selected ? ' pg-combo-display--placeholder' : ''}`}>
          {selected ? `Job #${selected.jobRequestID} — ${selected.jobType || '?'}` : 'Select job request…'}
        </span>
        {selected
          ? <X size={13} className="pg-combo-clear" onClick={clear} />
          : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position: 'static' }}>
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef} className="pg-combo-search__input"
              placeholder="Search by job ID, type, customer…"
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') close(); }}
            />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
          </div>
          <div className="pg-combo-list">
            {filtered.length === 0
              ? <div className="pg-combo-empty">No job requests found</div>
              : filtered.map(o => (
                <div
                  key={o.jobRequestID}
                  className={`pg-combo-option${o.jobRequestID === value ? ' pg-combo-option--active' : ''}`}
                  onClick={() => select(o)} tabIndex={0}
                >
                  <div style={{ flex: 1 }}>
                    <span className="pg-combo-option__name">
                      Job #{o.jobRequestID} — {o.jobType || '—'}
                    </span>
                    {o.customerName && (
                      <span className="pg-combo-option__id">
                        {o.customerName}
                        {o.totalAreaSQFT ? ` · ${Number(o.totalAreaSQFT).toFixed(1)} sq.ft` : ''}
                      </span>
                    )}
                  </div>
                  {o.jobRequestID === value && (
                    <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                  )}
                </div>
              ))}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ATTACHMENT MODAL
═══════════════════════════════════════════ */
function AttachmentModal({ payment, onClose, showToast }) {
  const [attachments, setAttachments] = useState([]);
  const [loadingAtts, setLoadingAtts] = useState(true);
  const [files,       setFiles]       = useState([]);
  const [uploading,   setUploading]   = useState(false);
  const [lightbox,    setLightbox]    = useState(null);
  const [imgErrors,   setImgErrors]   = useState({});
  const inputRef = useRef(null);

  /* ── load attachments via apiService ── */
  const loadAttachments = useCallback(async () => {
    if (!payment?.jobPaymentID) return;
    setLoadingAtts(true);
    try {
      const data = await apiService.getJobPaymentAttachments(payment.jobPaymentID);
      setAttachments(normalizeList(data).map(normalizeAttachment));
    } catch {
      setAttachments([]);
    } finally {
      setLoadingAtts(false);
    }
  }, [payment?.jobPaymentID]);

  useEffect(() => { loadAttachments(); }, [loadAttachments]);

  /* ── upload via apiService ── */
  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        await apiService.uploadJobPaymentAttachment(
          payment.jobPaymentID,
          payment.jobRequestID || 0,
          file
        );
      }
      showToast(`${files.length} receipt${files.length !== 1 ? 's' : ''} uploaded!`, 'success');
      setFiles([]);
      setImgErrors({});
      await loadAttachments();
    } catch (err) {
      showToast(err?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return ReactDOM.createPortal(
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(0,0,0,0.90)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 18, right: 22,
              background: 'rgba(255,255,255,0.18)', border: 'none',
              borderRadius: 8, cursor: 'pointer', padding: '6px 14px',
              color: '#fff', fontSize: 20, lineHeight: 1, fontWeight: 700,
            }}
          >✕</button>
          <img
            src={lightbox} alt="Receipt preview"
            style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 14, objectFit: 'contain' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="pg-modal" style={{ maxWidth: 680 }}>

          {/* Head */}
          <div className="pg-modal__head">
            <div className="pg-modal__head-left">
              <div className="pg-modal__icon-wrap" style={{ fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                🧾
              </div>
              <div>
                <h5 className="pg-modal__title">Payment Receipts</h5>
                <p className="pg-modal__subtitle">
                  <strong>Payment #{payment.jobPaymentID}</strong>
                  {payment.paymentDate ? ` · ${fmtDate(payment.paymentDate)}` : ''}
                  <span style={{ marginLeft: 8, padding: '1px 8px', borderRadius: 10, background: 'rgba(4,158,223,0.10)', color: '#049edf', fontSize: 11, fontWeight: 800 }}>
                    {attachments.length} receipt{attachments.length !== 1 ? 's' : ''}
                  </span>
                </p>
              </div>
            </div>
            <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
          </div>

          {/* Upload zone */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f8' }}>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                setFiles(p => [...p, ...dropped]);
              }}
              style={{
                border: `2px dashed ${files.length > 0 ? '#049edf' : '#d0d0e8'}`,
                borderRadius: 12, padding: '20px', textAlign: 'center', cursor: 'pointer',
                background: files.length > 0 ? 'rgba(4,158,223,0.04)' : '#fafafe',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
              <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700, color: '#5a5a78' }}>
                Click to select or drag &amp; drop receipts
              </div>
              <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8', marginTop: 3 }}>
                JPG, PNG, WEBP · Multiple files supported
              </div>
              <input
                ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => setFiles(p => [...p, ...Array.from(e.target.files)])}
              />
            </div>

            {files.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {files.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 20,
                    background: 'rgba(4,158,223,0.08)', border: '1px solid rgba(4,158,223,0.20)',
                    fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 700, color: '#049edf',
                  }}>
                    📄 {f.name.length > 22 ? f.name.slice(0, 20) + '…' : f.name}
                    <X size={11} style={{ cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => setFiles(p => p.filter((_, j) => j !== i))} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photo grid */}
          <div style={{ padding: '16px 24px', overflowY: 'auto', maxHeight: 340, minHeight: 80 }}>
            {loadingAtts ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 10 }}>
                <Loader2 size={20} color="#049edf" className="pg-spin" />
                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, color: '#9090a8' }}>Loading receipts…</span>
              </div>
            ) : attachments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: 'Nunito,sans-serif', fontSize: 13.5, color: '#b0b0c8', fontStyle: 'italic' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🧾</div>
                No receipts uploaded yet for this payment
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 12 }}>
                {attachments.map((att, i) => {
                  const url      = buildImageUrl(att);
                  const name     = att.receiptFilename || `Receipt ${i + 1}`;
                  const hasError = imgErrors[i];
                  return (
                    <div
                      key={i}
                      style={{
                        borderRadius: 11, overflow: 'hidden',
                        border: '1.5px solid #e8e8f4', background: '#f8f8fd',
                        position: 'relative', boxShadow: '0 1px 5px rgba(0,0,0,0.07)',
                        transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform    = 'scale(1.04)';
                        e.currentTarget.style.boxShadow   = '0 6px 20px rgba(4,158,223,0.20)';
                        e.currentTarget.style.borderColor = '#049edf';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform    = 'scale(1)';
                        e.currentTarget.style.boxShadow   = '0 1px 5px rgba(0,0,0,0.07)';
                        e.currentTarget.style.borderColor = '#e8e8f4';
                      }}
                    >
                      <div
                        onClick={() => url && !hasError && setLightbox(url)}
                        style={{ position: 'relative', height: 118, background: '#f0f0f8', overflow: 'hidden', cursor: url && !hasError ? 'zoom-in' : 'default' }}
                      >
                        {url && !hasError ? (
                          <img
                            src={url} alt={name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={() => setImgErrors(p => ({ ...p, [i]: true }))}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#c0c0d8' }}>
                            🧾
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '5px 8px', borderTop: '1px solid #f0f0f8' }}>
                        <span style={{ display: 'block', fontFamily: 'Nunito,sans-serif', fontSize: 10.5, color: '#7a8499', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {name.length > 20 ? name.slice(0, 18) + '…' : name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pg-modal__foot">
            <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600 }}>
              {files.length > 0
                ? `${files.length} file${files.length !== 1 ? 's' : ''} ready to upload`
                : attachments.length > 0 ? 'Click any receipt to enlarge' : 'No receipts yet'}
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="pg-btn-cancel" onClick={onClose}>Close</button>
              <button className="pg-btn-save" onClick={handleUpload} disabled={files.length === 0 || uploading}>
                {uploading
                  ? <><Loader2 size={13} className="pg-spin" /> Uploading…</>
                  : <>📤 Upload {files.length > 0 ? `(${files.length})` : ''}</>}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   PAYMENT FORM MODAL  (create / edit)
═══════════════════════════════════════════ */
function PaymentFormModal({ payment, jobOptions, onSave, onClose, showToast }) {
  const isEdit = !!payment?.jobPaymentID;

  const [jobRequestID,      setJobRequestID]      = useState(payment?.jobRequestID      || 0);
  const [paymentDate,       setPaymentDate]        = useState(payment?.paymentDate       || todayISO());
  const [calculatedAmount,  setCalculatedAmount]   = useState(String(payment?.calculatedAmount  ?? ''));
  const [paidAmount,        setPaidAmount]         = useState(String(payment?.paidAmount         ?? ''));
  const [paidBY,            setPaidBY]             = useState(payment?.paidBY            || '');
  const [comments,          setComments]           = useState(payment?.comments          || '');
  const [saving,            setSaving]             = useState(false);
  const [error,             setError]              = useState('');

  const remainingAmount = useMemo(() => {
    const calc = Number(calculatedAmount) || 0;
    const paid = Number(paidAmount)       || 0;
    return calc - paid;
  }, [calculatedAmount, paidAmount]);

  /* auto-fill calculated amount when a job is picked on Create */
  const selectedJob = jobOptions.find(j => j.jobRequestID === jobRequestID);
  useEffect(() => {
    if (selectedJob && !isEdit && !calculatedAmount) {
      setCalculatedAmount((selectedJob.totalAreaSQFT * selectedJob.rateperSQFT).toFixed(2));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob]);

  const validate = () => {
    if (!jobRequestID)                                        return 'Please select a job request.';
    if (!paymentDate)                                         return 'Payment date is required.';
    if (!calculatedAmount || Number(calculatedAmount) <= 0)   return 'Calculated amount must be greater than 0.';
    if (paidAmount === '' || Number(paidAmount) < 0)          return 'Paid amount cannot be negative.';
    return '';
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSaving(true);
    try {
      const body = {
        jobRequestID,
        paymentDate,
        calculatedAmount: Number(calculatedAmount),
        paidAmount:       Number(paidAmount) || 0,
        remainingAmount,
        paidBY:           paidBY    || '',
        receiptPhoto:     payment?.receiptPhoto || '',
        comments:         comments  || '',
      };

      if (isEdit) {
        await apiService.updateJobPayment(payment.jobPaymentID, body);
      } else {
        await apiService.createJobPayment(body);
      }

      showToast(isEdit ? 'Payment updated!' : 'Payment created!', 'success');
      onSave();
    } catch (err) {
      showToast(err?.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal" style={{ maxWidth: 600 }}>

        {/* Head */}
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap">
              <CreditCard size={20} color="#049edf" />
            </div>
            <div>
              <h5 className="pg-modal__title">{isEdit ? 'Edit Payment' : 'New Payment'}</h5>
              <p className="pg-modal__subtitle">
                {isEdit ? `Editing Payment #${payment.jobPaymentID}` : 'Record a new job payment'}
              </p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Body */}
        <div className="pg-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Job Request */}
          <div>
            <label className="qt-label">Job Request <span className="qt-label--req">*</span></label>
            <JobComboField
              value={jobRequestID}
              onChange={o => { setJobRequestID(o?.jobRequestID || 0); setError(''); }}
              options={jobOptions}
              disabled={isEdit}
            />
            {selectedJob && (
              <div className="jb-info-strip" style={{ marginTop: 8 }}>
                <span>Type: {selectedJob.jobType}</span>
                <span>{Number(selectedJob.totalAreaSQFT).toFixed(1)} sq.ft</span>
                <span style={{ color: '#049edf' }}>₹{selectedJob.rateperSQFT}/sq.ft</span>
                {selectedJob.jobStatus && <span>Status: {selectedJob.jobStatus}</span>}
              </div>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label className="qt-label">Payment Date <span className="qt-label--req">*</span></label>
            <div className="qt-input-wrap">
              <Calendar size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input className="qt-input" type="date" value={paymentDate}
                onChange={e => { setPaymentDate(e.target.value); setError(''); }} />
            </div>
          </div>

          {/* Amounts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px' }}>
            <div>
              <label className="qt-label">Calculated Amount <span className="qt-label--req">*</span></label>
              <div className="qt-input-wrap">
                <span style={{ fontSize: 13, color: '#049edf', fontWeight: 800, flexShrink: 0 }}>₹</span>
                <input className="qt-input" type="number" min="0" step="0.01"
                  value={calculatedAmount}
                  onChange={e => { setCalculatedAmount(e.target.value); setError(''); }}
                  placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="qt-label">Paid Amount</label>
              <div className="qt-input-wrap">
                <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 800, flexShrink: 0 }}>₹</span>
                <input className="qt-input" type="number" min="0" step="0.01"
                  value={paidAmount}
                  onChange={e => { setPaidAmount(e.target.value); setError(''); }}
                  placeholder="0.00" />
              </div>
            </div>
          </div>

          {/* Remaining (read-only) */}
          <div>
            <label className="qt-label">Remaining Amount <span className="qt-label--opt">(auto-calculated)</span></label>
            <div className="qt-input-wrap jb-readonly">
              <Wallet size={14} color="#d0d0e0" style={{ flexShrink: 0 }} />
              <span style={{
                flex: 1, fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700,
                color: remainingAmount > 0 ? '#dc2626' : remainingAmount < 0 ? '#7c3aed' : '#16a34a',
              }}>
                {fmtCurrency(remainingAmount)}
                {remainingAmount < 0 && ' (overpaid)'}
              </span>
              <span style={{ fontSize: 11, color: '#d0d0e0', flexShrink: 0 }}>🔒</span>
            </div>
          </div>

          {/* Paid By */}
          <div>
            <label className="qt-label">Paid By</label>
            <div className="qt-input-wrap">
              <User size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input className="qt-input" type="text"
                value={paidBY} onChange={e => setPaidBY(e.target.value)}
                placeholder="Name of person / organization who paid…" />
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="qt-label">Comments <span className="qt-label--opt">(optional)</span></label>
            <div className="qt-input-wrap" style={{ alignItems: 'flex-start', paddingTop: 10 }}>
              <FileText size={14} color="#c0c0d8" style={{ flexShrink: 0, marginTop: 2 }} />
              <textarea
                className="qt-input jb-textarea"
                value={comments} onChange={e => setComments(e.target.value)}
                placeholder="Any notes about this payment…"
                rows={3}
              />
            </div>
          </div>

          {error && (
            <div className="qt-error-banner"><AlertCircle size={14} /> {error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="pg-modal__foot">
          <button className="pg-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="pg-btn-save" onClick={handleSave} disabled={saving}>
            {saving
              ? <><Loader2 size={13} className="pg-spin" /> Saving…</>
              : <><Check size={14} /> {isEdit ? 'Update Payment' : 'Create Payment'}</>}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   MAIN JOB PAYMENT PAGE
═══════════════════════════════════════════ */
export default function JobPaymentPage() {

  /* ── Data ── */
  const [payments,     setPayments]     = useState([]);
  const [jobRequests,  setJobRequests]  = useState([]);
  const [customers,    setCustomers]    = useState([]);

  /* ── UI ── */
  const [loading,           setLoading]           = useState(true);
  const [apiError,          setApiError]          = useState('');
  const [toast,             setToast]             = useState(null);
  const [showForm,          setShowForm]          = useState(false);
  const [editingPayment,    setEditingPayment]    = useState(null);
  const [attachmentPayment, setAttachmentPayment] = useState(null);

  /* ── Table ── */
  const [search,   setSearch]   = useState('');
  const [sortKey,  setSortKey]  = useState('jobPaymentID');
  const [sortDir,  setSortDir]  = useState('desc');
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  /* ── Job options enriched with customer name ── */
  const jobOptions = useMemo(() =>
    jobRequests.map(j => ({
      ...j,
      customerName: customers.find(c => c.customerID === j.customerID)?.customerName || '',
    })),
    [jobRequests, customers]
  );

  /* ── Initial load using apiService ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pRaw, jRaw, cRaw] = await Promise.all([
          apiService.getAllJobPayments().catch(() => []),
          apiService.getAllJobRequests().catch(() => []),
          apiService.getAllCustomers().catch(() => []),
        ]);
        setPayments(normalizeList(pRaw).map(normalizePayment));
        setJobRequests(normalizeList(jRaw).map(normalizeJobRequest));
        setCustomers(normalizeList(cRaw).map(normalizeCustomer));
      } catch (err) {
        setApiError(err?.message || 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Refresh ── */
  const refresh = useCallback(async () => {
    try {
      const pRaw = await apiService.getAllJobPayments();
      setPayments(normalizeList(pRaw).map(normalizePayment));
      showToast('Refreshed', 'success');
    } catch {
      showToast('Refresh failed', 'error');
    }
  }, [showToast]);

  /* ── Table helpers ── */
  const custName = (jobReqID) => {
    const job = jobRequests.find(j => j.jobRequestID === jobReqID);
    if (!job) return '—';
    return customers.find(c => c.customerID === job.customerID)?.customerName || '—';
  };

  const jobType = (jobReqID) =>
    jobRequests.find(j => j.jobRequestID === jobReqID)?.jobType || '—';

  /* ── Filter / sort / paginate ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return payments;
    return payments.filter(p => {
      const cName = custName(p.jobRequestID).toLowerCase();
      const jType = jobType(p.jobRequestID).toLowerCase();
      return (
        String(p.jobPaymentID).includes(q) ||
        String(p.jobRequestID).includes(q) ||
        cName.includes(q) ||
        jType.includes(q) ||
        (p.paidBY || '').toLowerCase().includes(q) ||
        getPaymentStatus(p).toLowerCase().includes(q)
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, search, jobRequests, customers]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      const av = String(a[sortKey] || '').toLowerCase();
      const bv = String(b[sortKey] || '').toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }),
    [filtered, sortKey, sortDir]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  /* ── Job-type badge style ── */
  const jobTypeBadgeStyle = (type) => {
    const styles = {
      'Banner':   { bg: 'rgba(4,158,223,0.09)',  color: '#049edf', border: 'rgba(4,158,223,0.25)' },
      'Repair':   { bg: 'rgba(245,158,11,0.09)', color: '#d97706', border: 'rgba(245,158,11,0.25)' },
      'Erection': { bg: 'rgba(124,58,237,0.09)', color: '#7c3aed', border: 'rgba(124,58,237,0.25)' },
    };
    return styles[type] || styles['Banner'];
  };

  /* ════════════════ RENDER ════════════════ */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
      <Loader2 size={32} color="#049edf" className="pg-spin" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>Loading payment data…</span>
    </div>
  );

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {showForm && (
        <PaymentFormModal
          payment={editingPayment}
          jobOptions={jobOptions}
          showToast={showToast}
          onSave={async () => {
            setShowForm(false);
            setEditingPayment(null);
            await refresh();
          }}
          onClose={() => { setShowForm(false); setEditingPayment(null); }}
        />
      )}

      {attachmentPayment && (
        <AttachmentModal
          payment={attachmentPayment}
          onClose={() => setAttachmentPayment(null)}
          showToast={showToast}
        />
      )}

      <div className="pg-page">

        {/* ── Page Header ── */}
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">Job Payments</h1>
            <p className="pg-header__subtitle">
              Track and manage <strong>payment records</strong> against job requests.
            </p>
          </div>
          <button className="pg-btn-add" onClick={() => { setEditingPayment(null); setShowForm(true); }}>
            <Plus size={14} /> New Payment
          </button>
        </div>

        {apiError && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11, marginBottom: 16, color: '#dc2626', fontSize: 13, fontWeight: 600, fontFamily: 'Nunito,sans-serif' }}>
            <AlertCircle size={14} /> {apiError}
          </div>
        )}

        {/* ── Table Container ── */}
        <div className="pg-container">

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #f0f0f8', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(4,158,223,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={15} color="#049edf" />
              </div>
              <div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 16, fontWeight: 900, color: '#1a1a2e', lineHeight: 1 }}>{sorted.length}</div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 600, color: '#9090a8', lineHeight: 1, marginTop: 2 }}>
                  Payment{sorted.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: '#f4f4fb', borderRadius: 10, border: '1.5px solid #ececf8' }}>
              <Search size={14} color="#9090a8" style={{ flexShrink: 0 }} />
              <input
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}
                placeholder="Search by ID, customer, job type, status…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && <X size={13} style={{ cursor: 'pointer', color: '#9090a8', flexShrink: 0 }} onClick={() => setSearch('')} />}
            </div>

            <button
              onClick={refresh}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1.5px solid #e8e8f4', background: '#fff', color: '#5a5a78', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="pg-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  {[
                    { key: 'jobPaymentID',    label: 'Pay ID',    w: '7%' },
                    { key: 'jobRequestID',    label: 'Job #',     w: '7%' },
                    { key: '_customer',       label: 'Customer',  w: '14%', noSort: true },
                    { key: '_jobType',        label: 'Type',      w: '9%',  noSort: true },
                    { key: 'paymentDate',     label: 'Date',      w: '10%' },
                    { key: 'calculatedAmount',label: 'Calculated',w: '11%' },
                    { key: 'paidAmount',      label: 'Paid',      w: '10%' },
                    { key: 'remainingAmount', label: 'Remaining', w: '10%' },
                    { key: 'paidBY',          label: 'Paid By',   w: '9%' },
                    { key: '_status',         label: 'Status',    w: '8%',  noSort: true },
                    { key: '_action',         label: 'Actions',   w: '9%',  noSort: true },
                  ].map(col => (
                    <th
                      key={col.key} style={{ width: col.w }}
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
                    <td colSpan={11} className="pg-td pg-empty">
                      <div className="pg-empty__inner">
                        <CreditCard size={36} color="#d0d0e8" />
                        <span className="pg-empty__label">No payments found</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(p => {
                  const cName = custName(p.jobRequestID);
                  const jType = jobType(p.jobRequestID);
                  const jts   = jobTypeBadgeStyle(jType);
                  const rem   = Number(p.remainingAmount ?? 0);
                  return (
                    <tr key={p.jobPaymentID} className="pg-tr">
                      <td className="pg-td">
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 800, color: '#049edf' }}>
                          #{p.jobPaymentID}
                        </span>
                      </td>
                      <td className="pg-td">
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, color: '#4a5568' }}>
                          #{p.jobRequestID}
                        </span>
                      </td>
                      <td className="pg-td pg-td--overflow">
                        <span className="pg-td__ellipsis" title={cName}>{cName}</span>
                      </td>
                      <td className="pg-td">
                        {jType !== '—' ? (
                          <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: jts.bg, color: jts.color, border: `1px solid ${jts.border}`, whiteSpace: 'nowrap' }}>
                            {jType}
                          </span>
                        ) : <span style={{ color: '#c0c0d8' }}>—</span>}
                      </td>
                      <td className="pg-td">
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 600, color: '#4a5568' }}>
                          {fmtDate(p.paymentDate)}
                        </span>
                      </td>
                      <td className="pg-td" style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 800, color: '#1a1a2e' }}>
                          {fmtCurrency(p.calculatedAmount)}
                        </span>
                      </td>
                      <td className="pg-td" style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 800, color: '#16a34a' }}>
                          {fmtCurrency(p.paidAmount)}
                        </span>
                      </td>
                      <td className="pg-td" style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 800, color: rem > 0 ? '#dc2626' : rem < 0 ? '#7c3aed' : '#9090a8' }}>
                          {fmtCurrency(rem)}
                        </span>
                      </td>
                      <td className="pg-td pg-td--overflow">
                        <span className="pg-td__ellipsis" style={{ color: '#4a5568' }} title={p.paidBY}>
                          {p.paidBY || <span style={{ color: '#c0c0d8' }}>—</span>}
                        </span>
                      </td>
                      <td className="pg-td">
                        <PaymentStatusBadge payment={p} />
                      </td>
                      <td className="pg-td">
                        <div className="pg-action-wrap">
                          <button className="pg-btn-edit" onClick={() => { setEditingPayment(p); setShowForm(true); }} title="Edit payment">
                            <Edit2 size={13} />
                          </button>
                          <button className="pg-btn-view" onClick={() => setAttachmentPayment(p)} title="View / upload receipts" style={{ width: 30, height: 30 }}>
                            <Image size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {sorted.length > pageSize && (
            <div className="pg-pagination">
              <div className="pg-pagination__left">
                <button className="pg-pg-btn" disabled={page === 1}          onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
                <button className="pg-pg-btn" disabled={page === 1}          onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
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