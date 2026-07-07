import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import {
  Plus, Search, X, AlertCircle, Check, Edit2,
  RefreshCw, Calendar, ChevronUp, ChevronDown,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Loader2, FileText, Eye, ArrowLeft, Building2, User,
  IndianRupee, Clock, Trash2, ShieldCheck, MessageSquare,
  CreditCard, TrendingUp, MapPin, Tag, Percent, SlidersHorizontal,
  Users, Paperclip, Upload, Image, File, Download, AlertTriangle, GitMerge, ArrowLeftRight, ArrowUpDown,
} from 'lucide-react';
import { apiService, API_ROOT_URL } from '../api/api';
import './Common1.css';
import { useResizableColumns } from '../hooks/useResizableColumns';

const forceDownload = async (url, filename) => {
  try {
    let cleanUrl = url.split('?')[0];
    if (process.env.NODE_ENV === 'development' && cleanUrl.startsWith(API_ROOT_URL)) {
      cleanUrl = cleanUrl.replace(API_ROOT_URL, window.location.origin);
    }
    const downloadUrl = `${cleanUrl}?t=${Date.now()}`;
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers,
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    const localUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = localUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(localUrl);
  } catch (err) {
    console.error('Download failed, fallback to direct link', err);
    window.open(url, '_blank');
  }
};

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];
const STATUS_OPTIONS = ['Active', 'Expired', 'Terminated', 'Pending'];
function parseOccupancyError(err) {
  if (err?.response?.status !== 400) return null;
  const raw =
    err?.response?.data?.message ||
    err?.response?.data ||
    err?.message ||
    '';
  const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
  if (str.toLowerCase().includes('occupied')) return str.trim();
  return null;
}
const CONTRACT_COMPANY = {
  name: 'JALARAM AD',
  line1: '103/4/5/6, Drashti Arcade, Opp. Anand ITI',
  line2: 'Nr. Grid Crossing, Anand - 388001, GUJ. INDIA',
  phone: 'Parag Patel # 9428151123',
};

const CONTRACT_PDF_TERMS = [
  'Advance Payment & Purchase Order is Mandatory to start the campaign. Booking Cancellation will result in 20% penalty on booking amount.',
  'Printing & Mounting will be extra & GST @ 18% will be applicable extra.',
  'Site available date may change in case of present display Renewal. Also, site Availability changes every minute, please double check site available dates when you confirm the sites.',
  'When Printing, please keep 3 inches extra border on all four sides for all FL & NL Flex.',
  'From the date of receiving the flex, campaign execution will take 2 days in city and 4 days in upcountry. Please plan your campaign accordingly.',
  'Kindly ensure that your artwork is ready before confirming the sites. In case Design or Flex is undelivered within 5 days of confirmation, we will release the site and penalty for non-display period will be levied on negotiated rates.',
  'In case flex / vinyl / display material is damaged, torn or vandalised, it will be your responsibility to provide us with new flex.',
  'Renewal of site will only be entertained before 5 days of site expiry. Last moment renewal is not possible.',
];

// ── component ── (needs AlertTriangle, X from lucide — already imported)
function OccupancyWarningBanner({ messages, onDismiss }) {
  if (!messages || messages.length === 0) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '13px 16px', borderRadius: 12, marginBottom: 14,
      background: '#fffbeb', border: '1.5px solid #fbbf24',
      boxShadow: '0 2px 10px rgba(251,191,36,0.15)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'rgba(251,191,36,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertTriangle size={18} color="#d97706" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 900, color: '#92400e', marginBottom: messages.length > 1 ? 6 : 2 }}>
          {messages.length === 1 ? 'Hoarding Already Occupied' : `${messages.length} Hoardings Already Occupied`}
        </div>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, color: '#b45309', lineHeight: 1.5, marginTop: i > 0 ? 4 : 0 }}>
            {messages.length > 1 && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#d97706', marginTop: 7, flexShrink: 0 }} />}
            {msg}
          </div>
        ))}
        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 600, color: '#a16207', marginTop: 6 }}>
          Please choose a different date range or remove these hoardings.
        </div>
      </div>
      <button onClick={onDismiss} style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#d97706' }}>
        <X size={13} />
      </button>
    </div>
  );
}
const FILE_UPLOAD_TYPE_OPTIONS = [
  { value: 'Contract', label: 'Contract Document' },
  { value: 'Banner Design', label: 'Banner Design' },
  { value: 'Other', label: 'Other' },
];

const PAYMENT_FREQ_FALLBACK = [
  { value: 1, label: 'Monthly' },
  { value: 2, label: 'Quarterly' },
  { value: 3, label: 'Half-Yearly' },
  { value: 4, label: 'Yearly' },
];

const EMPTY_FORM = {
  customerID: '',
  hoardingID: '',
  startDate: '',
  endDate: '',
  contractOrigValue: '',
  paymentFreqID: '',
  amountPerFreq: '',
  advancePaid: '',
  status: 'Active',
  discountAmount: '',
  adjustmentAmount: '',
  contractFinalValue: '',
  comments: '',
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
  if (v === '' || v == null || isNaN(Number(v))) return '—';
  return '₹' + Number(v).toLocaleString('en-IN');
}
function freqLabel(id, freqs) {
  return freqs.find(f => String(f.value) === String(id))?.label || '—';
}
function statusStyle(s) {
  switch (s) {
    case 'Active': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
    case 'Expired': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    case 'Terminated': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    case 'Pending': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    default: return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
  }
}
function deduplicateHoardings(hoardings) {
  const map = new Map();
  for (const h of hoardings) {
    const code = h.hoardingCode;
    if (!map.has(code)) { map.set(code, h); }
    else {
      const existing = map.get(code);
      const ed = existing.effdt ? new Date(existing.effdt).getTime() : existing.hoardingID;
      const cd = h.effdt ? new Date(h.effdt).getTime() : h.hoardingID;
      if (cd > ed) map.set(code, h);
    }
  }
  return Array.from(map.values());
}
function hoardingLabel(h) {
  if (!h) return '';
  const parts = [h.hoardingCode];
  if (h.material) parts.push(h.material);
  if (h.width && h.height) parts.push(`${h.width}x${h.height}`);
  return parts.filter(Boolean).join(' - ');
}
function normalizeContract(raw) {
  return {
    customerContractID: raw.customerContractID ?? raw.CustomerContractID,
    customerID: raw.customerID ?? raw.CustomerID,
    // hoardingID: raw.hoardingID ?? raw.HoardingID,
    startDate: (raw.startDate ?? raw.StartDate ?? '').split('T')[0],
    endDate: (raw.endDate ?? raw.EndDate ?? '').split('T')[0],
    contractOrigValue: raw.contractOrigValue ?? raw.ContractOrigValue ?? '',
    paymentFreqID: raw.paymentFreqID ?? raw.PaymentFreqID ?? '',
    amountPerFreq: raw.amountPerFreq ?? raw.AmountPerFreq ?? '',
    advancePaid: raw.advancePaid ?? raw.AdvancePaid ?? '',
    status: raw.status ?? raw.Status ?? '',
    discountAmount: raw.discountAmount ?? raw.DiscountAmount ?? '',
    adjustmentAmount: raw.adjustmentAmount ?? raw.AdjustmentAmount ?? '',
    contractFinalValue: raw.contractFinalValue ?? raw.ContractFinalValue ?? '',
    comments: raw.comments ?? raw.Comments ?? '',
    lastUpdatedBy: raw.lastUpdatedBy ?? raw.LastUpdatedBy ?? '',
    lastUpdateDttm: raw.lastUpdateDttm ?? raw.LastUpdateDttm ?? '',
  };
}
function normalizeAttach(raw) {
  return {
    custContractAttachID: raw.custContractAttachID ?? raw.CustContractAttachID,
    customerContractID: raw.customerContractID ?? raw.CustomerContractID,
    ownerID: raw.ownerID ?? raw.OwnerID ?? 0,
    hoardingID: raw.hoardingID ?? raw.HoardingID ?? 0,
    fileUploadType: raw.fileUploadType ?? raw.FileUploadType ?? '',
    contractFilePath: raw.contractFilePath ?? raw.ContractFilePath ?? '',
    contractFilename: raw.contractFilename ?? raw.ContractFilename ?? '',
    lastUpdateDttm: raw.lastUpdateDttm ?? raw.LastUpdateDttm ?? '',
  };
}
function isImageFile(filename) {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename || '');
}
function isPdfFile(filename) {
  return /\.pdf$/i.test(filename || '');
}
function fileTypeIcon(filename) {
  if (isImageFile(filename)) return <Image size={16} color="#6c63ff" />;
  if (isPdfFile(filename)) return <FileText size={16} color="#dc2626" />;
  return <File size={16} color="#049edf" />;
}
function uploadTypeStyle(type) {
  switch (type) {
    case 'Contract': return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    case 'Banner Design': return { bg: '#f5f3ff', color: '#6c63ff', border: '#ddd6fe' };
    default: return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
  }
}
function detectHoardingConflict(form, contracts, currentContractID) {
  if (!form.hoardingID || !form.startDate || !form.endDate) return null;
  const fStart = new Date(form.startDate);
  const fEnd = new Date(form.endDate);
  const conflict = contracts.find(c => {
    if (Number(c.hoardingID) !== Number(form.hoardingID)) return false;
    if (currentContractID && c.customerContractID === currentContractID) return false;
    if (c.status === 'Expired' || c.status === 'Terminated') return false;
    const cStart = new Date(c.startDate);
    const cEnd = new Date(c.endDate);
    return fStart <= cEnd && fEnd >= cStart;
  });
  return conflict || null;
}

function validateForm(form, contracts = [], currentContractID = null, skipHoarding = false) {
  const e = {};
  if (!form.customerID) e.customerID = 'Customer is required';
  // if (!skipHoarding && !form.hoardingID) e.hoardingID = 'Hoarding is required';
  if (!form.startDate) e.startDate = 'Start date is required';
  if (!form.endDate) e.endDate = 'End date is required';
  if (form.startDate && form.endDate && form.endDate <= form.startDate)
    e.endDate = 'End date must be after start date';

  // ── Double-booking check ──────────────────────────────────────────
  if (!e.hoardingID && !e.startDate && !e.endDate) {
    const conflict = detectHoardingConflict(form, contracts, currentContractID);
    if (conflict) {
      e.hoardingID = `Already booked ${fmtDate(conflict.startDate)} → ${fmtDate(conflict.endDate)} (Contract #${conflict.customerContractID})`;
      e.startDate = 'Overlaps with an existing booking';
      e.endDate = 'Overlaps with an existing booking';
    }
  }

  if (form.contractOrigValue === '' || form.contractOrigValue == null)
    e.contractOrigValue = 'Contract value is required';
  else if (isNaN(Number(form.contractOrigValue)) || Number(form.contractOrigValue) < 0)
    e.contractOrigValue = 'Must be a valid positive number';
  if (!form.paymentFreqID) e.paymentFreqID = 'Payment frequency is required';
  if (form.amountPerFreq === '' || form.amountPerFreq == null)
    e.amountPerFreq = 'Amount per frequency is required';
  else if (isNaN(Number(form.amountPerFreq)) || Number(form.amountPerFreq) < 0)
    e.amountPerFreq = 'Must be a valid positive number';
  if (!form.status) e.status = 'Status is required';
  return e;
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
function normalizeQuotation(raw) {
  return {
    quotationID: Number(raw.quotationID ?? raw.QuotationID ?? 0),
    quotationRevisionNumber: Number(raw.quotationRevisionNumber ?? raw.QuotationRevisionNumber ?? 0),
    customerID: Number(raw.customerID ?? raw.CustomerID ?? 0),
    quotationNumber: raw.quotationNumber ?? raw.QuotationNumber ?? '',
    cGSTPercent: Number(raw.cGSTPercent ?? raw.CGSTPercent ?? 9),
    sGSTPercent: Number(raw.sGSTPercent ?? raw.SGSTPercent ?? 9),
  };
}

function getContractGst(contract, quotations = []) {
  if (!contract || !contract.comments) return { cgstPct: 9, sgstPct: 9 };
  const match = contract.comments.match(/From Quotation\s+([^\s]+)(?:\s+Rev\.(\d+))?/i);
  if (!match) return { cgstPct: 9, sgstPct: 9 };

  const quotNoOrID = match[1].trim().toLowerCase();
  const revNo = match[2] ? Number(match[2]) : null;

  const found = quotations.find(q => {
    const qNo = String(q.quotationNumber).trim().toLowerCase();
    const qID = String(q.quotationID);
    const isNoMatch = qNo === quotNoOrID || qNo.replace(/[^a-z0-9]/g, '') === quotNoOrID.replace(/[^a-z0-9]/g, '');
    const isIdMatch = qID === quotNoOrID;

    if (!(isNoMatch || isIdMatch)) return false;
    if (revNo !== null) {
      return Number(q.quotationRevisionNumber) === revNo;
    }
    return true;
  });

  if (found) {
    return {
      cgstPct: Number(found.cGSTPercent ?? 9),
      sgstPct: Number(found.sGSTPercent ?? 9)
    };
  }
  return { cgstPct: 9, sgstPct: 9 };
}

// Change the function signature — add `terms` parameter:
function buildContractPDFHTML({ company, customer, contract,
  hoardingItems, photoUrlMap, photoSelections, terms = [], cgstPct = 9, sgstPct = 9 }) {

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const fmtD = (d) => {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

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
    .cov-name{font-size:30px;font-weight:700;margin-bottom:8px;}
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
 
    /* ══ HOARDING PAIR (2 per page) ══
       pair-wrap fills remaining space after the header.
       Each .hrd-section gets flex:1 = exactly half that space.
       When photo is ON: image fills flex:1, details is fixed.
       When photo is OFF: only details shown, no empty space.      */
    .pair-wrap{
      flex:1;min-height:0;
      display:flex;flex-direction:column;
      gap:0;
    }
    .hrd-section{
      flex:1;min-height:0;
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
 
    /* ══ TERMS (all on 1 page) ══ */
    .terms-hdr{
      font-size:13px;font-weight:700;
      padding-bottom:6px;border-bottom:2.5px solid #000;
      margin-bottom:11px;flex-shrink:0;
    }
    .terms-ol{list-style:decimal;padding-left:17px;}
    .terms-ol li{font-size:11px;line-height:1.72;margin-bottom:5px;color:#111;}
    .terms-foot{
      border-top:1px solid #ccc;padding-top:8px;margin-top:auto;
      display:flex;justify-content:space-between;
      font-size:10.5px;color:#555;font-weight:600;flex-shrink:0;
    }
 
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

  /* shared page header */
  const ph = `
    <div class="ph">
      <span class="ph-co">${company.name}</span>
      <span class="ph-r">${customer.customerName}<br>${today}</span>
    </div>`;

  /* details box helper */
  const box = (item, idx) => `
    <div class="hrd-box">
      <div class="hrd-title">
        ${idx + 1})&nbsp;${item.hoardingCode}
        ${item.address ? `&nbsp;&mdash;&nbsp;${item.address}` : ''}
        ${item.size ? `&nbsp;&mdash;&nbsp;${item.size} ft` : ''}
        ${item.material ? `&nbsp;&mdash;&nbsp;${item.material}` : ''}
      </div>
      <div class="hrd-row">
        <div class="hrd-cell"><span class="hrd-lbl">Media Type:</span>&nbsp;${item.hoardingTypeName || 'Hoarding'}</div>
        <div class="hrd-cell">
          <span class="hrd-lbl">Availability:</span>&nbsp;
          <span class="hrd-green">${item.contractStatus || 'Available Now'}</span>
        </div>
        ${item.monthlyRent > 0 ? `
        <div class="hrd-cell" style="flex:0 0 100%;margin-top:2px;">
          <span class="hrd-lbl">Monthly Rent:</span>&nbsp;
          <span class="hrd-red">&#8377;${Number(item.monthlyRent).toLocaleString('en-IN')}</span>
        </div>` : ''}
      </div>
    </div>`;

  /* single hoarding section */
  const section = (item, idx) => {
    const photoOn = photoSelections[item.hoardingID] !== false;
    const photoUrl = photoUrlMap[item.hoardingID];

    /* Photo ON + URL exists → show image (plain <img src>, no auth needed) */
    if (photoOn && photoUrl) {
      return `
        <div class="hrd-section">
          <div class="hrd-photo">
            <img src="${photoUrl}" alt="${item.hoardingCode}" />
          </div>
          ${box(item, idx)}
        </div>`;
    }

    /* Photo ON but no image uploaded → small grey strip */
    if (photoOn && !photoUrl) {
      return `
        <div class="hrd-section">
          <div style="
            flex:1;min-height:0;background:#f5f5f5;
            border:1.5px dashed #ccc;margin-bottom:4px;
            display:flex;align-items:center;justify-content:center;
            font-size:11px;color:#aaa;gap:6px;
          ">📷&nbsp;No photo uploaded for ${item.hoardingCode}</div>
          ${box(item, idx)}
        </div>`;
    }

    /* Photo OFF → ONLY the details box, zero empty space */
    return `
      <div class="hrd-section" style="flex:none;">
        ${box(item, idx)}
      </div>`;
  };

  /* ── COVER ── */
  const cover = `
    <div class="page cov">
      <div class="cov-top">
        <div>
          <div class="cov-co">${company.name}</div>
          <div class="cov-addr">${company.line1}<br>${company.line2}</div>
        </div>
        <div class="cov-date">${today}</div>
      </div>
      <div class="cov-body">
        <div class="cov-name">${customer.customerName}</div>
        ${customer.authorizedName
      ? `<div class="cov-phone" style="font-weight: 700; font-size: 15px; margin-bottom: 6px;">Authorized Person: ${customer.authorizedName}</div>`
      : ''}
        ${customer.phone1
      ? `<div class="cov-phone">${customer.phone1}</div>` : ''}
        ${(customer.addressLine1 || customer.city)
      ? `<div class="cov-phone" style="font-size:12px;color:#555;margin-top:4px;">
               ${[customer.addressLine1, customer.city, customer.district].filter(Boolean).join(', ')}
             </div>` : ''}
        ${contract ? (() => {
      const finalValNum = Number(contract.contractFinalValue || contract.contractOrigValue || 0);
      const cgstAmt = Math.round((finalValNum * cgstPct) / 100);
      const sgstAmt = Math.round((finalValNum * sgstPct) / 100);
      const totalContractVal = finalValNum + cgstAmt + sgstAmt;

      return `
          <div class="cov-info">
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
              <tr>
                <td style="width:180px; font-weight:bold; padding:2px 0;">Contract Period</td>
                <td style="padding:2px 0;">: ${fmtD(contract.startDate)} &rarr; ${fmtD(contract.endDate)}</td>
              </tr>
              <tr>
                <td style="font-weight:bold; padding:2px 0;">Contract Value (Base)</td>
                <td style="padding:2px 0;">: &#8377;${finalValNum.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="font-weight:bold; padding:2px 0;">CGST (${cgstPct}%)</td>
                <td style="padding:2px 0;">: &#8377;${cgstAmt.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="font-weight:bold; padding:2px 0;">SGST (${sgstPct}%)</td>
                <td style="padding:2px 0;">: &#8377;${sgstAmt.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="font-weight:bold; padding:2px 0;">Total Value (incl. GST)</td>
                <td style="padding:2px 0; font-weight:bold;">: &#8377;${totalContractVal.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="font-weight:bold; padding:2px 0;">Total Hoardings</td>
                <td style="padding:2px 0;">: ${hoardingItems.length}</td>
              </tr>
            </table>
          </div>`;
    })() : ''}
      </div>
      <div class="cov-foot">
        <span>${company.phone}</span>
        <span>${hoardingItems.length} Hoarding${hoardingItems.length !== 1 ? 's' : ''}</span>
      </div>
    </div>`;

  /* ── HOARDING PAGES (2 per page) ── */
  const hrdPages = [];
  for (let i = 0; i < hoardingItems.length; i += 2) {
    const a = hoardingItems[i];
    const b = hoardingItems[i + 1];
    hrdPages.push(`
      <div class="page" style="display:flex;flex-direction:column;">
        ${ph}
        <div class="pair-wrap">
          ${section(a, i)}
          ${b ? section(b, i + 1) : ''}
        </div>
      </div>`);
  }

  /* ── TERMS (all 8 on 1 page) ── */
  /* ── TERMS ── */
  // const termsPage = terms.length === 0 ? '' : `
  // <div class="page" style="display:flex;flex-direction:column;">
  //   ${ph}
  //   <div class="terms-hdr">Terms and Conditions &mdash;</div>
  //   <ol class="terms-ol">
  //     ${terms.map(t => `<li>${t}</li>`).join('')}
  //   </ol>
  //   <div class="terms-foot">
  //     <span>${customer.authorizedName || customer.customerName}<br>${company.phone}</span>
  //   </div>
  // </div>`;
  const termsPage = terms.length === 0 ? '' : `
  <div class="page" style="display:flex;flex-direction:column;">
    ${ph}
    <div class="terms-hdr">Terms and Conditions &mdash;</div>
    <ol class="terms-ol">
      ${terms.map(t => `<li>${t}</li>`).join('')}
    </ol>
    <div class="terms-foot">
      <span>${company.phone}</span>
    </div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Contract &mdash; ${customer.customerName}</title>
  <style>${css}</style>
</head>
<body style="padding-top:44px;">
  <div id="dl-bar">
    <span><strong>${company.name}</strong> &mdash; ${customer.customerName}</span>
    <button class="dl-btn" onclick="window.print()">&#8681; Download / Print PDF</button>
  </div>
  ${cover}
  ${hrdPages.join('')}
  ${termsPage}
</body>
</html>`;
}
/* ─────────────────────────────────────────
   SMALL HELPERS
───────────────────────────────────────── */
function FieldLabel({ label, required, optional }) {
  return (
    <label className="pg-field-label">
      {label}
      {required && <span className="pg-field-label__required"> *</span>}
      {optional && <span className="pg-field-label__optional"> (optional)</span>}
    </label>
  );
}
function InputWrap({ error, icon: Icon, children }) {
  return (
    <div className={`pg-field-wrap ${error ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}>
      {Icon && <Icon size={14} color={error ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />}
      {children}
    </div>
  );
}
function FieldError({ msg }) {
  return msg ? (
    <div className="pg-field-error">
      <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} /><span>{msg}</span>
    </div>
  ) : null;
}

/* ─────────────────────────────────────────
   CURRENCY INPUT
───────────────────────────────────────── */
function CurrencyInput({ value, onChange, placeholder, readOnly }) {
  const toDisplay = (raw) => {
    if (raw === '' || raw == null) return '';
    const n = Number(String(raw).replace(/,/g, ''));
    return isNaN(n) ? String(raw).replace(/,/g, '') : n.toLocaleString('en-IN');
  };
  const handleChange = (e) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) onChange(raw);
  };
  return (
    <input
      className="pg-field-input"
      value={toDisplay(value)}
      onChange={handleChange}
      placeholder={placeholder}
      inputMode="numeric"
      autoComplete="off"
      readOnly={readOnly}
      style={readOnly ? { cursor: 'not-allowed', color: '#049edf', fontWeight: 700 } : {}}
    />
  );
}

/* ═══════════════════════════════════════════
   COMBO DROPDOWN
═══════════════════════════════════════════ */
function ComboDropdown({ value, onChange, onBlur, hasError, placeholder, icon: Icon, options }) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setFocusedIndex(-1); onBlur && onBlur();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onBlur]);

  const select = (opt) => { onChange(opt.value); setOpen(false); setFocusedIndex(-1); };
  const clear = (e) => { e.stopPropagation(); onChange(''); setOpen(false); setFocusedIndex(-1); onBlur && onBlur(); };

  const handleKeyDown = (e) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (focusedIndex >= 0 && options[focusedIndex]) select(options[focusedIndex]); }
    else if (e.key === 'Escape') { setOpen(false); setFocusedIndex(-1); onBlur && onBlur(); }
  };

  return (
    <div className="lc-search-widget" ref={wrapRef}>
      <div className={`pg-field-wrap ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(o => !o)} tabIndex={0} onKeyDown={handleKeyDown}>
        {Icon && <Icon size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />}
        <span style={{ flex: 1, fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: selected ? 700 : 500, color: selected ? '#1a1a2e' : '#b0b0c8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
          {selected ? selected.label : placeholder}
        </span>
        {selected
          ? <X size={13} style={{ flexShrink: 0, cursor: 'pointer', color: '#c0c0d8' }} onClick={clear} />
          : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>
      {open && (
        <div className="lc-dropdown">
          {options.map((opt, idx) => (
            <div key={opt.value}
              className={`lc-dropdown-option${String(opt.value) === String(value) ? ' lc-dropdown-option--focused' : ''}${idx === focusedIndex ? ' lc-dropdown-option--focused' : ''}`}
              onMouseEnter={() => setFocusedIndex(idx)} onMouseDown={() => select(opt)}>
              <div className="lc-dropdown-option__name" style={{ color: String(opt.value) === String(value) ? '#049edf' : '#1a1a2e' }}>{opt.label}</div>
              {String(opt.value) === String(value) && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CUSTOMER SEARCH WIDGET
═══════════════════════════════════════════ */
function CustomerSearchWidget({ customers, value, onChange, error, disabled }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapRef = useRef(null);

  const selected = customers.find(c => c.customerID === Number(value) || c.customerID === value);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(customers.filter(c =>
      (c.customerName || '').toLowerCase().includes(q) ||
      (c.phone1 || '').toLowerCase().includes(q) ||
      String(c.customerID).includes(q)
    ).slice(0, 10));
    setFocusedIndex(-1);
  }, [query, customers]);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setFocusedIndex(-1); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && results[focusedIndex]) {
        const c = results[focusedIndex];
        onChange(c.customerID); setQuery(''); setOpen(false); setResults([]); setFocusedIndex(-1);
      }
    } else if (e.key === 'Escape') { setOpen(false); setFocusedIndex(-1); }
  };

  return (
    <div className="lc-search-widget" ref={wrapRef}>
      {!disabled && (
        <div className={`pg-field-wrap ${error ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
          style={{ cursor: 'text' }} onClick={() => setOpen(true)}>
          <Search size={14} color={error ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
          <input className="pg-field-input" placeholder="Search customer by name, phone or ID..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off" />
          {query && <X size={12} style={{ cursor: 'pointer', color: '#c0c0d8', flexShrink: 0 }}
            onClick={e => { e.stopPropagation(); setQuery(''); setResults([]); setFocusedIndex(-1); }} />}
        </div>
      )}
      {open && results.length > 0 && (
        <div className="lc-dropdown">
          {results.map((c, idx) => (
            <div key={c.customerID}
              className={`lc-dropdown-option${idx === focusedIndex ? ' lc-dropdown-option--focused' : ''}`}
              onMouseEnter={() => setFocusedIndex(idx)}
              onMouseDown={() => { onChange(c.customerID); setQuery(''); setOpen(false); setResults([]); setFocusedIndex(-1); }}>
              <div className="lc-dropdown-option__name">
                <Users size={12} /> {c.customerName}
                <span style={{ color: '#b0b0c8', fontWeight: 600, fontSize: 11, marginLeft: 8 }}>ID: {c.customerID}</span>
              </div>
              {c.phone1 && <div className="lc-dropdown-option__sub">{c.phone1}</div>}
            </div>
          ))}
        </div>
      )}
      {open && query.trim() && results.length === 0 && (
        <div className="lc-dropdown">
          <div className="lc-dropdown-empty"><Users size={18} /><span>No customers found</span></div>
        </div>
      )}
      {value && selected && (
        <div className="lc-selected-card">
          <div className="lc-selected-card__icon"><Users size={15} color="#049edf" /></div>
          <div className="lc-selected-card__info">
            <div className="lc-selected-card__name">{selected.customerName}</div>
            {selected.phone1 && <div className="lc-selected-card__sub">{selected.phone1}</div>}
          </div>
          {!disabled && (
            <button className="lc-selected-card__clear" onClick={() => { onChange(''); setQuery(''); }} title="Clear">
              <X size={12} />
            </button>
          )}
        </div>
      )}
      {value && !selected && (
        <div className="lc-selected-card">
          <div className="lc-selected-card__icon"><Users size={15} color="#049edf" /></div>
          <div className="lc-selected-card__info"><div className="lc-selected-card__name">Customer ID: {value}</div></div>
          {!disabled && <button className="lc-selected-card__clear" onClick={() => onChange('')}><X size={12} /></button>}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   HOARDING LOOKUP MODAL
═══════════════════════════════════════════ */
function HoardingLookupModal({ hoardings, sites, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [sortK, setSortK] = useState('hoardingCode');
  const [sortD, setSortD] = useState('asc');
  const inputRef = useRef(null);

  const siteMap = Object.fromEntries(sites.map(s => [s.siteID, s]));

  const filtered = hoardings.filter(h => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const site = siteMap[h.siteID];
    const addr = [site?.addressLine1, site?.addressLine2, site?.city, site?.district].filter(Boolean).join(' ').toLowerCase();
    return (
      (h.hoardingCode || '').toLowerCase().includes(q) ||
      (h.material || '').toLowerCase().includes(q) ||
      (h.status || '').toLowerCase().includes(q) ||
      addr.includes(q) ||
      String(h.hoardingID).includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = String(a[sortK] ?? '').toLowerCase();
    const bv = String(b[sortK] ?? '').toLowerCase();
    return sortD === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const handleSort = (key) => { if (sortK === key) setSortD(d => d === 'asc' ? 'desc' : 'asc'); else { setSortK(key); setSortD('asc'); } };

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const hSt = (s) => {
    switch (s) {
      case 'Active': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'Inactive': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'Under Maintenance': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
      default: return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
    }
  };

  return ReactDOM.createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99997, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 820, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg,#049edf,#0284c7)', padding: '20px 24px 16px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 17, color: '#fff' }}>Select Hoarding</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>{hoardings.length} hoarding{hoardings.length !== 1 ? 's' : ''} available</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #f0f0f8', flexShrink: 0, background: '#fafafe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid #e8e8f4', borderRadius: 10, padding: '9px 14px' }}>
            <Search size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input ref={inputRef} style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: 'none' }}
              placeholder="Search by code, material, city or status…" value={query} onChange={e => setQuery(e.target.value)} />
            {query && <X size={13} style={{ cursor: 'pointer', color: '#c0c0d8', flexShrink: 0 }} onClick={() => setQuery('')} />}
          </div>
          {query && <div style={{ marginTop: 6, fontFamily: 'Nunito, sans-serif', fontSize: 11.5, color: '#9090a8', fontWeight: 600 }}>{sorted.length} result{sorted.length !== 1 ? 's' : ''} for "{query}"</div>}
        </div>
        {sorted.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
            <Building2 size={40} color="#d0d0e8" />
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#9090a8', fontSize: 14 }}>{query ? `No hoardings match "${query}"` : 'No hoardings available'}</div>
          </div>
        )}
        {sorted.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: '#f8f8fd' }}>
                  {[{ key: 'hoardingCode', label: 'Code' }, { key: 'material', label: 'Material' }, { key: null, label: 'Size' }, { key: null, label: 'Site / Address' }, { key: 'status', label: 'Status' }, { key: 'monthlyRent', label: 'Monthly Rent' }, { key: null, label: '' }].map((col, i) => (
                    <th key={i} onClick={() => col.key && handleSort(col.key)} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#7878a0', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1.5px solid #e8e8f4', cursor: col.key ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {col.label}
                        {col.key && <span style={{ display: 'flex', flexDirection: 'column' }}><ChevronUp size={9} color={sortK === col.key && sortD === 'asc' ? '#049edf' : '#d0d0e4'} /><ChevronDown size={9} color={sortK === col.key && sortD === 'desc' ? '#049edf' : '#d0d0e4'} style={{ marginTop: -2 }} /></span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((h, idx) => {
                  const site = siteMap[h.siteID];
                  const addr = site ? [site.addressLine1, site.city, site.district].filter(Boolean).join(', ') : `Site ${h.siteID}`;
                  const st = hSt(h.status);
                  return (
                    <tr key={h.hoardingID} onClick={() => onSelect(h)} style={{ cursor: 'pointer', background: idx % 2 === 0 ? '#fff' : '#fafafe', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f8ff'} onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafe'}>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8' }}>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 13, color: '#049edf' }}>{h.hoardingCode}</div>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#b0b0c8', fontWeight: 600, marginTop: 1 }}>ID: {h.hoardingID}</div>
                      </td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8' }}><span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#4a5568' }}>{h.material || '—'}</span></td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8', whiteSpace: 'nowrap' }}>
                        {h.width && h.height ? (<><div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#4a5568' }}>{h.width} × {h.height} ft</div><div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#b0b0c8', fontWeight: 600 }}>{h.width * h.height} sq ft</div></>) : <span style={{ color: '#c0c0d8' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8', maxWidth: 200 }}>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={addr}>
                          <MapPin size={11} color="#c0c0d8" style={{ marginRight: 4, verticalAlign: 'middle' }} />{addr}
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: 11, fontWeight: 800, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}>{h.status || '—'}</span>
                      </td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800, color: '#1a1a2e' }}>{h.monthlyRent ? fmtCurrency(h.monthlyRent) : '—'}</span>
                      </td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8', textAlign: 'right' }}>
                        <button onClick={() => onSelect(h)} style={{ padding: '6px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#049edf,#0284c7)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(4,158,223,0.3)', whiteSpace: 'nowrap' }}>
                          <Check size={12} /> Select
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafe', flexShrink: 0 }}>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600 }}>Click a row or <strong>Select</strong> to choose a hoarding</span>
          <button onClick={onClose} className="pg-btn-cancel" style={{ fontSize: 12 }}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   HOARDING PICKER FIELD
═══════════════════════════════════════════ */
function HoardingPickerField({ hoardings, sites, value, onChange, error, disabled }) {
  const [modalOpen, setModalOpen] = useState(false);
  const selected = hoardings.find(h => h.hoardingID === Number(value) || h.hoardingID === value);
  const siteMap = Object.fromEntries(sites.map(s => [s.siteID, s]));

  const hSt = selected?.status ? (() => {
    switch (selected.status) {
      case 'Active': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'Inactive': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'Under Maintenance': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
      default: return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
    }
  })() : null;

  return (
    <div>
      {!disabled && (
        <button type="button" onClick={() => setModalOpen(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${error ? '#ef4444' : '#e8e8f4'}`, background: '#fff', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontSize: 13, color: value ? '#1a1a2e' : '#b0b0c8', fontWeight: value ? 700 : 500, boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none', transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#049edf'}
          onMouseLeave={e => e.currentTarget.style.borderColor = error ? '#ef4444' : '#e8e8f4'}>
          <Building2 size={14} color={error ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, textAlign: 'left' }}>
            {value
              ? (selected ? `${selected.hoardingCode}${selected.width && selected.height ? ` · ${selected.width}×${selected.height} ft` : ''}` : `Hoarding ID: ${value}`)
              : 'Click to browse & select hoarding…'}
          </span>
          {value
            ? <X size={13} color="#c0c0d8" style={{ flexShrink: 0 }} onClick={e => { e.stopPropagation(); onChange(''); }} />
            : <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
        </button>
      )}
      {value && selected && (() => {
        const site = siteMap[selected.siteID];
        const addr = site ? [site.addressLine1, site.city, site.district].filter(Boolean).join(', ') : '';
        return (
          <div className="lc-selected-card" style={{ marginTop: 8 }}>
            <div className="lc-selected-card__icon"><Building2 size={15} color="#6c63ff" /></div>
            <div className="lc-selected-card__info" style={{ flex: 1 }}>
              <div className="lc-selected-card__name" style={{ color: '#6c63ff' }}>
                {selected.hoardingCode}
                {selected.width && selected.height && <span style={{ color: '#9090a8', fontWeight: 500, marginLeft: 8, fontSize: 12 }}>{selected.width}×{selected.height} ft</span>}
              </div>
              <div className="lc-selected-card__sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 3 }}>
                {selected.material && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#7878a0' }}><Tag size={10} /> {selected.material}</span>}
                {hSt && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 10, background: hSt.bg, color: hSt.color, border: `1px solid ${hSt.border}`, fontSize: 10.5, fontWeight: 800 }}>{selected.status}</span>}
                {selected.monthlyRent && <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>{fmtCurrency(selected.monthlyRent)}/mo</span>}
                {addr && <span style={{ fontSize: 11, color: '#9090a8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} /> {addr}</span>}
              </div>
            </div>
            {!disabled && (
              <>
                <button onClick={() => setModalOpen(true)} style={{ background: 'rgba(4,158,223,0.08)', border: '1px solid rgba(4,158,223,0.2)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', color: '#049edf', fontSize: 11, fontWeight: 800, fontFamily: 'Nunito, sans-serif', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                  <RefreshCw size={11} /> Change
                </button>
                <button className="lc-selected-card__clear" onClick={() => onChange('')} title="Clear"><X size={12} /></button>
              </>
            )}
          </div>
        );
      })()}
      {modalOpen && <HoardingLookupModal hoardings={hoardings} sites={sites} onSelect={(h) => { onChange(h.hoardingID); setModalOpen(false); }} onClose={() => setModalOpen(false)} />}
    </div>
  );
}

/* ─────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────── */
function DeleteConfirmModal({ contract, onConfirm, onCancel }) {
  return (
    <div className="pg-overlay" onClick={onCancel}>
      <div className="exp-delete-modal" onClick={e => e.stopPropagation()}>
        <div className="exp-delete-modal__icon"><Trash2 size={22} color="#dc2626" /></div>
        <div className="exp-delete-modal__title">Delete Contract?</div>
        <div className="exp-delete-modal__sub">Contract <strong>#{contract.customerContractID}</strong> will be permanently removed.</div>
        <div className="exp-delete-modal__actions">
          <button className="pg-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="exp-btn-delete-confirm" onClick={onConfirm}><Trash2 size={13} /> Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ATTACHMENT DELETE CONFIRM MODAL
═══════════════════════════════════════════ */
function AttachDeleteModal({ attach, onConfirm, onCancel }) {
  return ReactDOM.createPortal(
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, padding: '28px 28px 22px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fef2f2', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <Trash2 size={22} color="#dc2626" />
        </div>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 17, color: '#1a1a2e', marginBottom: 6 }}>Delete Attachment?</div>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 22, lineHeight: 1.5 }}>
          <strong style={{ color: '#374151' }}>{attach?.contractFilename || 'This file'}</strong> will be permanently removed.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="pg-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="exp-btn-delete-confirm" onClick={onConfirm} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Trash2 size={13} /> Delete</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   HOARDING DELETE CONFIRM MODAL
═══════════════════════════════════════════ */
function HoardingDeleteConfirmModal({ hoardingCode, onConfirm, onCancel }) {
  return ReactDOM.createPortal(
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, padding: '28px 28px 22px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fef2f2', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <Trash2 size={22} color="#dc2626" />
        </div>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 17, color: '#1a1a2e', marginBottom: 6 }}>Remove Hoarding?</div>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 22, lineHeight: 1.5 }}>
          Are you sure you want to remove hoarding <strong style={{ color: '#374151' }}>{hoardingCode}</strong> from this contract?
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="pg-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="exp-btn-delete-confirm" onClick={onConfirm} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Trash2 size={13} /> Remove</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   MERGE DELETE CONFIRM MODAL
═══════════════════════════════════════════ */
function MergeDeleteConfirmModal({ hoardingCode, onConfirm, onCancel }) {
  return ReactDOM.createPortal(
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, padding: '28px 28px 22px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fef2f2', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <Trash2 size={22} color="#dc2626" />
        </div>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 17, color: '#1a1a2e', marginBottom: 6 }}>Remove from Merge?</div>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 22, lineHeight: 1.5 }}>
          Are you sure you want to remove hoarding <strong style={{ color: '#374151' }}>{hoardingCode}</strong> from the merge?
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="pg-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="exp-btn-delete-confirm" onClick={onConfirm} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Trash2 size={13} /> Remove</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   ATTACHMENT SECTION
═══════════════════════════════════════════ */
async function fetchImageAsBase64(url) {
  if (!url) return null;
  const token = localStorage.getItem('authToken');
  const blobToBase64 = (blob) =>
    new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  try {
    const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    if (res.ok) return blobToBase64(await res.blob());
  } catch { /* fall through */ }
  return null;
}

function AttachmentSection({ customerContractID, hoardingID, ownerID, onAttachmentsChange, attachments: attachmentsFromProps, setAttachments: setAttachmentsFromProps, setDeletedAttachIDs: setDeletedAttachIDsFromProps, hideDownload = false }) {
  const [localAttaches, setLocalAttaches] = useState([]);
  const attachments = attachmentsFromProps || localAttaches;
  const setAttachments = setAttachmentsFromProps || setLocalAttaches;

  const [loading, setLoading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [newFile, setNewFile] = useState(null);
  const [newType, setNewType] = useState('');
  const [typeErr, setTypeErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadOk, setUploadOk] = useState(false);

  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceType, setReplaceType] = useState('');
  const [replaceErr, setReplaceErr] = useState('');
  const [replacing, setReplacing] = useState(false);

  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);

  // Use a ref so fetchAttachments never needs onAttachmentsChange in its deps
  // This prevents the infinite re-render loop
  const onAttachmentsChangeRef = useRef(onAttachmentsChange);
  useEffect(() => { onAttachmentsChangeRef.current = onAttachmentsChange; }, [onAttachmentsChange]);

  const fetchAttachments = useCallback(async () => {
    if (attachmentsFromProps) {
      onAttachmentsChangeRef.current?.(attachmentsFromProps);
      return;
    }
    if (!customerContractID) return;
    setLoading(true);
    try {
      const list = await apiService.getCustContractAttachments(customerContractID);
      const normalized = (Array.isArray(list) ? list : []).map(normalizeAttach);
      setAttachments(normalized);
      onAttachmentsChangeRef.current?.(normalized);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [customerContractID, attachmentsFromProps]); // ← onAttachmentsChange intentionally NOT here (using ref instead)

  useEffect(() => { fetchAttachments(); }, [fetchAttachments]);

  /* ── Upload new ── */
  const handleUpload = async () => {
    setTypeErr(''); setUploadErr('');
    if (!newFile) return;
    if (!newType) { setTypeErr('Please select a document type'); return; }

    if (attachmentsFromProps) {
      const tempId = `_temp_${Date.now()}`;
      const newAttach = {
        custContractAttachID: tempId,
        customerContractID,
        ownerID: Number(ownerID) || 0,
        hoardingID: Number(hoardingID) || 0,
        fileUploadType: newType,
        contractFilename: newFile.name,
        contractFilePath: '',
        lastUpdateDttm: new Date().toISOString(),
        file: newFile, // store raw File object for upload later
        _isNew: true,
      };
      setAttachments(prev => {
        const updated = [...prev, newAttach];
        onAttachmentsChangeRef.current?.(updated);
        return updated;
      });
      setNewFile(null); setNewType('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setUploading(true);
      try {
        await apiService.createCustContractAttach({
          customerContractID,
          ownerID: Number(ownerID) || 0,
          hoardingID: Number(hoardingID) || 0,
          fileUploadType: newType,
          file: newFile,
        });
        setUploadOk(true);
        setNewFile(null); setNewType('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchAttachments();
        setTimeout(() => setUploadOk(false), 2000);
      } catch (err) {
        setUploadErr(err?.response?.data?.message || err?.message || 'Upload failed.');
      } finally { setUploading(false); }
    }
  };

  /* ── Replace existing ── */
  const handleReplace = async () => {
    setReplaceErr('');
    if (!replaceFile) return;
    if (!replaceType) { setReplaceErr('Please select a document type'); return; }

    if (attachmentsFromProps) {
      const tempId = `_temp_${Date.now()}`;
      const newAttach = {
        custContractAttachID: tempId,
        customerContractID,
        ownerID: Number(ownerID) || editTarget.ownerID || 0,
        hoardingID: Number(hoardingID) || 0,
        fileUploadType: replaceType,
        contractFilename: replaceFile.name,
        contractFilePath: '',
        lastUpdateDttm: new Date().toISOString(),
        file: replaceFile,
        _isNew: true,
      };

      if (typeof editTarget.custContractAttachID === 'number' || !String(editTarget.custContractAttachID).startsWith('_temp')) {
        setDeletedAttachIDsFromProps(prev => [...prev, editTarget.custContractAttachID]);
      }

      setAttachments(prev => {
        const updated = prev.filter(a => a.custContractAttachID !== editTarget.custContractAttachID).concat(newAttach);
        onAttachmentsChangeRef.current?.(updated);
        return updated;
      });
      setEditTarget(null); setReplaceFile(null); setReplaceType('');
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    } else {
      setReplacing(true);
      try {
        await apiService.updateCustContractAttach({
          custContractAttachID: editTarget.custContractAttachID,
          customerContractID,
          ownerID: Number(ownerID) || editTarget.ownerID || 0,
          hoardingID: Number(hoardingID) || 0,
          fileUploadType: replaceType,
          file: replaceFile,
        });
        setEditTarget(null); setReplaceFile(null); setReplaceType('');
        if (replaceInputRef.current) replaceInputRef.current.value = '';
        await fetchAttachments();
      } catch (err) {
        setReplaceErr(err?.response?.data?.message || err?.message || 'Update failed.');
      } finally { setReplacing(false); }
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (attachmentsFromProps) {
      setAttachments(prev => {
        const updated = prev.filter(a => a.custContractAttachID !== deleteTarget.custContractAttachID);
        onAttachmentsChangeRef.current?.(updated);
        return updated;
      });
      if (typeof deleteTarget.custContractAttachID === 'number' || !String(deleteTarget.custContractAttachID).startsWith('_temp')) {
        setDeletedAttachIDsFromProps(prev => [...prev, deleteTarget.custContractAttachID]);
      }
      setDeleteTarget(null);
    } else {
      try {
        await apiService.deleteCustContractAttach(deleteTarget.custContractAttachID);
        setAttachments(prev => {
          const updated = prev.filter(a => a.custContractAttachID !== deleteTarget.custContractAttachID);
          onAttachmentsChangeRef.current?.(updated);
          return updated;
        });
      } catch { /* silent */ }
      finally { setDeleteTarget(null); }
    }
  };

  const fileUrl = (a) => {
    const p = a.contractFilePath || a.contractFilename || '';
    if (!p) return null;
    if (p.startsWith('http')) return p;
    return `${API_ROOT_URL}/${p.replace(/^\/?/, '')}`;
  };

  return (
    <div className="hd-section-card" style={{ marginTop: 0 }}>
      <div className="hd-section-head">
        <div className="hd-section-icon-wrap"><Paperclip size={14} color="#049edf" /></div>
        <div>
          <div className="hd-section-title">Attachments</div>
          <div className="hd-section-sub">Upload contract documents or hoarding images</div>
        </div>
        {attachments.length > 0 && (
          <span style={{ marginLeft: 'auto', background: 'rgba(4,158,223,0.1)', color: '#049edf', border: '1px solid rgba(4,158,223,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 11.5, fontWeight: 800, fontFamily: 'Nunito, sans-serif' }}>
            {attachments.length} file{attachments.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="hd-section-body">

        {!customerContractID && (
          <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Nunito, sans-serif', fontSize: 12.5, color: '#92400e', fontWeight: 700 }}>
            <AlertTriangle size={14} color="#d97706" />
            Save the contract first, then you can upload attachments.
          </div>
        )}

        {customerContractID && (
          <div style={{ background: '#f8f8fd', border: '1.5px dashed #d0d0e8', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800, color: '#7878a0', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={13} /> Upload New Attachment
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: '1 1 160px', minWidth: 150 }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11.5, fontWeight: 700, color: '#9090a8', marginBottom: 4 }}>Document Type *</div>
                <select
                  value={newType}
                  onChange={e => { setNewType(e.target.value); setTypeErr(''); }}
                  style={{ width: '100%', padding: '9px 10px', border: `1.5px solid ${typeErr ? '#ef4444' : '#e0e0f0'}`, borderRadius: 8, fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: newType ? '#1a1a2e' : '#b0b0c8', background: '#fff', cursor: 'pointer', outline: 'none' }}>
                  <option value="">Select type…</option>
                  {FILE_UPLOAD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {typeErr && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: '#ef4444', fontSize: 11, fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}><AlertCircle size={11} />{typeErr}</div>}
              </div>

              <div style={{ flex: '2 1 220px' }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11.5, fontWeight: 700, color: '#9090a8', marginBottom: 4 }}>File *</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #e0e0f0', borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}>
                  <Upload size={13} color="#c0c0d8" />
                  <span style={{ flex: 1, fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: newFile ? 700 : 500, color: newFile ? '#1a1a2e' : '#b0b0c8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {newFile ? newFile.name : 'Choose file…'}
                  </span>
                  {newFile && <X size={12} color="#c0c0d8" onClick={e => { e.stopPropagation(); setNewFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} />}
                </div>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => setNewFile(e.target.files?.[0] || null)} />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 0 }}>
                <button
                  onClick={handleUpload}
                  disabled={!newFile || uploading}
                  style={{ padding: '9px 18px', borderRadius: 8, background: newFile ? 'linear-gradient(135deg,#049edf,#0284c7)' : '#e8e8f4', color: newFile ? '#fff' : '#b0b0c8', border: 'none', cursor: newFile ? 'pointer' : 'not-allowed', fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', boxShadow: newFile ? '0 2px 8px rgba(4,158,223,0.3)' : 'none', transition: 'all 0.15s', marginTop: 20 }}>
                  {uploadOk
                    ? <><Check size={13} /> Uploaded!</>
                    : uploading
                      ? <><Loader2 size={13} className="pg-spin" /> Uploading…</>
                      : <><Upload size={13} /> Upload</>}
                </button>
              </div>
            </div>
            {uploadErr && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>
                <AlertCircle size={13} />{uploadErr}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9090a8', fontFamily: 'Nunito, sans-serif', fontSize: 13 }}>
            <Loader2 size={20} className="pg-spin" style={{ marginBottom: 6 }} /><br />Loading attachments…
          </div>
        )}

        {!loading && attachments.length === 0 && customerContractID && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#b0b0c8', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600 }}>
            <Paperclip size={30} color="#d8d8ee" style={{ marginBottom: 8 }} /><br />No attachments yet
          </div>
        )}

        {!loading && attachments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #f0f0f8', borderRadius: 10, overflow: 'hidden' }}>
            {attachments.map((a, idx) => {
              const ts = uploadTypeStyle(a.fileUploadType);
              const url = fileUrl(a);
              const isImg = isImageFile(a.contractFilename);
              const isEditing = editTarget?.custContractAttachID === a.custContractAttachID;

              return (
                <div key={a.custContractAttachID} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafe', borderBottom: idx < attachments.length - 1 ? '1px solid #f0f0f8' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', flexWrap: 'wrap' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: isImg ? '#f5f3ff' : '#eff6ff', border: `1px solid ${isImg ? '#ddd6fe' : '#bfdbfe'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {fileTypeIcon(a.contractFilename)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 13, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.contractFilename || 'Unnamed file'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 12, background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`, fontSize: 10.5, fontWeight: 800, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}>
                          {a.fileUploadType || '—'}
                        </span>
                        {a.lastUpdateDttm && (
                          <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#b0b0c8', fontWeight: 600 }}>
                            {new Date(a.lastUpdateDttm).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {isImg && url && (
                        <button title="Preview" onClick={() => setPreviewUrl(url)}
                          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e8e8f4', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c63ff' }}>
                          <Eye size={14} />
                        </button>
                      )}
                      {url && !hideDownload && (
                        <button onClick={() => forceDownload(url, a.contractFilename || 'Attachment')} title="Download / Open"
                          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e8e8f4', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#049edf' }}>
                          <Download size={14} />
                        </button>
                      )}
                      <button title="Replace file" onClick={() => { setEditTarget(a); setReplaceType(a.fileUploadType || ''); setReplaceFile(null); setReplaceErr(''); if (replaceInputRef.current) replaceInputRef.current.value = ''; }}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e8e8f4', background: isEditing ? '#eff6ff' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#049edf' }}>
                        <Edit2 size={14} />
                      </button>
                      <button title="Delete" onClick={() => setDeleteTarget(a)}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div style={{ padding: '10px 14px 14px', background: '#f0f8ff', borderTop: '1px solid #bfdbfe' }}>
                      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, color: '#1d4ed8', marginBottom: 10 }}>Replace this file</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: '1 1 150px' }}>
                          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11.5, fontWeight: 700, color: '#9090a8', marginBottom: 4 }}>Document Type *</div>
                          <select
                            value={replaceType}
                            onChange={e => { setReplaceType(e.target.value); setReplaceErr(''); }}
                            style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${replaceErr ? '#ef4444' : '#bfdbfe'}`, borderRadius: 8, fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: replaceType ? '#1a1a2e' : '#b0b0c8', background: '#fff', cursor: 'pointer', outline: 'none' }}>
                            <option value="">Select type…</option>
                            {FILE_UPLOAD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: '2 1 200px' }}>
                          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11.5, fontWeight: 700, color: '#9090a8', marginBottom: 4 }}>New file *</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}
                            onClick={() => replaceInputRef.current?.click()}>
                            <Upload size={13} color="#c0c0d8" />
                            <span style={{ flex: 1, fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: replaceFile ? 700 : 500, color: replaceFile ? '#1a1a2e' : '#b0b0c8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {replaceFile ? replaceFile.name : 'Choose replacement…'}
                            </span>
                            {replaceFile && <X size={12} color="#c0c0d8" onClick={e => { e.stopPropagation(); setReplaceFile(null); if (replaceInputRef.current) replaceInputRef.current.value = ''; }} />}
                          </div>
                          <input ref={replaceInputRef} type="file" style={{ display: 'none' }} onChange={e => setReplaceFile(e.target.files?.[0] || null)} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => { setEditTarget(null); setReplaceFile(null); setReplaceErr(''); }} className="pg-btn-cancel" style={{ fontSize: 12 }}>Cancel</button>
                          <button onClick={handleReplace} disabled={!replaceFile || replacing}
                            style={{ padding: '8px 16px', borderRadius: 8, background: replaceFile ? 'linear-gradient(135deg,#049edf,#0284c7)' : '#e8e8f4', color: replaceFile ? '#fff' : '#b0b0c8', border: 'none', cursor: replaceFile ? 'pointer' : 'not-allowed', fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, boxShadow: replaceFile ? '0 2px 8px rgba(4,158,223,0.3)' : 'none' }}>
                            {replacing ? <><Loader2 size={12} className="pg-spin" /> Saving…</> : <><Check size={12} /> Save</>}
                          </button>
                        </div>
                      </div>
                      {replaceErr && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>
                          <AlertCircle size={13} />{replaceErr}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {previewUrl && ReactDOM.createPortal(
        <div onClick={() => setPreviewUrl(null)} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }}>
            <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.5)', display: 'block' }} />
            <button onClick={() => setPreviewUrl(null)} style={{ position: 'absolute', top: -14, right: -14, width: 32, height: 32, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              <X size={15} color="#374151" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {deleteTarget && <AttachDeleteModal attach={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
/* ═══════════════════════════════════════════
   MULTI-SELECT HOARDING LOOKUP MODAL
═══════════════════════════════════════════ */
function MultiHoardingLookupModal({ hoardings, sites, selectedIds = [], onSelectMultiple, onClose }) {
  const [query, setQuery] = useState('');
  const [sortK, setSortK] = useState('hoardingCode');
  const [sortD, setSortD] = useState('asc');
  const [selected, setSelected] = useState(() => new Set((selectedIds || []).map(Number)));
  const inputRef = useRef(null);

  const siteMap = Object.fromEntries(sites.map(s => [s.siteID, s]));

  const filtered = hoardings.filter(h => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const site = siteMap[h.siteID];
    const addr = (h._inlineAddr ||
      [site?.addressLine1, site?.city, site?.district].filter(Boolean).join(' ')
    ).toLowerCase();
    return (
      (h.hoardingCode || '').toLowerCase().includes(q) ||
      (h.material || '').toLowerCase().includes(q) ||
      (h.status || '').toLowerCase().includes(q) ||
      addr.includes(q) ||
      String(h.hoardingID).includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = String(a[sortK] ?? '').toLowerCase();
    const bv = String(b[sortK] ?? '').toLowerCase();
    return sortD === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const handleSort = (key) => {
    if (sortK === key) setSortD(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortK(key); setSortD('asc'); }
  };

  const toggleOne = (hoardingID) => {
    setSelected(prev => {
      const next = new Set(prev);
      const id = Number(hoardingID);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allChecked = sorted.length > 0 && sorted.every(h => selected.has(Number(h.hoardingID)));
  const someChecked = sorted.some(h => selected.has(Number(h.hoardingID))) && !allChecked;

  const toggleAll = () => {
    if (allChecked) {
      setSelected(prev => {
        const next = new Set(prev);
        sorted.forEach(h => next.delete(Number(h.hoardingID)));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        sorted.forEach(h => next.add(Number(h.hoardingID)));
        return next;
      });
    }
  };

  const handleConfirm = () => {
    const picked = hoardings.filter(h => selected.has(Number(h.hoardingID)));
    onSelectMultiple(picked);
    onClose();
  };

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const hSt = (s) => {
    switch (s) {
      case 'Active': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'Inactive': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'Under Maintenance': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
      default: return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
    }
  };

  const cbStyle = (checked) => ({
    width: 17, height: 17, borderRadius: 5,
    border: `2px solid ${checked ? '#6c63ff' : '#d0d0e0'}`,
    background: checked ? '#6c63ff' : '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, cursor: 'pointer', transition: 'all 0.12s',
  });

  return ReactDOM.createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99997, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 820, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div style={{ background: 'linear-gradient(135deg,#6c63ff,#5b52ee)', padding: '20px 24px 16px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 17, color: '#fff' }}>Add Hoardings</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
              {hoardings.length} hoarding{hoardings.length !== 1 ? 's' : ''} available · select one or more
            </div>
          </div>
          {selected.size > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 20, padding: '5px 14px', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {selected.size} selected
            </div>
          )}
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>

        {/* ── Search ── */}
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #f0f0f8', flexShrink: 0, background: '#fafafe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid #e8e8f4', borderRadius: 10, padding: '9px 14px' }}>
            <Search size={14} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input ref={inputRef} style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: 'none' }}
              placeholder="Search by code, material, city or status…" value={query} onChange={e => setQuery(e.target.value)} />
            {query && <X size={13} style={{ cursor: 'pointer', color: '#c0c0d8', flexShrink: 0 }} onClick={() => setQuery('')} />}
          </div>
          {query && <div style={{ marginTop: 6, fontFamily: 'Nunito, sans-serif', fontSize: 11.5, color: '#9090a8', fontWeight: 600 }}>{sorted.length} result{sorted.length !== 1 ? 's' : ''} for "{query}"</div>}
        </div>

        {/* ── Empty state ── */}
        {hoardings.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
            <Building2 size={40} color="#d0d0e8" />
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#9090a8', fontSize: 14 }}>No hoardings available to add</div>
          </div>
        )}
        {hoardings.length > 0 && sorted.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
            <Search size={36} color="#d0d0e8" />
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#9090a8', fontSize: 14 }}>No hoardings match "{query}"</div>
          </div>
        )}

        {/* ── Table ── */}
        {sorted.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: '#f8f8fd' }}>
                  {/* Select-all checkbox */}
                  <th style={{ padding: '10px 14px', width: 46, borderBottom: '1.5px solid #e8e8f4' }}>
                    <div style={cbStyle(allChecked)} onClick={toggleAll} title={allChecked ? 'Deselect all' : 'Select all'}>
                      {(allChecked || someChecked) && (
                        someChecked
                          ? <div style={{ width: 8, height: 2, background: '#fff', borderRadius: 2 }} />
                          : <Check size={10} color="#fff" strokeWidth={3} />
                      )}
                    </div>
                  </th>
                  {[
                    { key: 'hoardingCode', label: 'Code' },
                    { key: 'material', label: 'Material' },
                    { key: null, label: 'Size' },
                    { key: null, label: 'Site / Address' },
                    { key: 'status', label: 'Status' },
                    { key: 'monthlyRent', label: 'Monthly Rent' },
                  ].map((col, i) => (
                    <th key={i} onClick={() => col.key && handleSort(col.key)}
                      style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#7878a0', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1.5px solid #e8e8f4', cursor: col.key ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {col.label}
                        {col.key && (
                          <span style={{ display: 'flex', flexDirection: 'column' }}>
                            <ChevronUp size={9} color={sortK === col.key && sortD === 'asc' ? '#6c63ff' : '#d0d0e4'} />
                            <ChevronDown size={9} color={sortK === col.key && sortD === 'desc' ? '#6c63ff' : '#d0d0e4'} style={{ marginTop: -2 }} />
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((h, idx) => {
                  const isChecked = selected.has(Number(h.hoardingID));
                  const site = siteMap[h.siteID];
                  const addr = h._inlineAddr ||
                    (site ? [site.addressLine1, site.city, site.district].filter(Boolean).join(', ') : `Site ${h.siteID}`);
                  const st = hSt(h.status);
                  return (
                    <tr key={h.hoardingID} onClick={() => toggleOne(h.hoardingID)}
                      style={{ cursor: 'pointer', background: isChecked ? '#f5f3ff' : idx % 2 === 0 ? '#fff' : '#fafafe', transition: 'background 0.1s', borderLeft: isChecked ? '3px solid #6c63ff' : '3px solid transparent' }}
                      onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = '#f5f3ff'; }}
                      onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafe'; }}>
                      {/* Checkbox */}
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8', width: 46 }}>
                        <div style={cbStyle(isChecked)}>
                          {isChecked && <Check size={10} color="#fff" strokeWidth={3} />}
                        </div>
                      </td>
                      {/* Code */}
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8' }}>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 13, color: '#6c63ff' }}>{h.hoardingCode}</div>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#b0b0c8', fontWeight: 600, marginTop: 1 }}>ID: {h.hoardingID}</div>
                      </td>
                      {/* Material */}
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8' }}>
                        <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#4a5568' }}>{h.material || '—'}</span>
                      </td>
                      {/* Size */}
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8', whiteSpace: 'nowrap' }}>
                        {h.width && h.height ? (
                          <>
                            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#4a5568' }}>{h.width} × {h.height} ft</div>
                            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#b0b0c8', fontWeight: 600 }}>{h.width * h.height} sq ft</div>
                          </>
                        ) : <span style={{ color: '#c0c0d8' }}>—</span>}
                      </td>
                      {/* Address */}
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8', maxWidth: 200 }}>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600, color: '#4a5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={addr}>
                          <MapPin size={11} color="#c0c0d8" style={{ marginRight: 4, verticalAlign: 'middle' }} />{addr}
                        </div>
                      </td>
                      {/* Status */}
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: 11, fontWeight: 800, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}>
                          {h.status || '—'}
                        </span>
                      </td>
                      {/* Monthly Rent */}
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid #f0f0f8', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800, color: '#1a1a2e' }}>{h.monthlyRent ? fmtCurrency(h.monthlyRent) : '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #f0f0f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafe', flexShrink: 0, gap: 12 }}>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600 }}>
            {selected.size === 0
              ? 'Click rows or checkboxes to select hoardings'
              : <><strong style={{ color: '#6c63ff' }}>{selected.size}</strong> hoarding{selected.size !== 1 ? 's' : ''} selected</>}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="pg-btn-cancel" style={{ fontSize: 12 }}>Cancel</button>
            <button onClick={handleConfirm} disabled={selected.size === 0}
              style={{ padding: '8px 20px', borderRadius: 9, background: selected.size > 0 ? 'linear-gradient(135deg,#6c63ff,#5b52ee)' : '#e0e0f0', color: selected.size > 0 ? '#fff' : '#a0a0b8', border: 'none', cursor: selected.size > 0 ? 'pointer' : 'not-allowed', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, boxShadow: selected.size > 0 ? '0 2px 8px rgba(108,99,255,0.3)' : 'none', transition: 'all 0.15s' }}>
              <Check size={13} />
              Add {selected.size > 0 ? `${selected.size} ` : ''}Hoarding{selected.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
function CustomerContractHoardingMapSection({ customerContractID, customerID, hoardings, allHoardingsRaw = hoardings, sites, startDate, endDate, maps: mapsFromProps, setMaps: setMapsFromProps, setDeletedMapIDs: setDeletedMapIDsFromProps, readOnly = false }) {
  const [localMaps, setLocalMaps] = useState([]);
  const maps = mapsFromProps || localMaps;
  const setMaps = setMapsFromProps || setLocalMaps;
  const [merges, setMerges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mergeSaving, setMergeSaving] = useState(false);
  const [deletingMapId, setDeletingMapId] = useState(null);
  const [deletingMergeId, setDeletingMergeId] = useState(null);
  const [apiError, setApiError] = useState('');
  const [pickOpen, setPickOpen] = useState(false);
  const [mergePickOpen, setMergePickOpen] = useState(false);
  const [occupancyWarnings, setOccupancyWarnings] = useState([]);
  const [deleteConfirmMap, setDeleteConfirmMap] = useState(null);
  const [deleteConfirmMerge, setDeleteConfirmMerge] = useState(null);

  // ── Available hoardings fetched from API based on contract date range ──
  const [availableHoardings, setAvailableHoardings] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  const siteMap = Object.fromEntries(sites.map(s => [s.siteID, s]));
  const mappedHoardingIds = new Set(maps.map(m => Number(m.hoardingID)));
  const mergedHoardingIds = new Set(merges.map(m => Number(m.hoardingID)));
  /* ── Edit merge direction ── */

  /* ── Load maps + merges, enrich maps with hoarding data ── */
  const loadAll = useCallback(async () => {
    if (!customerContractID) { setLoading(false); return; }
    setLoading(true);
    try {
      const [rawMaps, allMerges] = await Promise.all([
        mapsFromProps ? Promise.resolve([]) : apiService.getCustomerContractHoardingMaps(customerContractID).catch(() => []),
        apiService.getAllHoardingMerges().catch(err => {
          console.error('[MERGE API ERROR]', err?.response?.status, err?.response?.data, err?.message);
          return [];
        }),
      ]);

      if (!mapsFromProps) {
        const mapList = Array.isArray(rawMaps) ? rawMaps : [];

        // Filter by customerContractID in case API returns all records
        const filteredMaps = mapList.filter(m =>
          Number(m.customerContractID ?? m.CustomerContractID) === Number(customerContractID)
        );

        const enriched = filteredMaps.map(m => {
          const hid = Number(m.hoardingID ?? m.HoardingID ?? 0);
          // First try exact hoardingID match
          let h = allHoardingsRaw.find(hh => Number(hh.hoardingID ?? hh.HoardingID ?? hh.id) === hid);

          // If not found (deduplication may have kept a different effdt record),
          // fall back: look up the hoarding code from the map record itself,
          // then find by code in the hoardings array
          if (!h) {
            const mapRecord = maps.find(mp => Number(mp.hoardingID ?? mp.HoardingID ?? 0) === hid);
            const codeFromMap = mapRecord?.hoardingCode ?? mapRecord?.HoardingCode;
            if (codeFromMap) {
              h = allHoardingsRaw.find(hh => hh.hoardingCode === codeFromMap);
            }
          }
          return {
            customerContractLineID: m.customerContractLineID ?? m.CustomerContractLineID ?? null,
            customerContractID: Number(m.customerContractID ?? m.CustomerContractID),
            customerID: Number(m.customerID ?? m.CustomerID),
            hoardingID: hid,
            // Hoarding info embedded — never needs a second lookup
            hoardingCode: h?.hoardingCode ?? `#${hid}`,
            material: h?.material ?? '',
            width: h?.width ?? 0,
            height: h?.height ?? 0,
            status: h?.status === 'Occupied' ? 'Available' : (h?.status ?? 'Available'),
            siteID: h?.siteID ?? null,
            monthlyRent: h?.monthlyRent ?? 0,
          };
        });
        setMaps(enriched);
      }

      const mergeList = Array.isArray(allMerges) ? allMerges : [];
      setMerges(
        mergeList
          .filter(m => {
            const mContractID = Number(
              m.customerContractID ?? m.CustomerContractID ??
              m.contractID ?? m.ContractID ?? 0
            );
            // Only match by contractID — the hoarding fallback causes cross-contract pollution
            return mContractID > 0 && mContractID === Number(customerContractID);
          })
          .map(m => ({
            hoardingMergeID: m.hoardingMergeID ?? m.HoardingMergeID ?? m.id ?? m.Id,
            hoardingID: Number(m.hoardingID ?? m.HoardingID ?? 0),
            mergeAlongFlag: m.mergeAlongFlag ?? m.MergeAlongFlag ?? 'V',
          }))
      );
    } catch (err) {
      setApiError(err?.message || 'Failed to load data.');
    } finally { setLoading(false); }
  }, [customerContractID, allHoardingsRaw, mapsFromProps]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Fetch available hoardings from API whenever contract dates are known ──
  useEffect(() => {
    if (!startDate || !endDate) {
      setAvailableHoardings([]);
      return;
    }
    let cancelled = false;
    setLoadingAvailable(true);
    apiService.getAvailableHoardings(startDate, endDate)
      .then(res => {
        if (cancelled) return;
        const raw = Array.isArray(res) ? res : res?.data ?? [];
        // Normalize: availability API uses 'hoardingId' (camelCase), modal needs 'hoardingID'
        const list = raw.map(h => ({
          ...h,
          hoardingID: h.hoardingId ?? h.hoardingID ?? 0,
          status: h.status || 'Available',
          _inlineAddr: [h.addressLine1, h.city, h.district].filter(Boolean).join(', '),
        }));
        setAvailableHoardings(list);
      })
      .catch(() => { if (!cancelled) setAvailableHoardings([]); })
      .finally(() => { if (!cancelled) setLoadingAvailable(false); });
    return () => { cancelled = true; };
  }, [startDate, endDate]);

  /* ── Add hoardings ── */
  const handleAddMultiple = async (selectedHoardings) => {
    if (!selectedHoardings.length) return;
    if (mapsFromProps) {
      const newMaps = selectedHoardings.map((h, i) => {
        const tempId = `_temp_${Date.now()}_${i}`;
        return {
          customerContractLineID: tempId,
          customerContractID,
          customerID: Number(customerID),
          hoardingID: Number(h.hoardingID),
          hoardingCode: h.hoardingCode,
          material: h.material,
          width: h.width,
          height: h.height,
          status: 'Available',
          siteID: h.siteID,
          monthlyRent: h.monthlyRent,
          _inlineAddr: h._inlineAddr || [h.addressLine1, h.city, h.district].filter(Boolean).join(', '),
          _isNew: true,
        };
      });
      setMaps(prev => [...prev, ...newMaps]);
    } else {
      setSaving(true); setApiError('');
      try {
        await Promise.all(
          selectedHoardings.map(h =>
            apiService.createCustomerContractHoardingMap({
              customerContractLineID: 0,
              customerContractID,
              customerID: Number(customerID),
              hoardingID: Number(h.hoardingID),
            })
          )
        );
        await loadAll();
      } catch (err) {
        setApiError(err?.response?.data?.message || err?.message || 'Failed to add hoardings.');
      } finally { setSaving(false); }
    }
  };
  const handleAdd = async (pickedHoardings) => {
    if (!pickedHoardings.length) return;
    if (mapsFromProps) {
      await handleAddMultiple(pickedHoardings);
    } else {
      setSaving(true);
      setApiError('');
      setOccupancyWarnings([]);

      const occupiedMsgs = [];
      let successCount = 0;

      for (const h of pickedHoardings) {
        try {
          await apiService.createCustomerContractHoardingMap({
            customerContractLineID: 0,
            customerContractID,
            customerID: Number(customerID),
            hoardingID: Number(h.hoardingID),
          });
          successCount++;
        } catch (err) {
          const occ = parseOccupancyError(err);
          if (occ) {
            const code = h.hoardingCode ? ` (${h.hoardingCode})` : '';
            occupiedMsgs.push(occ.replace(/Hoarding\s+\d+/, `Hoarding #${h.hoardingID}${code}`));
          } else {
            setApiError(err?.response?.data?.message || err?.message || 'Failed to add one or more hoardings.');
          }
        }
      }

      if (occupiedMsgs.length > 0) setOccupancyWarnings(occupiedMsgs);
      if (successCount > 0) await loadAll();
      setSaving(false);
    }
  };

  /* ── Remove hoarding ── */
  const handleDeleteMap = async (mapId) => {
    if (mapsFromProps) {
      setMaps(prev => prev.filter(m => m.customerContractLineID !== mapId));
      if (typeof mapId === 'number' || !String(mapId).startsWith('_temp')) {
        setDeletedMapIDsFromProps(prev => [...prev, mapId]);
      }
    } else {
      setDeletingMapId(mapId); setApiError('');
      try {
        await apiService.deleteCustomerContractHoardingMap(mapId);
        setMaps(prev => prev.filter(m => m.customerContractLineID !== mapId));
      } catch (err) {
        setApiError(err?.response?.data?.message || err?.message || 'Failed to remove hoarding.');
      } finally { setDeletingMapId(null); }
    }
  };

  /* ── Create merge ── */
  const handleMerge = async (selectedIds, direction) => {
    setMergePickOpen(false);
    setMergeSaving(true); setApiError('');
    try {
      await Promise.all(
        selectedIds.map(hoardingID =>
          apiService.createHoardingMerge({
            hoardingID: Number(hoardingID),
            customerContractID: Number(customerContractID),
            mergeAlongFlag: direction,
          })
        )
      );
      await loadAll();
    } catch (err) {
      setApiError(err?.response?.data?.message || err?.message || 'Merge failed.');
    } finally { setMergeSaving(false); }
  };

  /* ── Delete merge ── */
  const handleDeleteMerge = async (mergeID) => {
    setDeletingMergeId(mergeID); setApiError('');
    try {
      await apiService.deleteHoardingMerge(mergeID);
      setMerges(prev => prev.filter(m => m.hoardingMergeID !== mergeID));
    } catch (err) {
      setApiError(err?.response?.data?.message || err?.message || 'Failed to remove merge.');
    } finally { setDeletingMergeId(null); }
  };
  const handleEditMerge = useCallback(async (groupMerges, newDirection) => {
    if (!Array.isArray(groupMerges) || groupMerges.length === 0) return;
    setApiError('');

    const mergeIDs = groupMerges.map(m => m.hoardingMergeID);

    // Optimistic update
    setMerges(prev => prev.map(m =>
      mergeIDs.includes(m.hoardingMergeID)
        ? { ...m, mergeAlongFlag: newDirection }
        : m
    ));

    try {
      await Promise.all(
        groupMerges.map(m => {

          return apiService.updateHoardingMerge(m.hoardingMergeID, {
            hoardingID: Number(m.hoardingID),
            customerContractID: Number(customerContractID),
            mergeAlongFlag: newDirection,
          });
        })
      );
      await loadAll();
    } catch (err) {
      console.error('[EditMerge] Failed:', err?.response?.status, err?.response?.data, err?.message);
      // Keep optimistic update — don't revert since UI already shows correct state
      setApiError(err?.response?.data?.message || err?.message || 'Failed to update merge direction.');
    }
  }, [loadAll, customerContractID]);

  // Hoardings available for adding: use date-filtered API results if available, else fall back to all hoardings prop
  // Then exclude ones already mapped to this contract
  const hoardingsForPicker = (availableHoardings.length > 0 ? availableHoardings : hoardings)
    .filter(h => !mappedHoardingIds.has(Number(h.hoardingID ?? 0)));

  // Hoardings in this contract (enriched objects — passed to merge picker)
  const contractHoardingObjs = maps; // already enriched above

  const hSt = (status) => {
    switch (status) {
      case 'Active':
      case 'Available':
        return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'Inactive': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'Under Maintenance': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
      default: return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
    }
  };

  const hMerges = merges.filter(m => m.mergeAlongFlag === 'H');
  const vMerges = merges.filter(m => m.mergeAlongFlag === 'V');

  const renderMergeGroup = (groupMerges, direction) => {
    if (!groupMerges.length) return null;

    // Calculate total sq.ft for this merge group
    const totalSqFt = groupMerges.reduce((sum, m) => {
      const mapEntry = maps.find(mp => Number(mp.hoardingID) === Number(m.hoardingID));
      return sum + ((mapEntry?.width || 0) * (mapEntry?.height || 0));
    }, 0);

    // Calculate combined merged size (same logic as QuotationPage)
    const sizes = groupMerges.map(m => {
      const mp = maps.find(mp => Number(mp.hoardingID) === Number(m.hoardingID));
      return { w: mp?.width || 0, h: mp?.height || 0 };
    });
    const gaps = Math.max(groupMerges.length - 1, 1);
    let mw, mh;
    if (direction === 'H') {
      mw = sizes.reduce((s, sz) => s + sz.w, 0) + gaps;
      mh = Math.max(...sizes.map(s => s.h));
    } else {
      mw = Math.max(...sizes.map(s => s.w));
      mh = sizes.reduce((s, sz) => s + sz.h, 0) + gaps;
    }
    const mergedSqFt = mw * mh;
    const mergeID = groupMerges[0]?.hoardingMergeID; // for direction toggle

    return (
      <div style={{ border: '1.5px solid rgba(124,58,237,0.20)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
        {/* Group header */}
        <div style={{ padding: '8px 13px', background: 'rgba(124,58,237,0.06)', borderBottom: '1px solid rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {direction === 'H' ? <ArrowLeftRight size={12} color="#7c3aed" /> : <ArrowUpDown size={12} color="#7c3aed" />}
          <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11.5, fontWeight: 800, color: '#7c3aed' }}>
            {direction === 'H' ? '↔ Horizontal' : '↕ Vertical'} Merge · {groupMerges.length} hoarding{groupMerges.length !== 1 ? 's' : ''}
          </span>

          {/* Combined size + sq.ft */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 4 }}>
            <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, fontWeight: 700, color: '#5a5a78' }}>
              {mw} × {mh} ft
            </span>
            <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.20)' }}>
              {mergedSqFt.toLocaleString('en-IN')} sq.ft
            </span>
          </div>

          {/* Direction toggle button — hidden in readOnly mode */}
          {!readOnly && <button
            onClick={() => {
              const newDir = direction === 'H' ? 'V' : 'H';
              handleEditMerge(groupMerges, newDir);
            }}
            title={`Switch to ${direction === 'H' ? 'Vertical' : 'Horizontal'}`}
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 6,
              border: '1.5px solid rgba(124,58,237,0.30)',
              background: 'rgba(124,58,237,0.06)', color: '#7c3aed',
              cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontSize: 11, fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            <RefreshCw size={10} />
            {direction === 'H' ? '↕ Switch to Vertical' : '↔ Switch to Horizontal'}
          </button>}
        </div>

        {/* Rows */}
        {groupMerges.map((m, idx) => {
          const mapEntry = maps.find(mp => Number(mp.hoardingID) === Number(m.hoardingID));
          const site = mapEntry?.siteID != null ? siteMap[mapEntry.siteID] : null;
          const addr = mapEntry?._inlineAddr || (site ? [site.addressLine1, site.city].filter(Boolean).join(', ') : '');
          const isDeleting = deletingMergeId === m.hoardingMergeID;
          const sqFt = (mapEntry?.width || 0) * (mapEntry?.height || 0);

          return (
            <div key={m.hoardingMergeID} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px',
              borderBottom: idx < groupMerges.length - 1 ? '1px solid #f0f0f8' : 'none',
              background: idx % 2 === 0 ? '#fff' : '#fafafe',
              opacity: isDeleting ? 0.5 : 1, transition: 'opacity 0.2s',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 12.5, color: '#7c3aed' }}>
                  {mapEntry?.hoardingCode || `Hoarding ${m.hoardingID}`}
                  {mapEntry?.width > 0 && mapEntry?.height > 0 && (
                    <span style={{ color: '#9090a8', fontWeight: 600, fontSize: 11, marginLeft: 7 }}>
                      {mapEntry.width}×{mapEntry.height} ft
                    </span>
                  )}
                  {sqFt > 0 && (
                    <span style={{ color: '#b0b0c8', fontWeight: 600, fontSize: 11, marginLeft: 6 }}>
                      · {sqFt} sq.ft
                    </span>
                  )}
                </div>
                {addr && (
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={9} color="#c0c0d8" style={{ flexShrink: 0 }} />{addr}
                  </div>
                )}
              </div>
              {!readOnly && (
                <button disabled={isDeleting} onClick={() => setDeleteConfirmMerge({ mergeID: m.hoardingMergeID, hoardingCode: mapEntry?.hoardingCode || `Hoarding ${m.hoardingID}` })}
                  style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
                  {isDeleting ? <Loader2 size={11} className="pg-spin" /> : <Trash2 size={12} />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="hd-section-card">
      <div className="hd-section-head">
        <div className="hd-section-icon-wrap"><Building2 size={14} color="#6c63ff" /></div>
        <div>
          <div className="hd-section-title">Hoardings &amp; Merges</div>
          <div className="hd-section-sub">Manage hoardings linked to this contract and their merges</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {maps.length > 0 && (
            <span style={{ background: 'rgba(108,99,255,0.1)', color: '#6c63ff', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 11.5, fontWeight: 800, fontFamily: 'Nunito, sans-serif' }}>
              {maps.length} hoarding{maps.length !== 1 ? 's' : ''}
            </span>
          )}
          {merges.length > 0 && (
            <span style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 11.5, fontWeight: 800, fontFamily: 'Nunito, sans-serif' }}>
              {merges.length} merged
            </span>
          )}
        </div>
      </div>

      <div className="hd-section-body">
        <OccupancyWarningBanner
          messages={occupancyWarnings}
          onDismiss={() => setOccupancyWarnings([])}
        />

        {apiError && (
          <div className="pg-field-error" style={{ marginBottom: 12 }}>
            <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{apiError}</span>
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11 }}
              onClick={() => setApiError('')}>✕</button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#9090a8' }}>
            <Loader2 size={22} className="pg-spin" style={{ marginBottom: 8 }} />
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600 }}>Loading…</div>
          </div>
        ) : (
          <>
            {/* ── Hoardings table ── */}
            {maps.length > 0 && (
              <div style={{ marginBottom: 12, border: '1.5px solid #e8e8f4', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f8fd' }}>
                      {['Code', 'Material', 'Size', 'Location', 'Status', ''].map((h, i) => (
                        <th key={i} style={{ padding: '9px 13px', textAlign: 'left', fontSize: 11, fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#7878a0', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1.5px solid #e8e8f4', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {maps.filter(m => !mergedHoardingIds.has(m.hoardingID)).map((m, idx) => {
                      const site = m.siteID != null ? siteMap[m.siteID] : null;
                      const addr = m._inlineAddr || (site ? [site.addressLine1, site.city].filter(Boolean).join(', ') : '');
                      const isDeleting = deletingMapId === m.customerContractLineID;
                      const isMerged = mergedHoardingIds.has(m.hoardingID);
                      const st = hSt(m.status);
                      return (
                        <tr key={m.customerContractLineID ?? idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafe', opacity: isDeleting ? 0.5 : 1 }}>
                          <td style={{ padding: '10px 13px', borderBottom: '1px solid #f0f0f8' }}>
                            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 12.5, color: '#6c63ff' }}>{m.hoardingCode}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10.5, color: '#c0c0d8', fontWeight: 600 }}>Line #{m.customerContractLineID}</div>
                              {/* {isMerged && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 10, background: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)', fontSize: 10, fontWeight: 800, fontFamily: 'Nunito, sans-serif' }}>
                                  <GitMerge size={9} /> Merged
                                </span>
                              )} */}
                            </div>
                          </td>
                          <td style={{ padding: '10px 13px', borderBottom: '1px solid #f0f0f8' }}>
                            <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#4a5568' }}>{m.material || '—'}</span>
                          </td>
                          <td style={{ padding: '10px 13px', borderBottom: '1px solid #f0f0f8', whiteSpace: 'nowrap' }}>
                            {m.width > 0 && m.height > 0
                              ? <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#4a5568' }}>{m.width} × {m.height} ft</span>
                              : <span style={{ color: '#c0c0d8' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 13px', borderBottom: '1px solid #f0f0f8', maxWidth: 160 }}>
                            {addr
                              ? <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11.5, color: '#6b7280', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <MapPin size={10} color="#c0c0d8" style={{ flexShrink: 0 }} />{addr}
                              </span>
                              : <span style={{ color: '#c0c0d8' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 13px', borderBottom: '1px solid #f0f0f8' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: 11, fontWeight: 800, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}>
                              {m.status || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 13px', borderBottom: '1px solid #f0f0f8', textAlign: 'right' }}>
                            {!readOnly && (
                              <button disabled={isDeleting} onClick={() => setDeleteConfirmMap(m)}
                                style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', opacity: isDeleting ? 0.5 : 1 }}>
                                {isDeleting ? <Loader2 size={12} className="pg-spin" /> : <Trash2 size={13} />}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {maps.length === 0 && (
              <div style={{ textAlign: 'center', padding: '18px 0 12px', color: '#b0b0c8' }}>
                <Building2 size={26} color="#d0d0e8" style={{ marginBottom: 8 }} />
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700, color: '#9090a8' }}>No hoardings linked yet</div>
              </div>
            )}

            {/* ── Add Hoardings — hidden in readOnly mode ── */}
            {!readOnly && (
              <button
                onClick={() => { setApiError(''); setPickOpen(true); }}
                disabled={saving || loadingAvailable || (!startDate || !endDate)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 0', borderRadius: 10, border: '1.5px dashed #d0d0e8', background: '#f8f8fd', cursor: (saving || loadingAvailable || !startDate || !endDate) ? 'not-allowed' : 'pointer', fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800, color: (!startDate || !endDate) ? '#b0b0c8' : '#6c63ff', transition: 'all 0.15s', marginBottom: 6 }}
                onMouseEnter={e => { if (!saving && !loadingAvailable && startDate && endDate) e.currentTarget.style.borderColor = '#6c63ff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#d0d0e8'; }}
              >
                {saving ? <><Loader2 size={14} className="pg-spin" /> Adding…</>
                  : loadingAvailable ? <><Loader2 size={14} className="pg-spin" /> Loading available…</>
                    : (!startDate || !endDate) ? <><Calendar size={14} /> Set contract dates first</>
                      : hoardingsForPicker.length === 0 ? <><Check size={14} /> No more hoardings available</>
                        : <><Plus size={14} /> Add Hoardings ({hoardingsForPicker.length} available)</>}
              </button>
            )}

            {/* ── Merge divider ── */}
            {maps.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 12px' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(124,58,237,0.15)' }} />
                <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11.5, fontWeight: 800, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <GitMerge size={12} /> Hoarding Merges
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(124,58,237,0.15)' }} />
              </div>
            )}

            {/* ── Existing merges ── */}
            {maps.length > 0 && (
              <>
                {merges.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '8px 0 10px', color: '#c0c0d8', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600 }}>
                    No merges yet — click below to merge hoardings
                  </div>
                )}
                {renderMergeGroup(hMerges, 'H')}
                {renderMergeGroup(vMerges, 'V')}

                {/* ── Merge button — hidden in readOnly mode ── */}
                {!readOnly && (
                  <button
                    onClick={() => { setApiError(''); setMergePickOpen(true); }}
                    disabled={mergeSaving || maps.length < 2}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      padding: '9px 0', borderRadius: 10,
                      border: `1.5px dashed ${maps.length < 2 ? '#e0e0e0' : 'rgba(124,58,237,0.40)'}`,
                      background: maps.length < 2 ? '#f8f8fd' : 'rgba(124,58,237,0.03)',
                      cursor: mergeSaving || maps.length < 2 ? 'not-allowed' : 'pointer',
                      fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800,
                      color: maps.length < 2 ? '#c0c0d8' : '#7c3aed', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (maps.length >= 2) { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = 'rgba(124,58,237,0.06)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = maps.length < 2 ? '#e0e0e0' : 'rgba(124,58,237,0.40)'; e.currentTarget.style.background = maps.length < 2 ? '#f8f8fd' : 'rgba(124,58,237,0.03)'; }}
                  >
                    {mergeSaving ? <><Loader2 size={14} className="pg-spin" /> Merging…</>
                      : maps.length < 2 ? <><Building2 size={14} /> Add at least 2 hoardings to merge</>
                        : <><GitMerge size={14} /> Merge Hoardings ({maps.length} available)</>}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Add hoarding modal — uses date-filtered available hoardings */}
      {pickOpen && (
        <MultiHoardingLookupModal
          hoardings={hoardingsForPicker}
          sites={sites}
          onSelectMultiple={async (picked) => { setPickOpen(false); await handleAddMultiple(picked); }}
          onClose={() => setPickOpen(false)}
        />
      )}

      {/* Merge picker modal — receives enriched contractHoardingObjs */}
      {mergePickOpen && (
        <MergePickerModal
          hoardings={contractHoardingObjs}
          sites={sites}
          existingMergeHoardingIds={mergedHoardingIds}
          onConfirm={handleMerge}
          onClose={() => setMergePickOpen(false)}
        />
      )}

      {deleteConfirmMap && (
        <HoardingDeleteConfirmModal
          hoardingCode={deleteConfirmMap.hoardingCode}
          onConfirm={async () => {
            const mapId = deleteConfirmMap.customerContractLineID;
            setDeleteConfirmMap(null);
            await handleDeleteMap(mapId);
          }}
          onCancel={() => setDeleteConfirmMap(null)}
        />
      )}

      {deleteConfirmMerge && (
        <MergeDeleteConfirmModal
          hoardingCode={deleteConfirmMerge.hoardingCode}
          onConfirm={async () => {
            const mergeID = deleteConfirmMerge.mergeID;
            setDeleteConfirmMerge(null);
            await handleDeleteMerge(mergeID);
          }}
          onCancel={() => setDeleteConfirmMerge(null)}
        />
      )}
    </div>
  );
}
/* ═══════════════════════════════════════════
   MERGE PICKER MODAL
═══════════════════════════════════════════ */
function MergePickerModal({ hoardings, sites, existingMergeHoardingIds, onConfirm, onClose }) {
  const [selected, setSelected] = useState(new Set());
  const [direction, setDirection] = useState('H');
  const [query, setQuery] = useState('');

  const siteMap = Object.fromEntries(sites.map(s => [s.siteID, s]));

  const available = hoardings.filter(h =>
    h != null && h.hoardingID != null &&
    !existingMergeHoardingIds.has(Number(h.hoardingID))
  );

  const filtered = query.trim()
    ? available.filter(h =>
      h != null &&
      ((h.hoardingCode || '').toLowerCase().includes(query.toLowerCase()) ||
        String(h.hoardingID).includes(query))
    )
    : available;

  const siteGroups = useMemo(() => {
    const map = new Map();
    for (const h of filtered) {
      if (!h || h.hoardingID == null) continue; // ← guard
      const sid = h.siteID != null ? Number(h.siteID) : '__none__';
      if (!map.has(sid)) {
        const site = sid !== '__none__' ? siteMap[Number(sid)] : null;
        const label = site
          ? [site.addressLine1, site.city, site.district].filter(Boolean).join(', ')
          : sid === '__none__' ? 'Unknown Site' : `Site ${sid}`;
        map.set(sid, { label, siteID: h.siteID != null ? Number(h.siteID) : null, rows: [] });
      }
      map.get(sid).rows.push(h);
    }
    return [...map.values()];
  }, [filtered, siteMap]);

  const firstSiteID = selected.size > 0
    ? (available.find(h => selected.has(Number(h.hoardingID)))?.siteID ?? null)
    : undefined;

  const toggle = (id, siteID) => {
    if (firstSiteID !== undefined && firstSiteID !== null && siteID !== firstSiteID) return;
    setSelected(p => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // Preview merged size
  const preview = useMemo(() => {
    if (selected.size < 2) return null;
    const selHoardings = available.filter(h => h != null && selected.has(h.hoardingID));
    if (selHoardings.length < 2) return null; // ← guard
    const sizes = selHoardings.map(h => ({ w: Number(h.width) || 0, h: Number(h.height) || 0 }));
    const gaps = selHoardings.length - 1;
    let mw, mh;
    if (direction === 'H') {
      mw = sizes.reduce((s, sz) => s + sz.w, 0) + gaps;
      mh = Math.max(...sizes.map(s => s.h));
    } else {
      mw = Math.max(...sizes.map(s => s.w));
      mh = sizes.reduce((s, sz) => s + sz.h, 0) + gaps;
    }
    return { size: `${mw} × ${mh} ft`, sqFt: (mw * mh), count: selHoardings.length };
  }, [selected, direction, available]);

  const cbStyle = (checked) => ({
    width: 17, height: 17, borderRadius: 5,
    border: `2px solid ${checked ? '#7c3aed' : '#d0d0e0'}`,
    background: checked ? '#7c3aed' : '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, cursor: 'pointer', transition: 'all 0.12s',
  });

  return ReactDOM.createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(15,23,42,0.58)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }}>

        {/* Head */}
        <div style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', padding: '18px 24px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <GitMerge size={19} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 16, color: '#fff' }}>Merge Hoardings</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
              Select 2+ hoardings from the <strong style={{ color: '#fff' }}>same site</strong> to merge
            </div>
          </div>
          {selected.size > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 20, padding: '4px 13px', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {selected.size} selected
            </div>
          )}
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>

        {/* Direction picker */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f8', background: '#fafafe' }}>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, color: '#5a5a78', marginBottom: 10 }}>Merge Direction</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { val: 'H', label: 'Horizontal', sub: 'Side by side · sum widths + gaps', Icon: ArrowLeftRight },
              { val: 'V', label: 'Vertical', sub: 'Top to bottom · sum heights + gaps', Icon: ArrowUpDown },
            ].map(({ val, label, sub, Icon }) => (
              <button key={val} onClick={() => setDirection(val)} style={{
                flex: 1, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                border: `2px solid ${direction === val ? '#7c3aed' : '#e8e8f4'}`,
                background: direction === val ? 'rgba(124,58,237,0.06)' : '#fff',
                fontFamily: 'Nunito, sans-serif', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <Icon size={18} color={direction === val ? '#7c3aed' : '#c0c0d8'} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: direction === val ? '#7c3aed' : '#1a1a2e' }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#9090a8', marginTop: 1 }}>{sub}</div>
                </div>
                {direction === val && <Check size={14} color="#7c3aed" style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 20px 8px', borderBottom: '1px solid #f0f0f8', background: '#fafafe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1.5px solid #e8e8f4', borderRadius: 10, padding: '8px 13px' }}>
            <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: 'none' }}
              placeholder="Search hoarding code or ID…" value={query} onChange={e => setQuery(e.target.value)} />
            {query && <X size={12} style={{ cursor: 'pointer', color: '#c0c0d8' }} onClick={() => setQuery('')} />}
          </div>
        </div>

        {/* Site-grouped list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 14px' }}>
          {available.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#b0b0c8' }}>
              <Building2 size={32} color="#d0d0e8" style={{ marginBottom: 10 }} />
              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700 }}>All hoardings already merged</div>
            </div>
          ) : siteGroups.map(group => {
            const groupLocked = firstSiteID !== undefined && firstSiteID !== null &&
              group.siteID !== firstSiteID;
            return (
              <div key={String(group.siteID ?? '__none__')} style={{ marginBottom: 16 }}>
                {/* Site header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                  padding: '6px 12px', borderRadius: 8,
                  background: groupLocked ? '#f8f8f8' : 'rgba(124,58,237,0.05)',
                  border: `1px solid ${groupLocked ? '#e8e8f0' : 'rgba(124,58,237,0.18)'}`,
                  opacity: groupLocked ? 0.5 : 1,
                }}>
                  <MapPin size={12} color={groupLocked ? '#c0c0c8' : '#7c3aed'} />
                  <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, color: groupLocked ? '#b0b0c8' : '#1a1a2e', flex: 1 }}>
                    {group.label}
                  </span>
                  {groupLocked && (
                    <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#dc2626', fontWeight: 700 }}>
                      ✕ Different site — can't merge across sites
                    </span>
                  )}
                </div>

                {/* Hoarding rows */}
                {group.rows.map((h, idx) => {
                  const isChecked = selected.has(h.hoardingID);
                  const disabled = groupLocked;
                  const selIdx = [...selected].indexOf(h.hoardingID);
                  const site = siteMap[h.siteID];
                  const addr = site ? [site.addressLine1, site.city].filter(Boolean).join(', ') : '';
                  const sqFt = (h.width || 0) * (h.height || 0);
                  const st = h.status === 'Active'
                    ? { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' }
                    : { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };

                  return (
                    <div key={h.hoardingID}
                      onClick={() => !disabled && toggle(Number(h.hoardingID), h.siteID != null ? Number(h.siteID) : null)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 10, marginBottom: 6,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        border: `1.5px solid ${isChecked ? '#7c3aed' : '#f0f0f0'}`,
                        background: isChecked ? 'rgba(124,58,237,0.06)' : disabled ? '#f8f8f8' : '#fafafa',
                        opacity: disabled ? 0.4 : 1, transition: 'all 0.1s',
                      }}>
                      <div style={cbStyle(isChecked)}>
                        {isChecked && <Check size={10} color="#fff" strokeWidth={3} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 13, color: '#7c3aed' }}>{h.hoardingCode}</div>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#c0c0d8', marginTop: 1 }}>ID: {h.hoardingID}</div>
                        {addr && (
                          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <MapPin size={9} color="#c0c0d8" />{addr}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {h.width && h.height ? (
                          <>
                            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#4a5568' }}>{h.width}×{h.height} ft</div>
                            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600 }}>{sqFt} sq.ft</div>
                          </>
                        ) : <span style={{ color: '#c0c0d8' }}>—</span>}
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: 11, fontWeight: 800, fontFamily: 'Nunito, sans-serif', flexShrink: 0 }}>
                        {h.status || '—'}
                      </span>
                      {isChecked && (
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 5, background: 'rgba(124,58,237,0.12)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)', flexShrink: 0 }}>
                          #{selIdx + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Preview strip */}
        {preview && (
          <div style={{ margin: '0 20px 12px', padding: '12px 16px', borderRadius: 12, background: 'rgba(124,58,237,0.06)', border: '1.5px solid rgba(124,58,237,0.20)' }}>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <GitMerge size={13} /> Merge Preview ({preview.count} hoardings)
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#9090a8' }}>Combined Size</div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 18, fontWeight: 900, color: '#1a1a2e' }}>{preview.size}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#9090a8' }}>Total Area</div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 18, fontWeight: 900, color: '#1a1a2e' }}>{preview.sqFt.toLocaleString('en-IN')} sq.ft</div>
              </div>
              <div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#9090a8' }}>Direction</div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 900, color: '#7c3aed' }}>
                  {direction === 'H' ? '↔ Horizontal' : '↕ Vertical'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '13px 20px', borderTop: '1px solid #f0f0f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafe' }}>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600 }}>
            {selected.size < 2 ? 'Select at least 2 hoardings from the same site' : `${selected.size} hoardings · ${direction === 'H' ? '↔ Horizontal' : '↕ Vertical'} merge`}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="pg-btn-cancel" style={{ fontSize: 12 }}>Cancel</button>
            <button
              disabled={selected.size < 2}
              onClick={() => onConfirm(Array.from(selected), direction)}
              style={{
                padding: '8px 20px', borderRadius: 9,
                background: selected.size >= 2 ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#e0e0f0',
                color: selected.size >= 2 ? '#fff' : '#a0a0b8',
                border: 'none', cursor: selected.size >= 2 ? 'pointer' : 'not-allowed',
                fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800,
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: selected.size >= 2 ? '0 2px 8px rgba(124,58,237,0.3)' : 'none',
              }}
            >
              <GitMerge size={13} />
              Merge {selected.size >= 2 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   HOARDING MERGE SECTION
═══════════════════════════════════════════ */
function HoardingMergeSection({ customerContractID, hoardings, allHoardingsRaw = hoardings, sites }) {
  const [merges, setMerges] = useState([]);
  const [contractHoardingIds, setContractHoardingIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [apiError, setApiError] = useState('');
  const [pickOpen, setPickOpen] = useState(false);

  const siteMap = Object.fromEntries(sites.map(s => [s.siteID, s]));

  const loadData = useCallback(async () => {
    if (!customerContractID) { setLoading(false); return; }
    setLoading(true);
    try {
      const [allMerges, maps] = await Promise.all([
        apiService.getAllHoardingMerges(),
        apiService.getCustomerContractHoardingMaps(customerContractID).catch(() => []),
      ]);

      // Filter merges for this contract
      const mergeList = Array.isArray(allMerges) ? allMerges : [];
      setMerges(mergeList
        .filter(m => Number(m.customerContractID ?? m.CustomerContractID) === Number(customerContractID))
        .map(m => ({
          hoardingMergeID: m.hoardingMergeID ?? m.HoardingMergeID,
          hoardingID: Number(m.hoardingID ?? m.HoardingID),
          customerContractID: Number(m.customerContractID ?? m.CustomerContractID),
          mergeAlongFlag: m.mergeAlongFlag ?? m.MergeAlongFlag ?? 'H',
        }))
      );

      // Contract's hoarding IDs
      const mapList = Array.isArray(maps) ? maps : [];
      setContractHoardingIds(new Set(mapList.map(m => Number(m.hoardingID ?? m.HoardingID))));

    } catch { }
    finally { setLoading(false); }
  }, [customerContractID]);

  useEffect(() => { loadData(); }, [loadData]);

  // Hoardings available in this contract
  const contractHoardings = hoardings.filter(h => contractHoardingIds.has(Number(h.hoardingID)));

  // Already merged hoarding IDs
  const mergedHoardingIds = new Set(merges.map(m => m.hoardingID));

  const handleMerge = async (selectedIds, direction) => {
    setPickOpen(false);
    setSaving(true); setApiError('');
    try {
      await Promise.all(
        selectedIds.map(hoardingID =>
          apiService.createHoardingMerge({
            hoardingID: Number(hoardingID),
            customerContractID: Number(customerContractID),
            mergeAlongFlag: direction,
          })
        )
      );
      await loadData();
    } catch (err) {
      setApiError(err?.response?.data?.message || err?.message || 'Failed to create merge.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (mergeID) => {
    setDeletingId(mergeID); setApiError('');
    try {
      await apiService.deleteHoardingMerge(mergeID);
      setMerges(prev => prev.filter(m => m.hoardingMergeID !== mergeID));
    } catch (err) {
      setApiError(err?.response?.data?.message || err?.message || 'Failed to remove merge.');
    } finally { setDeletingId(null); }
  };

  // Group merges by direction for display
  const hMerges = merges.filter(m => m.mergeAlongFlag === 'H');
  const vMerges = merges.filter(m => m.mergeAlongFlag === 'V');

  const renderMergeRow = (m, idx, total) => {
    const h = allHoardingsRaw.find(hh => hh.hoardingID === m.hoardingID);
    const site = h ? siteMap[h.siteID] : null;
    const addr = site ? [site.addressLine1, site.city].filter(Boolean).join(', ') : '';
    const isDeleting = deletingId === m.hoardingMergeID;
    return (
      <div key={m.hoardingMergeID} style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px',
        borderBottom: idx < total - 1 ? '1px solid #f0f0f8' : 'none',
        background: idx % 2 === 0 ? '#fff' : '#fafafe',
        opacity: isDeleting ? 0.5 : 1, transition: 'opacity 0.2s',
      }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {m.mergeAlongFlag === 'H' ? <ArrowLeftRight size={15} color="#7c3aed" /> : <ArrowUpDown size={15} color="#7c3aed" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 13, color: '#7c3aed' }}>
            {h?.hoardingCode || `Hoarding ${m.hoardingID}`}
            {h?.width && h?.height && (
              <span style={{ color: '#9090a8', fontWeight: 600, marginLeft: 8, fontSize: 12 }}>{h.width}×{h.height} ft</span>
            )}
          </div>
          {addr && (
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11.5, color: '#9090a8', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={10} color="#c0c0d8" style={{ flexShrink: 0 }} />{addr}
            </div>
          )}
        </div>
        <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 12, background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)', whiteSpace: 'nowrap' }}>
          {m.mergeAlongFlag === 'H' ? '↔ Horizontal' : '↕ Vertical'}
        </span>
        <button
          disabled={isDeleting}
          onClick={() => handleDelete(m.hoardingMergeID)}
          title="Remove from merge"
          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}
        >
          {isDeleting ? <Loader2 size={12} className="pg-spin" /> : <Trash2 size={13} />}
        </button>
      </div>
    );
  };

  return (
    <div className="hd-section-card">
      <div className="hd-section-head">
        <div className="hd-section-icon-wrap" style={{ background: 'rgba(124,58,237,0.10)' }}>
          <GitMerge size={14} color="#7c3aed" />
        </div>
        <div>
          <div className="hd-section-title" style={{ color: '#7c3aed' }}>Hoarding Merges</div>
          <div className="hd-section-sub">Hoardings physically merged in this contract</div>
        </div>
        {merges.length > 0 && (
          <span style={{ marginLeft: 'auto', background: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 11.5, fontWeight: 800, fontFamily: 'Nunito, sans-serif' }}>
            {merges.length} merged
          </span>
        )}
      </div>

      <div className="hd-section-body">
        {apiError && (
          <div className="pg-field-error" style={{ marginBottom: 12 }}>
            <AlertCircle size={11} style={{ flexShrink: 0 }} />
            <span>{apiError}</span>
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => setApiError('')}>✕</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9090a8' }}>
            <Loader2 size={20} className="pg-spin" style={{ marginBottom: 6 }} />
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600 }}>Loading merge data…</div>
          </div>
        ) : (
          <>
            {merges.length === 0 && (
              <div style={{ textAlign: 'center', padding: '22px 0 14px', color: '#b0b0c8' }}>
                <GitMerge size={28} color="#d0d0e8" style={{ marginBottom: 8 }} />
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700, color: '#9090a8' }}>No hoardings merged yet</div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#c0c0d8', marginTop: 3 }}>
                  Select hoardings from this contract and merge them below.
                </div>
              </div>
            )}

            {/* Horizontal merges group */}
            {hMerges.length > 0 && (
              <div style={{ border: '1.5px solid rgba(124,58,237,0.20)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: '8px 14px', background: 'rgba(124,58,237,0.06)', borderBottom: '1px solid rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowLeftRight size={13} color="#7c3aed" />
                  <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, color: '#7c3aed' }}>Horizontal Merge · {hMerges.length} hoarding{hMerges.length !== 1 ? 's' : ''}</span>
                </div>
                {hMerges.map((m, i) => renderMergeRow(m, i, hMerges.length))}
              </div>
            )}

            {/* Vertical merges group */}
            {vMerges.length > 0 && (
              <div style={{ border: '1.5px solid rgba(124,58,237,0.20)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: '8px 14px', background: 'rgba(124,58,237,0.06)', borderBottom: '1px solid rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowUpDown size={13} color="#7c3aed" />
                  <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, color: '#7c3aed' }}>Vertical Merge · {vMerges.length} hoarding{vMerges.length !== 1 ? 's' : ''}</span>
                </div>
                {vMerges.map((m, i) => renderMergeRow(m, i, vMerges.length))}
              </div>
            )}

            {/* Add merge button */}
            <button
              onClick={() => { setApiError(''); setPickOpen(true); }}
              disabled={saving || contractHoardings.length < 2}
              title={contractHoardings.length < 2 ? 'Add at least 2 hoardings to this contract first' : ''}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px 0', borderRadius: 10,
                border: `1.5px dashed ${contractHoardings.length < 2 ? '#e0e0e0' : 'rgba(124,58,237,0.35)'}`,
                background: '#fafafe', cursor: saving || contractHoardings.length < 2 ? 'not-allowed' : 'pointer',
                fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800,
                color: contractHoardings.length < 2 ? '#c0c0d8' : '#7c3aed',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (contractHoardings.length >= 2) e.currentTarget.style.borderColor = '#7c3aed'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = contractHoardings.length < 2 ? '#e0e0e0' : 'rgba(124,58,237,0.35)'; }}
            >
              {saving
                ? <><Loader2 size={14} className="pg-spin" /> Saving…</>
                : contractHoardings.length < 2
                  ? <><Building2 size={14} /> Add hoardings to this contract first</>
                  : <><GitMerge size={14} /> Add Hoarding Merge</>}
            </button>

            {contractHoardings.length >= 2 && (
              <div style={{ marginTop: 6, fontFamily: 'Nunito, sans-serif', fontSize: 11.5, color: '#9090a8', fontWeight: 600 }}>
                {contractHoardings.length} hoardings in this contract available for merging
              </div>
            )}
          </>
        )}
      </div>

      {pickOpen && (
        <MergePickerModal
          hoardings={contractHoardings}
          sites={sites}
          existingMergeHoardingIds={mergedHoardingIds}
          onConfirm={handleMerge}
          onClose={() => setPickOpen(false)}
        />
      )}
    </div>
  );
}
function ContractPDFModal({ contract, customer, hoardings, sites, quotations = [], onClose }) {
  const [maps, setMaps] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photoSelections, setPhotoSelections] = useState({});
  const [generating, setGenerating] = useState(false);
  const [allTerms, setAllTerms] = useState([]);
  const [selectedTermIds, setSelectedTermIds] = useState(new Set());
  const [termsLoading, setTermsLoading] = useState(true);
  const [allHoardingsRaw, setAllHoardingsRaw] = useState([]);
  const [hoardingTypes, setHoardingTypes] = useState([]);

  const siteMap = useMemo(
    () => Object.fromEntries(sites.map(s => [s.siteID, s])),
    [sites]
  );

  const hoardingTypeMap = useMemo(() => {
    return Object.fromEntries(hoardingTypes.map(t => [t.hoardingType, t.typeName]));
  }, [hoardingTypes]);

  useEffect(() => {
    (async () => {
      try {
        const [res, rawTypes] = await Promise.all([
          apiService.getAllHoardings(),
          apiService.getAllHoardingTypes(),
        ]);
        const extractArray = (r) => {
          if (Array.isArray(r)) return r;
          if (Array.isArray(r?.$values)) return r.$values;
          if (Array.isArray(r?.data)) return r?.data;
          return [];
        };
        setAllHoardingsRaw(extractArray(res));
        setHoardingTypes(extractArray(rawTypes));
      } catch { /* silent */ }
    })();
  }, []);
  useEffect(() => {
    if (!contract?.customerContractID) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const rawMaps = await apiService.getCustomerContractHoardingMaps(
          contract.customerContractID
        ).catch(() => []);
        const mapList = (Array.isArray(rawMaps) ? rawMaps : [])
          .filter(m => Number(m.customerContractID ?? m.CustomerContractID) === Number(contract.customerContractID));
        setMaps(mapList);
        const defaults = {};
        mapList.forEach(m => { defaults[Number(m.hoardingID ?? m.HoardingID ?? 0)] = true; });
        setPhotoSelections(defaults);
      } catch (err) {
        console.error('[ContractPDF] load error:', err?.message);
      } finally { setLoading(false); }
    })();
  }, [contract?.customerContractID]);
  useEffect(() => {
    (async () => {
      setTermsLoading(true);
      try {
        const res = await apiService.getAllCustomerTerms();
        const list = Array.isArray(res) ? res : [];
        const sorted = [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setAllTerms(sorted);
        // Default: select all
        setSelectedTermIds(new Set(sorted.map(t => t.termID)));
      } catch { /* silent */ }
      finally { setTermsLoading(false); }
    })();
  }, []);

  const [hoardingPhotos, setHoardingPhotos] = useState({});

  useEffect(() => {
    if (!maps.length || !allHoardingsRaw.length) return;
    setHoardingPhotos({});
    (async () => {
      try {
        // Fetch ALL hoarding photos at once
        const allPhotos = await apiService.getAllHoardingPhotos?.()
          ?? await fetch(`${API_ROOT_URL}/api/HoardingPhoto`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
          }).then(r => r.json());

        const photoList = Array.isArray(allPhotos) ? allPhotos : [];

        const photoMap = {};

        for (const m of maps) {
          const hid = Number(m.hoardingID ?? m.HoardingID ?? 0);
          if (!hid) continue;

          // Find the hoardingCode for this hoardingID from allHoardingsRaw
          const hoardingRecord = allHoardingsRaw.find(h => Number(h.hoardingID) === hid);
          const hoardingCode = hoardingRecord?.hoardingCode;

          // Get ALL hoardingIDs that share this hoardingCode
          const allIDsForCode = hoardingCode
            ? allHoardingsRaw
              .filter(h => h.hoardingCode === hoardingCode)
              .map(h => Number(h.hoardingID))
            : [hid];

          // Get all photos for any of those hoardingIDs
          const relevantPhotos = photoList.filter(p =>
            allIDsForCode.includes(Number(p.hoardingID ?? p.HoardingID ?? 0))
          );

          if (!relevantPhotos.length) continue;

          // Sort by effdt desc, tiebreak by highest hoardingPhotoID → latest photo
          const sorted = [...relevantPhotos].sort((a, b) => {
            const rawA = a.effdt ?? a.Effdt ?? null;
            const rawB = b.effdt ?? b.Effdt ?? null;
            const da = rawA ? new Date(rawA).getTime() : 0;
            const db = rawB ? new Date(rawB).getTime() : 0;
            if (db !== da) return db - da;
            return (b.hoardingPhotoID ?? 0) - (a.hoardingPhotoID ?? 0);
          });

          const best = sorted[0];
          const path = best.photoPath ?? best.PhotoPath ?? '';
          if (!path) continue;

          const url = path.startsWith('http')
            ? path
            : `${API_ROOT_URL}${path.startsWith('/') ? path : '/' + path}`;

          photoMap[hid] = url;
        }

        setHoardingPhotos(photoMap);
      } catch (err) {
        console.error('[AllPhotos] error:', err?.message);
      }
    })();
  }, [maps, allHoardingsRaw]);

  const photoUrlMap = useMemo(() => {
    return hoardingPhotos;
  }, [hoardingPhotos]);

  const hoardingItems = useMemo(() => maps.map(m => {
    const hid = Number(m.hoardingID ?? m.HoardingID ?? 0);

    // Search in the RAW (non-deduplicated) list so exact hoardingID always matches
    const h = allHoardingsRaw.find(hh => Number(hh.hoardingID) === hid);

    const rawSiteID = h?.siteID ?? null;

    const site =
      (rawSiteID != null ? siteMap[rawSiteID] : null) ||
      (rawSiteID != null ? siteMap[Number(rawSiteID)] : null) ||
      (rawSiteID != null ? siteMap[String(rawSiteID)] : null) ||
      null;

    const addrParts = [
      site?.addressLine1,
      site?.addressLine2,
      site?.landmark ? `Nr. ${site.landmark}` : null,
      [site?.city, site?.district].filter(Boolean).join(', ') || null,
    ].filter(Boolean);
    const address = [...new Set(addrParts)].join(', ');

    // hoardingCode comes directly from the raw hoarding record
    const hoardingCode = h?.hoardingCode ?? `#${hid}`;

    return {
      hoardingID: hid,
      hoardingCode,   // ← now always the real code e.g. "J880", "HOARDING22"
      address,
      size: h?.width && h?.height ? `${h.width}×${h.height}` : '',
      material: h?.material || '',
      contractStatus: h?.status || 'Available Now',
      monthlyRent: h?.monthlyRent || 0,
      hoardingTypeName: hoardingTypeMap[h?.hoardingType] || 'Hoarding',
    };
  }), [maps, allHoardingsRaw, siteMap, hoardingTypeMap]);

  const togglePhoto = (hid) =>
    setPhotoSelections(p => ({ ...p, [hid]: !p[hid] }));

  const selectedCount = Object.values(photoSelections).filter(Boolean).length;

  const handleGenerate = () => {
    setGenerating(true);
    try {
      const selectedTerms = allTerms
        .filter(t => selectedTermIds.has(t.termID))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(t => t.description);

      const { cgstPct, sgstPct } = getContractGst(contract, quotations);
      const html = buildContractPDFHTML({
        company: CONTRACT_COMPANY,
        customer,
        contract,
        hoardingItems,
        photoUrlMap,
        photoSelections,
        terms: selectedTerms,       // ← pass selected terms
        cgstPct,
        sgstPct,
      });
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
      else alert('Popup blocked. Please allow popups for this site and try again.');
    } finally { setGenerating(false); }
  };

  /* ── styles ── */
  const S = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    },
    modal: {
      background: '#fff', borderRadius: 20, width: '100%', maxWidth: 660,
      maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      boxShadow: '0 8px 40px rgba(15,23,42,0.18)',
      overflow: 'hidden', border: '1.5px solid #e8e8f4',
    },
    /* ── Header — matches "Add New Site" style ── */
    header: {
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '20px 24px 18px',
      borderBottom: '1.5px solid #f0f0f8',
      background: '#fff',
      flexShrink: 0,
    },
    iconWrap: {
      width: 46, height: 46, borderRadius: 14, flexShrink: 0,
      background: 'linear-gradient(135deg, #e8f6fd, #ede9ff)',
      border: '1.5px solid #d0e8f8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
      fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 17, color: '#1a1a2e', margin: 0,
    },
    headerSub: {
      fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600,
      color: '#9090a8', marginTop: 2,
    },
    closeBtn: {
      marginLeft: 'auto', width: 34, height: 34, borderRadius: 10, flexShrink: 0,
      background: '#f5f5fb', border: '1px solid #e8e8f0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', color: '#9090a8', transition: 'all 0.15s',
    },
    /* ── Body ── */
    body: { flex: 1, overflowY: 'auto', padding: '20px 24px' },
    bodyLabel: {
      fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800,
      color: '#5a5a78', marginBottom: 14, display: 'block',
    },
    /* ── Hoarding card ── */
    hoardingCard: (photoOn) => ({
      border: `1.5px solid ${photoOn ? '#e8e8f4' : '#f0f0f8'}`,
      borderRadius: 12, overflow: 'hidden',
      opacity: photoOn ? 1 : 0.6, transition: 'all 0.15s',
      marginBottom: 10,
    }),
    hoardingInner: {
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
    },
    thumbnail: {
      width: 76, height: 56, borderRadius: 9, flexShrink: 0, overflow: 'hidden',
      background: '#f0f0f8', border: '1.5px solid #e8e8f4',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    hoardingCode: {
      fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 13.5, color: '#6c63ff',
    },
    hoardingSize: {
      color: '#9090a8', fontWeight: 600, marginLeft: 7, fontSize: 11,
    },
    hoardingAddr: {
      fontFamily: 'Nunito, sans-serif', fontSize: 11.5, color: '#6b7280',
      fontWeight: 600, marginTop: 3,
      display: 'flex', alignItems: 'center', gap: 4,
      overflow: 'hidden',
    },
    hoardingRent: {
      fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#16a34a',
      fontWeight: 700, marginTop: 3,
    },
    noPhotoWarn: {
      fontFamily: 'Nunito, sans-serif', fontSize: 10.5, color: '#d97706',
      fontWeight: 700, marginTop: 3,
    },
    /* ── Toggle ── */
    toggleWrap: {
      flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    },
    toggleLabel: (on) => ({
      fontFamily: 'Nunito, sans-serif', fontSize: 10.5, fontWeight: 800,
      color: on ? '#049edf' : '#b0b0c8',
    }),
    toggleTrack: (on) => ({
      width: 44, height: 24, borderRadius: 12,
      background: on ? '#049edf' : '#d8d8e8',
      cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
    }),
    toggleThumb: (on) => ({
      position: 'absolute', top: 4,
      left: on ? 23 : 4,
      width: 16, height: 16, borderRadius: '50%', background: '#fff',
      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.22)',
    }),
    /* ── Summary strip ── */
    summaryStrip: {
      marginTop: 16, padding: '10px 14px', borderRadius: 10,
      background: '#f8f8fd', border: '1.5px solid #e8e8f4',
      fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#7878a0', fontWeight: 600,
    },
    /* ── Footer ── */
    footer: {
      padding: '14px 24px', borderTop: '1.5px solid #f0f0f8',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: '#fafafe', flexShrink: 0, gap: 12,
    },
    generateBtn: (enabled) => ({
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '10px 28px', borderRadius: 11, border: 'none',
      background: enabled
        ? 'linear-gradient(135deg, #049edf, #6c63ff)'
        : '#e0e0f0',
      color: enabled ? '#fff' : '#b0b0c8',
      cursor: enabled && !generating ? 'pointer' : 'not-allowed',
      fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800,
      minWidth: 190, justifyContent: 'center',
      boxShadow: enabled ? '0 4px 18px rgba(4,158,223,0.35)' : 'none',
      transition: 'all 0.15s',
    }),
  };

  return ReactDOM.createPortal(
    // <div onClick={onClose} style={S.overlay}>
    <div style={S.overlay}>
      <div onClick={e => e.stopPropagation()} style={S.modal}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.iconWrap}>
            <FileText size={20} color="#049edf" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={S.headerTitle}>Generate Contract PDF</div>
            <div style={S.headerSub}>
              {customer?.customerName} · Contract #{contract?.customerContractID}
            </div>
          </div>
          <button
            onClick={onClose}
            style={S.closeBtn}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f5f5fb'; e.currentTarget.style.color = '#9090a8'; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={S.body}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#9090a8' }}>
              <Loader2 size={28} className="pg-spin" style={{ marginBottom: 10 }} />
              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600 }}>Loading hoarding data…</div>
            </div>
          ) : hoardingItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#9090a8' }}>
              <Building2 size={38} color="#d0d0e8" style={{ marginBottom: 10 }} />
              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700, color: '#7878a0' }}>No hoardings linked to this contract</div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#b0b0c8', marginTop: 4 }}>
                Link hoardings first before generating the PDF.
              </div>
            </div>
          ) : (
            <>
              <span style={S.bodyLabel}>
                Toggle which hoardings should include a photo in the PDF:
              </span>

              <div>
                {hoardingItems.map(item => {
                  const hasPhoto = !!photoUrlMap[item.hoardingID];
                  const photoOn = photoSelections[item.hoardingID] !== false;
                  return (
                    <div key={item.hoardingID} style={S.hoardingCard(photoOn)}>
                      <div style={S.hoardingInner}>
                        {/* Thumbnail */}
                        <div style={S.thumbnail}>
                          {hasPhoto ? (
                            <img src={photoUrlMap[item.hoardingID]} alt={item.hoardingCode}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          ) : (
                            <div style={{ textAlign: 'center', color: '#c0c0d8' }}>
                              <Image size={20} color="#d0d0e8" />
                              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 9, marginTop: 2, color: '#c0c0d8' }}>No photo</div>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={S.hoardingCode}>
                            {item.hoardingCode}
                            {item.size && <span style={S.hoardingSize}>{item.size} ft</span>}
                          </div>
                          {item.address && (
                            <div style={{
                              fontFamily: 'Nunito, sans-serif', fontSize: 11.5, color: '#6b7280',
                              fontWeight: 600, marginTop: 3,
                              display: 'flex', alignItems: 'flex-start', gap: 4,
                              lineHeight: 1.4,
                            }}>
                              <MapPin size={10} color="#c0c0d8" style={{ flexShrink: 0, marginTop: 2 }} />
                              <span>{item.address}</span>
                            </div>
                          )}
                          {item.material && (
                            <div style={{
                              fontFamily: 'Nunito, sans-serif', fontSize: 10.5, color: '#9090a8',
                              fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                              <Tag size={9} color="#c0c0d8" />
                              {item.material}
                            </div>
                          )}
                          {item.monthlyRent > 0 && (
                            <div style={S.hoardingRent}>
                              ₹{Number(item.monthlyRent).toLocaleString('en-IN')}/mo
                            </div>
                          )}
                          {!hasPhoto && (
                            <div style={S.noPhotoWarn}>⚠ No banner image uploaded</div>
                          )}
                        </div>

                        {/* Toggle */}
                        <div style={S.toggleWrap}>
                          <span style={S.toggleLabel(photoOn)}>
                            {photoOn ? 'Photo ON' : 'Photo OFF'}
                          </span>
                          <div
                            onClick={() => togglePhoto(item.hoardingID)}
                            style={S.toggleTrack(photoOn)}
                          >
                            <div style={S.toggleThumb(photoOn)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary strip */}
              <div style={S.summaryStrip}>
                PDF will include:{' '}
                <strong style={{ color: '#1a1a2e' }}>{hoardingItems.length} hoarding{hoardingItems.length !== 1 ? 's' : ''}</strong>
                {' · '}
                <strong style={{ color: '#049edf' }}>{selectedCount} with photo</strong>
                {' · '}Cover page · Terms &amp; Conditions
              </div>
              {/* ── Terms Selection ── */}
              <div style={{ marginTop: 20 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 10,
                }}>
                  <span style={{
                    fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 800, color: '#5a5a78',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <FileText size={13} color="#5a5a78" /> Terms &amp; Conditions
                    {!termsLoading && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: '#9090a8', marginLeft: 4,
                      }}>
                        ({selectedTermIds.size}/{allTerms.length} selected)
                      </span>
                    )}
                  </span>
                  {!termsLoading && allTerms.length > 0 && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setSelectedTermIds(new Set(allTerms.map(t => t.termID)))}
                        style={{
                          padding: '3px 10px', borderRadius: 6, border: '1px solid #e8e8f4',
                          background: '#f8f8fd', cursor: 'pointer',
                          fontFamily: 'Nunito, sans-serif', fontSize: 11, fontWeight: 800, color: '#049edf',
                        }}>
                        All
                      </button>
                      <button
                        onClick={() => setSelectedTermIds(new Set())}
                        style={{
                          padding: '3px 10px', borderRadius: 6, border: '1px solid #e8e8f4',
                          background: '#f8f8fd', cursor: 'pointer',
                          fontFamily: 'Nunito, sans-serif', fontSize: 11, fontWeight: 800, color: '#9090a8',
                        }}>
                        None
                      </button>
                    </div>
                  )}
                </div>

                {termsLoading ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#9090a8' }}>
                    <Loader2 size={18} className="pg-spin" style={{ marginBottom: 4 }} />
                    <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12 }}>Loading terms…</div>
                  </div>
                ) : allTerms.length === 0 ? (
                  <div style={{
                    padding: '14px', borderRadius: 10, background: '#f8f8fd',
                    border: '1.5px dashed #e0e0f0', textAlign: 'center',
                    fontFamily: 'Nunito, sans-serif', fontSize: 12.5, color: '#b0b0c8', fontWeight: 600,
                  }}>
                    No terms found. Add terms in the Customer Terms section.
                  </div>
                ) : (
                  <div style={{
                    border: '1.5px solid #e8e8f4', borderRadius: 12, overflow: 'hidden',
                  }}>
                    {allTerms.map((term, idx) => {
                      const isOn = selectedTermIds.has(term.termID);
                      return (
                        <div
                          key={term.termID}
                          onClick={() => setSelectedTermIds(prev => {
                            const next = new Set(prev);
                            isOn ? next.delete(term.termID) : next.add(term.termID);
                            return next;
                          })}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 14px', cursor: 'pointer',
                            background: isOn ? '#fff' : '#f8f8fd',
                            borderBottom: idx < allTerms.length - 1 ? '1px solid #f0f0f8' : 'none',
                            opacity: isOn ? 1 : 0.5, transition: 'all 0.12s',
                          }}>
                          {/* Checkbox */}
                          <div style={{
                            width: 17, height: 17, borderRadius: 5, flexShrink: 0, marginTop: 1,
                            border: `2px solid ${isOn ? '#049edf' : '#d0d0e0'}`,
                            background: isOn ? '#049edf' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.12s',
                          }}>
                            {isOn && <Check size={10} color="#fff" strokeWidth={3} />}
                          </div>
                          {/* Order badge + description */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                              <span style={{
                                fontFamily: 'Nunito, sans-serif', fontSize: 10.5, fontWeight: 800,
                                padding: '1px 7px', borderRadius: 10,
                                background: 'rgba(4,158,223,0.08)', color: '#049edf',
                                border: '1px solid rgba(4,158,223,0.2)', whiteSpace: 'nowrap',
                              }}>
                                #{term.order ?? idx + 1}
                              </span>
                            </div>
                            <div style={{
                              fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600,
                              color: '#374151', lineHeight: 1.5,
                            }}>
                              {term.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={S.footer}>
          <button onClick={onClose} className="pg-btn-cancel" style={{ fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || loading || hoardingItems.length === 0}
            style={S.generateBtn(hoardingItems.length > 0 && !generating && !loading)}
            onMouseEnter={e => {
              if (hoardingItems.length > 0 && !generating) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 26px rgba(4,158,223,0.46)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = hoardingItems.length > 0 ? '0 4px 18px rgba(4,158,223,0.35)' : 'none';
            }}
          >
            {generating
              ? <><Loader2 size={14} className="pg-spin" /> Building PDF…</>
              : <><FileText size={14} /> Open &amp; Download PDF</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
async function addHoardingEffdtRows(hoardingIDs, allHoardings, effdt, status) {
  if (!hoardingIDs.length || !effdt) return;

  await Promise.allSettled(
    hoardingIDs.map(async (hid) => {
      const h = allHoardings.find(hh =>
        Number(hh.hoardingID ?? hh.HoardingID) === Number(hid)
      );
      if (!h || !h.hoardingCode) {
        console.warn('[ContractEffdt] hoarding not found:', hid);
        return;
      }

      const payload = {
        effdt,                              // "YYYY-MM-DD"
        material: h.material ?? '',
        hoardingType: Number(h.hoardingType ?? 0),
        status,                             // 'Occupied' or 'Available'
        monthlyRent: Number(h.monthlyRent ?? 0),
        width: Number(h.width ?? 0),
        height: Number(h.height ?? 0),
        siteID: Number(h.siteID ?? 0),
      };

      console.log('[ContractEffdt]', h.hoardingCode, '→', effdt, status, payload);
      return apiService.addHoardingEffdt(h.hoardingCode, payload);
    })
  );
}
async function saveHoardingLinkWithPhotosRows(hoardingIDs, allHoardings, effdt, status) {
  if (!hoardingIDs.length || !effdt) return;

  await Promise.allSettled(
    hoardingIDs.map(async (hid) => {
      const h = allHoardings.find(hh =>
        Number(hh.hoardingID ?? hh.HoardingID) === Number(hid)
      );
      if (!h || !h.hoardingCode) {
        console.warn('[saveHoardingLinkWithPhotosRows] hoarding not found:', hid);
        return;
      }

      const payload = {
        hoardingID: Number(hid),
        effdt: effdt ? effdt.split('T')[0] : new Date().toISOString().split('T')[0],
        hoardingCode: h.hoardingCode ?? h.HoardingCode ?? '',
        material: h.material ?? h.Material ?? '',
        hoardingType: Number(h.hoardingType ?? h.HoardingType ?? 0),
        status,
        monthlyRent: Number(h.monthlyRent ?? h.MonthlyRent ?? 0),
        width: Number(h.width ?? h.Width ?? 0),
        height: Number(h.height ?? h.Height ?? 0),
        siteID: Number(h.siteID ?? h.SiteID ?? h.site?.siteID ?? 0),
      };

      console.log('[saveHoardingLinkWithPhotosRows]', h.hoardingCode, '→', payload);
      return apiService.saveHoardingLinkWithPhotos(payload);
    })
  );
}
/* ═══════════════════════════════════════════
   CONTRACT FORM
═══════════════════════════════════════════ */
function ContractForm({ mode, contract, customers, hoardings, allHoardingsRaw = [], sites, paymentFreqs, contracts, landContracts = [], hoardingMaps = [], quotations = [], onBack, onSave }) {
  const isAdd = mode === 'add';
  const viewOnly = !isAdd; // edit mode = view-only (attachments still editable)
  const currentContractID = isAdd ? null : (contract?.customerContractID ?? null);

  // ── Multi-hoarding pre-selection (add mode only) ──
  const [selectedHoardings, setSelectedHoardings] = useState([]);
  const [hoardingModalOpen, setHoardingModalOpen] = useState(false);

  // ── Available hoardings (date-filtered from API) ──
  const [availableHoardings, setAvailableHoardings] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [availableErr, setAvailableErr] = useState('');
  const checkLandContractWarning = (hoardingID, endDate) => {
    if (!hoardingID || !endDate) { setLandContractWarning(null); return; }

    // Find all land contract maps for this hoarding
    const maps = hoardingMaps.filter(m =>
      Number(m.hoardingID ?? m.HoardingID) === Number(hoardingID)
    );

    if (!maps.length) { setLandContractWarning(null); return; }

    for (const map of maps) {
      const lcID = map.landContractID ?? map.LandContractID;
      const lc = landContracts.find(c => Number(c.landContractID) === Number(lcID));
      if (!lc || !lc.endDate) continue;

      if (endDate > lc.endDate) {
        setLandContractWarning({
          landContractID: lc.landContractID,
          landContractEnd: lc.endDate,
          status: lc.status,
        });
        return;
      }
    }

    setLandContractWarning(null);
  };
  const [form, setForm] = useState(() =>
    isAdd
      ? {
        ...EMPTY_FORM,
        customerID: contract?.customerID ?? '',
      }
      : {
        customerID: contract?.customerID ?? '',
        // hoardingID: contract?.hoardingID ?? '',
        startDate: contract?.startDate ?? '',
        endDate: contract?.endDate ?? '',
        contractOrigValue: contract?.contractOrigValue ?? '',
        paymentFreqID: contract?.paymentFreqID ?? '',
        amountPerFreq: contract?.amountPerFreq ?? '',
        advancePaid: contract?.advancePaid ?? '',
        status: contract?.status ?? 'Active',
        discountAmount: contract?.discountAmount ?? '',
        adjustmentAmount: contract?.adjustmentAmount ?? '',
        contractFinalValue: contract?.contractFinalValue ?? '',
        comments: contract?.comments ?? '',
      }
  );

  const [savedContractID, setSavedContractID] = useState(
    isAdd ? null : (contract?.customerContractID ?? null)
  );

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [savingAttach, setSavingAttach] = useState(false);
  const [attachSaveOk, setAttachSaveOk] = useState(false);
  const [liveConflict, setLiveConflict] = useState(null);        // ← must be here
  const [landContractWarning, setLandContractWarning] = useState(null);

  // ── New states for attachment flow ──
  const [contractSaved, setContractSaved] = useState(!isAdd); // true immediately in edit mode
  const [attachmentList, setAttachmentList] = useState([]);
  const [bannerErr, setBannerErr] = useState('');

  // Stable callback — avoids infinite re-render in AttachmentSection
  const handleAttachmentsChange = useCallback((list) => {
    setAttachmentList(list);
    // Auto-clear the banner error once a Banner Design is uploaded
    setBannerErr(prev =>
      prev && list.some(a => a.fileUploadType === 'Banner Design') ? '' : prev
    );
  }, []);

  // ── States for deferred map and attachment management ──
  const [localMaps, setLocalMaps] = useState([]);
  const [deletedMapIDs, setDeletedMapIDs] = useState([]);
  const [localAttachments, setLocalAttachments] = useState([]);
  const [deletedAttachIDs, setDeletedAttachIDs] = useState([]);

  // Fetch initial maps and attachments once savedContractID is set
  useEffect(() => {
    if (!savedContractID) {
      setLocalMaps([]);
      setLocalAttachments([]);
      setDeletedMapIDs([]);
      setDeletedAttachIDs([]);
      return;
    }

    let active = true;

    // Fetch initial mapped hoardings
    apiService.getCustomerContractHoardingMaps(savedContractID)
      .then(res => {
        if (!active) return;
        const mapList = Array.isArray(res) ? res : res?.data ?? [];
        const enriched = mapList.map(m => {
          const hid = Number(m.hoardingID ?? m.HoardingID ?? 0);
          let h = allHoardingsRaw.find(hh => Number(hh.hoardingID ?? hh.HoardingID ?? hh.id) === hid);
          return {
            customerContractLineID: m.customerContractLineID ?? m.CustomerContractLineID ?? null,
            customerContractID: Number(m.customerContractID ?? m.CustomerContractID),
            customerID: Number(m.customerID ?? m.CustomerID),
            hoardingID: hid,
            hoardingCode: h?.hoardingCode ?? `#${hid}`,
            material: h?.material ?? '',
            width: h?.width ?? 0,
            height: h?.height ?? 0,
            status: h?.status === 'Occupied' ? 'Available' : (h?.status ?? 'Available'),
            siteID: h?.siteID ?? null,
            monthlyRent: h?.monthlyRent ?? 0,
          };
        });
        setLocalMaps(enriched);
      })
      .catch(() => { });

    // Fetch initial attachments
    apiService.getCustContractAttachments(savedContractID)
      .then(res => {
        if (!active) return;
        const list = Array.isArray(res) ? res : [];
        setLocalAttachments(list.map(normalizeAttach));
      })
      .catch(() => { });

    return () => {
      active = false;
    };
  }, [savedContractID, allHoardingsRaw]);

  const freqOptions = paymentFreqs.length ? paymentFreqs : PAYMENT_FREQ_FALLBACK;

  // ── Fetch available hoardings whenever start+end dates are both set (add mode) ──
  useEffect(() => {
    if (!isAdd) return;
    if (!form.startDate || !form.endDate) {
      setAvailableHoardings([]);
      setAvailableErr('');
      // Clear selected hoardings that may no longer be available
      setSelectedHoardings([]);
      return;
    }
    let cancelled = false;
    setLoadingAvailable(true);
    setAvailableErr('');
    apiService.getAvailableHoardings(form.startDate, form.endDate)
      .then(res => {
        if (cancelled) return;
        const raw = Array.isArray(res) ? res : res?.data ?? [];
        // Normalize: availability API uses 'hoardingId' (camelCase), modal needs 'hoardingID'
        const list = raw.map(h => ({
          ...h,
          hoardingID: h.hoardingId ?? h.hoardingID ?? 0,
          status: h.status || 'Available',
          // Build inline address string for modal display (no siteID in availability API)
          _inlineAddr: [h.addressLine1, h.city, h.district].filter(Boolean).join(', '),
        }));
        setAvailableHoardings(list);
        // Remove previously selected hoardings that are no longer available
        const availableIds = new Set(list.map(h => Number(h.hoardingID)));
        setSelectedHoardings(prev => prev.filter(h => availableIds.has(Number(h.hoardingID))));
      })
      .catch(err => {
        if (cancelled) return;
        setAvailableErr(err?.response?.data?.message || err?.message || 'Failed to fetch available hoardings.');
        setAvailableHoardings([]);
      })
      .finally(() => { if (!cancelled) setLoadingAvailable(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.startDate, form.endDate, isAdd]);

  const set = (key, val) => {
    setForm(p => {
      const next = { ...p, [key]: val };
      if (key === 'hoardingID' || key === 'startDate' || key === 'endDate') {
        setLiveConflict(detectHoardingConflict(next, contracts, currentContractID));
        checkLandContractWarning(
          key === 'hoardingID' ? val : next.hoardingID,
          key === 'endDate' ? val : next.endDate
        );
      }
      return next;
    });
    if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
  };
  sessionStorage.getItem('contractFromQuot')
  // Inside ContractForm, add:
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState(null);
  const [showContractPDF, setShowContractPDF] = useState(false);

  const selectedCustomerObj = editedCustomer
    || customers.find(c => Number(c.customerID) === Number(form.customerID))
    || null;
  useEffect(() => {
    const orig = Number(String(form.contractOrigValue).replace(/,/g, '')) || 0;
    const disc = Number(String(form.discountAmount).replace(/,/g, '')) || 0;
    const adj = Number(String(form.adjustmentAmount).replace(/,/g, '')) || 0;
    const final = orig - disc + adj;
    setForm(p => ({ ...p, contractFinalValue: final >= 0 ? final : 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.contractOrigValue, form.discountAmount, form.adjustmentAmount]);

  const { cgstPct, sgstPct } = useMemo(() => {
    return getContractGst(form, quotations);
  }, [form.comments, quotations]);

  const finalValNum = Number(String(form.contractFinalValue).replace(/,/g, '')) || 0;
  const cgstAmt = Math.round((finalValNum * cgstPct) / 100);
  const sgstAmt = Math.round((finalValNum * sgstPct) / 100);
  const totalContractVal = finalValNum + cgstAmt + sgstAmt;

  const performSync = async (contractID) => {
    // 1. Delete maps
    for (const mapId of deletedMapIDs) {
      await apiService.deleteCustomerContractHoardingMap(mapId);
    }

    // 2. Add maps
    const mapsToAdd = localMaps.filter(m => String(m.customerContractLineID).startsWith('_temp'));
    for (const m of mapsToAdd) {
      await apiService.createCustomerContractHoardingMap({
        customerContractLineID: 0,
        customerContractID: contractID,
        customerID: Number(form.customerID),
        hoardingID: Number(m.hoardingID),
      });
    }

    // 3. Delete attachments
    for (const attachId of deletedAttachIDs) {
      await apiService.deleteCustContractAttach(attachId);
    }

    // 4. Add attachments
    const attachesToAdd = localAttachments.filter(a => a._isNew);
    for (const a of attachesToAdd) {
      await apiService.createCustContractAttach({
        customerContractID: contractID,
        ownerID: Number(a.ownerID) || 0,
        hoardingID: Number(a.hoardingID) || 0,
        fileUploadType: a.fileUploadType,
        file: a.file,
      });
    }
  };

  /* ── Save attachments only (edit / view mode) ── */
  const handleSaveAttachments = async () => {
    if (!savedContractID) return;
    setSavingAttach(true); setApiErr('');
    try {
      // Delete removed attachments
      for (const attachId of deletedAttachIDs) {
        await apiService.deleteCustContractAttach(attachId);
      }
      setDeletedAttachIDs([]);

      // Upload new attachments
      const attachesToAdd = localAttachments.filter(a => a._isNew);
      for (const a of attachesToAdd) {
        await apiService.createCustContractAttach({
          customerContractID: savedContractID,
          ownerID: Number(a.ownerID) || 0,
          hoardingID: Number(a.hoardingID) || 0,
          fileUploadType: a.fileUploadType,
          file: a.file,
        });
      }

      // Refresh attachments from server
      const fresh = await apiService.getCustContractAttachments(savedContractID).catch(() => []);
      const normalized = (Array.isArray(fresh) ? fresh : []).map(a => ({
        custContractAttachID: a.custContractAttachID ?? a.CustContractAttachID,
        customerContractID: a.customerContractID ?? a.CustomerContractID,
        ownerID: a.ownerID ?? a.OwnerID ?? 0,
        hoardingID: a.hoardingID ?? a.HoardingID ?? 0,
        fileUploadType: a.fileUploadType ?? a.FileUploadType ?? '',
        contractFilePath: a.contractFilePath ?? a.ContractFilePath ?? '',
        contractFilename: a.contractFilename ?? a.ContractFilename ?? '',
        lastUpdateDttm: a.lastUpdateDttm ?? a.LastUpdateDttm ?? '',
      }));
      setLocalAttachments(normalized);
      setAttachSaveOk(true);
      setTimeout(() => setAttachSaveOk(false), 2500);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save attachments.';
      setApiErr(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSavingAttach(false);
    }
  };

  /* ── Save contract ── */
  const handleSave = async () => {
    const errs = validateForm(form, contracts, currentContractID, true);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true); setApiErr('');
    try {
      const payload = {
        customerContractID: isAdd ? 0 : contract.customerContractID,
        customerID: Number(form.customerID),
        startDate: form.startDate,
        endDate: form.endDate,
        contractOrigValue: Number(String(form.contractOrigValue).replace(/,/g, '')) || 0,
        paymentFreqID: Number(form.paymentFreqID),
        amountPerFreq: Number(String(form.amountPerFreq).replace(/,/g, '')) || 0,
        advancePaid: Number(String(form.advancePaid).replace(/,/g, '')) || 0,
        status: form.status,
        discountAmount: Number(String(form.discountAmount).replace(/,/g, '')) || 0,
        adjustmentAmount: Number(String(form.adjustmentAmount).replace(/,/g, '')) || 0,
        contractFinalValue: Number(String(form.contractFinalValue).replace(/,/g, '')) || 0,
        comments: form.comments || '',
      };

      let saved;

      /* ════ ADD MODE ════ */
      if (isAdd) {
        const res = await apiService.createCustomerContract(payload);
        saved = normalizeContract(res?.data ?? res ?? payload);

        const hoardingsToMap = selectedHoardings.length > 0
          ? selectedHoardings
          : form.hoardingID ? [{ hoardingID: form.hoardingID }] : [];

        if (saved.customerContractID && hoardingsToMap.length > 0) {
          /* Map hoardings to contract */
          await Promise.allSettled(
            hoardingsToMap.map(h =>
              apiService.createCustomerContractHoardingMap({
                customerContractLineID: 0,
                customerContractID: saved.customerContractID,
                customerID: Number(form.customerID),
                hoardingID: Number(h.hoardingID),
              })
            )
          );

          /*
          await addHoardingEffdtRows(
            hoardingsToMap.map(h => Number(h.hoardingID)),
            hoardings,          // the hoardings prop passed to ContractForm
            form.startDate,     // effdt = contract start date
            'Occupied'          // hoarding is now occupied
          );
          */
          await saveHoardingLinkWithPhotosRows(
            hoardingsToMap.map(h => Number(h.hoardingID)),
            hoardings,          // the hoardings prop passed to ContractForm
            form.startDate,     // effdt = contract start date
            'Occupied'          // hoarding is now occupied
          );
        }

        /* ════ EDIT MODE ════ */
      } else {
        const prevStatus = contract?.status ?? '';
        const newStatus = form.status;

        await apiService.updateCustomerContract(payload);
        saved = { ...payload, customerContractID: contract.customerContractID };

        // Sync mapping and attachment changes to database for Edit mode
        await performSync(contract.customerContractID);

        /* ← NEW: if status changed to Terminated or Expired, mark hoardings Available */
        const isEnding = (newStatus === 'Terminated' || newStatus === 'Expired')
          && prevStatus !== 'Terminated' && prevStatus !== 'Expired';

        if (isEnding && form.endDate) {
          /* Fetch hoardings mapped to this contract */
          const rawMaps = await apiService
            .getCustomerContractHoardingMaps(contract.customerContractID)
            .catch(() => []);

          const maps = (Array.isArray(rawMaps) ? rawMaps : rawMaps?.data ?? [])
            .filter(m =>
              Number(m.customerContractID ?? m.CustomerContractID) ===
              Number(contract.customerContractID)
            );

          const hoardingIDs = maps.map(m => Number(m.hoardingID ?? m.HoardingID ?? 0)).filter(Boolean);

          /*
          await addHoardingEffdtRows(
            hoardingIDs,
            hoardings,        // the hoardings prop
            form.endDate,     // effdt = contract end date
            'Available'       // hoarding is now available
          );
          */
          await saveHoardingLinkWithPhotosRows(
            hoardingIDs,
            hoardings,        // the hoardings prop
            form.endDate,     // effdt = contract end date
            'Available'       // hoarding is now available
          );
        }
      }

      if (saved.customerContractID) setSavedContractID(saved.customerContractID);
      setSaveOk(true);
      onSave(saved, isAdd);

      if (isAdd) {
        setContractSaved(true);
        setTimeout(() => setSaveOk(false), 2500);
      } else {
        setTimeout(() => onBack(), 900);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Save failed.';
      setApiErr(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setSaving(false); }
  };

  /* ── Finish (add mode only) — validates banner image & commits deferred maps/attachments ── */
  const handleFinish = async () => {
    const hasBanner = attachmentList.some(a => a.fileUploadType === 'Banner Design');
    if (!hasBanner) {
      setBannerErr('Banner Design image is required. Please upload one before finishing.');
      // Scroll to attachment section
      document.querySelector('.hd-attach-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true);
    setApiErr('');
    try {
      await performSync(savedContractID);
      onBack();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to finish contract setup.';
      setApiErr(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  const hasBanner = attachmentList.some(a => a.fileUploadType === 'Banner Design');
  function CustomerEditModal({ customer, onSave, onClose }) {
    const [form, setForm] = useState({
      customerName: customer?.customerName ?? '',
      authorizedName: customer?.authorizedName ?? '',
      phone1: customer?.phone1 ?? '',
      phone2: customer?.phone2 ?? '',
      addressLine1: customer?.addressLine1 ?? '',
      addressLine2: customer?.addressLine2 ?? '',
      addressLine3: customer?.addressLine3 ?? '',
      city: customer?.city ?? '',
      district: customer?.district ?? '',
      gstNumber: customer?.gstNumber ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [apiErr, setApiErr] = useState('');
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
      if (!form.customerName.trim()) { setApiErr('Customer name is required.'); return; }
      setSaving(true); setApiErr('');
      try {
        await apiService.updateCustomer({ ...form, customerID: customer.customerID, country: 'India' });
        onSave({ ...customer, ...form, country: 'India' });
        onClose();
      } catch (err) {
        setApiErr(err?.response?.data?.message || err?.message || 'Save failed.');
      } finally { setSaving(false); }
    };

    const FIELDS = [
      { key: 'customerName', label: 'Customer Name', req: true, full: true, placeholder: 'e.g. Acme Corp' },
      { key: 'authorizedName', label: 'Authorized Person', req: false, full: false, placeholder: 'e.g. John Doe' },
      { key: 'phone1', label: 'Phone 1', req: false, full: false, placeholder: 'e.g. +91 98765 43210' },
      { key: 'phone2', label: 'Phone 2', req: false, full: false, placeholder: 'e.g. +91 98765 43211' },
      { key: 'addressLine1', label: 'Address Line 1', req: false, full: true, placeholder: 'e.g. 101, Business Park' },
      { key: 'addressLine2', label: 'Address Line 2', req: false, full: false, placeholder: 'e.g. Near Station, MG Road' },
      { key: 'addressLine3', label: 'Address Line 3 / Landmark', req: false, full: false, placeholder: 'e.g. landmark details' },
      { key: 'city', label: 'City', req: false, full: false, placeholder: 'e.g. Ahmedabad' },
      { key: 'district', label: 'District', req: false, full: false, placeholder: 'e.g. Ahmedabad' },
      { key: 'gstNumber', label: 'GST Number', req: false, full: false, placeholder: 'e.g. 24AAAAA0000A1Z5' },
    ];

    return ReactDOM.createPortal(
      // <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-overlay" >
        <div className="pg-modal" style={{ maxWidth: 560 }}>
          <div className="pg-modal__head">
            <div className="pg-modal__head-left">
              <div className="pg-modal__icon-wrap"><User size={20} color="#049edf" /></div>
              <div>
                <h5 className="pg-modal__title">Edit Customer</h5>
                <p className="pg-modal__subtitle">#{customer.customerID} · {customer.customerName}</p>
              </div>
            </div>
            <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
          </div>

          <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: '60vh' }}>
            {apiErr && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, color: '#dc2626', fontSize: 12.5, fontFamily: 'Nunito,sans-serif', fontWeight: 700 }}>
                <AlertCircle size={13} /> {apiErr}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {FIELDS.map(f => (
                <div key={f.key} style={f.full ? { gridColumn: '1 / -1' } : {}}>
                  <label style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 700, color: '#5a5a78', marginBottom: 4, display: 'block' }}>
                    {f.label}{f.req && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
                  </label>
                  <div className="pg-field-wrap pg-field-wrap--normal">
                    <input
                      className="pg-field-input"
                      value={form[f.key]}
                      placeholder={f.placeholder}
                      onChange={e => set(f.key, f.key === 'gstNumber' ? e.target.value.toUpperCase() : e.target.value)}
                      maxLength={f.key === 'gstNumber' ? 15 : undefined}
                      style={f.key === 'gstNumber' ? { letterSpacing: '0.05em', textTransform: 'uppercase' } : {}}
                    />
                  </div>
                </div>
              ))}
              <div>
                <label style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 700, color: '#5a5a78', marginBottom: 4, display: 'block' }}>
                  Country <span style={{ fontSize: 10, color: '#049edf', fontWeight: 800, background: 'rgba(4,158,223,0.08)', padding: '1px 6px', borderRadius: 4 }}>🔒 Fixed</span>
                </label>
                <div className="pg-field-wrap pg-field-wrap--normal" style={{ background: 'rgba(4,158,223,0.03)', cursor: 'not-allowed' }}>
                  <input className="pg-field-input" value="India" readOnly style={{ color: '#049edf', fontWeight: 800, cursor: 'not-allowed', pointerEvents: 'none' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pg-modal__foot">
            <button className="pg-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="pg-btn-save" onClick={handleSave} disabled={saving}>
              {saving
                ? <><Loader2 size={13} className="pg-spin" /> Saving…</>
                : <><Check size={13} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }
  return (
    <div className="hd-form-page">
      <div className="hd-topbar">
        <div className="hd-topbar-left">
          <button className="hd-back-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span className="d-none d-sm-inline">Back to Contracts</span>
            <span className="d-inline d-sm-none">Back</span>
          </button>
          <div className="hd-topbar-divider" />
          <div>
            <div className="hd-topbar-title">{isAdd ? 'Add Customer Contract' : `Contract #${contract?.customerContractID}`}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="hd-topbar-sub">{isAdd ? 'Fill in the details to create a new customer contract' : 'View contract details — only attachments can be changed'}</div>
              {viewOnly && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 20,
                  background: 'rgba(4,158,223,0.10)', border: '1px solid rgba(4,158,223,0.25)',
                  color: '#049edf', fontFamily: 'Nunito, sans-serif', fontSize: 11.5, fontWeight: 800,
                }}>
                  <Eye size={11} /> View Only
                </span>
              )}
            </div>
          </div>
        </div>
        {!isAdd && savedContractID && (
          <button
            onClick={() => setShowContractPDF(true)}
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 13, border: 'none',
              background: 'linear-gradient(135deg, #049edf, #6c63ff)',
              color: '#fff', cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800,
              boxShadow: '0 4px 18px rgba(4,158,223,0.35)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 26px rgba(4,158,223,0.46)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 18px rgba(4,158,223,0.35)';
            }}
          >
            <FileText size={14} /> Generate PDF
          </button>
        )}
      </div>

      <div className="hd-form-body">
        <div className="container-fluid px-0">
          {apiErr && (
            <div className="pg-field-error hd-api-error mb-3">
              <AlertCircle size={14} /><span>{apiErr}</span>
            </div>
          )}

          {/* ── Live double-booking warning ── */}
          {liveConflict && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 16px', marginBottom: 16,
              background: '#fef2f2', border: '1.5px solid #fecaca',
              borderRadius: 10, fontFamily: 'Nunito, sans-serif',
            }}>
              <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#dc2626', marginBottom: 3 }}>
                  Hoarding Already Booked
                </div>
                <div style={{ fontWeight: 600, fontSize: 12.5, color: '#991b1b', lineHeight: 1.55 }}>
                  This hoarding is booked under{' '}
                  <strong>Contract #{liveConflict.customerContractID}</strong>{' '}
                  from <strong>{fmtDate(liveConflict.startDate)}</strong> to{' '}
                  <strong>{fmtDate(liveConflict.endDate)}</strong>
                  {liveConflict.status && (
                    <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 10, background: '#fee2e2', color: '#dc2626', fontSize: 11, fontWeight: 800, border: '1px solid #fca5a5' }}>
                      {liveConflict.status}
                    </span>
                  )}.
                  {' '}Please select different dates or a different hoarding.
                </div>
              </div>
            </div>
          )}
          {landContractWarning && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 16px', marginBottom: 16,
              background: '#fffbeb', border: '1.5px solid #fde68a',
              borderRadius: 10, fontFamily: 'Nunito, sans-serif',
            }}>
              <AlertCircle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#d97706', marginBottom: 3 }}>
                  Land Contract Ends Before Customer Contract
                </div>
                <div style={{ fontWeight: 600, fontSize: 12.5, color: '#92400e', lineHeight: 1.55 }}>
                  The land contract <strong>#{landContractWarning.landContractID}</strong> for this hoarding
                  ends on <strong>{fmtDate(landContractWarning.landContractEnd)}.</strong>
                </div>
              </div>
            </div>
          )}


          <div className="row g-4">

            {/* ── Customer & Hoarding ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><Users size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Customer &amp; Hoarding</div>
                    <div className="hd-section-sub">Select the customer and hoarding for this contract</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Customer" required />
                      <CustomerSearchWidget
                        customers={customers}
                        value={form.customerID}
                        onChange={val => set('customerID', val)}
                        error={errors.customerID}
                        disabled={!isAdd}
                      />
                      <FieldError msg={errors.customerID} />

                      {/* ── Edit Customer button (shown when a customer is selected) ── */}
                      {selectedCustomerObj && (
                        <button
                          type="button"
                          onClick={() => setShowEditCustomer(true)}
                          style={{
                            marginTop: 8,
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 13px', borderRadius: 8,
                            border: '1.5px solid rgba(4,158,223,0.30)',
                            background: 'rgba(4,158,223,0.06)', cursor: 'pointer',
                            color: '#049edf', fontFamily: 'Nunito, sans-serif',
                            fontSize: 12, fontWeight: 800,
                          }}
                        >
                          <Edit2 size={12} /> Edit Customer Info
                        </button>
                      )}

                      {/* Customer Edit Modal */}
                      {showEditCustomer && selectedCustomerObj && (
                        <CustomerEditModal
                          customer={selectedCustomerObj}
                          onSave={(updated) => {
                            setEditedCustomer(updated);
                            // Also update the customers list so the form reflects the change
                            // (if you have a setCustomers callback, call it here)
                          }}
                          onClose={() => setShowEditCustomer(false)}
                        />
                      )}
                    </div>

                    <div className="col-12 col-md-6">
                      <FieldLabel label={isAdd ? 'Hoardings' : 'Hoarding'} required={!isAdd} optional={isAdd} />

                      {isAdd ? (
                        <>
                          {/* Multi-select trigger button — requires start+end dates */}
                          {(() => {
                            const datesReady = !!(form.startDate && form.endDate);
                            const canOpen = datesReady && !loadingAvailable && !!form.customerID;
                            return (
                              <button
                                type="button"
                                disabled={!canOpen}
                                onClick={() => canOpen && setHoardingModalOpen(true)}
                                style={{
                                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                  padding: '10px 14px', borderRadius: 10,
                                  border: `1.5px solid ${errors.hoardingID ? '#ef4444' : !datesReady ? '#fde68a' : '#e8e8f4'}`,
                                  background: !canOpen ? '#f8f8fd' : '#fff',
                                  cursor: !canOpen ? 'not-allowed' : 'pointer',
                                  fontFamily: 'Nunito, sans-serif', fontSize: 13,
                                  color: !canOpen ? '#b0b0c8' : '#1a1a2e', fontWeight: 600,
                                  boxShadow: errors.hoardingID ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none',
                                  transition: 'border-color 0.15s',
                                }}
                                onMouseEnter={e => { if (canOpen) e.currentTarget.style.borderColor = '#049edf'; }}
                                onMouseLeave={e => { if (canOpen) e.currentTarget.style.borderColor = errors.hoardingID ? '#ef4444' : '#e8e8f4'; }}
                              >
                                <Building2 size={14} color={!canOpen ? '#d0d0e0' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                                <span style={{ flex: 1, textAlign: 'left' }}>
                                  {loadingAvailable
                                    ? 'Loading available hoardings…'
                                    : !form.customerID
                                      ? 'Select a customer first…'
                                      : !datesReady
                                        ? 'Select start & end dates first…'
                                        : selectedHoardings.length > 0
                                          ? `${selectedHoardings.length} hoarding${selectedHoardings.length !== 1 ? 's' : ''} selected`
                                          : `Browse available hoardings (${availableHoardings.length})…`}
                                </span>
                                {loadingAvailable
                                  ? <Loader2 size={13} className="pg-spin" color="#c0c0d8" style={{ flexShrink: 0 }} />
                                  : selectedHoardings.length > 0
                                    ? <RefreshCw size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
                                    : <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
                              </button>
                            );
                          })()}

                          {/* Selected hoardings table */}
                          {selectedHoardings.length > 0 && (() => {
                            const hSt = (status) => {
                              switch (status) {
                                case 'Active': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
                                case 'Inactive': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
                                case 'Under Maintenance': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
                                default: return { bg: '#f8f8fd', color: '#7878a0', border: '#e8e8f4' };
                              }
                            };
                            return (
                              <div style={{ marginTop: 10, border: '1.5px solid #e8e8f4', borderRadius: 12, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ background: '#f8f8fd' }}>
                                      {['Code', 'Material', 'Size', 'Status', ''].map((h, i) => (
                                        <th key={i} style={{ padding: '8px 11px', textAlign: 'left', fontSize: 10.5, fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#9090a8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1.5px solid #e8e8f4' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedHoardings.map((h, idx) => {
                                      const st = hSt(h.status);
                                      return (
                                        <tr key={h.hoardingID} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafe' }}>
                                          <td style={{ padding: '9px 11px', borderBottom: '1px solid #f0f0f8' }}>
                                            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 12.5, color: '#6c63ff' }}>{h.hoardingCode}</div>
                                          </td>
                                          <td style={{ padding: '9px 11px', borderBottom: '1px solid #f0f0f8' }}>
                                            <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: '#4a5568' }}>{h.material || '—'}</span>
                                          </td>
                                          <td style={{ padding: '9px 11px', borderBottom: '1px solid #f0f0f8', whiteSpace: 'nowrap' }}>
                                            <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: '#4a5568' }}>
                                              {h.width && h.height ? `${h.width}×${h.height} ft` : '—'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '9px 11px', borderBottom: '1px solid #f0f0f8' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: 10.5, fontWeight: 800, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}>
                                              {h.status || '—'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '9px 11px', borderBottom: '1px solid #f0f0f8', textAlign: 'right' }}>
                                            <button
                                              onClick={() => setSelectedHoardings(prev => prev.filter(x => x.hoardingID !== h.hoardingID))}
                                              title="Remove"
                                              style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}
                                            >
                                              <X size={11} />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}

                          {/* Hint messages */}
                          {(!form.startDate || !form.endDate) ? (
                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600, color: '#92400e' }}>
                              <Calendar size={12} color="#d97706" style={{ flexShrink: 0 }} />
                              Please select both Start Date and End Date first to view available hoardings
                            </div>
                          ) : availableErr ? (
                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600, color: '#dc2626' }}>
                              <AlertCircle size={12} color="#dc2626" style={{ flexShrink: 0 }} />
                              {availableErr}
                            </div>
                          ) : !form.customerID ? (
                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: '#f0f8ff', border: '1px solid #bae6fd', borderRadius: 8, fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 600, color: '#0369a1' }}>
                              <Building2 size={12} color="#0369a1" style={{ flexShrink: 0 }} />
                              Select a customer above to browse hoardings
                            </div>
                          ) : null}
                        </>
                      ) : (
                        /* Edit mode: show the original single picker (locked) */
                        <HoardingPickerField hoardings={allHoardingsRaw} sites={sites} value={form.hoardingID} onChange={val => set('hoardingID', val)} error={errors.hoardingID} disabled={true} />
                      )}

                      <FieldError msg={errors.hoardingID} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Duration & Status ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><Calendar size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Contract Duration</div>
                    <div className="hd-section-sub">Set the start date, end date and status</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <FieldLabel label="Start Date" required />
                      <InputWrap error={errors.startDate} icon={Calendar}>
                        <input className="pg-field-input" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} disabled={viewOnly} style={viewOnly ? { cursor: 'not-allowed', color: '#4a5568', background: '#f8f8fd' } : {}} />
                      </InputWrap>
                      <FieldError msg={errors.startDate} />
                    </div>
                    <div className="col-12 col-md-4">
                      <FieldLabel label="End Date" required />
                      <InputWrap error={errors.endDate} icon={Calendar}>
                        <input className="pg-field-input" type="date" value={form.endDate} min={form.startDate || undefined} onChange={e => set('endDate', e.target.value)} disabled={viewOnly} style={viewOnly ? { cursor: 'not-allowed', color: '#4a5568', background: '#f8f8fd' } : {}} />
                      </InputWrap>
                      <FieldError msg={errors.endDate} />
                    </div>
                    <div className="col-12 col-md-4">
                      <FieldLabel label="Status" required />
                      {viewOnly
                        ? <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700, color: '#4a5568', padding: '9px 12px', background: '#f8f8fd', border: '1.5px solid #e8e8f4', borderRadius: 8 }}>{form.status || '—'}</div>
                        : <ComboDropdown value={form.status} onChange={val => set('status', val)} onBlur={() => { }} hasError={!!errors.status} placeholder="Select status…" icon={ShieldCheck} options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))} />}
                      <FieldError msg={errors.status} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Financial Details ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><IndianRupee size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Financial Details</div>
                    <div className="hd-section-sub">Contract value, payment schedule, discounts and adjustments</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Original Contract Value (Rs.)" required />
                      <InputWrap error={errors.contractOrigValue} icon={IndianRupee}>
                        <CurrencyInput value={form.contractOrigValue} onChange={val => set('contractOrigValue', val)} placeholder="e.g. 5,00,000" readOnly={viewOnly} />
                      </InputWrap>
                      <FieldError msg={errors.contractOrigValue} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Payment Frequency" required />
                      {viewOnly
                        ? <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700, color: '#4a5568', padding: '9px 12px', background: '#f8f8fd', border: '1.5px solid #e8e8f4', borderRadius: 8 }}>{freqOptions.find(f => String(f.value) === String(form.paymentFreqID))?.label || '—'}</div>
                        : <ComboDropdown value={form.paymentFreqID} onChange={val => set('paymentFreqID', val)} onBlur={() => { }} hasError={!!errors.paymentFreqID} placeholder="Select frequency…" icon={CreditCard} options={freqOptions} />
                      }
                      <FieldError msg={errors.paymentFreqID} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Amount per Frequency (Rs.)" required />
                      <InputWrap error={errors.amountPerFreq} icon={IndianRupee}>
                        <CurrencyInput value={form.amountPerFreq} onChange={val => set('amountPerFreq', val)} placeholder="e.g. 25,000" readOnly={viewOnly} />
                      </InputWrap>
                      <FieldError msg={errors.amountPerFreq} />
                    </div>
                    <div className="col-12 col-md-6">
                      <FieldLabel label="Advance Paid (Rs.)" optional />
                      <InputWrap icon={IndianRupee}>
                        <CurrencyInput value={form.advancePaid} onChange={val => set('advancePaid', val)} placeholder="e.g. 50,000" readOnly={viewOnly} />
                      </InputWrap>
                    </div>
                    <div className="col-12 col-md-4">
                      <FieldLabel label="Discount Amount (Rs.)" optional />
                      <InputWrap icon={IndianRupee}>
                        <CurrencyInput value={form.discountAmount} onChange={val => set('discountAmount', val)} placeholder="e.g. 10,000" readOnly={viewOnly} />
                      </InputWrap>
                    </div>
                    <div className="col-12 col-md-4">
                      <FieldLabel label="Adjustment Amount (Rs.)" optional />
                      <InputWrap icon={IndianRupee}>
                        <CurrencyInput value={form.adjustmentAmount} onChange={val => set('adjustmentAmount', val)} placeholder="e.g. 5,000" readOnly={viewOnly} />
                      </InputWrap>
                    </div>
                    <div className="col-12 col-md-4">
                      <FieldLabel label="Final Contract Value (Base) (Rs.)" />
                      <div style={{ position: 'relative' }}>
                        <InputWrap icon={IndianRupee}>
                          <CurrencyInput value={form.contractFinalValue} onChange={() => { }} placeholder="Auto-calculated" readOnly />
                        </InputWrap>
                        <div style={{ marginTop: 4, fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600 }}>
                          = Original − Discount + Adjustment
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <FieldLabel label={`CGST (${cgstPct}%) (Rs.)`} />
                      <InputWrap icon={IndianRupee}>
                        <CurrencyInput value={cgstAmt} onChange={() => { }} placeholder="Auto-calculated" readOnly />
                      </InputWrap>
                    </div>
                    <div className="col-12 col-md-4">
                      <FieldLabel label={`SGST (${sgstPct}%) (Rs.)`} />
                      <InputWrap icon={IndianRupee}>
                        <CurrencyInput value={sgstAmt} onChange={() => { }} placeholder="Auto-calculated" readOnly />
                      </InputWrap>
                    </div>
                    <div className="col-12 col-md-4">
                      <FieldLabel label="Total Contract Value (Incl. GST) (Rs.)" />
                      <div style={{ position: 'relative' }}>
                        <InputWrap icon={IndianRupee}>
                          <CurrencyInput value={totalContractVal} onChange={() => { }} placeholder="Auto-calculated" readOnly />
                        </InputWrap>
                        <div style={{ marginTop: 4, fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600 }}>
                          = Final Value + CGST + SGST
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Comments ── */}
            <div className="col-12">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><MessageSquare size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Notes</div>
                    <div className="hd-section-sub">Any remarks about this contract</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  <FieldLabel label="Comments" optional />
                  <InputWrap icon={MessageSquare}>
                    <textarea className="pg-field-input lc-textarea" rows={3}
                      placeholder="Any notes or remarks..." value={form.comments}
                      onChange={e => set('comments', e.target.value)}
                      readOnly={viewOnly}
                      style={viewOnly ? { cursor: 'not-allowed', color: '#4a5568', background: '#f8f8fd', resize: 'none' } : {}} />
                  </InputWrap>
                </div>
              </div>
            </div>

            {/* ── Hoarding Map (edit mode) ── */}
            {!isAdd && savedContractID && (
              <div className="col-12">
                <CustomerContractHoardingMapSection
                  customerContractID={savedContractID}
                  customerID={form.customerID}
                  hoardings={hoardings}
                  allHoardingsRaw={allHoardingsRaw}
                  sites={sites}
                  startDate={form.startDate}
                  endDate={form.endDate}
                  maps={localMaps}
                  setMaps={setLocalMaps}
                  setDeletedMapIDs={setDeletedMapIDs}
                  readOnly={viewOnly}
                />
              </div>
            )}

            {/* ── Hoarding Merge (edit mode) ── */}
            {/* {!isAdd && savedContractID && (
              <div className="col-12">
                <HoardingMergeSection
                  customerContractID={savedContractID}
                  hoardings={hoardings}
                  sites={sites}
                />
              </div>
            )} */}

            {/* ── Attachments + Hoarding Map (add mode, after save) ── */}
            <div className="col-12 hd-attach-section">
              {/* Hoarding map — add mode only, shown after contract is saved */}
              {isAdd && contractSaved && savedContractID && (
                <div style={{ marginBottom: 16 }}>
                  <CustomerContractHoardingMapSection
                    customerContractID={savedContractID}
                    customerID={form.customerID}
                    hoardings={hoardings}
                    allHoardingsRaw={allHoardingsRaw}
                    sites={sites}
                    startDate={form.startDate}
                    endDate={form.endDate}
                    maps={localMaps}
                    setMaps={setLocalMaps}
                    setDeletedMapIDs={setDeletedMapIDs}
                  />
                </div>
              )}

              {/* Banner requirement notice / error bar */}
              {contractSaved && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '11px 16px', marginBottom: 10,
                  background: bannerErr ? '#fef2f2' : '#fffbeb',
                  border: `1.5px solid ${bannerErr ? '#fecaca' : '#fde68a'}`,
                  borderRadius: 10,
                  fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700,
                  color: bannerErr ? '#dc2626' : '#92400e',
                  transition: 'all 0.2s',
                }}>
                  <AlertTriangle size={15} color={bannerErr ? '#dc2626' : '#d97706'} style={{ flexShrink: 0 }} />
                  <span>
                    {bannerErr
                      ? bannerErr
                      : 'Required: Upload at least one Banner Design image to complete this contract.'}
                  </span>
                  {hasBanner && (
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, color: '#16a34a', fontWeight: 800, fontSize: 12 }}>
                      <Check size={13} /> Banner uploaded
                    </span>
                  )}
                </div>
              )}

              {(() => {
                const selectedHoarding = hoardings.find(h => h.hoardingID === Number(form.hoardingID) || h.hoardingID === form.hoardingID);
                const selectedSite = sites.find(s => s.siteID === selectedHoarding?.siteID);
                const resolvedOwnerID = selectedSite?.ownerID ?? 0;
                return (
                  <AttachmentSection
                    customerContractID={savedContractID}
                    hoardingID={form.hoardingID}
                    ownerID={resolvedOwnerID}
                    onAttachmentsChange={handleAttachmentsChange}
                    attachments={localAttachments}
                    setAttachments={setLocalAttachments}
                    setDeletedAttachIDs={setDeletedAttachIDs}
                    hideDownload={false}
                  />
                );
              })()}
            </div>

          </div>
        </div>
      </div>

      {/* Multi-hoarding selection modal (add mode) - only available hoardings for the selected date range */}
      {hoardingModalOpen && (
        <MultiHoardingLookupModal
          hoardings={availableHoardings.length > 0 ? availableHoardings : []}
          sites={sites}
          selectedIds={selectedHoardings.map(h => h.hoardingID)}
          onSelectMultiple={(picked) => {
            setSelectedHoardings(picked);
          }}
          onClose={() => setHoardingModalOpen(false)}
        />
      )}
      {showContractPDF && savedContractID && (
        <ContractPDFModal
          contract={{ ...contract, ...form, customerContractID: savedContractID }}
          customer={selectedCustomerObj || { customerName: 'Customer' }}
          hoardings={hoardings}
          sites={sites}
          quotations={quotations}
          onClose={() => setShowContractPDF(false)}
        />
      )}

      {/* ── Footer ── */}
      <div className="hd-form-footer hd-form-footer--sticky">
        <button className="pg-btn-cancel" onClick={onBack} disabled={saving}>
          {isAdd && contractSaved ? 'Back to Contracts' : 'Cancel'}
        </button>

        {/* Save Attachments button — shown only in edit/view mode */}
        {viewOnly && savedContractID && (
          <button
            onClick={handleSaveAttachments}
            disabled={savingAttach}
            style={{
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: attachSaveOk
                ? 'linear-gradient(135deg, #16a34a, #15803d)'
                : 'linear-gradient(135deg, #049edf, #0284c7)',
              color: '#fff', cursor: savingAttach ? 'not-allowed' : 'pointer',
              fontFamily: 'Nunito, sans-serif', fontSize: 13.5, fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 7,
              boxShadow: '0 4px 14px rgba(4,158,223,0.30)',
              transition: 'all 0.18s',
              opacity: savingAttach ? 0.7 : 1,
            }}
          >
            {attachSaveOk
              ? <><Check size={14} /> Attachments Saved!</>
              : savingAttach
                ? <><Loader2 size={14} className="pg-spin" /> Saving…</>
                : <><Paperclip size={14} /> Save Attachments</>}
          </button>
        )}

        {/* Save button — shown only when contract not yet saved (add) */}
        {isAdd && (!isAdd || !contractSaved) && (
          <button
            className="pg-btn-save"
            onClick={handleSave}
            disabled={saving || !!liveConflict}
            title={liveConflict ? 'Resolve the double-booking conflict before saving' : ''}
            style={liveConflict ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
          >
            {saveOk
              ? <><Check size={13} /> Saved!</>
              : saving
                ? <><Loader2 size={13} className="pg-spin" /> Saving...</>
                : liveConflict
                  ? <><AlertCircle size={13} /> Booking Conflict</>
                  : <><Check size={13} /> {isAdd ? 'Save Contract' : 'Update Contract'}</>}
          </button>
        )}

        {/* Finish button — shown in add mode after contract is saved */}
        {isAdd && contractSaved && (
          <button
            className="pg-btn-save"
            onClick={handleFinish}
            style={{
              background: hasBanner
                ? 'linear-gradient(135deg,#16a34a,#15803d)'
                : 'linear-gradient(135deg,#049edf,#0284c7)',
            }}
          >
            <Check size={13} />
            {hasBanner ? 'Finish & Go Back' : 'Finish (Banner Required)'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function CustomerContractPage() {
  const [customers, setCustomers] = useState([]);
  const [hoardings, setHoardings] = useState([]);
  const [allHoardingsRaw, setAllHoardingsRaw] = useState([]);
  const [sites, setSites] = useState([]);
  const [paymentFreqs, setPaymentFreqs] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [landContracts, setLandContracts] = useState([]);      // ← add
  const [hoardingMaps, setHoardingMaps] = useState([]);         // ← add
  const [quotations, setQuotations] = useState([]);             // ← add
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadError, setLoadError] = useState('');


  const [view, setView] = useState('grid');
  const [formMode, setFormMode] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState('startDate');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const tableRef = useRef(null);
  const [tableReady, setTableReady] = useState(false);
  useEffect(() => { if (!loadingMeta) setTableReady(true); }, [loadingMeta]);
  useResizableColumns(tableRef, tableReady, [60, 160, 160, 110, 110, 130, 100, 90]);

  const fetchAll = useCallback(async () => {
    setLoadingMeta(true); setLoadError('');
    try {
      const [rawCustomers, rawHoardings, rawSites, rawContracts, rawFreqs, rawLandContracts, rawMaps, rawQuotations] = await Promise.all([
        apiService.getAllCustomers(),
        apiService.getAllHoardings(),
        apiService.getAllSites(),
        apiService.getAllCustomerContracts(),
        apiService.getAllPaymentFreqs(),
        apiService.getAllLandContracts(),
        apiService.getAllLandContractHoardingMaps(),
        apiService.getAllQuotations().catch(() => []),
      ]);
      setCustomers(Array.isArray(rawCustomers) ? rawCustomers : rawCustomers?.data ?? []);
      const rawHList = Array.isArray(rawHoardings) ? rawHoardings : rawHoardings?.data ?? [];
      setAllHoardingsRaw(rawHList);
      setHoardings(deduplicateHoardings(rawHList));
      setSites(Array.isArray(rawSites) ? rawSites : rawSites?.data ?? []);
      const freqList = Array.isArray(rawFreqs) ? rawFreqs : rawFreqs?.data ?? [];
      setPaymentFreqs(freqList.map(f => ({
        value: f.paymentFreqID ?? f.PaymentFreqID ?? f.id,
        label: f.freqName ?? f.FreqName ?? f.name ?? f.label ?? String(f.paymentFreqID),
      })));
      const list = Array.isArray(rawContracts) ? rawContracts : rawContracts?.data ?? [];
      setContracts(list.map(normalizeContract));
      const lcList = Array.isArray(rawLandContracts) ? rawLandContracts : rawLandContracts?.data ?? [];
      setLandContracts(lcList.map(c => ({
        landContractID: c.landContractID ?? c.LandContractID,
        startDate: (c.startDate ?? c.StartDate ?? '').split('T')[0],
        endDate: (c.endDate ?? c.EndDate ?? '').split('T')[0],
        status: c.status ?? c.Status ?? '',
      })));

      const mapList = Array.isArray(rawMaps) ? rawMaps : rawMaps?.data ?? [];
      setHoardingMaps(mapList);
      const quots = Array.isArray(rawQuotations) ? rawQuotations : rawQuotations?.data ?? [];
      setQuotations(quots.map(normalizeQuotation));
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Failed to load data.');
    } finally { setLoadingMeta(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = (record, isNew) => {
    if (isNew) setContracts(prev => [record, ...prev]);
    else setContracts(prev => prev.map(c => c.customerContractID === record.customerContractID ? record : c));
  };

  const handleDelete = async (id) => {
    try {
      await apiService.deleteCustomerContract(id);
      setContracts(prev => prev.filter(c => c.customerContractID !== id));
    } catch (err) { console.error('Delete failed:', err); }
    finally { setDeleteTarget(null); }
  };

  const freqOptions = paymentFreqs.length ? paymentFreqs : PAYMENT_FREQ_FALLBACK;

  const tableRows = contracts.map(c => {
    const customer = customers.find(cu => cu.customerID === c.customerID);
    const { cgstPct, sgstPct } = getContractGst(c, quotations);
    const baseValue = Number(c.contractFinalValue ?? c.contractOrigValue ?? 0);
    const cgstAmt = Math.round((baseValue * cgstPct) / 100);
    const sgstAmt = Math.round((baseValue * sgstPct) / 100);
    const valueWithGst = baseValue + cgstAmt + sgstAmt;

    let quotationNo = '—';
    let revisionNo = '—';
    if (c.comments) {
      const match = c.comments.match(/From Quotation\s+([^\s]+)(?:\s+Rev\.(\d+))?/i);
      if (match) {
        quotationNo = match[1];
        revisionNo = match[2] ? `Rev.${match[2]}` : '—';
      }
    }

    return {
      customerContractID: c.customerContractID,
      customerName: customer?.customerName || `Customer ID ${c.customerID}`,
      quotationNumber: quotationNo,
      revision: revisionNo,
      startDate: c.startDate || '',
      endDate: c.endDate || '',
      contractFinalValue: valueWithGst,
      status: c.status || '',
      _raw: c,
    };
  });

  const filtered = tableRows.filter(r => {
    const q = search.toLowerCase();
    const match =
      r.customerName.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      r.quotationNumber.toLowerCase().includes(q) ||
      r.revision.toLowerCase().includes(q) ||
      String(r.customerContractID).includes(q);
    return match && (!statusFilter || r.status === statusFilter);
  });

  const sortedRows = [...filtered].sort((a, b) => {
    if (sortKey === 'contractFinalValue')
      return sortDir === 'asc' ? a.contractFinalValue - b.contractFinalValue : b.contractFinalValue - a.contractFinalValue;
    const av = String(a[sortKey] ?? '').toLowerCase();
    const bv = String(b[sortKey] ?? '').toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginated = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const totalValue = tableRows.reduce((s, r) => s + Number(r.contractFinalValue || 0), 0);
  const activeCount = contracts.filter(c => c.status === 'Active').length;
  const endedCount = contracts.filter(c => c.status === 'Expired' || c.status === 'Terminated').length;

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => { if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('...'); acc.push(p); return acc; }, []);
  const COLS = [
    { key: 'customerContractID', label: '#ID' },
    { key: 'customerName', label: 'Customer' },
    { key: 'quotationNumber', label: 'Quotation No' },
    { key: 'revision', label: 'Revision', tabletHide: true },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date', tabletHide: true },
    { key: 'contractFinalValue', label: 'Final Value (Incl. GST)' },
    { key: 'status', label: 'Status' },
    { key: '_action', label: 'Actions', noSort: true },
  ];

  if (view === 'form') {
    return (
      <ContractForm
        mode={formMode}
        contract={editTarget}
        customers={customers}
        hoardings={hoardings}
        allHoardingsRaw={allHoardingsRaw}
        sites={sites}
        paymentFreqs={freqOptions}
        contracts={contracts}
        landContracts={landContracts}
        hoardingMaps={hoardingMaps}
        quotations={quotations}
        onBack={() => { setView('grid'); setEditTarget(null); }}
        onSave={handleSave}
      />
    );
  }


  return (
    <div className="pg-page">
      <div className="pg-header">
        <div>
          <h1 className="pg-header__title">Customer Contracts</h1>
          <p className="pg-header__subtitle">
            Manage all advertising contracts with customers
            {contracts.length > 0 && <> — Total: <strong>{fmtCurrency(totalValue)}</strong></>}
          </p>
        </div>
        <button className="pg-btn-add"
          onClick={() => { setFormMode('add'); setEditTarget(null); setView('form'); }}
          disabled={loadingMeta}>
          <Plus size={14} /> Add Contract
        </button>
      </div>

      {/* {!loadingMeta && contracts.length > 0 && (
        <div className="exp-stats-strip">
          {[
            { icon: <FileText size={16} color="#049edf" />, bg: 'rgba(4,158,223,0.1)', label: 'Total Contracts', val: contracts.length },
            { icon: <IndianRupee size={16} color="#16a34a" />, bg: 'rgba(22,163,74,0.1)', label: 'Total Value', val: fmtCurrency(totalValue) },
            { icon: <ShieldCheck size={16} color="#16a34a" />, bg: 'rgba(22,163,74,0.1)', label: 'Active', val: activeCount },
            { icon: <Clock size={16} color="#dc2626" />, bg: 'rgba(220,38,38,0.08)', label: 'Expired/Ended', val: endedCount },
          ].map(s => (
            <div key={s.label} className="exp-stat-item">
              <div className="exp-stat-item__icon" style={{ background: s.bg }}>{s.icon}</div>
              <div><div className="exp-stat-item__label">{s.label}</div><div className="exp-stat-item__val">{s.val}</div></div>
            </div>
          ))}
        </div>
      )} */}

      {loadError && (
        <div className="pg-field-error hd-api-error mb-3" style={{ margin: '0 0 16px 0' }}>
          <AlertCircle size={14} /><span>{loadError}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }} onClick={fetchAll}>Retry</button>
        </div>
      )}

      <div className="pg-container">
        <div className="pg-toolbar">
          <div className="pg-toolbar__inner">
            <div className="pg-toolbar__count">
              <FileText size={14} color="#9090a8" />
              <span><strong>{loadingMeta ? '...' : filtered.length}</strong> contract{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="pg-search-box">
              <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <input placeholder="Search customer, hoarding, status..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
              {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
            </div>
            <select className="hd-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="pg-pg-btn" onClick={fetchAll} title="Refresh" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={13} className={loadingMeta ? 'pg-spin' : ''} />
            </button>
          </div>
        </div>

        {loadingMeta && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#9090a8' }}>
            <Loader2 size={28} className="pg-spin" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13 }}>Loading data...</div>
          </div>
        )}

        {!loadingMeta && contracts.length === 0 && (
          <div className="pg-empty" style={{ padding: '70px 20px' }}>
            <div className="pg-empty__inner">
              <FileText size={42} color="#d0d0e8" />
              <span className="pg-empty__label">No contracts recorded yet</span>
              <span style={{ fontSize: 12, color: '#b0b0c8' }}>Click <strong>Add Contract</strong> to create the first one</span>
            </div>
          </div>
        )}

        {!loadingMeta && contracts.length > 0 && (
          <div className="pg-desktop-table">
            <table className="pg-table" ref={tableRef}>
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th key={col.key}
                      className={['pg-th', !col.noSort && 'pg-th--sort', col.tabletHide && 'pg-tablet-hide'].filter(Boolean).join(' ')}
                      onClick={() => !col.noSort && handleSort(col.key)}>
                      <div className="pg-th__inner">
                        {col.label}
                        {!col.noSort && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={COLS.length} className="pg-td pg-empty">
                    <div className="pg-empty__inner"><FileText size={36} color="#d0d0e8" /><span className="pg-empty__label">No contracts match your search</span></div>
                  </td></tr>
                ) : paginated.map(r => {
                  const st = statusStyle(r.status);
                  return (
                    <tr key={r.customerContractID} className="pg-tr">
                      <td className="pg-td"><span className="lc-id-badge">#{r.customerContractID}</span></td>
                      <td className="pg-td"><div className="pg-td__primary">{r.customerName}</div></td>
                      <td className="pg-td">
                        <span className={r.quotationNumber !== '—' ? 'pg-td__primary' : 'pg-td__secondary'} style={{ fontFamily: r.quotationNumber !== '—' ? 'monospace' : undefined, fontSize: 12.5 }}>
                          {r.quotationNumber}
                        </span>
                      </td>
                      <td className="pg-td pg-tablet-hide">
                        <span className="pg-td__primary" style={{ fontSize: 12.5 }}>
                          {r.revision}
                        </span>
                      </td>
                      <td className="pg-td"><span className="pg-td__primary">{fmtDate(r.startDate)}</span></td>
                      <td className="pg-td pg-tablet-hide"><span className="pg-td__primary">{fmtDate(r.endDate)}</span></td>
                      <td className="pg-td"><span className="lc-amount-val">{fmtCurrency(r.contractFinalValue)}</span></td>
                      <td className="pg-td">
                        <span className="lc-status-badge" style={{ background: st.bg, color: st.color, borderColor: st.border }}>{r.status}</span>
                      </td>
                      <td className="pg-td">
                        <div className="pg-action-wrap">
                          <button className="pg-btn-view" title="Edit" onClick={() => { setFormMode('edit'); setEditTarget(r._raw); setView('form'); }}><Edit2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loadingMeta && contracts.length > 0 && (
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <FileText size={36} color="#d0d0e8" /><span className="pg-empty__label">No contracts match</span>
              </div>
            ) : paginated.map(r => {
              const st = statusStyle(r.status);
              return (
                <div key={r.customerContractID} className="pg-card">
                  <div className="pg-card__header">
                    <div className="pg-card__title-wrap">
                      <div className="pg-card__title"><span className="lc-id-badge">#{r.customerContractID}</span>&nbsp; {r.customerName}</div>
                    </div>
                    <div className="pg-card__actions">
                      <button className="pg-card__btn-view" onClick={() => { setFormMode('edit'); setEditTarget(r._raw); setView('form'); }} title="Edit"><Edit2 size={13} /></button>
                      <button className="exp-btn-delete" onClick={() => setDeleteTarget(r._raw)} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="pg-card__body">
                    {r.quotationNumber !== '—' && (
                      <div className="pg-card__row">
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#049edf', background: 'rgba(4,158,223,0.08)', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(4,158,223,0.15)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          📄 {r.quotationNumber} {r.revision !== '—' ? `(${r.revision})` : ''}
                        </span>
                      </div>
                    )}
                    <div className="pg-card__row"><Calendar size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="pg-card__row-text">{fmtDate(r.startDate)} → {fmtDate(r.endDate)}</span></div>
                    <div className="pg-card__row"><IndianRupee size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="pg-card__row-text" style={{ fontWeight: 800, color: '#1a1a2e' }}>{fmtCurrency(r.contractFinalValue)}</span></div>
                    <div className="pg-card__row"><ShieldCheck size={12} color="#c0c0d8" className="pg-card__row-icon" /><span className="lc-status-badge" style={{ background: st.bg, color: st.color, borderColor: st.border }}>{r.status}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loadingMeta && contracts.length > 0 && (
          <div className="pg-pagination">
            <div className="pg-pagination__left">
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
              {pageNums.map((p, i) => p === '...'
                ? <span key={`e${i}`} className="pg-pg-ellipsis">...</span>
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
              <span className="pg-pagination__text">{page} of {totalPages} pages ({sortedRows.length} items)</span>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteConfirmModal contract={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget.customerContractID)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}