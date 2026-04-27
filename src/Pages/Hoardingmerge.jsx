import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Plus, Search, X, AlertCircle, Check, Edit2,
  RefreshCw, ArrowLeft, Loader2, Trash2,
  Building2, ArrowLeftRight, ArrowUpDown,
  Link2, Layers, ChevronDown,
  GitMerge, Maximize2, LayoutTemplate,
  ChevronUp, ChevronsLeft, ChevronsRight,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { apiService } from '../api/api';
import './Common1.css';

/* ─────────────────────────────────────
   NORMALIZE API RESPONSE
───────────────────────────────────── */
function normalizeList(raw) {
  if (Array.isArray(raw))                           return raw;
  if (raw?.$values && Array.isArray(raw.$values))   return raw.$values;
  if (raw?.data    && Array.isArray(raw.data))       return raw.data;
  if (raw?.items   && Array.isArray(raw.items))      return raw.items;
  if (raw?.result  && Array.isArray(raw.result))     return raw.result;
  return [];
}

/* ─────────────────────────────────────
   HELPERS
───────────────────────────────────── */
function getLatest(h) {
  if (!h?.versions?.length) return null;
  return [...h.versions].sort((a, b) => new Date(b.effdt) - new Date(a.effdt))[0];
}

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];

/* ─────────────────────────────────────
   SORT ICON
───────────────────────────────────── */
function SortIcon({ col, sortKey, sortDir }) {
  const active = sortKey === col;
  return (
    <span className="pg-sort-icon">
      <ChevronUp   size={10} color={active && sortDir === 'asc'  ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__up"   />
      <ChevronDown size={10} color={active && sortDir === 'desc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__down" />
    </span>
  );
}

/* ─────────────────────────────────────
   PORTAL DROPDOWN
───────────────────────────────────── */
function PortalDropdown({ open, triggerRef, panelRef, children }) {
  const [style, setStyle] = useState({ position: 'fixed', top: 0, left: 0, width: 0, zIndex: 99999 });
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const ph    = panelRef.current?.offsetHeight || 260;
      const flipUp = window.innerHeight - r.bottom < ph + 8 && r.top > ph + 8;
      setStyle({ position: 'fixed', top: flipUp ? r.top - ph - 4 : r.bottom + 4, left: r.left, width: r.width, zIndex: 99999 });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open, triggerRef, panelRef]);
  if (!open) return null;
  return ReactDOM.createPortal(<div ref={panelRef} style={style}>{children}</div>, document.body);
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

/* ─────────────────────────────────────
   CONTRACT SELECTOR
───────────────────────────────────── */
function ContractSelector({ value, onChange, contracts, customers, hoardings, error }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef    = useRef(null);
  const triggerRef = useRef(null);
  const panelRef   = useRef(null);
  const inputRef   = useRef(null);

  useOutsideClick(wrapRef, panelRef, open, () => setOpen(false));

  const getCustomerName = (c) => {
    const cust = customers.find(cu =>
      cu.customerID === c.customerID ||
      cu.customerID === Number(c.customerID)
    );
    return cust?.customerName || (c.customerID ? `Customer #${c.customerID}` : '');
  };

  const getHoardingCode = (c) => {
    if (!c.hoardingID) return '';
    const h = hoardings.find(h2 => h2.versions?.some(v => v.hoardingID === c.hoardingID || v.hoardingID === Number(c.hoardingID)));
    return h?.hoardingCode || `Hoarding #${c.hoardingID}`;
  };

  const selected = contracts.find(c =>
    c.customerContractID === Number(value) ||
    c.customerContractID === value
  );

  const filtered = contracts.filter(c => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      String(c.customerContractID).includes(q) ||
      getCustomerName(c).toLowerCase().includes(q) ||
      getHoardingCode(c).toLowerCase().includes(q) ||
      (c.status || '').toLowerCase().includes(q)
    );
  });

  const openDD = () => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); };
  const select = (c) => { onChange(c.customerContractID); setOpen(false); setQuery(''); };
  const clear  = (e) => { e.stopPropagation(); onChange(''); };

  return (
    <div ref={wrapRef}>
      <div
        ref={triggerRef}
        className={`pg-field-wrap ${error ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        onClick={openDD}
        style={{ cursor: 'pointer' }}
      >
        <Link2 size={14} color={error ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, color: selected ? '#1a1a2e' : '#b0b0c8' }}>
          {selected
            ? `#${selected.customerContractID}${getCustomerName(selected) ? ` — ${getCustomerName(selected)}` : ''}${getHoardingCode(selected) ? ` · ${getHoardingCode(selected)}` : ''}`
            : 'Select customer contract…'}
        </span>
        {selected
          ? <X size={13} style={{ flexShrink: 0, color: '#9090a8', cursor: 'pointer' }} onClick={clear} />
          : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>

      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position: 'static' }}>
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="pg-combo-search__input"
              placeholder="Search by ID, customer or hoarding…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
          </div>
          <div className="pg-combo-list" style={{ maxHeight: 260, overflowY: 'auto' }}>
            {contracts.length === 0 ? (
              <div className="pg-combo-empty" style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#9090a8', marginBottom: 4 }}>No contracts available</div>
                <div style={{ fontSize: 11, color: '#b0b0c8' }}>Make sure customer contracts exist before creating a merge.</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="pg-combo-empty">No contracts match "{query}"</div>
            ) : (
              filtered.map(c => (
                <div
                  key={c.customerContractID}
                  className={`pg-combo-option${c.customerContractID === Number(value) ? ' pg-combo-option--active' : ''}`}
                  onClick={() => select(c)}
                >
                  <div className="hm-contract-opt">
                    <div className="hm-contract-opt__main">
                      Contract #{c.customerContractID}
                      {getCustomerName(c) && <> — {getCustomerName(c)}</>}
                    </div>
                    <div className="hm-contract-opt__sub">
                      {getHoardingCode(c) && <>{getHoardingCode(c)} · </>}
                      {c.status || 'No status'}
                      {c.startDate && ` · From ${c.startDate.split('T')[0]}`}
                    </div>
                  </div>
                  {c.customerContractID === Number(value) && (
                    <Check size={12} color="#049edf" style={{ flexShrink: 0 }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </PortalDropdown>

      {error && (
        <div className="hm-val-err"><AlertCircle size={11} /><span>{error}</span></div>
      )}

      {process.env.NODE_ENV === 'development' && (
        <div style={{ fontSize: 10, color: '#b0b0c8', marginTop: 4 }}>
          {contracts.length} contract(s) loaded
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────
   HOARDING MULTI-SELECT
───────────────────────────────────── */
function HoardingMultiSelect({ selected, onChange, hoardings, sites, error }) {
  const [query, setQuery] = useState('');

  const allHoardings = hoardings.map(h => {
    const latest = getLatest(h);
    const site   = sites.find(s => s.siteID === latest?.siteID);
    const addr   = site
      ? [site.addressLine1, site.city].filter(Boolean).join(', ')
      : '';
    return { ...h, latest, addr };
  });

  const filtered = allHoardings.filter(h => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      h.hoardingCode.toLowerCase().includes(q) ||
      h.addr.toLowerCase().includes(q)
    );
  });

  const toggle  = (id) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const remove  = (id) => onChange(selected.filter(x => x !== id));

  return (
    <div>
      {selected.length > 0 && (
        <div className="hm-selected-strip">
          {selected.map(id => {
            const h = allHoardings.find(h2 => h2.latest?.hoardingID === id);
            return (
              <div key={id} className="hm-selected-pill">
                <Building2 size={10} color="#049edf" />
                {h?.hoardingCode || `#${id}`}
                <button className="hm-selected-pill__remove" onClick={() => remove(id)}>
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="hm-hoard-search" style={{ marginTop: selected.length > 0 ? 8 : 0 }}>
        <Search size={13} color="#c0c0d8" />
        <input
          placeholder="Search hoarding code or site address…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && <X size={11} style={{ cursor: 'pointer', color: '#c0c0d8' }} onClick={() => setQuery('')} />}
      </div>

      {error && (
        <div className="hm-val-err" style={{ marginTop: 4 }}>
          <AlertCircle size={11} /><span>{error}</span>
        </div>
      )}

      <div className="hm-hoardings-list">
        {filtered.length === 0 ? (
          <div style={{ fontSize: 12, color: '#9090a8', padding: '12px 0', textAlign: 'center' }}>
            No hoardings found
          </div>
        ) : (
          filtered.map(h => {
            const id         = h.latest?.hoardingID;
            const isSelected = id && selected.includes(id);
            return (
              <div
                key={h.hoardingCode}
                className={`hm-hoarding-row${isSelected ? ' hm-hoarding-row--selected' : ''}`}
                onClick={() => id && toggle(id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="hm-hoarding-row__check">
                  {isSelected && <Check size={11} color="#fff" />}
                </div>
                <div className="hm-hoarding-row__info">
                  <div className="hm-hoarding-row__code">{h.hoardingCode}</div>
                  <div className="hm-hoarding-row__meta">{h.addr || 'No site info'}</div>
                </div>
                {h.latest?.width && h.latest?.height && (
                  <div className="hm-hoarding-row__dim">{h.latest.width} × {h.latest.height} ft</div>
                )}
                {h.latest?.status && (
                  <span className="hm-info-chip" style={{
                    color:      h.latest.status === 'Active' ? '#16a34a' : '#9090a8',
                    background: h.latest.status === 'Active' ? 'rgba(22,163,74,0.08)' : '#f5f6ff',
                  }}>
                    {h.latest.status}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   DIRECTION SELECTOR
───────────────────────────────────── */
function DirectionSelector({ value, onChange, error }) {
  return (
    <div>
      <div className="hm-dir-explainer">
        <div
          className={`hm-dir-card${value === 'W' ? ' hm-dir-card--active-width' : ''}`}
          onClick={() => onChange('W')}
        >
          <div className="hm-dir-card__title">
            <ArrowLeftRight size={14} color={value === 'W' ? '#049edf' : '#9090a8'} />
            Merge by Width
          </div>
          <div className="hm-dir-card__desc">
            Hoardings placed side by side. Combined width = sum of all widths. Heights must match.
          </div>
          <div className="hm-dir-card__diagram">
            {['H1', 'H2'].map((lbl, i) => (
              <React.Fragment key={lbl}>
                {i > 0 && <div style={{ width: 8, height: 2, background: value === 'W' ? '#049edf' : '#d8dfe8' }} />}
                <div className="hm-dir-mini-block" style={{
                  width: 28, height: 22,
                  borderColor: value === 'W' ? '#049edf' : '#d8dfe8',
                  color: '#049edf',
                  background: value === 'W' ? 'rgba(4,158,223,0.1)' : '#f5f6ff',
                }}>{lbl}</div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div
          className={`hm-dir-card${value === 'H' ? ' hm-dir-card--active-height' : ''}`}
          onClick={() => onChange('H')}
        >
          <div className="hm-dir-card__title">
            <ArrowUpDown size={14} color={value === 'H' ? '#6c63ff' : '#9090a8'} />
            Merge by Height
          </div>
          <div className="hm-dir-card__desc">
            Hoardings stacked vertically. Combined height = sum of all heights. Widths must match.
          </div>
          <div className="hm-dir-card__diagram" style={{ flexDirection: 'column' }}>
            {['H1', 'H2'].map((lbl, i) => (
              <React.Fragment key={lbl}>
                {i > 0 && <div style={{ width: 2, height: 8, background: value === 'H' ? '#6c63ff' : '#d8dfe8' }} />}
                <div className="hm-dir-mini-block" style={{
                  width: 44, height: 16,
                  borderColor: value === 'H' ? '#6c63ff' : '#d8dfe8',
                  color: '#6c63ff',
                  background: value === 'H' ? 'rgba(108,99,255,0.1)' : '#f5f6ff',
                }}>{lbl}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      {error && (
        <div className="hm-val-err" style={{ marginTop: 6 }}>
          <AlertCircle size={11} /><span>{error}</span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────
   MERGE VISUAL
───────────────────────────────────── */
function MergeVisual({ hoardingIDs, direction, hoardings, compact = false }) {
  const blocks = hoardingIDs.map(id => {
    const h      = hoardings.find(h2 => h2.versions?.some(v => v.hoardingID === id));
    const latest = h ? getLatest(h) : null;
    return { code: h?.hoardingCode || `#${id}`, width: latest?.width, height: latest?.height };
  });

  if (blocks.length === 0) return null;
  const dir = direction === 'W' ? 'width' : 'height';

  return (
    <div
      className={`hm-visual-wrap hm-visual-wrap--${dir}`}
      style={{ padding: compact ? '6px 6px' : '16px 12px 10px', minHeight: compact ? 48 : 80 }}
    >
      {blocks.map((b, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div className={`hm-vis-connector hm-vis-connector--${dir}`} />}
          <div className={`hm-vis-block hm-vis-block--${dir}`} style={{ padding: compact ? '3px 6px' : '6px 10px' }}>
            <div className="hm-vis-block__code">{b.code}</div>
            {b.width && b.height && <div className="hm-vis-block__dim">{b.width}×{b.height}ft</div>}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────
   DELETE MODAL
───────────────────────────────────── */
function DeleteModal({ group, onConfirm, onCancel, deleting }) {
  return (
    <div className="pg-overlay" style={{ zIndex: 99998 }} onClick={onCancel}>
      <div className="hm-del-modal" onClick={e => e.stopPropagation()}>
        <div className="hm-del-modal__icon"><Trash2 size={24} color="#dc2626" /></div>
        <div className="hm-del-modal__title">Delete Merge Group?</div>
        <div className="hm-del-modal__sub">
          All <strong>{group.count}</strong> record{group.count !== 1 ? 's' : ''} for Contract #{group.customerContractID} will be permanently deleted.
        </div>
        <div className="hm-del-modal__actions">
          <button className="pg-btn-cancel" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="hm-btn-confirm-del" onClick={onConfirm} disabled={deleting}>
            {deleting
              ? <><Loader2 size={13} className="pg-spin" /> Deleting…</>
              : <><Trash2 size={13} /> Delete All</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   MERGE FORM
───────────────────────────────────── */
function MergeForm({ mode, group, hoardings, sites, contracts, customers, onBack }) {
  const isAdd = mode === 'add';

  const [contractID, setContractID] = useState(isAdd ? '' : String(group?.customerContractID || ''));
  const [selectedH,  setSelectedH]  = useState(isAdd ? [] : (group?.hoardingIDs || []));
  const [direction,  setDirection]  = useState(isAdd ? 'W' : (group?.mergeAlongFlag || 'W'));
  const [errors,     setErrors]     = useState({});
  const [saving,     setSaving]     = useState(false);
  const [saveOk,     setSaveOk]     = useState(false);
  const [apiErr,     setApiErr]     = useState('');

  const validate = () => {
    const e = {};
    if (!contractID)           e.contractID = 'Please select a customer contract.';
    if (selectedH.length < 2) e.hoardings  = 'Select at least 2 hoardings to merge.';
    if (!direction)            e.direction  = 'Please select a merge direction.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setApiErr('');
    try {
      if (!isAdd) {
        for (const id of (group?.mergeIDs || [])) {
          await apiService.deleteHoardingMerge(id);
        }
      }
      for (const hID of selectedH) {
        await apiService.createHoardingMerge({
          hoardingID:         hID,
          customerContractID: Number(contractID),
          mergeAlongFlag:     direction,
        });
      }
      setSaveOk(true);
      setTimeout(() => onBack(), 700);
    } catch (err) {
      setApiErr(
        err?.response?.data?.message ||
        err?.response?.data?.title   ||
        err?.message                 ||
        'Save failed.'
      );
    } finally { setSaving(false); }
  };

  const mergedSizeLabel = (() => {
    if (selectedH.length < 2 || !direction) return null;
    const blocks = selectedH.map(id => {
      const h = hoardings.find(h2 => h2.versions?.some(v => v.hoardingID === id));
      return getLatest(h);
    }).filter(Boolean);
    if (direction === 'W') {
      const tw = blocks.reduce((s, b) => s + (Number(b?.width)  || 0), 0);
      const h  = blocks[0]?.height;
      return tw ? `${tw} × ${h || '?'} ft` : null;
    } else {
      const th = blocks.reduce((s, b) => s + (Number(b?.height) || 0), 0);
      const w  = blocks[0]?.width;
      return th ? `${w || '?'} × ${th} ft` : null;
    }
  })();

  return (
    <div className="hd-form-page">
      <div className="hd-topbar">
        <div className="hd-topbar-left">
          <button className="hd-back-btn" onClick={onBack} disabled={saving}>
            <ArrowLeft size={14} />
            <span className="d-none d-sm-inline">Back to Merges</span>
            <span className="d-inline d-sm-none">Back</span>
          </button>
          <div className="hd-topbar-divider" />
          <div>
            <div className="hd-topbar-title">
              {isAdd ? 'Create Hoarding Merge' : `Edit Merge — Contract #${group?.customerContractID}`}
            </div>
            <div className="hd-topbar-sub">
              {isAdd
                ? 'Select a contract, pick hoardings, and set merge direction'
                : 'Update hoardings or direction for this merge group'}
            </div>
          </div>
        </div>
      </div>

      <div className="hm-form-body">
        {apiErr && (
          <div className="pg-field-error hd-api-error" style={{ marginBottom: 16 }}>
            <AlertCircle size={14} /><span>{apiErr}</span>
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
              onClick={() => setApiErr('')}>✕</button>
          </div>
        )}

        {/* Step 1 — Contract */}
        <div className="hm-section-card">
          <div className="hm-section-head">
            <div className="hm-section-icon"><Link2 size={15} color="#049edf" /></div>
            <div>
              <div className="hm-section-title">Step 1 — Customer Contract</div>
              <div className="hm-section-sub">
                The merge will be linked to this contract
                {contracts.length === 0 && (
                  <span style={{ color: '#e97316', marginLeft: 8 }}>
                    ⚠ No contracts loaded
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="hm-section-body">
            <ContractSelector
              value={contractID}
              onChange={v => { setContractID(String(v)); setErrors(p => ({ ...p, contractID: '' })); }}
              contracts={contracts}
              customers={customers}
              hoardings={hoardings}
              error={errors.contractID}
            />
          </div>
        </div>

        {/* Step 2 — Hoardings */}
        <div className="hm-section-card">
          <div className="hm-section-head">
            <div className="hm-section-icon"><Building2 size={15} color="#049edf" /></div>
            <div style={{ flex: 1 }}>
              <div className="hm-section-title">Step 2 — Select Hoardings to Merge</div>
              <div className="hm-section-sub">Choose 2 or more hoardings from the same site</div>
            </div>
            {selectedH.length >= 2 && (
              <span className="hm-dir-badge hm-dir-badge--width">{selectedH.length} selected</span>
            )}
          </div>
          <div className="hm-section-body">
            <HoardingMultiSelect
              selected={selectedH}
              onChange={v => { setSelectedH(v); setErrors(p => ({ ...p, hoardings: '' })); }}
              hoardings={hoardings}
              sites={sites}
              error={errors.hoardings}
            />
          </div>
        </div>

        {/* Step 3 — Direction */}
        <div className="hm-section-card">
          <div className="hm-section-head">
            <div className="hm-section-icon">
              {direction === 'W'
                ? <ArrowLeftRight size={15} color="#049edf" />
                : <ArrowUpDown    size={15} color="#6c63ff" />}
            </div>
            <div style={{ flex: 1 }}>
              <div className="hm-section-title">Step 3 — Merge Direction</div>
              <div className="hm-section-sub">How should the hoardings be joined together?</div>
            </div>
            {direction && (
              <div className={`hm-dir-badge${direction === 'W' ? ' hm-dir-badge--width' : ' hm-dir-badge--height'}`}>
                {direction === 'W' ? <ArrowLeftRight size={10} /> : <ArrowUpDown size={10} />}
                {direction === 'W' ? 'Width Merge' : 'Height Merge'}
              </div>
            )}
          </div>
          <div className="hm-section-body">
            <DirectionSelector
              value={direction}
              onChange={v => { setDirection(v); setErrors(p => ({ ...p, direction: '' })); }}
              error={errors.direction}
            />
          </div>
        </div>

        {/* Preview */}
        {selectedH.length >= 2 && direction && (
          <div className="hm-section-card">
            <div className="hm-section-head">
              <div className="hm-section-icon"><Layers size={15} color="#049edf" /></div>
              <div>
                <div className="hm-section-title">Preview</div>
                <div className="hm-section-sub">How the merged hoarding will look</div>
              </div>
              {mergedSizeLabel && (
                <span className="hm-info-chip" style={{ marginLeft: 'auto', color: direction === 'W' ? '#049edf' : '#6c63ff', background: direction === 'W' ? 'rgba(4,158,223,0.08)' : 'rgba(108,99,255,0.08)' }}>
                  <Maximize2 size={10} /> {mergedSizeLabel} merged
                </span>
              )}
            </div>
            <div className="hm-section-body">
              <MergeVisual hoardingIDs={selectedH} direction={direction} hoardings={hoardings} />
            </div>
          </div>
        )}
      </div>

      <div className="hd-form-footer hd-form-footer--sticky">
        <button className="pg-btn-cancel" onClick={onBack} disabled={saving}>Cancel</button>
        <button className="pg-btn-save" onClick={handleSave} disabled={saving}>
          {saveOk
            ? <><Check size={13} /> Saved!</>
            : saving
            ? <><Loader2 size={13} className="pg-spin" /> Saving…</>
            : <><GitMerge size={13} /> {isAdd ? 'Create Merge' : 'Update Merge'}</>}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function HoardingMergePage() {
  const [merges,    setMerges]    = useState([]);
  const [hoardings, setHoardings] = useState([]);
  const [sites,     setSites]     = useState([]);
  const [contracts, setContracts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [loading,   setLoading]   = useState(true);
  const [loadErrs,  setLoadErrs]  = useState([]);

  const [view,      setView]      = useState('grid');
  const [formMode,  setFormMode]  = useState(null);
  const [editGroup, setEditGroup] = useState(null);

  const [search,    setSearch]    = useState('');
  const [delTarget, setDelTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);

  /* Table state */
  const [sortKey,  setSortKey]  = useState('customerContractID');
  const [sortDir,  setSortDir]  = useState('asc');
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    setLoading(true); setLoadErrs([]);
    const warnings = [];

    const safe = async (label, fn) => {
      try {
        const raw = await fn();
        return normalizeList(raw);
      } catch (err) {
        warnings.push(`${label}: ${err?.response?.data?.message || err?.message || 'fetch failed'}`);
        return [];
      }
    };

    const [rawMerges, rawHoardings, rawSites, rawContracts, rawCustomers] = await Promise.all([
      safe('Merges',    () => apiService.getAllHoardingMerges()),
      safe('Hoardings', () => apiService.getAllHoardings()),
      safe('Sites',     () => apiService.getAllSites()),
      safe('Contracts', () => apiService.getAllCustomerContracts()),
      safe('Customers', () => apiService.getAllCustomers()),
    ]);

    const hMap = {};
    rawHoardings.forEach(rec => {
      const code = rec.hoardingCode;
      if (!hMap[code]) hMap[code] = { hoardingCode: code, versions: [] };
      hMap[code].versions.push({
        hoardingID: rec.hoardingID,
        effdt:      rec.effdt?.split('T')[0] || '',
        material:   rec.material  || '',
        status:     rec.status    || '',
        width:      rec.width     || '',
        height:     rec.height    || '',
        siteID:     rec.siteID    || '',
      });
    });

    setHoardings(Object.values(hMap));
    setSites(rawSites);
    setContracts(rawContracts);
    setCustomers(rawCustomers);
    setMerges(rawMerges);
    setLoadErrs(warnings);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Group merges ── */
  const groups = React.useMemo(() => {
    const map = {};
    merges.forEach(m => {
      const key = m.customerContractID;
      if (!map[key]) {
        map[key] = {
          customerContractID: key,
          mergeAlongFlag:     m.mergeAlongFlag,
          mergeIDs:           [],
          hoardingIDs:        [],
        };
      }
      map[key].mergeIDs.push(m.hoardingMergeID);
      if (!map[key].hoardingIDs.includes(m.hoardingID)) {
        map[key].hoardingIDs.push(m.hoardingID);
      }
    });

    return Object.values(map).map(g => {
      const contract     = contracts.find(c => c.customerContractID === g.customerContractID);
      const customer     = contract ? customers.find(c => c.customerID === contract.customerID) : null;
      g.customerName     = customer?.customerName || (contract?.customerID ? `Customer #${contract.customerID}` : '—');
      g.contractStatus   = contract?.status || '';
      g.count            = g.mergeIDs.length;
      return g;
    });
  }, [merges, contracts, customers]);

  /* ── Filter ── */
  const filtered = groups.filter(g => {
    const q = search.toLowerCase();
    if (!q) return true;
    const hCodes = g.hoardingIDs.map(id => {
      const h = hoardings.find(h2 => h2.versions?.some(v => v.hoardingID === id));
      return h?.hoardingCode || '';
    });
    return (
      String(g.customerContractID).includes(q) ||
      g.customerName.toLowerCase().includes(q)  ||
      hCodes.some(c => c.toLowerCase().includes(q))
    );
  });

  /* ── Sort ── */
  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const sortedFiltered = [...filtered].sort((a, b) => {
    const av = String(a[sortKey] ?? '').toLowerCase();
    const bv = String(b[sortKey] ?? '').toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / pageSize));
  const paginated  = sortedFiltered.slice((page - 1) * pageSize, page * pageSize);

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  /* ── Delete ── */
  const confirmDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      for (const id of delTarget.mergeIDs) {
        await apiService.deleteHoardingMerge(id);
      }
      setDelTarget(null);
      fetchAll();
    } catch (err) {
      setLoadErrs([err?.response?.data?.message || err?.message || 'Delete failed.']);
      setDelTarget(null);
    } finally { setDeleting(false); }
  };

  const getHoardingCodes = (g) =>
    g.hoardingIDs.map(id => {
      const h = hoardings.find(h2 => h2.versions?.some(v => v.hoardingID === id));
      return h?.hoardingCode || `#${id}`;
    });

  const getMergedLabel = (g) => {
    const isWidth = g.mergeAlongFlag === 'W';
    const blocks = g.hoardingIDs.map(id => {
      const h = hoardings.find(h2 => h2.versions?.some(v => v.hoardingID === id));
      return getLatest(h);
    }).filter(Boolean);
    if (!blocks.length) return null;
    if (isWidth) {
      const tw = blocks.reduce((s, b) => s + (Number(b?.width) || 0), 0);
      return tw ? `${tw}×${blocks[0]?.height || '?'}ft` : null;
    } else {
      const th = blocks.reduce((s, b) => s + (Number(b?.height) || 0), 0);
      return th ? `${blocks[0]?.width || '?'}×${th}ft` : null;
    }
  };

  const widthCount  = groups.filter(g => g.mergeAlongFlag === 'W').length;
  const heightCount = groups.filter(g => g.mergeAlongFlag === 'H').length;

  /* ── Table columns ── */
  const COLS = [
    { key: 'customerContractID', label: 'Contract' },
    { key: 'customerName',       label: 'Customer' },
    { key: 'mergeAlongFlag',     label: 'Direction' },
    { key: '_hoardings',         label: 'Hoardings',   noSort: true },
    { key: 'contractStatus',     label: 'Status' },
    { key: '_size',              label: 'Merged Size',  noSort: true },
    { key: 'count',              label: 'Records',      noSort: true },
    { key: '_action',            label: 'Action',       noSort: true },
  ];

  if (view === 'form') {
    return (
      <MergeForm
        mode={formMode}
        group={editGroup}
        hoardings={hoardings}
        sites={sites}
        contracts={contracts}
        customers={customers}
        onBack={() => { setView('grid'); setEditGroup(null); fetchAll(); }}
      />
    );
  }

  return (
    <div className="pg-page">
      {delTarget && (
        <DeleteModal
          group={delTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDelTarget(null)}
          deleting={deleting}
        />
      )}

      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-header__title">Hoarding Merges</h1>
          <p className="pg-header__subtitle">
            Combine multiple hoardings into one large display unit
            {groups.length > 0 && <> · <strong>{groups.length}</strong> group{groups.length !== 1 ? 's' : ''}</>}
          </p>
        </div>
        <button className="pg-btn-add"
          onClick={() => { setFormMode('add'); setEditGroup(null); setView('form'); }}
          disabled={loading}>
          <Plus size={14} /> Create Merge
        </button>
      </div>

      {/* Warnings */}
      {loadErrs.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {loadErrs.map((e, i) => (
            <div key={i} className="pg-field-error hd-api-error" style={{ marginBottom: 6 }}>
              <AlertCircle size={13} />
              <span><strong>Warning:</strong> {e}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {!loading && groups.length > 0 && (
        <div className="hm-stats">
          {[
            { icon: <GitMerge size={18} color="#049edf" />,       bg: 'rgba(4,158,223,0.1)',  label: 'Total Groups',     val: groups.length },
            { icon: <ArrowLeftRight size={18} color="#049edf" />, bg: 'rgba(4,158,223,0.1)',  label: 'Width Merges',     val: widthCount },
            { icon: <ArrowUpDown size={18} color="#6c63ff" />,    bg: 'rgba(108,99,255,0.1)', label: 'Height Merges',    val: heightCount },
            { icon: <Building2 size={18} color="#16a34a" />,      bg: 'rgba(22,163,74,0.1)',  label: 'Hoardings Merged', val: merges.length },
          ].map(s => (
            <div key={s.label} className="hm-stat">
              <div className="hm-stat__icon" style={{ background: s.bg }}>{s.icon}</div>
              <div>
                <div className="hm-stat__label">{s.label}</div>
                <div className="hm-stat__val">{s.val}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pg-container">
        {/* Toolbar */}
        <div className="pg-toolbar">
          <div className="pg-toolbar__inner">
            <div className="pg-toolbar__count">
              <GitMerge size={14} color="#9090a8" />
              <span><strong>{loading ? '…' : filtered.length}</strong> group{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="pg-search-box">
              <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input
                placeholder="Search by contract, customer or hoarding…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
            </div>
            <button className="pg-pg-btn" onClick={fetchAll} title="Refresh"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={13} className={loading ? 'pg-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#9090a8' }}>
            <Loader2 size={28} className="pg-spin" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13 }}>Loading merge data…</div>
          </div>
        )}

        {/* Empty — no data at all */}
        {!loading && groups.length === 0 && (
          <div className="hm-empty">
            <div className="hm-empty__icon"><GitMerge size={28} color="#c0c0d8" /></div>
            <div className="hm-empty__title">No hoarding merges yet</div>
            <div className="hm-empty__sub">
              Click <strong>Create Merge</strong> to combine two or more hoardings into a single large display.
            </div>
          </div>
        )}

        {/* Table */}
        {!loading && groups.length > 0 && (
          filtered.length === 0 ? (
            <div className="hm-empty">
              <div className="hm-empty__icon"><Search size={24} color="#c0c0d8" /></div>
              <div className="hm-empty__title">No results</div>
              <div className="hm-empty__sub">Try a different search term.</div>
            </div>
          ) : (
            <>
              <div className="pg-desktop-table">
                <table className="pg-table">
                  <thead>
                    <tr>
                      {COLS.map(col => (
                        <th
                          key={col.key}
                          className={['pg-th', !col.noSort && 'pg-th--sort'].filter(Boolean).join(' ')}
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
                    {paginated.map(g => {
                      const isWidth    = g.mergeAlongFlag === 'W';
                      const codes      = getHoardingCodes(g);
                      const mergedLabel = getMergedLabel(g);

                      return (
                        <tr key={g.customerContractID} className="pg-tr">

                          {/* Contract */}
                          <td className="pg-td">
                            <div className="pg-td__primary" style={{ fontWeight: 700 }}>
                              #{g.customerContractID}
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="pg-td pg-td--overflow">
                            <span className="pg-td__ellipsis" title={g.customerName}>
                              {g.customerName}
                            </span>
                          </td>

                          {/* Direction */}
                          <td className="pg-td">
                            <div className={`hm-dir-badge${isWidth ? ' hm-dir-badge--width' : ' hm-dir-badge--height'}`}>
                              {isWidth ? <ArrowLeftRight size={10} /> : <ArrowUpDown size={10} />}
                              {isWidth ? 'Width' : 'Height'}
                            </div>
                          </td>

                          {/* Hoardings */}
                          <td className="pg-td">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {codes.map((code, i) => (
                                <span key={i} className={`hm-hoarding-tag${isWidth ? ' hm-hoarding-tag--width' : ' hm-hoarding-tag--height'}`}>
                                  <Building2 size={10} color={isWidth ? '#049edf' : '#6c63ff'} />
                                  {code}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="pg-td">
                            {g.contractStatus ? (
                              <span className="hm-info-chip" style={{
                                color:      g.contractStatus === 'Active' ? '#16a34a' : '#9090a8',
                                background: g.contractStatus === 'Active' ? 'rgba(22,163,74,0.08)' : '#f5f6ff',
                              }}>
                                {g.contractStatus}
                              </span>
                            ) : '—'}
                          </td>

                          {/* Merged Size */}
                          <td className="pg-td">
                            {mergedLabel ? (
                              <span className="hm-info-chip" style={{
                                color:      isWidth ? '#049edf' : '#6c63ff',
                                background: isWidth ? 'rgba(4,158,223,0.06)' : 'rgba(108,99,255,0.06)',
                                borderColor: isWidth ? 'rgba(4,158,223,0.2)' : 'rgba(108,99,255,0.2)',
                              }}>
                                <Maximize2 size={10} /> {mergedLabel}
                              </span>
                            ) : '—'}
                          </td>

                          {/* Records */}
                          <td className="pg-td">
                            <span className="pg-td__primary">{g.count}</span>
                          </td>

                          {/* Actions */}
                          <td className="pg-td">
                            <div className="pg-action-wrap">
                              <button
                                className="hm-btn-edit"
                                title="Edit"
                                onClick={() => { setFormMode('edit'); setEditGroup(g); setView('form'); }}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                className="hm-btn-del"
                                title="Delete"
                                onClick={() => setDelTarget(g)}
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
              </div>

              {/* Mobile cards */}
              <div className="pg-mobile-cards">
                {paginated.map(g => {
                  const isWidth     = g.mergeAlongFlag === 'W';
                  const codes       = getHoardingCodes(g);
                  const mergedLabel = getMergedLabel(g);
                  return (
                    <div key={g.customerContractID} className="pg-card">
                      <div className="pg-card__header">
                        <div className="pg-card__title-wrap">
                          <div className="pg-card__title" style={{ fontWeight: 700 }}>
                            Contract #{g.customerContractID}
                          </div>
                          <div className="pg-card__subtitle">{g.customerName}</div>
                        </div>
                        <div className="pg-card__actions" style={{ display: 'flex', gap: 6 }}>
                          <button className="hm-btn-edit" title="Edit"
                            onClick={() => { setFormMode('edit'); setEditGroup(g); setView('form'); }}>
                            <Edit2 size={13} />
                          </button>
                          <button className="hm-btn-del" title="Delete"
                            onClick={() => setDelTarget(g)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="pg-card__body">
                        <div className="pg-card__row">
                          <div className={`hm-dir-badge${isWidth ? ' hm-dir-badge--width' : ' hm-dir-badge--height'}`}>
                            {isWidth ? <ArrowLeftRight size={10} /> : <ArrowUpDown size={10} />}
                            {isWidth ? 'Width Merge' : 'Height Merge'}
                          </div>
                        </div>
                        <div className="pg-card__row" style={{ flexWrap: 'wrap', gap: 4 }}>
                          {codes.map((code, i) => (
                            <span key={i} className={`hm-hoarding-tag${isWidth ? ' hm-hoarding-tag--width' : ' hm-hoarding-tag--height'}`}>
                              <Building2 size={10} color={isWidth ? '#049edf' : '#6c63ff'} />{code}
                            </span>
                          ))}
                        </div>
                        <div className="pg-card__row">
                          <MergeVisual hoardingIDs={g.hoardingIDs} direction={g.mergeAlongFlag} hoardings={hoardings} compact />
                        </div>
                        {mergedLabel && (
                          <div className="pg-card__row">
                            <span className="hm-info-chip" style={{ color: isWidth ? '#049edf' : '#6c63ff', background: isWidth ? 'rgba(4,158,223,0.06)' : 'rgba(108,99,255,0.06)' }}>
                              <Maximize2 size={10} /> {mergedLabel}
                            </span>
                          </div>
                        )}
                        {g.contractStatus && (
                          <div className="pg-card__row">
                            <span className="hm-info-chip" style={{ color: g.contractStatus === 'Active' ? '#16a34a' : '#9090a8', background: g.contractStatus === 'Active' ? 'rgba(22,163,74,0.08)' : '#f5f6ff' }}>
                              {g.contractStatus}
                            </span>
                          </div>
                        )}
                        <div className="pg-card__row">
                          <LayoutTemplate size={11} color="#c0c0d8" />
                          <span style={{ fontSize: 11, color: '#9090a8' }}>{g.count} record{g.count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
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
                  <span className="pg-pagination__text">{page} of {totalPages} pages ({sortedFiltered.length} items)</span>
                </div>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}