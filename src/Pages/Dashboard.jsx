import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RefreshCw,
  CalendarCheck,
  TrendingUp,
  Briefcase,
  Layers,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Calendar,
  IndianRupee,
  TrendingDown,
  Landmark,
  CreditCard,
} from 'lucide-react';
import { apiService } from '../api/api';
import DashboardCard from '../components/dashboard/DashboardCard';
import DashboardTable from '../components/dashboard/DashboardTable';
import ConfirmNavigateModal from '../components/dashboard/ConfirmNavigateModal';
import './Common1.css';

/* ── Helpers ── */
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

function fmtCurrency(val) {
  if (val == null || isNaN(Number(val))) return '—';
  const num = Number(val);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return '₹' + num.toLocaleString('en-IN');
}

function fmtFullCurrency(val) {
  if (val == null || isNaN(Number(val))) return '—';
  return '₹' + Number(val).toLocaleString('en-IN');
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    const str = String(d).split('T')[0];
    const parts = str.split('-');
    if (parts.length === 3) {
      const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return str;
  } catch {
    return String(d);
  }
}

function getSiteAddress(h, siteMap) {
  if (!h) return '—';
  const siteId = Number(h.siteID ?? h.SiteID ?? h.site?.siteID ?? 0);
  const site = siteId ? siteMap.get(siteId) : (h.site || null);

  if (site) {
    const addr = [site.addressLine1 ?? site.AddressLine1, site.addressLine2 ?? site.AddressLine2]
      .filter(Boolean)
      .join(', ');
    const city = [site.city ?? site.City, site.district ?? site.District]
      .filter(Boolean)
      .join(', ');
    const full = [addr, city].filter(Boolean).join(' — ');
    if (full) return full;
  }

  const flatAddr = [h.addressLine1 ?? h.AddressLine1, h.city ?? h.City]
    .filter(Boolean)
    .join(', ');
  if (flatAddr) return flatAddr;

  const landmark = h.landmark ?? h.Landmark ?? '';
  if (landmark) return landmark;

  return h.hoardingCode ?? h.HoardingCode ?? '—';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Dashboard({ changeTab }) {
  const [adminName, setAdminName] = useState('Admin');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState('');
  const [toast, setToast] = useState(null);

  /* ── Raw API states ── */
  const [contracts, setContracts] = useState([]);
  const [contractHoardingMaps, setContractHoardingMaps] = useState([]);
  const [hoardings, setHoardings] = useState([]);
  const [sites, setSites] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [jobRequests, setJobRequests] = useState([]);
  const [jobTasks, setJobTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [performaInvoices, setPerformaInvoices] = useState([]);
  const [quotationArchives, setQuotationArchives] = useState([]);
  const [quotationCustomers, setQuotationCustomers] = useState([]);

  /* ── Land Contract & Land Payment states ── */
  const [landContracts, setLandContracts] = useState([]);
  const [landPayments, setLandPayments] = useState([]);
  const [owners, setOwners] = useState([]);
  const [landContractHoardingMaps, setLandContractHoardingMaps] = useState([]);
  const [paymentFreqs, setPaymentFreqs] = useState([]);
  const [landPaymentTab, setLandPaymentTab] = useState('today'); // 'today' | 'next7' | 'overdue' | 'all'

  /* ── Step 1 Tab State ── */
  const [expiringTab, setExpiringTab] = useState('today'); // 'today' | 'next7'

  /* ── Step 2 Selector State ── */
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [showMonthlyValue, setShowMonthlyValue] = useState(false); // Initially hidden on dashboard load
  const [monthlyFilter, setMonthlyFilter] = useState({
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  });

  /* ── Step 4 Archiving Action Loading ── */
  const [archivingId, setArchivingId] = useState(null);

  /* ── Step 6 Confirm Modal State ── */
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'View',
    targetTab: '',
    targetId: null,
    customAction: null,
  });

  /* ── Show Toast Helper ── */
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ── Read Admin user name ── */
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('userData') || '{}');
      const name = `${s?.first_Name || ''} ${s?.last_Name || ''}`.trim() ||
        s?.name || s?.Name || s?.userName || 'Admin';
      setAdminName(name);
    } catch {
      setAdminName('Admin');
    }
  }, []);

  /* ── Load All Data ── */
  const loadAllDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    // Hide monthly contract value on every refresh / reload
    setShowMonthlyValue(false);

    try {
      const [
        contractsRes,
        mapsRes,
        hoardingsRes,
        sitesRes,
        customersRes,
        jobsRes,
        tasksRes,
        usersRes,
        quotationsRes,
        invoicesRes,
        archivesRes,
        quotCustRes,
        landContractsRes,
        landPaymentsRes,
        ownersRes,
        landMapsRes,
        freqsRes,
      ] = await Promise.all([
        apiService.getAllCustomerContracts().catch((err) => {
          console.warn('Contracts fetch error:', err);
          return [];
        }),
        apiService.getAllCustomerContractHoardingMaps().catch((err) => {
          console.warn('CustomerContractHoarding fetch error:', err);
          return [];
        }),
        apiService.getAllHoardings().catch((err) => {
          console.warn('Hoardings fetch error:', err);
          return [];
        }),
        apiService.getAllSites().catch((err) => {
          console.warn('Sites fetch error:', err);
          return [];
        }),
        apiService.getAllCustomers().catch((err) => {
          console.warn('Customers fetch error:', err);
          return [];
        }),
        apiService.getAllJobRequests().catch((err) => {
          console.warn('JobRequests fetch error:', err);
          return [];
        }),
        apiService.getAllJobTasks().catch((err) => {
          console.warn('JobTasks fetch error:', err);
          return [];
        }),
        apiService.getAllUsers().catch((err) => {
          console.warn('Users fetch error:', err);
          return [];
        }),
        apiService.getAllQuotations().catch((err) => {
          console.warn('Quotations fetch error:', err);
          return [];
        }),
        apiService.getAllPerformaInvoices().catch((err) => {
          console.warn('PerformaInvoices fetch error:', err);
          return [];
        }),
        apiService.getAllQuotationArchives().catch((err) => {
          console.warn('QuotationArchive fetch error:', err);
          return [];
        }),
        apiService.getAllQuotationCustomers().catch((err) => {
          console.warn('QuotationCustomers fetch error:', err);
          return [];
        }),
        apiService.getAllLandContracts().catch((err) => {
          console.warn('LandContracts fetch error:', err);
          return [];
        }),
        apiService.getAllLandPayments().catch((err) => {
          console.warn('LandPayments fetch error:', err);
          return [];
        }),
        apiService.getAllOwners().catch((err) => {
          console.warn('Owners fetch error:', err);
          return [];
        }),
        apiService.getAllLandContractHoardingMaps().catch((err) => {
          console.warn('LandContractHoardingMaps fetch error:', err);
          return [];
        }),
        apiService.getAllPaymentFreqs().catch((err) => {
          console.warn('PaymentFreqs fetch error:', err);
          return [];
        }),
      ]);

      setContracts(normalizeList(contractsRes));
      setContractHoardingMaps(normalizeList(mapsRes));
      setHoardings(normalizeList(hoardingsRes));
      setSites(normalizeList(sitesRes));
      setCustomers(normalizeList(customersRes));
      setJobRequests(normalizeList(jobsRes));
      setJobTasks(normalizeList(tasksRes));
      setUsers(normalizeList(usersRes));
      setQuotations(normalizeList(quotationsRes));
      setPerformaInvoices(normalizeList(invoicesRes));
      setQuotationArchives(normalizeList(archivesRes));
      setQuotationCustomers(normalizeList(quotCustRes));
      setLandContracts(normalizeList(landContractsRes));
      setLandPayments(normalizeList(landPaymentsRes));
      setOwners(normalizeList(ownersRes));
      setLandContractHoardingMaps(normalizeList(landMapsRes));
      setPaymentFreqs(normalizeList(freqsRes));
      setApiError('');
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setApiError('Failed to load some dashboard sections. Please try refreshing.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllDashboardData();
  }, [loadAllDashboardData]);

  /* ── Lookup Dictionaries ── */
  const siteMap = useMemo(() => {
    const map = new Map();
    sites.forEach((s) => {
      const id = Number(s.siteID ?? s.SiteID ?? 0);
      if (id) map.set(id, s);
    });
    return map;
  }, [sites]);

  const hoardingMap = useMemo(() => {
    const map = new Map();
    hoardings.forEach((h) => {
      const id = Number(h.hoardingID ?? h.HoardingID ?? 0);
      if (id) map.set(id, h);
    });
    return map;
  }, [hoardings]);

  const customerMap = useMemo(() => {
    const map = new Map();
    customers.forEach((c) => {
      const id = Number(c.customerID ?? c.CustomerID ?? 0);
      if (id) map.set(id, c.customerName ?? c.CustomerName ?? `Client #${id}`);
    });
    return map;
  }, [customers]);

  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      const id = Number(u.id ?? u.Id ?? u.ID ?? u.userID ?? u.UserID ?? 0);
      const firstName = u.first_Name ?? u.firstName ?? u.FirstName ?? '';
      const lastName = u.last_Name ?? u.lastName ?? u.LastName ?? '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
      const displayName = fullName || u.name || u.Name || u.userName || u.email || `User #${id}`;
      if (id) map.set(id, displayName);
    });
    return map;
  }, [users]);

  const ownerMap = useMemo(() => {
    const map = new Map();
    owners.forEach((o) => {
      const id = Number(o.ownerID ?? o.OwnerID ?? 0);
      if (id) {
        map.set(id, {
          name: o.ownerName ?? o.OwnerName ?? `Landlord #${id}`,
          phone: o.phone1 ?? o.phone2 ?? o.Phone1 ?? '',
          city: o.city ?? o.City ?? '',
          district: o.district ?? o.District ?? '',
        });
      }
    });
    return map;
  }, [owners]);

  const freqMap = useMemo(() => {
    const map = new Map();
    paymentFreqs.forEach((f) => {
      const id = Number(f.paymentFreqID ?? f.PaymentFreqID ?? f.id ?? 0);
      const name = f.frequencyName ?? f.frequency ?? f.name ?? f.FrequencyName ?? '';
      if (id) map.set(id, name);
    });
    if (!map.has(1)) map.set(1, 'Monthly Rent');
    if (!map.has(2)) map.set(2, 'Quarterly Rent');
    if (!map.has(3)) map.set(3, 'Half-Yearly Rent');
    if (!map.has(4)) map.set(4, 'Yearly Rent');
    return map;
  }, [paymentFreqs]);

  const landContractHoardingMap = useMemo(() => {
    const map = new Map();
    landContractHoardingMaps.forEach((item) => {
      const cId = Number(item.landContractID ?? item.LandContractID ?? 0);
      const hId = Number(item.hoardingID ?? item.HoardingID ?? 0);
      if (!cId || !hId) return;

      const hoarding = hoardingMap.get(hId);
      const hCode = hoarding?.hoardingCode ?? hoarding?.HoardingCode ?? `HD-${hId}`;
      const location = hoarding ? getSiteAddress(hoarding, siteMap) : '—';

      if (!map.has(cId)) {
        map.set(cId, []);
      }
      map.get(cId).push({
        hoardingID: hId,
        hoardingCode: hCode,
        location: location,
      });
    });
    return map;
  }, [landContractHoardingMaps, hoardingMap, siteMap]);

  /* ── Map contract ID -> Array of Hoarding objects ── */
  const contractHoardingsMap = useMemo(() => {
    const map = new Map();
    contractHoardingMaps.forEach((item) => {
      const cId = Number(item.customerContractID ?? item.CustomerContractID ?? 0);
      const hId = Number(item.hoardingID ?? item.HoardingID ?? 0);
      if (!cId || !hId) return;

      const hoarding = hoardingMap.get(hId);
      const hCode = hoarding?.hoardingCode ?? hoarding?.HoardingCode ?? `HD-${hId}`;
      const location = hoarding ? getSiteAddress(hoarding, siteMap) : '—';

      if (!map.has(cId)) {
        map.set(cId, []);
      }
      map.get(cId).push({
        hoardingID: hId,
        hoardingCode: hCode,
        location: location,
      });
    });
    return map;
  }, [contractHoardingMaps, hoardingMap, siteMap]);

  /* ══════════════════════════════════════════════════
     STEP 1: Expiring Hoarding Contracts (Separated by Hoarding Row)
  ══════════════════════════════════════════════════ */
  const { closingTodayContracts, closingNext7Contracts } = useMemo(() => {
    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = String(now.getMonth() + 1).padStart(2, '0');
    const todayD = String(now.getDate()).padStart(2, '0');
    const todayStr = `${todayY}-${todayM}-${todayD}`;

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    const next7End = new Date(now);
    next7End.setDate(now.getDate() + 7);
    const next7EndStr = `${next7End.getFullYear()}-${String(next7End.getMonth() + 1).padStart(2, '0')}-${String(next7End.getDate()).padStart(2, '0')}`;

    const activeContracts = contracts.filter((c) => {
      const status = String(c.status ?? c.Status ?? '').toLowerCase().trim();
      return status !== 'terminated' && status !== 'expired';
    });

    const todayList = [];
    const next7List = [];

    activeContracts.forEach((c) => {
      const rawEnd = String(c.endDate ?? c.EndDate ?? '').split('T')[0];
      if (!rawEnd) return;

      const cId = Number(c.customerContractID ?? c.CustomerContractID ?? 0);
      const custId = Number(c.customerID ?? c.CustomerID ?? 0);
      const clientName = customerMap.get(custId) || `Client #${custId}`;
      const contractLabel = `Contract #${cId}`;
      const mappedHoardings = contractHoardingsMap.get(cId) || [];

      // If contract has mapped hoardings, generate a separate row per hoarding
      if (mappedHoardings.length > 0) {
        mappedHoardings.forEach((h, hIdx) => {
          const row = {
            id: `${cId}_${h.hoardingID}_${hIdx}`,
            customerContractID: cId,
            contractNumber: contractLabel,
            hoardingID: h.hoardingID,
            hoardingCode: h.hoardingCode,
            location: h.location,
            client: clientName,
            endDate: rawEnd,
            status: c.status ?? c.Status ?? 'Active',
          };

          if (rawEnd === todayStr) {
            todayList.push({ ...row, urgency: 'Closing Today' });
          } else if (rawEnd >= tomorrowStr && rawEnd <= next7EndStr) {
            next7List.push({ ...row, urgency: 'Closing Soon' });
          }
        });
      } else {
        // Fallback for contract without hoarding mapping
        const row = {
          id: `${cId}_none`,
          customerContractID: cId,
          contractNumber: contractLabel,
          hoardingID: 0,
          hoardingCode: '—',
          location: '—',
          client: clientName,
          endDate: rawEnd,
          status: c.status ?? c.Status ?? 'Active',
        };

        if (rawEnd === todayStr) {
          todayList.push({ ...row, urgency: 'Closing Today' });
        } else if (rawEnd >= tomorrowStr && rawEnd <= next7EndStr) {
          next7List.push({ ...row, urgency: 'Closing Soon' });
        }
      }
    });

    return {
      closingTodayContracts: todayList,
      closingNext7Contracts: next7List,
    };
  }, [contracts, contractHoardingsMap, customerMap]);

  const activeExpiringData = expiringTab === 'today' ? closingTodayContracts : closingNext7Contracts;

  const expiringColumns = [
    {
      key: 'hoardingCode',
      label: 'Hoarding ID',
      width: '120px',
      render: (val) => (
        <span
          style={{
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 800,
            color: '#049edf',
            background: 'rgba(4, 158, 223, 0.08)',
            padding: '3px 8px',
            borderRadius: '6px',
            display: 'inline-block',
          }}
        >
          {val}
        </span>
      ),
    },
    {
      key: 'contractNumber',
      label: 'Contract No.',
      width: '110px',
      render: (val) => (
        <span style={{ color: '#1e293b', fontWeight: 800, fontSize: '12px' }}>
          {val}
        </span>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (val) => (
        <span style={{ color: '#475569', fontSize: '12px', fontWeight: 600 }}>
          {val}
        </span>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (val) => (
        <span style={{ color: '#1e293b', fontWeight: 700 }}>
          {val}
        </span>
      ),
    },
    {
      key: 'endDate',
      label: 'End Date',
      width: '110px',
      render: (val) => (
        <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '12px' }}>
          {fmtDate(val)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      render: (val, row) => {
        const isToday = row.urgency === 'Closing Today';
        return (
          <span
            style={{
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 800,
              background: isToday ? '#fee2e2' : '#fef3c7',
              color: isToday ? '#b91c1c' : '#b45309',
              border: `1px solid ${isToday ? '#fecaca' : '#fde68a'}`,
            }}
          >
            {row.urgency || val}
          </span>
        );
      },
    },
  ];

  /* ══════════════════════════════════════════════════
     STEP 2: Monthly / Yearly Contract Value
  ══════════════════════════════════════════════════ */
  const monthlyStat = useMemo(() => {
    if (!showMonthlyValue) {
      return { totalValue: 0, count: 0, hasData: false };
    }

    const { month, year } = monthlyFilter;
    const targetPrefix = month
      ? `${year}-${String(month).padStart(2, '0')}`
      : `${year}-`;

    const matched = contracts.filter((c) => {
      const sDate = String(c.startDate ?? c.StartDate ?? '').split('T')[0];
      return sDate.startsWith(targetPrefix);
    });

    if (matched.length === 0) {
      return { totalValue: 0, count: 0, hasData: false };
    }

    const sum = matched.reduce((acc, c) => {
      const finalVal = c.contractFinalValue ?? c.ContractFinalValue;
      const origVal = c.contractOrigValue ?? c.ContractOrigValue ?? 0;
      const val = (finalVal !== null && finalVal !== undefined && Number(finalVal) > 0)
        ? Number(finalVal)
        : Number(origVal || 0);
      return acc + val;
    }, 0);

    return {
      totalValue: sum,
      count: matched.length,
      hasData: true,
    };
  }, [contracts, monthlyFilter, showMonthlyValue]);

  const handleApplyMonthlyFilter = () => {
    setShowMonthlyValue(true);
    setMonthlyFilter({
      month: selectedMonth ? Number(selectedMonth) : '',
      year: Number(selectedYear),
    });
  };

  /* ══════════════════════════════════════════════════
     STEP 3: Workflow Overview (Excludes Completed & Submitted)
  ══════════════════════════════════════════════════ */
  const inProgressJobs = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return jobRequests
      .map((j) => {
        const jId = Number(j.jobRequestID ?? j.JobRequestID ?? 0);
        const assignedUserId = Number(j.iD ?? j.ID ?? j.id ?? j.supervisorID ?? j.SupervisorID ?? 0);
        const assignedName = userMap.get(assignedUserId) || (assignedUserId ? `User #${assignedUserId}` : 'Unassigned');

        const myTasks = jobTasks.filter((t) => Number(t.jobRequestID ?? t.JobRequestID) === jId);
        const submittedCount = myTasks.filter((t) => String(t.status ?? t.Status).toLowerCase() === 'submitted').length;
        const totalTasks = myTasks.length;
        const rawStatus = String(j.jobStatus ?? j.JobStatus ?? '').trim();
        const derivedStatus = rawStatus === 'Completed'
          ? 'Completed'
          : totalTasks > 0
            ? (submittedCount === totalTasks ? 'Submitted' : (submittedCount > 0 ? 'In Progress' : (['In Progress', 'Accepted', 'Submitted'].includes(rawStatus) ? 'Accepted' : rawStatus)))
            : (rawStatus || 'Open');

        const targetDate = (j.targetCompletionDate ?? j.TargetCompletionDate ?? '').split('T')[0];
        const isOverdue = Boolean(targetDate && targetDate < todayStr);

        return {
          id: jId,
          jobRequestID: jId,
          jobType: j.jobType ?? j.JobType ?? 'General',
          assignedUser: assignedName,
          noofHoardings: j.noofHoardings ?? j.NoofHoardings ?? '1',
          targetCompletionDate: targetDate,
          submittedCount,
          totalTasks,
          status: derivedStatus,
          isOverdue,
        };
      })
      .filter((j) => {
        // Exclude jobs whose status is Completed or Submitted (same like Job.jsx); show all other active jobs
        const st = String(j.status || '').toLowerCase();
        return st !== 'completed' && st !== 'submitted';
      });
  }, [jobRequests, jobTasks, userMap]);

  const jobsColumns = [
    {
      key: 'jobRequestID',
      label: 'Job ID',
      width: '90px',
      render: (val, row) => (
        <span
          style={{
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 800,
            color: row.isOverdue ? '#b91c1c' : '#6c63ff',
            background: row.isOverdue ? 'rgba(220, 38, 38, 0.1)' : 'rgba(108, 99, 255, 0.08)',
            padding: '3px 8px',
            borderRadius: '6px',
            display: 'inline-block',
          }}
        >
          Job-{val}
        </span>
      ),
    },
    {
      key: 'jobType',
      label: 'Job Type',
      width: '100px',
      render: (val) => (
        <span style={{ fontWeight: 700, color: '#334155' }}>
          {val}
        </span>
      ),
    },
    {
      key: 'assignedUser',
      label: 'Supervisor',
      render: (val) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b', fontWeight: 700 }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
          {val}
        </span>
      ),
    },
    {
      key: 'targetCompletionDate',
      label: 'Target Date',
      width: '115px',
      render: (val, row) => (
        <span
          style={{
            color: row.isOverdue ? '#dc2626' : '#64748b',
            fontSize: '12px',
            fontWeight: row.isOverdue ? 800 : 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title={row.isOverdue ? 'Target Date has passed' : ''}
        >
          {fmtDate(val)}
        </span>
      ),
    },
    {
      key: 'tasks',
      label: 'Tasks',
      align: 'center',
      width: '90px',
      render: (_, row) => {
        if (row.totalTasks > 0) {
          return (
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: '11.5px', fontWeight: 700, textAlign: 'center' }}>
              <span style={{ color: row.submittedCount === row.totalTasks ? '#16a34a' : (row.isOverdue ? '#b91c1c' : '#334155'), fontWeight: 800 }}>
                {row.submittedCount}
              </span>
              <span style={{ color: '#94a3b8' }}>/{row.totalTasks}</span>
              <div style={{ fontSize: '9.5px', color: '#9090a8', marginTop: '1px' }}>submitted</div>
            </div>
          );
        }
        return <span style={{ color: '#c0c0d8', fontSize: '12px' }}>—</span>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '105px',
      align: 'center',
      render: (val) => {
        const statusStyles = {
          'Open': { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
          'Accepted': { bg: '#fefce8', color: '#ca8a04', border: '#fde68a' },
          'In Progress': { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
          'Submitted': { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
          'Completed': { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
          'Pending': { bg: '#fff8e1', color: '#e08a00', border: '#ffe082' },
          'Pending Payment': { bg: '#fff7ed', color: '#c2410c', border: '#ffedd5' },
        };
        const st = statusStyles[val] || statusStyles['Open'];
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 9px',
              borderRadius: '20px',
              fontFamily: 'Nunito, sans-serif',
              fontSize: '11px',
              fontWeight: 800,
              background: st.bg,
              color: st.color,
              border: `1px solid ${st.border}`,
              whiteSpace: 'nowrap',
            }}
          >
            {val}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Action',
      width: '75px',
      align: 'center',
      render: (_, row) => (
        <button
          onClick={() => {
            setConfirmModal({
              isOpen: true,
              title: `View Job #${row.jobRequestID}`,
              message: `You are about to navigate to the Job Management page for Job #${row.jobRequestID}. Do you wish to proceed?`,
              confirmLabel: 'Open Job',
              targetTab: 'Jobs',
              targetId: row.jobRequestID,
            });
          }}
          style={{
            padding: '4px 10px',
            borderRadius: '7px',
            border: '1.5px solid #e0e0f0',
            background: '#fff',
            color: '#049edf',
            fontWeight: 800,
            fontSize: '11.5px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#049edf';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = '#049edf';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.color = '#049edf';
            e.currentTarget.style.borderColor = '#e0e0f0';
          }}
        >
          <Eye size={12} /> View
        </button>
      ),
    },
  ];

  /* ══════════════════════════════════════════════════
     STEP 4: Sales Pipeline (Pending Performa)
     Excludes:
      1. Quotations with Proforma Invoice
      2. Quotations in QuotationArchive
      3. Quotations with CustomerContract created (QuotationCustomer)
  ══════════════════════════════════════════════════ */
  const pendingQuotations = useMemo(() => {
    // 1. Proforma Invoice keys
    const invoicedKeys = new Set();
    performaInvoices.forEach((inv) => {
      const qId = Number(inv.quotationID ?? inv.QuotationID ?? 0);
      const qRev = Number(inv.quotationRevisionNumber ?? inv.QuotationRevisionNumber ?? 0);
      if (qId) invoicedKeys.add(`${qId}_${qRev}`);
    });

    // 2. QuotationArchive keys
    const archivedKeys = new Set();
    quotationArchives.forEach((arch) => {
      const qId = Number(
        arch.quotatioN_ID ?? arch.QuotatioN_ID ?? arch.quotationID ??
        arch.QuotationID ?? arch.quotation_ID ?? arch.Quotation_ID ?? 0
      );
      const qRev = Number(
        arch.quotatioN_REVISION_NUMBER ?? arch.QuotatioN_REVISION_NUMBER ??
        arch.quotationRevisionNumber ?? arch.QuotationRevisionNumber ?? 0
      );
      if (qId) archivedKeys.add(`${qId}_${qRev}`);
    });

    // 3. Customer Contract created (QuotationCustomer) keys
    const contractedQuotKeys = new Set();
    quotationCustomers.forEach((qc) => {
      const qId = Number(
        qc.quotation_ID ?? qc.quotationID ?? qc.QuotationID ?? qc.Quotation_ID ?? 0
      );
      const qRev = Number(
        qc.quotation_Revision_Number ?? qc.quotationRevisionNumber ??
        qc.QuotationRevisionNumber ?? qc.Quotation_Revision_Number ?? 0
      );
      if (qId) {
        contractedQuotKeys.add(`${qId}_${qRev}`);
        contractedQuotKeys.add(`${qId}`); // also record quotation ID generally
      }
    });

    // 4. Filter quotations: NOT invoiced AND NOT archived AND NOT contracted
    return quotations
      .filter((q) => {
        const qId = Number(q.quotationID ?? q.QuotationID ?? 0);
        const qRev = Number(q.quotationRevisionNumber ?? q.QuotationRevisionNumber ?? 0);
        if (!qId) return false;
        const key = `${qId}_${qRev}`;
        return !invoicedKeys.has(key) && !archivedKeys.has(key) && !contractedQuotKeys.has(key) && !contractedQuotKeys.has(`${qId}`);
      })
      .map((q) => {
        const qId = Number(q.quotationID ?? q.QuotationID ?? 0);
        const qRev = Number(q.quotationRevisionNumber ?? q.QuotationRevisionNumber ?? 0);
        const custId = Number(q.customerID ?? q.CustomerID ?? 0);
        const clientName = customerMap.get(custId) || `Client #${custId}`;
        const total = q.totalAmount ?? q.TotalAmount ?? 0;

        return {
          id: `${qId}_${qRev}`,
          quotationID: qId,
          quotationRevisionNumber: qRev,
          quotationNumber: q.quotationNumber ?? q.QuotationNumber ?? `QU-${qId}`,
          clientName: clientName,
          quotationDate: (q.quotationDate ?? q.QuotationDate ?? '').split('T')[0],
          totalAmount: total,
        };
      });
  }, [quotations, performaInvoices, quotationArchives, quotationCustomers, customerMap]);

  const handleRemoveFromList = async (row) => {
    setArchivingId(row.id);
    try {
      await apiService.archiveQuotation(row.quotationID);
      const updatedArchives = await apiService.getAllQuotationArchives().catch(() => []);
      setQuotationArchives(normalizeList(updatedArchives));
      showToast(`Quotation ${row.quotationNumber} removed from list`, 'success');
    } catch (err) {
      console.error('Failed to archive quotation:', err);
      showToast('Failed to remove quotation. Please try again.', 'error');
    } finally {
      setArchivingId(null);
    }
  };

  const handlePromptRemoveQuotation = (row) => {
    setConfirmModal({
      isOpen: true,
      title: `Remove Quotation ${row.quotationNumber}?`,
      subtitle: 'Confirm Removal',
      message: `Are you sure you want to remove Quotation "${row.quotationNumber}" for "${row.clientName}" from the pending Performa list?`,
      confirmLabel: 'Yes, Remove',
      isDanger: true,
      customAction: () => handleRemoveFromList(row),
    });
  };

  const salesPipelineColumns = [
    {
      key: 'quotationNumber',
      label: 'Quotation No.',
      width: '120px',
      render: (val) => (
        <span
          style={{
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 800,
            color: '#1e293b',
          }}
        >
          {val}
        </span>
      ),
    },
    {
      key: 'clientName',
      label: 'Client Name',
      render: (val) => (
        <span style={{ color: '#334155', fontWeight: 700 }}>
          {val}
        </span>
      ),
    },
    {
      key: 'quotationDate',
      label: 'Quotation Date',
      width: '110px',
      render: (val) => (
        <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
          {fmtDate(val)}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Total Amount',
      width: '110px',
      render: (val) => (
        <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '13px' }}>
          {fmtCurrency(val)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      width: '190px',
      align: 'right',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: `View Quotation ${row.quotationNumber}`,
                subtitle: 'Confirm Navigation',
                message: `You are about to navigate to the Quotation module for ${row.quotationNumber}. Do you wish to continue?`,
                confirmLabel: 'Open Quotation',
                isDanger: false,
                targetTab: 'quotation',
                targetId: row.quotationID,
              });
            }}
            style={{
              padding: '4px 9px',
              borderRadius: '7px',
              border: '1.5px solid #e0e0f0',
              background: '#fff',
              color: '#049edf',
              fontWeight: 800,
              fontSize: '11px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#049edf';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = '#049edf';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.color = '#049edf';
              e.currentTarget.style.borderColor = '#e0e0f0';
            }}
          >
            <Eye size={12} /> View
          </button>
          <button
            onClick={() => handlePromptRemoveQuotation(row)}
            disabled={archivingId === row.id}
            style={{
              padding: '4px 9px',
              borderRadius: '7px',
              border: '1px solid #fee2e2',
              background: '#fef2f2',
              color: '#dc2626',
              fontWeight: 700,
              fontSize: '11px',
              cursor: archivingId === row.id ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              opacity: archivingId === row.id ? 0.6 : 1,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.borderColor = '#fca5a5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fef2f2';
              e.currentTarget.style.borderColor = '#fee2e2';
            }}
          >
            <Trash2 size={11} />
            {archivingId === row.id ? 'Removing…' : 'Remove from List'}
          </button>
        </div>
      ),
    },
  ];

  /* ══════════════════════════════════════════════════
     STEP 4.5: Landlord Payment Due (LandContract Next Due Payments)
  ══════════════════════════════════════════════════ */
  const {
    dueTodayLandPayments,
    dueNext7LandPayments,
    overdueLandPayments,
    allPendingLandPayments,
  } = useMemo(() => {
    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = String(now.getMonth() + 1).padStart(2, '0');
    const todayD = String(now.getDate()).padStart(2, '0');
    const todayStr = `${todayY}-${todayM}-${todayD}`;

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    const next7End = new Date(now);
    next7End.setDate(now.getDate() + 7);
    const next7EndStr = `${next7End.getFullYear()}-${String(next7End.getMonth() + 1).padStart(2, '0')}-${String(next7End.getDate()).padStart(2, '0')}`;

    const activeContracts = landContracts.filter((c) => {
      const st = String(c.status ?? c.Status ?? '').toLowerCase().trim();
      return st !== 'terminated' && st !== 'inactive' && st !== 'expired';
    });

    const todayList = [];
    const next7List = [];
    const overdueList = [];
    const allPendingList = [];

    activeContracts.forEach((c) => {
      const cId = Number(c.landContractID ?? c.LandContractID ?? 0);
      const ownerId = Number(c.ownerID ?? c.OwnerID ?? 0);
      const ownerObj = ownerMap.get(ownerId);
      const ownerName = ownerObj?.name || (ownerId ? `Landlord #${ownerId}` : 'Unknown Landlord');
      const totalContractVal = Number(c.totalContractValue ?? c.TotalContractValue ?? 0);
      const amountPerFreq = Number(c.amountPerFreq ?? c.AmountPerFreq ?? 0);
      const freqId = Number(c.paymentFreqID ?? c.PaymentFreqID ?? 0);
      const freqName = freqMap.get(freqId) || 'Monthly Rent';

      // Find all payments for this landContractID
      const cPayments = landPayments.filter(
        (p) => Number(p.landContractID ?? p.LandContractID) === cId
      );

      const totalPaid = cPayments.reduce((sum, p) => sum + (Number(p.amountPaid ?? p.AmountPaid) || 0), 0);
      const remainingBalance = Math.max(0, totalContractVal - totalPaid);

      // If contract is fully paid (totalContractVal > 0 and remainingBalance <= 0), skip
      if (totalContractVal > 0 && remainingBalance <= 0) {
        return;
      }

      // Sort payments descending by paymentDate or lastUpdatedDttm or landPaymentID
      const sortedPayments = [...cPayments].sort((a, b) => {
        const da = a.paymentDate || a.PaymentDate || a.lastUpdatedDttm || a.LastUpdatedDttm || '';
        const db = b.paymentDate || b.PaymentDate || b.lastUpdatedDttm || b.LastUpdatedDttm || '';
        if (da !== db) return db.localeCompare(da);
        return (Number(b.landPaymentID ?? b.LandPaymentID) || 0) - (Number(a.landPaymentID ?? a.LandPaymentID) || 0);
      });

      // Find the last entered nextDueDate
      let effectiveNextDueDate = '';
      const latestPaymentWithDue = sortedPayments.find((p) => {
        const d = (p.nextDueDate ?? p.NextDueDate ?? '').split('T')[0];
        return d && d !== '0001-01-01';
      });

      if (latestPaymentWithDue) {
        effectiveNextDueDate = (latestPaymentWithDue.nextDueDate ?? latestPaymentWithDue.NextDueDate ?? '').split('T')[0];
      } else {
        effectiveNextDueDate = (c.startDate ?? c.StartDate ?? '').split('T')[0];
      }

      if (!effectiveNextDueDate || effectiveNextDueDate === '0001-01-01') {
        return;
      }

      // Check hoarding info
      let hoardingLabel = '';
      const mappedHoardings = landContractHoardingMap.get(cId) || [];
      if (mappedHoardings.length > 0) {
        hoardingLabel = mappedHoardings.map((h) => h.hoardingCode).join(', ');
      } else if (c.hoardingID ?? c.HoardingID) {
        const h = hoardingMap.get(Number(c.hoardingID ?? c.HoardingID));
        hoardingLabel = h?.hoardingCode ?? h?.HoardingCode ?? `HD-${c.hoardingID}`;
      } else {
        hoardingLabel = '—';
      }

      const isOverdue = effectiveNextDueDate < todayStr;
      const isDueToday = effectiveNextDueDate === todayStr;
      const isDueNext7 = effectiveNextDueDate >= tomorrowStr && effectiveNextDueDate <= next7EndStr;

      const dueAmount = amountPerFreq > 0 ? amountPerFreq : (remainingBalance > 0 ? remainingBalance : totalContractVal);

      const item = {
        id: `lc_${cId}`,
        landContractID: cId,
        ownerID: ownerId,
        ownerName,
        ownerPhone: ownerObj?.phone || '',
        ownerCity: ownerObj?.city || ownerObj?.district || '',
        hoardingLabel,
        frequency: freqName,
        nextDueDate: effectiveNextDueDate,
        amountDue: dueAmount,
        totalContractValue: totalContractVal,
        totalPaid,
        remainingBalance,
        status: c.status ?? c.Status ?? 'Active',
        isOverdue,
        isDueToday,
        isDueNext7,
      };

      allPendingList.push(item);

      if (isDueToday) {
        todayList.push({ ...item, urgency: 'Due Today' });
      } else if (isDueNext7) {
        next7List.push({ ...item, urgency: 'Due Soon' });
      }

      if (isOverdue) {
        overdueList.push({ ...item, urgency: 'Overdue' });
      }
    });

    todayList.sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
    next7List.sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
    overdueList.sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
    allPendingList.sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

    return {
      dueTodayLandPayments: todayList,
      dueNext7LandPayments: next7List,
      overdueLandPayments: overdueList,
      allPendingLandPayments: allPendingList,
    };
  }, [landContracts, landPayments, ownerMap, freqMap, landContractHoardingMap, hoardingMap]);

  const activeLandPaymentData = useMemo(() => {
    if (landPaymentTab === 'today') return dueTodayLandPayments;
    if (landPaymentTab === 'next7') return dueNext7LandPayments;
    if (landPaymentTab === 'overdue') return overdueLandPayments;
    return allPendingLandPayments;
  }, [landPaymentTab, dueTodayLandPayments, dueNext7LandPayments, overdueLandPayments, allPendingLandPayments]);

  const handlePayLandlord = useCallback(
    (row) => {
      setConfirmModal({
        isOpen: true,
        title: `Pay Landlord - Contract #${row.landContractID}`,
        message: `You are about to navigate to the Land Payment page for Landlord "${row.ownerName}" (Contract #${row.landContractID}). Do you wish to proceed?`,
        confirmLabel: 'Pay Now',
        targetTab: 'land-payment',
        customAction: () => {
          sessionStorage.setItem(
            'unsaved_land_payment_form',
            JSON.stringify({
              ownerID: String(row.ownerID),
              landContractID: String(row.landContractID),
              rows: [],
              showEntryForm: true,
            })
          );
          changeTab?.('land-payment');
        },
      });
    },
    [changeTab]
  );

  const landPaymentColumns = [
    {
      key: 'landContractID',
      label: 'Contract No.',
      width: '120px',
      render: (val) => (
        <span
          style={{
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 800,
            fontSize: '12px',
            color: '#049edf',
            background: 'rgba(4, 158, 223, 0.08)',
            padding: '3px 8px',
            borderRadius: '6px',
            display: 'inline-block',
          }}
        >
          Contract #{val}
        </span>
      ),
    },
    {
      key: 'ownerName',
      label: 'Landlord / Owner',
      width: '180px',
      render: (val, row) => (
        <div>
          <div style={{ color: '#1e293b', fontWeight: 800, fontSize: '12.5px' }}>
            {val}
          </div>
          {(row.ownerPhone || row.ownerCity) && (
            <div style={{ color: '#9090a8', fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>
              {[row.ownerPhone, row.ownerCity].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'hoardingLabel',
      label: 'Hoarding / Location',
      render: (val) => (
        <span style={{ color: '#475569', fontSize: '12px', fontWeight: 700 }}>
          {val || '—'}
        </span>
      ),
    },
    {
      key: 'frequency',
      label: 'Frequency',
      width: '110px',
      render: (val) => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: '12px',
            fontFamily: 'Nunito, sans-serif',
            fontSize: '11px',
            fontWeight: 700,
            background: '#f1f5f9',
            color: '#475569',
            border: '1px solid #e2e8f0',
          }}
        >
          {val}
        </span>
      ),
    },
    {
      key: 'nextDueDate',
      label: 'Next Due Date',
      width: '130px',
      render: (val, row) => (
        <span
          style={{
            fontFamily: 'Nunito, sans-serif',
            fontSize: '12px',
            fontWeight: row.isOverdue || row.isDueToday ? 800 : 700,
            color: row.isOverdue ? '#dc2626' : row.isDueToday ? '#d97706' : '#334155',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title={row.isOverdue ? 'Payment is overdue' : row.isDueToday ? 'Payment due today' : ''}
        >
          <Calendar size={12} /> {fmtDate(val)}
        </span>
      ),
    },
    {
      key: 'amountDue',
      label: 'Amount Due',
      width: '120px',
      align: 'right',
      render: (val) => (
        <span
          style={{
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 900,
            fontSize: '13px',
            color: '#16a34a',
          }}
        >
          {fmtFullCurrency(val)}
        </span>
      ),
    },
    {
      key: 'totalPaid',
      label: 'Paid / Total',
      width: '140px',
      align: 'right',
      render: (val, row) => (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>
            {fmtCurrency(val)}
          </div>
          <div style={{ fontSize: '10.5px', color: '#9090a8', fontWeight: 600 }}>
            of {fmtCurrency(row.totalContractValue)}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      width: '105px',
      align: 'center',
      render: (_, row) => (
        <button
          onClick={() => handlePayLandlord(row)}
          style={{
            padding: '5px 12px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 800,
            fontSize: '11.5px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(16, 185, 129, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(16, 185, 129, 0.25)';
          }}
        >
          <CreditCard size={12} /> Pay Now
        </button>
      ),
    },
  ];

  /* ══════════════════════════════════════════════════
     STEP 5: Inventory Utilization (Deduplicated by Hoarding Code)
  ══════════════════════════════════════════════════ */
  const { mostUsedHoardings, leastUsedHoardings } = useMemo(() => {
    const codeCounts = new Map(); // uppercaseKey -> totalCount
    const codeDisplayMap = new Map(); // uppercaseKey -> originalCode
    const codeLocationMap = new Map(); // uppercaseKey -> location

    // 1. Gather all unique hoarding codes and their best locations
    hoardings.forEach((h) => {
      const rawCode = String(h.hoardingCode ?? h.HoardingCode ?? '').trim();
      if (!rawCode) return;
      const key = rawCode.toUpperCase();

      if (!codeDisplayMap.has(key)) {
        codeDisplayMap.set(key, rawCode);
      }
      const loc = getSiteAddress(h, siteMap);
      if (loc && loc !== '—' && (!codeLocationMap.has(key) || codeLocationMap.get(key) === '—')) {
        codeLocationMap.set(key, loc);
      }
    });

    // 2. Count usage from contractHoardingMaps by hoardingCode
    contractHoardingMaps.forEach((item) => {
      const hId = Number(item.hoardingID ?? item.HoardingID ?? 0);
      if (!hId) return;
      const h = hoardingMap.get(hId);
      const rawCode = String(h?.hoardingCode ?? h?.HoardingCode ?? `HD-${hId}`).trim();
      const key = rawCode.toUpperCase();

      if (!codeDisplayMap.has(key)) {
        codeDisplayMap.set(key, rawCode);
        codeLocationMap.set(key, h ? getSiteAddress(h, siteMap) : '—');
      }
      codeCounts.set(key, (codeCounts.get(key) || 0) + 1);
    });

    // 3. Build unique list of one item per hoarding code
    const uniqueList = Array.from(codeDisplayMap.entries()).map(([key, code]) => ({
      id: key,
      hoardingCode: code,
      location: codeLocationMap.get(key) || '—',
      usageCount: codeCounts.get(key) || 0,
    }));

    // Most Used: Top 5 sorted descending by count
    const mostUsed = [...uniqueList]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Least Used: Top 5 sorted ascending by count
    const leastUsed = [...uniqueList]
      .sort((a, b) => a.usageCount - b.usageCount)
      .slice(0, 5)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    return {
      mostUsedHoardings: mostUsed,
      leastUsedHoardings: leastUsed,
    };
  }, [contractHoardingMaps, hoardings, hoardingMap, siteMap]);

  const inventoryColumns = [
    {
      key: 'rank',
      label: '#',
      width: '40px',
      align: 'center',
      render: (val) => (
        <span style={{ fontWeight: 800, color: '#9090a8', fontSize: '11.5px' }}>
          {val}
        </span>
      ),
    },
    {
      key: 'hoardingCode',
      label: 'Hoarding Code',
      width: '130px',
      render: (val) => (
        <span
          style={{
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 800,
            color: '#1e293b',
            background: '#f8fafc',
            padding: '3px 8px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          {val}
        </span>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (val) => (
        <span style={{ color: '#475569', fontSize: '12px', fontWeight: 600 }}>
          {val}
        </span>
      ),
    },
    {
      key: 'usageCount',
      label: 'Usage',
      width: '110px',
      align: 'right',
      render: (val) => (
        <span style={{ fontWeight: 800, color: '#049edf' }}>
          {val} {val === 1 ? 'contract' : 'contracts'}
        </span>
      ),
    },
  ];

  /* ══════════════════════════════════════════════════
     STEP 6: Navigate Action Execution
  ══════════════════════════════════════════════════ */
  const handleConfirmNavigation = () => {
    const { targetTab, targetId, customAction } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false });

    if (customAction && typeof customAction === 'function') {
      customAction();
      return;
    }

    if (targetTab === 'Jobs') {
      if (targetId) sessionStorage.setItem('view_job_id', String(targetId));
      changeTab?.('Jobs');
    } else if (targetTab === 'quotation') {
      if (targetId) sessionStorage.setItem('view_quotation_id', String(targetId));
      changeTab?.('quotation');
    } else if (targetTab === 'land-payment') {
      changeTab?.('land-payment');
    }
  };

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="dashboard-container" style={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999999,
            padding: '12px 18px',
            borderRadius: '12px',
            background: toast.type === 'error' ? '#ef4444' : '#10b981',
            color: '#fff',
            fontFamily: 'Nunito, sans-serif',
            fontSize: '13.5px',
            fontWeight: 800,
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeUp 0.2s ease',
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">
            Welcome back, <strong>{adminName}</strong>!
          </p>
          <span style={{ fontSize: '13px', color: '#9090a8', fontWeight: 600 }}>
            Overview & metrics for {todayFormatted}.
          </span>
        </div>

        <button
          className="refresh-btn"
          onClick={() => loadAllDashboardData(true)}
          disabled={refreshing || loading}
        >
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {apiError && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: '#fef2f2',
            border: '1.5px solid #fecaca',
            color: '#b91c1c',
            fontFamily: 'Nunito, sans-serif',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={16} />
          <span>{apiError}</span>
        </div>
      )}

      {/* ── 2-COLUMN DASHBOARD GRID ── */}
      <div
        className="dashboard-main-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 540px), 1fr))',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        {/* ══════════════════════════════════════════════════
            ROW 1 - LEFT: Expiring Hoarding Contracts
        ══════════════════════════════════════════════════ */}
        <DashboardCard
          title="Expiring Hoarding Contracts"
          icon={CalendarCheck}
          rightContent={
            <div
              style={{
                display: 'flex',
                background: '#f1f5f9',
                padding: '3px',
                borderRadius: '10px',
                gap: '2px',
              }}
            >
              <button
                onClick={() => setExpiringTab('today')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  background: expiringTab === 'today' ? '#ffffff' : 'transparent',
                  color: expiringTab === 'today' ? '#049edf' : '#64748b',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 800,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  boxShadow: expiringTab === 'today' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Closing Today ({closingTodayContracts.length})
              </button>
              <button
                onClick={() => setExpiringTab('next7')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  background: expiringTab === 'next7' ? '#ffffff' : 'transparent',
                  color: expiringTab === 'next7' ? '#049edf' : '#64748b',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 800,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  boxShadow: expiringTab === 'next7' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Closing Next 7 Days ({closingNext7Contracts.length})
              </button>
            </div>
          }
        >
          <DashboardTable
            columns={expiringColumns}
            data={activeExpiringData}
            loading={loading}
            emptyMessage={
              expiringTab === 'today'
                ? 'No hoarding contracts expiring today.'
                : 'No hoarding contracts expiring in the next 7 days.'
            }
            maxHeight="250px"
          />
        </DashboardCard>

        {/* ══════════════════════════════════════════════════
            ROW 1 - RIGHT: Monthly / Yearly Contract Value
        ══════════════════════════════════════════════════ */}
        <DashboardCard
          title="Contract Value Analysis"
          icon={IndianRupee}
          rightContent={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Month Select */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1.5px solid #e0e0f0',
                  fontFamily: 'Nunito, sans-serif',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                  background: '#fff',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="">All Months (Full Year)</option>
                {MONTH_NAMES.map((mName, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {mName}
                  </option>
                ))}
              </select>

              {/* Year Select */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1.5px solid #e0e0f0',
                  fontFamily: 'Nunito, sans-serif',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                  background: '#fff',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {[2023, 2024, 2025, 2026, 2027, 2028].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>

              {/* View / Show / Hide Buttons */}
              {showMonthlyValue && (
                <button
                  onClick={() => setShowMonthlyValue(false)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #e2e8f0',
                    background: '#fff',
                    color: '#64748b',
                    fontFamily: 'Nunito, sans-serif',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  title="Hide contract value"
                >
                  <EyeOff size={12} /> Hide
                </button>
              )}

              <button
                onClick={handleApplyMonthlyFilter}
                style={{
                  padding: '5px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #049edf, #6c63ff)',
                  color: '#fff',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 8px rgba(4, 158, 223, 0.25)',
                }}
              >
                <Eye size={12} /> {showMonthlyValue ? 'Update' : 'View'}
              </button>
            </div>
          }
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '230px',
              padding: '20px',
              textAlign: 'center',
              background: 'linear-gradient(180deg, #fafbfe 0%, #f4f6fb 100%)',
              borderRadius: '12px',
              border: '1px solid #edf0f8',
            }}
          >
            {showMonthlyValue ? (
              <>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    marginBottom: '8px',
                  }}
                >
                  {monthlyFilter.month
                    ? `Contract Value for ${MONTH_NAMES[monthlyFilter.month - 1]} ${monthlyFilter.year}`
                    : `Contract Value for Full Year ${monthlyFilter.year}`}
                </div>

                {monthlyStat.hasData ? (
                  <>
                    <div
                      style={{
                        fontSize: 'clamp(28px, 4.5vw, 42px)',
                        fontWeight: 900,
                        color: '#049edf',
                        fontFamily: 'Nunito, sans-serif',
                        lineHeight: 1.1,
                        marginBottom: '8px',
                        letterSpacing: '-0.5px',
                      }}
                    >
                      {fmtFullCurrency(monthlyStat.totalValue)}
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 14px',
                        borderRadius: '20px',
                        background: '#e8faf3',
                        border: '1px solid #a7f3d0',
                        color: '#065f46',
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: '12.5px',
                        fontWeight: 800,
                      }}
                    >
                      <Calendar size={13} />
                      <span>{monthlyStat.count} {monthlyStat.count === 1 ? 'Contract' : 'Contracts'} Included</span>
                    </div>

                    <button
                      onClick={() => setShowMonthlyValue(false)}
                      style={{
                        marginTop: '14px',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: '#fff',
                        color: '#64748b',
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease',
                      }}
                      title="Hide contract value"
                    >
                      <EyeOff size={12} /> Hide Value
                    </button>
                  </>
                ) : (
                  <div
                    style={{
                      padding: '16px 24px',
                      color: '#94a3b8',
                      fontSize: '14px',
                      fontWeight: 700,
                      fontStyle: 'italic',
                    }}
                  >
                    No contracts for this period
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(4, 158, 223, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#049edf',
                    marginBottom: '12px',
                  }}
                >
                  <IndianRupee size={24} />
                </div>
                <div
                  style={{
                    fontFamily: 'Nunito, sans-serif',
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#334155',
                    marginBottom: '4px',
                  }}
                >
                  Monthly Value Analysis
                </div>
                <p
                  style={{
                    fontFamily: 'Nunito, sans-serif',
                    fontSize: '12px',
                    color: '#9090a8',
                    margin: '0 0 16px 0',
                    maxWidth: '260px',
                    lineHeight: 1.4,
                  }}
                >
                  Pick a Month & Year and click <strong>View</strong> to display total contract value.
                </p>
                <button
                  onClick={handleApplyMonthlyFilter}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #049edf, #6c63ff)',
                    color: '#fff',
                    fontFamily: 'Nunito, sans-serif',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(4, 158, 223, 0.28)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Eye size={14} /> View Contract Value
                </button>
              </div>
            )}
          </div>
        </DashboardCard>

        {/* ══════════════════════════════════════════════════
            ROW 2 - LEFT: Workflow Overview (Jobs In-Progress Only)
        ══════════════════════════════════════════════════ */}
        <DashboardCard
          title="Jobs Overview"
          icon={Briefcase}
          rightContent={
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#2563eb',
                background: '#eff6ff',
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1px solid #bfdbfe',
              }}
            >
              {inProgressJobs.length} Active
            </span>
          }
        >
          <DashboardTable
            columns={jobsColumns}
            data={inProgressJobs}
            loading={loading}
            getRowStyle={(row) =>
              row.isOverdue
                ? {
                    backgroundColor: '#fff1f2',
                    hoverBackground: '#fee2e2',
                  }
                : {}
            }
            emptyMessage="No active jobs found."
            maxHeight="250px"
          />
        </DashboardCard>

        {/* ══════════════════════════════════════════════════
            ROW 2 - RIGHT: Sales Pipeline (Quotations Pending Performa)
        ══════════════════════════════════════════════════ */}
        <DashboardCard
          title="Quotation (Pending Performa)"
          icon={TrendingUp}
          rightContent={
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#16a34a',
                background: '#f0fdf4',
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1px solid #bbf7d0',
              }}
            >
              {pendingQuotations.length} Pending
            </span>
          }
        >
          <DashboardTable
            columns={salesPipelineColumns}
            data={pendingQuotations}
            loading={loading}
            emptyMessage="No quotations currently pending Proforma Invoice creation."
            maxHeight="250px"
          />
        </DashboardCard>
      </div>

      {/* ══════════════════════════════════════════════════
          ROW 2.5: Landlord Payment Due (LandContract Next Due Payments)
      ══════════════════════════════════════════════════ */}
      <DashboardCard
        title="Landlord Payment Due"
        icon={Landmark}
        style={{ marginBottom: '24px' }}
        rightContent={
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setLandPaymentTab('today')}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1.5px solid',
                borderColor: landPaymentTab === 'today' ? '#dc2626' : '#e2e8f0',
                background: landPaymentTab === 'today' ? '#fee2e2' : '#fff',
                color: landPaymentTab === 'today' ? '#991b1b' : '#64748b',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              Due Today
              <span
                style={{
                  background: landPaymentTab === 'today' ? '#dc2626' : '#94a3b8',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontWeight: 800,
                }}
              >
                {dueTodayLandPayments.length}
              </span>
            </button>
            <button
              onClick={() => setLandPaymentTab('next7')}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1.5px solid',
                borderColor: landPaymentTab === 'next7' ? '#049edf' : '#e2e8f0',
                background: landPaymentTab === 'next7' ? '#e0f4fc' : '#fff',
                color: landPaymentTab === 'next7' ? '#0369a1' : '#64748b',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              Due Next 7 Days
              <span
                style={{
                  background: landPaymentTab === 'next7' ? '#049edf' : '#94a3b8',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontWeight: 800,
                }}
              >
                {dueNext7LandPayments.length}
              </span>
            </button>
            <button
              onClick={() => setLandPaymentTab('overdue')}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1.5px solid',
                borderColor: landPaymentTab === 'overdue' ? '#ea580c' : '#e2e8f0',
                background: landPaymentTab === 'overdue' ? '#ffedd5' : '#fff',
                color: landPaymentTab === 'overdue' ? '#c2410c' : '#64748b',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              Overdue
              <span
                style={{
                  background: landPaymentTab === 'overdue' ? '#ea580c' : '#94a3b8',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontWeight: 800,
                }}
              >
                {overdueLandPayments.length}
              </span>
            </button>
            <button
              onClick={() => setLandPaymentTab('all')}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1.5px solid',
                borderColor: landPaymentTab === 'all' ? '#7c3aed' : '#e2e8f0',
                background: landPaymentTab === 'all' ? '#f5f3ff' : '#fff',
                color: landPaymentTab === 'all' ? '#6d28d9' : '#64748b',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              All Due
              <span
                style={{
                  background: landPaymentTab === 'all' ? '#7c3aed' : '#94a3b8',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontWeight: 800,
                }}
              >
                {allPendingLandPayments.length}
              </span>
            </button>
          </div>
        }
      >
        <DashboardTable
          columns={landPaymentColumns}
          data={activeLandPaymentData}
          loading={loading}
          getRowStyle={(row) =>
            row.isOverdue
              ? { backgroundColor: '#fff1f2', hoverBackground: '#fee2e2' }
              : row.isDueToday
              ? { backgroundColor: '#fffbeb', hoverBackground: '#fef3c7' }
              : {}
          }
          emptyMessage={
            landPaymentTab === 'today'
              ? 'No landlord payments due today.'
              : landPaymentTab === 'next7'
              ? 'No landlord payments due in the next 7 days.'
              : landPaymentTab === 'overdue'
              ? 'No overdue landlord payments.'
              : 'No pending landlord payments found.'
          }
          maxHeight="280px"
        />
      </DashboardCard>

      {/* ══════════════════════════════════════════════════
          ROW 3: Inventory Utilization (Most / Least Used Hoardings)
      ══════════════════════════════════════════════════ */}
      <DashboardCard
        title="Hoarding Usage Overview"
        icon={Layers}
        style={{ marginBottom: '24px' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
            gap: '24px',
          }}
        >
          {/* Most Used Hoardings (Top 5) */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: 'rgba(26, 158, 110, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1a9e6e',
                }}
              >
                <TrendingUp size={14} />
              </div>
              <h4
                style={{
                  margin: 0,
                  fontFamily: 'Nunito, sans-serif',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  color: '#1e293b',
                }}
              >
                Most Used Hoardings (Top 5)
              </h4>
            </div>

            <DashboardTable
              columns={inventoryColumns}
              data={mostUsedHoardings}
              loading={loading}
              emptyMessage="No hoarding usage data found."
              maxHeight="220px"
            />
          </div>

          {/* Least Used Hoardings (Top 5) */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: 'rgba(232, 64, 64, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#e84040',
                }}
              >
                <TrendingDown size={14} />
              </div>
              <h4
                style={{
                  margin: 0,
                  fontFamily: 'Nunito, sans-serif',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  color: '#1e293b',
                }}
              >
                Least Used Hoardings (Top 5)
              </h4>
            </div>

            <DashboardTable
              columns={inventoryColumns}
              data={leastUsedHoardings}
              loading={loading}
              emptyMessage="No hoarding usage data found."
              maxHeight="220px"
            />
          </div>
        </div>
      </DashboardCard>

      {/* ── Confirmation Modal ── */}
      <ConfirmNavigateModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        subtitle={confirmModal.subtitle}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        isDanger={Boolean(confirmModal.isDanger)}
        onConfirm={handleConfirmNavigation}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}