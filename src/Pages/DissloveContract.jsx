import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Search, X, Loader2, AlertCircle, Check,
  FileText, AlertTriangle, RefreshCw,
  ChevronRight, Users, Calendar, IndianRupee,
  ShieldCheck, Building2, ArrowLeft, Clock,
} from 'lucide-react';
import { apiService } from '../api/api';
import './Common1.css';

/* ─── Helpers ─── */
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function fmtCurrency(v) {
  if (v === '' || v == null || isNaN(Number(v))) return '—';
  return '₹' + Number(v).toLocaleString('en-IN');
}
function todayStr() { return new Date().toISOString().split('T')[0]; }
function addDays(dateStr, n) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function normalizeContract(raw) {
  return {
    customerContractID: raw.customerContractID ?? raw.CustomerContractID,
    customerID: raw.customerID ?? raw.CustomerID,
    startDate: (raw.startDate ?? raw.StartDate ?? '').split('T')[0],
    endDate: (raw.endDate ?? raw.EndDate ?? '').split('T')[0],
    contractOrigValue: raw.contractOrigValue ?? raw.ContractOrigValue ?? '',
    contractFinalValue: raw.contractFinalValue ?? raw.ContractFinalValue ?? '',
    amountPerFreq: raw.amountPerFreq ?? raw.AmountPerFreq ?? '',
    advancePaid: raw.advancePaid ?? raw.AdvancePaid ?? '',
    paymentFreqID: raw.paymentFreqID ?? raw.PaymentFreqID ?? '',
    status: raw.status ?? raw.Status ?? '',
    comments: raw.comments ?? raw.Comments ?? '',
  };
}
const STATUS_COLORS = {
  Active: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  Expired: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  Terminated: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  Pending: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
};
function statusStyle(s) { return STATUS_COLORS[s] || { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' }; }

/* ─── Status Badge ─── */
function StatusBadge({ status }) {
  const s = statusStyle(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontSize: 11, fontWeight: 800, fontFamily: 'Nunito,sans-serif', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {status || '—'}
    </span>
  );
}

/* ─── Toast ─── */
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  return ReactDOM.createPortal(
    <div className={`qt-toast qt-toast--${type}`} style={{ zIndex: 99999 }}>
      {type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
      {msg}
    </div>,
    document.body
  );
}

/* ─── Portal Dropdown ─── */
/* Measures the trigger element and renders dropdown via portal
   so it's never clipped by overflow:hidden parents            */
function PortalDropdown({ anchorRef, open, children }) {
  const [style, setStyle] = useState({});
  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      zIndex: 99990,
    });
  }, [open, anchorRef]);

  if (!open) return null;
  return ReactDOM.createPortal(
    <div style={style}>{children}</div>,
    document.body
  );
}

/* ─── Dissolve Modal ─── */
function DissolveModal({ contract, customerName, hoardingCount, onConfirm, onCancel, dissolving }) {
  const [endDate, setEndDate] = useState(contract.endDate || todayStr());

  // The new hoarding effdt row will be effective from the day AFTER dissolution
  const availableFrom = addDays(endDate, 1);

  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target === e.currentTarget && !dissolving && onCancel()}>
      <div className="pg-modal" style={{ maxWidth: 500 }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#049edf,#6c63ff)',
          padding: '26px 28px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 58, height: 58, borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={26} color="#fff" />
          </div>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 19, color: '#fff' }}>
            Dissolve Contract
          </div>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, color: 'rgba(255,255,255,0.82)', fontWeight: 600, textAlign: 'center' }}>
            Contract #{contract.customerContractID} · {customerName}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 26px 24px' }}>

          {/* Contract info */}
          <div style={{
            background: '#fafafe', border: '1.5px solid #e8e8f4',
            borderLeft: '4px solid #049edf',
            borderRadius: '0 12px 12px 0', overflow: 'hidden', marginBottom: 18,
          }}>
            {[
              { label: 'Contract', value: `#${contract.customerContractID}` },
              { label: 'Customer', value: customerName },
              { label: 'Period', value: `${fmtDate(contract.startDate)} → ${fmtDate(contract.endDate)}` },
              { label: 'Final Value', value: fmtCurrency(contract.contractFinalValue || contract.contractOrigValue) },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 16px',
                borderBottom: i < arr.length - 1 ? '1px solid #f0f0f8' : 'none',
              }}>
                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11.5, color: '#9090a8', fontWeight: 700 }}>{row.label}</span>
                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, color: '#1a1a2e', fontWeight: 800 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Dissolution date picker */}
          <div style={{ marginBottom: 18 }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
              fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#5a5a78',
            }}>
              <Calendar size={13} color="#049edf" />
              Dissolution / End Date <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid rgba(4,158,223,0.30)',
              background: 'rgba(4,158,223,0.03)',
            }}>
              <Calendar size={14} color="#049edf" style={{ flexShrink: 0 }} />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 700,
                  color: '#1a1a2e', cursor: 'pointer',
                }}
              />
            </div>
          </div>

          {/* What will happen box — explains NEW ROW insertion */}
          {hoardingCount > 0 && endDate && (
            <div style={{
              padding: '13px 15px', borderRadius: 11, marginBottom: 20,
              background: '#f0fdf4', border: '1.5px solid #bbf7d0',
            }}>
              <div style={{
                fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 900,
                color: '#15803d', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Building2 size={13} color="#16a34a" />
                {hoardingCount} Hoarding{hoardingCount !== 1 ? 's' : ''} — New Row Will Be Added
              </div>

              {/* Visual: old row → new row */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Existing row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 8,
                  background: '#fff', border: '1px solid #e8e8f4',
                  fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, color: '#7878a0',
                }}>
                  <span style={{
                    padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 800,
                    background: '#f0f0f8', color: '#9090a8', flexShrink: 0,
                  }}>EXISTING</span>
                  <span>effdt = contract start date</span>
                  <span style={{ marginLeft: 'auto' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800,
                      background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                    }}>Occupied</span>
                  </span>
                </div>

                {/* Arrow */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  paddingLeft: 10, fontFamily: 'Nunito,sans-serif',
                  fontSize: 10.5, color: '#9090a8', fontWeight: 700,
                }}>
                  ↓ New row INSERT on dissolve
                </div>

                {/* New row being inserted */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 8,
                  background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                  fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, color: '#15803d',
                }}>
                  <span style={{
                    padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 800,
                    background: '#dcfce7', color: '#16a34a', flexShrink: 0,
                  }}>NEW ROW</span>
                  <span>effdt = <strong>{fmtDate(availableFrom)}</strong></span>
                  <span style={{ marginLeft: 'auto' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800,
                      background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                    }}>Available</span>
                  </span>
                </div>
              </div>

              <div style={{
                marginTop: 9, fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#4ade80',
                fontWeight: 600, color: '#15803d',
              }}>
                💡 Effective from <strong>{fmtDate(availableFrom)}</strong> (day after dissolution)
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="pg-btn-cancel"
              onClick={onCancel}
              disabled={dissolving}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(endDate, availableFrom)}
              disabled={dissolving || !endDate}
              style={{
                flex: 1.6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px 0', borderRadius: 11, border: 'none',
                background: (dissolving || !endDate) ? '#e8e8f4' : 'linear-gradient(135deg,#049edf,#6c63ff)',
                color: (dissolving || !endDate) ? '#b0b0c8' : '#fff',
                fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 800,
                cursor: (dissolving || !endDate) ? 'not-allowed' : 'pointer',
                boxShadow: (dissolving || !endDate) ? 'none' : '0 4px 16px rgba(4,158,223,0.35)',
              }}
            >
              {dissolving
                ? <><Loader2 size={14} className="pg-spin" /> Dissolving…</>
                : <><Check size={14} /> Confirm Dissolve</>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════ */
export default function DissolveContractPage() {
  const [view, setView] = useState('grid'); // 'grid' | 'dissolve'

  const [customers, setCustomers] = useState([]);
  const [allContracts, setAllContracts] = useState([]);
  const [allHoardings, setAllHoardings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [gridSearch, setGridSearch] = useState('');

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [hoardingCount, setHoardingCount] = useState(0);
  const [dissolving, setDissolving] = useState(false);
  const [toast, setToast] = useState(null);

  /* The anchor ref for the portal dropdown — wraps the whole search input box */
  const searchBoxRef = useRef(null);

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [rawC, rawCon, rawH] = await Promise.all([
        apiService.getAllCustomers(),
        apiService.getAllCustomerContracts(),
        apiService.getAllHoardings().catch(() => []),
      ]);
      setCustomers(Array.isArray(rawC) ? rawC : rawC?.data ?? []);
      const list = Array.isArray(rawCon) ? rawCon : rawCon?.data ?? [];
      setAllContracts(list.map(normalizeContract));
      setAllHoardings(Array.isArray(rawH) ? rawH : rawH?.data ?? []);
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Failed to load data.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* Close dropdown on outside click */
  useEffect(() => {
    const h = e => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* Hoarding count when modal opens */
  useEffect(() => {
    if (!confirmTarget) return;
    setHoardingCount(0);
    apiService.getCustomerContractHoardingMaps(confirmTarget.customerContractID)
      .then(maps => {
        const list = Array.isArray(maps) ? maps : maps?.data ?? [];
        setHoardingCount(list.filter(m =>
          Number(m.customerContractID ?? m.CustomerContractID) === Number(confirmTarget.customerContractID)
        ).length);
      }).catch(() => setHoardingCount(0));
  }, [confirmTarget]);

  const customerMap = useMemo(() =>
    Object.fromEntries(customers.map(c => [c.customerID, c])),
    [customers]);

  const searchResults = useMemo(() =>
    query.trim()
      ? customers.filter(c =>
        (c.customerName || '').toLowerCase().includes(query.toLowerCase()) ||
        (c.phone1 || '').toLowerCase().includes(query.toLowerCase()) ||
        String(c.customerID).includes(query)
      ).slice(0, 8)
      : [],
    [customers, query]);

  const dissolvedContracts = useMemo(() =>
    allContracts
      .filter(c => c.status === 'Terminated' || c.status === 'Expired')
      .sort((a, b) => (b.endDate || '').localeCompare(a.endDate || '')),
    [allContracts]);

  const filteredGrid = useMemo(() => {
    if (!gridSearch.trim()) return dissolvedContracts;
    const q = gridSearch.toLowerCase();
    return dissolvedContracts.filter(c => {
      const cust = customerMap[c.customerID];
      return (
        String(c.customerContractID).includes(q) ||
        (cust?.customerName || '').toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q)
      );
    });
  }, [dissolvedContracts, gridSearch, customerMap]);

  const activeContracts = useMemo(() =>
    selectedCustomer
      ? allContracts.filter(c =>
        Number(c.customerID) === Number(selectedCustomer.customerID) &&
        (c.status === 'Active' || c.status === 'Pending')
      )
      : [],
    [allContracts, selectedCustomer]);

  /* ── Dissolve action ── */
  const handleDissolve = async (endDate, availableFrom) => {
    if (!confirmTarget) return;
    setDissolving(true);
    try {

      /* STEP 1 — Update contract */
      await apiService.updateCustomerContract({
        ...confirmTarget,
        endDate,
        status: 'Terminated',
      });

      /* STEP 2 — Get hoardings in this contract */
      const rawMaps = await apiService
        .getCustomerContractHoardingMaps(confirmTarget.customerContractID)
        .catch(() => []);

      const maps = (Array.isArray(rawMaps) ? rawMaps : rawMaps?.data ?? [])
        .filter(m =>
          Number(m.customerContractID ?? m.CustomerContractID) ===
          Number(confirmTarget.customerContractID)
        );

      /* STEP 3 — Insert new effdt row for each hoarding */
      const results = await Promise.allSettled(
        maps.map(async (m) => {
          const hid = Number(m.hoardingID ?? m.HoardingID ?? 0);
          if (!hid) return;

          /* allHoardings is the flat raw array from getAllHoardings()
             field names may be camelCase or PascalCase depending on API */
          const h = allHoardings.find(hh =>
            Number(hh.hoardingID ?? hh.HoardingID) === hid
          );
          if (!h) {
            console.warn('[Dissolve] hoarding not found, hID:', hid);
            return;
          }

          /* Normalize fields — handles both camelCase and PascalCase */
          const hoardingCode = h.hoardingCode ?? h.HoardingCode ?? '';
          const material = h.material ?? h.Material ?? '';
          const hoardingType = h.hoardingType ?? h.HoardingType ?? 0;
          const monthlyRent = Number(h.monthlyRent ?? h.MonthlyRent ?? 0);
          const width = Number(h.width ?? h.Width ?? 0);
          const height = Number(h.height ?? h.Height ?? 0);
          const siteID = Number(h.siteID ?? h.SiteID ?? 0);

          if (!hoardingCode) {
            console.warn('[Dissolve] missing hoardingCode for hID:', hid, h);
            return;
          }

          /* Build payload — must match HoardingPage "New Effective Date" */
          const payload = {
            effdt: availableFrom,   // "YYYY-MM-DD"
            material,
            hoardingType: Number(hoardingType), // ensure it's a number
            status: 'Available',
            monthlyRent,
            width,
            height,
            siteID,
          };

          /*
          console.log('[Dissolve] addHoardingEffdt →', hoardingCode, payload);
          return apiService.addHoardingEffdt(hoardingCode, payload);
          */

          const newPayload = {
            hoardingID: Number(hid),
            effdt: availableFrom,
            hoardingCode,
            material,
            hoardingType: Number(hoardingType),
            status: 'Available',
            monthlyRent: Number(monthlyRent),
            width: Number(width),
            height: Number(height),
            siteID: Number(siteID),
          };

          console.log('[Dissolve] saveHoardingLinkWithPhotos →', hid, newPayload);
          return apiService.saveHoardingLinkWithPhotos(newPayload);
        })
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== undefined).length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      results
        .filter(r => r.status === 'rejected')
        .forEach(r => console.error('[Dissolve] failed:', r.reason?.response?.data || r.reason?.message));

      /* STEP 4 — Update local state */
      setAllContracts(prev =>
        prev.map(c =>
          c.customerContractID === confirmTarget.customerContractID
            ? { ...c, status: 'Terminated', endDate }
            : c
        )
      );

      showToast(
        `Contract #${confirmTarget.customerContractID} dissolved. ` +
        `${successCount} hoarding row${successCount !== 1 ? 's' : ''} inserted (Available from ${fmtDate(availableFrom)}).` +
        (failCount > 0 ? ` ⚠ ${failCount} failed — check console.` : ''),
        failCount > 0 ? 'error' : 'success'
      );
      setConfirmTarget(null);

    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to dissolve.', 'error');
    } finally {
      setDissolving(false);
    }
  };

  /* ════ Loading ════ */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 14 }}>
      <Loader2 size={32} color="#049edf" className="pg-spin" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>Loading…</span>
    </div>
  );

  /* ════════════════════════════════════════
     DISSOLVE INNER VIEW
  ════════════════════════════════════════ */
  if (view === 'dissolve') return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {confirmTarget && (
        <DissolveModal
          contract={confirmTarget}
          customerName={selectedCustomer?.customerName || '—'}
          hoardingCount={hoardingCount}
          onConfirm={handleDissolve}
          onCancel={() => !dissolving && setConfirmTarget(null)}
          dissolving={dissolving}
        />
      )}

      <div className="hd-form-page">
        {/* Topbar */}
        <div className="hd-topbar">
          <div className="hd-topbar-left">
            <button className="hd-back-btn"
              onClick={() => { setView('grid'); setSelectedCustomer(null); setQuery(''); }}>
              <ArrowLeft size={14} /> Back to Dissolved Contracts
            </button>
            <div className="hd-topbar-divider" />
            <div>
              <div className="hd-topbar-title">Dissolve a Contract</div>
              <div className="hd-topbar-sub">Search customer → dissolve their active contracts</div>
            </div>
          </div>
        </div>

        <div className="hd-form-body" style={{ paddingTop: 24 }}>

          {/* ── Customer Search Card ── */}
          <div className="hd-section-card" style={{ marginBottom: 20 }}>
            <div className="hd-section-head">
              <div className="hd-section-icon-wrap"><Users size={14} color="#049edf" /></div>
              <div>
                <div className="hd-section-title">Select Customer</div>
                <div className="hd-section-sub">Search by name, phone or ID</div>
              </div>
            </div>
            <div className="hd-section-body" style={{ overflow: 'visible' }}>

              {/* Anchor for portal dropdown */}
              <div ref={searchBoxRef} style={{ maxWidth: 560 }}>

                {/* Search input row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 16px', borderRadius: 12,
                  border: `1.5px solid ${selectedCustomer ? 'rgba(4,158,223,0.30)' : '#e8e8f4'}`,
                  background: selectedCustomer ? 'rgba(4,158,223,0.03)' : '#fff',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                  cursor: selectedCustomer ? 'default' : 'text',
                }}>
                  <Search size={15} color="#c0c0d8" style={{ flexShrink: 0 }} />

                  {selectedCustomer ? (
                    /* ── Selected state ── */
                    <>
                      <div style={{
                        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                        background: 'linear-gradient(135deg,rgba(4,158,223,0.15),rgba(108,99,255,0.12))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 900, color: '#049edf',
                      }}>
                        {selectedCustomer.customerName?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 14, color: '#1a1a2e' }}>
                          {selectedCustomer.customerName}
                        </div>
                        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11.5, color: '#9090a8', fontWeight: 600, marginTop: 1 }}>
                          ID: {selectedCustomer.customerID}{selectedCustomer.phone1 ? ` · ${selectedCustomer.phone1}` : ''}
                        </div>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                        background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                        fontFamily: 'Nunito,sans-serif', flexShrink: 0,
                      }}>
                        {activeContracts.length} active
                      </span>
                      <button
                        onClick={() => { setSelectedCustomer(null); setQuery(''); }}
                        style={{
                          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                          background: '#f4f4fb', border: '1px solid #e8e8f4',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: '#9090a8',
                        }}
                      >
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    /* ── Search input state ── */
                    <>
                      <input
                        style={{
                          flex: 1, border: 'none', outline: 'none',
                          fontFamily: 'Nunito,sans-serif', fontSize: 13.5,
                          fontWeight: 600, color: '#1a1a2e', background: 'transparent',
                        }}
                        placeholder="Search customer by name, phone or ID…"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setDropdownOpen(true); }}
                        onFocus={() => query && setDropdownOpen(true)}
                      />
                      {query && (
                        <X size={14} color="#c0c0d8" style={{ cursor: 'pointer', flexShrink: 0 }}
                          onClick={() => { setQuery(''); setDropdownOpen(false); }} />
                      )}
                    </>
                  )}
                </div>

                {/* ── Portal dropdown — never clipped ── */}
                <PortalDropdown anchorRef={searchBoxRef} open={dropdownOpen && !selectedCustomer}>
                  {searchResults.length > 0 ? (
                    <div style={{
                      background: '#fff', borderRadius: 14,
                      boxShadow: '0 16px 48px rgba(100,100,180,0.18)',
                      border: '1.5px solid #e8e8f4',
                      overflow: 'hidden', maxHeight: 300, overflowY: 'auto',
                    }}>
                      {searchResults.map((c, idx) => (
                        <div
                          key={c.customerID}
                          onMouseDown={e => {
                            e.preventDefault();
                            setSelectedCustomer(c);
                            setQuery('');
                            setDropdownOpen(false);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '11px 16px', cursor: 'pointer',
                            borderBottom: idx < searchResults.length - 1 ? '1px solid #f0f0f8' : 'none',
                            background: '#fff', transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f4f8ff'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            background: 'linear-gradient(135deg,rgba(4,158,223,0.12),rgba(108,99,255,0.09))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Nunito,sans-serif', fontSize: 14, fontWeight: 900, color: '#049edf',
                          }}>
                            {c.customerName?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 13.5, color: '#1a1a2e' }}>
                              {c.customerName}
                            </div>
                            <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11.5, color: '#9090a8', fontWeight: 600, marginTop: 2 }}>
                              ID: {c.customerID}{c.phone1 ? ` · ${c.phone1}` : ''}{c.city ? ` · ${c.city}` : ''}
                            </div>
                          </div>
                          <ChevronRight size={14} color="#c0c0d8" />
                        </div>
                      ))}
                    </div>
                  ) : query.trim() ? (
                    <div style={{
                      background: '#fff', borderRadius: 14, padding: '24px 20px',
                      boxShadow: '0 16px 48px rgba(100,100,180,0.15)',
                      border: '1.5px solid #e8e8f4', textAlign: 'center',
                      fontFamily: 'Nunito,sans-serif', fontSize: 13, color: '#9090a8', fontWeight: 600,
                    }}>
                      <Users size={24} color="#d0d0e8" style={{ marginBottom: 6 }} /><br />
                      No customers found for "<strong>{query}</strong>"
                    </div>
                  ) : null}
                </PortalDropdown>
              </div>
            </div>
          </div>

          {/* ── No customer selected ── */}
          {!selectedCustomer && (
            <div className="pg-container">
              <div className="pg-empty__inner" style={{ padding: '60px 20px' }}>
                <Users size={40} color="#d0d0e8" />
                <span className="pg-empty__label">Search a customer above</span>
                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, color: '#b0b0c8', fontWeight: 600 }}>
                  Active contracts will appear here for you to dissolve.
                </span>
              </div>
            </div>
          )}

          {/* ── Active contracts list ── */}
          {selectedCustomer && (
            <div className="hd-section-card">
              <div className="hd-section-head">
                <div className="hd-section-icon-wrap"><FileText size={14} color="#049edf" /></div>
                <div>
                  <div className="hd-section-title">
                    Active Contracts
                    {activeContracts.length > 0 && (
                      <span style={{
                        marginLeft: 8, padding: '1px 9px', borderRadius: 20, fontSize: 11,
                        fontWeight: 800, background: 'rgba(4,158,223,0.09)',
                        color: '#049edf', border: '1px solid rgba(4,158,223,0.22)',
                      }}>{activeContracts.length}</span>
                    )}
                  </div>
                  <div className="hd-section-sub">
                    Active &amp; pending contracts for {selectedCustomer.customerName}
                  </div>
                </div>
              </div>
              <div className="hd-section-body">

                {activeContracts.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '36px 0', color: '#9090a8' }}>
                    <Check size={32} color="#bbf7d0" style={{ marginBottom: 10 }} />
                    <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700 }}>No active contracts</div>
                    <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#b0b0c8', marginTop: 4 }}>
                      {selectedCustomer.customerName} has no contracts to dissolve.
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {activeContracts.map(contract => (
                    <div key={contract.customerContractID} style={{
                      border: '1.5px solid #e8e8f4', borderRadius: 14,
                      overflow: 'hidden', background: '#fff',
                    }}>
                      <div style={{ height: 4, background: 'linear-gradient(90deg,#049edf,#6c63ff)' }} />
                      <div style={{ padding: '18px 22px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                              background: 'rgba(4,158,223,0.08)', border: '1.5px solid rgba(4,158,223,0.20)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <FileText size={17} color="#049edf" />
                            </div>
                            <div>
                              <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 15.5, color: '#1a1a2e' }}>
                                Contract #{contract.customerContractID}
                              </div>
                              <div style={{ marginTop: 5 }}><StatusBadge status={contract.status} /></div>
                            </div>
                          </div>
                          {/* Dissolve button — red only for this destructive action */}
                          <button
                            onClick={() => setConfirmTarget(contract)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 7,
                              padding: '10px 20px', borderRadius: 11, border: 'none',
                              background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
                              color: '#fff', cursor: 'pointer', flexShrink: 0,
                              fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 800,
                              boxShadow: '0 3px 12px rgba(220,38,38,0.25)',
                              transition: 'all 0.18s', whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(220,38,38,0.38)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(220,38,38,0.25)'; }}
                          >
                            <AlertTriangle size={13} /> Dissolve
                          </button>
                        </div>

                        {/* Details grid */}
                        <div style={{
                          display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))',
                          background: '#f8f8fd', border: '1px solid #f0f0f8', borderRadius: 10, overflow: 'hidden',
                        }}>
                          {[
                            { icon: Calendar, label: 'Start Date', value: fmtDate(contract.startDate) },
                            { icon: Calendar, label: 'End Date', value: fmtDate(contract.endDate) },
                            { icon: IndianRupee, label: 'Final Value', value: fmtCurrency(contract.contractFinalValue || contract.contractOrigValue) },
                            { icon: IndianRupee, label: 'Per Freq.', value: fmtCurrency(contract.amountPerFreq) },
                            { icon: IndianRupee, label: 'Advance', value: fmtCurrency(contract.advancePaid) },
                            { icon: ShieldCheck, label: 'Orig. Value', value: fmtCurrency(contract.contractOrigValue) },
                          ].map(({ icon: Icon, label, value }, idx, arr) => (
                            <div key={label} style={{
                              padding: '11px 14px',
                              borderRight: (idx + 1) % 3 !== 0 && idx !== arr.length - 1 ? '1px solid #f0f0f8' : 'none',
                              borderBottom: idx < arr.length - 3 ? '1px solid #f0f0f8' : 'none',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Nunito,sans-serif', fontSize: 10.5, fontWeight: 700, color: '#b0b0c8', marginBottom: 4 }}>
                                <Icon size={10} color="#c0c0d8" /> {label}
                              </div>
                              <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800, color: '#1a1a2e' }}>{value}</div>
                            </div>
                          ))}
                        </div>

                        {contract.comments && (
                          <div style={{
                            marginTop: 12, padding: '9px 12px', borderRadius: 9,
                            background: '#f8f8fd', border: '1px solid #f0f0f8',
                            fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#7878a0', fontWeight: 600,
                            display: 'flex', gap: 6,
                          }}>
                            💬 <span>{contract.comments}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  /* ════════════════════════════════════════
     MAIN GRID VIEW
  ════════════════════════════════════════ */
  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <div className="pg-page">

        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">Dissolved Contracts</h1>
            <p className="pg-header__subtitle">
              History of all terminated and expired contracts
              {dissolvedContracts.length > 0 && <> — <strong>{dissolvedContracts.length}</strong> total</>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={fetchAll} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 10,
              border: '1.5px solid #e8e8f4', background: '#fff',
              fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700, color: '#5a5a78', cursor: 'pointer',
            }}>
              <RefreshCw size={13} color="#049edf" /> Refresh
            </button>
            <button onClick={() => setView('dissolve')} className="pg-btn-add">
              <AlertTriangle size={14} /> Dissolve Contract
            </button>
          </div>
        </div>

        {loadError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11,
            marginBottom: 16, color: '#dc2626', fontSize: 13, fontWeight: 600, fontFamily: 'Nunito,sans-serif',
          }}>
            <AlertCircle size={14} /> {loadError}
          </div>
        )}

        {/* Stats strip */}
        <div className="exp-stats-strip">
          {[
            { label: 'Total Dissolved', val: dissolvedContracts.length, icon: <FileText size={16} color="#049edf" />, bg: 'rgba(4,158,223,0.10)' },
            { label: 'Terminated', val: dissolvedContracts.filter(c => c.status === 'Terminated').length, icon: <AlertTriangle size={16} color="#6c63ff" />, bg: 'rgba(108,99,255,0.10)' },
            { label: 'Expired', val: dissolvedContracts.filter(c => c.status === 'Expired').length, icon: <Clock size={16} color="#d97706" />, bg: 'rgba(217,119,6,0.10)' },
          ].map(s => (
            <div key={s.label} className="exp-stat-item">
              <div className="exp-stat-item__icon" style={{ background: s.bg }}>{s.icon}</div>
              <div>
                <div className="exp-stat-item__label">{s.label}</div>
                <div className="exp-stat-item__val">{s.val}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="pg-container">
          <div className="pg-toolbar">
            <div className="pg-toolbar__inner">
              <div className="pg-toolbar__count">
                <FileText size={14} color="#9090a8" />
                <span><strong>{filteredGrid.length}</strong> record{filteredGrid.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="pg-search-box">
                <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
                <input placeholder="Search customer or status…" value={gridSearch} onChange={e => setGridSearch(e.target.value)} />
                {gridSearch && <X size={12} className="pg-search-clear" onClick={() => setGridSearch('')} />}
              </div>
            </div>
          </div>

          {filteredGrid.length === 0 && (
            <div className="pg-empty__inner" style={{ padding: '70px 20px' }}>
              <FileText size={44} color="#d0d0e8" />
              <span className="pg-empty__label">
                {gridSearch ? `No results for "${gridSearch}"` : 'No dissolved contracts yet'}
              </span>
              {!gridSearch && (
                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, color: '#b0b0c8', fontWeight: 600 }}>
                  Click <strong>Dissolve Contract</strong> above to get started.
                </span>
              )}
            </div>
          )}

          {filteredGrid.length > 0 && (
            <div className="pg-desktop-table">
              <table className="pg-table">
                <thead>
                  <tr>
                    {['#ID', 'Customer', 'Period', 'Dissolution Date', 'Final Value', 'Status'].map(h => (
                      <th key={h} className="pg-th"><div className="pg-th__inner">{h}</div></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredGrid.map(contract => {
                    const cust = customerMap[contract.customerID];
                    return (
                      <tr key={contract.customerContractID} className="pg-tr">
                        <td className="pg-td"><span className="lc-id-badge">#{contract.customerContractID}</span></td>
                        <td className="pg-td">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                              background: 'linear-gradient(135deg,rgba(4,158,223,0.12),rgba(108,99,255,0.09))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 900, color: '#049edf',
                            }}>
                              {cust?.customerName?.charAt(0)?.toUpperCase() || 'C'}
                            </div>
                            <div>
                              <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 13, color: '#1a1a2e' }}>
                                {cust?.customerName || `Customer ${contract.customerID}`}
                              </div>
                              {cust?.phone1 && (
                                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600, marginTop: 1 }}>
                                  {cust.phone1}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="pg-td">
                          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#4a5568' }}>
                            {fmtDate(contract.startDate)}
                          </div>
                          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#b0b0c8', fontWeight: 600, marginTop: 2 }}>
                            → {fmtDate(contract.endDate)}
                          </div>
                        </td>
                        <td className="pg-td">
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 11px', borderRadius: 9,
                            background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.20)',
                          }}>
                            <Calendar size={11} color="#6c63ff" />
                            <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#6c63ff' }}>
                              {fmtDate(contract.endDate)}
                            </span>
                          </div>
                        </td>
                        <td className="pg-td">
                          <span className="lc-amount-val">{fmtCurrency(contract.contractFinalValue || contract.contractOrigValue)}</span>
                        </td>
                        <td className="pg-td"><StatusBadge status={contract.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile cards */}
          {filteredGrid.length > 0 && (
            <div className="pg-mobile-cards">
              {filteredGrid.map(contract => {
                const cust = customerMap[contract.customerID];
                return (
                  <div key={contract.customerContractID} className="pg-card">
                    <div className="pg-card__header">
                      <div>
                        <div className="pg-card__title">
                          <span className="lc-id-badge">#{contract.customerContractID}</span>
                          &nbsp;{cust?.customerName || `Customer ${contract.customerID}`}
                        </div>
                        <div style={{ marginTop: 5 }}><StatusBadge status={contract.status} /></div>
                      </div>
                    </div>
                    <div className="pg-card__body">
                      <div className="pg-card__row">
                        <Calendar size={12} color="#c0c0d8" className="pg-card__row-icon" />
                        <span className="pg-card__row-text">{fmtDate(contract.startDate)} → {fmtDate(contract.endDate)}</span>
                      </div>
                      <div className="pg-card__row">
                        <Calendar size={12} color="#6c63ff" className="pg-card__row-icon" />
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#6c63ff' }}>
                          Dissolved: {fmtDate(contract.endDate)}
                        </span>
                      </div>
                      <div className="pg-card__row">
                        <IndianRupee size={12} color="#c0c0d8" className="pg-card__row-icon" />
                        <span className="lc-amount-val">{fmtCurrency(contract.contractFinalValue || contract.contractOrigValue)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}