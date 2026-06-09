import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  Briefcase, Search, RefreshCw, X, AlertCircle, Check,
  ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight,
  ChevronLeft, ChevronRight, Loader2,
  Calendar, FileText, CheckCircle2, Clock,
  Layers, ClipboardList, ThumbsUp, UserPlus,
  Trash2, Star, Image, ZoomIn, Hash, MapPin,
  ArrowLeft, User, Users, Building2, LayoutGrid,
} from 'lucide-react';
import './Common1.css';
import { apiService, API_ROOT_URL } from '../api/api';


/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 12, 15, 20];

const JOB_STATUS_COLORS = {
  'Open': { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  'Accepted': { bg: '#fefce8', color: '#ca8a04', border: '#fde68a' },
  'In Progress': { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Submitted': { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'Completed': { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
};
const TASK_STATUS_COLORS = {
  'Open': { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  'In Progress': { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Submitted': { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'Completed': { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
};

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function extractArray(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.$values)) return res.$values;
  if (res && typeof res === 'object') {
    const found = Object.values(res).find(v => Array.isArray(v));
    return found || [];
  }
  return [];
}
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function normalizeJob(raw) {
  return {
    jobRequestID: raw.jobRequestID || raw.JobRequestID || 0,
    customerID: raw.customerID || raw.CustomerID || 0,
    customerContractID: raw.customerContractID || raw.CustomerContractID || 0,
    jobType: raw.jobType || raw.JobType || '',
    jobDescription: raw.jobDescription || raw.JobDescription || '',
    iD: raw.iD || raw.ID || '',
    noofHoardings: raw.noofHoardings || raw.NoofHoardings || '0',
    rateperSQFT: raw.rateperSQFT || raw.RateperSQFT || 0,
    totalAreaSQFT: raw.totalAreaSQFT || raw.TotalAreaSQFT || 0,
    targetCompletionDate: (raw.targetCompletionDate || raw.TargetCompletionDate || '').split('T')[0],
    jobStatus: raw.jobStatus || raw.JobStatus || 'Open',
    jobCreateDTTM: raw.jobCreateDTTM || raw.JobCreateDTTM || '',
    supervisorAcceptDttm: raw.supervisorAcceptDttm || raw.SupervisorAcceptDttm || '',
    tasks: [],
  };
}
function normalizeTask(raw) {
  return {
    jobTaskID: raw.jobTaskID || raw.JobTaskID || 0,
    jobRequestID: raw.jobRequestID || raw.JobRequestID || 0,
    hoardingID: raw.hoardingID || raw.HoardingID || 0,
    status: raw.status || raw.Status || 'Open',
    actualCompletionDate: (raw.actualCompletionDate || raw.ActualCompletionDate || '').split('T')[0],
  };
}
function normalizeAssignment(raw) {
  return {
    jobTaskAssignID: raw.jobTaskAssignID || raw.JobTaskAssignID || 0,
    jobTaskID: raw.jobTaskID || raw.JobTaskID || 0,
    jobRequestID: raw.jobRequestID || raw.JobRequestID || 0,
    hoardingID: raw.hoardingID || raw.HoardingID || 0,
    id: raw.id || raw.ID || 0,
    isPrimary: raw.isPrimary || raw.IsPrimary || false,
  };
}
function avatarColor(name) {
  const colors = [
    ['#dbeafe', '#1d4ed8'], ['#fce7f3', '#be185d'], ['#dcfce7', '#16a34a'],
    ['#fef3c7', '#d97706'], ['#ede9fe', '#7c3aed'], ['#ffedd5', '#ea580c'],
    ['#f0fdf4', '#15803d'], ['#fff1f2', '#be123c'],
  ];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

/* ─────────────────────────────────────────
   BADGES
───────────────────────────────────────── */
function JobStatusBadge({ status }) {
  const s = JOB_STATUS_COLORS[status] || JOB_STATUS_COLORS['Open'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {status || 'Open'}
    </span>
  );
}
function TaskStatusBadge({ status }) {
  const s = TASK_STATUS_COLORS[status] || TASK_STATUS_COLORS['Open'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 20, fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
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

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`qt-toast qt-toast--${type}`}>
      {type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {msg}
    </div>
  );
}

/* ═══════════════════════════════════════════
   BANNER STRIP
═══════════════════════════════════════════ */
function BannerStrip({ customerContractID }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);


  useEffect(() => {
    if (!customerContractID) { setLoading(false); return; }
    apiService.getContractBannerImages(customerContractID)
      .then(setImages).catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, [customerContractID]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#9090a8' }}>
      <Loader2 size={12} className="pg-spin" color="#049edf" /> Loading banner images…
    </div>
  );
  if (!images.length) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, background: '#f8f8fd', border: '1.5px dashed #e0e0f0', fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#b0b0c8', fontWeight: 600 }}>
      <Image size={14} color="#c0c0d8" /> No banner designs uploaded for this contract
    </div>
  );

  return (
    <>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {images.map((img, i) => (
          <div key={img.custContractAttachID || i}
            onClick={() => setLightbox(i)}
            style={{ flexShrink: 0, width: 160, height: 100, borderRadius: 10, overflow: 'hidden', cursor: 'zoom-in', border: '2px solid #e8e8f4', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#049edf'; e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(4,158,223,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8f4'; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'; }}>
            <img src={img.imageUrl} alt={img.contractFilename}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={e => { e.currentTarget.parentElement.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;background:#f0f0f8;color:#c0c0d8">🖼️</div>'; }} />
          </div>
        ))}
      </div>
      {lightbox !== null && ReactDOM.createPortal(
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
          {lightbox > 0 && <button onClick={e => { e.stopPropagation(); setLightbox(i => i - 1); }} style={{ position: 'absolute', left: 16, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronLeft size={18} /></button>}
          <div onClick={e => e.stopPropagation()}>
            <img src={images[lightbox]?.imageUrl} alt="" style={{ maxWidth: '90vw', maxHeight: '82vh', borderRadius: 12, objectFit: 'contain', display: 'block', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
            <div style={{ textAlign: 'center', marginTop: 10, fontFamily: 'Nunito,sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{lightbox + 1} / {images.length}</div>
          </div>
          {lightbox < images.length - 1 && <button onClick={e => { e.stopPropagation(); setLightbox(i => i + 1); }} style={{ position: 'absolute', right: 16, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronRight size={18} /></button>}
        </div>,
        document.body
      )}
    </>
  );
}
function TaskPhotosSection({ jobTaskID }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null); // { url, index }
  // const API_BASE = 'https://api.jalaram-ad.ashtamtechnologies.com';


  useEffect(() => {
    if (!jobTaskID) { setLoading(false); return; }
    apiService.getAllJobTaskAttachments()
      .then(res => {
        const all = Array.isArray(res) ? res
          : Array.isArray(res?.data) ? res.data
            : Array.isArray(res?.$values) ? res.$values : [];

        console.log('[ATTACH] total:', all.length);
        console.log('[ATTACH] first item:', JSON.stringify(all[0]));

        const mine = all.filter(a => {
          const id = Number(
            a.jobTaskID ?? a.JobTaskID ??
            a.jobtaskid ?? a.job_task_id ?? 0
          );
          return id === Number(jobTaskID);
        });

        console.log('[ATTACH] mine for task', jobTaskID, ':', mine.length, JSON.stringify(mine[0]));
        setPhotos(mine);
      })
      .catch(err => { console.error('[ATTACH] error:', err); setPhotos([]); })
      .finally(() => setLoading(false));
  }, [jobTaskID]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#9090a8' }}>
      <Loader2 size={12} className="pg-spin" color="#049edf" /> Loading photos…
    </div>
  );
  if (photos.length === 0) return null;

  const nearPhotos = photos.filter(a => (a.photoFileType ?? a.PhotoFileType ?? '').toLowerCase().includes('near'));
  const farPhotos = photos.filter(a => (a.photoFileType ?? a.PhotoFileType ?? '').toLowerCase().includes('far'));
  const allPhotos = photos; // for lightbox navigation
  const buildUrl = (att) => {
    // Log to confirm field names — remove after fix confirmed
    console.log('[BUILD URL att]', JSON.stringify(att));


    const path =
      att.photoFilePath ??
      att.PhotoFilePath ??
      att.photoFileUrl ??
      att.PhotoFileUrl ??
      att.filePath ??
      att.FilePath ??
      att.imageUrl ??
      att.ImageUrl ??
      att.url ??
      att.Url ?? '';

    console.log('[BUILD URL path]', path);

    if (!path || path === '') return null;
    if (path.startsWith('http')) return path;
    return `${API_ROOT_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };
  const PhotoGrid = ({ items, label, color }) => (
    items.length === 0 ? null : (
      <div>
        <div style={{
          fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 800,
          color, textTransform: 'uppercase', letterSpacing: '0.06em',
          marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {label}
          <span style={{ background: color, color: '#fff', borderRadius: 20, padding: '0 6px', fontSize: 9, fontWeight: 900 }}>
            {items.length}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {items.map((att, i) => {
            const url = buildUrl(att);
            const globalIdx = allPhotos.indexOf(att);
            if (!url) return null;
            return (
              <div key={i}
                onClick={() => setLightbox({ url, index: globalIdx })}
                style={{
                  width: 72, height: 54, borderRadius: 8, overflow: 'hidden',
                  border: `2px solid ${color}40`, cursor: 'zoom-in', flexShrink: 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                  transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.07)';
                  e.currentTarget.style.borderColor = color;
                  e.currentTarget.style.boxShadow = `0 4px 14px ${color}40`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = `${color}40`;
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.10)';
                }}
              >
                <img src={url} alt={`${label} ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement.innerHTML =
                      '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;background:#f0f0f8">🖼️</div>';
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    )
  );

  return (
    <>
      {/* Lightbox */}
      {lightbox && ReactDOM.createPortal(
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.90)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <button onClick={() => setLightbox(null)} style={{
            position: 'absolute', top: 16, right: 16, width: 36, height: 36,
            borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}><X size={16} /></button>

          {lightbox.index > 0 && (
            <button onClick={e => { e.stopPropagation(); const prev = allPhotos[lightbox.index - 1]; setLightbox({ url: buildUrl(prev), index: lightbox.index - 1 }); }}
              style={{ position: 'absolute', left: 16, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronLeft size={18} />
            </button>
          )}

          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <img src={lightbox.url} alt="Task photo"
              style={{ maxWidth: '88vw', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
            <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              {(allPhotos[lightbox.index]?.photoFileType ?? allPhotos[lightbox.index]?.PhotoFileType ?? '')} · {lightbox.index + 1} of {allPhotos.length}
            </div>
          </div>

          {lightbox.index < allPhotos.length - 1 && (
            <button onClick={e => { e.stopPropagation(); const next = allPhotos[lightbox.index + 1]; setLightbox({ url: buildUrl(next), index: lightbox.index + 1 }); }}
              style={{ position: 'absolute', right: 16, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronRight size={18} />
            </button>
          )}
        </div>,
        document.body
      )}

      {/* Photo strip */}
      <div style={{
        marginTop: 12, padding: '12px 14px',
        background: 'rgba(4,158,223,0.03)',
        border: '1.5px solid rgba(4,158,223,0.12)',
        borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{
          fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 900,
          color: '#049edf', textTransform: 'uppercase', letterSpacing: '0.06em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          📷 Uploaded Photos
          <span style={{ background: '#049edf', color: '#fff', borderRadius: 20, padding: '0 7px', fontSize: 9, fontWeight: 900 }}>
            {photos.length}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <PhotoGrid items={nearPhotos} label="Near Photo" color="#049edf" />
          <PhotoGrid items={farPhotos} label="Far Photo" color="#7c3aed" />
        </div>
      </div>
    </>
  );
}
function getSiteAddress(h) {
  if (!h) return '';
  const s = h.site || null;
  if (s) {
    const addr = [s.addressLine1, s.addressLine2].filter(Boolean).join(', ');
    const city = [s.city, s.district].filter(Boolean).join(', ');
    const full = [addr, city].filter(Boolean).join(' — ');
    if (full) return full;
  }
  const flatAddr = [h.addressLine1 ?? h.AddressLine1 ?? '', h.addressLine2 ?? h.AddressLine2 ?? ''].filter(Boolean).join(', ');
  const flatCity = [h.city ?? h.City ?? h.siteCity ?? h.SiteCity ?? '', h.district ?? h.District ?? ''].filter(Boolean).join(', ');
  const flatFull = [flatAddr, flatCity].filter(Boolean).join(' — ');
  if (flatFull) return flatFull;
  const landmark = h.landmark ?? h.Landmark ?? '';
  if (landmark) return landmark;
  return h.hoardingCode ?? h.HoardingCode ?? '';
}
/* ═══════════════════════════════════════════
   TASK WORKER CARD  (full inline section, no dropdown)
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   MERGED TASK WORKER CARD
   One shared worker picker for all merged tasks
═══════════════════════════════════════════ */
function MergedTaskWorkerCard({ groupTasks, workers, jobRequestID, showToast, flag, allAttachments = [] }) {
  const [assignmentsByTask, setAssignmentsByTask] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [primaryId, setPrimaryId] = useState(null);

  const fetchAllAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        groupTasks.map(async task => {
          const raw = await apiService.getJobTaskAssignsByTaskId(task.jobTaskID);
          return { taskID: task.jobTaskID, assignments: extractArray(raw).map(normalizeAssignment) };
        })
      );
      const map = {};
      results.forEach(r => { map[r.taskID] = r.assignments; });
      setAssignmentsByTask(map);
    } catch { setAssignmentsByTask({}); }
    finally { setLoading(false); }
  }, [groupTasks]);

  useEffect(() => { fetchAllAssignments(); }, [fetchAllAssignments]);

  const allAssignments = useMemo(() => {
    const seen = new Map();
    Object.values(assignmentsByTask).forEach(list => {
      list.forEach(a => {
        if (!seen.has(a.id)) seen.set(a.id, a);
      });
    });
    return [...seen.values()];
  }, [assignmentsByTask]);

  const assignedIds = new Set(allAssignments.map(a => a.id));

  const filteredWorkers = workers.filter(w => {
    if (assignedIds.has(w.id)) return false;
    if (!query.trim()) return true;
    return w.name.toLowerCase().includes(query.toLowerCase()) ||
      (w.role || '').toLowerCase().includes(query.toLowerCase());
  });

  const toggle = (id) => setSelectedIds(p =>
    p.includes(id) ? p.filter(x => x !== id) : [...p, id]
  );

  const handleAssign = async () => {
    if (!selectedIds.length) return;
    setSaving(true);
    try {
      for (const task of groupTasks) {
        for (const wid of selectedIds) {
          await apiService.createJobTaskAssign({
            jobTaskAssignID: 0,
            jobTaskID: task.jobTaskID,
            jobRequestID,
            hoardingID: task.hoardingID,
            id: wid,
            isPrimary: primaryId === wid,
          });
        }
      }
      setSelectedIds([]); setPrimaryId(null); setPickerOpen(false); setQuery('');
      await fetchAllAssignments();
      showToast('Worker(s) assigned to all merged tasks!', 'success');
    } catch (err) {
      showToast(err?.message || 'Failed to assign.', 'error');
    } finally { setSaving(false); }
  };

  const handleTogglePrimary = async (asgn) => {
    try {
      const allForWorker = Object.values(assignmentsByTask)
        .flat()
        .filter(a => a.id === asgn.id);
      await Promise.all(
        allForWorker.map(a => apiService.updateJobTaskAssign({ ...a, isPrimary: !asgn.isPrimary }))
      );
      await fetchAllAssignments();
    } catch { }
  };

  const handleDelete = async (workerID) => {
    if (!window.confirm('Remove this worker from all merged tasks?')) return;
    setDeleting(workerID);
    try {
      const allForWorker = Object.values(assignmentsByTask)
        .flat()
        .filter(a => a.id === workerID);
      await Promise.all(
        allForWorker.map(a => apiService.deleteJobTaskAssign(a.jobTaskAssignID))
      );
      await fetchAllAssignments();
      showToast('Worker removed from all merged tasks.', 'success');
    } catch (err) {
      showToast(err?.message || 'Failed.', 'error');
    } finally { setDeleting(null); }
  };

  /* ── Photo helpers ── */
const buildUrl = (att) => {
    const path = att.photoFilePath ?? att.PhotoFilePath ?? att.photoFileUrl ?? att.PhotoFileUrl ?? att.filePath ?? att.FilePath ?? att.imageUrl ?? att.ImageUrl ?? att.url ?? att.Url ?? '';
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_ROOT_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const PhotoStrip = ({ items, label, color }) => {
    if (!items.length) return null;
    return (
      <div>
        <div style={{
          fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 800,
          color, textTransform: 'uppercase', letterSpacing: '0.06em',
          marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {label}
          <span style={{ background: color, color: '#fff', borderRadius: 20, padding: '0 6px', fontSize: 9, fontWeight: 900 }}>
            {items.length}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {items.map((att, i) => {
            const url = buildUrl(att);
            if (!url) return null;
            return (
              <div key={i}
                style={{
                  width: 68, height: 52, borderRadius: 8, overflow: 'hidden',
                  border: `2px solid ${color}35`, cursor: 'zoom-in', flexShrink: 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                  transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.08)';
                  e.currentTarget.style.borderColor = color;
                  e.currentTarget.style.boxShadow = `0 4px 14px ${color}40`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = `${color}35`;
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.10)';
                }}
                onClick={() => window.open(url, '_blank')}
              >
                <img src={url} alt={`${label} ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement.innerHTML =
                      '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:18px;background:#f0f0f8">🖼️</div>';
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '14px 18px' }}>

      {/* ── Assigned Workers label ── */}
      <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800, color: '#7878a0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Users size={12} color="#049edf" /> Assigned Workers
        {allAssignments.length > 0 && (
          <span style={{ background: 'rgba(4,158,223,0.12)', color: '#049edf', borderRadius: 20, padding: '0 7px', fontSize: 10, fontWeight: 900 }}>
            {allAssignments.length}
          </span>
        )}
        <span style={{ marginLeft: 4, fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 700, color: '#9090a8', fontStyle: 'italic' }}>
          (shared across all {groupTasks.length} hoardings)
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b0b0c8', fontFamily: 'Nunito,sans-serif', fontSize: 12 }}>
          <Loader2 size={14} className="pg-spin" /> Loading assignments…
        </div>
      ) : (
        <>
          {/* ── Assigned worker chips ── */}
          {allAssignments.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {allAssignments.map(asgn => {
                const w = workers.find(x => x.id === asgn.id);
                const name = w?.name || `Worker #${asgn.id}`;
                const [bgC, txtC] = avatarColor(name);
                const isDel = deleting === asgn.id;
                return (
                  <div key={asgn.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 6px', borderRadius: 30, background: bgC, border: `1.5px solid ${txtC}25`, opacity: isDel ? 0.5 : 1, transition: 'opacity 0.15s' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: txtC, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
                      {name[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: txtC, whiteSpace: 'nowrap' }}>{name}</div>
                      {w?.role && <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10, color: `${txtC}90`, fontWeight: 600 }}>{w.role}</div>}
                    </div>
                    {asgn.isPrimary && (
                      <span style={{ background: `${txtC}18`, color: txtC, borderRadius: 20, padding: '1px 7px', fontSize: 9.5, fontWeight: 900, fontFamily: 'Nunito,sans-serif', whiteSpace: 'nowrap' }}>PRIMARY</span>
                    )}
                    <button onClick={() => handleTogglePrimary(asgn)} title={asgn.isPrimary ? 'Remove primary' : 'Set as primary'}
                      style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>
                      <Star size={13} color={asgn.isPrimary ? '#f59e0b' : `${txtC}50`} fill={asgn.isPrimary ? '#f59e0b' : 'none'} />
                    </button>
                    <button onClick={() => handleDelete(asgn.id)} disabled={isDel}
                      style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(220,38,38,0.09)', border: '1px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isDel ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                      {isDel ? <Loader2 size={10} className="pg-spin" color="#dc2626" /> : <X size={11} color="#dc2626" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Empty state ── */}
          {allAssignments.length === 0 && !pickerOpen && (
            <div style={{ padding: '12px 0', fontFamily: 'Nunito,sans-serif', fontSize: 12.5, color: '#b0b0c8', fontWeight: 600, fontStyle: 'italic' }}>
              No workers assigned to these tasks yet
            </div>
          )}

          {/* ── Add worker button ── */}
          {!pickerOpen && (
            <button
              onClick={() => { setPickerOpen(true); setQuery(''); setSelectedIds([]); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10, border: '1.5px dashed rgba(4,158,223,0.4)', background: 'rgba(4,158,223,0.04)', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 800, color: '#049edf', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(4,158,223,0.09)'; e.currentTarget.style.borderColor = '#049edf'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(4,158,223,0.04)'; e.currentTarget.style.borderColor = 'rgba(4,158,223,0.4)'; }}
            >
              <UserPlus size={14} /> {allAssignments.length > 0 ? 'Add More Workers' : 'Assign Workers'}
            </button>
          )}

          {/* ── Worker Picker ── */}
          {pickerOpen && (
            <div style={{ marginTop: 4, border: '1.5px solid #e0e8f8', borderRadius: 12, overflow: 'hidden', background: '#fafcff' }}>

              {/* Picker header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'linear-gradient(135deg,#eff6ff,#f5f0ff)', borderBottom: '1px solid #e0e8f8' }}>
                <UserPlus size={15} color="#049edf" />
                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800, color: '#1a1a2e', flex: 1 }}>
                  Assign Workers to All {groupTasks.length} Merged Hoardings
                </span>
                {selectedIds.length > 0 && (
                  <span style={{ background: '#049edf', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 900, fontFamily: 'Nunito,sans-serif' }}>
                    {selectedIds.length} selected
                  </span>
                )}
                <button
                  onClick={() => { setPickerOpen(false); setSelectedIds([]); setQuery(''); }}
                  style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e0e8f8', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7878a0' }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Search */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #eeeefc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #e0e8f8', borderRadius: 9, padding: '8px 12px' }}>
                  <Search size={13} color="#c0c8e0" style={{ flexShrink: 0 }} />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search workers by name or role…"
                    style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}
                    autoFocus
                  />
                  {query && <X size={12} style={{ cursor: 'pointer', color: '#c0c0d8' }} onClick={() => setQuery('')} />}
                </div>
              </div>

              {/* Worker list */}
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {filteredWorkers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: 'Nunito,sans-serif', fontSize: 13, color: '#b0b0c8', fontWeight: 600 }}>
                    {query ? `No workers match "${query}"` : 'All available workers are already assigned'}
                  </div>
                ) : filteredWorkers.map(w => {
                  const isSel = selectedIds.includes(w.id);
                  const isPrim = primaryId === w.id;
                  const [bgC, txtC] = avatarColor(w.name);
                  return (
                    <div
                      key={w.id}
                      onClick={() => toggle(w.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: 'pointer', background: isSel ? 'rgba(4,158,223,0.05)' : '#fff', borderBottom: '1px solid #f4f6fb', transition: 'background 0.12s' }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f4f8ff'; }}
                      onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = '#fff'; }}
                    >
                      <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: `2.5px solid ${isSel ? '#049edf' : '#d0d8e8'}`, background: isSel ? '#049edf' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}>
                        {isSel && <Check size={10} color="#fff" strokeWidth={3} />}
                      </div>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: bgC, border: `1.5px solid ${txtC}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 900, color: txtC }}>
                        {w.name[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800, color: '#1a1a2e' }}>{w.name}</div>
                        {w.role && <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600, marginTop: 1 }}>{w.role}</div>}
                      </div>
                      {isSel && (
                        <button
                          onClick={e => { e.stopPropagation(); setPrimaryId(isPrim ? null : w.id); }}
                          title={isPrim ? 'Remove primary' : 'Set as primary'}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${isPrim ? 'rgba(245,158,11,0.5)' : '#e0e8f0'}`, background: isPrim ? 'rgba(245,158,11,0.09)' : '#f8f8fd', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800, color: isPrim ? '#d97706' : '#9090a8', flexShrink: 0 }}
                        >
                          <Star size={11} color={isPrim ? '#f59e0b' : '#c0c0d8'} fill={isPrim ? '#f59e0b' : 'none'} />
                          {isPrim ? 'Primary' : 'Set Primary'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Picker footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #e8edf8', background: '#f4f8ff' }}>
                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#7878a0', fontWeight: 600 }}>
                  {selectedIds.length === 0
                    ? `Will assign to all ${groupTasks.length} hoardings`
                    : `${selectedIds.length} worker${selectedIds.length !== 1 ? 's' : ''} → ${groupTasks.length} hoardings`}
                </span>
                <div style={{ display: 'flex', gap: 9 }}>
                  <button className="pg-btn-cancel" onClick={() => { setPickerOpen(false); setSelectedIds([]); setQuery(''); }}>
                    Cancel
                  </button>
                  <button
                    className="pg-btn-save"
                    onClick={handleAssign}
                    disabled={selectedIds.length === 0 || saving}
                  >
                    {saving
                      ? <><Loader2 size={13} className="pg-spin" /> Assigning…</>
                      : <><UserPlus size={13} /> Assign {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}</>}
                  </button>
                </div>
              </div>

            </div>
          )}
        </>
      )}

      {/* ── Task Photos (Near / Far / Other) ── */}
      {groupTasks.map(task => {
        if (!task.jobTaskID) return null;

        const taskPhotos = allAttachments.filter(
          a => Number(a.jobTaskID ?? a.JobTaskID ?? 0) === Number(task.jobTaskID)
        );
        if (taskPhotos.length === 0) return null;

        const nearPhotos  = taskPhotos.filter(a => (a.photoFileType ?? a.PhotoFileType ?? '').toLowerCase().includes('near'));
        const farPhotos   = taskPhotos.filter(a => (a.photoFileType ?? a.PhotoFileType ?? '').toLowerCase().includes('far'));
        const otherPhotos = taskPhotos.filter(a => {
          const t = (a.photoFileType ?? a.PhotoFileType ?? '').toLowerCase();
          return !t.includes('near') && !t.includes('far');
        });

        return (
          <div key={task.jobTaskID} style={{
            marginTop: 14,
            padding: '10px 14px',
            background: 'rgba(4,158,223,0.03)',
            border: '1.5px solid rgba(4,158,223,0.12)',
            borderRadius: 10,
          }}>
            {/* Header */}
            <div style={{
              fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 900,
              color: '#049edf', textTransform: 'uppercase', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
            }}>
              📷 Worker Photos
              {task.hoardingCode && (
                <span style={{
                  fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 700,
                  color: '#7878a0', textTransform: 'none', letterSpacing: 0,
                }}>
                  · {task.hoardingCode}
                </span>
              )}
              <span style={{
                background: '#049edf', color: '#fff', borderRadius: 20,
                padding: '0 7px', fontSize: 9, fontWeight: 900,
              }}>
                {taskPhotos.length}
              </span>
            </div>

            {/* Photo strips */}
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <PhotoStrip items={nearPhotos}  label="Near"  color="#049edf" />
              <PhotoStrip items={farPhotos}   label="Far"   color="#7c3aed" />
              <PhotoStrip items={otherPhotos} label="Other" color="#16a34a" />
            </div>
          </div>
        );
      })}

    </div>
  );
}

/* ═══════════════════════════════════════════
   JOB DETAIL PAGE  (full page, no popup)
═══════════════════════════════════════════ */
function JobDetailPage({ job, workers, onBack, onAccept, accepting, showToast, allAttachments = [] }) {
  const done = job.tasks.filter(t => t.status === 'Completed' || t.status === 'Submitted').length;
  const pct = job.tasks.length > 0 ? Math.round((done / job.tasks.length) * 100) : 0;
  const canAccept = job.jobStatus !== 'Accepted' && job.jobStatus !== 'Completed';

  // ── Group merged tasks together, keep singles separate ──
  const { mergedGroups, singleTasks } = useMemo(() => {
    const mergedMap = new Map(); // mergeAlongFlag → [tasks]
    const singles = [];
    job.tasks.forEach(task => {
      if (task.isMerged) {
        const key = task.mergeAlongFlag || 'H';
        if (!mergedMap.has(key)) mergedMap.set(key, []);
        mergedMap.get(key).push(task);
      } else {
        singles.push(task);
      }
    });
    return { mergedGroups: [...mergedMap.entries()], singleTasks: singles };
  }, [job.tasks]);

  return (
    <div className="hd-form-page">
      {/* ── Top bar ── */}
      <div className="hd-topbar">
        <div className="hd-topbar-left">
          <button className="hd-back-btn" onClick={onBack}>
            <ArrowLeft size={14} /> Back to Jobs
          </button>
          <div className="hd-topbar-divider" />
          <div>
            <div className="hd-topbar-title">Job #{job.jobRequestID} · {job.jobType || 'Job Details'}</div>
            <div className="hd-topbar-sub">{job.jobDescription || 'View tasks and manage worker assignments'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <JobStatusBadge status={job.jobStatus} />
          {canAccept && (
            <button onClick={() => { if (window.confirm(`Accept Job #${job.jobRequestID}?`)) onAccept(job); }} disabled={accepting}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 20px', borderRadius: 20, background: accepting ? '#e8e8f4' : 'linear-gradient(135deg,#7c3aed,#049edf)', border: 'none', cursor: accepting ? 'not-allowed' : 'pointer', fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800, color: accepting ? '#b0b0c8' : '#fff', boxShadow: accepting ? 'none' : '0 3px 14px rgba(108,63,199,0.35)' }}>
              {accepting ? <><Loader2 size={13} className="pg-spin" />Accepting…</> : <><ThumbsUp size={14} />Accept Job</>}
            </button>
          )}
        </div>
      </div>

      <div className="hd-form-body">
        <div className="container-fluid px-0">
          <div className="row g-4">

            {/* ── Left col ── */}
            <div className="col-12 col-lg-4">
              {job.customerContractID > 0 && (
                <div className="hd-section-card" style={{ marginBottom: 16 }}>
                  <div className="hd-section-head">
                    <div className="hd-section-icon-wrap"><Image size={14} color="#049edf" /></div>
                    <div>
                      <div className="hd-section-title">Banner Designs</div>
                      <div className="hd-section-sub">Contract #{job.customerContractID}</div>
                    </div>
                  </div>
                  <div className="hd-section-body">
                    <BannerStrip customerContractID={job.customerContractID} />
                  </div>
                </div>
              )}
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><Briefcase size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Job Details</div>
                    <div className="hd-section-sub">Summary and schedule</div>
                  </div>
                </div>
                <div className="hd-section-body">
                  {[
                    { label: 'Job Type', value: job.jobType, icon: Briefcase },
                    { label: 'No. Hoardings', value: job.noofHoardings, icon: Layers },
                    { label: 'Rate / SQFT', value: job.rateperSQFT ? `₹${job.rateperSQFT}` : '—', icon: Hash },
                    { label: 'Total Area', value: job.totalAreaSQFT ? `${job.totalAreaSQFT} sq.ft` : '—', icon: MapPin },
                    { label: 'Target Date', value: fmtDate(job.targetCompletionDate), icon: Calendar },
                    { label: 'Created', value: fmtDate(job.jobCreateDTTM), icon: Clock },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: '1px solid #f0f0f8' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(4,158,223,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <row.icon size={13} color="#049edf" />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10.5, fontWeight: 700, color: '#9090a8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row.label}</div>
                        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800, color: '#1a1a2e', marginTop: 2 }}>{row.value || '—'}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#5a5a78' }}>Task Progress</span>
                      <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 900, color: pct === 100 ? '#16a34a' : '#049edf' }}>{done}/{job.tasks.length} · {pct}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 20, background: '#e8e8f4', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 20, transition: 'width 0.4s', background: pct === 100 ? 'linear-gradient(90deg,#16a34a,#22c55e)' : 'linear-gradient(90deg,#049edf,#6c63ff)' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right col: Tasks ── */}
            <div className="col-12 col-lg-8">
              <div className="hd-section-card">
                <div className="hd-section-head">
                  <div className="hd-section-icon-wrap"><ClipboardList size={14} color="#049edf" /></div>
                  <div>
                    <div className="hd-section-title">Tasks &amp; Worker Assignment</div>
                    <div className="hd-section-sub">{job.tasks.length} task{job.tasks.length !== 1 ? 's' : ''} · Assign workers to each task below</div>
                  </div>
                  <span style={{ marginLeft: 'auto', background: 'rgba(4,158,223,0.1)', color: '#049edf', border: '1px solid rgba(4,158,223,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 11.5, fontWeight: 800, fontFamily: 'Nunito,sans-serif' }}>
                    {job.tasks.length} task{job.tasks.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="hd-section-body">
                  {job.tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#b0b0c8' }}>
                      <ClipboardList size={32} color="#e0e0f0" style={{ marginBottom: 10 }} />
                      <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 14, fontWeight: 700, color: '#c0c0c8' }}>No tasks assigned to this job</div>
                    </div>
                  ) : (
                    <>
                      {/* ── Merged group cards ── */}
                      {mergedGroups.map(([flag, groupTasks]) => (
                        <div key={flag} style={{ marginBottom: 16, border: '1.5px solid rgba(124,58,237,0.3)', borderRadius: 14, overflow: 'hidden' }}>

                          {/* Group header */}
                          <div style={{ padding: '12px 18px', background: 'linear-gradient(135deg, rgba(124,58,237,0.07), rgba(124,58,237,0.03))', borderBottom: '1px solid rgba(124,58,237,0.15)', display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{flag === 'H' ? '↔' : '↕'}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 900, color: '#7c3aed' }}>
                                  {flag === 'H' ? 'Horizontal' : 'Vertical'} Merge
                                </span>
                                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, color: '#9090a8' }}>
                                  · {groupTasks.length} hoardings combined
                                </span>
                                {groupTasks.map(t => t.hoardingCode).filter(Boolean).map(code => (
                                  <span key={code} style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)' }}>
                                    {code}
                                  </span>
                                ))}
                              </div>
                              {[...new Set(groupTasks.map(t => t.siteAddress).filter(Boolean))].map((addr, i) => (
                                <div key={i} style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: i > 0 ? 3 : 0 }}>
                                  <MapPin size={11} color="#9090a8" style={{ flexShrink: 0, marginTop: 2 }} />
                                  <span>{addr}</span>
                                </div>
                              ))}
                              {/* Task IDs row */}
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                                {groupTasks.map(t => (
                                  <span key={t.jobTaskID} style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(4,158,223,0.07)', color: '#049edf', border: '1px solid rgba(4,158,223,0.18)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    Task #{t.jobTaskID} <TaskStatusBadge status={t.status} />
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* ── ONE shared worker assignment for all merged tasks ── */}
                          <MergedTaskWorkerCard
                            groupTasks={groupTasks}
                            workers={workers}
                            jobRequestID={job.jobRequestID}
                            showToast={showToast}
                            flag={flag}
                            allAttachments={allAttachments}
                          />

                        </div>
                      ))}

                      {/* ── Single (unmerged) task cards ── */}
                      {singleTasks.map(task => (
                        <MergedTaskWorkerCard
                          key={task.jobTaskID}
                          groupTasks={[task]}
                          workers={workers}
                          jobRequestID={job.jobRequestID}
                          showToast={showToast}
                          flag=""
                          allAttachments={allAttachments}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function SupervisorJobsPage() {
  const [view, setView] = useState('list');   // 'list' | 'detail'
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [toast, setToast] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('jobRequestID');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [hoardings, setHoardings] = useState([]);
  const [hoardingMerges, setHoardingMerges] = useState([]);
  const [allAttachments, setAllAttachments] = useState([]);



  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  /* ── Load workers ── */
  useEffect(() => {
    apiService.getWorkers()
      .then(list => setWorkers(Array.isArray(list) ? list : []))
      .catch(() => { });
  }, []);

  /* ── Load jobs ── */
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const userId = parseInt(localStorage.getItem('userId') || '0', 10);

      const [res, hRaw, mergeRaw, sRaw, attRaw] = await Promise.all([
        apiService.getJobRequestsByUserId(userId),
        apiService.getAllHoardings(),
        apiService.getAllHoardingMerges(),
        apiService.getAllSites().catch(() => []),
        apiService.getAllJobTaskAttachments().catch(() => []),
      ]);

      // Build site lookup map
      const siteList = Array.isArray(sRaw) ? sRaw
        : Array.isArray(sRaw?.$values) ? sRaw.$values
          : Array.isArray(sRaw?.data) ? sRaw.data : [];

      const siteMap = new Map(
        siteList.map(s => [
          Number(s.siteID ?? s.SiteID ?? 0),
          {
            addressLine1: s.addressLine1 ?? s.AddressLine1 ?? '',
            addressLine2: s.addressLine2 ?? s.AddressLine2 ?? '',
            city: s.city ?? s.City ?? '',
            district: s.district ?? s.District ?? '',
            landmark: s.landmark ?? s.Landmark ?? '',
          }
        ])
      );

      // Enrich hoardings with site data
      const rawHoardingList = extractArray(hRaw);
      const enrichedHoardings = rawHoardingList.map(h => {
        const siteID = Number(h.siteID ?? h.SiteID ?? h.siteId ?? 0);
        const foundSite = siteMap.get(siteID) || null;
        return {
          ...h,
          site: foundSite || (h.site ? h.site : null),
        };
      });

      setHoardings(enrichedHoardings);
      setHoardingMerges(extractArray(mergeRaw));
      setAllAttachments(extractArray(attRaw));

      const list = extractArray(res).map(normalizeJob);

      const withTasks = await Promise.all(
        list.map(async (job) => {
          try {
            const tRes = await apiService.getJobTasksByJobRequestId(job.jobRequestID);
            const taskList = extractArray(tRes).map(t => {
              const task = normalizeTask(t);

              const h = enrichedHoardings.find(        // ← use enrichedHoardings
                x => Number(x.hoardingID) === Number(task.hoardingID)
              );

              const merge = extractArray(mergeRaw).find(
                x => Number(x.hoardingID) === Number(task.hoardingID)
              );

              return {
                ...task,
                hoardingCode: h?.hoardingCode || h?.HoardingCode || '',
                siteAddress: getSiteAddress(h),         // ← now uses enriched h
                mergeAlongFlag: merge?.mergeAlongFlag || null,
                isMerged: !!merge,
              };
            });
            return { ...job, tasks: taskList };
          } catch {
            return { ...job, tasks: [] };
          }
        })
      );

      setJobs(withTasks);
    } catch (err) {
      setFetchError(err?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  /* ── Accept ── */
  const handleAccept = useCallback(async (job) => {
    if (accepting) return;
    setAccepting(true); setAcceptingId(job.jobRequestID);
    try {
      const acceptedAt = new Date().toISOString();
      await apiService.updateJobRequest({ ...job, jobStatus: 'Accepted', supervisorAcceptDttm: acceptedAt });
      const updated = { ...job, jobStatus: 'Accepted', supervisorAcceptDttm: acceptedAt };
      setJobs(prev => prev.map(j => j.jobRequestID === job.jobRequestID ? updated : j));
      if (selectedJob?.jobRequestID === job.jobRequestID) setSelectedJob(updated);
      showToast('Job accepted!', 'success');
    } catch (err) { showToast(err?.response?.data?.message || err?.message || 'Failed.', 'error'); }
    finally { setAccepting(false); setAcceptingId(null); }
  }, [accepting, selectedJob, showToast]);

  /* ── Open detail ── */
  const openDetail = (job) => {
    setSelectedJob(job);
    setView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const backToList = () => {
    setView('list');
    setSelectedJob(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Filter + Sort ── */
  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const m = String(j.jobRequestID).includes(q) || (j.jobType || '').toLowerCase().includes(q) || (j.jobDescription || '').toLowerCase().includes(q) || (j.jobStatus || '').toLowerCase().includes(q);
    return m && (statusFilter === 'all' || j.jobStatus === statusFilter);
  });
  const sorted = [...filtered].sort((a, b) => {
    const av = String(a[sortKey] || '').toLowerCase(), bv = String(b[sortKey] || '').toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);
  const handleSort = key => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); } setPage(1); };
  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => { if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…'); acc.push(p); return acc; }, []);
  const counts = { all: jobs.length };
  jobs.forEach(j => { counts[j.jobStatus] = (counts[j.jobStatus] || 0) + 1; });

  const COLS = [
    { key: 'jobRequestID', label: 'Job ID', w: '9%' },
    { key: 'jobType', label: 'Type', w: '11%' },
    { key: 'jobDescription', label: 'Description', w: '22%' },
    { key: 'noofHoardings', label: 'Hoardings', w: '9%' },
    { key: 'targetCompletionDate', label: 'Target Date', w: '12%' },
    { key: '_tasks', label: 'Tasks', w: '9%', noSort: true },
    { key: 'jobStatus', label: 'Status', w: '12%' },
    { key: '_action', label: '', w: '8%', noSort: true },
  ];

  /* ── Render detail view ── */
  if (view === 'detail' && selectedJob) {
    return (
      <>
        {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        <JobDetailPage
          job={selectedJob}
          workers={workers}
          onBack={backToList}
          onAccept={handleAccept}
          accepting={acceptingId === selectedJob.jobRequestID && accepting}
          showToast={showToast}
          allAttachments={allAttachments}
        />
      </>
    );
  }

  /* ── Render list view ── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 14 }}>
      <Loader2 size={32} color="#049edf" className="pg-spin" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>Loading your jobs…</span>
    </div>
  );
  if (fetchError) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 14 }}>
      <AlertCircle size={28} color="#ef4444" />
      <span style={{ fontFamily: 'Nunito,sans-serif', color: '#ef4444', fontSize: 14 }}>{fetchError}</span>
      <button className="pg-btn-add" onClick={fetchJobs}><RefreshCw size={13} /> Retry</button>
    </div>
  );

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="pg-page">
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">My Jobs</h1>
            <p className="pg-header__subtitle">Job requests assigned to you · <strong>{jobs.length}</strong> total</p>
          </div>
          <button className="pg-pg-btn" onClick={fetchJobs} title="Refresh" style={{ width: 38, height: 38 }}>
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="pg-container">
          {/* ── Toolbar ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #f0f0f8', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: '#f4f4fb', borderRadius: 10, border: '1.5px solid #ececf8' }}>
              <Search size={14} color="#9090a8" style={{ flexShrink: 0 }} />
              <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}
                placeholder="Search by type, description, status…"
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              {search && <X size={13} style={{ cursor: 'pointer', color: '#9090a8' }} onClick={() => setSearch('')} />}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {['all', 'Open', 'Accepted', 'In Progress', 'Submitted', 'Completed'].map(f => {
                const sc = JOB_STATUS_COLORS[f];
                const active = statusFilter === f;
                return (
                  <button key={f} onClick={() => { setStatusFilter(f); setPage(1); }}
                    style={{ padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${active ? (sc?.border || '#bae0ff') : '#e8e8f4'}`, background: active ? (sc?.bg || 'rgba(4,158,223,0.08)') : '#f8f8fd', color: active ? (sc?.color || '#049edf') : '#7878a0', fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                    {f === 'all' ? 'All' : f}
                    <span style={{ background: active ? (sc?.color || '#049edf') : '#e8e8f4', color: active ? '#fff' : '#7878a0', borderRadius: 20, padding: '0 5px', fontSize: 10, fontWeight: 900 }}>
                      {counts[f === 'all' ? 'all' : f] || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Table ── */}
          <table className="pg-table">
            <thead>
              <tr>
                {COLS.map(col => (
                  <th key={col.key} style={{ width: col.w }}
                    className={['pg-th', col.noSort ? '' : 'pg-th--sort'].filter(Boolean).join(' ')}
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
              {paginated.length === 0
                ? <tr><td colSpan={COLS.length} className="pg-td pg-empty" style={{ maxWidth: 'none' }}>
                  <div className="pg-empty__inner"><Briefcase size={36} color="#d0d0e8" /><span className="pg-empty__label">No jobs found</span></div>
                </td></tr>
                : paginated.map(job => {
                  const done = job.tasks.filter(t => t.status === 'Completed' || t.status === 'Submitted').length;
                  const canAccept = job.jobStatus !== 'Accepted' && job.jobStatus !== 'Completed';
                  const isAccepting = acceptingId === job.jobRequestID && accepting;
                  return (
                    <tr key={job.jobRequestID} className="pg-tr">
                      <td className="pg-td">
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 800, color: '#049edf' }}>#{job.jobRequestID}</span>
                      </td>
                      <td className="pg-td">
                        {job.jobType
                          ? <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: 'rgba(4,158,223,0.08)', color: '#049edf', border: '1px solid rgba(4,158,223,0.2)' }}>{job.jobType}</span>
                          : <span style={{ color: '#c0c0d8' }}>—</span>}
                      </td>
                      <td className="pg-td pg-td--overflow">
                        <span className="pg-td__ellipsis" style={{ color: '#4a5568' }} title={job.jobDescription}>{job.jobDescription || '—'}</span>
                      </td>
                      <td className="pg-td" style={{ textAlign: 'center' }}>
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 13, color: '#1a1a2e' }}>{job.noofHoardings || '—'}</span>
                      </td>
                      <td className="pg-td">
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12.5, fontWeight: 600, color: '#4a5568', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Calendar size={11} color="#c0c0d8" /> {fmtDate(job.targetCompletionDate)}
                        </span>
                      </td>
                      <td className="pg-td" style={{ textAlign: 'center' }}>
                        {job.tasks.length > 0
                          ? <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700 }}>
                            <span style={{ color: done === job.tasks.length ? '#16a34a' : '#4a5568' }}>{done}</span>
                            <span style={{ color: '#b0b0c8' }}>/{job.tasks.length}</span>
                          </div>
                          : <span style={{ color: '#c0c0d8' }}>—</span>}
                      </td>
                      <td className="pg-td"><JobStatusBadge status={job.jobStatus} /></td>
                      <td className="pg-td">
                        <div className="pg-action-wrap">
                         {canAccept && (
                            <button className="pg-btn-view" onClick={() => { if (window.confirm(`Accept Job #${job.jobRequestID}?`)) handleAccept(job); }} disabled={isAccepting} title="Accept"
                              style={{ background: 'rgba(108,63,199,0.08)', color: '#7c3aed', border: '1px solid rgba(108,63,199,0.2)', boxShadow: 'none' }}>
                              {isAccepting ? <Loader2 size={12} className="pg-spin" /> : <ThumbsUp size={13} />}
                            </button>
                          )}
                          <button className="pg-btn-view" onClick={() => openDetail(job)} title="View & Assign">
                            <LayoutGrid size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>

          {/* ── Pagination ── */}
          {sorted.length > 0 && (
            <div className="pg-pagination">
              <div className="pg-pagination__left">
                <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
                <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
                {pageNums.map((p, i) => p === '…' ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span> : <button key={p} className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>)}
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
          )}
        </div>
      </div>
    </>
  );
}