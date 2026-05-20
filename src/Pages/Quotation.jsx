import React, {
  useState, useEffect, useCallback, useMemo,
  useRef, useLayoutEffect,
} from 'react';
import ReactDOM from 'react-dom';
import {
  Plus, Trash2, FileText, X, Search, Loader2,
  Printer, Building2, ChevronDown, Check,
  AlertCircle, RefreshCw, ChevronsLeft, ChevronsRight,
  ChevronLeft, ChevronRight, ChevronUp, Edit2,
  Filter, List, User, ArrowRight, ArrowLeft,
  FileCheck, Settings, Users, Hash, Calendar,
  Eye, Download, LayoutGrid, CheckSquare, Square,
  CheckCircle2, Link2, MapPin,
} from 'lucide-react';
import { apiService } from '../api/api';
import { useResizableColumns } from '../hooks/useResizableColumns';
import "./Common1.css";

/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */
const COMPANY = {
  name:      'JALARAM AD',
  line1:     '9/B/1, Industrial Estate, Opp. Real Bakers, Nr.Borsad Crossing',
  line2:     'Jitodiya Road, Anand - 388001. Parag Patel # 7383999444',
  gstin:     '24AAMFJ0339H2ZG',
  pan:       'AAMFJ0339H',
  bank:      'AXIS BANK',
  branch:    'GRID CHOKDI, ANAND',
  account:   '920020035728954',
  ifsc:      'UTIB0003220',
  signatory: 'P.C.Pradep',
};

const ROWS_PER_PRINT_PAGE = 13;
const PAGE_SIZE_OPTIONS   = [5, 10, 15, 20];

const STEPS = [
  { n: 1, label: 'Customer & Type', Icon: Users     },
  { n: 2, label: 'Add Hoardings',   Icon: Building2 },
  { n: 3, label: 'GST & Generate',  Icon: FileCheck },
];

/* ── Site pastel colour palette ─────────────────────────── */
const SITE_PASTEL_PALETTE = [
  { bg: '#FFF0EE', border: '#FFBCB3', dot: '#FF6B55' },
  { bg: '#EEF4FF', border: '#B3CCFF', dot: '#3B7FFF' },
  { bg: '#EDFFF2', border: '#AAFFBB', dot: '#1FBF4A' },
  { bg: '#FFFBEE', border: '#FFE5AA', dot: '#F5A623' },
  { bg: '#F7EEFF', border: '#D9AAFF', dot: '#9B3FFF' },
  { bg: '#EEFFFA', border: '#AAFFD6', dot: '#0DC88E' },
  { bg: '#FFFEEE', border: '#FFEFAA', dot: '#D4B800' },
  { bg: '#FFECFD', border: '#FFAAEE', dot: '#E020CC' },
  { bg: '#EEF9FF', border: '#AADEEF', dot: '#009DBF' },
  { bg: '#F2FFEE', border: '#C3FFAA', dot: '#46A800' },
];

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
const uid      = () => Math.random().toString(36).substr(2, 9);
const todayISO = () => new Date().toISOString().split('T')[0];

const fmtCurrency = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDateFull = (d) => {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtDateShort = (d) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getFullYear()).slice(-2)}`;
};

const fmtDateDisplay = (d) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const addMonths = (dateStr, months) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + Math.max(0, Number(months) - 1));
  d.setMonth(d.getMonth() + 1, 0);
  return d.toISOString().split('T')[0];
};

function numberToWords(n) {
  n = Math.round(Math.abs(n));
  if (!n) return 'Zero Only';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const two   = (x) => x < 20 ? ones[x] : tens[Math.floor(x/10)] + (x%10 ? ' '+ones[x%10] : '');
  const three = (x) => x < 100 ? two(x) : ones[Math.floor(x/100)] + ' Hundred' + (x%100 ? ' '+two(x%100) : '');
  let w = '';
  if (Math.floor(n/10000000)) w += two(Math.floor(n/10000000)) + ' Crore ';
  if (Math.floor((n%10000000)/100000)) w += two(Math.floor((n%10000000)/100000)) + ' Lakh ';
  if (Math.floor((n%100000)/1000))     w += two(Math.floor((n%100000)/1000)) + ' Thousand ';
  if (n%1000) w += three(n%1000);
  return w.trim() + ' Only';
}

function normalizeList(res) {
  if (Array.isArray(res))          return res;
  if (Array.isArray(res?.$values)) return res.$values;
  if (Array.isArray(res?.data))    return res.data;
  if (Array.isArray(res?.items))   return res.items;
  return [];
}

function normalizeCustomer(raw) {
  return {
    customerID:     raw.customerID     ?? raw.CustomerID     ?? raw.id    ?? raw.Id    ?? 0,
    customerName:   raw.customerName   ?? raw.CustomerName   ?? '',
    addressLine1:   raw.addressLine1   ?? raw.AddressLine1   ?? '',
    addressLine2:   raw.addressLine2   ?? raw.AddressLine2   ?? '',
    city:           raw.city           ?? raw.City           ?? '',
    district:       raw.district       ?? raw.District       ?? '',
    country:        raw.country        ?? raw.Country        ?? '',
    phone1:         raw.phone1         ?? raw.Phone1         ?? '',
    gstNumber:      raw.gstNumber      ?? raw.GstNumber      ?? raw.gSTNumber ?? '',
    authorizedName: raw.authorizedName ?? raw.AuthorizedName ?? '',
  };
}

function normalizeQuotation(raw) {
  return {
    quotationID:             raw.quotationID             ?? raw.QuotationID             ?? 0,
    quotationRevisionNumber: raw.quotationRevisionNumber ?? raw.QuotationRevisionNumber ?? 0,
    customerID:              raw.customerID              ?? raw.CustomerID              ?? 0,
    quotationNumber:         raw.quotationNumber         ?? raw.QuotationNumber         ?? '',
    quotationDate:           (raw.quotationDate          ?? raw.QuotationDate           ?? '').split('T')[0],
    cGSTPercent:             raw.cGSTPercent             ?? raw.CGSTPercent             ?? 9,
    cGSTAmount:              raw.cGSTAmount              ?? raw.CGSTAmount              ?? 0,
    sGSTPercent:             raw.sGSTPercent             ?? raw.SGSTPercent             ?? 9,
    sGSTAmount:              raw.sGSTAmount              ?? raw.SGSTAmount              ?? 0,
    totalAmount:             raw.totalAmount             ?? raw.TotalAmount             ?? 0,
  };
}

function normalizeQuotLine(raw) {
  return {
    quotationLineNumber:     raw.quotationLineNumber     ?? raw.QuotationLineNumber     ?? 0,
    quotationID:             raw.quotationID             ?? raw.QuotationID             ?? 0,
    quotationRevisionNumber: raw.quotationRevisionNumber ?? raw.QuotationRevisionNumber ?? 0,
    hoardingID:              raw.hoardingID              ?? raw.HoardingID              ?? 0,
    periodBeginDate:         (raw.periodBeginDate        ?? raw.PeriodBeginDate         ?? '').split('T')[0],
    periodEndDate:           (raw.periodEndDate          ?? raw.PeriodEndDate           ?? '').split('T')[0],
    rentAmount:              raw.rentAmount              ?? raw.RentAmount              ?? 0,
  };
}

const isAvailable = (h) => {
  if (typeof h.status === 'boolean') return h.status;
  if (typeof h.status === 'string') return ['available','active'].includes(h.status.toLowerCase());
  return false;
};

/* ── Parse "W X H" size string ─────────────────────────── */
function parseSize(sizeStr) {
  const parts = (sizeStr || '').split(/[Xx×\s]+/).map(p => parseFloat(p.trim())).filter(n => !isNaN(n) && n > 0);
  return { w: parts[0] || 0, h: parts[1] || 0 };
}

/* ── Build siteID → palette colour map ─────────────────── */
function buildSiteColorMap(hoardings, sites = []) {
  const map = new Map();
  let idx = 0;
  // Prefer dedicated sites list; fall back to siteIDs found in hoardings
  const allSiteIds = sites.length > 0
    ? sites.map(s => s.siteID ?? s.SiteID).filter(Boolean)
    : hoardings.map(h => h.siteID ?? h.site?.siteID).filter(Boolean);
  for (const sid of allSiteIds) {
    if (!map.has(sid)) {
      map.set(sid, SITE_PASTEL_PALETTE[idx % SITE_PASTEL_PALETTE.length]);
      idx++;
    }
  }
  return map;
}

/* ── Normalise a raw site object (handles PascalCase / camelCase) ── */
function normalizeSite(raw) {
  if (!raw) return null;
  return {
    siteID:       raw.siteID       ?? raw.SiteID       ?? 0,
    addressLine1: raw.addressLine1 ?? raw.AddressLine1 ?? '',
    addressLine2: raw.addressLine2 ?? raw.AddressLine2 ?? '',
    addressLine3: raw.addressLine3 ?? raw.AddressLine3 ?? '',
    landmark:     raw.landmark     ?? raw.Landmark     ?? '',
    city:         raw.city         ?? raw.City         ?? '',
    district:     raw.district     ?? raw.District     ?? '',
    siteType:     raw.siteType     ?? raw.SiteType     ?? '',
    country:      raw.country      ?? raw.Country      ?? '',
    ownerID:      raw.ownerID      ?? raw.OwnerID      ?? 0,
  };
}

/**
 * Build the full address string for a site object.
 * Used in the row's `location` field (goes into PDF).
 */
function buildSiteAddress(site, fallback = '') {
  if (!site) return fallback;
  const addrParts = [site.addressLine1, site.addressLine2, site.addressLine3].filter(Boolean);
  const cityPart  = [site.city, site.district].filter(Boolean).join(', ');
  const full = [...addrParts, cityPart].filter(Boolean).join(', ');
  return full || fallback;
}

/**
 * Returns { line1, line2 } for two-line display in modals / table cells.
 *  line1 → address lines
 *  line2 → landmark · city, district · siteType  (secondary, lighter text)
 */
function getSiteDisplayLines(site, fallback = '') {
  if (!site) return { line1: fallback, line2: '' };
  const line1 = [site.addressLine1, site.addressLine2, site.addressLine3]
    .filter(Boolean).join(', ') || fallback;
  const line2 = [
    site.landmark ? `Nr. ${site.landmark}` : '',
    [site.city, site.district].filter(Boolean).join(', '),
    site.siteType || '',
  ].filter(Boolean).join(' · ');
  return { line1, line2 };
}

/** Legacy helper kept for backward compat – prefers site, falls back to hoardingCode */
function getSiteAddress(h) {
  return buildSiteAddress(h?.site, h?.hoardingCode || '');
}

const newHoardingRow = (h = null, globalStart = '', globalEnd = '', siteMap = null) => {
  // Prefer the nested site that came with the hoarding; fall back to siteMap lookup
  const site = h?.site ? normalizeSite(h.site) : (siteMap?.get(h?.siteID) ?? null);
  return {
    _id: uid(),
    rowType: 'hoarding',
    hoardingID:   h?.hoardingID || 0,
    siteID:       h?.siteID ?? site?.siteID ?? null,
    siteObj:      site,                          // full site data for display
    location:     buildSiteAddress(site, h?.hoardingCode || ''),
    hoardingCode: h?.hoardingCode || '',
    size:   h ? `${h.width} X ${h.height}` : '',
    sqFt:   h ? (h.width * h.height) : 0,
    nos:    1,
    startDate: globalStart || '',
    endDate:   globalEnd   || '',
    ratePerMonth: h?.monthlyRent || 0,
    amount:       h?.monthlyRent || 0,
    printingCost: 0,
    quotationLineNumber: 0,
    saved: false,
  };
};

const newPrintingRow = () => ({
  _id: uid(),
  rowType: 'printing',
  hoardingID: 0,
  siteID: null,
  location: 'FLEX BANNER PRINTING',
  hoardingCode: '',
  size: '',
  sqFt: 0,
  nos: 1,
  startDate: '',
  endDate:   '',
  ratePerMonth: 8,
  amount: 0,
  printingCost: 0,
  quotationLineNumber: 0,
  saved: false,
});

/* ── Create a merged hoarding row ───────────────────────── */
function newMergedRow(r1, r2, direction) {
  const s1 = parseSize(r1.size);
  const s2 = parseSize(r2.size);
  let mw, mh;
  if (direction === 'H') {
    mw = s1.w + s2.w + 1;   // +1 for horizontal overlap/join
    mh = Math.max(s1.h, s2.h);
  } else {
    mw = Math.max(s1.w, s2.w);
    mh = s1.h + s2.h + 1;   // +1 for vertical overlap/join
  }
  const sqFt = mw * mh;
  return {
    _id: uid(),
    rowType: 'merged',
    isMerged: true,
    mergeDirection: direction,
    mergedFromIds: [r1._id, r2._id],
    hoardingID: 0,
    siteID: null,
    location: `${r1.location} + ${r2.location}`,
    hoardingCode: '',
    size: `${mw} X ${mh}`,
    sqFt,
    nos: 1,
    startDate: r1.startDate || r2.startDate || '',
    endDate:   r1.endDate   || r2.endDate   || '',
    ratePerMonth: 0,
    amount: 0,
    printingCost: 0,
    quotationLineNumber: 0,
    saved: false,
  };
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
      setStyle({ position:'fixed', top: flipUp ? r.top - ph - 4 : r.bottom + 4, left: r.left, width: r.width, zIndex: 99999 });
    };
    upd();
    window.addEventListener('scroll', upd, true);
    window.addEventListener('resize', upd);
    return () => { window.removeEventListener('scroll', upd, true); window.removeEventListener('resize', upd); };
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

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`qt-toast qt-toast--${type}`}>
      {type === 'success' ? <CheckCircle2 size={15}/> : <AlertCircle size={15}/>}
      {msg}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CUSTOMER COMBO
═══════════════════════════════════════════ */
function CustomerCombo({ value, onChange, customers }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null); const triggerRef = useRef(null);
  const panelRef = useRef(null); const inputRef = useRef(null); const listRef = useRef(null);
  const close  = useCallback(() => { setOpen(false); setQuery(''); }, []);
  useOutsideClick(wrapRef, panelRef, open, close);

  const selected = customers.find(c => String(c.customerID) === String(value));
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q ? customers.filter(c =>
      (c.customerName||'').toLowerCase().includes(q) ||
      (c.city||'').toLowerCase().includes(q) ||
      (c.district||'').toLowerCase().includes(q)
    ) : customers;
  }, [customers, query]);

  const openDD = () => { setOpen(true); setQuery(''); setTimeout(() => inputRef.current?.focus(), 0); };
  const select = (c) => { onChange(c); setOpen(false); setQuery(''); };
  const clear  = (e) => { e.stopPropagation(); onChange(null); setOpen(false); setQuery(''); };
  const nav    = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx = Array.from(items||[]).indexOf(document.activeElement);
    if (e.key==='ArrowDown') { e.preventDefault(); (items[idx+1]||items[0])?.focus(); }
    else if (e.key==='ArrowUp') { e.preventDefault(); (items[idx-1]||items[items.length-1])?.focus(); }
    else if (e.key==='Escape') close();
  };

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        ref={triggerRef}
        className="pg-field-wrap pg-combo-trigger pg-field-wrap--normal"
        onClick={openDD} tabIndex={0}
        onKeyDown={e => { if (!open) { if (e.key==='ArrowDown'||e.key==='Enter'||e.key===' ') { e.preventDefault(); openDD(); } } else nav(e); }}
      >
        <User size={14} color="#c0c0d8" style={{ flexShrink:0 }}/>
        <span className={`pg-combo-display${!selected ? ' pg-combo-display--placeholder' : ''}`}>
          {selected ? selected.customerName : customers.length===0 ? 'Loading customers…' : 'Select customer…'}
        </span>
        {selected ? <X size={13} className="pg-combo-clear" onClick={clear}/> : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink:0 }}/>}
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position:'static' }}>
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink:0 }}/>
            <input ref={inputRef} className="pg-combo-search__input" placeholder="Search by name or city…" value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key==='ArrowDown') { e.preventDefault(); listRef.current?.querySelectorAll('.pg-combo-option')?.[0]?.focus(); } else if (e.key==='Escape') close(); }}
            />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')}/>}
          </div>
          <div className="pg-combo-list" ref={listRef}>
            {filtered.length===0
              ? <div className="pg-combo-empty">No customers found</div>
              : filtered.map(c => (
                <div key={c.customerID}
                  className={`pg-combo-option${String(c.customerID)===String(value) ? ' pg-combo-option--active' : ''}`}
                  onClick={() => select(c)} tabIndex={0}
                  onKeyDown={e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); select(c); } else nav(e); }}
                >
                  <div style={{ flex:1 }}>
                    <span className="pg-combo-option__name">{c.customerName}</span>
                    <span className="pg-combo-option__id">{[c.city,c.district].filter(Boolean).join(', ')}</span>
                  </div>
                  {String(c.customerID)===String(value) && <Check size={12} color="#049edf" style={{ marginLeft:'auto', flexShrink:0 }}/>}
                </div>
              ))}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SORT ICON
═══════════════════════════════════════════ */
function SortIcon({ col, sortKey, sortDir }) {
  const active = sortKey === col;
  return (
    <span className="pg-sort-icon">
      <ChevronUp   size={10} color={active && sortDir==='asc'  ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__up"/>
      <ChevronDown size={10} color={active && sortDir==='desc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__down"/>
    </span>
  );
}

/* ═══════════════════════════════════════════
   PDF BUILDER
═══════════════════════════════════════════ */
function buildPrintHTML({ rows, withPrinting, selectedCustomer, quotNo, quotDate,
  revisionNo, cgstPct, sgstPct, subTotal, cgstAmt, sgstAmt,
  roundOff, finalTotal, selectedTerms, termsTexts }) {

  const pages = rows.length === 0 ? [[]] : [];
  for (let i = 0; i < rows.length; i += ROWS_PER_PRINT_PAGE) pages.push(rows.slice(i, i + ROWS_PER_PRINT_PAGE));

  let run = 0;
  const pageRun = pages.map(pg => { run += pg.reduce((s,r) => s + Number(r.amount||0), 0); return run; });

  const stdCols = 6;
  const prtCols = 7;
  const nCols   = withPrinting ? prtCols : stdCols;

  const upiStr = `upi://pay?pa=${COMPANY.account}@axisbank&pn=JALARAM+AD&cu=INR`;
  const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiStr)}&size=100x100&bgcolor=ffffff&color=000000&ecc=M`;

  const css = `
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#000;background:#fff;}
.page{width:210mm;padding:7mm 10mm 5mm 10mm;page-break-after:always;}
.page:last-child{page-break-after:avoid;}
.co-hdr{text-align:center;border:1px solid #000;border-bottom:none;padding:5px 8px 4px;}
.co-name{font-size:17px;font-weight:bold;letter-spacing:.5px;}
.co-addr{font-size:10px;margin-top:2px;}
.doc-row{display:flex;border:1px solid #000;border-bottom:none;}
.dleft{padding:3px 8px;border-right:1px solid #000;font-weight:bold;width:28%;font-size:11px;}
.dctr{flex:1;text-align:center;padding:3px 8px;font-size:13px;font-weight:bold;letter-spacing:1px;}
.dright{padding:3px 8px;border-left:1px solid #000;width:18%;text-align:right;font-weight:bold;font-size:11px;}
.cust-row{border:1px solid #000;border-bottom:none;display:flex;}
.cleft{padding:6px 8px;flex:1;border-right:1px solid #000;font-size:10.5px;line-height:1.5;}
.cright{padding:5px 8px;width:200px;}
.cright table{width:100%;border-collapse:collapse;}
.cright td{padding:2px 2px;font-size:10.5px;vertical-align:top;}
.clbl{white-space:nowrap;font-weight:bold;width:88px;}
.itbl{width:100%;border-collapse:collapse;border:1px solid #000;}
.itbl th{border:1px solid #000;padding:4px 5px;font-size:10px;background:#f0f0f0;text-align:center;font-weight:bold;line-height:1.3;}
.itbl td{border:1px solid #000;padding:3px 5px;font-size:10.5px;vertical-align:middle;}
.c{text-align:center;}.r{text-align:right;}.l{text-align:left;}
.bf td{font-weight:bold;background:#f5f5f5;}
.cf td{font-weight:bold;background:#f0f0f0;font-size:11px;}
.erow{height:21px;}
.merged-tag{display:inline-block;font-size:8.5px;font-weight:bold;color:#6a22c0;background:#f0e8ff;border:1px solid #d4aaff;border-radius:3px;padding:1px 5px;margin-bottom:2px;}
.fwrap{border:1px solid #000;border-top:none;}
.f-words-row{display:flex;border-top:1px solid #000;}
.f-words{flex:1;padding:5px 8px;border-right:1px solid #000;font-size:10.5px;line-height:1.6;}
.f-totals{width:220px;padding:4px 8px;}
.f-totals table{width:100%;border-collapse:collapse;}
.f-totals td{padding:2px 3px;font-size:10.5px;}
.gr{text-align:right;}
.f-grand td{font-weight:bold;font-size:11.5px;border-top:1px solid #000;padding-top:3px;}
.f-main-row{display:flex;border-top:1px solid #000;}
.f-bank{flex:1;padding:5px 8px;border-right:1px solid #000;font-size:10px;line-height:1.7;}
.f-qr{width:110px;border-right:1px solid #000;display:flex;align-items:center;justify-content:center;padding:5px;}
.f-sig{width:165px;padding:5px 8px;text-align:right;font-size:10px;display:flex;flex-direction:column;}
.f-sig-company{font-weight:bold;font-size:11px;margin-bottom:40px;}
.f-sig-name{font-size:10px;}
.f-grand-box{border-top:1px solid #000;margin-top:5px;padding-top:4px;display:flex;justify-content:space-between;align-items:center;}
.f-grand-lbl{font-size:10.5px;font-weight:bold;}
.f-grand-val{font-size:12px;font-weight:bold;}
.f-blank{display:inline-block;min-width:200px;border-bottom:1px solid #bbb;}
.f-terms{padding:5px 8px;border-top:1px solid #000;font-size:10px;line-height:1.6;}
.f-eoe{padding:3px 8px;border-top:1px solid #000;font-size:10px;display:flex;justify-content:space-between;}
@media print{body{margin:0;}.page{padding:7mm 10mm 5mm 10mm;width:100%;}}
@page{size:A4;margin:0;}
`;

  const renderHdr = (pgIdx) => {
    const first = pgIdx === 0;
    const c = selectedCustomer;
    return `
<div class="co-hdr">
  <div class="co-name">${COMPANY.name}</div>
  <div class="co-addr">${COMPANY.line1}</div>
  <div class="co-addr">${COMPANY.line2}</div>
</div>
<div class="doc-row">
  <div class="dleft">Debit Memo</div>
  <div class="dctr">QUOTATION</div>
  <div class="dright">Original</div>
</div>
<div class="cust-row">
  <div class="cleft">
    <span style="font-size:9.5px;color:#555;">M/s. :</span><br>
    <strong style="font-size:11px;">${c?.customerName||'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</strong>
    ${first&&c?.addressLine1 ? `<br>${c.addressLine1}` : ''}
    ${first&&c?.city ? `<br>${[c.city,c.district].filter(Boolean).join(', ')}` : ''}
    ${first&&c?.gstNumber ? `<br><span style="font-size:10px;"><strong>GSTIN :</strong> ${c.gstNumber}</span>` : ''}
    ${first ? `<br><span style="font-size:10px;"><strong>PAN No :</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>` : ''}
  </div>
  <div class="cright">
    <table>
      <tr><td class="clbl">Invoice No.</td><td>: ${quotNo}${Number(revisionNo)>1?` Rev.${revisionNo}`:''}</td></tr>
      <tr><td class="clbl">Date</td><td>: ${fmtDateFull(quotDate)}</td></tr>
      <tr><td class="clbl">PO No.</td><td>: &nbsp;</td></tr>
    </table>
  </div>
</div>`;
  };

  const renderTblHdr = () => withPrinting
    ? `<tr>
        <th style="width:30px;">SR No.</th>
        <th class="l">Site Address / Product</th>
        <th style="width:62px;">SIZE</th>
        <th style="width:55px;">NOS/Qty</th>
        <th style="width:70px;">Rate PER MONTH</th>
        <th style="width:82px;">Printing Cost</th>
        <th style="width:80px;">Amount</th>
      </tr>`
    : `<tr>
        <th style="width:30px;">SR No.</th>
        <th class="l">Site Address</th>
        <th style="width:62px;">SIZE</th>
        <th style="width:48px;">PERIOD (MONTH)</th>
        <th style="width:72px;">Rate PER MONTH</th>
        <th style="width:80px;">Amount</th>
      </tr>`;

  const renderRowStd = (row, sr) => {
    const dates = row.startDate && row.endDate
      ? `<br><span style="font-size:9px;color:#555;">${fmtDateShort(row.startDate)} TO ${fmtDateShort(row.endDate)}</span>` : '';
    const mergeTag = row.rowType === 'merged'
      ? `<div class="merged-tag">${row.mergeDirection === 'H' ? '↔ Horizontal Merge' : '↕ Vertical Merge'}</div>`
      : '';
    return `<tr${row.rowType==='merged' ? ' style="background:#faf5ff;"' : ''}>
      <td class="c">${sr}</td>
      <td class="l">${mergeTag}${row.location||''}${dates}</td>
      <td class="c">${row.size||''}</td>
      <td class="c">${row.nos||1}.00</td>
      <td class="r">${fmtCurrency(row.ratePerMonth)}</td>
      <td class="r">${fmtCurrency(row.amount)}</td>
    </tr>`;
  };

  const renderRowPrint = (row, sr) => {
    const printCell = row.rowType==='printing'
      ? `<td class="r" style="font-style:italic;color:#888;">—</td>`
      : `<td class="r">${Number(row.printingCost||0)>0 ? fmtCurrency(row.printingCost) : '—'}</td>`;
    const mergeTag = row.rowType === 'merged'
      ? `<div class="merged-tag">${row.mergeDirection === 'H' ? '↔ H' : '↕ V'}</div>`
      : '';
    return `<tr${row.rowType==='merged' ? ' style="background:#faf5ff;"' : ''}>
      <td class="c">${sr}</td>
      <td class="l">${mergeTag}${row.location||''}</td>
      <td class="c">${row.size||''}</td>
      <td class="c">${row.rowType==='printing' ? fmtCurrency(row.sqFt) : (row.nos||1)}</td>
      <td class="r">${fmtCurrency(row.ratePerMonth)}</td>
      ${printCell}
      <td class="r">${fmtCurrency(row.amount)}</td>
    </tr>`;
  };

  const renderRow = (row, sr) => withPrinting ? renderRowPrint(row, sr) : renderRowStd(row, sr);

  const renderFooter = (isLast) => {
    const val = (v) => isLast ? v : '';
    const bv  = (w = 100) => isLast ? null : `<span style="display:inline-block;min-width:${w}px;border-bottom:1px solid #ccc;vertical-align:middle;">&nbsp;</span>`;

    const termsHtml = selectedTerms.length > 0
      ? `<div class="f-terms"><strong>Terms &amp; Condition :</strong><br>${
          selectedTerms.map((termID, n) => `${n+1}. ${termsTexts[n] || ''}`).join('<br>')
        }</div>`
      : '';

    const bankSection = isLast
      ? `<strong>GSTIN :</strong> ${COMPANY.gstin} &nbsp; <strong>PAN No :</strong> ${COMPANY.pan}<br>
         <strong>Bank Name &nbsp;&nbsp;</strong>: ${COMPANY.bank}<br>
         <strong>Branch Name</strong>: ${COMPANY.branch}<br>
         <strong>Bank A/c No &nbsp;</strong>: ${COMPANY.account}<br>
         <strong>RTGS/IFSC &nbsp;&nbsp;</strong>: ${COMPANY.ifsc}`
      : `<strong>GSTIN :</strong> ${COMPANY.gstin} &nbsp; <strong>PAN No :</strong> ${COMPANY.pan}<br>
         <strong>Bank Name &nbsp;&nbsp;</strong>: ${bv(130)}<br>
         <strong>Branch Name</strong>: ${bv(120)}<br>
         <strong>Bank A/c No &nbsp;</strong>: ${bv(130)}<br>
         <strong>RTGS/IFSC &nbsp;&nbsp;</strong>: ${bv(90)}`;

    return `
<div class="fwrap">
  <div class="f-words-row">
    <div class="f-words">
      <strong>Rs. (in words) :</strong>
      ${isLast ? numberToWords(Math.round(finalTotal)) : '<span class="f-blank">&nbsp;</span>'}
    </div>
    <div class="f-totals">
      <table>
        <tr><td>Sub Total</td><td class="gr">${isLast ? `&#8377;&nbsp;${fmtCurrency(subTotal)}` : ''}</td></tr>
        <tr><td>CGST Expense ${cgstPct}%</td><td class="gr">${val(fmtCurrency(cgstAmt))}</td></tr>
        <tr><td>SGST Expense ${sgstPct}%</td><td class="gr">${val(fmtCurrency(sgstAmt))}</td></tr>
        <tr><td style="font-size:9px;color:#666;">${Number(cgstPct)+Number(sgstPct)}%</td><td></td></tr>
        <tr class="f-grand"><td>ROUND OFF</td><td class="gr">${val(fmtCurrency(roundOff))}</td></tr>
        <tr class="f-grand"><td>Grand Total</td><td class="gr">${isLast ? `&#8377;&nbsp;${fmtCurrency(finalTotal)}` : ''}</td></tr>
      </table>
    </div>
  </div>
  <div class="f-main-row">
    <div class="f-bank">
      ${bankSection}
      <div style="margin-top:5px;padding-top:4px;border-top:1px dashed #bbb;display:flex;align-items:center;gap:6px;">
        <strong style="white-space:nowrap;">Pending Amt :</strong>
        <span style="flex:1;border-bottom:1px solid #ccc;">&nbsp;</span>
      </div>
    </div>
    <div class="f-qr">
      <img src="${qrUrl}" width="98" height="98" style="display:block;" alt="UPI QR"/>
    </div>
    <div class="f-sig">
      <div class="f-sig-company">For, JALARAM AD</div>
      <div class="f-sig-name">${COMPANY.signatory}</div>
      <div class="f-sig-name">(Authorised Signatory)</div>
      <div class="f-grand-box">
        <span class="f-grand-lbl">Grand Total &#8377;</span>
        <span class="f-grand-val">${val(fmtCurrency(finalTotal))}</span>
      </div>
    </div>
  </div>
  ${termsHtml}
  <div class="f-eoe"><span>E.&amp;O.E</span><span></span></div>
</div>`;
  };

  const pagesHtml = pages.map((pgRows, pgIdx) => {
    const isLast    = pgIdx === pages.length - 1;
    const isFirst   = pgIdx === 0;
    const startSR   = pgIdx * ROWS_PER_PRINT_PAGE + 1;
    const prevTotal = pgIdx > 0 ? pageRun[pgIdx-1] : 0;
    const bfSlot    = !isFirst ? 1 : 0;
    const cfSlot    = !isLast ? 1 : 0;
    const emptyN    = Math.max(0, ROWS_PER_PRINT_PAGE - pgRows.length - bfSlot - cfSlot);

    return `<div class="page">
${renderHdr(pgIdx)}
<table class="itbl">
  <thead>${renderTblHdr()}</thead>
  <tbody>
    ${!isFirst ? `<tr class="bf"><td colspan="${nCols-1}" class="r">B/F &rarr;</td><td class="r">${fmtCurrency(prevTotal)}</td></tr>` : ''}
    ${pgRows.map((r,i) => renderRow(r, startSR+i)).join('')}
    ${Array(emptyN).fill(`<tr class="erow">${Array(nCols).fill('<td></td>').join('')}</tr>`).join('')}
    ${!isLast ? `<tr class="cf"><td colspan="${nCols-1}" class="r">C/F to Next Page &rarr;</td><td class="r">${fmtCurrency(pageRun[pgIdx])}</td></tr>` : ''}
  </tbody>
</table>
${renderFooter(isLast)}
</div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Quotation - ${quotNo}</title><style>${css}</style></head><body>${pagesHtml}<script>window.onload=()=>setTimeout(()=>window.print(),400);</script></body></html>`;
}

/* ═══════════════════════════════════════════
   HOARDING SELECT MODAL  (with site colours)
═══════════════════════════════════════════ */
function HoardingSelectModal({ hoardings, existingIds, onAdd, onClose, siteColorMap }) {
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(new Set());

  const active   = useMemo(() => hoardings.filter(isAvailable), [hoardings]);
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return s ? active.filter(h =>
      (h.hoardingCode||'').toLowerCase().includes(s) ||
      (h.site?.addressLine1||'').toLowerCase().includes(s) ||
      (h.site?.city||'').toLowerCase().includes(s)
    ) : active;
  }, [active, search]);

  const selectable   = filtered.filter(h => !existingIds.has(h.hoardingID));
  const allSelected  = selectable.length > 0 && selectable.every(h => selected.has(h.hoardingID));
  const someSelected = selectable.some(h => selected.has(h.hoardingID));

  const toggle = (id) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    if (allSelected) {
      setSelected(p => { const n = new Set(p); selectable.forEach(h => n.delete(h.hoardingID)); return n; });
    } else {
      setSelected(p => { const n = new Set(p); selectable.forEach(h => n.add(h.hoardingID)); return n; });
    }
  };

  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="pg-modal" style={{ maxWidth:660 }}>
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><Building2 size={20} color="#049edf"/></div>
            <div>
              <h5 className="pg-modal__title">Select Available Hoardings</h5>
              <p className="pg-modal__subtitle">{active.length} available · Colour-coded by site</p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15}/></button>
        </div>
        <div style={{ padding:'12px 24px', borderBottom:'1px solid #f0f0f8' }}>
          <div className="pg-search-box">
            <Search size={13} color="#c0c0d8" style={{ flexShrink:0 }}/>
            <input placeholder="Search by code, site address…" value={search} onChange={e => setSearch(e.target.value)}/>
            {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')}/>}
          </div>
        </div>
        {selectable.length > 0 && (
          <div className="qt-select-all-row" onClick={toggleAll}>
            <div className={`qt-modal-check ${allSelected ? 'qt-modal-check--all' : someSelected ? 'qt-modal-check--on' : ''}`}>
              {allSelected ? <Check size={12} color="#fff"/> : someSelected ? <div style={{ width:8,height:2,background:'#049edf',borderRadius:2 }}/> : null}
            </div>
            <span>{allSelected ? 'Deselect All' : `Select All (${selectable.length})`}</span>
          </div>
        )}
        <div style={{ flex:1, overflowY:'auto', maxHeight:360 }}>
          {filtered.length === 0
            ? <div className="pg-empty__inner" style={{ padding:'32px 20px' }}><Building2 size={32} color="#d0d0e8"/><span className="pg-empty__label">No available hoardings</span></div>
            : filtered.map(h => {
              const checked   = selected.has(h.hoardingID);
              const alreadyIn = existingIds.has(h.hoardingID);
              const sid       = h.siteID ?? h.site?.siteID;
              const siteColor = sid != null ? siteColorMap.get(sid) : null;
              const site      = h.site ? normalizeSite(h.site) : null;
              const { line1, line2 } = getSiteDisplayLines(site, h.hoardingCode);
              return (
                <div key={h.hoardingID}
                  onClick={() => !alreadyIn && toggle(h.hoardingID)}
                  style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'10px 24px',
                    borderBottom:'1px solid #f8f8f8',
                    borderLeft: siteColor ? `4px solid ${siteColor.border}` : '4px solid transparent',
                    cursor: alreadyIn ? 'not-allowed' : 'pointer',
                    background: checked ? 'rgba(4,158,223,0.05)' : siteColor ? siteColor.bg : '#fff',
                    opacity: alreadyIn ? 0.55 : 1,
                  }}
                >
                  <div className={`qt-modal-check ${checked ? 'qt-modal-check--on' : ''}`}>
                    {checked && <Check size={12} color="#fff"/>}
                  </div>
                  {siteColor && (
                    <div style={{ width:8, height:8, borderRadius:'50%', background:siteColor.dot, flexShrink:0 }}/>
                  )}
                  <div style={{ flex:1 }}>
                    <div className="pg-td__primary" style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <MapPin size={11} color="#9090a8"/>
                      <span>{line1 || h.hoardingCode}</span>
                      {alreadyIn && <span style={{ color:'#9090a8', fontSize:11 }}>· Already added</span>}
                    </div>
                    {line2 && (
                      <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#7a8499', marginTop:1 }}>{line2}</div>
                    )}
                    <div className="pg-td__secondary">
                      Code: {h.hoardingCode} · {h.width}×{h.height} ft · ₹{Number(h.monthlyRent||0).toLocaleString('en-IN')}/mo
                    </div>
                  </div>
                  <span style={{ fontSize:10.5,fontWeight:700,padding:'2px 8px',borderRadius:5,background:'rgba(22,163,74,0.10)',color:'#16a34a',border:'1px solid rgba(22,163,74,0.2)', flexShrink:0 }}>Available</span>
                </div>
              );
            })}
        </div>
        <div className="pg-modal__foot">
          <span style={{ fontFamily:'Nunito,sans-serif',fontSize:12.5,color:'#9090a8',fontWeight:600 }}>{selected.size} selected</span>
          <div style={{ display:'flex',gap:10 }}>
            <button className="pg-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="pg-btn-save" onClick={() => onAdd(selected)} disabled={selected.size===0}>
              <Plus size={14}/> Add {selected.size>0?`(${selected.size})`:''}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   MANUAL HOARDING MODAL
═══════════════════════════════════════════ */
function ManualHoardingModal({ hoardings, onAdd, onClose, siteColorMap }) {
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(new Set());

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return s ? hoardings.filter(h =>
      (h.hoardingCode||'').toLowerCase().includes(s) ||
      (h.site?.addressLine1||'').toLowerCase().includes(s)
    ) : hoardings;
  }, [hoardings, search]);

  const toggle = (id) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="pg-modal" style={{ maxWidth:540 }}>
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><Building2 size={20} color="#049edf"/></div>
            <div>
              <h5 className="pg-modal__title">Add Hoarding Manually</h5>
              <p className="pg-modal__subtitle">All hoardings — including occupied &amp; maintenance</p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15}/></button>
        </div>
        <div style={{ padding:'12px 24px',borderBottom:'1px solid #f0f0f8' }}>
          <div className="pg-search-box">
            <Search size={13} color="#c0c0d8" style={{ flexShrink:0 }}/>
            <input placeholder="Search all hoardings…" value={search} onChange={e => setSearch(e.target.value)}/>
            {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')}/>}
          </div>
        </div>
        <div style={{ flex:1,overflowY:'auto',maxHeight:360 }}>
          {filtered.map(h => {
            const p  = selected.has(h.hoardingID);
            const av = isAvailable(h);
            const statusLabel = typeof h.status==='boolean' ? (h.status?'Available':'Unavailable') : (h.status||'Unknown');
            const sid = h.siteID ?? h.site?.siteID;
            const siteColor = sid != null ? siteColorMap.get(sid) : null;
            const site = h.site ? normalizeSite(h.site) : null;
            const { line1, line2 } = getSiteDisplayLines(site, h.hoardingCode);
            return (
              <div key={h.hoardingID} onClick={() => toggle(h.hoardingID)}
                style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'10px 24px',
                  borderBottom:'1px solid #f8f8f8',
                  borderLeft: siteColor ? `4px solid ${siteColor.border}` : '4px solid transparent',
                  cursor:'pointer',
                  background: p ? 'rgba(4,158,223,0.05)' : siteColor ? siteColor.bg : '#fff',
                }}
              >
                <div className={`qt-modal-check ${p ? 'qt-modal-check--on' : ''}`}>
                  {p && <Check size={12} color="#fff"/>}
                </div>
                {siteColor && <div style={{ width:8,height:8,borderRadius:'50%',background:siteColor.dot,flexShrink:0 }}/>}
                <div style={{ flex:1 }}>
                  <div className="pg-td__primary">{line1 || h.hoardingCode}</div>
                  {line2 && (
                    <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#7a8499', marginTop:1 }}>{line2}</div>
                  )}
                  <div className="pg-td__secondary">Code: {h.hoardingCode} · {h.width}×{h.height}</div>
                </div>
                <span style={{ fontSize:10.5,fontWeight:700,padding:'2px 8px',borderRadius:5,background:av?'rgba(22,163,74,0.10)':'rgba(220,38,38,0.10)',color:av?'#16a34a':'#dc2626',border:`1px solid ${av?'rgba(22,163,74,0.2)':'rgba(220,38,38,0.2)'}`, flexShrink:0 }}>{statusLabel}</span>
              </div>
            );
          })}
        </div>
        <div className="pg-modal__foot">
          <span style={{ fontFamily:'Nunito,sans-serif',fontSize:12.5,color:'#9090a8',fontWeight:600 }}>{selected.size} selected</span>
          <div style={{ display:'flex',gap:10 }}>
            <button className="pg-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="pg-btn-save" onClick={() => onAdd(selected)} disabled={selected.size===0}>
              <Plus size={14}/> Add {selected.size>0?`(${selected.size})`:''}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   TERMS MODAL
═══════════════════════════════════════════ */
function TermsModal({ selected, onSelect, termsList, onClose }) {
  const sorted = useMemo(() => [...termsList].sort((a,b) => (a.order||0)-(b.order||0)), [termsList]);
  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="pg-modal" style={{ maxWidth:560 }}>
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><List size={20} color="#049edf"/></div>
            <div>
              <h5 className="pg-modal__title">Terms &amp; Conditions</h5>
              <p className="pg-modal__subtitle">Select up to 3.</p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15}/></button>
        </div>
        <div style={{ flex:1,overflowY:'auto',maxHeight:440,padding:'16px 24px' }}>
          {sorted.length === 0 && (
            <div style={{ fontFamily:'Nunito,sans-serif',fontSize:13,color:'#9090a8',textAlign:'center',padding:'28px 0' }}>
              No terms found. Add them in Customer Terms settings.
            </div>
          )}
          {sorted.map(term => {
            const checked  = selected.includes(term.termID);
            const disabled = !checked && selected.length >= 3;
            return (
              <div key={term.termID} style={{ border:`1.5px solid ${checked?'#049edf40':'#f0f0f8'}`,borderRadius:12,padding:'11px 13px',marginBottom:10,background:checked?'rgba(4,158,223,0.03)':'#fff',opacity:disabled?0.5:1 }}>
                <div style={{ display:'flex',alignItems:'flex-start',gap:10 }}>
                  <button onClick={() => !disabled && onSelect(term.termID)} style={{ background:'none',border:'none',cursor:disabled?'not-allowed':'pointer',padding:0,marginTop:3,flexShrink:0 }}>
                    <div style={{ width:20,height:20,borderRadius:5,border:`2px solid ${checked?'#049edf':'#d0d0e0'}`,background:checked?'#049edf':'#fff',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      {checked && <Check size={12} color="#fff"/>}
                    </div>
                  </button>
                  <div style={{ flex:1,fontFamily:'Nunito,sans-serif',fontSize:12.5,color:'#1a1a2e',fontWeight:600,lineHeight:1.5 }}>
                    {term.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pg-modal__foot">
          <span style={{ fontFamily:'Nunito,sans-serif',fontSize:13,color:'#9090a8',fontWeight:600 }}>{selected.length}/3 selected</span>
          <button className="pg-btn-save" onClick={onClose}><Check size={14}/> Done</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   MERGE HOARDING MODAL
   Only hoardings from the SAME site can be merged.
═══════════════════════════════════════════ */
function MergeModal({ rows, onMerge, onClose, siteColorMap }) {
  const hoardingRows = rows.filter(r => r.rowType === 'hoarding');
  const [sel, setSel] = useState([]);
  const [dir, setDir] = useState('H');

  // siteID of the first selected hoarding (null = anything goes only if both null)
  const firstSiteID = sel.length > 0
    ? (hoardingRows.find(r => r._id === sel[0])?.siteID ?? null)
    : undefined; // undefined means nothing selected yet

  const toggle = (id) => {
    const row = hoardingRows.find(r => r._id === id);
    if (!row) return;
    setSel(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      // Already have 2 — replace oldest
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const preview = useMemo(() => {
    if (sel.length < 2) return null;
    const r1 = rows.find(r => r._id === sel[0]);
    const r2 = rows.find(r => r._id === sel[1]);
    if (!r1 || !r2) return null;
    const s1 = parseSize(r1.size);
    const s2 = parseSize(r2.size);
    let mw, mh;
    if (dir === 'H') { mw = s1.w + s2.w + 1; mh = Math.max(s1.h, s2.h); }
    else             { mw = Math.max(s1.w, s2.w); mh = s1.h + s2.h + 1; }
    return { size: `${mw} × ${mh} ft`, sqFt: (mw * mh).toFixed(1) };
  }, [sel, dir, rows]);

  // Group hoardings by site for display
  const siteGroups = useMemo(() => {
    const map = new Map(); // siteID → { label, rows[] }
    for (const r of hoardingRows) {
      const sid = r.siteID ?? '__none__';
      if (!map.has(sid)) {
        // Build site label from siteObj if available
        const site = r.siteObj;
        const label = site
          ? [site.addressLine1, site.city, site.district].filter(Boolean).join(', ')
          : (sid === '__none__' ? 'Unknown Site' : `Site ${sid}`);
        map.set(sid, { label, siteID: r.siteID, rows: [] });
      }
      map.get(sid).rows.push(r);
    }
    return [...map.values()];
  }, [hoardingRows]);

  if (hoardingRows.length < 2) {
    return ReactDOM.createPortal(
      <div className="pg-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
        <div className="pg-modal" style={{ maxWidth:440 }}>
          <div className="pg-modal__head">
            <div className="pg-modal__head-left">
              <div className="pg-modal__icon-wrap" style={{ background:'rgba(124,58,237,0.10)' }}><Link2 size={20} color="#7c3aed"/></div>
              <div><h5 className="pg-modal__title">Merge Hoardings</h5></div>
            </div>
            <button className="pg-modal__close" onClick={onClose}><X size={15}/></button>
          </div>
          <div style={{ padding:'32px 24px', textAlign:'center', fontFamily:'Nunito,sans-serif', fontSize:13, color:'#9090a8' }}>
            <Building2 size={36} color="#d0d0e8" style={{ marginBottom:12 }}/>
            <p>You need at least <strong>2 hoarding rows from the same site</strong> before merging.</p>
          </div>
          <div className="pg-modal__foot">
            <button className="pg-btn-cancel" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return ReactDOM.createPortal(
    <div className="pg-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="pg-modal" style={{ maxWidth:580 }}>
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap" style={{ background:'rgba(124,58,237,0.10)' }}>
              <Link2 size={20} color="#7c3aed"/>
            </div>
            <div>
              <h5 className="pg-modal__title">Merge Hoardings</h5>
              <p className="pg-modal__subtitle">Only hoardings from the <strong>same site</strong> can be merged</p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15}/></button>
        </div>

        {/* Merge direction */}
        <div style={{ padding:'14px 24px', borderBottom:'1px solid #f0f0f8' }}>
          <div style={{ fontFamily:'Nunito,sans-serif', fontSize:12, fontWeight:700, color:'#5a5a78', marginBottom:10 }}>
            Merge Direction
          </div>
          <div style={{ display:'flex', gap:10 }}>
            {[
              { val:'H', label:'Horizontal', sub:'Side by side  ·  width + width + 1', icon:'↔' },
              { val:'V', label:'Vertical',   sub:'Top to bottom  ·  height + height + 1', icon:'↕' },
            ].map(({ val, label, sub, icon }) => (
              <button key={val} onClick={() => setDir(val)}
                style={{
                  flex:1, padding:'12px', borderRadius:12, cursor:'pointer', textAlign:'left',
                  border: `2px solid ${dir===val ? '#7c3aed' : '#e8e8f4'}`,
                  background: dir===val ? 'rgba(124,58,237,0.06)' : '#fff',
                  fontFamily:'Nunito,sans-serif',
                }}
              >
                <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
                <div style={{ fontSize:13, fontWeight:800, color: dir===val ? '#7c3aed' : '#1a1a2e' }}>{label}</div>
                <div style={{ fontSize:11, color:'#9090a8', marginTop:3 }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Hoarding selection — grouped by site */}
        <div style={{ padding:'14px 24px 0', fontFamily:'Nunito,sans-serif', fontSize:12, fontWeight:700, color:'#5a5a78' }}>
          Select 2 Hoardings from the Same Site
          <span style={{ color:'#9090a8', fontWeight:600, marginLeft:6 }}>({sel.length}/2 selected)</span>
        </div>
        <div style={{ flex:1, overflowY:'auto', maxHeight:300, padding:'8px 24px 14px' }}>
          {siteGroups.map(group => {
            const groupColor = group.siteID != null ? siteColorMap.get(group.siteID) : null;
            // Is this group locked? — locked if first selected and its siteID differs
            const groupLocked = firstSiteID !== undefined && group.siteID !== firstSiteID;
            return (
              <div key={String(group.siteID ?? '__none__')} style={{ marginBottom:14 }}>
                {/* Site header */}
                <div style={{
                  display:'flex', alignItems:'center', gap:8, marginBottom:6,
                  padding:'5px 10px', borderRadius:8,
                  background: groupLocked ? '#f8f8f8' : (groupColor ? groupColor.bg : '#f4f4fb'),
                  border: `1px solid ${groupLocked ? '#e8e8f0' : (groupColor ? groupColor.border : '#e8e8f4')}`,
                  opacity: groupLocked ? 0.5 : 1,
                }}>
                  {groupColor && !groupLocked && (
                    <div style={{ width:10, height:10, borderRadius:'50%', background:groupColor.dot, flexShrink:0 }}/>
                  )}
                  <MapPin size={12} color={groupLocked ? '#c0c0c8' : (groupColor?.dot || '#9090a8')}/>
                  <span style={{ fontFamily:'Nunito,sans-serif', fontSize:12, fontWeight:800, color: groupLocked ? '#b0b0c8' : '#1a1a2e' }}>
                    {group.label}
                  </span>
                  {groupLocked && (
                    <span style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#dc2626', marginLeft:'auto', fontWeight:700 }}>
                      ✕ Different site
                    </span>
                  )}
                  {!groupLocked && group.rows.length < 2 && (
                    <span style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#f59e0b', marginLeft:'auto', fontWeight:700 }}>
                      Need 2+ hoardings to merge
                    </span>
                  )}
                </div>

                {/* Hoarding rows in group */}
                {group.rows.map(r => {
                  const checked  = sel.includes(r._id);
                  const disabled = groupLocked || (!checked && sel.length >= 2);
                  const { line1, line2 } = getSiteDisplayLines(r.siteObj, r.hoardingCode);
                  return (
                    <div key={r._id}
                      onClick={() => !disabled && toggle(r._id)}
                      style={{
                        display:'flex', alignItems:'center', gap:12,
                        padding:'9px 12px', borderRadius:10, marginBottom:6,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        border: `1.5px solid ${checked ? '#7c3aed' : '#f0f0f0'}`,
                        background: checked ? 'rgba(124,58,237,0.06)' : groupLocked ? '#f8f8f8' : '#fafafa',
                        opacity: disabled && !checked ? 0.4 : 1,
                      }}
                    >
                      <div style={{ width:20,height:20,borderRadius:6,border:`2px solid ${checked?'#7c3aed':'#d0d0e0'}`,background:checked?'#7c3aed':'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                        {checked && <Check size={12} color="#fff"/>}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:'Nunito,sans-serif', fontSize:12.5, fontWeight:700, color: groupLocked ? '#b0b0c8' : '#1a1a2e' }}>
                          {line1 || r.hoardingCode}
                        </div>
                        {line2 && (
                          <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#9090a8', marginTop:1 }}>{line2}</div>
                        )}
                        <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#b0b0c8', marginTop:1 }}>
                          Code: {r.hoardingCode} · Size: {r.size} · {r.sqFt} sq.ft
                        </div>
                      </div>
                      {checked && (
                        <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, fontWeight:800, padding:'2px 8px', borderRadius:5, background:'rgba(124,58,237,0.12)', color:'#7c3aed', border:'1px solid rgba(124,58,237,0.25)', flexShrink:0 }}>
                          {sel.indexOf(r._id) === 0 ? '1st' : '2nd'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Preview */}
        {preview && (
          <div style={{ margin:'0 24px 14px', padding:'12px 16px', borderRadius:12, background:'rgba(124,58,237,0.06)', border:'1.5px solid rgba(124,58,237,0.20)' }}>
            <div style={{ fontFamily:'Nunito,sans-serif', fontSize:12, fontWeight:700, color:'#7c3aed', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
              <Link2 size={13}/> Merge Preview
            </div>
            <div style={{ display:'flex', gap:24 }}>
              <div>
                <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#9090a8' }}>Combined Size</div>
                <div style={{ fontFamily:'Nunito,sans-serif', fontSize:16, fontWeight:900, color:'#1a1a2e' }}>{preview.size}</div>
              </div>
              <div>
                <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#9090a8' }}>Total Area</div>
                <div style={{ fontFamily:'Nunito,sans-serif', fontSize:16, fontWeight:900, color:'#1a1a2e' }}>{preview.sqFt} sq.ft</div>
              </div>
              <div>
                <div style={{ fontFamily:'Nunito,sans-serif', fontSize:11, color:'#9090a8' }}>Direction</div>
                <div style={{ fontFamily:'Nunito,sans-serif', fontSize:14, fontWeight:900, color:'#7c3aed' }}>
                  {dir === 'H' ? '↔ Horizontal' : '↕ Vertical'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pg-modal__foot">
          <div style={{ fontFamily:'Nunito,sans-serif', fontSize:12, color:'#9090a8', fontWeight:600 }}>
            Original rows will be replaced by the merged row
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="pg-btn-cancel" onClick={onClose}>Cancel</button>
            <button
              disabled={sel.length !== 2}
              onClick={() => {
                const r1 = rows.find(r => r._id === sel[0]);
                const r2 = rows.find(r => r._id === sel[1]);
                onMerge(r1, r2, dir);
              }}
              style={{
                display:'flex', alignItems:'center', gap:7,
                padding:'9px 20px', borderRadius:9, border:'none',
                background: sel.length===2 ? '#7c3aed' : '#d0d0e0',
                color:'#fff', cursor: sel.length===2 ? 'pointer' : 'not-allowed',
                fontFamily:'Nunito,sans-serif', fontSize:13, fontWeight:800,
              }}
            >
              <Link2 size={14}/> Merge Hoardings
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function QuotationPage() {

  /* ── API Data ── */
  const [customers,  setCustomers]  = useState([]);
  const [hoardings,  setHoardings]  = useState([]);
  const [sites,      setSites]      = useState([]);   // full site records from /Site
  const [termsList,  setTermsList]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [apiError,   setApiError]   = useState('');
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);

  /* ── History ── */
  const [quotations,    setQuotations]    = useState([]);
  const [quotLines,     setQuotLines]     = useState([]);
  const [histSearch,    setHistSearch]    = useState('');
  const [histSortKey,   setHistSortKey]   = useState('quotationDate');
  const [histSortDir,   setHistSortDir]   = useState('desc');
  const [histPage,      setHistPage]      = useState(1);
  const [histPageSize,  setHistPageSize]  = useState(10);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  /* ── Creator state ── */
  const [isCreating,    setIsCreating]    = useState(false);
  const [step,          setStep]          = useState(1);
  const [step1Error,    setStep1Error]    = useState('');
  const [step2Error,    setStep2Error]    = useState('');
  const [editingQuotID, setEditingQuotID] = useState(null);

  /* ── Form fields ── */
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [withPrinting,     setWithPrinting]     = useState(false);
  const [quotNo,           setQuotNo]           = useState('');
  const [quotDate,         setQuotDate]         = useState(todayISO());
  const [revisionNo,       setRevisionNo]       = useState(0);
  const [rows,             setRows]             = useState([]);
  const [cgstPct,          setCgstPct]          = useState(9);
  const [sgstPct,          setSgstPct]          = useState(9);
  const [selectedTerms,    setSelectedTerms]    = useState([]);
  const [globalStart,      setGlobalStart]      = useState('');
  const [globalEnd,        setGlobalEnd]        = useState('');

  /* ── Modals ── */
  const [showHoardModal,  setShowHoardModal]  = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showTermsModal,  setShowTermsModal]  = useState(false);
  const [showMergeModal,  setShowMergeModal]  = useState(false);

  /* ── Step 2 resizable table ── */
  const step2TableRef  = useRef(null);
  const [step2TableReady, setStep2TableReady] = useState(false);
  // Column widths: #, Location, Size, SqFt, NOS, StartDate, EndDate, Rate, Amount, Actions
  useResizableColumns(step2TableRef, step2TableReady, [40, 200, 80, 70, 60, 148, 148, 90, 90, 50]);

  useEffect(() => {
    setStep2TableReady(false);
    if (step === 2) {
      const t = setTimeout(() => setStep2TableReady(true), 120);
      return () => clearTimeout(t);
    }
  }, [step, withPrinting]);

  const formRef = useRef(null);

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  /* ── Site lookup map: siteID → normalised site object ── */
  const siteMap = useMemo(() => {
    const map = new Map();
    for (const s of sites) { if (s?.siteID) map.set(s.siteID, s); }
    // Also index sites nested inside hoardings (in case /Site returns fewer)
    for (const h of hoardings) {
      const s = h.site ? normalizeSite(h.site) : null;
      if (s?.siteID && !map.has(s.siteID)) map.set(s.siteID, s);
    }
    return map;
  }, [sites, hoardings]);

  /* ── Site colour map ── */
  const siteColorMap = useMemo(() => buildSiteColorMap(hoardings, sites), [hoardings, sites]);

  const getRowSiteColor = (row) => {
    if (row.rowType === 'merged')   return null; // merged gets its own styling
    if (row.rowType === 'printing') return null;
    if (row.siteID == null)         return null;
    return siteColorMap.get(row.siteID) || null;
  };

  const toggleGroup = useCallback((key) => {
    setExpandedGroups(p => {
      const n = new Set(p);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }, []);

  /* ── Load API data ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cRaw, hRaw, sRaw, tRaw, qRaw, qlRaw] = await Promise.all([
          apiService.getAllCustomers(),
          apiService.getAllHoardings(),
          apiService.getAllSites().catch(() => []),
          apiService.getAllCustomerTerms().catch(() => []),
          apiService.getAllQuotations().catch(() => []),
          apiService.getAllQuotationLines().catch(() => []),
        ]);
        setCustomers(normalizeList(cRaw).map(normalizeCustomer));
        setHoardings(normalizeList(hRaw));
        setSites(normalizeList(sRaw).map(normalizeSite).filter(Boolean));
        setTermsList(normalizeList(tRaw));
        setQuotations(normalizeList(qRaw).map(normalizeQuotation));
        setQuotLines(normalizeList(qlRaw).map(normalizeQuotLine));
      } catch (err) {
        setApiError(err?.response?.data?.message || err?.message || 'Failed to load data.');
      } finally { setLoading(false); }
    })();
  }, []);

  /* ── Refresh quotations ── */
  const refreshQuotations = useCallback(async () => {
    try {
      const [qRaw, qlRaw] = await Promise.all([
        apiService.getAllQuotations(),
        apiService.getAllQuotationLines(),
      ]);
      setQuotations(normalizeList(qRaw).map(normalizeQuotation));
      setQuotLines(normalizeList(qlRaw).map(normalizeQuotLine));
      showToast('List refreshed', 'success');
    } catch (err) {
      showToast('Refresh failed: ' + (err?.message || 'Unknown error'), 'error');
    }
  }, [showToast]);

  /* ── Calculations ── */
  const subTotal   = useMemo(() => rows.reduce((s,r) => s + Number(r.amount||0), 0), [rows]);
  const cgstAmt    = useMemo(() => (subTotal * Number(cgstPct||0)) / 100, [subTotal, cgstPct]);
  const sgstAmt    = useMemo(() => (subTotal * Number(sgstPct||0)) / 100, [subTotal, sgstPct]);
  const grossTotal = useMemo(() => subTotal + cgstAmt + sgstAmt, [subTotal, cgstAmt, sgstAmt]);
  const finalTotal = useMemo(() => Math.round(grossTotal), [grossTotal]);
  const roundOff   = useMemo(() => finalTotal - grossTotal, [finalTotal, grossTotal]);

  /* ── Row operations ── */
  const updateRow = useCallback((id, field, val) => {
    setRows(prev => prev.map(r => {
      if (r._id !== id) return r;
      const u = { ...r, [field]: val };
      if (['ratePerMonth','nos','sqFt'].includes(field)) {
        if (u.rowType === 'printing') {
          u.amount = Number(u.sqFt||0) * Number(u.ratePerMonth||0);
        } else {
          u.amount = Number(u.ratePerMonth||0) * Number(u.nos||1);
        }
      }
      if (field === 'nos' && u.rowType === 'hoarding' && u.startDate) {
        u.endDate = addMonths(u.startDate, Number(val)||1);
      }
      if (field === 'startDate' && u.rowType === 'hoarding' && u.startDate) {
        u.endDate = addMonths(val, Number(u.nos)||1);
      }
      return u;
    }));
  }, []);

  const deleteRow = useCallback((id) => setRows(p => p.filter(r => r._id !== id)), []);
  const existingHoardingIds = useMemo(() => new Set(rows.map(r => r.hoardingID).filter(Boolean)), [rows]);

  const applyGlobalDates = useCallback(() => {
    if (!globalStart) return;
    setRows(prev => prev.map(r => {
      if (r.rowType !== 'hoarding') return r;
      const end = globalEnd || addMonths(globalStart, Number(r.nos)||1);
      return { ...r, startDate: globalStart, endDate: end };
    }));
  }, [globalStart, globalEnd]);

  const handleAddSelected = (selectedIds) => {
    const toAdd = hoardings
      .filter(h => selectedIds.has(h.hoardingID) && !rows.find(r => r.hoardingID===h.hoardingID))
      .map(h => newHoardingRow(h, globalStart, globalEnd || addMonths(globalStart, 1), siteMap));
    setRows(p => [...p, ...toAdd]);
    setShowHoardModal(false);
  };

  const handleAddManual = (selectedIds) => {
    const toAdd = hoardings
      .filter(h => selectedIds.has(h.hoardingID) && !rows.find(r => r.hoardingID===h.hoardingID))
      .map(h => newHoardingRow(h, globalStart, globalEnd || addMonths(globalStart, 1), siteMap));
    setRows(p => [...p, ...toAdd]);
    setShowManualModal(false);
  };

  /* ── Merge hoardings ── */
  const handleMerge = useCallback((r1, r2, direction) => {
    const merged = newMergedRow(r1, r2, direction);
    setRows(prev => {
      const withoutOriginals = prev.filter(r => r._id !== r1._id && r._id !== r2._id);
      return [...withoutOriginals, merged];
    });
    setShowMergeModal(false);
    showToast(`Hoardings merged (${direction === 'H' ? 'Horizontal' : 'Vertical'}) · Size: ${merged.size}`, 'success');
  }, [showToast]);

  const toggleTerm = (termID) => {
    setSelectedTerms(p => {
      if (p.includes(termID)) return p.filter(i => i !== termID);
      if (p.length >= 3) return p;
      return [...p, termID];
    });
  };

  const resetForm = () => {
    setSelectedCustomer(null); setWithPrinting(false);
    setQuotNo(''); setQuotDate(todayISO());
    setRevisionNo(1);
    setRows([]);
    setCgstPct(9); setSgstPct(9);
    setSelectedTerms([]);
    setStep1Error(''); setStep2Error('');
    setEditingQuotID(null);
    setGlobalStart(''); setGlobalEnd('');
  };

  const handleStartNew = () => {
    resetForm();
    setStep(1); setIsCreating(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 80);
  };

  const handleReopenHistory = async (quot) => {
    const myLines = quotLines.filter(l =>
      l.quotationID === quot.quotationID &&
      l.quotationRevisionNumber === quot.quotationRevisionNumber
    );
    const cust = customers.find(c => c.customerID === quot.customerID) || null;
    setSelectedCustomer(cust);
    setWithPrinting(false);
    setQuotNo(quot.quotationNumber);
    setQuotDate(todayISO());
    setRevisionNo((quot.quotationRevisionNumber||1) + 1);
    const builtRows = myLines.map(l => {
      const h = hoardings.find(hh => hh.hoardingID === l.hoardingID);
      const siteID = h?.siteID ?? h?.site?.siteID ?? null;
      const siteObj = siteID != null ? (siteMap.get(siteID) ?? (h?.site ? normalizeSite(h.site) : null)) : null;
      return {
        _id: uid(), rowType: 'hoarding',
        hoardingID:   l.hoardingID,
        siteID,
        siteObj,
        location:     buildSiteAddress(siteObj, h?.hoardingCode || ''),
        hoardingCode: h?.hoardingCode || '',
        size:   h ? `${h.width} X ${h.height}` : '',
        sqFt:   h ? (h.width * h.height) : 0,
        nos:    1,
        startDate: l.periodBeginDate || '',
        endDate:   l.periodEndDate   || '',
        ratePerMonth: l.rentAmount || h?.monthlyRent || 0,
        amount:       l.rentAmount || 0,
        printingCost: 0,
        quotationLineNumber: l.quotationLineNumber,
        saved: false,
      };
    });
    setRows(builtRows);
    setCgstPct(quot.cGSTPercent ?? 9);
    setSgstPct(quot.sGSTPercent ?? 9);
    setSelectedTerms([]);
    setStep1Error(''); setStep2Error('');
    setEditingQuotID(null);
    setGlobalStart(''); setGlobalEnd('');
    setStep(1); setIsCreating(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 80);
  };

  const handleViewPDF = (quot) => {
    const myLines = quotLines.filter(l =>
      l.quotationID === quot.quotationID &&
      l.quotationRevisionNumber === quot.quotationRevisionNumber
    );
    const cust = customers.find(c => c.customerID === quot.customerID) || null;
    const pdfRows = myLines.map(l => {
      const h = hoardings.find(hh => hh.hoardingID === l.hoardingID);
      const siteID = h?.siteID ?? h?.site?.siteID ?? null;
      const siteObj = siteID != null ? (siteMap.get(siteID) ?? (h?.site ? normalizeSite(h.site) : null)) : null;
      return {
        rowType:'hoarding', hoardingID:l.hoardingID,
        location: buildSiteAddress(siteObj, h?.hoardingCode || ''),
        size: h ? `${h.width} X ${h.height}` : '',
        sqFt: h ? (h.width * h.height) : 0,
        nos: 1,
        startDate: l.periodBeginDate, endDate: l.periodEndDate,
        ratePerMonth: l.rentAmount, amount: l.rentAmount, printingCost: 0,
      };
    });
    const storedSub   = quot.totalAmount / (1 + (quot.cGSTPercent + quot.sGSTPercent)/100);
    const storedCgst  = (storedSub * quot.cGSTPercent) / 100;
    const storedSgst  = (storedSub * quot.sGSTPercent) / 100;
    const storedGross = storedSub + storedCgst + storedSgst;
    const storedFinal = Math.round(storedGross);
    const html = buildPrintHTML({
      rows: pdfRows, withPrinting: false, selectedCustomer: cust,
      quotNo: quot.quotationNumber, quotDate: quot.quotationDate,
      revisionNo: quot.quotationRevisionNumber,
      cgstPct: quot.cGSTPercent, sgstPct: quot.sGSTPercent,
      subTotal: storedSub, cgstAmt: storedCgst, sgstAmt: storedSgst,
      roundOff: storedFinal - storedGross, finalTotal: storedFinal,
      selectedTerms: [], termsTexts: [],
    });
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const goNext = () => {
    if (step === 1) {
      if (!selectedCustomer) { setStep1Error('Please select a customer.'); return; }
      if (!globalStart)       { setStep1Error('Global Period From date is required.'); return; }
      if (!globalEnd)         { setStep1Error('Global Period To date is required.'); return; }
      setStep1Error(''); setStep(2);
    } else if (step === 2) {
      if (rows.length === 0) { setStep2Error('Add at least one hoarding.'); return; }
      setStep2Error(''); setStep(3);
    }
  };
  const goBack           = () => setStep(s => Math.max(1,s-1));
  const handleBackToList = () => { setIsCreating(false); setTimeout(() => window.scrollTo({ top:0, behavior:'smooth' }), 80); };

  const generatePDF = async () => {
    setSaving(true);
    try {
      const headerPayload = {
        quotationRevisionNumber: Number(revisionNo),
        customerID:              selectedCustomer.customerID,
        quotationNumber:         quotNo || `QT/${Date.now()}`,
        quotationDate:           quotDate,
        cGSTPercent:             Number(cgstPct),
        cGSTAmount:              cgstAmt,
        sGSTPercent:             Number(sgstPct),
        sGSTAmount:              sgstAmt,
        totalAmount:             finalTotal,
      };
      let savedHeader;
      if (editingQuotID) {
        savedHeader = await apiService.updateQuotation({ ...headerPayload, quotationID: editingQuotID });
      } else {
        savedHeader = await apiService.createQuotation(headerPayload);
      }
      const savedQuotID = savedHeader?.quotationID ?? savedHeader?.QuotationID ?? editingQuotID ?? 0;
      const savedRevNo  = Number(revisionNo);

      // Save only hoarding rows (not merged or printing – no valid hoardingID)
      await Promise.all(
        rows.filter(r => r.rowType === 'hoarding').map((row, idx) => {
          const linePayload = {
            quotationLineNumber:     idx + 1,
            quotationID:             savedQuotID,
            quotationRevisionNumber: savedRevNo,
            hoardingID:              row.hoardingID,
            periodBeginDate:         row.startDate || todayISO(),
            periodEndDate:           row.endDate   || todayISO(),
            rentAmount:              Number(row.amount||0),
          };
          if (row.saved && row.quotationLineNumber > 0) {
            return apiService.updateQuotationLine(linePayload);
          }
          return apiService.createQuotationLine(linePayload);
        })
      );

      const html = buildPrintHTML({
        rows, withPrinting, selectedCustomer,
        quotNo: quotNo || `QT/${savedQuotID}`,
        quotDate, revisionNo, cgstPct, sgstPct,
        subTotal, cgstAmt, sgstAmt, roundOff, finalTotal,
        selectedTerms,
        termsTexts: selectedTerms.map(id => {
          const t = termsList.find(t => t.termID === id);
          return t?.description || '';
        }),
      });
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
      showToast('Quotation saved successfully!', 'success');
      await refreshQuotations();
      setIsCreating(false);
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save quotation.', 'error');
    } finally { setSaving(false); }
  };

  /* ── History grouped table ── */
  const allGrouped = useMemo(() => {
    const map = new Map();
    for (const q of quotations) {
      const key = (q.quotationNumber || '').trim() || String(q.quotationID);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(q);
    }
    const groups = [];
    for (const revs of map.values()) {
      groups.push([...revs].sort((a,b) =>
        Number(b.quotationRevisionNumber||0) - Number(a.quotationRevisionNumber||0)
      ));
    }
    return groups;
  }, [quotations]);

  const filteredGroups = useMemo(() => {
    const q = histSearch.toLowerCase();
    if (!q) return allGrouped;
    return allGrouped.filter(group => {
      const l = group[0];
      const cust = customers.find(c => c.customerID === l.customerID);
      return (l.quotationNumber||'').toLowerCase().includes(q) ||
             (cust?.customerName||'').toLowerCase().includes(q);
    });
  }, [allGrouped, histSearch, customers]);

  const sortedGroups = useMemo(() => [...filteredGroups].sort((a,b) => {
    const av = String(a[0][histSortKey]||'').toLowerCase();
    const bv = String(b[0][histSortKey]||'').toLowerCase();
    return histSortDir==='asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  }), [filteredGroups, histSortKey, histSortDir]);

  const histTotalPages = Math.max(1, Math.ceil(sortedGroups.length / histPageSize));
  const histPaginated  = sortedGroups.slice((histPage-1)*histPageSize, histPage*histPageSize);

  const handleHistSort = (key) => {
    if (histSortKey===key) setHistSortDir(d => d==='asc'?'desc':'asc');
    else { setHistSortKey(key); setHistSortDir('asc'); }
    setHistPage(1);
  };

  const histPageNums = Array.from({ length:histTotalPages }, (_,i)=>i+1)
    .filter(p => p===1||p===histTotalPages||Math.abs(p-histPage)<=1)
    .reduce((acc,p,i,arr) => { if (i>0&&arr[i]-arr[i-1]>1) acc.push('…'); acc.push(p); return acc; }, []);

  const HIST_COLS = [
    { key:'quotationNumber',  label:'Quotation No.', w:'16%' },
    { key:'customerID',       label:'Customer',       w:'22%' },
    { key:'quotationDate',    label:'Date',           w:'12%' },
    { key:'_version',         label:'Latest Version', w:'12%', noSort:true },
    { key:'totalAmount',      label:'Grand Total',    w:'14%' },
    { key:'_action',          label:'Actions',        w:'16%', noSort:true },
  ];

  const custName = (id) => customers.find(c => c.customerID===id)?.customerName || '—';

  /* ── Merged rows count for step 2 badge ── */
  const mergedCount = rows.filter(r => r.rowType === 'merged').length;

  /* ════════════════ RENDER ════════════════ */
  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',gap:14,flexDirection:'column' }}>
      <Loader2 size={32} color="#049edf" className="pg-spin"/>
      <span style={{ fontFamily:'Nunito,sans-serif',color:'#9090a8',fontSize:14 }}>Loading quotation data…</span>
    </div>
  );

  return (
    <>
      {saving && (
        <div className="qt-saving-overlay">
          <Loader2 size={32} color="#049edf" className="pg-spin"/>
          <div className="qt-saving-overlay__text">Saving quotation…</div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}

      <div className="pg-page">

        {/* ── Page Header ── */}
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">Quotations</h1>
            <p className="pg-header__subtitle">Generate and manage hoarding <strong>quotations</strong> for customers.</p>
          </div>
          <div style={{ display:'flex',gap:10,alignItems:'center' }}>
            {isCreating && (
              <button className="pg-btn-cancel" onClick={handleBackToList} style={{ display:'flex',alignItems:'center',gap:6 }}>
                <LayoutGrid size={13}/> Back to List
              </button>
            )}
            {!isCreating && (
              <button className="pg-btn-add" onClick={handleStartNew}>
                <Plus size={14}/> New Quotation
              </button>
            )}
          </div>
        </div>

        {apiError && (
          <div style={{ display:'flex',gap:8,alignItems:'center',padding:'10px 14px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:11,marginBottom:16,color:'#dc2626',fontSize:13,fontWeight:600,fontFamily:'Nunito,sans-serif' }}>
            <AlertCircle size={14}/> {apiError}
          </div>
        )}

        {/* ══════════════════════════════
            STEP-BASED CREATION FORM
        ══════════════════════════════ */}
        {isCreating && (
          <div ref={formRef} className="pg-container qt-form-container" style={{ marginBottom:20 }}>

            {/* Step Indicator */}
            <div className="qt-step-bar">
              {STEPS.map((s,i) => {
                const done   = step > s.n;
                const active = step === s.n;
                return (
                  <React.Fragment key={s.n}>
                    <div className={`qt-step${active?' qt-step--active':''}${done?' qt-step--done':''}`}>
                      <div className="qt-step__circle">
                        {done ? <Check size={14} color="#fff"/> : <s.Icon size={13} color={active?'#fff':'#b0b0c8'}/>}
                      </div>
                      <div className="qt-step__label">{s.label}</div>
                    </div>
                    {i < STEPS.length-1 && <div className={`qt-step__connector${done?' qt-step__connector--done':''}`}/>}
                  </React.Fragment>
                );
              })}
            </div>

            {/* ─── STEP 1 ─── */}
            {step === 1 && (
              <div className="qt-step-body">
                <div className="qt-form-grid">

                  {/* Customer */}
                  <div className="qt-field-full">
                    <label className="qt-label">
                      Customer <span className="qt-label--req">*</span>
                      {revisionNo > 1 && (
                        <span style={{ marginLeft:6, fontFamily:'Nunito,sans-serif', fontSize:11, fontWeight:700, color:'#d97706' }}>
                          · locked for revision
                        </span>
                      )}
                    </label>
                    {revisionNo > 1 ? (
                      /* Read-only display when revising */
                      <div style={{
                        display:'flex', alignItems:'center', gap:8,
                        padding:'9px 12px', borderRadius:10,
                        background:'rgba(217,119,6,0.04)',
                        border:'1.5px solid rgba(217,119,6,0.25)',
                        cursor:'not-allowed',
                      }}>
                        <User size={14} color="#d97706" style={{ flexShrink:0 }}/>
                        <span style={{ fontFamily:'Nunito,sans-serif', fontSize:13, fontWeight:700, color:'#d97706', flex:1 }}>
                          {selectedCustomer?.customerName || '—'}
                        </span>
                        <span style={{ fontSize:11, color:'#d97706', flexShrink:0 }}>🔒</span>
                      </div>
                    ) : (
                      <CustomerCombo
                        value={selectedCustomer?.customerID ?? null}
                        onChange={(c) => { setSelectedCustomer(c); setStep1Error(''); }}
                        customers={customers}
                      />
                    )}
                    {selectedCustomer && (
                      <div className="qt-customer-info">
                        <strong>{selectedCustomer.customerName}</strong>
                        {selectedCustomer.addressLine1 && <span> · {selectedCustomer.addressLine1}</span>}
                        {selectedCustomer.city && <span>, {[selectedCustomer.city,selectedCustomer.district].filter(Boolean).join(', ')}</span>}
                        {selectedCustomer.phone1 && <span> · 📞 {selectedCustomer.phone1}</span>}
                        {selectedCustomer.gstNumber && <span> · GST: {selectedCustomer.gstNumber}</span>}
                      </div>
                    )}
                  </div>

                  {/* Quotation Type */}
                  <div className="qt-field-full">
                    <label className="qt-label">Quotation Type <span className="qt-label--req">*</span></label>
                    <div className="qt-type-grid">
                      {[
                        { val:false, label:'Standard Quotation',  sub:'SR, Location, Size, Period, Rate, Amount' },
                        { val:true,  label:'With Printing Cost',   sub:'Includes Printing Cost column + Flex Banner rows' },
                      ].map(({ val,label,sub }) => (
                        <button key={String(val)} onClick={() => setWithPrinting(val)}
                          className={`qt-type-card${withPrinting===val?' qt-type-card--active':''}`}>
                          <div className="qt-type-card__check">{withPrinting===val && <Check size={11} color="#fff"/>}</div>
                          <div className="qt-type-card__label">{label}</div>
                          <div className="qt-type-card__sub">{sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quotation No + Date */}
                  <div>
                    <label className="qt-label">
                      Quotation No.
                      {revisionNo > 1 && (
                        <span style={{ marginLeft:6, fontFamily:'Nunito,sans-serif', fontSize:11, fontWeight:700, color:'#d97706' }}>
                          · locked for revision
                        </span>
                      )}
                    </label>
                    <div className="qt-input-wrap" style={revisionNo > 1 ? { background:'rgba(217,119,6,0.04)', borderBottomColor:'#d97706', cursor:'not-allowed' } : {}}>
                      <Hash size={14} color={revisionNo > 1 ? '#d97706' : '#c0c0d8'} style={{ flexShrink:0 }}/>
                      <input
                        className="qt-input"
                        value={quotNo}
                        onChange={e => setQuotNo(e.target.value)}
                        placeholder="e.g. QT1/25-26"
                        readOnly={revisionNo > 1}
                        style={revisionNo > 1 ? { color:'#d97706', fontWeight:800, cursor:'not-allowed', pointerEvents:'none' } : {}}
                      />
                      {revisionNo > 1 && (
                        <span title="Quotation number is fixed for revisions" style={{ fontSize:11, color:'#d97706', flexShrink:0 }}>🔒</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="qt-label">Date</label>
                    <div className="qt-input-wrap">
                      <Calendar size={14} color="#c0c0d8" style={{ flexShrink:0 }}/>
                      <input className="qt-input" type="date" value={quotDate} onChange={e => setQuotDate(e.target.value)}/>
                    </div>
                  </div>

                  {/* Revision No */}
                  <div>
                    <label className="qt-label">
                      Revision No. <span className="qt-label--opt">(1 = original)</span>
                    </label>
                    <div className="qt-input-wrap" style={{ background:'rgba(4,158,223,0.03)',borderBottomColor: revisionNo > 1 ? '#d97706' : '#049edf', cursor:'default' }}>
                      <Edit2 size={14} color={revisionNo > 1 ? '#d97706' : '#c0c0d8'} style={{ flexShrink:0 }}/>
                      <input className="qt-input" type="number" value={revisionNo} readOnly
                        style={{ color: revisionNo > 1 ? '#d97706' : '#1a1a2e', fontWeight:900, cursor:'default', pointerEvents:'none' }}/>
                      <span style={{ fontFamily:'Nunito,sans-serif',fontSize:11,fontWeight:700,color: revisionNo > 1 ? '#d97706' : '#16a34a',flexShrink:0,whiteSpace:'nowrap' }}>
                        {revisionNo <= 1 ? 'Original' : `Revision ${revisionNo}`}
                      </span>
                    </div>
                  </div>

                  {/* Global Period Dates */}
                  <div className="qt-field-full">
                    <label className="qt-label">
                      Global Period Dates <span className="qt-label--req">*</span>
                      <span className="qt-label--opt"> — applied to all hoardings; editable per row in step 2</span>
                    </label>
                    <div className="qt-date-banner">
                      <span className="qt-date-banner__label"><Calendar size={13} style={{ marginRight:4,verticalAlign:'middle' }}/>Period:</span>
                      <div className="qt-date-banner__field">
                        <span className="qt-date-banner__sep">From</span>
                        <input type="date" className="qt-date-banner__input" value={globalStart} onChange={e => setGlobalStart(e.target.value)}/>
                        <span className="qt-date-banner__sep">To</span>
                        <input type="date" className="qt-date-banner__input" value={globalEnd} onChange={e => setGlobalEnd(e.target.value)}/>
                      </div>
                    </div>
                  </div>

                </div>

                {step1Error && (
                  <div className="qt-error-banner">
                    <AlertCircle size={14}/> {step1Error}
                  </div>
                )}

                <div className="qt-step-foot">
                  <button className="pg-btn-cancel" onClick={handleBackToList} style={{ display:'flex',alignItems:'center',gap:6 }}>
                    <LayoutGrid size={13}/> Back to List
                  </button>
                  <button className="pg-btn-save" onClick={goNext}>
                    Next: Add Hoardings <ArrowRight size={14}/>
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 2 ─── */}
            {step === 2 && (
              <div className="qt-step-body">
                {(globalStart || globalEnd) && (
                  <div className="qt-date-banner" style={{ marginBottom:14 }}>
                    <span className="qt-date-banner__label"><Calendar size={13} style={{ marginRight:4,verticalAlign:'middle' }}/>Global Period:</span>
                    <span style={{ fontFamily:'Nunito,sans-serif',fontSize:12,fontWeight:700,color:'#1a1a2e' }}>
                      {globalStart ? fmtDateDisplay(globalStart) : '—'} → {globalEnd ? fmtDateDisplay(globalEnd) : 'Auto'}
                    </span>
                    <button className="qt-date-banner__apply" onClick={applyGlobalDates}>
                      <RefreshCw size={12}/> Apply to All
                    </button>
                  </div>
                )}

                {/* Site colour legend */}
                {rows.length > 0 && (() => {
                  const siteIds = [...new Set(rows.map(r => r.siteID).filter(sid => sid != null))];
                  if (siteIds.length === 0) return null;
                  return (
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, flexWrap:'wrap', padding:'8px 12px', background:'#f8f8fd', borderRadius:10, border:'1px solid #f0f0f8' }}>
                      <span style={{ fontFamily:'Nunito,sans-serif', fontSize:11.5, fontWeight:700, color:'#5a5a78' }}>Sites:</span>
                      {siteIds.map(sid => {
                        const color = siteColorMap.get(sid);
                        const h = hoardings.find(hh => (hh.siteID ?? hh.site?.siteID) === sid);
                        const label = h?.site?.addressLine1 || h?.site?.city || `Site ${sid}`;
                        return color ? (
                          <div key={sid} style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:color.bg, border:`1px solid ${color.border}` }}>
                            <div style={{ width:8, height:8, borderRadius:'50%', background:color.dot }}/>
                            <span style={{ fontFamily:'Nunito,sans-serif', fontSize:11, fontWeight:700, color:'#1a1a2e', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
                          </div>
                        ) : null;
                      })}
                      {mergedCount > 0 && (
                        <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.25)' }}>
                          <Link2 size={10} color="#7c3aed"/>
                          <span style={{ fontFamily:'Nunito,sans-serif', fontSize:11, fontWeight:700, color:'#7c3aed' }}>{mergedCount} Merged</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="qt-step2-head">
                  <div>
                    <div className="qt-step2-title">Hoarding Items</div>
                    <div className="qt-step2-sub">
                      {rows.length} row{rows.length!==1?'s':''} · {Math.max(1,Math.ceil(rows.length/ROWS_PER_PRINT_PAGE))} page{Math.max(1,Math.ceil(rows.length/ROWS_PER_PRINT_PAGE))!==1?'s':''} in PDF
                    </div>
                  </div>
                  <div style={{ display:'flex',gap:8 }}>
                    {/* Merge button */}
                    <button
                      className="pg-btn-cancel"
                      onClick={() => setShowMergeModal(true)}
                      style={{ display:'flex',alignItems:'center',gap:6, borderColor:'rgba(124,58,237,0.35)', color:'#7c3aed', background:'rgba(124,58,237,0.05)' }}
                      title="Merge two hoardings into one large display"
                    >
                      <Link2 size={13}/> Merge
                    </button>
                    <button className="pg-btn-cancel" onClick={() => setShowManualModal(true)} style={{ display:'flex',alignItems:'center',gap:6 }}>
                      <Building2 size={13}/> Add Manual
                    </button>
                    <button className="pg-btn-save" onClick={() => setShowHoardModal(true)} style={{ display:'flex',alignItems:'center',gap:6 }}>
                      <Plus size={13}/> Add Hoardings
                    </button>
                  </div>
                </div>

                <div style={{ overflowX:'auto', border:'1px solid #f0f0f8', borderRadius:12, marginBottom:12 }}>
                  {rows.length === 0 ? (
                    <div className="pg-empty__inner" style={{ padding:'44px 20px' }}>
                      <Building2 size={38} color="#d0d0e8"/>
                      <span className="pg-empty__label">No hoardings added yet</span>
                    </div>
                  ) : (
                    <table className="pg-table" ref={step2TableRef}>
                      <thead>
                        <tr>
                          <th className="pg-th" style={{ width:40 }}>#</th>
                          <th className="pg-th" style={{ textAlign:'left' }}>Site Address / Product</th>
                          <th className="pg-th">Size</th>
                          {!withPrinting && <>
                            <th className="pg-th" style={{ minWidth:64 }}>Sq.Ft</th>
                            <th className="pg-th" style={{ minWidth:56 }}>NOS</th>
                            <th className="pg-th" style={{ minWidth:148 }}>Start Date</th>
                            <th className="pg-th" style={{ minWidth:148 }}>End Date</th>
                          </>}
                          {withPrinting && <th className="pg-th">NOS / Qty</th>}
                          <th className="pg-th">Rate/Mo</th>
                          {withPrinting && <th className="pg-th" style={{ color:'#7c3aed' }}>Print Cost</th>}
                          <th className="pg-th">Amount</th>
                          <th className="pg-th" style={{ width:46 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => {
                          const siteColor = getRowSiteColor(row);
                          const isMerged  = row.rowType === 'merged';
                          const isPrint   = row.rowType === 'printing';

                          const rowBg = isMerged  ? 'rgba(124,58,237,0.05)'
                                      : isPrint   ? 'rgba(124,58,237,0.03)'
                                      : siteColor ? siteColor.bg
                                      : '';
                          const rowBorderLeft = isMerged  ? '4px solid rgba(124,58,237,0.40)'
                                              : siteColor ? `4px solid ${siteColor.border}`
                                              : '4px solid transparent';

                          return (
                            <tr key={row._id} className="pg-tr" style={{ background: rowBg, borderLeft: rowBorderLeft }}>
                              <td className="pg-td" style={{ textAlign:'center' }}>
                                {isMerged ? (
                                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                                    <Link2 size={12} color="#7c3aed"/>
                                    <span style={{ fontFamily:'Nunito,sans-serif', fontSize:10, fontWeight:800, color:'#7c3aed' }}>{i+1}</span>
                                  </div>
                                ) : (
                                  <span style={{ fontFamily:'Nunito,sans-serif',fontSize:12,fontWeight:800,color:isPrint?'#7c3aed':'#9090a8' }}>{i+1}</span>
                                )}
                              </td>
                              <td className="pg-td" style={{ minWidth:160 }}>
                                {isMerged && (
                                  <div style={{ marginBottom:3 }}>
                                    <span style={{ fontFamily:'Nunito,sans-serif', fontSize:10.5, fontWeight:800, padding:'2px 7px', borderRadius:4, background:'rgba(124,58,237,0.12)', color:'#7c3aed', border:'1px solid rgba(124,58,237,0.25)' }}>
                                      {row.mergeDirection === 'H' ? '↔ Horizontal Merge' : '↕ Vertical Merge'}
                                    </span>
                                  </div>
                                )}
                                {!isMerged && siteColor && (
                                  <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                                    <div style={{ width:7, height:7, borderRadius:'50%', background:siteColor.dot, flexShrink:0 }}/>
                                    <MapPin size={10} color={siteColor.dot}/>
                                  </div>
                                )}
                                <input className="qt-inline-input" value={row.location} onChange={e => updateRow(row._id,'location',e.target.value)} style={{ width:'100%',fontStyle:isPrint?'italic':'normal' }}/>
                                {/* Secondary address line: landmark · city, district */}
                                {!isMerged && !isPrint && (() => {
                                  const { line2 } = getSiteDisplayLines(row.siteObj, '');
                                  return line2 ? (
                                    <div style={{ fontFamily:'Nunito,sans-serif', fontSize:10.5, color:'#9090a8', marginTop:2, paddingLeft:2, lineHeight:1.3 }}>{line2}</div>
                                  ) : null;
                                })()}
                              </td>
                              <td className="pg-td">
                                <input className="qt-inline-input" value={row.size} onChange={e => updateRow(row._id,'size',e.target.value)} style={{ width:72 }}/>
                              </td>
                              {!withPrinting && <>
                                <td className="pg-td"><input className="qt-inline-input" type="number" value={row.sqFt} onChange={e => updateRow(row._id,'sqFt',e.target.value)} style={{ width:60 }}/></td>
                                <td className="pg-td">
                                  <input className="qt-inline-input" type="number" min="1" value={row.nos} onChange={e => updateRow(row._id,'nos',e.target.value)} style={{ width:50 }}/>
                                </td>
                                <td className="pg-td">
                                  <input className="qt-inline-input qt-date-input" type="date" value={row.startDate} onChange={e => updateRow(row._id,'startDate',e.target.value)}/>
                                </td>
                                <td className="pg-td">
                                  <input className="qt-inline-input qt-date-input" type="date" value={row.endDate} onChange={e => updateRow(row._id,'endDate',e.target.value)}/>
                                </td>
                              </>}
                              {withPrinting && (
                                <td className="pg-td">
                                  <input className="qt-inline-input" type="number"
                                    value={isPrint ? row.sqFt : row.nos}
                                    onChange={e => updateRow(row._id, isPrint?'sqFt':'nos', e.target.value)}
                                    style={{ width:72 }}/>
                                </td>
                              )}
                              <td className="pg-td">
                                <input className="qt-inline-input" type="number" value={row.ratePerMonth} onChange={e => updateRow(row._id,'ratePerMonth',e.target.value)} style={{ width:86 }}/>
                              </td>
                              {withPrinting && (
                                <td className="pg-td">
                                  {isPrint
                                    ? <span style={{ color:'#b0b0c8',fontSize:12,paddingLeft:8 }}>—</span>
                                    : <input className="qt-inline-input" type="number" value={row.printingCost||0}
                                        onChange={e => updateRow(row._id,'printingCost',e.target.value)}
                                        style={{ width:86,color:'#7c3aed',fontWeight:700 }}/>}
                                </td>
                              )}
                              <td className="pg-td">
                                <input className="qt-inline-input" type="number" value={row.amount} onChange={e => updateRow(row._id,'amount',e.target.value)} style={{ width:86,fontWeight:700 }}/>
                              </td>
                              <td className="pg-td">
                                <div className="pg-action-wrap">
                                  <button className="pg-btn-view" onClick={() => deleteRow(row._id)} title="Remove" style={{ color:'#dc2626' }}>
                                    <Trash2 size={13}/>
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

                {withPrinting && (
                  <button onClick={() => setRows(p => [...p, newPrintingRow()])} className="qt-add-print-row">
                    <Plus size={13}/> Add Flex Banner / Printing Row
                  </button>
                )}

                {step2Error && <div className="qt-error-banner"><AlertCircle size={14}/> {step2Error}</div>}

                <div className="qt-step-foot">
                  <div style={{ display:'flex',gap:10 }}>
                    <button className="pg-btn-cancel" onClick={handleBackToList} style={{ display:'flex',alignItems:'center',gap:6 }}>
                      <LayoutGrid size={13}/> Back to List
                    </button>
                    <button className="pg-btn-cancel" onClick={goBack} style={{ display:'flex',alignItems:'center',gap:6 }}>
                      <ArrowLeft size={13}/> Back
                    </button>
                  </div>
                  <button className="pg-btn-save" onClick={goNext}>
                    Next: GST &amp; Generate <ArrowRight size={14}/>
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 3 ─── */}
            {step === 3 && (
              <div className="qt-step-body">
                <div className="qt-step3-grid">

                  {/* Left: GST + Terms */}
                  <div>
                    <div className="qt-section-head">GST Configuration</div>
                    <div className="qt-gst-row">
                      <div>
                        <label className="qt-label">CGST %</label>
                        <div className="qt-input-wrap">
                          <Settings size={14} color="#c0c0d8" style={{ flexShrink:0 }}/>
                          <input className="qt-input" type="number" min="0" max="28" value={cgstPct} onChange={e => setCgstPct(e.target.value)}/>
                        </div>
                      </div>
                      <div>
                        <label className="qt-label">SGST %</label>
                        <div className="qt-input-wrap">
                          <Settings size={14} color="#c0c0d8" style={{ flexShrink:0 }}/>
                          <input className="qt-input" type="number" min="0" max="28" value={sgstPct} onChange={e => setSgstPct(e.target.value)}/>
                        </div>
                      </div>
                    </div>

                    <div className="qt-terms-head">
                      <div className="qt-section-head" style={{ margin:0 }}>
                        Terms &amp; Conditions <span className="qt-label--opt">(max 3)</span>
                      </div>
                      <button className="pg-btn-cancel" onClick={() => setShowTermsModal(true)} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12 }}>
                        <List size={12}/> Choose
                      </button>
                    </div>
                    {selectedTerms.length === 0
                      ? <div style={{ fontFamily:'Nunito,sans-serif',fontSize:12.5,color:'#9090a8',fontStyle:'italic' }}>None selected (optional)</div>
                      : selectedTerms.map((termID,i) => {
                        const t = termsList.find(t => t.termID===termID);
                        return (
                          <div key={termID} className="qt-term-chip">
                            <span className="qt-term-chip__num">{i+1}.</span>
                            <span>{t?.description||'—'}</span>
                          </div>
                        );
                      })}

                    {/* Merged hoardings summary in step 3 */}
                    {mergedCount > 0 && (
                      <div style={{ marginTop:16, padding:'10px 14px', borderRadius:11, background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.18)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
                          <Link2 size={13} color="#7c3aed"/>
                          <span style={{ fontFamily:'Nunito,sans-serif', fontSize:12.5, fontWeight:800, color:'#7c3aed' }}>
                            {mergedCount} Merged Hoarding{mergedCount!==1?'s':''} in this Quotation
                          </span>
                        </div>
                        {rows.filter(r => r.rowType === 'merged').map(r => (
                          <div key={r._id} style={{ fontFamily:'Nunito,sans-serif', fontSize:11.5, color:'#5a5a78', marginBottom:3 }}>
                            {r.mergeDirection === 'H' ? '↔' : '↕'} {r.location} · <strong>{r.size}</strong> · {r.sqFt} sq.ft
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Summary */}
                  <div>
                    <div className="qt-section-head">Summary</div>
                    <div className="qt-summary-box">
                      <div className="qt-summary-customer">
                        <span>Customer</span>
                        <span>{selectedCustomer?.customerName||'—'}</span>
                      </div>
                      {[
                        { label:'Sub Total',         val:subTotal  },
                        { label:`CGST ${cgstPct}%`,  val:cgstAmt   },
                        { label:`SGST ${sgstPct}%`,  val:sgstAmt   },
                        { label:'Round Off',          val:roundOff  },
                      ].map(({ label,val }) => (
                        <div key={label} className="qt-summary-row">
                          <span>{label}</span><span>₹ {fmtCurrency(val)}</span>
                        </div>
                      ))}
                      <div className="qt-summary-total">
                        <span>Grand Total</span>
                        <span>₹ {fmtCurrency(finalTotal)}</span>
                      </div>
                      <div className="qt-summary-words">{numberToWords(Math.round(finalTotal))}</div>
                    </div>
                  </div>
                </div>

                <div className="qt-step-foot">
                  <div style={{ display:'flex',gap:10 }}>
                    <button className="pg-btn-cancel" onClick={handleBackToList} style={{ display:'flex',alignItems:'center',gap:6 }}>
                      <LayoutGrid size={13}/> Back to List
                    </button>
                    <button className="pg-btn-cancel" onClick={goBack} style={{ display:'flex',alignItems:'center',gap:6 }}>
                      <ArrowLeft size={13}/> Back
                    </button>
                  </div>
                  <button className="pg-btn-save" onClick={generatePDF} disabled={rows.length===0||saving} style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 24px',fontSize:14 }}>
                    <Printer size={15}/> Generate &amp; Print PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════
            PREVIOUS REVISIONS PANEL
        ══════════════════════════════ */}
        {isCreating && quotNo && (() => {
          const prevRevisions = quotations
            .filter(q => (q.quotationNumber||'').trim() === (quotNo||'').trim())
            .sort((a,b) => Number(b.quotationRevisionNumber||0) - Number(a.quotationRevisionNumber||0));
          if (prevRevisions.length === 0) return null;
          return (
            <div className="pg-container" style={{ marginBottom:20 }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid #f0f0f8' }}>
                <div>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <div style={{ width:28,height:28,borderRadius:8,background:'rgba(217,119,6,0.10)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <RefreshCw size={14} color="#d97706"/>
                    </div>
                    <span style={{ fontFamily:'Nunito,sans-serif',fontSize:14,fontWeight:900,color:'#1a1a2e' }}>
                      Previous Revisions — {quotNo}
                    </span>
                  </div>
                  <div style={{ fontFamily:'Nunito,sans-serif',fontSize:12,color:'#9090a8',fontWeight:600,marginTop:4,paddingLeft:36 }}>
                    {prevRevisions.length} revision{prevRevisions.length!==1?'s':''} saved · You are creating Rev. {revisionNo}
                  </div>
                </div>
              </div>
              <table className="pg-table">
                <thead>
                  <tr>
                    <th className="pg-th" style={{ width:'14%' }}>Version</th>
                    <th className="pg-th" style={{ width:'14%' }}>Date</th>
                    <th className="pg-th" style={{ width:'22%' }}>Customer</th>
                    <th className="pg-th" style={{ width:'18%' }}>Grand Total</th>
                    <th className="pg-th" style={{ width:'16%',textAlign:'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {prevRevisions.map(rev => (
                    <tr key={`prev-${rev.quotationID}-${rev.quotationRevisionNumber}`} className="pg-tr">
                      <td className="pg-td">
                        {Number(rev.quotationRevisionNumber) > 1
                          ? <span className="qt-rev-badge"><RefreshCw size={9}/> Rev. {rev.quotationRevisionNumber}</span>
                          : <span className="qt-orig-badge">Original</span>}
                      </td>
                      <td className="pg-td">
                        <span style={{ color:'#4a5568',fontFamily:'Nunito,sans-serif',fontSize:12.5,fontWeight:600 }}>
                          {fmtDateDisplay(rev.quotationDate)}
                        </span>
                      </td>
                      <td className="pg-td pg-td--overflow">
                        <span className="pg-td__ellipsis">{custName(rev.customerID)}</span>
                      </td>
                      <td className="pg-td">
                        <span style={{ fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:13,color:'#049edf' }}>
                          ₹ {fmtCurrency(rev.totalAmount)}
                        </span>
                      </td>
                      <td className="pg-td" style={{ textAlign:'center' }}>
                        <button onClick={() => handleViewPDF(rev)}
                          style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'5px 13px',borderRadius:8,border:'1.5px solid #049edf',color:'#049edf',background:'rgba(4,158,223,0.06)',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontSize:12,fontWeight:800 }}>
                          <Printer size={12}/> View PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* ══════════════════════════════
            QUOTATION HISTORY
        ══════════════════════════════ */}
        {!isCreating && <div className="pg-container">

          {/* Toolbar */}
          <div style={{ display:'flex',alignItems:'center',gap:12,padding:'16px 20px',borderBottom:'1px solid #f0f0f8',flexWrap:'wrap' }}>
            <div style={{ display:'flex',alignItems:'center',gap:7,flexShrink:0 }}>
              <div style={{ width:32,height:32,borderRadius:9,background:'rgba(4,158,223,0.10)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <FileText size={15} color="#049edf"/>
              </div>
              <div>
                <div style={{ fontFamily:'Nunito,sans-serif',fontSize:16,fontWeight:900,color:'#1a1a2e',lineHeight:1 }}>{sortedGroups.length}</div>
                <div style={{ fontFamily:'Nunito,sans-serif',fontSize:11,fontWeight:600,color:'#9090a8',lineHeight:1,marginTop:2 }}>Quotation{sortedGroups.length!==1?'s':''}</div>
              </div>
            </div>
            <div style={{ flex:1,minWidth:220,display:'flex',alignItems:'center',gap:9,padding:'9px 14px',background:'#f4f4fb',borderRadius:10,border:'1.5px solid #ececf8' }}>
              <Search size={14} color="#9090a8" style={{ flexShrink:0 }}/>
              <input
                style={{ flex:1,border:'none',background:'transparent',outline:'none',fontFamily:'Nunito,sans-serif',fontSize:13,fontWeight:600,color:'#1a1a2e' }}
                placeholder="Search by quotation no. or customer…"
                value={histSearch}
                onChange={e => { setHistSearch(e.target.value); setHistPage(1); }}
              />
              {histSearch && <X size={13} style={{ cursor:'pointer',color:'#9090a8',flexShrink:0 }} onClick={() => setHistSearch('')}/>}
            </div>
            <button onClick={refreshQuotations}
              style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid #e8e8f4',background:'#fff',color:'#5a5a78',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontSize:12.5,fontWeight:700,flexShrink:0 }}>
              <RefreshCw size={13}/> Refresh
            </button>
            {/* <button onClick={handleStartNew}
              style={{ display:'flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:9,border:'none',background:'#049edf',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontSize:13,fontWeight:800,flexShrink:0,boxShadow:'0 2px 8px rgba(4,158,223,0.25)' }}>
              <Plus size={14}/> New Quotation
            </button> */}
          </div>

          <table className="pg-table">
            <thead>
              <tr>
                <th style={{ width:44 }} className="pg-th"></th>
                {HIST_COLS.map(col => (
                  <th key={col.key} style={{ width:col.w }}
                    className={['pg-th',col.noSort?'':'pg-th--sort'].filter(Boolean).join(' ')}
                    onClick={() => !col.noSort && handleHistSort(col.key)}
                  >
                    <div className="pg-th__inner">
                      {col.label}
                      {!col.noSort
                        ? <SortIcon col={col.key} sortKey={histSortKey} sortDir={histSortDir}/>
                        : <Filter size={10} color="#d0d0e4" style={{ marginLeft:5 }}/>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {histPaginated.length === 0 ? (
                <tr>
                  <td colSpan={HIST_COLS.length + 1} className="pg-td pg-empty" style={{ maxWidth:'none' }}>
                    <div className="pg-empty__inner">
                      <FileText size={36} color="#d0d0e8"/>
                      <span className="pg-empty__label">No quotations found</span>
                    </div>
                  </td>
                </tr>
              ) : histPaginated.map(group => {
                const latest   = group[0];
                const groupKey = (latest.quotationNumber||'').trim() || String(latest.quotationID);
                const isExp    = expandedGroups.has(groupKey);
                const hasRevs  = group.length > 1;

                return (
                  <React.Fragment key={groupKey}>
                    <tr className="pg-tr qt-group-row">
                      <td className="pg-td" style={{ textAlign:'center' }}>
                        {hasRevs ? (
                          <button className="qt-expand-btn" onClick={() => toggleGroup(groupKey)}
                            title={isExp ? 'Hide revisions' : `Show ${group.length - 1} older revision${group.length-1!==1?'s':''}`}>
                            {isExp ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                          </button>
                        ) : <span style={{ width:28,display:'inline-block' }}/>}
                      </td>
                      <td className="pg-td">
                        <div className="pg-td__primary">{latest.quotationNumber}</div>
                        {hasRevs && (
                          <div style={{ fontFamily:'Nunito,sans-serif',fontSize:11,color:'#9090a8',fontWeight:600,marginTop:2 }}>
                            {group.length - 1} older revision{group.length-1!==1?'s':''}
                          </div>
                        )}
                      </td>
                      <td className="pg-td pg-td--overflow">
                        <span className="pg-td__ellipsis" title={custName(latest.customerID)}>{custName(latest.customerID)}</span>
                      </td>
                      <td className="pg-td">
                        <span style={{ color:'#4a5568' }}>{fmtDateDisplay(latest.quotationDate)}</span>
                      </td>
                      <td className="pg-td" style={{ textAlign:'center' }}>
                        {Number(latest.quotationRevisionNumber)>1
                          ? <span className="qt-rev-badge"><RefreshCw size={9}/>Rev. {latest.quotationRevisionNumber}</span>
                          : <span className="qt-orig-badge">Original</span>}
                      </td>
                      <td className="pg-td">
                        <span style={{ fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:13,color:'#049edf' }}>₹ {fmtCurrency(latest.totalAmount)}</span>
                      </td>
                      <td className="pg-td">
                        <div style={{ display:'flex',gap:7,alignItems:'center' }}>
                          <button onClick={() => handleViewPDF(latest)} title="View / Print PDF"
                            style={{ display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:8,border:'1.5px solid #049edf',color:'#049edf',background:'rgba(4,158,223,0.06)',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontSize:12,fontWeight:800,whiteSpace:'nowrap' }}>
                            <Printer size={13}/> PDF
                          </button>
                          <button onClick={() => handleReopenHistory(latest)} title="Create Revision"
                            style={{ display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:8,border:'none',color:'#fff',background:'#7c3aed',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontSize:12,fontWeight:800,whiteSpace:'nowrap' }}>
                            <Edit2 size={13}/> Revise
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExp && group.slice(1).map((rev) => (
                      <tr key={`${rev.quotationID}-${rev.quotationRevisionNumber}`} className="pg-tr qt-rev-row">
                        <td className="pg-td"></td>
                        <td className="pg-td">
                          <div style={{ display:'flex',alignItems:'center',gap:8,paddingLeft:12 }}>
                            <div className="qt-rev-tree-line"/>
                            {Number(rev.quotationRevisionNumber) > 1
                              ? <span className="qt-rev-badge" style={{ fontSize:11 }}><RefreshCw size={9}/>Rev. {rev.quotationRevisionNumber}</span>
                              : <span className="qt-orig-badge">Original</span>}
                          </div>
                        </td>
                        <td className="pg-td pg-td--overflow">
                          <span className="pg-td__ellipsis" style={{ color:'#9090a8' }}>{custName(rev.customerID)}</span>
                        </td>
                        <td className="pg-td">
                          <span style={{ color:'#b0b0c8',fontSize:12 }}>{fmtDateDisplay(rev.quotationDate)}</span>
                        </td>
                        <td className="pg-td" style={{ textAlign:'center' }}>
                          {Number(rev.quotationRevisionNumber)>1
                            ? <span className="qt-rev-badge"><RefreshCw size={9}/>Rev. {rev.quotationRevisionNumber}</span>
                            : <span className="qt-orig-badge">Original</span>}
                        </td>
                        <td className="pg-td">
                          <span style={{ fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:12.5,color:'#9090a8' }}>₹ {fmtCurrency(rev.totalAmount)}</span>
                        </td>
                        <td className="pg-td">
                          <div style={{ display:'flex',gap:7 }}>
                            <button onClick={() => handleViewPDF(rev)} title="View PDF"
                              style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 11px',borderRadius:8,border:'1.5px solid #049edf',color:'#049edf',background:'rgba(4,158,223,0.06)',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontSize:11.5,fontWeight:800,whiteSpace:'nowrap' }}>
                              <Printer size={12}/> PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {sortedGroups.length > histPageSize && (
            <div className="pg-pagination">
              <div className="pg-pagination__left">
                <button className="pg-pg-btn" disabled={histPage===1} onClick={()=>setHistPage(1)}><ChevronsLeft size={13}/></button>
                <button className="pg-pg-btn" disabled={histPage===1} onClick={()=>setHistPage(p=>p-1)}><ChevronLeft size={13}/></button>
                {histPageNums.map((p,i) => p==='…'
                  ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span>
                  : <button key={p} className={`pg-pg-btn${histPage===p?' pg-pg-btn--active':''}`} onClick={()=>setHistPage(p)}>{p}</button>
                )}
                <button className="pg-pg-btn" disabled={histPage===histTotalPages} onClick={()=>setHistPage(p=>p+1)}><ChevronRight size={13}/></button>
                <button className="pg-pg-btn" disabled={histPage===histTotalPages} onClick={()=>setHistPage(histTotalPages)}><ChevronsRight size={13}/></button>
              </div>
              <div className="pg-pagination__right">
                <select className="pg-pagesize-select" value={histPageSize} onChange={e => { setHistPageSize(Number(e.target.value)); setHistPage(1); }}>
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="pg-pagination__text">Items per page</span>
                <span className="pg-pagination__text">{histPage} of {histTotalPages} pages ({sortedGroups.length} items)</span>
              </div>
            </div>
          )}

        </div>}
      </div>

      {/* ── Modals ── */}
      {showHoardModal && (
        <HoardingSelectModal
          hoardings={hoardings}
          existingIds={existingHoardingIds}
          onAdd={handleAddSelected}
          onClose={() => setShowHoardModal(false)}
          siteColorMap={siteColorMap}
        />
      )}
      {showManualModal && (
        <ManualHoardingModal
          hoardings={hoardings}
          onAdd={handleAddManual}
          onClose={() => setShowManualModal(false)}
          siteColorMap={siteColorMap}
        />
      )}
      {showTermsModal && (
        <TermsModal
          selected={selectedTerms}
          onSelect={toggleTerm}
          termsList={termsList}
          onClose={() => setShowTermsModal(false)}
        />
      )}
      {showMergeModal && (
        <MergeModal
          rows={rows}
          onMerge={handleMerge}
          onClose={() => setShowMergeModal(false)}
          siteColorMap={siteColorMap}
        />
      )}
    </>
  );
}