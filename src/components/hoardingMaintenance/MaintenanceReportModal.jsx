import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  FileText,
  X,
  Calendar,
  Building2,
  AlertCircle,
  Loader2,
  Search,
  Check,
  ChevronDown,
  Layers,
  Flag,
} from 'lucide-react';
import { apiService, API_ROOT_URL } from '../../api/api';
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_PRIORITIES,
} from '../../constants/maintenanceConstants';

/* ─────────────────────────────────────────
   RESOLVE PHOTO SRC
───────────────────────────────────────── */
function resolvePhotoSrc(photo) {
  if (!photo) return '';
  const path =
    photo.photoPath ||
    photo.photo_Path ||
    photo.filePath ||
    photo.PhotoPath ||
    photo.photoUrl ||
    '';
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http')) return path;
  const base = (API_ROOT_URL || '').replace(/\/+$/, '');
  const rel = '/' + path.replace(/^\/+/, '');
  return `${base}${rel}`;
}

/* ─────────────────────────────────────────
   DATE FORMATTER HELPER
───────────────────────────────────────── */
function fmtD(d) {
  if (!d) return '—';
  try {
    const s = String(d).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const parts = s.split('T')[0].split('-');
      const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return dt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    return s;
  } catch {
    return String(d);
  }
}

/* ─────────────────────────────────────────
   BUILD MAINTENANCE PDF HTML (Reports.jsx style)
───────────────────────────────────────── */
function buildMaintenancePDFHTML({
  company,
  statusFilter,
  priorityFilter,
  fromDate,
  toDate,
  records,
  addressMap = {},
}) {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  /* Build flat array of sections (chunking photos into pairs of 2) */
  const allSections = [];
  records.forEach((record, recIdx) => {
    const rawPhotos = Array.isArray(record.photos)
      ? record.photos
      : Array.isArray(record.photos?.$values)
      ? record.photos.$values
      : [];

    const activePhotos = rawPhotos.filter((p) => !p.is_Deleted && !p.isDeleted);

    if (activePhotos.length === 0) {
      allSections.push({
        record,
        photos: [],
        recIdx,
        isLastPart: true,
      });
    } else {
      const totalParts = Math.ceil(activePhotos.length / 2);
      for (let i = 0; i < activePhotos.length; i += 2) {
        const photoPair = activePhotos.slice(i, i + 2);
        const partIndex = Math.floor(i / 2) + 1;
        const isLastPart = partIndex === totalParts;
        allSections.push({
          record,
          photos: photoPair,
          recIdx,
          isLastPart,
        });
      }
    }
  });

  const isSingleSection = allSections.length === 1;

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

    /* ══ MAINTENANCE PAIR (2 per page) ══ */
    .pair-wrap{
      flex:1;min-height:0;
      display:flex;flex-direction:column;
      gap:0;
    }
    .hrd-section{
      ${isSingleSection ? 'flex:1;' : 'flex:0 0 50%;max-height:50%;'}
      min-height:0;
      display:flex;flex-direction:column;
    }
    .hrd-section + .hrd-section{
      border-top:1.5px dashed #ccc;
      padding-top:6px;
    }

    /* Photos Grid inside Section (2 photos side-by-side or 1 photo full-width) */
    .maint-photos-row{
      flex:1;min-height:0;overflow:hidden;
      display:flex;gap:8px;margin-bottom:6px;
    }
    .maint-photo-box{
      flex:1;min-width:0;height:100%;
      background:#f3f4f6;position:relative;overflow:hidden;
      border-radius:4px;border:1px solid #d1d5db;
    }
    .maint-photo-box img{
      width:100%;height:100%;object-fit:contain;display:block;
    }
    .maint-photo-tag{
      position:absolute;bottom:6px;left:6px;
      font-size:10px;font-weight:700;padding:2px 7px;
      border-radius:3px;text-transform:uppercase;letter-spacing:0.4px;
    }
    .tag-before{
      background:rgba(2,132,199,0.92);color:#fff;
    }
    .tag-after{
      background:rgba(22,163,74,0.92);color:#fff;
    }
    .tag-default{
      background:rgba(15,23,42,0.8);color:#fff;
    }

    /* Details box — fixed at bottom */
    .hrd-box{
      background:#f4f4f6;padding:8px 12px;
      border-left:4px solid #000;flex-shrink:0;
    }
    .hrd-title{
      font-size:11.5px;font-weight:700;
      margin-bottom:4px;line-height:1.4;color:#000;
    }
    .hrd-row{display:flex;flex-wrap:wrap;font-size:11px;line-height:1.6;}
    .hrd-cell{flex:0 0 50%;padding-right:8px;}
    .hrd-lbl{font-weight:700;color:#333;}
    .hrd-green{color:#16a34a;font-weight:700;}
    .hrd-blue{color:#0284c7;font-weight:700;}
    .hrd-orange{color:#d97706;font-weight:700;}
    .hrd-red{color:#dc2626;font-weight:700;}
    .hrd-gray{color:#64748b;font-weight:700;}

    /* Download bar */
    #dl-bar{
      position:fixed;top:0;left:0;right:0;z-index:9999;
      background:#111;color:#fff;
      display:flex;align-items:center;justify-content:space-between;
      padding:10px 20px;font-family:Arial,sans-serif;font-size:13px;gap:12px;
    }
    .dl-btn{
      padding:7px 22px;background:#049edf;color:#fff;
      border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;
    }
    .dl-btn:hover{background:#0284c7;}
    @media print{
      #dl-bar{display:none!important;}
      body{padding-top:0!important;}
      .page{width:100%;height:100vh;padding:8mm 12mm 8mm;}
    }
    @page{size:A4 portrait;margin:0;}
  `;

  const companyAddressLines = [
    company.addressLine1,
    [company.addressLine2, company.city, company.state, company.pincode]
      .filter(Boolean)
      .join(', '),
  ].filter(Boolean);

  let periodStr = 'All Records';
  if (fromDate && toDate) {
    periodStr = `${fmtD(fromDate)} &rarr; ${fmtD(toDate)}`;
  } else if (fromDate) {
    periodStr = `From ${fmtD(fromDate)}`;
  } else if (toDate) {
    periodStr = `Up to ${fmtD(toDate)}`;
  }

  const reportTitle = 'Hoarding Maintenance Report';
  const pageTitle = `${reportTitle} — ${periodStr}`;

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
        <div class="cov-name">${reportTitle}</div>
        ${company.mobileNo ? `<div class="cov-phone">Contact: ${company.mobileNo}</div>` : ''}
        ${company.gstin ? `<div class="cov-phone">GSTIN: ${company.gstin}</div>` : ''}
        <div class="cov-info">
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <tr>
              <td style="width:180px; font-weight:bold; padding:3px 0;">Date Period</td>
              <td style="padding:3px 0;">: ${periodStr}</td>
            </tr>
            <tr>
              <td style="font-weight:bold; padding:3px 0;">Status Filter</td>
              <td style="padding:3px 0;">: ${statusFilter || 'All Statuses'}</td>
            </tr>
            <tr>
              <td style="font-weight:bold; padding:3px 0;">Priority Filter</td>
              <td style="padding:3px 0;">: ${priorityFilter || 'All Priorities'}</td>
            </tr>
            <tr>
              <td style="font-weight:bold; padding:3px 0;">Total Maintenance Records</td>
              <td style="padding:3px 0; font-weight:bold;">: ${records.length} Request${records.length !== 1 ? 's' : ''}</td>
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
        <span>${records.length} Maintenance Request${records.length !== 1 ? 's' : ''}</span>
      </div>
    </div>`;

  /* Helper for Priority color */
  const getPriorityClass = (pri) => {
    const p = (pri || '').toLowerCase();
    if (p === 'critical' || p === 'high') return 'hrd-red';
    if (p === 'normal' || p === 'medium') return 'hrd-blue';
    return 'hrd-green';
  };

  /* Helper for Status color */
  const getStatusClass = (st) => {
    const s = (st || '').toLowerCase();
    if (s === 'open') return 'hrd-blue';
    if (s === 'in progress') return 'hrd-orange';
    if (s === 'completed') return 'hrd-green';
    return 'hrd-gray';
  };

  /* Maintenance Details Box */
  const box = (item, recIdx) => {
    const code = item.hoarding_Code || item.hoardingCode || `Hoarding #${item.hoarding_ID || item.hoardingID || ''}`;
    const codeKey = (code || '').toLowerCase().trim();
    const addr =
      addressMap[codeKey] ||
      addressMap[String(item.hoarding_ID || item.hoardingID)] ||
      '';
    const reason = item.reason_Name || item.reasonName || 'Maintenance';
    const reqId = item.maintenance_ID || item.maintenanceID;
    const priority = item.priority || 'Normal';
    const status = item.status || 'Open';
    const reportedBy = item.reported_By_Name || item.reportedByName || (item.reported_By ? `User #${item.reported_By}` : 'Admin');
    const reportedDate = item.reported_Date || item.reportedDate;
    const targetDate = item.target_Date || item.targetDate;
    const completedDate = item.completed_Date || item.completedDate;
    const desc = item.description || '';
    const remarks = item.completion_Remarks || item.completionRemarks || '';

    return `
      <div class="hrd-box">
        <div class="hrd-title">
          ${recIdx + 1})&nbsp;<strong>#${reqId}</strong>&nbsp;&mdash;&nbsp;<strong>${code}</strong>
          ${addr ? `&nbsp;(${addr})` : ''}
          &nbsp;&mdash;&nbsp;<strong>${reason}</strong>
        </div>
        <div class="hrd-row">
          <div class="hrd-cell">
            <span class="hrd-lbl">Priority:</span>&nbsp;<span class="${getPriorityClass(priority)}">${priority}</span>
            &nbsp;|&nbsp;<span class="hrd-lbl">Status:</span>&nbsp;<span class="${getStatusClass(status)}">${status}</span>
          </div>
          <div class="hrd-cell">
            <span class="hrd-lbl">Reported:</span>&nbsp;${fmtD(reportedDate)} by <strong>${reportedBy}</strong>
          </div>
        </div>
        <div class="hrd-row">
          <div class="hrd-cell">
            <span class="hrd-lbl">Target Date:</span>&nbsp;${fmtD(targetDate)}
            ${completedDate ? `&nbsp;|&nbsp;<span class="hrd-lbl">Completed:</span>&nbsp;${fmtD(completedDate)}` : ''}
          </div>
          ${item.assigned_To_Name ? `<div class="hrd-cell"><span class="hrd-lbl">Assigned To:</span>&nbsp;${item.assigned_To_Name}</div>` : ''}
        </div>
        ${desc ? `<div class="hrd-row" style="font-style:italic; color:#4b5563; margin-top:2px;"><span class="hrd-lbl" style="font-style:normal;">Notes:</span>&nbsp;"${desc}"</div>` : ''}
        ${remarks ? `<div class="hrd-row" style="font-style:italic; color:#16a34a; margin-top:2px;"><span class="hrd-lbl" style="font-style:normal; color:#16a34a;">Completion:</span>&nbsp;"${remarks}"</div>` : ''}
      </div>`;
  };

  /* Render Section with 2-Photo Pair (or 1 photo full-width) */
  const renderSection = (sectionData) => {
    const { record, photos, recIdx, isLastPart } = sectionData;
    let photoHtml = '';
    if (photos.length > 0) {
      photoHtml = `
        <div class="maint-photos-row">
          ${photos
            .map((p) => {
              const url = resolvePhotoSrc(p);
              const typeLabel = p.photo_Type || p.photoType || 'Photo';
              const typeClass =
                (typeLabel || '').toLowerCase() === 'before'
                  ? 'tag-before'
                  : (typeLabel || '').toLowerCase() === 'after'
                  ? 'tag-after'
                  : 'tag-default';
              return `
                <div class="maint-photo-box">
                  <img src="${url}" alt="${typeLabel}" />
                  <span class="maint-photo-tag ${typeClass}">${typeLabel}</span>
                </div>`;
            })
            .join('')}
        </div>`;
    } else {
      photoHtml = `
        <div style="
          flex:1;min-height:0;background:#f9fafb;
          border:1.5px dashed #ccc;margin-bottom:6px;
          display:flex;align-items:center;justify-content:center;
          font-size:11px;color:#9ca3af;gap:6px;border-radius:4px;
        ">📷&nbsp;No photos available for maintenance #${record.maintenance_ID || record.maintenanceID}</div>`;
    }

    return `
      <div class="hrd-section">
        ${photoHtml}
        ${isLastPart ? box(record, recIdx) : ''}
      </div>`;
  };

  /* ── MAINTENANCE PAGES (2 sections per page) ── */
  const maintPages = [];
  for (let i = 0; i < allSections.length; i += 2) {
    const a = allSections[i];
    const b = allSections[i + 1];
    maintPages.push(`
      <div class="page" style="display:flex;flex-direction:column;">
        <div class="ph">
          <span class="ph-co">${company.companyName}</span>
          <span class="ph-r">${reportTitle} &mdash; ${periodStr}</span>
        </div>
        <div class="pair-wrap">
          ${renderSection(a)}
          ${b ? renderSection(b) : ''}
        </div>
      </div>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${pageTitle}</title>
  <style>${css}</style>
</head>
<body style="padding-top:44px;">
  <div id="dl-bar">
    <span><strong>${company.companyName}</strong> &mdash; ${reportTitle} (${periodStr})</span>
    <button class="dl-btn" onclick="window.print()">&#8681; Download / Print PDF</button>
  </div>
  ${cover}
  ${maintPages.join('')}
</body>
</html>`;
}

/* ─────────────────────────────────────────
   NORMALIZE COMPANY
───────────────────────────────────────── */
function normalizeCompany(raw) {
  const activeVal =
    raw.is_Active ??
    raw.isActive ??
    raw.IsActive ??
    raw.active ??
    raw.Active ??
    raw.status;

  const isActive =
    activeVal === true ||
    activeVal === 1 ||
    activeVal === '1' ||
    String(activeVal).toLowerCase() === 'true' ||
    String(activeVal).toLowerCase() === 'active';

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
    isActive,
  };
}

/* ─────────────────────────────────────────
   USE OUTSIDE CLICK
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

  const selected = companies.find((c) => String(c.companyID) === String(value));
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const pool = companies.filter((c) => c.isActive === true);
    return q ? pool.filter((c) => (c.companyName || '').toLowerCase().includes(q)) : pool;
  }, [companies, query]);

  const openDD = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const select = (c) => { onChange(c); setOpen(false); setQuery(''); };
  const clear = (e) => { e.stopPropagation(); onChange(null); setOpen(false); setQuery(''); };

  return (
    <div className="pg-combo-wrap" ref={wrapRef} style={{ position: 'relative' }}>
      <div
        ref={triggerRef}
        onClick={openDD}
        tabIndex={disabled ? -1 : 0}
        style={{
          background: disabled ? '#f8f8fd' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          border: '1.5px solid #e0e7ff',
          borderRadius: 10,
          minHeight: 40,
        }}
      >
        <Building2 size={15} color="#049edf" style={{ flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            fontFamily: 'Nunito, sans-serif',
            fontSize: 12.5,
            fontWeight: selected ? 700 : 600,
            color: selected ? '#1a1a2e' : '#9090a8',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
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
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1.5px solid #eeeefc',
            boxShadow: '0 12px 36px rgba(100,100,180,0.18)',
            overflow: 'hidden',
            padding: 6,
            maxHeight: 260,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderBottom: '1px solid #f0f0f8' }}>
            <Search size={12} color="#9090a8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              placeholder="Search company by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontFamily: 'Nunito, sans-serif',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#1a1a2e',
              }}
            />
            {query && <X size={11} style={{ cursor: 'pointer', color: '#9090a8' }} onClick={() => setQuery('')} />}
          </div>
          <div ref={listRef} style={{ overflowY: 'auto', maxHeight: 200, padding: '4px 0' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 10px', textAlign: 'center', color: '#9090a8', fontSize: 12 }}>No companies found</div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.companyID}
                  className="pg-combo-option"
                  onClick={() => select(c)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontFamily: 'Nunito, sans-serif',
                    fontWeight: 700,
                    color: String(c.companyID) === String(value) ? '#049edf' : '#1a1a2e',
                    background: String(c.companyID) === String(value) ? 'rgba(4,158,223,0.08)' : 'transparent',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(4,158,223,0.08)')}
                  onMouseLeave={(e) => {
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
   SELECT COMBO (STATUS / PRIORITY)
───────────────────────────────────────── */
function SelectCombo({ value, onChange, options, placeholder, icon: Icon, color = '#049edf' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);
  useOutsideClick(wrapRef, panelRef, open, close);

  const selected = options.find((o) => String(o.value) === String(value));
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const openDD = () => {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const select = (val) => { onChange(val); setOpen(false); setQuery(''); };
  const clear = (e) => { e.stopPropagation(); onChange(''); setOpen(false); setQuery(''); };

  return (
    <div className="pg-combo-wrap" ref={wrapRef} style={{ position: 'relative' }}>
      <div
        ref={triggerRef}
        onClick={openDD}
        tabIndex={0}
        style={{
          background: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          border: '1.5px solid #e0e7ff',
          borderRadius: 10,
          minHeight: 40,
        }}
      >
        {Icon && <Icon size={14} color={color} style={{ flexShrink: 0 }} />}
        <span
          style={{
            flex: 1,
            fontFamily: 'Nunito, sans-serif',
            fontSize: 12.5,
            fontWeight: selected && selected.value ? 700 : 600,
            color: selected && selected.value ? '#1a1a2e' : '#9090a8',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {selected ? selected.label : placeholder}
        </span>
        {selected && selected.value ? (
          <X size={13} style={{ cursor: 'pointer', color: '#9090a8' }} onClick={clear} />
        ) : (
          <ChevronDown size={13} color="#9090a8" style={{ flexShrink: 0 }} />
        )}
      </div>

      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1.5px solid #eeeefc',
            boxShadow: '0 12px 36px rgba(100,100,180,0.18)',
            overflow: 'hidden',
            padding: 6,
            maxHeight: 240,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {options.length > 5 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderBottom: '1px solid #f0f0f8' }}>
              <Search size={12} color="#9090a8" style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'Nunito, sans-serif',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#1a1a2e',
                }}
              />
              {query && <X size={11} style={{ cursor: 'pointer', color: '#9090a8' }} onClick={() => setQuery('')} />}
            </div>
          )}
          <div ref={listRef} style={{ overflowY: 'auto', maxHeight: 180, padding: '4px 0' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px', textAlign: 'center', color: '#9090a8', fontSize: 12 }}>No options found</div>
            ) : (
              filtered.map((o) => (
                <div
                  key={o.value}
                  className="pg-combo-option"
                  onClick={() => select(o.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontFamily: 'Nunito, sans-serif',
                    fontWeight: 700,
                    color: String(o.value) === String(value) ? '#049edf' : '#1a1a2e',
                    background: String(o.value) === String(value) ? 'rgba(4,158,223,0.08)' : 'transparent',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(4,158,223,0.08)')}
                  onMouseLeave={(e) => {
                    if (String(o.value) !== String(value)) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ flex: 1 }}>{o.label}</span>
                  {String(o.value) === String(value) && <Check size={12} color="#049edf" />}
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
   MAINTENANCE REPORT MODAL COMPONENT
───────────────────────────────────────── */
export default function MaintenanceReportModal({ onClose }) {
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [addressMap, setAddressMap] = useState({});

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingCompanies(true);
      try {
        const [compRes, addrData] = await Promise.all([
          apiService.getAllCompanyDetails().catch(() => []),
          apiService.getHoardingAddressMap().catch(() => null),
        ]);

        if (!active) return;

        const raw = Array.isArray(compRes) ? compRes : compRes?.data ?? [];
        const normalized = raw.map(normalizeCompany);
        const activeOnly = normalized.filter((c) => c.isActive === true);
        setCompanies(activeOnly);
        const activeDefault = activeOnly[0] || null;
        if (activeDefault) setSelectedCompany(activeDefault);

        if (addrData?.addressMap) {
          setAddressMap(addrData.addressMap);
        }
      } catch (err) {
        console.error('Failed to initialize report modal data:', err);
      } finally {
        if (active) setLoadingCompanies(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const statusOptions = useMemo(() => [
    { value: '', label: 'All Statuses' },
    ...Object.values(MAINTENANCE_STATUSES).map((st) => ({
      value: st,
      label: st,
    })),
  ], []);

  const priorityOptions = useMemo(() => [
    { value: '', label: 'All Priorities' },
    ...Object.values(MAINTENANCE_PRIORITIES).map((pr) => ({
      value: pr,
      label: pr,
    })),
  ], []);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setErrorMsg('');

    try {
      const params = {};
      if (status) params.Status = status;
      if (priority) params.Priority = priority;
      if (fromDate) params.FromDate = fromDate;
      if (toDate) params.ToDate = toDate;

      const res = await apiService.getMaintenanceReport(params);
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.$values)
        ? res.$values
        : [];

      if (!list || list.length === 0) {
        setErrorMsg('No maintenance records found for the selected criteria.');
        setGenerating(false);
        return;
      }

      const defaultComp =
        selectedCompany ||
        companies.find((c) => c.isActive) ||
        companies[0] || {
          companyName: 'Jalaram Advertisers',
          addressLine1: 'Anand, Gujarat',
          mobileNo: '',
          gstin: '',
        };

      const html = buildMaintenancePDFHTML({
        company: defaultComp,
        statusFilter: status,
        priorityFilter: priority,
        fromDate,
        toDate,
        records: list,
        addressMap,
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
      console.error('Failed to generate maintenance report:', err);
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to generate maintenance report. Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          animation: 'modalIn 0.22s cubic-bezier(0.22,1,0.36,1) both',
          fontFamily: 'Nunito, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(4,158,223,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} color="#049edf" />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16.5,
                  fontWeight: 900,
                  color: '#1a1a2e',
                }}
              >
                Hoarding Maintenance Report PDF
              </h3>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#7878a0',
                }}
              >
                Select filters and company for the report
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9090a8',
              padding: 4,
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 10,
                color: '#dc2626',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Company Selection */}
          <div>
            <label
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: '#4a5568',
                marginBottom: 5,
                display: 'block',
              }}
            >
              Company Header <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <CompanyCombo
              value={selectedCompany?.companyID}
              onChange={setSelectedCompany}
              companies={companies}
              disabled={loadingCompanies}
            />
          </div>

          {/* Status & Priority Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: '#4a5568',
                  marginBottom: 5,
                  display: 'block',
                }}
              >
                Status (Optional)
              </label>
              <SelectCombo
                value={status}
                onChange={setStatus}
                options={statusOptions}
                placeholder="All Statuses"
                icon={Layers}
                color="#049edf"
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: '#4a5568',
                  marginBottom: 5,
                  display: 'block',
                }}
              >
                Priority (Optional)
              </label>
              <SelectCombo
                value={priority}
                onChange={setPriority}
                options={priorityOptions}
                placeholder="All Priorities"
                icon={Flag}
                color="#049edf"
              />
            </div>
          </div>

          {/* From Date & To Date Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: '#4a5568',
                  marginBottom: 5,
                  display: 'block',
                }}
              >
                From Date (Optional)
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  border: '1.5px solid #e0e7ff',
                  borderRadius: 10,
                  background: '#fff',
                }}
              >
                <Calendar size={14} color="#049edf" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontFamily: 'Nunito, sans-serif',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#1a1a2e',
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: '#4a5568',
                  marginBottom: 5,
                  display: 'block',
                }}
              >
                To Date (Optional)
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  border: '1.5px solid #e0e7ff',
                  borderRadius: 10,
                  background: '#fff',
                }}
              >
                <Calendar size={14} color="#049edf" />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontFamily: 'Nunito, sans-serif',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#1a1a2e',
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              background: '#f8f8fd',
              borderRadius: 10,
              fontSize: 11.5,
              color: '#64748b',
              lineHeight: 1.4,
              border: '1px solid #e0e7ff',
            }}
          >
            💡 <strong>Note:</strong> All filter parameters are optional. Leave fields blank to generate a comprehensive report of all maintenance requests.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            className="pg-btn-cancel"
            onClick={onClose}
            disabled={generating}
            style={{
              padding: '9px 18px',
              border: '1.5px solid #e0e7ff',
              borderRadius: 10,
              background: '#fff',
              color: '#4a5568',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            className="pg-btn-save"
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '9px 20px',
              border: 'none',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #049edf, #0284c7)',
              color: '#fff',
              fontWeight: 800,
              cursor: generating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(4, 158, 223, 0.35)',
            }}
          >
            {generating ? (
              <>
                <Loader2 size={15} className="pg-spin" /> Generating PDF…
              </>
            ) : (
              <>
                <FileText size={15} /> Generate PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
