import React, {
  useState, useEffect, useCallback, useMemo,
  useRef, useLayoutEffect
} from 'react';
import ReactDOM from 'react-dom';
import {
  ArrowLeft, Download, RefreshCw, Calendar, User, X,
  AlertCircle, CheckCircle2, Loader2, BookOpen, Building2,
  Search, ChevronDown, Check
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiService } from '../api/api';
import './Common1.css';

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return d;
  }
};

const fmtCurrency = (n) => {
  if (n === null || n === undefined || n === '' || isNaN(n)) return '—';
  return '₹ ' + Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
};

const fmtCurrencyPdf = (n) => {
  if (n === null || n === undefined || n === '' || isNaN(n)) return '—';
  return 'Rs. ' + Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
};

function normalizeList(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.$values)) return res.$values;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (typeof res === 'object') {
    const raw = res.data ?? res;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return [raw];
    }
  }
  return [];
}

function normalizeJobRequest(raw) {
  return {
    jobRequestID: raw.jobRequestID ?? raw.JobRequestID ?? 0,
    customerID: raw.customerID ?? raw.CustomerID ?? 0,
    jobType: raw.jobType ?? raw.JobType ?? '',
    jobDescription: raw.jobDescription ?? raw.JobDescription ?? '',
    supervisorID: Number(raw.iD ?? raw.ID ?? raw.id ?? raw.supervisorID ?? raw.SupervisorID ?? 0),
    totalAreaSQFT: Number(raw.totalAreaSQFT ?? raw.TotalAreaSQFT ?? 0),
    rateperSQFT: Number(raw.rateperSQFT ?? raw.RateperSQFT ?? 0),
    targetCompletionDate: (raw.targetCompletionDate ?? raw.TargetCompletionDate ?? '').split('T')[0],
    jobStatus: raw.jobStatus ?? raw.JobStatus ?? '',
  };
}

function normalizeUser(raw) {
  const id = Number(raw.id ?? raw.Id ?? raw.ID ?? raw.userID ?? raw.UserID ?? raw.userId ?? 0);
  const firstName = raw.first_Name ?? raw.firstName ?? raw.FirstName ?? '';
  const lastName = raw.last_Name ?? raw.lastName ?? raw.LastName ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return {
    id,
    name: fullName || raw.name || raw.Name || raw.email || `User #${id}`,
    role: String(raw.role ?? raw.Role ?? '').trim(),
  };
}

function normalizeCustomer(raw) {
  return {
    customerID: raw.customerID ?? raw.CustomerID ?? 0,
    customerName: raw.customerName ?? raw.CustomerName ?? '',
    city: raw.city ?? raw.City ?? '',
  };
}

function normalizeCompany(raw) {
  return {
    companyID: raw.company_ID ?? raw.companyID ?? raw.CompanyID ?? 0,
    companyName: raw.company_Name ?? raw.companyName ?? raw.CompanyName ?? '',
    addressLine1: raw.address_Line1 ?? raw.addressLine1 ?? raw.AddressLine1 ?? '',
    addressLine2: raw.address_Line2 ?? raw.addressLine2 ?? raw.AddressLine2 ?? '',
    city: raw.city ?? raw.City ?? '',
    state: raw.state ?? raw.State ?? '',
    country: raw.country ?? raw.Country ?? 'India',
    pincode: raw.pincode ?? raw.Pincode ?? '',
    contactPerson: raw.contact_Person ?? raw.contactPerson ?? raw.ContactPerson ?? '',
    mobileNo: raw.mobile_No ?? raw.mobileNo ?? raw.MobileNo ?? '',
    email: raw.email ?? raw.Email ?? '',
    website: raw.website ?? raw.Website ?? '',
    gstin: raw.gstin ?? raw.Gstin ?? raw.GSTIN ?? '',
    panNo: raw.paN_No ?? raw.panNo ?? raw.PanNo ?? raw.PANNo ?? '',
    isActive: raw.is_Active ?? raw.isActive ?? raw.IsActive ?? false,
  };
}

function normalizePayment(raw) {
  return {
    jobPaymentID: raw.jobPaymentID ?? raw.JobPaymentID ?? 0,
    jobRequestID: raw.jobRequestID ?? raw.JobRequestID ?? 0,
    paymentDate: (raw.paymentDate ?? raw.PaymentDate ?? '').split('T')[0],
    calculatedAmount: Number(raw.calculatedAmount ?? raw.CalculatedAmount ?? 0),
    paidAmount: Number(raw.paidAmount ?? raw.PaidAmount ?? 0),
    remainingAmount: Number(raw.remainingAmount ?? raw.RemainingAmount ?? 0),
    paidBY: raw.paidBY ?? raw.PaidBY ?? raw.paidBy ?? raw.PaidBy ?? '',
    extrapayment: raw.extrapayment ?? raw.ExtraPayment ?? raw.extraPayment ?? '',
    isAdvancePayment: !!(raw.isAdvancePayment ?? raw.IsAdvancePayment ?? false),
    advancePaymentAmount: Number(raw.advancePaymentAmount ?? raw.AdvancePaymentAmount ?? 0),
    receiptPhoto: raw.receiptPhoto ?? raw.ReceiptPhoto ?? '',
    comments: raw.comments ?? raw.Comments ?? '',
    isParicialPayment: !!(raw.isParicialPayment ?? raw.IsParicialPayment ?? raw.isPartialPayment ?? raw.IsPartialPayment ?? false),
    lastUpdateDttm: raw.lastUpdateDttm ?? raw.LastUpdateDttm ?? '',
    lastUpdatedBy: raw.lastUpdatedBy ?? raw.LastUpdatedBy ?? 0,
  };
}

/* ═══════════════════════════════════════════
   TOAST COMPONENT
═══════════════════════════════════════════ */
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className={`qt-toast qt-toast--${type}`}>
      {type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {msg}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PORTAL DROPDOWN & SYSTEM COMBO HOOKS
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
        left: r.left,
        width: Math.max(r.width, 220),
        zIndex: 99999,
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
   COMPANY COMBO (SYSTEM DROPDOWN)
═══════════════════════════════════════════ */
function CompanyComboField({ value, onChange, companies }) {
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
    return q ? companies.filter(c => (c.companyName || '').toLowerCase().includes(q)) : companies;
  }, [companies, query]);

  const openDD = () => { setOpen(true); setQuery(''); setTimeout(() => inputRef.current?.focus(), 0); };
  const select = (c) => { onChange(c); setOpen(false); setQuery(''); };
  const clear = (e) => { e.stopPropagation(); onChange(null); setOpen(false); setQuery(''); };

  return (
    <div className="pg-combo-wrap" ref={wrapRef} style={{ minWidth: 200 }}>
      <div
        ref={triggerRef}
        className="pg-field-wrap pg-combo-trigger pg-field-wrap--normal"
        onClick={openDD}
        tabIndex={0}
        style={{
          background: '#f4f4fb',
          border: '1.5px solid #ececf8',
          borderRadius: 9,
          padding: '6px 12px',
          minHeight: 'unset',
          height: 35,
          cursor: 'pointer'
        }}
      >
        <Building2 size={14} color="#049edf" style={{ flexShrink: 0 }} />
        <span className={`pg-combo-display${!selected ? ' pg-combo-display--placeholder' : ''}`} style={{ fontSize: 12.5, fontWeight: 700, color: selected ? '#1a1a2e' : '#9090a8' }}>
          {selected ? selected.companyName : 'Select Company…'}
        </span>
        {selected ? (
          <X size={12} className="pg-combo-clear" onClick={clear} />
        ) : (
          <ChevronDown size={13} color="#9090a8" style={{ flexShrink: 0 }} />
        )}
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position: 'static' }}>
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="pg-combo-search__input"
              placeholder="Search company…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') close(); }}
            />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
          </div>
          <div className="pg-combo-list" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="pg-combo-empty">No companies found</div>
            ) : (
              filtered.map(c => (
                <div
                  key={c.companyID}
                  className={`pg-combo-option${String(c.companyID) === String(value) ? ' pg-combo-option--active' : ''}`}
                  onClick={() => select(c)}
                  tabIndex={0}
                >
                  <div style={{ flex: 1 }}>
                    <span className="pg-combo-option__name">{c.companyName}</span>
                    {c.city && <span className="pg-combo-option__id">{c.city}</span>}
                  </div>
                  {String(c.companyID) === String(value) && (
                    <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SUPERVISOR COMBO (SYSTEM DROPDOWN)
═══════════════════════════════════════════ */
function SupervisorComboField({ value, onChange, supervisors }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);
  useOutsideClick(wrapRef, panelRef, open, close);

  const selected = supervisors.find(s => String(s.id) === String(value));
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q ? supervisors.filter(s => (s.name || '').toLowerCase().includes(q)) : supervisors;
  }, [supervisors, query]);

  const openDD = () => { setOpen(true); setQuery(''); setTimeout(() => inputRef.current?.focus(), 0); };
  const select = (s) => { onChange(s); setOpen(false); setQuery(''); };
  const clear = (e) => { e.stopPropagation(); onChange(null); setOpen(false); setQuery(''); };

  return (
    <div className="pg-combo-wrap" ref={wrapRef} style={{ minWidth: 175 }}>
      <div
        ref={triggerRef}
        className="pg-field-wrap pg-combo-trigger pg-field-wrap--normal"
        onClick={openDD}
        tabIndex={0}
        style={{
          background: '#f4f4fb',
          border: '1.5px solid #ececf8',
          borderRadius: 9,
          padding: '6px 12px',
          minHeight: 'unset',
          height: 35,
          cursor: 'pointer'
        }}
      >
        <User size={14} color="#049edf" style={{ flexShrink: 0 }} />
        <span className={`pg-combo-display${!selected ? ' pg-combo-display--placeholder' : ''}`} style={{ fontSize: 12.5, fontWeight: 700, color: selected ? '#1a1a2e' : '#9090a8' }}>
          {selected ? selected.name : 'All Supervisors'}
        </span>
        {selected ? (
          <X size={12} className="pg-combo-clear" onClick={clear} />
        ) : (
          <ChevronDown size={13} color="#9090a8" style={{ flexShrink: 0 }} />
        )}
      </div>
      <PortalDropdown open={open} triggerRef={triggerRef} panelRef={panelRef}>
        <div className="pg-combo-panel" style={{ position: 'static' }}>
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="pg-combo-search__input"
              placeholder="Search supervisor…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') close(); }}
            />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
          </div>
          <div className="pg-combo-list" ref={listRef}>
            <div
              className={`pg-combo-option${!value ? ' pg-combo-option--active' : ''}`}
              onClick={() => select(null)}
              tabIndex={0}
            >
              <span className="pg-combo-option__name">All Supervisors</span>
              {!value && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
            </div>
            {filtered.map(s => (
              <div
                key={s.id}
                className={`pg-combo-option${String(s.id) === String(value) ? ' pg-combo-option--active' : ''}`}
                onClick={() => select(s)}
                tabIndex={0}
              >
                <div style={{ flex: 1 }}>
                  <span className="pg-combo-option__name">{s.name}</span>
                </div>
                {String(s.id) === String(value) && (
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
   MAIN COMPONENT: JobPaymentLedger
═══════════════════════════════════════════ */
export default function JobPaymentLedger({ changeTab }) {
  /* ── Data state ── */
  const [payments, setPayments] = useState([]);
  const [jobRequests, setJobRequests] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [companies, setCompanies] = useState([]);

  /* ── Filters state ── */
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  /* ── UI state ── */
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState('');
  const [toast, setToast] = useState(null);
  const [exporting, setExporting] = useState(false);

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  /* ── Initial Load ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pRaw, jRaw, cRaw, uRaw, compRaw] = await Promise.all([
          apiService.getFilteredJobPayments().catch(() => []),
          apiService.getAllJobRequests().catch(() => []),
          apiService.getAllCustomers().catch(() => []),
          apiService.getAllUsers().catch(() => []),
          apiService.getAllCompanyDetails().catch(() => []),
        ]);
        setPayments(normalizeList(pRaw).map(normalizePayment));
        setJobRequests(normalizeList(jRaw).map(normalizeJobRequest));
        setCustomers(normalizeList(cRaw).map(normalizeCustomer));
        const allUsers = normalizeList(uRaw).map(normalizeUser);
        setSupervisors(allUsers.filter(u => u.role.toLowerCase() === 'supervisor'));
        
        // Active Companies only
        const allCompanies = normalizeList(compRaw).map(normalizeCompany);
        const activeCompanies = allCompanies.filter(c => c.isActive);
        setCompanies(activeCompanies);
        if (activeCompanies.length > 0) {
          setSelectedCompanyId(String(activeCompanies[0].companyID));
        }
      } catch (err) {
        setApiError(err?.message || 'Failed to load ledger data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Date filter effect (identical to JobPaymentPage) ── */
  useEffect(() => {
    let ignore = false;
    const loadFiltered = async () => {
      try {
        const pRaw = await apiService.getFilteredJobPayments({
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        });
        if (!ignore) {
          setPayments(normalizeList(pRaw).map(normalizePayment));
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load filtered payments for ledger:', err);
        }
      }
    };
    if (!loading) {
      loadFiltered();
    }
    return () => { ignore = true; };
  }, [fromDate, toDate]);

  /* ── Refresh ── */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [pRaw, jRaw, uRaw, compRaw] = await Promise.all([
        apiService.getFilteredJobPayments({ fromDate: fromDate || undefined, toDate: toDate || undefined }),
        apiService.getAllJobRequests().catch(() => []),
        apiService.getAllUsers().catch(() => []),
        apiService.getAllCompanyDetails().catch(() => []),
      ]);
      setPayments(normalizeList(pRaw).map(normalizePayment));
      setJobRequests(normalizeList(jRaw).map(normalizeJobRequest));
      const allUsers = normalizeList(uRaw).map(normalizeUser);
      setSupervisors(allUsers.filter(u => u.role.toLowerCase() === 'supervisor'));
      
      const allCompanies = normalizeList(compRaw).map(normalizeCompany);
      const activeCompanies = allCompanies.filter(c => c.isActive);
      setCompanies(activeCompanies);
      if (activeCompanies.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(String(activeCompanies[0].companyID));
      }

      showToast('Ledger refreshed', 'success');
    } catch {
      showToast('Refresh failed', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [fromDate, toDate, selectedCompanyId, showToast]);

  /* ── Client-side supervisor filter (identical to JobPaymentPage) ── */
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const job = jobRequests.find(j => j.jobRequestID === p.jobRequestID);
      if (selectedSupervisor && String(job?.supervisorID) !== String(selectedSupervisor)) {
        return false;
      }
      return true;
    });
  }, [payments, jobRequests, selectedSupervisor]);

  /* ── Helper Lookups ── */
  const getCustomerName = useCallback((jobReqID) => {
    const job = jobRequests.find(j => j.jobRequestID === jobReqID);
    if (!job) return '';
    return customers.find(c => c.customerID === job.customerID)?.customerName || '';
  }, [jobRequests, customers]);

  const selectedSupervisorName = useMemo(() => {
    if (!selectedSupervisor) return 'All Supervisors';
    const found = supervisors.find(s => String(s.id) === String(selectedSupervisor));
    return found ? found.name : `Supervisor #${selectedSupervisor}`;
  }, [selectedSupervisor, supervisors]);

  const selectedCompany = useMemo(() => {
    if (!companies.length) return null;
    const found = companies.find(c => String(c.companyID) === String(selectedCompanyId));
    return found || companies[0] || null;
  }, [companies, selectedCompanyId]);

  /* ═══════════════════════════════════════════
     STEP 3: COMPUTE DR / CR LEDGER DATA
  ═══════════════════════════════════════════ */
  const ledgerData = useMemo(() => {
    if (!filteredPayments.length) {
      return {
        drRows: [],
        crRows: [],
        totalDrRaw: 0,
        totalCrRaw: 0,
        balancedTotal: 0,
        drBalancing: null,
        crBalancing: null,
        pairedRows: [],
      };
    }

    // ── Dr (Debit) side: 1 row per unique jobRequestID ──
    const uniqueJobIds = Array.from(new Set(filteredPayments.map(p => p.jobRequestID)));
    const drRows = uniqueJobIds.map(jobReqID => {
      const jobPayments = filteredPayments.filter(p => p.jobRequestID === jobReqID);
      const calculatedAmount = Number(jobPayments[0]?.calculatedAmount ?? 0);
      
      // Earliest paymentDate found among that job's records in the filtered set
      const validDates = jobPayments
        .map(p => p.paymentDate)
        .filter(Boolean)
        .sort();
      const earliestDate = validDates[0] || '';
      const custName = getCustomerName(jobReqID);

      return {
        jobRequestID: jobReqID,
        date: earliestDate,
        label: `Job #${jobReqID} Bill`,
        custName: custName,
        amount: calculatedAmount,
        isBalancing: false,
      };
    });

    // ── Cr (Credit) side: 1 row per individual JobPayment record ──
    const crRows = filteredPayments.map(p => {
      const custName = getCustomerName(p.jobRequestID);
      const cleanPaidBy = (p.paidBY && p.paidBY.toLowerCase() !== 'string') ? p.paidBY.trim() : '';
      const cleanComments = (p.comments && p.comments.toLowerCase() !== 'string') ? p.comments.trim() : '';
      const rawExtra = p.extrapayment !== null && p.extrapayment !== undefined ? String(p.extrapayment).trim() : '';
      const cleanExtraPayment = (rawExtra && rawExtra.toLowerCase() !== 'string' && rawExtra !== '0') ? rawExtra : '';

      return {
        jobPaymentID: p.jobPaymentID,
        jobRequestID: p.jobRequestID,
        date: p.paymentDate || '',
        label: `Job #${p.jobRequestID} Payment`,
        custName: custName,
        paidBy: cleanPaidBy,
        comments: cleanComments,
        extraPayment: cleanExtraPayment,
        isAdvancePayment: !!p.isAdvancePayment,
        isPartialPayment: !!p.isParicialPayment,
        amount: Number(p.paidAmount ?? 0),
        isBalancing: false,
      };
    });

    // Totals before balancing
    const totalDrRaw = drRows.reduce((sum, r) => sum + r.amount, 0);
    const totalCrRaw = crRows.reduce((sum, r) => sum + r.amount, 0);

    // Balancing row
    let drBalancing = null;
    let crBalancing = null;

    if (totalDrRaw > totalCrRaw) {
      const diff = totalDrRaw - totalCrRaw;
      crBalancing = {
        label: 'Balance c/d',
        subLabel: '(Difference to balance Cr)',
        date: '',
        amount: diff,
        isBalancing: true,
      };
    } else if (totalCrRaw > totalDrRaw) {
      const diff = totalCrRaw - totalDrRaw;
      drBalancing = {
        label: 'Balance c/d',
        subLabel: '(Difference to balance Dr)',
        date: '',
        amount: diff,
        isBalancing: true,
      };
    }

    const finalDrRows = [...drRows];
    if (drBalancing) finalDrRows.push(drBalancing);

    const finalCrRows = [...crRows];
    if (crBalancing) finalCrRows.push(crBalancing);

    const balancedTotal = Math.max(totalDrRaw, totalCrRaw);

    // Pair rows side by side for ledger presentation
    const maxRows = Math.max(finalDrRows.length, finalCrRows.length);
    const pairedRows = [];
    for (let i = 0; i < maxRows; i++) {
      pairedRows.push({
        dr: finalDrRows[i] || null,
        cr: finalCrRows[i] || null,
      });
    }

    return {
      drRows,
      crRows,
      totalDrRaw,
      totalCrRaw,
      balancedTotal,
      drBalancing,
      crBalancing,
      pairedRows,
      uniqueJobCount: uniqueJobIds.length,
      paymentCount: filteredPayments.length,
    };
  }, [filteredPayments, getCustomerName]);

  /* ═══════════════════════════════════════════
     STEP 4: ACCOUNTING MULTI-PAGE PDF EXPORT (B&W A4)
     - Displays Selected Company Details in Header
     - Maintains runningDrTotal & runningCrTotal row by row
     - Non-final pages end with "Total c/f" (carried forward)
     - Subsequent pages open with "Balance b/f" (brought forward)
     - Final page ends with "Total Dr" / "Total Cr" grand total
  ═══════════════════════════════════════════ */
  const handleExportPDF = useCallback(() => {
    if (!filteredPayments.length) {
      showToast('No ledger data available to export', 'error');
      return;
    }

    setExporting(true);
    try {
      // Standard A4 landscape (841.89 x 595.28 pt)
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 28;
      const contentWidth = pageWidth - (margin * 2);

      const periodText = fromDate || toDate
        ? `${fromDate ? fmtDate(fromDate) : 'Start'} to ${toDate ? fmtDate(toDate) : 'End'}`
        : 'All Dates';

      // ── Company details string construction ──
      const companyName = selectedCompany?.companyName || 'Jalaram Advertising';

      const addressParts = [
        selectedCompany?.addressLine1,
        selectedCompany?.addressLine2,
        [selectedCompany?.city, selectedCompany?.pincode ? `- ${selectedCompany.pincode}` : ''].filter(Boolean).join(' '),
        selectedCompany?.state,
      ].filter(Boolean);
      const addressStr = addressParts.join(', ');

      const contactParts = [];
      if (selectedCompany?.mobileNo) contactParts.push(`Ph: ${selectedCompany.mobileNo}`);
      if (selectedCompany?.email) contactParts.push(`Email: ${selectedCompany.email}`);
      if (selectedCompany?.gstin) contactParts.push(`GSTIN: ${selectedCompany.gstin}`);
      const contactStr = contactParts.join('  |  ');

      // ── Helper: Estimate row height for accurate pagination ──
      const estimateRowHeight = (pair) => {
        let drLines = 1;
        if (pair.dr) {
          let drText = pair.dr.isBalancing ? 'Balance c/d' : pair.dr.label;
          if (pair.dr.custName) drText += `\nCust: ${pair.dr.custName}`;
          drLines = doc.splitTextToSize(drText, 235).length;
        }

        let crLines = 1;
        if (pair.cr) {
          let crText = pair.cr.isBalancing ? 'Balance c/d' : pair.cr.label;
          if (pair.cr.isAdvancePayment) crText += ' [ADVANCE]';
          if (pair.cr.extraPayment) crText += ` [EXTRA PAYMENT: Rs. ${pair.cr.extraPayment}]`;
          if (pair.cr.custName) crText += `\nCust: ${pair.cr.custName}`;
          if (pair.cr.paidBy) crText += `\nPaid by: ${pair.cr.paidBy}`;
          if (pair.cr.comments) crText += `\nNote: ${pair.cr.comments}`;
          crLines = doc.splitTextToSize(crText, 235).length;
        }

        const maxLines = Math.max(drLines, crLines);
        return Math.max(18, maxLines * 10 + 9);
      };

      // ── Group paired ledger rows into pages dynamically ──
      const pages = [];
      let currentPageRows = [];
      let currentHeight = 0;

      for (let i = 0; i < ledgerData.pairedRows.length; i++) {
        const pair = ledgerData.pairedRows[i];
        const rHeight = estimateRowHeight(pair);
        const maxAllowed = pages.length === 0 ? 385 : 440;

        if (currentPageRows.length > 0 && currentHeight + rHeight > maxAllowed) {
          pages.push(currentPageRows);
          currentPageRows = [pair];
          currentHeight = rHeight;
        } else {
          currentPageRows.push(pair);
          currentHeight += rHeight;
        }
      }
      if (currentPageRows.length > 0) {
        pages.push(currentPageRows);
      }

      const totalPages = Math.max(1, pages.length);
      let runningDr = 0;
      let runningCr = 0;

      // ── Render each page ──
      pages.forEach((pageRows, pageIdx) => {
        if (pageIdx > 0) {
          doc.addPage('a4', 'landscape');
        }

        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === totalPages - 1;

        // Draw header and filter metadata on Page 1
        if (isFirstPage) {
          // Document Title (Left)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(15);
          doc.setTextColor(0, 0, 0);
          doc.text('JOB PAYMENT LEDGER', margin, 26);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(100, 100, 100);
          doc.text('Debit / Credit Statement', margin, 37);

          // Company Details (Right Header)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text(companyName, pageWidth - margin, 18, { align: 'right' });

          if (addressStr) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(60, 60, 60);
            doc.text(addressStr, pageWidth - margin, 28, { align: 'right' });
          }

          if (contactStr) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(60, 60, 60);
            doc.text(contactStr, pageWidth - margin, 37, { align: 'right' });
          }

          // Top divider rule
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(1);
          doc.line(margin, 44, pageWidth - margin, 44);

          // Metadata summary box
          doc.setFillColor(252, 252, 252);
          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.6);
          doc.roundedRect(margin, 50, contentWidth, 42, 2, 2, 'FD');

          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);

          doc.text('Date Period:', margin + 12, 64);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          doc.text(periodText, margin + 74, 64);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text('Supervisor:', margin + 240, 64);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          doc.text(selectedSupervisorName, margin + 300, 64);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text('Company:', margin + 440, 64);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          doc.text(companyName, margin + 495, 64);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text('Generated:', margin + 640, 64);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          doc.text(new Date().toLocaleDateString('en-IN'), margin + 695, 64);

          // Line 2: Financial Summary
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text('Total Dr:', margin + 12, 81);
          doc.setFont('helvetica', 'normal');
          doc.text(fmtCurrencyPdf(ledgerData.totalDrRaw), margin + 60, 81);

          doc.setFont('helvetica', 'bold');
          doc.text('Total Cr:', margin + 180, 81);
          doc.setFont('helvetica', 'normal');
          doc.text(fmtCurrencyPdf(ledgerData.totalCrRaw), margin + 226, 81);

          doc.setFont('helvetica', 'bold');
          doc.text('Unique Jobs (Dr):', margin + 340, 81);
          doc.setFont('helvetica', 'normal');
          doc.text(String(ledgerData.uniqueJobCount || 0), margin + 424, 81);

          doc.setFont('helvetica', 'bold');
          doc.text('Total Payments (Cr):', margin + 490, 81);
          doc.setFont('helvetica', 'normal');
          doc.text(String(ledgerData.paymentCount || 0), margin + 594, 81);
        }

        // Build Table Body for this page
        const tableBody = [];

        // If not first page, prepend "Balance b/f" row showing previous running totals
        if (!isFirstPage) {
          tableBody.push([
            '—',
            'Balance b/f (Brought Forward)',
            fmtCurrencyPdf(runningDr),
            '—',
            'Balance b/f (Brought Forward)',
            fmtCurrencyPdf(runningCr),
          ]);
        }

        // Process this page's rows and accumulate running totals
        pageRows.forEach(pair => {
          let drText = '';
          if (pair.dr) {
            if (pair.dr.isBalancing) {
              drText = 'Balance c/d';
            } else {
              drText = pair.dr.label;
              if (pair.dr.custName) drText += `\nCust: ${pair.dr.custName}`;
            }
            runningDr += Number(pair.dr.amount || 0);
          }

          let crText = '';
          if (pair.cr) {
            if (pair.cr.isBalancing) {
              crText = 'Balance c/d';
            } else {
              crText = pair.cr.label;
              if (pair.cr.isAdvancePayment) crText += ' [ADVANCE]';
              if (pair.cr.extraPayment) crText += ` [EXTRA PAYMENT: Rs. ${pair.cr.extraPayment}]`;
              if (pair.cr.custName) crText += `\nCust: ${pair.cr.custName}`;
              if (pair.cr.paidBy) crText += `\nPaid by: ${pair.cr.paidBy}`;
              if (pair.cr.comments) crText += `\nNote: ${pair.cr.comments}`;
            }
            runningCr += Number(pair.cr.amount || 0);
          }

          tableBody.push([
            pair.dr?.date ? fmtDate(pair.dr.date) : (pair.dr?.isBalancing ? '—' : ''),
            drText,
            pair.dr ? fmtCurrencyPdf(pair.dr.amount) : '',
            pair.cr?.date ? fmtDate(pair.cr.date) : (pair.cr?.isBalancing ? '—' : ''),
            crText,
            pair.cr ? fmtCurrencyPdf(pair.cr.amount) : '',
          ]);
        });

        // Determine footer row for this page
        let footRow;
        if (isLastPage) {
          // On the final page, show true grand Total Dr / Total Cr
          footRow = [
            '',
            'Total Dr',
            fmtCurrencyPdf(ledgerData.balancedTotal),
            '',
            'Total Cr',
            fmtCurrencyPdf(ledgerData.balancedTotal),
          ];
        } else {
          // On non-final pages, show "Total c/f" with the running subtotal as of this page
          footRow = [
            '',
            'Total c/f (Carried Forward)',
            fmtCurrencyPdf(runningDr),
            '',
            'Total c/f (Carried Forward)',
            fmtCurrencyPdf(runningCr),
          ];
        }

        const startY = isFirstPage ? 100 : 30;

        autoTable(doc, {
          startY: startY,
          head: [
            [
              { content: 'DEBIT (Dr)', colSpan: 3, styles: { halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } },
              { content: 'CREDIT (Cr)', colSpan: 3, styles: { halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } },
            ],
            [
              'Date', 'Particulars (Job Bill)', 'Amount (Dr)',
              'Date', 'Particulars (Payment Details)', 'Amount (Cr)'
            ]
          ],
          body: tableBody,
          foot: [footRow],
          theme: 'grid',
          margin: { left: margin, right: margin, bottom: 30 },
          styles: {
            lineColor: [180, 180, 180],
            lineWidth: 0.5,
            textColor: [0, 0, 0],
            fontSize: 8,
            cellPadding: 4.5,
            overflow: 'linebreak',
          },
          headStyles: {
            fillColor: [245, 245, 245],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 8.5,
            cellPadding: 5,
            lineColor: [140, 140, 140],
            lineWidth: 0.6,
          },
          bodyStyles: {
            fillColor: [255, 255, 255],
          },
          footStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 6,
            lineColor: [0, 0, 0],
            lineWidth: 0.8,
          },
          columnStyles: {
            0: { cellWidth: 68, halign: 'center' },
            1: { cellWidth: 'auto', halign: 'left' },
            2: { cellWidth: 85, halign: 'right', fontStyle: 'bold' },
            3: { cellWidth: 68, halign: 'center' },
            4: { cellWidth: 'auto', halign: 'left' },
            5: { cellWidth: 85, halign: 'right', fontStyle: 'bold' },
          },
          didParseCell: (data) => {
            // Style Balance b/f and Balance c/d rows
            if (data.section === 'body') {
              const rowData = tableBody[data.row.index];
              if (rowData) {
                const isBf = rowData[1]?.includes('Balance b/f');
                const isCd = rowData[1]?.includes('Balance c/d') || rowData[4]?.includes('Balance c/d');
                if (isBf || isCd) {
                  data.cell.styles.fontStyle = 'bold';
                  if (isBf) {
                    data.cell.styles.fillColor = [248, 250, 252];
                  }
                }
              }
            }
          },
        });

        // Footer page numbering
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Page ${pageIdx + 1} of ${totalPages}`, pageWidth / 2, 580, { align: 'center' });
      });

      const datePart = fromDate && toDate
        ? `${fromDate}_to_${toDate}`
        : (fromDate ? `from_${fromDate}` : (toDate ? `to_${toDate}` : 'All_Dates'));
      const filename = `JobPaymentLedger_${datePart}.pdf`;

      doc.save(filename);
      showToast(`Exported ${filename}`, 'success');
    } catch (err) {
      console.error('[JobPaymentLedger] Export PDF error:', err);
      showToast('Failed to export PDF', 'error');
    } finally {
      setExporting(false);
    }
  }, [filteredPayments, fromDate, toDate, selectedSupervisorName, selectedCompany, ledgerData, showToast]);

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
        <Loader2 size={32} color="#049edf" className="pg-spin" />
        <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14, fontWeight: 700 }}>
          Loading Job Payment Ledger…
        </span>
      </div>
    );
  }

  const hasData = filteredPayments.length > 0;

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="pg-page">
        {/* ── Top Navigation & Page Header ── */}
        <div className="pg-header" style={{ marginBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <button
                onClick={() => changeTab?.('JobPayment')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#f4f4fb',
                  border: '1.5px solid #ececf8',
                  borderRadius: 9,
                  padding: '6px 12px',
                  fontFamily: 'Nunito,sans-serif',
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: '#5a5a78',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Return to Job Payment list"
              >
                <ArrowLeft size={14} /> Back to Job Payments
              </button>
            </div>
            <h1 className="pg-header__title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              Job Payment Ledger
            </h1>
            <p className="pg-header__subtitle">
              Debit / Credit balancing ledger of <strong>calculated job amounts</strong> vs. <strong>received payments</strong>.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleExportPDF}
              disabled={!hasData || exporting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 18px',
                borderRadius: 10,
                border: 'none',
                background: !hasData
                  ? '#e2e8f0'
                  : 'linear-gradient(135deg, #049edf, #0284c7)',
                color: !hasData ? '#94a3b8' : '#ffffff',
                fontFamily: 'Nunito,sans-serif',
                fontSize: 13,
                fontWeight: 800,
                cursor: !hasData || exporting ? 'not-allowed' : 'pointer',
                boxShadow: hasData ? '0 4px 14px rgba(4,158,223,0.32)' : 'none',
                transition: 'all 0.18s ease',
              }}
              title={!hasData ? 'No data to export' : 'Download formatted Ledger PDF'}
            >
              {exporting ? <Loader2 size={15} className="pg-spin" /> : <Download size={15} />}
              {exporting ? 'Generating PDF…' : 'Export PDF'}
            </button>
          </div>
        </div>

        {apiError && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11, marginBottom: 16, color: '#dc2626', fontSize: 13, fontWeight: 600, fontFamily: 'Nunito,sans-serif' }}>
            <AlertCircle size={14} /> {apiError}
          </div>
        )}

        {/* ── Filters Toolbar Card (System Combo Dropdowns) ── */}
        <div className="pg-container" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(4,158,223,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={15} color="#049edf" />
              </div>
              <div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 16, fontWeight: 900, color: '#1a1a2e', lineHeight: 1 }}>
                  {filteredPayments.length}
                </div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 600, color: '#9090a8', lineHeight: 1, marginTop: 2 }}>
                  Filtered Payment{filteredPayments.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Company System Combo Dropdown */}
            {companies.length > 0 && (
              <CompanyComboField
                value={selectedCompanyId}
                onChange={comp => setSelectedCompanyId(comp ? String(comp.companyID) : '')}
                companies={companies}
              />
            )}

            {/* Supervisor System Combo Dropdown */}
            <SupervisorComboField
              value={selectedSupervisor}
              onChange={sup => setSelectedSupervisor(sup ? String(sup.id) : '')}
              supervisors={supervisors}
            />

            {/* From Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} color="#049edf" style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#5a5a78' }}>From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: '1.5px solid #ececf8',
                  background: '#f4f4fb', fontFamily: 'Nunito,sans-serif', fontSize: 12,
                  fontWeight: 600, color: '#1a1a2e', outline: 'none', cursor: 'pointer',
                  height: 35
                }}
              />
            </div>

            {/* To Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#5a5a78' }}>To:</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: '1.5px solid #ececf8',
                  background: '#f4f4fb', fontFamily: 'Nunito,sans-serif', fontSize: 12,
                  fontWeight: 600, color: '#1a1a2e', outline: 'none', cursor: 'pointer',
                  height: 35
                }}
              />
            </div>

            {/* Clear Filters */}
            {(fromDate || toDate || selectedSupervisor) && (
              <button
                onClick={() => { setFromDate(''); setToDate(''); setSelectedSupervisor(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '7px 11px',
                  borderRadius: 9, border: '1px solid #fecaca', background: '#fef2f2',
                  color: '#dc2626', fontFamily: 'Nunito,sans-serif', fontSize: 12,
                  fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                  height: 35
                }}
                title="Clear all filters"
              >
                <X size={12} /> Clear
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={refresh}
              disabled={refreshing}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px',
                borderRadius: 9, border: '1.5px solid #ececf8', background: '#f4f4fb',
                color: '#5a5a78', fontFamily: 'Nunito,sans-serif', fontSize: 12,
                fontWeight: 700, cursor: refreshing ? 'not-allowed' : 'pointer',
                flexShrink: 0, marginLeft: 'auto', height: 35
              }}
              title="Refresh ledger data"
            >
              <RefreshCw size={13} className={refreshing ? 'pg-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Active Filter Summary & Stats ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', background: '#ffffff', borderRadius: 12,
          border: '1.5px solid #ececf8', marginBottom: 18, flexWrap: 'wrap', gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#9090a8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Date:
              </span>
              <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>
                {fromDate || toDate
                  ? `${fromDate ? fmtDate(fromDate) : 'Start'} → ${toDate ? fmtDate(toDate) : 'End'}`
                  : 'All Dates'}
              </span>
            </div>

            <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#9090a8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Supervisor:
              </span>
              <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>
                {selectedSupervisorName}
              </span>
            </div>

            {selectedCompany && (
              <>
                <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#9090a8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Company:
                  </span>
                  <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>
                    {selectedCompany.companyName}
                  </span>
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, color: '#5a5a78' }}>
              Unique Jobs (Dr): <strong style={{ color: '#049edf' }}>{ledgerData.uniqueJobCount || 0}</strong>
            </div>
            <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 700, color: '#5a5a78' }}>
              Payments (Cr): <strong style={{ color: '#16a34a' }}>{ledgerData.paymentCount || 0}</strong>
            </div>
          </div>
        </div>

        {/* ── Main Ledger Display ── */}
        {!hasData ? (
          <div className="pg-container" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28, background: '#f4f4fb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', color: '#9090a8'
            }}>
              <BookOpen size={28} />
            </div>
            <h3 style={{ fontFamily: 'Nunito,sans-serif', fontSize: 16, fontWeight: 800, color: '#1a1a2e', margin: '0 0 6px' }}>
              No data for the selected filters
            </h3>
            <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, color: '#9090a8', margin: '0 0 16px' }}>
              Try clearing the date range or selecting a different supervisor to view ledger transactions.
            </p>
            {(fromDate || toDate || selectedSupervisor) && (
              <button
                onClick={() => { setFromDate(''); setToDate(''); setSelectedSupervisor(''); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 9, border: '1.5px solid #049edf',
                  background: '#ffffff', color: '#049edf', fontFamily: 'Nunito,sans-serif',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer'
                }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="pg-container" style={{ overflow: 'hidden' }}>
            {/* Table Container */}
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="pg-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                {/* Main Header */}
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th
                      colSpan={3}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        fontFamily: 'Nunito,sans-serif',
                        fontSize: 14,
                        fontWeight: 900,
                        color: '#049edf',
                        borderRight: '2px solid #cbd5e1',
                        background: 'rgba(4,158,223,0.06)'
                      }}
                    >
                      DEBIT (Dr) — Calculated Job Amounts
                    </th>
                    <th
                      colSpan={3}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        fontFamily: 'Nunito,sans-serif',
                        fontSize: 14,
                        fontWeight: 900,
                        color: '#16a34a',
                        background: 'rgba(22,163,74,0.06)'
                      }}
                    >
                      CREDIT (Cr) — Received Payments
                    </th>
                  </tr>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1' }}>
                    {/* Dr Subheaders */}
                    <th style={{ width: '12%', padding: '10px 14px', fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ width: '23%', padding: '10px 14px', fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Particulars</th>
                    <th style={{ width: '15%', padding: '10px 14px', fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'right', borderRight: '2px solid #cbd5e1' }}>Amount (₹)</th>

                    {/* Cr Subheaders */}
                    <th style={{ width: '12%', padding: '10px 14px', fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ width: '23%', padding: '10px 14px', fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Particulars</th>
                    <th style={{ width: '15%', padding: '10px 14px', fontFamily: 'Nunito,sans-serif', fontSize: 11.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>

                {/* Ledger Body Rows */}
                <tbody>
                  {ledgerData.pairedRows.map((pair, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      {/* Dr Side Cell 1: Date */}
                      <td style={{ padding: '10px 14px', fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 600, color: '#475569' }}>
                        {pair.dr ? (pair.dr.date ? fmtDate(pair.dr.date) : (pair.dr.isBalancing ? '—' : '—')) : ''}
                      </td>

                      {/* Dr Side Cell 2: Particulars */}
                      <td style={{ padding: '10px 14px', fontFamily: 'Nunito,sans-serif', fontSize: 13, color: '#1a1a2e' }}>
                        {pair.dr && (
                          <div>
                            <div style={{ fontWeight: pair.dr.isBalancing ? 800 : 700, color: pair.dr.isBalancing ? '#dc2626' : '#1a1a2e' }}>
                              {pair.dr.label}
                            </div>
                            {pair.dr.custName && (
                              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                                Cust: {pair.dr.custName}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Dr Side Cell 3: Amount */}
                      <td style={{
                        padding: '10px 14px',
                        fontFamily: 'Nunito,sans-serif',
                        fontSize: 13,
                        fontWeight: 800,
                        color: pair.dr?.isBalancing ? '#dc2626' : '#049edf',
                        textAlign: 'right',
                        borderRight: '2px solid #cbd5e1'
                      }}>
                        {pair.dr ? fmtCurrency(pair.dr.amount) : ''}
                      </td>

                      {/* Cr Side Cell 1: Date */}
                      <td style={{ padding: '10px 14px', fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 600, color: '#475569' }}>
                        {pair.cr ? (pair.cr.date ? fmtDate(pair.cr.date) : (pair.cr.isBalancing ? '—' : '—')) : ''}
                      </td>

                      {/* Cr Side Cell 2: Particulars (includes Advance tag, Extra Payment flag, Customer, PaidBy, Comments) */}
                      <td style={{ padding: '10px 14px', fontFamily: 'Nunito,sans-serif', fontSize: 13, color: '#1a1a2e' }}>
                        {pair.cr && (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: pair.cr.isBalancing ? 800 : 700, color: pair.cr.isBalancing ? '#dc2626' : '#1a1a2e' }}>
                                {pair.cr.label}
                              </span>
                              {pair.cr.isAdvancePayment && (
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: 10,
                                  background: '#ecfdf5',
                                  color: '#059669',
                                  border: '1px solid #a7f3d0',
                                  textTransform: 'uppercase'
                                }}>
                                  Advance
                                </span>
                              )}
                              {pair.cr.extraPayment && (
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: 10,
                                  background: '#fffbeb',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                  textTransform: 'uppercase'
                                }}>
                                  Extra: ₹ {pair.cr.extraPayment}
                                </span>
                              )}
                            </div>

                            {!pair.cr.isBalancing && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 3 }}>
                                {pair.cr.custName && (
                                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                                    Cust: {pair.cr.custName}
                                  </span>
                                )}
                                {pair.cr.paidBy && (
                                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                                    Paid by: {pair.cr.paidBy}
                                  </span>
                                )}
                                {pair.cr.extraPayment && (
                                  <span style={{ fontSize: 11, color: '#b45309', fontWeight: 700 }}>
                                    ⚡ Extra Payment: ₹ {pair.cr.extraPayment}
                                  </span>
                                )}
                                {pair.cr.comments && (
                                  <span style={{
                                    fontSize: 11,
                                    color: '#0369a1',
                                    background: '#f0f9ff',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    display: 'inline-block',
                                    width: 'fit-content',
                                    border: '1px solid #e0f2fe'
                                  }}>
                                    💬 {pair.cr.comments}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Cr Side Cell 3: Amount */}
                      <td style={{
                        padding: '10px 14px',
                        fontFamily: 'Nunito,sans-serif',
                        fontSize: 13,
                        fontWeight: 800,
                        color: pair.cr?.isBalancing ? '#dc2626' : '#16a34a',
                        textAlign: 'right'
                      }}>
                        {pair.cr ? fmtCurrency(pair.cr.amount) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Ledger Balancing Grand Totals Footer */}
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2.5px solid #cbd5e1', borderBottom: '2.5px double #94a3b8' }}>
                    <td colSpan={2} style={{ padding: '12px 14px', fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 900, color: '#1a1a2e', textAlign: 'right' }}>
                      Total Dr (Debit):
                    </td>
                    <td style={{
                      padding: '12px 14px',
                      fontFamily: 'Nunito,sans-serif',
                      fontSize: 14,
                      fontWeight: 900,
                      color: '#049edf',
                      textAlign: 'right',
                      borderRight: '2px solid #cbd5e1'
                    }}>
                      {fmtCurrency(ledgerData.balancedTotal)}
                    </td>

                    <td colSpan={2} style={{ padding: '12px 14px', fontFamily: 'Nunito,sans-serif', fontSize: 13.5, fontWeight: 900, color: '#1a1a2e', textAlign: 'right' }}>
                      Total Cr (Credit):
                    </td>
                    <td style={{
                      padding: '12px 14px',
                      fontFamily: 'Nunito,sans-serif',
                      fontSize: 14,
                      fontWeight: 900,
                      color: '#16a34a',
                      textAlign: 'right'
                    }}>
                      {fmtCurrency(ledgerData.balancedTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
