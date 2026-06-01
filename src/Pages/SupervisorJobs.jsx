import { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Briefcase, Plus, Search, RefreshCw, X, AlertCircle, Check,
  ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight,
  ChevronLeft, ChevronRight, Filter, Loader2, Eye,
  Calendar, User, FileText, CheckCircle, Clock, Circle,
  Hash, Layers, MapPin, ClipboardList, ThumbsUp,
} from 'lucide-react';
import './Common1.css';
import { apiService } from '../api/api';

/* ─── constants ─── */
const PAGE_SIZE_OPTIONS = [10, 12, 15, 20];

const JOB_STATUS_STYLE = {
  'Open':        { bg: '#eaf5ff', color: '#049edf',  icon: Circle       },
  'In Progress': { bg: '#fff8e1', color: '#e08a00',  icon: Clock        },
  'Completed':   { bg: '#e8faf3', color: '#1a9e6e',  icon: CheckCircle  },
  'Accepted':    { bg: '#f0eaff', color: '#6c3fc7',  icon: CheckCircle  },
};

function getStatusStyle(status) {
  return JOB_STATUS_STYLE[status] ?? { bg: '#f0f0f8', color: '#7878a0', icon: Circle };
}

/* ─── normalize ─── */
function normalizeJob(raw) {
  return {
    jobRequestID:         raw.jobRequestID        ?? raw.JobRequestID        ?? 0,
    customerID:           raw.customerID          ?? raw.CustomerID          ?? 0,
    customerContractID:   raw.customerContractID  ?? raw.CustomerContractID  ?? 0,
    jobType:              raw.jobType             ?? raw.JobType             ?? '',
    jobDescription:       raw.jobDescription      ?? raw.JobDescription      ?? '',
    iD:                   raw.iD                  ?? raw.ID                  ?? '',
    noofHoardings:        raw.noofHoardings        ?? raw.NoofHoardings        ?? '0',
    rateperSQFT:          raw.rateperSQFT         ?? raw.RateperSQFT         ?? 0,
    totalAreaSQFT:        raw.totalAreaSQFT        ?? raw.TotalAreaSQFT        ?? 0,
    targetCompletionDate: raw.targetCompletionDate ?? raw.TargetCompletionDate ?? '',
    actualCompletionDate: raw.actualCompletionDate ?? raw.ActualCompletionDate ?? '',
    jobStatus:            raw.jobStatus           ?? raw.JobStatus           ?? 'Open',
    jobCreateDTTM:        raw.jobCreateDTTM       ?? raw.JobCreateDTTM       ?? '',
    supervisorAcceptDttm: raw.supervisorAcceptDttm ?? raw.SupervisorAcceptDttm ?? '',
    tasks:                Array.isArray(raw.tasks) ? raw.tasks : [],
  };
}

function normalizeTask(raw) {
  return {
    jobTaskID:            raw.jobTaskID           ?? raw.JobTaskID           ?? 0,
    jobRequestID:         raw.jobRequestID        ?? raw.JobRequestID        ?? 0,
    hoardingID:           raw.hoardingID          ?? raw.HoardingID          ?? 0,
    status:               raw.status              ?? raw.Status              ?? 'Open',
    actualCompletionDate: raw.actualCompletionDate ?? raw.ActualCompletionDate ?? '',
    submitDTTM:           raw.submitDTTM          ?? raw.SubmitDTTM          ?? '',
  };
}

/* ─── helpers ─── */
function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
}

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
   TASK STATUS MINI-BADGE
═══════════════════════════════════════════ */
function TaskBadge({ status }) {
  const s = getStatusStyle(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20,
      background: s.bg, color: s.color,
      fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 800,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}

/* ═══════════════════════════════════════════
   TASKS PROGRESS CHIP  (compact, for table)
═══════════════════════════════════════════ */
function TasksChip({ tasks }) {
  if (!tasks?.length) return <span className="pg-td__dash">—</span>;
  const done = tasks.filter(t => t.status === 'Completed').length;
  const allDone = done === tasks.length;
  return (
    <span className={`jb-tasks-chip${allDone ? ' jb-tasks-chip--done' : ''}`}>
      <ClipboardList size={10} />
      {done}/{tasks.length}
    </span>
  );
}

/* ═══════════════════════════════════════════
   VIEW MODAL
═══════════════════════════════════════════ */
function JobViewModal({ job, onClose, onAccept, accepting }) {
  const st = getStatusStyle(job.jobStatus);
  const done        = job.tasks.filter(t => t.status === 'Completed').length;
  const inProg      = job.tasks.filter(t => t.status === 'In Progress').length;
  const open        = job.tasks.filter(t => t.status === 'Open').length;
  const totalTasks  = job.tasks.length;
  const pct         = totalTasks > 0 ? Math.round((done / totalTasks) * 100) : 0;
  const canAccept   = job.jobStatus !== 'Accepted' && job.jobStatus !== 'Completed';

  return ReactDOM.createPortal(
    <div className="pg-overlay pg-overlay--view" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal pg-modal--view" style={{ maxWidth: 560 }}>

        {/* Banner */}
        <div style={{
          background: 'linear-gradient(135deg,#049edf 0%,#6c63ff 100%)',
          borderRadius: '20px 20px 0 0', padding: '22px 22px 18px', position: 'relative',
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          >
            <X size={14} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.36)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Briefcase size={22} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3 }}>
                Job #{job.jobRequestID}
              </div>
              <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 16, fontWeight: 900, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {job.jobType || 'Job Request'}
              </div>
            </div>
          </div>

          {/* Status pill + Accept button */}
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#fff',
            }}>
              {job.jobStatus}
            </span>
            {job.iD && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 20,
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)',
              }}>
                <Hash size={10} /> {job.iD}
              </span>
            )}
            {/* ── ACCEPT BUTTON (modal) ── */}
            {canAccept && (
              <button
                onClick={() => onAccept(job)}
                disabled={accepting}
                style={{
                  marginLeft: 'auto',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 14px', borderRadius: 20,
                  background: accepting ? 'rgba(255,255,255,0.2)' : '#fff',
                  border: 'none', cursor: accepting ? 'not-allowed' : 'pointer',
                  fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800,
                  color: '#6c3fc7',
                  transition: 'opacity 0.15s',
                  opacity: accepting ? 0.7 : 1,
                }}
              >
                {accepting ? <Loader2 size={12} className="pg-spin" /> : <ThumbsUp size={12} />}
                {accepting ? 'Accepting…' : 'Accept Job'}
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="pg-view__body">

          {/* Task progress section */}
          <div style={{ marginBottom: 4 }}>
            <div className="pg-view__section-label">Task Progress</div>
          </div>

          {totalTasks === 0 ? (
            <div style={{
              padding: '16px', background: '#f8f8fd', borderRadius: 11,
              border: '1px solid #eeeefc', textAlign: 'center',
              fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#b0b0c8', fontWeight: 700,
            }}>
              No tasks assigned for this job yet.
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div style={{ padding: '14px 16px', background: '#f8f8fd', borderRadius: 11, border: '1px solid #eeeefc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#4a5568' }}>
                    Overall completion
                  </span>
                  <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 900, color: pct === 100 ? '#16a34a' : '#049edf' }}>
                    {pct}%
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 20, background: '#e8e8f4', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 20, transition: 'width 0.4s ease',
                    width: `${pct}%`,
                    background: pct === 100
                      ? 'linear-gradient(90deg,#16a34a,#22c55e)'
                      : 'linear-gradient(90deg,#049edf,#6c63ff)',
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total',       val: totalTasks, color: '#1a1a2e' },
                    { label: 'Completed',   val: done,       color: '#16a34a' },
                    { label: 'In Progress', val: inProg,     color: '#e08a00' },
                    { label: 'Open',        val: open,       color: '#049edf' },
                  ].map(c => (
                    <div key={c.label} style={{ textAlign: 'center', minWidth: 48 }}>
                      <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 18, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.val}</div>
                      <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10, color: '#9090a8', fontWeight: 700, marginTop: 2 }}>{c.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task list */}
              <div style={{ marginTop: 4 }}>
                <div className="pg-view__section-label pg-view__section-label--mt">Task Details</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {job.tasks.map((t, i) => {
                  const ts = getStatusStyle(t.status);
                  return (
                    <div key={t.jobTaskID || i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', background: '#f8f8fd',
                      borderRadius: 9, border: '1px solid #eeeefc',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: ts.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <ts.icon size={13} color={ts.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>
                          Task #{t.jobTaskID} &nbsp;·&nbsp;
                          <span style={{ color: '#049edf' }}>Hoarding #{t.hoardingID}</span>
                        </div>
                        {t.actualCompletionDate && (
                          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10, color: '#9090a8', fontWeight: 600, marginTop: 1 }}>
                            Completed: {fmtDate(t.actualCompletionDate)}
                          </div>
                        )}
                      </div>
                      <TaskBadge status={t.status} />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Job details */}
          <div style={{ marginTop: 4 }}>
            <div className="pg-view__section-label pg-view__section-label--mt">Job Details</div>
          </div>

          {[
            { label: 'Job Description',   value: job.jobDescription,  icon: FileText  },
            { label: 'No. of Hoardings',  value: job.noofHoardings,   icon: Layers    },
            { label: 'Rate / SQFT',       value: job.rateperSQFT ? `₹${job.rateperSQFT}` : '—', icon: Hash },
            { label: 'Total Area (SQFT)', value: job.totalAreaSQFT || '—', icon: MapPin   },
            { label: 'Target Date',       value: fmtDate(job.targetCompletionDate), icon: Calendar },
            { label: 'Actual Date',       value: fmtDate(job.actualCompletionDate), icon: Calendar },
            { label: 'Created On',        value: fmtDate(job.jobCreateDTTM),        icon: Calendar },
          ].map(row => (
            <div key={row.label} className="pg-info-row">
              <div className="pg-info-row__icon pg-info-row__icon--highlight">
                <row.icon size={14} color="#049edf" />
              </div>
              <div className="pg-info-row__content">
                <div className="pg-info-row__label">{row.label}</div>
                <div className="pg-info-row__value">{row.value || '—'}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pg-view__foot">
          <button className="pg-btn-cancel" onClick={onClose}>Close</button>
        </div>

      </div>
    </div>,
    document.body
  );
}

/* ─── Mobile Job Card ─── */
function JobCard({ job, onView, onAccept, accepting }) {
  const st = getStatusStyle(job.jobStatus);
  const canAccept = job.jobStatus !== 'Accepted' && job.jobStatus !== 'Completed';
  return (
    <div className="pg-card">
      <div className="pg-card__header">
        <div className="pg-card__title-wrap">
          <div className="pg-card__title">{job.jobType || `Job #${job.jobRequestID}`}</div>
          <div className="pg-card__subtitle">#{job.jobRequestID}</div>
        </div>
        <div className="pg-card__actions" style={{ display: 'flex', gap: 6 }}>
          {canAccept && (
            <button
              className="pg-card__btn-view"
              style={{ background: 'rgba(108,63,199,0.1)', color: '#6c3fc7' }}
              onClick={() => onAccept(job)}
              disabled={accepting}
              title="Accept Job"
            >
              {accepting ? <Loader2 size={12} className="pg-spin" /> : <ThumbsUp size={12} />}
            </button>
          )}
          <button className="pg-card__btn-view" onClick={() => onView(job)}><Eye size={13} /></button>
        </div>
      </div>
      <div className="pg-card__body">
        {job.jobDescription && (
          <div className="pg-card__row">
            <FileText size={12} color="#c0c0d8" className="pg-card__row-icon" />
            <span className="pg-card__row-text">{job.jobDescription}</span>
          </div>
        )}
        <div className="pg-card__row">
          <Calendar size={12} color="#c0c0d8" className="pg-card__row-icon" />
          <span className="pg-card__row-text--ellipsis">{fmtDate(job.targetCompletionDate)}</span>
        </div>
        <div className="pg-card__grid2">
          <div className="pg-card__grid-cell">
            <ClipboardList size={11} color="#c0c0d8" />
            <span className="pg-card__grid-text">
              {job.tasks.length > 0
                ? `${job.tasks.filter(t => t.status === 'Completed').length}/${job.tasks.length} tasks`
                : 'No tasks'}
            </span>
          </div>
          <div className="pg-card__grid-cell">
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color, fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800 }}>
              {job.jobStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SUPERVISOR JOBS PAGE
═══════════════════════════════════════════ */
export default function SupervisorJobsPage() {
  const [jobs,         setJobs]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState('');
  const [viewJob,      setViewJob]      = useState(null);
  const [accepting,    setAccepting]    = useState(false);
  const [acceptingId,  setAcceptingId]  = useState(null);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey,      setSortKey]      = useState('jobRequestID');
  const [sortDir,      setSortDir]      = useState('desc');
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState(12);

  const tableRef = useRef(null);

  /* ── Fetch jobs ── */
const fetchJobs = useCallback(async () => {
  setLoading(true); setFetchError('');
  try {
    const userId = parseInt(localStorage.getItem('userId') || '0', 10);
    const res    = await apiService.getJobRequestsByUserId(userId);
    const list   = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    const normalized = list.map(normalizeJob);

    const withTasks = await Promise.all(
      normalized.map(async (job) => {
        try {
          const tRes = await apiService.getJobTasksByJobRequestId(job.jobRequestID);
          
          // ── ADD THIS TEMPORARILY TO SEE WHAT THE API RETURNS ──
          console.log(`Job ${job.jobRequestID} raw task response:`, tRes);

const tList = Array.isArray(tRes)
  ? tRes
  : Array.isArray(tRes?.data)
    ? tRes.data
    : Array.isArray(tRes?.result)
      ? tRes.result
      : Array.isArray(tRes?.jobTasks)
        ? tRes.jobTasks
        : Array.isArray(tRes?.tasks)
          ? tRes.tasks
          : typeof tRes === 'object' && tRes !== null
            // last resort: grab the first array-valued key
            ? Object.values(tRes).find(v => Array.isArray(v)) ?? []
            : [];

          console.log(`Job ${job.jobRequestID} parsed tasks:`, tList);

          return { ...job, tasks: tList.map(normalizeTask) };
        } catch (err) {
          console.warn(`Tasks fetch failed for job ${job.jobRequestID}:`, err?.message, err?.response);
          return job;
        }
      })
    );
    setJobs(withTasks);
  } catch (err) {
    setFetchError(err?.response?.data?.message || err?.message || 'Failed to load jobs.');
  } finally { setLoading(false); }
}, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  /* ── Accept job ── */
/* ── Accept job ── */
const handleAccept = useCallback(async (job) => {
  if (accepting) return;
  setAccepting(true);
  setAcceptingId(job.jobRequestID);
  try {
    // Capture the exact moment the supervisor clicks Accept
    const acceptedAt = new Date().toISOString();

    await apiService.updateJobRequest({
      ...job,
      jobStatus: 'Accepted',
      supervisorAcceptDttm: acceptedAt,
    });

    // Update local state with the same timestamp
    setJobs(prev => prev.map(j =>
      j.jobRequestID === job.jobRequestID
        ? { ...j, jobStatus: 'Accepted', supervisorAcceptDttm: acceptedAt }
        : j
    ));

    setViewJob(prev => prev?.jobRequestID === job.jobRequestID
      ? { ...prev, jobStatus: 'Accepted', supervisorAcceptDttm: acceptedAt }
      : prev
    );
  } catch (err) {
    alert(err?.response?.data?.message || err?.message || 'Failed to accept job.');
  } finally {
    setAccepting(false);
    setAcceptingId(null);
  }
}, [accepting]);

  /* ── Filter + sort ── */
  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchSearch =
      String(j.jobRequestID).includes(q)           ||
      (j.jobType        || '').toLowerCase().includes(q) ||
      (j.jobDescription || '').toLowerCase().includes(q) ||
      (j.jobStatus      || '').toLowerCase().includes(q) ||
      (j.iD             || '').toLowerCase().includes(q);
    const matchStatus =
      statusFilter === 'all' || j.jobStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 :  1;
    if (av > bv) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  /* ── Stat counts ── */
  const openCount     = jobs.filter(j => j.jobStatus === 'Open').length;
  const inProgCount   = jobs.filter(j => j.jobStatus === 'In Progress').length;
  const doneCount     = jobs.filter(j => j.jobStatus === 'Completed').length;
  const acceptedCount = jobs.filter(j => j.jobStatus === 'Accepted').length;

  const COLS = [
    { key: 'jobRequestID',         label: 'Job ID',      w: '8%'  },
    { key: 'jobType',              label: 'Job Type',    w: '13%' },
    { key: 'jobDescription',       label: 'Description', w: '16%', tabletHide: true },
    { key: 'noofHoardings',        label: 'Hoardings',   w: '8%'  },
    { key: 'targetCompletionDate', label: 'Target Date', w: '11%', tabletHide: true },
    { key: '_tasks',               label: 'Tasks',       w: '8%',  noSort: true },
    { key: 'jobStatus',            label: 'Status',      w: '11%' },
    { key: '_action',              label: 'Actions',     w: '11%', noSort: true },
  ];

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
      <Loader2 size={32} color="#049edf" className="pg-spin" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>Loading your jobs…</span>
    </div>
  );

  if (fetchError) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
      <AlertCircle size={28} color="#ef4444" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#ef4444', fontSize: 14 }}>{fetchError}</span>
      <button className="pg-btn-add" onClick={fetchJobs}><RefreshCw size={13} /> Retry</button>
    </div>
  );

  return (
    <>
      <div className="pg-page">

        {/* PAGE HEADER */}
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">My Jobs</h1>
            <p className="pg-header__subtitle">
              All job requests <strong>assigned to you</strong>.
            </p>
          </div>
          <button className="pg-pg-btn" onClick={fetchJobs} title="Refresh" style={{ width: 38, height: 38 }}>
            <RefreshCw size={14} />
          </button>
        </div>

      
        {/* TABLE CONTAINER */}
        <div className="pg-container">

          {/* TOOLBAR */}
          <div className="pg-toolbar">
            <div className="pg-toolbar__inner">
              <div className="pg-toolbar__count">
                <Briefcase size={14} color="#9090a8" />
                <span><strong>{filtered.length}</strong> job{filtered.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="pg-search-box">
                <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
                <input
                  placeholder="Search by type, description, status…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
              </div>
              {/* Status filter pills */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['all', 'Open', 'Accepted', 'In Progress', 'Completed'].map(f => (
                  <button
                    key={f}
                    onClick={() => { setStatusFilter(f); setPage(1); }}
                    style={{
                      padding: '5px 11px', borderRadius: 20, whiteSpace: 'nowrap',
                      border: statusFilter === f ? '1.5px solid #049edf' : '1.5px solid #e8e8f4',
                      background: statusFilter === f ? 'rgba(4,158,223,0.08)' : '#f8f8fd',
                      color: statusFilter === f ? '#049edf' : '#7878a0',
                      fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {f === 'all' ? 'All' : f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DESKTOP TABLE */}
          <div className="pg-desktop-table">
            <table className="pg-table" ref={tableRef}>
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      style={{ width: col.w }}
                      className={[
                        'pg-th',
                        col.noSort ? '' : 'pg-th--sort',
                        col.tabletHide ? 'pg-tablet-hide' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => !col.noSort && handleSort(col.key)}
                    >
                      <div className="pg-th__inner">
                        {col.label}
                        {!col.noSort
                          ? <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                          : <Filter size={10} color="#d0d0e4" style={{ marginLeft: 5 }} />
                        }
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="pg-td pg-empty" style={{ maxWidth: 'none' }}>
                      <div className="pg-empty__inner">
                        <Briefcase size={36} color="#d0d0e8" />
                        <span className="pg-empty__label">No jobs found</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(job => {
                  const st = getStatusStyle(job.jobStatus);
                  const canAccept = job.jobStatus !== 'Accepted' && job.jobStatus !== 'Completed';
                  const isAccepting = acceptingId === job.jobRequestID && accepting;
                  return (
                    <tr key={job.jobRequestID} className="pg-tr">
                      <td className="pg-td">
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, color: '#049edf', fontSize: 12 }}>
                          #{job.jobRequestID}
                        </span>
                      </td>
                      <td className="pg-td">
                        <div className="pg-td__primary">{job.jobType || '—'}</div>
                        {job.iD && <div className="pg-td__secondary">{job.iD}</div>}
                      </td>
                      <td className="pg-td pg-td--overflow pg-tablet-hide">
                        <span className="pg-td__ellipsis" title={job.jobDescription}>{job.jobDescription || '—'}</span>
                      </td>
                      <td className="pg-td">
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: 'rgba(108,99,255,0.08)', color: '#6c63ff',
                          padding: '2px 9px', borderRadius: 20, fontWeight: 800, fontSize: 11,
                        }}>
                          <Layers size={10} /> {job.noofHoardings || '—'}
                        </span>
                      </td>
                      <td className="pg-td pg-tablet-hide">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4a5568', fontSize: 12 }}>
                          <Calendar size={11} color="#c0c0d8" /> {fmtDate(job.targetCompletionDate)}
                        </span>
                      </td>
                      <td className="pg-td">
                        <TasksChip tasks={job.tasks} />
                      </td>
                      <td className="pg-td">
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 20,
                          background: st.bg, color: st.color,
                          fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800,
                        }}>
                          {job.jobStatus}
                        </span>
                      </td>
                      <td className="pg-td">
                        <div className="pg-action-wrap" style={{ display: 'flex', gap: 5 }}>
                          {/* ── ACCEPT BUTTON (table) ── */}
                          {canAccept && (
                            <button
                              className="pg-btn-view"
                              style={{
                                background: 'rgba(108,63,199,0.08)',
                                color: '#6c3fc7',
                                border: '1px solid rgba(108,63,199,0.2)',
                              }}
                              onClick={() => handleAccept(job)}
                              disabled={isAccepting}
                              title="Accept Job"
                            >
                              {isAccepting
                                ? <Loader2 size={12} className="pg-spin" />
                                : <ThumbsUp size={12} />
                              }
                            </button>
                          )}
                          <button className="pg-btn-view" onClick={() => setViewJob(job)} title="View">
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="pg-mobile-cards">
            {paginated.length === 0
              ? (
                <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                  <Briefcase size={36} color="#d0d0e8" />
                  <span className="pg-empty__label">No jobs found</span>
                </div>
              )
              : paginated.map(job => (
                <JobCard
                  key={job.jobRequestID}
                  job={job}
                  onView={setViewJob}
                  onAccept={handleAccept}
                  accepting={acceptingId === job.jobRequestID && accepting}
                />
              ))
            }
          </div>

          {/* PAGINATION */}
          <div className="pg-pagination">
            <div className="pg-pagination__left">
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
              {pageNums.map((p, i) =>
                p === '…'
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

        </div>
      </div>

      {viewJob && (
        <JobViewModal
          job={viewJob}
          onClose={() => setViewJob(null)}
          onAccept={handleAccept}
          accepting={acceptingId === viewJob?.jobRequestID && accepting}
        />
      )}
    </>
  );
}