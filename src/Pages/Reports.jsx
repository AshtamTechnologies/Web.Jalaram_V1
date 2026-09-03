import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  BarChart2, Download, FileSpreadsheet, FileText,
  ChevronDown, AlertCircle, Loader2, TrendingUp, Receipt,
  Building2, Calendar, Search, X, Check,
} from 'lucide-react';
import { apiService, API_ROOT_URL } from '../api/api';

/* ─────────────────────────────────────────
   REPORTS REGISTRY
───────────────────────────────────────── */
const REPORTS = [
  {
    id: 'available-hoardings',
    title: 'Available Hoardings Report',
    description:
      'All hoardings currently available for booking — includes site details, dimensions, type, and rental information with default photos.',
    icon: TrendingUp,
    color: '#049edf',
    pdfOnly: true,
    customPDF: true,
  },
  {
    id: 'hoarding-expense-report',
    title: 'Total Expense Report',
    description:
      'Complete breakdown of all hoarding expenses — expense types, amounts, dates, and payment details across all sites.',
    icon: Receipt,
    color: '#7c3aed',
    excelOnly: true,
    exportExcel: () => apiService.exportReportExcel('HoardingExpenseReport'),
  },
];

/* ─────────────────────────────────────────
   OUTSIDE CLICK HOOK
───────────────────────────────────────── */
function useOutsideClick(ref, panelRef, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (
        (!ref.current || !ref.current.contains(e.target)) &&
        (!panelRef?.current || !panelRef.current.contains(e.target))
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, ref, panelRef, onClose]);
}

/* ─────────────────────────────────────────
   PORTAL DROPDOWN
───────────────────────────────────────── */
function PortalDropdown({ open, triggerRef, panelRef, children }) {
  const [style, setStyle] = useState({ position: 'fixed', top: 0, left: 0, width: 0, zIndex: 100002 });
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
        left: r.left,
        width: r.width,
        zIndex: 100002,
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
  return ReactDOM.createPortal(<div ref={panelRef} style={style}>{children}</div>, document.body);
}

/* ─────────────────────────────────────────
   NORMALIZE COMPANY
───────────────────────────────────────── */
function normalizeCompany(raw) {
  return {
    companyID: raw.company_ID ?? raw.companyID ?? raw.CompanyID ?? 0,
    companyName: raw.company_Name ?? raw.companyName ?? raw.CompanyName ?? '',
    addressLine1: raw.address_Line1 ?? raw.addressLine1 ?? raw.AddressLine1 ?? '',
    addressLine2: raw.address_Line2 ?? raw.addressLine2 ?? raw.AddressLine2 ?? '',
    city: raw.city ?? raw.City ?? '',
    state: raw.state ?? raw.State ?? '',
    pincode: raw.pincode ?? raw.Pincode ?? '',
    mobileNo: raw.mobile_No ?? raw.mobileNo ?? raw.MobileNo ?? '',
    gstin: raw.gstin ?? raw.GSTIN ?? '',
    isActive: raw.is_Active ?? raw.isActive ?? raw.IsActive ?? false,
  };
}

/* ─────────────────────────────────────────
   COMPANY COMBO
───────────────────────────────────────── */
function CompanyCombo({ value, onChange, companies, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);
  useOutsideClick(wrapRef, panelRef, open, close);

  const selected = companies.find(c => String(c.companyID) === String(value));
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const pool = companies.filter(c => c.isActive === true || String(c.companyID) === String(value));
    return q ? pool.filter(c => (c.companyName || '').toLowerCase().includes(q)) : pool;
  }, [companies, query, value]);

  const openDD = () => { setOpen(true); setQuery(''); setTimeout(() => inputRef.current?.focus(), 0); };
  const select = (c) => { onChange(c); setOpen(false); setQuery(''); };
  const clear = (e) => { e.stopPropagation(); onChange(null); setOpen(false); setQuery(''); };
  const nav = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx = Array.from(items || []).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') close();
  };

  return (
    <div className="pg-combo-wrap" ref={wrapRef} style={{ position: 'relative' }}>
      <div
        ref={triggerRef}
        className={`pg-field-wrap pg-combo-trigger ${disabled ? 'pg-field-wrap--disabled' : 'pg-field-wrap--normal'}`}
        onClick={() => { if (!disabled) openDD(); }}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={e => {
          if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!disabled) openDD(); }
          } else nav(e);
        }}
        style={{
          background: disabled ? '#f8f8fd' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
          border: '1.5px solid #e0e7ff', borderRadius: 10, minHeight: 42,
        }}
      >
        <Building2 size={15} color="#049edf" style={{ flexShrink: 0 }} />
        <span style={{
          flex: 1, fontFamily: 'Nunito, sans-serif', fontSize: 13,
          fontWeight: selected ? 700 : 500, color: selected ? '#1a1a2e' : '#9090a8',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {selected ? selected.companyName : companies.length === 0 ? 'Loading companies…' : 'Select company…'}
        </span>
        {selected && !disabled ? (
          <X size={13} style={{ cursor: 'pointer', color: '#9090a8' }} onClick={clear} />
        ) : (
          <ChevronDown size={13} color="#9090a8" style={{ flexShrink: 0 }} />
        )}
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div
          className="pg-combo-panel"
          style={{
            background: '#fff', borderRadius: 12, border: '1.5px solid #eeeefc',
            boxShadow: '0 12px 36px rgba(100,100,180,0.18)', overflow: 'hidden',
            padding: 6, maxHeight: 260, display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderBottom: '1px solid #f0f0f8' }}>
            <Search size={12} color="#9090a8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              placeholder="Search company by name…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); listRef.current?.querySelectorAll('.pg-combo-option')?.[0]?.focus(); }
                else if (e.key === 'Escape') close();
              }}
              style={{ width: '100%', border: 'none', outline: 'none', fontFamily: 'Nunito, sans-serif', fontSize: 12.5 }}
            />
            {query && <X size={11} style={{ cursor: 'pointer', color: '#9090a8' }} onClick={() => setQuery('')} />}
          </div>
          <div ref={listRef} style={{ overflowY: 'auto', maxHeight: 200, padding: '4px 0' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 10px', textAlign: 'center', color: '#9090a8', fontSize: 12 }}>No companies found</div>
            ) : (
              filtered.map(c => (
                <div
                  key={c.companyID}
                  className="pg-combo-option"
                  onClick={() => select(c)}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(c); } else nav(e); }}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '8px 10px',
                    borderRadius: 8, cursor: 'pointer', fontSize: 12.5,
                    fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                    color: String(c.companyID) === String(value) ? '#049edf' : '#1a1a2e',
                    background: String(c.companyID) === String(value) ? 'rgba(4,158,223,0.08)' : 'transparent',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(4,158,223,0.08)'}
                  onMouseLeave={e => {
                    if (String(c.companyID) !== String(value)) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ flex: 1 }}>{c.companyName}</span>
                  {String(c.companyID) === String(value) && <Check size={12} color="#049edf" />}
                </div>
              ))
            )}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ─────────────────────────────────────────
   PHOTO HELPER
───────────────────────────────────────── */
function resolvePhotoSrc(p) {
  const raw =
    p.defaultPhoto ?? p.photoPath ?? p.photoUrl ?? p.photo ??
    p.DefaultPhoto ?? p.PhotoPath ?? p.PhotoUrl ?? p.Photo ??
    p.filePath ?? p.FilePath ?? '';
  if (!raw) return '';
  if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('http')) return raw;
  const base = (API_ROOT_URL || '').replace(/\/+$/, '');
  const rel = '/' + raw.replace(/^\/+/, '');
  return `${base}${rel}`;
}

/* ─────────────────────────────────────────
   BUILD PDF HTML (CustomerContract.jsx style)
───────────────────────────────────────── */
function buildAvailableHoardingsPDFHTML({ company, startDate, endDate, hoardings }) {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const fmtD = (d) => {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const isSingleHoarding = hoardings.length === 1;

  const css = `
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#000;}

    /* ── A4 page ── */
    .page{
      width:210mm; height:297mm;
      padding:10mm 14mm 9mm;
      page-break-after:always;
      display:flex; flex-direction:column;
      overflow:hidden;
    }
    .page:last-child{page-break-after:avoid;}

    /* ── Page header ── */
    .ph{
      display:flex; justify-content:space-between; align-items:flex-end;
      padding-bottom:5px; border-bottom:2px solid #000;
      margin-bottom:7px; flex-shrink:0;
    }
    .ph-co{font-size:14px;font-weight:900;letter-spacing:1px;}
    .ph-r{font-size:10px;color:#444;text-align:right;line-height:1.4;}

    /* ══ COVER ══ */
    .cov{justify-content:space-between;}
    .cov-top{
      display:flex;justify-content:space-between;align-items:flex-start;
      padding-bottom:13px;border-bottom:3px solid #000;
    }
    .cov-co{font-size:38px;font-weight:900;letter-spacing:2px;line-height:1.1;}
    .cov-addr{font-size:10.5px;color:#555;margin-top:6px;line-height:1.7;}
    .cov-date{font-size:15px;font-weight:700;white-space:nowrap;}
    .cov-body{flex:1;display:flex;flex-direction:column;justify-content:center;padding:26px 0 14px;}
    .cov-name{font-size:28px;font-weight:700;margin-bottom:8px;color:#000;}
    .cov-phone{font-size:14px;color:#333;margin-top:5px;}
    .cov-info{
      margin-top:18px;padding:13px 15px;
      background:#f4f4f4;border-left:5px solid #000;
      font-size:13px;line-height:2;color:#111;
    }
    .cov-foot{
      display:flex;justify-content:space-between;align-items:center;
      border-top:1px solid #ccc;padding-top:8px;
      font-size:10.5px;color:#555;font-weight:600;
    }

    /* ══ HOARDING PAIR (2 per page) ══ */
    .pair-wrap{
      flex:1;min-height:0;
      display:flex;flex-direction:column;
      gap:0;
    }
    .hrd-section{
      ${isSingleHoarding ? 'flex:1;' : 'flex:0 0 50%;max-height:50%;'}
      min-height:0;
      display:flex;flex-direction:column;
    }
    .hrd-section + .hrd-section{
      border-top:1.5px dashed #ccc;
      padding-top:5px;
    }
    /* Photo — fills remaining space in the section */
    .hrd-photo{
      flex:1;min-height:0;overflow:hidden;
      background:#e0e0e0;margin-bottom:4px;
    }
    .hrd-photo img{
      width:100%;height:100%;object-fit:contain;display:block;
    }
    /* Details box — always fixed height at bottom of section */
    .hrd-box{
      background:#f2f2f2;padding:8px 12px;
      border-left:4px solid #000;flex-shrink:0;
    }
    .hrd-title{
      font-size:11.5px;font-weight:700;
      margin-bottom:5px;line-height:1.4;color:#000;
    }
    .hrd-row{display:flex;flex-wrap:wrap;font-size:11px;}
    .hrd-cell{flex:0 0 50%;padding-right:8px;}
    .hrd-lbl{font-weight:700;}
    .hrd-green{color:#16a34a;font-weight:700;}
    .hrd-red{color:#dc2626;font-weight:700;font-size:12px;}

    /* Download bar */
    #dl-bar{
      position:fixed;top:0;left:0;right:0;z-index:9999;
      background:#111;color:#fff;
      display:flex;align-items:center;justify-content:space-between;
      padding:10px 20px;font-family:Arial,sans-serif;font-size:13px;gap:12px;
    }
    .dl-btn{
      padding:7px 22px;background:#dc2626;color:#fff;
      border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;
    }
    .dl-btn:hover{background:#b91c1c;}
    @media print{
      #dl-bar{display:none!important;}
      body{padding-top:0!important;}
      .page{width:100%;height:100vh;padding:8mm 12mm 8mm;}
    }
    @page{size:A4 portrait;margin:0;}
  `;

  const companyAddressLines = [
    company.addressLine1,
    [company.addressLine2, company.city, company.state, company.pincode].filter(Boolean).join(', '),
  ].filter(Boolean);

  /* ── COVER ── */
  const cover = `
    <div class="page cov">
      <div class="cov-top">
        <div>
          <div class="cov-co">${company.companyName}</div>
          <div class="cov-addr">${companyAddressLines.join('<br>')}</div>
        </div>
        <div class="cov-date">${today}</div>
      </div>
      <div class="cov-body">
        <div class="cov-name">Available Hoardings Report</div>
        ${company.mobileNo ? `<div class="cov-phone">Contact: ${company.mobileNo}</div>` : ''}
        ${company.gstin ? `<div class="cov-phone">GSTIN: ${company.gstin}</div>` : ''}
        <div class="cov-info">
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <tr>
              <td style="width:180px; font-weight:bold; padding:3px 0;">Report Period</td>
              <td style="padding:3px 0;">: ${fmtD(startDate)} &rarr; ${fmtD(endDate)}</td>
            </tr>
            <tr>
              <td style="font-weight:bold; padding:3px 0;">Total Available Hoardings</td>
              <td style="padding:3px 0; font-weight:bold;">: ${hoardings.length} Location${hoardings.length !== 1 ? 's' : ''}</td>
            </tr>
            <tr>
              <td style="font-weight:bold; padding:3px 0;">Generated On</td>
              <td style="padding:3px 0;">: ${today}</td>
            </tr>
          </table>
        </div>
      </div>
      <div class="cov-foot">
        <span>${company.mobileNo || ''}</span>
        <span>${hoardings.length} Available Hoarding${hoardings.length !== 1 ? 's' : ''}</span>
      </div>
    </div>`;

  /* details box helper */
  const box = (item, idx) => {
    const addr = [item.addressLine1, item.city, item.district].filter(Boolean).join(', ');
    const size = item.width && item.height ? `${item.width}×${item.height} ft` : '';
    const sqFt = item.width && item.height ? `${item.width * item.height} sq.ft` : '';

    return `
      <div class="hrd-box">
        <div class="hrd-title">
          ${idx + 1})&nbsp;<strong>${item.hoardingCode || `Hoarding #${item.hoardingId || ''}`}</strong>
          ${addr ? `&nbsp;&mdash;&nbsp;${addr}` : ''}
          ${size ? `&nbsp;&mdash;&nbsp;<strong>${size}</strong>` : ''}
          ${sqFt ? `&nbsp;(${sqFt})` : ''}
          ${item.material ? `&nbsp;&mdash;&nbsp;${item.material}` : ''}
        </div>
        <div class="hrd-row">
          <div class="hrd-cell"><span class="hrd-lbl">Location:</span>&nbsp;${addr || '—'}</div>
          <div class="hrd-cell">
            <span class="hrd-lbl">Availability:</span>&nbsp;
            <span class="hrd-green">Available Now</span>
          </div>
          ${item.monthlyRent > 0 ? `
          <div class="hrd-cell" style="flex:0 0 100%;margin-top:2px;">
            <span class="hrd-lbl">Monthly Rent:</span>&nbsp;
            <span class="hrd-red">&#8377;${Number(item.monthlyRent).toLocaleString('en-IN')}</span>
          </div>` : ''}
        </div>
      </div>`;
  };

  /* section helper */
  const section = (item, idx) => {
    const photoUrl = resolvePhotoSrc(item);
    if (photoUrl) {
      return `
        <div class="hrd-section">
          <div class="hrd-photo">
            <img src="${photoUrl}" alt="${item.hoardingCode}" />
          </div>
          ${box(item, idx)}
        </div>`;
    }
    return `
      <div class="hrd-section">
        <div style="
          flex:1;min-height:0;background:#f5f5f5;
          border:1.5px dashed #ccc;margin-bottom:4px;
          display:flex;align-items:center;justify-content:center;
          font-size:11px;color:#aaa;gap:6px;
        ">📷&nbsp;No photo available for ${item.hoardingCode || 'this hoarding'}</div>
        ${box(item, idx)}
      </div>`;
  };

  /* ── HOARDING PAGES (2 per page) ── */
  const hrdPages = [];
  for (let i = 0; i < hoardings.length; i += 2) {
    const a = hoardings[i];
    const b = hoardings[i + 1];
    hrdPages.push(`
      <div class="page" style="display:flex;flex-direction:column;">
        <div class="pair-wrap">
          ${section(a, i)}
          ${b ? section(b, i + 1) : ''}
        </div>
      </div>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Available Hoardings Report &mdash; ${fmtD(startDate)} to ${fmtD(endDate)}</title>
  <style>${css}</style>
</head>
<body style="padding-top:44px;">
  <div id="dl-bar">
    <span><strong>${company.companyName}</strong> &mdash; Available Hoardings Report (${fmtD(startDate)} &rarr; ${fmtD(endDate)})</span>
    <button class="dl-btn" onclick="window.print()">&#8681; Download / Print PDF</button>
  </div>
  ${cover}
  ${hrdPages.join('')}
</body>
</html>`;
}

/* ─────────────────────────────────────────
   AVAILABLE HOARDINGS MODAL
───────────────────────────────────────── */
function AvailableHoardingsModal({ onClose }) {
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    return now.toISOString().split('T')[0];
  });
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    (async () => {
      setLoadingCompanies(true);
      try {
        const res = await apiService.getAllCompanyDetails().catch(() => []);
        const raw = Array.isArray(res) ? res : res?.data ?? [];
        const normalized = raw.map(normalizeCompany);
        setCompanies(normalized);
        const activeDefault = normalized.find(c => c.isActive) || normalized[0] || null;
        if (activeDefault) setSelectedCompany(activeDefault);
      } catch (err) {
        console.error('Failed to load companies:', err);
      } finally {
        setLoadingCompanies(false);
      }
    })();
  }, []);

  const canGenerate = startDate && endDate && selectedCompany && !generating;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setErrorMsg('');
    try {
      const response = await apiService.getAvailableHoardingListPhoto(startDate, endDate);
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.$values)
            ? response.$values
            : [];

      if (!list || list.length === 0) {
        setErrorMsg('No available hoardings found for this period.');
        setGenerating(false);
        return;
      }

      const html = buildAvailableHoardingsPDFHTML({
        company: selectedCompany,
        startDate,
        endDate,
        hoardings: list,
      });

      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        onClose();
      } else {
        alert('Popup blocked. Please allow popups for this site and try again.');
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to fetch available hoardings data.');
    } finally {
      setGenerating(false);
    }
  };

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
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'visible',
          display: 'flex', flexDirection: 'column', padding: '24px',
          animation: 'modalIn 0.24s cubic-bezier(0.22,1,0.36,1) both',
          fontFamily: 'Nunito, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(4,158,223,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={20} color="#049edf" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 900, color: '#1a1a2e' }}>
                Available Hoardings PDF
              </h3>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#7878a0' }}>
                Select period and company for the report
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090a8', padding: 4 }}>
            <X size={17} />
          </button>
        </div>

        {/* Date Range */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: '#4a5568', marginBottom: 5 }}>
              Start Date <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              border: '1.5px solid #e0e7ff', borderRadius: 10, background: '#fff',
            }}>
              <Calendar size={14} color="#049edf" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{
                  border: 'none', outline: 'none', width: '100%',
                  fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#1a1a2e',
                }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: '#4a5568', marginBottom: 5 }}>
              End Date <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              border: '1.5px solid #e0e7ff', borderRadius: 10, background: '#fff',
            }}>
              <Calendar size={14} color="#049edf" />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{
                  border: 'none', outline: 'none', width: '100%',
                  fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#1a1a2e',
                }}
              />
            </div>
          </div>
        </div>

        {/* Company Picker */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: '#4a5568', marginBottom: 5 }}>
            Company Header <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <CompanyCombo
            value={selectedCompany?.companyID}
            onChange={setSelectedCompany}
            companies={companies}
            disabled={loadingCompanies}
          />
        </div>

        {/* Error message */}
        {errorMsg && (
          <div style={{
            padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 10, color: '#dc2626', fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            className="pg-btn-cancel"
            onClick={onClose}
            disabled={generating}
            style={{
              padding: '9px 18px', border: '1.5px solid #e0e7ff', borderRadius: 10,
              background: '#fff', color: '#4a5568', fontWeight: 800, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            className="pg-btn-save"
            onClick={handleGenerate}
            disabled={!canGenerate}
            style={{
              padding: '9px 20px', border: 'none', borderRadius: 10,
              background: canGenerate ? 'linear-gradient(135deg, #049edf, #0284c7)' : '#cbd5e1',
              color: '#fff', fontWeight: 800, cursor: canGenerate ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: canGenerate ? '0 4px 14px rgba(4,158,223,0.35)' : 'none',
            }}
          >
            {generating ? (
              <><Loader2 size={15} className="pg-spin" /> Generating PDF…</>
            ) : (
              <><FileText size={15} /> Generate PDF</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────
   DOWNLOAD DROPDOWN BUTTON
───────────────────────────────────────── */
function DownloadDropdown({ onExportExcel, onExportPDF, excelOnly, pdfOnly, onOpenCustomPDF }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(null);
  const wrapRef = useRef(null);
  useOutsideClick(wrapRef, null, open, () => setOpen(false));

  const handle = async (type) => {
    setOpen(false);
    if (type === 'pdf' && onOpenCustomPDF) {
      onOpenCustomPDF();
      return;
    }
    setExporting(type);
    try {
      if (type === 'excel') await onExportExcel();
      else if (onExportPDF) await onExportPDF();
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(null);
    }
  };

  // PDF-only: direct button
  if (pdfOnly) {
    return (
      <button
        className="pg-btn-add"
        disabled={!!exporting}
        onClick={() => (onOpenCustomPDF ? onOpenCustomPDF() : handle('pdf'))}
        style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
      >
        {exporting ? (
          <><Loader2 size={14} className="pg-spin" /> Exporting…</>
        ) : (
          <>
            <Download size={14} />
            Download PDF
          </>
        )}
      </button>
    );
  }

  // Excel-only: no dropdown, direct button
  if (excelOnly) {
    return (
      <button
        className="pg-btn-add"
        disabled={!!exporting}
        onClick={() => handle('excel')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
      >
        {exporting ? (
          <><Loader2 size={14} className="pg-spin" /> Exporting…</>
        ) : (
          <>
            <FileSpreadsheet size={14} />
            Download Excel
          </>
        )}
      </button>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="pg-btn-add"
        disabled={!!exporting}
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
      >
        {exporting ? (
          <><Loader2 size={14} className="pg-spin" /> Exporting…</>
        ) : (
          <>
            <Download size={14} />
            Download
            <ChevronDown
              size={13}
              style={{
                opacity: 0.8,
                transform: open ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.18s',
              }}
            />
          </>
        )}
      </button>

      {open && !exporting && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          minWidth: 210,
          background: '#fff',
          border: '1.5px solid #eeeefc',
          borderRadius: 13,
          boxShadow: '0 14px 44px rgba(100,100,180,0.18)',
          overflow: 'hidden',
          zIndex: 9999,
        }}>
          {/* Excel */}
          <button
            onClick={() => handle('excel')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', background: 'none', border: 'none',
              borderBottom: '1px solid #f4f4fb', cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif', fontSize: 13,
              fontWeight: 700, color: '#1a1a2e', textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(22,163,74,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: 'rgba(22,163,74,0.10)',
              border: '1.5px solid rgba(22,163,74,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileSpreadsheet size={17} color="#16a34a" />
            </div>
            Download as Excel
          </button>

          {/* PDF */}
          <button
            onClick={() => handle('pdf')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
              fontSize: 13, fontWeight: 700, color: '#1a1a2e', textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: 'rgba(220,38,38,0.10)',
              border: '1.5px solid rgba(220,38,38,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={17} color="#dc2626" />
            </div>
            Download as PDF
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   REPORT CARD
───────────────────────────────────────── */
function ReportCard({ report, onOpenAvailableModal }) {
  const [exportError, setExportError] = useState('');
  const Icon = report.icon;

  const handleExcel = useCallback(async () => {
    setExportError('');
    try { await report.exportExcel(); }
    catch (err) { setExportError(err?.response?.data?.message || err?.message || 'Export failed.'); }
  }, [report]);

  const handlePDF = useCallback(async () => {
    if (report.customPDF) {
      onOpenAvailableModal();
      return;
    }
    setExportError('');
    try { await report.exportPDF(); }
    catch (err) { setExportError(err?.response?.data?.message || err?.message || 'Export failed.'); }
  }, [report, onOpenAvailableModal]);

  const iconBg = report.color === '#7c3aed'
    ? 'rgba(124,58,237,0.10)'
    : 'rgba(4,158,223,0.10)';
  const iconBdr = report.color === '#7c3aed'
    ? 'rgba(124,58,237,0.22)'
    : 'rgba(4,158,223,0.22)';

  return (
    <div className="pg-container" style={{ borderRadius: 18, overflow: 'visible', marginBottom: 16 }}>
      <style>{`
        .report-card-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 20px 22px;
          flex-wrap: nowrap;
        }
        .report-card-left {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
          min-width: 0;
        }
        .report-card-right {
          flex-shrink: 0;
          width: auto;
        }
        .report-card-right > div,
        .report-card-right > button {
          width: auto;
          justify-content: center;
        }

        @media (max-width: 540px) {
          .report-card-row {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
            padding: 16px;
          }
          .report-card-left {
            align-items: flex-start;
          }
          .report-card-right {
            width: 100%;
            border-top: 1px solid #f0f0f8;
            padding-top: 14px;
          }
          .report-card-right > div,
          .report-card-right > button.pg-btn-add {
            width: 100%;
          }
        }
      `}</style>

      <div className="report-card-row">
        <div className="report-card-left">
          <div style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: iconBg,
            border: `1.5px solid ${iconBdr}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={20} color={report.color} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 15, color: '#1a1a2e' }}>
                {report.title}
              </span>
              {report.pdfOnly && (
                <span style={{
                  fontSize: 10.5, fontWeight: 700, fontFamily: 'Nunito, sans-serif',
                  color: '#049edf', background: 'rgba(4,158,223,0.10)',
                  border: '1px solid rgba(4,158,223,0.22)',
                  borderRadius: 6, padding: '1px 7px', lineHeight: 1.8,
                  letterSpacing: 0.3,
                }}>
                  PDF only
                </span>
              )}
              {report.excelOnly && (
                <span style={{
                  fontSize: 10.5, fontWeight: 700, fontFamily: 'Nunito, sans-serif',
                  color: '#16a34a', background: 'rgba(22,163,74,0.10)',
                  border: '1px solid rgba(22,163,74,0.22)',
                  borderRadius: 6, padding: '1px 7px', lineHeight: 1.8,
                  letterSpacing: 0.3,
                }}>
                  Excel only
                </span>
              )}
            </div>
            <p style={{
              margin: 0, fontFamily: 'Nunito, sans-serif',
              fontSize: 12.5, color: '#9090a8', fontWeight: 600, lineHeight: 1.55,
            }}>
              {report.description}
            </p>
          </div>
        </div>

        <div className="report-card-right">
          <DownloadDropdown
            onExportExcel={handleExcel}
            onExportPDF={handlePDF}
            excelOnly={report.excelOnly}
            pdfOnly={report.pdfOnly}
            onOpenCustomPDF={report.customPDF ? onOpenAvailableModal : null}
          />
        </div>
      </div>

      {exportError && (
        <div style={{
          margin: '0 18px 14px', padding: '10px 14px',
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11,
          color: '#dc2626', fontSize: 12.5, fontWeight: 600,
          display: 'flex', gap: 8, alignItems: 'flex-start',
          fontFamily: 'Nunito, sans-serif',
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{exportError}</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   REPORT PAGE
═══════════════════════════════════════════ */
export default function ReportPage() {
  const [showAvailableModal, setShowAvailableModal] = useState(false);

  return (
    <div className="pg-page">
      <div className="pg-header">
        <div>
          <h1 className="pg-header__title">Reports</h1>
          <p className="pg-header__subtitle">
            Export <strong>business reports</strong> for hoardings, sites, and contracts.
          </p>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 16px', marginBottom: 22,
        background: 'rgba(4,158,223,0.05)', border: '1.5px solid rgba(4,158,223,0.18)',
        borderRadius: 14, fontFamily: 'Nunito, sans-serif',
        fontSize: 13, fontWeight: 600, color: '#4a5568', lineHeight: 1.6,
      }}>
        <BarChart2 size={16} color="#049edf" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          Click <strong style={{ color: '#049edf' }}>Download</strong> on any report and choose{' '}
          <strong>Excel</strong> or <strong>PDF</strong> where available.
        </span>
      </div>

      {REPORTS.map(report => (
        <ReportCard
          key={report.id}
          report={report}
          onOpenAvailableModal={() => setShowAvailableModal(true)}
        />
      ))}

      {showAvailableModal && (
        <AvailableHoardingsModal onClose={() => setShowAvailableModal(false)} />
      )}
    </div>
  );
}