import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, X, AlertCircle, Check, Edit2,
  RefreshCw, Calendar,
  ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight,
  ChevronLeft, ChevronRight, MapPin, Loader2,
  FileText, Eye, ArrowLeft,
  Building2, Tag, MessageSquare, User, IndianRupee, Trash2,
} from 'lucide-react';
import { apiService } from '../api/api';
import './Common1.css';

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];

const EXPENSE_TYPE_OPTIONS = [
  'C - CHANNEL', '20X10', 'SITE RENT FOR YEAR', 'BAMBOO', 'Tempo rent',
  'LABOUR', 'Concrete', 'CISSOR STRUCTURE', 'FITTING STUFF', 'VARI PATRI',
  'NUT - BOLT', 'WOODEN PATTI', 'ANGLE FOR SUPPORT',
];

const EMPTY_ROW = {
  _rowId: '', expenseDate: '', expenseType: '',
  expenseDTL: '', amount: '', paidBy: '', comments: '',
};

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function fmtCurrency(v) {
  if (v === '' || v == null) return '—';
  return '₹' + Number(v).toLocaleString('en-IN');
}
function validateRow(row) {
  const e = {};
  if (!row.expenseDate)                        e.expenseDate = 'Required';
  if (!row.expenseType)                        e.expenseType = 'Required';
  if (!row.expenseDTL)                         e.expenseDTL  = 'Required';
  if (row.amount === '' || row.amount == null) e.amount      = 'Required';
  if (!row.paidBy)                             e.paidBy      = 'Required';
  return e;
}
function getLatest(h) {
  return [...h.versions].sort((a, b) => new Date(b.effdt) - new Date(a.effdt))[0];
}
function makeRowId() {
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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
   FORM FIELD HELPERS
───────────────────────────────────────── */
function FieldLabel({ label, required }) {
  return (
    <label className="pg-field-label">
      {label}{required && <span className="pg-field-label__required"> *</span>}
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
      <AlertCircle size={11} style={{ flexShrink: 0, marginTop: '1px' }} /><span>{msg}</span>
    </div>
  ) : null;
}

/* ─────────────────────────────────────────
   HOARDING SEARCH WIDGET
───────────────────────────────────────── */
function HoardingSearchWidget({ hoardings, sites, value, onChange, error, disabled }) {
  const [query, setQuery]     = useState('');
  const [open, setOpen]       = useState(false);
  const [results, setResults] = useState([]);
  const wrapRef               = useRef(null);

  const selectedHoarding = hoardings.find(h => h.versions.some(v => v.hoardingID === Number(value)));

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const matched = hoardings.filter(h => {
      const latest = getLatest(h);
      const site = sites.find(s => s.siteID === latest?.siteID);
      if (!site) return false;
      return (
        (site.addressLine1 || '').toLowerCase().includes(q) ||
        (site.addressLine2 || '').toLowerCase().includes(q) ||
        (site.addressLine3 || '').toLowerCase().includes(q) ||
        (site.landmark     || '').toLowerCase().includes(q) ||
        (site.city         || '').toLowerCase().includes(q) ||
        (site.district     || '').toLowerCase().includes(q) ||
        (h.hoardingCode    || '').toLowerCase().includes(q)
      );
    });
    setResults(matched.slice(0, 12));
  }, [query, hoardings, sites]);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectHoarding = (h) => {
    onChange(getLatest(h)?.hoardingID);
    setQuery(''); setOpen(false); setResults([]);
  };
  const clearSelection = () => { onChange(''); setQuery(''); setResults([]); };

  return (
    <div className="exp-hoarding-widget" ref={wrapRef}>
      {!disabled && (
        <div
          className={`pg-field-wrap ${error ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'} exp-search-trigger`}
          onClick={() => setOpen(true)}
        >
          <Search size={14} color={error ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
          <input
            className="pg-field-input"
            placeholder="Type address line, landmark, city, district or hoarding code…"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            autoComplete="off"
          />
          {query && <X size={12} style={{ cursor: 'pointer', color: '#c0c0d8', flexShrink: 0 }} onClick={e => { e.stopPropagation(); setQuery(''); setResults([]); }} />}
        </div>
      )}

      {open && results.length > 0 && (
        <div className="exp-hoarding-dropdown">
          {results.map(h => {
            const latest = getLatest(h);
            const site = sites.find(s => s.siteID === latest?.siteID);
            const addr = site
              ? [site.addressLine1, site.addressLine2, site.addressLine3, site.landmark, site.city, site.district].filter(Boolean).join(', ')
              : `Site ${latest?.siteID}`;
            return (
              <div key={h.hoardingCode} className="exp-hoarding-option" onMouseDown={() => selectHoarding(h)}>
                <div className="exp-hoarding-option__code"><Building2 size={12} /> {h.hoardingCode}</div>
                <div className="exp-hoarding-option__addr">{addr}</div>
                <div className="exp-hoarding-option__meta">
                  <span>{latest?.material}</span><span className="exp-dot">·</span><span>{latest?.status}</span>
                  {latest?.width && latest?.height && <><span className="exp-dot">·</span><span>{latest.width}×{latest.height} ft</span></>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {open && query.trim() && results.length === 0 && (
        <div className="exp-hoarding-dropdown">
          <div className="exp-hoarding-empty"><MapPin size={18} /><span>No hoardings found</span></div>
        </div>
      )}

      {value && selectedHoarding && (() => {
        const latest = getLatest(selectedHoarding);
        const site = latest ? sites.find(s => s.siteID === latest.siteID) : null;
        const addr = site
          ? [site.addressLine1, site.addressLine2, site.addressLine3, site.landmark, site.city, site.district].filter(Boolean).join(', ')
          : '';
        return (
          <div className="exp-selected-hoarding">
            <div className="exp-selected-hoarding__inner">
              <div className="exp-selected-hoarding__icon"><Building2 size={16} color="#049edf" /></div>
              <div className="exp-selected-hoarding__info">
                <div className="exp-selected-hoarding__code">{selectedHoarding.hoardingCode}</div>
                <div className="exp-selected-hoarding__addr">{addr}</div>
                <div className="exp-selected-hoarding__chips">
                  {latest?.material && <span className="exp-chip">{latest.material}</span>}
                  {latest?.status && (
                    <span className={`exp-chip exp-chip--${latest.status === 'Active' ? 'green' : latest.status === 'Inactive' ? 'red' : 'yellow'}`}>
                      {latest.status}
                    </span>
                  )}
                  {latest?.width && latest?.height && <span className="exp-chip">{latest.width}×{latest.height} ft</span>}
                </div>
              </div>
              {!disabled && (
                <button className="exp-selected-hoarding__clear" onClick={clearSelection} title="Clear selection"><X size={13} /></button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ─────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────── */
function DeleteConfirmModal({ hoardingID, hoardingCode, expenseCount, onConfirm, onCancel }) {
  return (
    <div className="pg-overlay" onClick={onCancel}>
      <div className="exp-delete-modal" onClick={e => e.stopPropagation()}>
        <div className="exp-delete-modal__icon"><Trash2 size={22} color="#dc2626" /></div>
        <div className="exp-delete-modal__title">Delete All Expenses?</div>
        <div className="exp-delete-modal__sub">
          All <strong>{expenseCount}</strong> expense{expenseCount !== 1 ? 's' : ''} for hoarding <strong>{hoardingCode}</strong> will be permanently removed. This action cannot be undone.
        </div>
        <div className="exp-delete-modal__actions">
          <button className="pg-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="exp-btn-delete-confirm" onClick={onConfirm}><Trash2 size={13} /> Delete All</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   EXPENSE ENTRY PANEL
───────────────────────────────────────── */
function ExpenseEntryPanel({ row, errors, onChange }) {
  return (
    <div className="exp-entry-panel">
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <FieldLabel label="Expense Date" required />
          <InputWrap error={errors.expenseDate} icon={Calendar}>
            <input className="pg-field-input" type="date" value={row.expenseDate}
              onChange={e => onChange('expenseDate', e.target.value)} />
          </InputWrap>
          <FieldError msg={errors.expenseDate} />
        </div>

        <div className="col-12 col-md-8">
          <FieldLabel label="Expense Type" required />
          <InputWrap error={errors.expenseType} icon={Tag}>
            <select className="pg-field-input" value={row.expenseType}
              onChange={e => onChange('expenseType', e.target.value)}>
              <option value="">Select expense type…</option>
              {EXPENSE_TYPE_OPTIONS.map((t, i) => <option key={i} value={t}>{t}</option>)}
            </select>
          </InputWrap>
          <FieldError msg={errors.expenseType} />
        </div>

        <div className="col-12">
          <FieldLabel label="Expense Detail" required />
          <InputWrap error={errors.expenseDTL} icon={FileText}>
            <textarea className="pg-field-input exp-entry-textarea" rows={3}
              placeholder="Describe the expense in detail…"
              value={row.expenseDTL}
              onChange={e => onChange('expenseDTL', e.target.value)} />
          </InputWrap>
          <FieldError msg={errors.expenseDTL} />
        </div>

        <div className="col-12 col-md-6">
          <FieldLabel label="Amount (₹)" required />
          <InputWrap error={errors.amount} icon={IndianRupee}>
            <input className="pg-field-input" type="number" min="0" step="0.01"
              placeholder="e.g. 15000" value={row.amount}
              onChange={e => onChange('amount', e.target.value)} />
          </InputWrap>
          <FieldError msg={errors.amount} />
        </div>

        <div className="col-12 col-md-6">
          <FieldLabel label="Paid By" required />
          <InputWrap error={errors.paidBy} icon={User}>
            <input className="pg-field-input" placeholder="Name of person who paid"
              value={row.paidBy} onChange={e => onChange('paidBy', e.target.value)} />
          </InputWrap>
          <FieldError msg={errors.paidBy} />
        </div>

        <div className="col-12">
          <FieldLabel label="Comments" />
          <InputWrap error={errors.comments} icon={MessageSquare}>
            <textarea
              className="pg-field-input exp-entry-textarea"
              rows={3}
              placeholder="Optional remarks…"
              value={row.comments}
              onChange={e => onChange('comments', e.target.value)}
            />
          </InputWrap>
          <FieldError msg={errors.comments} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   INLINE ROWS TABLE
───────────────────────────────────────── */
function ExpenseRowsTable({ rows, rowErrors, onChangeRow, onDeleteRow }) {
  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <div className="exp-rows-wrap">
      <div className="exp-rows-header">
        <div className="exp-rows-header__left">
          <FileText size={14} color="#049edf" />
          <span>Expense Entries ({rows.length})</span>
        </div>
        <div className="exp-rows-header__total">Total: <strong>{fmtCurrency(total)}</strong></div>
      </div>

      {/* Desktop */}
      <div className="exp-rows-desktop">
        <div className="exp-rows-scroll">
          <table className="exp-rows-tbl">
            <thead>
              <tr>
                <th className="exp-col-idx">#</th>
                <th className="exp-col-date">Date <span className="exp-req">*</span></th>
                <th className="exp-col-type">Expense Type <span className="exp-req">*</span></th>
                <th className="exp-col-dtl">Expense Detail <span className="exp-req">*</span></th>
                <th className="exp-col-amt">Amount (₹) <span className="exp-req">*</span></th>
                <th className="exp-col-paid">Paid By <span className="exp-req">*</span></th>
                <th className="exp-col-cmt">Comments</th>
                <th className="exp-col-del"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const errs = rowErrors[row._rowId] || {};
                return (
                  <tr key={row._rowId} className={Object.keys(errs).length ? 'exp-tbl-row exp-tbl-row--err' : 'exp-tbl-row'}>
                    <td className="exp-td exp-td-idx">{idx + 1}</td>
                    <td className="exp-td">
                      <input type="date"
                        className={`exp-cell-input${errs.expenseDate ? ' exp-cell-input--err' : ''}`}
                        value={row.expenseDate}
                        onChange={e => onChangeRow(row._rowId, 'expenseDate', e.target.value)} />
                      {errs.expenseDate && <div className="exp-cell-err">{errs.expenseDate}</div>}
                    </td>
                    <td className="exp-td">
                      <select
                        className={`exp-cell-input${errs.expenseType ? ' exp-cell-input--err' : ''}`}
                        value={row.expenseType}
                        onChange={e => onChangeRow(row._rowId, 'expenseType', e.target.value)}>
                        <option value="">Select…</option>
                        {EXPENSE_TYPE_OPTIONS.map((t, i) => <option key={i} value={t}>{t}</option>)}
                      </select>
                      {errs.expenseType && <div className="exp-cell-err">{errs.expenseType}</div>}
                    </td>
                    <td className="exp-td">
                      <textarea
                        className={`exp-cell-input exp-cell-scroll${errs.expenseDTL ? ' exp-cell-input--err' : ''}`}
                        placeholder="Detail…"
                        value={row.expenseDTL}
                        onChange={e => onChangeRow(row._rowId, 'expenseDTL', e.target.value)}
                      />
                      {errs.expenseDTL && <div className="exp-cell-err">{errs.expenseDTL}</div>}
                    </td>
                    <td className="exp-td">
                      <input type="number" min="0" step="0.01"
                        className={`exp-cell-input${errs.amount ? ' exp-cell-input--err' : ''}`}
                        placeholder="0" value={row.amount}
                        onChange={e => onChangeRow(row._rowId, 'amount', e.target.value)} />
                      {errs.amount && <div className="exp-cell-err">{errs.amount}</div>}
                    </td>
                    <td className="exp-td">
                      <input
                        className={`exp-cell-input${errs.paidBy ? ' exp-cell-input--err' : ''}`}
                        placeholder="Name…" value={row.paidBy}
                        onChange={e => onChangeRow(row._rowId, 'paidBy', e.target.value)} />
                      {errs.paidBy && <div className="exp-cell-err">{errs.paidBy}</div>}
                    </td>
                    <td className="exp-td">
                      <textarea
                        className="exp-cell-input exp-cell-scroll"
                        placeholder="Optional…"
                        value={row.comments}
                        onChange={e => onChangeRow(row._rowId, 'comments', e.target.value)}
                      />
                    </td>
                    <td className="exp-td exp-td-del">
                      <button className="exp-del-row-btn" onClick={() => onDeleteRow(row._rowId)} title="Remove row">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="exp-rows-mobile">
        {rows.map((row, idx) => {
          const errs = rowErrors[row._rowId] || {};
          return (
            <div key={row._rowId} className={`exp-mob-card${Object.keys(errs).length ? ' exp-mob-card--err' : ''}`}>
              <div className="exp-mob-card__top">
                <span className="exp-mob-card__num">#{idx + 1}</span>
                <button className="exp-del-row-btn" onClick={() => onDeleteRow(row._rowId)}><Trash2 size={13} /></button>
              </div>
              <div className="row g-2">
                <div className="col-6">
                  <div className="exp-mob-label">Date <span className="exp-req">*</span></div>
                  <input type="date" className={`exp-cell-input${errs.expenseDate ? ' exp-cell-input--err' : ''}`}
                    value={row.expenseDate} onChange={e => onChangeRow(row._rowId, 'expenseDate', e.target.value)} />
                  {errs.expenseDate && <div className="exp-cell-err">{errs.expenseDate}</div>}
                </div>
                <div className="col-6">
                  <div className="exp-mob-label">Amount <span className="exp-req">*</span></div>
                  <input type="number" min="0" step="0.01" className={`exp-cell-input${errs.amount ? ' exp-cell-input--err' : ''}`}
                    placeholder="0" value={row.amount} onChange={e => onChangeRow(row._rowId, 'amount', e.target.value)} />
                  {errs.amount && <div className="exp-cell-err">{errs.amount}</div>}
                </div>
                <div className="col-12">
                  <div className="exp-mob-label">Expense Type <span className="exp-req">*</span></div>
                  <select className={`exp-cell-input${errs.expenseType ? ' exp-cell-input--err' : ''}`}
                    value={row.expenseType} onChange={e => onChangeRow(row._rowId, 'expenseType', e.target.value)}>
                    <option value="">Select…</option>
                    {EXPENSE_TYPE_OPTIONS.map((t, i) => <option key={i} value={t}>{t}</option>)}
                  </select>
                  {errs.expenseType && <div className="exp-cell-err">{errs.expenseType}</div>}
                </div>
                <div className="col-12">
                  <div className="exp-mob-label">Detail <span className="exp-req">*</span></div>
                  <textarea className={`exp-cell-input exp-cell-scroll${errs.expenseDTL ? ' exp-cell-input--err' : ''}`}
                    placeholder="Detail…" value={row.expenseDTL}
                    onChange={e => onChangeRow(row._rowId, 'expenseDTL', e.target.value)} />
                  {errs.expenseDTL && <div className="exp-cell-err">{errs.expenseDTL}</div>}
                </div>
                <div className="col-6">
                  <div className="exp-mob-label">Paid By <span className="exp-req">*</span></div>
                  <input className={`exp-cell-input${errs.paidBy ? ' exp-cell-input--err' : ''}`}
                    placeholder="Name…" value={row.paidBy} onChange={e => onChangeRow(row._rowId, 'paidBy', e.target.value)} />
                  {errs.paidBy && <div className="exp-cell-err">{errs.paidBy}</div>}
                </div>
                <div className="col-6">
                  <div className="exp-mob-label">Comments</div>
                  <textarea className="exp-cell-input exp-cell-scroll"
                    placeholder="Optional…" value={row.comments}
                    onChange={e => onChangeRow(row._rowId, 'comments', e.target.value)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   EXPENSE FORM  (Add / Edit)
───────────────────────────────────────── */
function ExpenseForm({ mode, expense, hoardings, sites, allExpenses, onBack, onSave }) {
  const isAdd = mode === 'add';

  const [hoardingID, setHoardingID]       = useState(isAdd ? '' : (expense?.hoardingID || ''));
  const [hoardingError, setHoardingError] = useState('');

  const [rows, setRows] = useState(() => {
    if (isAdd || !expense) return [];
    const siblings = (allExpenses || []).filter(e => e.hoardingID === expense.hoardingID);
    const source   = siblings.length > 0 ? siblings : [expense];
    return source.map(e => ({
      ...EMPTY_ROW,
      _rowId:      makeRowId(),
      _expenseID:  e.expenseID,
      expenseDate: e.expenseDate || '',
      expenseType: e.expenseType || '',
      expenseDTL:  e.expenseDTL  || '',
      amount:      e.amount ?? '',
      paidBy:      e.paidBy  || '',
      comments:    e.comments || '',
    }));
  });

  const [rowErrors, setRowErrors] = useState({});

  const emptyCurrentRow = () => ({ ...EMPTY_ROW, _rowId: makeRowId() });
  const [currentRow, setCurrentRow]         = useState(emptyCurrentRow);
  const [currentErrors, setCurrentErrors]   = useState({});

  const [showEntryForm, setShowEntryForm] = useState(isAdd);

  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [apiErr, setApiErr] = useState('');

  const handleCurrentChange = (key, val) => {
    setCurrentRow(p => ({ ...p, [key]: val }));
    if (currentErrors[key]) setCurrentErrors(p => ({ ...p, [key]: '' }));
  };

  const handleAddRow = () => {
    const errs = validateRow(currentRow);
    if (Object.keys(errs).length) { setCurrentErrors(errs); return; }
    setRows(prev => [...prev, { ...currentRow }]);
    setCurrentRow(emptyCurrentRow());
    setCurrentErrors({});
    if (!isAdd) setShowEntryForm(false);
  };

  const handleChangeRow = (rowId, key, val) => {
    setRows(prev => prev.map(r => r._rowId === rowId ? { ...r, [key]: val } : r));
    if (rowErrors[rowId]?.[key]) setRowErrors(prev => ({ ...prev, [rowId]: { ...prev[rowId], [key]: '' } }));
  };
  const handleDeleteRow = (rowId) => {
    setRows(prev => prev.filter(r => r._rowId !== rowId));
    setRowErrors(prev => { const n = { ...prev }; delete n[rowId]; return n; });
  };

  const handleSave = () => {
    if (!hoardingID) { setHoardingError('Required'); return; }
    setHoardingError('');

    const newRowErrors = {};
    let hasErr = false;
    rows.forEach(r => {
      const e = validateRow(r);
      if (Object.keys(e).length) { newRowErrors[r._rowId] = e; hasErr = true; }
    });

    const entryHasData = Object.entries(currentRow).filter(([k]) => k !== '_rowId').some(([, v]) => v !== '');
    if (showEntryForm && entryHasData) {
      const errs = validateRow(currentRow);
      if (Object.keys(errs).length) { setCurrentErrors(errs); return; }
      if (hasErr) { setRowErrors(newRowErrors); return; }
      _doSave([...rows, { ...currentRow }]);
      return;
    }

    if (rows.length === 0) { setApiErr('Please add at least one expense row.'); return; }
    if (hasErr) { setRowErrors(newRowErrors); return; }
    _doSave(rows);
  };

  const _doSave = (allRows) => {
    setSaving(true); setApiErr('');
    setTimeout(() => {
      try {
        allRows.forEach(row => {
          const isNewRecord = !row._expenseID;
          onSave({
            expenseID:   isNewRecord ? (Date.now() + Math.random()) : row._expenseID,
            hoardingID:  Number(hoardingID),
            expenseDate: row.expenseDate,
            expenseType: row.expenseType,
            expenseDTL:  row.expenseDTL,
            amount:      Number(row.amount),
            paidBy:      row.paidBy,
            comments:    row.comments || '',
          }, isNewRecord);
        });
        setSaving(false); setSaveOk(true);
        setTimeout(() => onBack(), 700);
      } catch (err) {
        setApiErr(err?.message || 'Save failed. Please try again.');
        setSaving(false);
      }
    }, 500);
  };

  const totalAmount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const saveLabel = `Save ${rows.length > 0 ? rows.length : ''} Expense${rows.length !== 1 ? 's' : ''}`.trim();

  return (
    <div className="hd-form-page">
      <div className="hd-topbar">
        <div className="hd-topbar-left">
          <button className="hd-back-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span className="d-none d-sm-inline">Back to Expenses</span>
            <span className="d-inline d-sm-none">Back</span>
          </button>
          <div className="hd-topbar-divider" />
          <div>
            <div className="hd-topbar-title">{isAdd ? 'Add New Expenses' : `Edit Expenses — ${expense?.hoardingCode || `Hoarding #${expense?.hoardingID}`}`}</div>
            <div className="hd-topbar-sub">
              {isAdd
                ? 'Fill each expense and click "Add Expense Row" to queue, then save all'
                : 'Update expense details or add more rows for this hoarding'}
            </div>
          </div>
        </div>
      </div>

      <div className="hd-form-body">
        <div className="container-fluid px-0">
          {apiErr && (
            <div className="pg-field-error hd-api-error mb-3"><AlertCircle size={14} /><span>{apiErr}</span></div>
          )}
          <div className="row g-4">

            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><Building2 size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Hoarding Selection</div>
                    <div className="hd-section-sub">
                      {isAdd ? 'All expense rows will be linked to this hoarding' : 'Hoarding linked to this expense (locked)'}
                    </div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <FieldLabel label="Search Hoarding by Site Address" required />
                  <HoardingSearchWidget
                    hoardings={hoardings} sites={sites}
                    value={hoardingID}
                    onChange={val => { setHoardingID(val); if (val) setHoardingError(''); }}
                    error={hoardingError}
                    disabled={!isAdd}
                  />
                  <FieldError msg={hoardingError} />
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><FileText size={14} color="#049edf" /></div>
                  <div style={{ flex: 1 }}>
                    <div className="hd-section-title">Expense Entry</div>
                    <div className="hd-section-sub">
                      {isAdd
                        ? 'Add one or more expense rows for this hoarding'
                        : `${rows.length} expense row${rows.length !== 1 ? 's' : ''} · ${fmtCurrency(totalAmount)}`}
                    </div>
                  </div>
                  {!isAdd && (
                    <button
                      className={`exp-toggle-btn${showEntryForm ? ' exp-toggle-btn--cancel' : ''}`}
                      onClick={() => { setShowEntryForm(v => !v); setCurrentErrors({}); }}
                    >
                      {showEntryForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add Expense Row</>}
                    </button>
                  )}
                </div>

                <div className="hd-section-body">
                  {showEntryForm && (
                    <>
                      <ExpenseEntryPanel row={currentRow} errors={currentErrors} onChange={handleCurrentChange} />
                      <div className="exp-addrow-bar">
                        <button className="exp-btn-addrow" onClick={handleAddRow}>
                          <Plus size={14} /> Add Expense Row
                        </button>
                        {rows.length > 0 && (
                          <span className="exp-addrow-hint">
                            {rows.length} row{rows.length !== 1 ? 's' : ''} queued · {fmtCurrency(totalAmount)}
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  <ExpenseRowsTable
                    rows={rows} rowErrors={rowErrors}
                    onChangeRow={handleChangeRow} onDeleteRow={handleDeleteRow}
                  />

                  {!isAdd && rows.length === 0 && !showEntryForm && (
                    <div className="exp-edit-empty">
                      <FileText size={28} color="#d0d0e8" />
                      <span>No expense rows. Click <strong>Add Expense Row</strong> above to add one.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hd-form-footer hd-form-footer--sticky">
        <button className="pg-btn-cancel" onClick={onBack} disabled={saving}>Cancel</button>
        <button className="pg-btn-save" onClick={handleSave} disabled={saving}>
          {saveOk
            ? <><Check size={13} /> Saved!</>
            : saving
              ? <><Loader2 size={13} className="pg-spin" /> Saving…</>
              : <><Check size={13} /> {saveLabel}</>}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function HoardingExpensePage() {
  const [hoardings, setHoardings]       = useState([]);
  const [sites, setSites]               = useState([]);
  const [loadingMeta, setLoadingMeta]   = useState(true);
  const [loadError, setLoadError]       = useState('');
  const [expenses, setExpenses]         = useState([]);

  const [view, setView]             = useState(() => sessionStorage.getItem('exp_view') || 'grid');
  const [formMode, setFormMode]     = useState(() => sessionStorage.getItem('exp_formMode') || null);
  const [editTarget, setEditTarget] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('exp_editTarget')) || null; } catch { return null; }
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch]             = useState('');
  const [sortKey, setSortKey]           = useState('hoardingCode');
  const [sortDir, setSortDir]           = useState('asc');
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(10);

  const fetchMeta = useCallback(async () => {
    setLoadingMeta(true); setLoadError('');
    try {
      const [rawHoardings, rawSites] = await Promise.all([apiService.getAllHoardings(), apiService.getAllSites()]);
      const map = {};
      (Array.isArray(rawHoardings) ? rawHoardings : []).forEach(rec => {
        const code = rec.hoardingCode;
        if (!map[code]) map[code] = { hoardingCode: code, versions: [] };
        map[code].versions.push({
          hoardingID: rec.hoardingID, effdt: rec.effdt ? rec.effdt.split('T')[0] : '',
          material: rec.material || '', hoardingType: rec.hoardingType || '',
          status: rec.status || '', monthlyRent: rec.monthlyRent ?? '',
          width: rec.width ?? '', height: rec.height ?? '', siteID: rec.siteID || '',
        });
      });
      setHoardings(Object.values(map));
      setSites(Array.isArray(rawSites) ? rawSites : []);
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Failed to load hoardings / sites.');
    } finally { setLoadingMeta(false); }
  }, []);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);
  useEffect(() => {
    sessionStorage.setItem('exp_view', view);
    sessionStorage.setItem('exp_formMode', formMode || '');
    try { sessionStorage.setItem('exp_editTarget', editTarget ? JSON.stringify(editTarget) : ''); } catch { /* ignore */ }
  }, [view, formMode, editTarget]);

  const handleSave = (record, isNew) => {
    setExpenses(prev =>
      isNew
        ? [record, ...prev]
        : prev.map(e => e.expenseID === record.expenseID ? record : e)
    );
  };

  /* Delete ALL expenses for a hoarding */
  const handleDeleteGroup = (hoardingID) => {
    setExpenses(prev => prev.filter(e => e.hoardingID !== hoardingID));
    setDeleteTarget(null);
  };

  /* ── GROUP expenses by hoardingID ── */
  const groupedRows = React.useMemo(() => {
    const map = {};
    expenses.forEach(exp => {
      const key = exp.hoardingID;
      if (!map[key]) {
        const hoarding = hoardings.find(h => h.versions.some(v => v.hoardingID === exp.hoardingID));
        const latest   = hoarding ? getLatest(hoarding) : null;
        const site     = latest   ? sites.find(s => s.siteID === latest.siteID) : null;
        map[key] = {
          hoardingID:   key,
          hoardingCode: hoarding?.hoardingCode || `ID ${key}`,
          siteLabel:    site ? [site.addressLine1, site.city].filter(Boolean).join(', ') : `Hoarding ID ${key}`,
          totalAmount:  0,
          count:        0,
          _firstExpense: exp,   // used to open edit form
        };
      }
      map[key].totalAmount += Number(exp.amount) || 0;
      map[key].count += 1;
    });
    return Object.values(map);
  }, [expenses, hoardings, sites]);

  const filtered = groupedRows.filter(r => {
    const q = search.toLowerCase();
    return (
      r.hoardingCode.toLowerCase().includes(q) ||
      r.siteLabel.toLowerCase().includes(q) ||
      String(r.hoardingID).includes(q)
    );
  });

  const sortedRows = [...filtered].sort((a, b) => {
    let av, bv;
    if (sortKey === 'totalAmount') {
      av = a.totalAmount; bv = b.totalAmount;
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    av = String(a[sortKey] ?? '').toLowerCase();
    bv = String(b[sortKey] ?? '').toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginated  = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const totalAmount = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => { if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…'); acc.push(p); return acc; }, []);

  /* 3 columns only */
  const COLS = [
    { key: 'hoardingCode', label: 'Hoarding' },
    { key: 'totalAmount',  label: 'Total Amount' },
    { key: '_action',      label: 'Actions', noSort: true },
  ];

  if (view === 'form') {
    return (
      <ExpenseForm
        mode={formMode}
        expense={editTarget}
        hoardings={hoardings}
        sites={sites}
        allExpenses={expenses}
        onBack={() => {
          sessionStorage.removeItem('exp_view');
          sessionStorage.removeItem('exp_formMode');
          sessionStorage.removeItem('exp_editTarget');
          setView('grid'); setEditTarget(null);
        }}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="pg-page">
      <div className="pg-header">
        <div>
          <h1 className="pg-header__title">Hoarding Expenses</h1>
          <p className="pg-header__subtitle">
            Track and manage all hoarding-related expenses
            {expenses.length > 0 && <> · Total: <strong>{fmtCurrency(totalAmount)}</strong></>}
          </p>
        </div>
        <button className="pg-btn-add" onClick={() => { setFormMode('add'); setEditTarget(null); setView('form'); }} disabled={loadingMeta}>
          <Plus size={14} /> Add Expense
        </button>
      </div>

      {!loadingMeta && expenses.length > 0 && (
        <div className="exp-stats-strip">
          {[
            { icon: <FileText size={16} color="#049edf" />, bg: 'rgba(4,158,223,0.1)', label: 'Total Expenses', val: expenses.length },
            { icon: <IndianRupee size={16} color="#16a34a" />, bg: 'rgba(22,163,74,0.1)', label: 'Total Amount', val: fmtCurrency(totalAmount) },
            { icon: <Building2 size={16} color="#6c63ff" />, bg: 'rgba(108,99,255,0.1)', label: 'Hoardings Covered', val: new Set(expenses.map(e => e.hoardingID)).size },
          ].map(s => (
            <div key={s.label} className="exp-stat-item">
              <div className="exp-stat-item__icon" style={{ background: s.bg }}>{s.icon}</div>
              <div><div className="exp-stat-item__label">{s.label}</div><div className="exp-stat-item__val">{s.val}</div></div>
            </div>
          ))}
        </div>
      )}

      {loadError && (
        <div className="pg-field-error hd-api-error mb-3" style={{ margin: '0 0 16px 0' }}>
          <AlertCircle size={14} /><span>{loadError}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }} onClick={fetchMeta}>Retry</button>
        </div>
      )}

      <div className="pg-container">
        <div className="pg-toolbar">
          <div className="pg-toolbar__inner">
            <div className="pg-toolbar__count">
              <Building2 size={14} color="#9090a8" />
              <span><strong>{loadingMeta ? '…' : filtered.length}</strong> hoarding{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="pg-search-box">
              <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input placeholder="Search hoarding code or site…" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
            </div>
            <button className="pg-pg-btn" onClick={fetchMeta} title="Refresh"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={13} className={loadingMeta ? 'pg-spin' : ''} />
            </button>
          </div>
        </div>

        {loadingMeta && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#9090a8' }}>
            <Loader2 size={28} className="pg-spin" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13 }}>Loading hoardings &amp; sites…</div>
          </div>
        )}

        {!loadingMeta && expenses.length === 0 && (
          <div className="pg-empty" style={{ padding: '70px 20px' }}>
            <div className="pg-empty__inner">
              <FileText size={42} color="#d0d0e8" />
              <span className="pg-empty__label">No expenses recorded yet</span>
              <span style={{ fontSize: 12, color: '#b0b0c8', fontFamily: 'Nunito, sans-serif' }}>Click <strong>Add Expense</strong> to record the first one</span>
            </div>
          </div>
        )}

        {!loadingMeta && expenses.length > 0 && (
          <div className="pg-desktop-table">
            <table className="pg-table">
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th key={col.key}
                      className={['pg-th', !col.noSort && 'pg-th--sort'].filter(Boolean).join(' ')}
                      onClick={() => !col.noSort && handleSort(col.key)}>
                      <div className="pg-th__inner">{col.label}{!col.noSort && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={COLS.length} className="pg-td pg-empty">
                    <div className="pg-empty__inner"><FileText size={36} color="#d0d0e8" /><span className="pg-empty__label">No hoardings match your search</span></div>
                  </td></tr>
                ) : paginated.map(r => (
                  <tr key={r.hoardingID} className="pg-tr">

                    {/* Hoarding */}
                    <td className="pg-td">
                      <div className="pg-td__primary hd-code-cell">{r.hoardingCode}</div>
                      <div style={{ fontSize: 11, color: '#9090a8', marginTop: 2 }}>{r.siteLabel}</div>
                      <div style={{ fontSize: 11, color: '#b0b0c8', marginTop: 1 }}>{r.count} expense{r.count !== 1 ? 's' : ''}</div>
                    </td>

                    {/* Total Amount */}
                    <td className="pg-td">
                      <span className="exp-amount-val">{fmtCurrency(r.totalAmount)}</span>
                    </td>

                    {/* Actions — Edit only */}
                    <td className="pg-td">
                      <div className="pg-action-wrap">
                        <button
                          className="pg-btn-view"
                          title="Edit expenses for this hoarding"
                          onClick={() => {
                            setFormMode('edit');
                            setEditTarget(r._firstExpense);
                            setView('form');
                          }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="exp-btn-delete"
                          title="Delete all expenses for this hoarding"
                          onClick={() => setDeleteTarget(r)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile cards */}
        {!loadingMeta && expenses.length > 0 && (
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <FileText size={36} color="#d0d0e8" /><span className="pg-empty__label">No hoardings match your search</span>
              </div>
            ) : paginated.map(r => (
              <div key={r.hoardingID} className="pg-card">
                <div className="pg-card__header">
                  <div className="pg-card__title-wrap">
                    <div className="pg-card__title">{r.hoardingCode}</div>
                    <div className="pg-card__subtitle">{r.siteLabel}</div>
                  </div>
                  <div className="pg-card__actions">
                    <button
                      className="pg-card__btn-view"
                      onClick={() => { setFormMode('edit'); setEditTarget(r._firstExpense); setView('form'); }}
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button className="exp-btn-delete" onClick={() => setDeleteTarget(r)} title="Delete all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="pg-card__body">
                  <div className="pg-card__row">
                    <IndianRupee size={12} color="#c0c0d8" className="pg-card__row-icon" />
                    <span className="pg-card__row-text" style={{ fontWeight: 800, color: '#1a1a2e' }}>{fmtCurrency(r.totalAmount)}</span>
                  </div>
                  <div className="pg-card__row">
                    <FileText size={12} color="#c0c0d8" className="pg-card__row-icon" />
                    <span className="pg-card__row-text">{r.count} expense{r.count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingMeta && expenses.length > 0 && (
          <div className="pg-pagination">
            <div className="pg-pagination__left">
              <button className="pg-pg-btn" disabled={page === 1}          onClick={() => setPage(1)}><ChevronsLeft  size={13} /></button>
              <button className="pg-pg-btn" disabled={page === 1}          onClick={() => setPage(p => p - 1)}><ChevronLeft  size={13} /></button>
              {pageNums.map((p, i) => p === '…'
                ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span>
                : <button key={p} className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              )}
              <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight  size={13} /></button>
              <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={13} /></button>
            </div>
            <div className="pg-pagination__right">
              <select className="pg-pagesize-select" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="pg-pagination__text">Items per page</span>
              <span className="pg-pagination__text">{page} of {totalPages} pages ({sortedRows.length} items)</span>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          hoardingID={deleteTarget.hoardingID}
          hoardingCode={deleteTarget.hoardingCode}
          expenseCount={deleteTarget.count}
          onConfirm={() => handleDeleteGroup(deleteTarget.hoardingID)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}