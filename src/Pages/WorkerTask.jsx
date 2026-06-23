import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
    ClipboardList, Search, RefreshCw, X, AlertCircle,
    ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight,
    ChevronLeft, ChevronRight, Filter, Loader2, Eye,
    Calendar, CheckCircle, Clock, Circle, Hash,
    Briefcase, Layers, Edit3, Save, Camera,
    ZoomIn, ZoomOut, Trash2, Check, AlertTriangle, Info, LogOut,
    ImagePlus, SendHorizonal, MapPin,
} from 'lucide-react';
import { apiService, API_ROOT_URL } from '../api/api';
import { useResizableColumns } from '../hooks/useResizableColumns';
import './Common1.css';

/* ─── constants ─── */
const PAGE_SIZE_OPTIONS = [10, 12, 15, 20];

const TASK_STATUS_STYLE = {
    'Open': { bg: '#eaf5ff', color: '#049edf', border: '#b3d9f5', icon: Circle },
    'In Progress': { bg: '#fff8e1', color: '#e08a00', border: '#f5d87a', icon: Clock },
    'Completed': { bg: '#e8faf3', color: '#1a9e6e', border: '#7dd5b0', icon: CheckCircle },
    'Submitted': { bg: '#f3e8ff', color: '#7c3aed', border: '#c4b5fd', icon: SendHorizonal },
};
function getStatusStyle(s) {
    return TASK_STATUS_STYLE[s] ?? { bg: '#f0f0f8', color: '#7878a0', border: '#d0d0e8', icon: Circle };
}

/* ─── normalise ─── */
function normalizeTask(raw) {
    return {
        jobTaskID: raw.jobTaskID ?? raw.JobTaskID ?? 0,
        jobRequestID: raw.jobRequestID ?? raw.JobRequestID ?? 0,
        hoardingID: raw.hoardingID ?? raw.HoardingID ?? 0,
        status: raw.status ?? raw.Status ?? 'Open',
        actualCompletionDate: raw.actualCompletionDate ?? raw.ActualCompletionDate ?? '',
        submitDTTM: raw.submitDTTM ?? raw.SubmitDTTM ?? '',
        lastUpdateDttm: raw.lastUpdateDttm ?? raw.LastUpdateDttm ?? '',
        lastUpdatedBy: raw.lastUpdatedBy ?? raw.LastUpdatedBy ?? 0,
        job: raw.job ?? null,
    };
}
function normalizeJob(raw) {
    return {
        jobRequestID: raw.jobRequestID ?? raw.JobRequestID ?? 0,
        customerContractID: raw.customerContractID ?? raw.CustomerContractID ?? 0,
        jobType: raw.jobType ?? raw.JobType ?? '',
        jobDescription: raw.jobDescription ?? raw.JobDescription ?? '',
        jobStatus: raw.jobStatus ?? raw.JobStatus ?? 'Open',
        targetCompletionDate: raw.targetCompletionDate ?? raw.TargetCompletionDate ?? '',
        noofHoardings: raw.noofHoardings ?? raw.NoofHoardings ?? '0',
        iD: raw.iD ?? raw.ID ?? '',
    };
}

/* ─── helpers ─── */
function fmtDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
}
function fmtDateTime(d) {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    } catch { return d; }
}

/* ─── Geo helpers ─── */
function getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true, timeout: 10000, maximumAge: 0, ...options,
        });
    });
}
async function reverseGeocode(lat, lng) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'en' } });
        const json = await res.json();
        return json?.display_name || '';
    } catch { return ''; }
}
async function getGeoPayload() {
    try {
        const pos = await getCurrentPosition();
        const { latitude, longitude, accuracy } = pos.coords;
        const address = await reverseGeocode(latitude, longitude);
        return { latitude, longitude, accuracy, address };
    } catch { return { latitude: 0, longitude: 0, accuracy: 0, address: '' }; }
}

function extractArray(res) {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.$values)) return res.$values;
    if (res && typeof res === 'object') { const found = Object.values(res).find(v => Array.isArray(v)); return found || []; }
    return [];
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

function SortIcon({ col, sortKey, sortDir }) {
    const active = sortKey === col;
    return (
        <span className="pg-sort-icon">
            <ChevronUp size={10} color={active && sortDir === 'asc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__up" />
            <ChevronDown size={10} color={active && sortDir === 'desc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__down" />
        </span>
    );
}

function StatusBadge({ status }) {
    const s = getStatusStyle(status);
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 20,
            background: s.bg, color: s.color, border: `1px solid ${s.border}`,
            fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
        }}>
            <s.icon size={10} /> {status}
        </span>
    );
}

/* ══════════════════════════════════════════
   IMAGE UPLOAD ZONE
══════════════════════════════════════════ */
function ImageUploadZone({ label, sublabel, IconComp, values = [], onChange, error }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const addFiles = (files) => {
        const images = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (!images.length) return;
        onChange([...values, ...images]);
    };
    const removeOne = (idx) => onChange(values.filter((_, i) => i !== idx));
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</span>
                <span style={{ color: '#ef4444', fontSize: 12, lineHeight: 1 }}>*</span>
                <span style={{ fontSize: 10, color: '#9090a8', fontFamily: 'Nunito,sans-serif', fontWeight: 600 }}>{sublabel}</span>
                {values.length > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#1a9e6e', background: '#e8faf3', padding: '2px 8px', borderRadius: 20, border: '1px solid #7dd5b0' }}>
                        {values.length} photo{values.length > 1 ? 's' : ''}
                    </span>
                )}
            </div>
            {values.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                    {values.map((file, idx) => {
                        const url = URL.createObjectURL(file);
                        return (
                            <div key={idx} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 10, overflow: 'hidden', border: '2px solid #d0f0e0' }}>
                                <img src={url} alt={`${label} ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onLoad={() => URL.revokeObjectURL(url)} />
                                <button type="button" onClick={() => removeOne(idx)} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(239,68,68,0.9)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                                    <X size={10} />
                                </button>
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(26,26,46,0.55)', color: '#fff', fontFamily: 'Nunito,sans-serif', fontSize: 9, fontWeight: 700, padding: '2px 5px', textAlign: 'center' }}>#{idx + 1}</div>
                            </div>
                        );
                    })}
                </div>
            )}
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                    borderRadius: 12, cursor: 'pointer', padding: '16px 10px',
                    border: error ? '2px dashed #ef4444' : dragging ? '2px dashed #049edf' : '2px dashed #d0d0e8',
                    background: error ? 'rgba(239,68,68,0.03)' : dragging ? 'rgba(4,158,223,0.05)' : '#f8f8fd',
                    transition: 'all 0.15s',
                }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: error ? 'rgba(239,68,68,0.1)' : 'rgba(4,158,223,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconComp size={20} color={error ? '#ef4444' : '#049edf'} />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: error ? '#ef4444' : '#1a1a2e', marginBottom: 2 }}>
                        {values.length > 0 ? 'Add more photos' : `Upload ${label}`}
                    </div>
                    <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 600, color: '#9090a8' }}>Click or drag & drop • multiple allowed</div>
                </div>
                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
                        <AlertTriangle size={11} /> {error}
                    </div>
                )}
            </div>
            <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }} />
        </div>
    );
}

/* ─── Banner strip ─── */
function BannerStrip({ contractID }) {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lightbox, setLightbox] = useState(null);
    useEffect(() => {
        if (!contractID) return;
        setLoading(true);
        apiService.getContractBannerImages(contractID)
            .then(data => setBanners(Array.isArray(data) ? data : []))
            .catch(() => setBanners([]))
            .finally(() => setLoading(false));
    }, [contractID]);
    if (!contractID) return null;
    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'rgba(4,158,223,0.05)', borderRadius: 10, border: '1px solid rgba(4,158,223,0.15)' }}>
            <Loader2 size={12} color="#049edf" className="pg-spin" />
            <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#9090a8', fontWeight: 600 }}>Loading banner designs…</span>
        </div>
    );
    if (banners.length === 0) return null;
    return (
        <>
            {lightbox && ReactDOM.createPortal(
                <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 18, right: 22, background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8, cursor: 'pointer', padding: '6px 14px', color: '#fff', fontSize: 20, fontWeight: 700 }}>✕</button>
                    <img src={lightbox} alt="Banner" style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 14, objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
                </div>,
                document.body
            )}
            <div style={{ background: 'rgba(4,158,223,0.04)', border: '1.5px solid rgba(4,158,223,0.15)', borderRadius: 11, padding: '10px 14px', margin: '0 0 2px' }}>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 900, color: '#049edf', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    🖼️ Banner Designs
                    <span style={{ background: '#049edf', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 900 }}>{banners.length}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {banners.map((b, i) => {
                        const imgUrl = b.imageUrl ?? b.ImageUrl ?? '';
                        const filename = b.contractFilename ?? b.ContractFilename ?? `Banner ${i + 1}`;
                        const fileType = b.fileUploadType ?? b.FileUploadType ?? '';
                        return (
                            <div key={b.custContractAttachID ?? i} onClick={() => setLightbox(imgUrl)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', background: '#fff', borderRadius: 8, border: '1.5px solid #e8e8f4', cursor: 'zoom-in', transition: 'border-color 0.15s, box-shadow 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#049edf'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(4,158,223,0.18)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8f4'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; }}>
                                <div style={{ width: 40, height: 40, borderRadius: 7, overflow: 'hidden', background: '#f0f0f8', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img src={imgUrl} alt={filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.innerHTML = '<span style="font-size:20px">🖼️</span>'; }} />
                                </div>
                                <div>
                                    {fileType && <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 9, fontWeight: 800, color: '#049edf', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{fileType}</div>}
                                    <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#5a5a78', fontWeight: 700, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {filename.length > 16 ? filename.slice(0, 14) + '…' : filename}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

/* ══════════════════════════════════════════
   TASK MODAL  (View + Update tabs)
══════════════════════════════════════════ */
function TaskModal({ task, initialTab = 'view', onClose, onSave }) {
    const [tab, setTab] = useState(initialTab);
    const [closeImg, setCloseImg] = useState([]);
    const [farImg, setFarImg] = useState([]);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [geoStatus, setGeoStatus] = useState('idle');
    const [geoData, setGeoData] = useState(null);
    const [saveErr, setSaveErr] = useState('');
    const [saved, setSaved] = useState(false);
    const [existingClose, setExistingClose] = useState([]);
    const [existingFar, setExistingFar] = useState([]);
    const [deleting, setDeleting] = useState(null);
    const [attLoading, setAttLoading] = useState(false);

    const job = task.job;
    const todayISO = new Date().toISOString().split('T')[0];

    const willSubmit = (closeImg.length > 0 || existingClose.length > 0) &&
        (farImg.length > 0 || existingFar.length > 0);

    const validate = () => {
        const errs = {};
        if (closeImg.length === 0 && existingClose.length === 0) errs.closeImg = 'At least one Short Vision photo required';
        if (farImg.length === 0 && existingFar.length === 0) errs.farImg = 'At least one Long Vision photo required';
        return errs;
    };

    const handleDeleteAttach = async (att) => {
        const attachID = att.jobTaskAttachID ?? att.JobTaskAttachID ?? att.id ?? att.ID;
        if (!attachID) return;
        if (!window.confirm('Delete this photo?')) return;
        setDeleting(attachID);
        try {
            await apiService.deleteJobTaskAttachment(attachID);
            const res = await apiService.getAllJobTaskAttachments();
            const all = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
            const taskIDs = new Set([task.jobTaskID, ...(task.mergedTaskIDs ?? [])].map(Number));
            const mine = all.filter(a => taskIDs.has(Number(a.jobTaskID ?? a.JobTaskID)));
            setExistingClose(mine.filter(a => (a.photoFileType ?? a.PhotoFileType ?? '').toLowerCase().includes('near')));
            setExistingFar(mine.filter(a => (a.photoFileType ?? a.PhotoFileType ?? '').toLowerCase().includes('far')));
        } catch (e) { alert(e?.message || 'Delete failed.'); }
        finally { setDeleting(null); }
    };

    const handleSave = async () => {
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setSaving(true); setSaveErr(''); setGeoStatus('locating');
        try {
            const geo = await getGeoPayload();
            setGeoStatus(geo.latitude !== 0 ? 'ready' : 'failed');
            setGeoData(geo);
            await onSave({
                ...task,
                status: 'Submitted',
                actualCompletionDate: task.actualCompletionDate || todayISO,
                closeImgs: closeImg,
                farImgs: farImg,
                geo,
            });
            setSaved(true);
            setTimeout(() => onClose(), 1200);
        } catch (e) {
            setGeoStatus('failed');
            setSaveErr(e?.response?.data?.message || e?.message || 'Save failed. Please try again.');
        } finally { setSaving(false); }
    };

    const InfoRow = ({ icon: Icon, label, value, accent = '#049edf' }) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', background: '#f8f8fd', borderRadius: 11, border: '1px solid #eeeefc' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: 'linear-gradient(135deg,#e8f6fd,#ede9ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color={accent} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 800, color: '#a0a0bc', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</div>
                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700, color: '#1a1a2e', wordBreak: 'break-word' }}>{value || '—'}</div>
            </div>
        </div>
    );

    useEffect(() => {
        if (!task.jobTaskID) return;
        setAttLoading(true);
        const taskIDs = new Set([task.jobTaskID, ...(task.mergedTaskIDs ?? [])].map(Number));
        apiService.getAllJobTaskAttachments()
            .then(res => {
                const all = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
                const mine = all.filter(a => taskIDs.has(Number(a.jobTaskID ?? a.JobTaskID)));
                setExistingClose(mine.filter(a => (a.photoFileType ?? a.PhotoFileType ?? '').toLowerCase().includes('near')));
                setExistingFar(mine.filter(a => (a.photoFileType ?? a.PhotoFileType ?? '').toLowerCase().includes('far')));
            })
            .catch(() => { })
            .finally(() => setAttLoading(false));
    }, [task.jobTaskID]);

    const ExistingGrid = ({ items, label }) => {
        if (!items.length) return null;
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: 6 }}>
                {items.map((att, i) => {
                    const rawPath = att.photoFilePath ?? att.PhotoFilePath ?? '';
                    const imgUrl = rawPath.startsWith('http') ? rawPath : `${API_ROOT_URL}${rawPath}`;
                    const attachID = att.jobTaskAttachID ?? att.JobTaskAttachID ?? att.id ?? att.ID;
                    const isDel = deleting === attachID;
                    return (
                        <div key={i} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', border: '2px solid #7dd5b0' }}>
                            <img src={imgUrl} alt={`${label} ${i + 1}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                                onClick={() => window.open(imgUrl, '_blank')}
                                onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:22px;background:#f0f0f8">🖼️</div>'; }} />

                            {/* This comment of the Delete button hide for the workers */}
                            {/* <button onClick={e => { e.stopPropagation(); handleDeleteAttach(att); }} disabled={isDel} title="Delete photo"
                                style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: isDel ? 'rgba(156,163,175,0.9)' : 'rgba(220,38,38,0.88)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isDel ? 'wait' : 'pointer', color: '#fff', padding: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
                                {isDel ? <Loader2 size={11} className="pg-spin" /> : <Trash2 size={11} />}
                            </button> */}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(26,158,110,0.75)', color: '#fff', fontFamily: 'Nunito,sans-serif', fontSize: 9, fontWeight: 700, padding: '2px 5px', textAlign: 'center' }}>
                                Uploaded ✓
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const contractID = Number(task.contract?.customerContractID ?? task.contract?.CustomerContractID ?? task.job?.customerContractID ?? task.job?.CustomerContractID ?? 0);

    return ReactDOM.createPortal(
        // <div onClick={e => e.target === e.currentTarget && onClose()}
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 1060, background: 'rgba(15,23,42,0.58)', backdropFilter: 'blur(7px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0, overflowY: 'auto' }}
            className="wt-modal-overlay">

            {/* On desktop: centered card. On mobile: bottom sheet */}
            <div className="wt-modal-inner" style={{
                background: '#fff',
                borderRadius: '22px 22px 0 0',
                width: '100%',
                maxWidth: 640,
                maxHeight: '95vh',
                overflowY: 'auto',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.22)',
                animation: 'wt-slide-up 0.28s cubic-bezier(0.22,1,0.36,1) both',
                // desktop: center it
                alignSelf: 'center',
            }}>
                {/* ── Banner ── */}
                <div className="wt-modal-banner" style={{ background: 'linear-gradient(135deg,#049edf 0%,#6c63ff 100%)', borderRadius: '22px 22px 0 0', padding: '20px 18px 16px', position: 'relative' }}>
                    {/* drag handle hint on mobile */}
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.4)', margin: '0 auto 12px', display: 'none' }} className="wt-drag-handle" />
                    <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                        <X size={14} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.36)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ClipboardList size={20} color="#fff" />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Task #{task.jobTaskID}</div>
                            <div className="wt-modal-banner-title" style={{ fontFamily: 'Nunito,sans-serif', fontSize: 16, fontWeight: 900, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {job?.jobType || `Job #${task.jobRequestID}`}
                            </div>
                            {job?.jobDescription && (
                                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.jobDescription}</div>
                            )}
                        </div>
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <StatusBadge status={task.status} />
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                            <Layers size={10} /> {task.hoardingCode || `Hoarding #${task.hoardingID}`}
                        </span>
                        {task.isMerged && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(255,255,255,0.3)', fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 800, color: '#fff' }}>
                                {task.mergeAlongFlag === 'H' ? '↔' : '↕'} Merged
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="wt-modal-tab-bar" style={{ display: 'flex', borderBottom: '1.5px solid #f0f0f8', padding: '0 18px', overflowX: 'auto' }}>
                    {[{ id: 'view', label: '📋 Details' }, { id: 'update', label: '✏️ Update Task' }].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '11px 16px', border: 'none', background: 'none', fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800, color: tab === t.id ? '#049edf' : '#9090a8', borderBottom: tab === t.id ? '2.5px solid #049edf' : '2.5px solid transparent', cursor: 'pointer', transition: 'all 0.15s', marginBottom: '-1.5px', whiteSpace: 'nowrap' }}>{t.label}</button>
                    ))}
                </div>

                {/* Banner images */}
                {contractID > 0 && (
                    <div style={{ padding: '10px 18px 0' }}>
                        <BannerStrip contractID={contractID} />
                    </div>
                )}

                {/* ════ DETAILS TAB ════ */}
                {tab === 'view' && (
                    <div className="wt-modal-body" style={{ padding: '18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 900, color: '#b0b0cc', letterSpacing: '0.7px', textTransform: 'uppercase' }}>Task Details</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <InfoRow icon={Hash} label="Task ID" value={`#${task.jobTaskID}`} />
                            <InfoRow icon={Briefcase} label="Job Request" value={`#${task.jobRequestID}`} accent="#6c63ff" />
                            <InfoRow icon={Layers} label="Hoarding" value={task.hoardingCode || `#${task.hoardingID}`} accent="#6c63ff" />
                            {task.siteAddress && <InfoRow icon={MapPin} label="Site Address" value={task.siteAddress} accent="#16a34a" />}
                            {task.isMerged && <InfoRow icon={Layers} label="Merge Type" value={task.mergeAlongFlag === 'H' ? '↔ Horizontal Merge' : '↕ Vertical Merge'} accent="#7c3aed" />}
                            <InfoRow icon={CheckCircle} label="Status" value={task.status} />
                            <InfoRow icon={Calendar} label="Completion Date" value={fmtDate(task.actualCompletionDate)} />
                            <InfoRow icon={Calendar} label="Submitted At" value={fmtDateTime(task.submitDTTM)} />
                            <InfoRow icon={Calendar} label="Last Updated" value={fmtDateTime(task.lastUpdateDttm)} />
                        </div>
                        {job && (
                            <>
                                <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 900, color: '#b0b0cc', letterSpacing: '0.7px', textTransform: 'uppercase', marginTop: 4 }}>Job Details</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <InfoRow icon={Briefcase} label="Job Type" value={job.jobType} accent="#6c63ff" />
                                    <InfoRow icon={ClipboardList} label="Description" value={job.jobDescription} accent="#6c63ff" />
                                    <InfoRow icon={CheckCircle} label="Job Status" value={job.jobStatus} accent="#6c63ff" />
                                    <InfoRow icon={Layers} label="No. of Hoardings" value={job.noofHoardings} accent="#6c63ff" />
                                    <InfoRow icon={Calendar} label="Target Date" value={fmtDate(job.targetCompletionDate)} accent="#6c63ff" />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ════ UPDATE TAB ════ */}
                {tab === 'update' && (
                    <div className="wt-modal-body" style={{ padding: '18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Status preview */}
                        <div>
                            <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Task Status</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 10, background: getStatusStyle(task.status).bg, border: `1.5px solid ${getStatusStyle(task.status).border}` }}>
                                    {(() => { const S = getStatusStyle(task.status); return <S.icon size={13} color={S.color} />; })()}
                                    <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: getStatusStyle(task.status).color }}>{task.status}</span>
                                </div>
                                {willSubmit && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6c63ff', fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700 }}>
                                            <ChevronRight size={14} /> Auto-change to
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 10, background: '#f3e8ff', border: '1.5px solid #c4b5fd' }}>
                                            <SendHorizonal size={13} color="#7c3aed" />
                                            <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#7c3aed' }}>Submitted</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Photo uploads */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: '1.5px solid #f0f0f8', flexWrap: 'wrap' }}>
                                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,rgba(4,158,223,0.12),rgba(108,99,255,0.09))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Camera size={16} color="#049edf" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800, color: '#1a1a2e' }}>Site Photos</div>
                                    <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 600, color: '#9090a8' }}>Both photos are mandatory to submit</div>
                                </div>
                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                    {[
                                        { label: 'Short', done: existingClose.length > 0 || closeImg.length > 0, count: existingClose.length + closeImg.length },
                                        { label: 'Long', done: existingFar.length > 0 || farImg.length > 0, count: existingFar.length + farImg.length },
                                    ].map(p => (
                                        <span key={p.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontFamily: 'Nunito,sans-serif', fontWeight: 700, background: p.done ? '#e8faf3' : '#f0f0f8', color: p.done ? '#1a9e6e' : '#9090a8', border: `1px solid ${p.done ? '#7dd5b0' : '#e0e0f0'}` }}>
                                            {p.done ? <Check size={10} /> : <ImagePlus size={10} />} {p.label} {p.count > 0 && `(${p.count})`}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {attLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px', fontFamily: 'Nunito,sans-serif', fontSize: 13, color: '#9090a8' }}>
                                    <Loader2 size={14} color="#049edf" className="pg-spin" /> Loading existing photos…
                                </div>
                            ) : (
                                /* ── RESPONSIVE: stack on small, side-by-side on wide ── */
                                <div className="wt-photo-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Short Vision <span style={{ color: '#ef4444' }}>*</span>
                                            {existingClose.length > 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#1a9e6e', background: '#e8faf3', padding: '1px 7px', borderRadius: 20, border: '1px solid #7dd5b0' }}>{existingClose.length} uploaded</span>}
                                        </div>
                                        <ExistingGrid items={existingClose} label="Near" />
                                        <ImageUploadZone label="Short Vision" sublabel="(Close-up)" IconComp={ZoomIn} values={closeImg}
                                            onChange={v => { setCloseImg(v); setErrors(e => ({ ...e, closeImg: '' })); }} error={errors.closeImg} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Long Vision <span style={{ color: '#ef4444' }}>*</span>
                                            {existingFar.length > 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#1a9e6e', background: '#e8faf3', padding: '1px 7px', borderRadius: 20, border: '1px solid #7dd5b0' }}>{existingFar.length} uploaded</span>}
                                        </div>
                                        <ExistingGrid items={existingFar} label="Far" />
                                        <ImageUploadZone label="Long Vision" sublabel="(Wide shot)" IconComp={ZoomOut} values={farImg}
                                            onChange={v => { setFarImg(v); setErrors(e => ({ ...e, farImg: '' })); }} error={errors.farImg} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Geo status */}
                        {geoStatus !== 'idle' && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10,
                                background: geoStatus === 'locating' ? 'rgba(4,158,223,0.06)' : geoStatus === 'ready' ? 'rgba(26,158,110,0.07)' : 'rgba(239,68,68,0.06)',
                                border: `1px solid ${geoStatus === 'locating' ? '#b3d9f5' : geoStatus === 'ready' ? '#7dd5b0' : '#fecaca'}`,
                                fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700,
                                color: geoStatus === 'locating' ? '#049edf' : geoStatus === 'ready' ? '#1a9e6e' : '#dc2626',
                                flexWrap: 'wrap',
                            }}>
                                {geoStatus === 'locating' && <><Loader2 size={13} className="pg-spin" /> Capturing location…</>}
                                {geoStatus === 'ready' && <>
                                    <MapPin size={13} />
                                    Location captured
                                    {geoData?.address && (
                                        <span style={{ fontWeight: 600, color: '#4a5568', marginLeft: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                            · {geoData.address.length > 45 ? geoData.address.slice(0, 43) + '…' : geoData.address}
                                        </span>
                                    )}
                                </>}
                                {geoStatus === 'failed' && <><AlertTriangle size={13} /> Location unavailable — photo uploaded without GPS</>}
                            </div>
                        )}

                        {saveErr && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 600 }}>
                                <AlertCircle size={13} /> {saveErr}
                            </div>
                        )}
                        {saved && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 11, color: '#16a34a', fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 700 }}>
                                <CheckCircle size={16} /> Task submitted successfully!
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="wt-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px 18px', borderTop: '1px solid #f0f0f8', flexWrap: 'wrap', gap: 10 }}>
                    <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 11, background: '#f5f5fb', border: '1.5px solid #e8e8f0', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: 13, color: '#7878a0' }}>Close</button>
                    {tab === 'view' ? (
                        <button onClick={() => setTab('update')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#049edf,#6c63ff)', color: '#fff', fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 16px rgba(4,158,223,0.32)' }}>
                            <Edit3 size={13} /> Update Task
                        </button>
                    ) : (
                        <button onClick={handleSave} disabled={saving || saved} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 24px', borderRadius: 11, border: 'none', background: saved ? '#16a34a' : saving ? '#a0c8e8' : 'linear-gradient(135deg,#049edf,#6c63ff)', color: '#fff', fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 13, cursor: saving || saved ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(4,158,223,0.28)', transition: 'background 0.2s' }}>
                            {saving ? <Loader2 size={13} className="pg-spin" /> : saved ? <CheckCircle size={13} /> : <SendHorizonal size={13} />}
                            {saving ? 'Submitting…' : saved ? 'Submitted!' : 'Submit Task'}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

/* ══════════════════════════════════════════
   MERGED GROUP ROW  (desktop table)
══════════════════════════════════════════ */
function MergedGroupRow({ groupTasks, onView, onEdit }) {
    const flag = groupTasks[0]?.mergeAlongFlag || 'H';
    const firstTask = groupTasks[0];
    const job = firstTask?.job;
    const addresses = [...new Set(groupTasks.map(t => t.siteAddress).filter(Boolean))];
    const allSubmitted = groupTasks.every(t => t.status === 'Submitted' || t.status === 'Completed');
    const anyOpen = groupTasks.some(t => t.status === 'Open');
    const groupStatus = allSubmitted ? 'Submitted' : anyOpen ? 'Open' : groupTasks[0]?.status || 'Open';

    return (
        <tr className="pg-tr" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.03), transparent)' }}>
            <td className="pg-td">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {groupTasks.map(t => (
                        <span key={t.jobTaskID} style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, color: '#049edf', fontSize: 11 }}>#{t.jobTaskID}</span>
                    ))}
                </div>
            </td>
            <td className="pg-td">
                <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, color: '#6c63ff', fontSize: 12 }}>#{firstTask.jobRequestID}</span>
            </td>
            <td className="pg-td">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, color: '#1a1a2e' }}>{job?.jobType || '—'}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.22)', fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 800 }}>
                            {flag === 'H' ? '↔' : '↕'} {flag === 'H' ? 'Horizontal' : 'Vertical'} Merge
                        </span>
                    </div>
                    {job?.jobDescription && (
                        <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }} title={job.jobDescription}>
                            {job.jobDescription}
                        </div>
                    )}
                </div>
            </td>
            <td className="pg-td">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {groupTasks.map(t => (
                        <span key={t.jobTaskID} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(124,58,237,0.08)', color: '#7c3aed', padding: '2px 8px', borderRadius: 20, fontWeight: 800, fontSize: 10, border: '1px solid rgba(124,58,237,0.2)', whiteSpace: 'nowrap' }}>
                            <Layers size={9} /> {t.hoardingCode || `#${t.hoardingID}`}
                        </span>
                    ))}
                    {addresses.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: 2 }}>
                            <MapPin size={10} color="#9090a8" style={{ flexShrink: 0, marginTop: 2 }} />
                            <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10.5, color: '#6b7280', fontWeight: 600, lineHeight: 1.4 }}>{addresses.join(' / ')}</span>
                        </div>
                    )}
                </div>
            </td>
            <td className="pg-td pg-tablet-hide">
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4a5568', fontSize: 12 }}>
                    <Calendar size={11} color="#c0c0d8" /> {fmtDate(firstTask.actualCompletionDate)}
                </span>
            </td>
            <td className="pg-td pg-tablet-hide">
                <span style={{ color: '#4a5568', fontSize: 12 }}>{fmtDate(firstTask.submitDTTM)}</span>
            </td>
            <td className="pg-td"><StatusBadge status={groupStatus} /></td>
            {/* ── Per-task action buttons in desktop table ── */}
            <td className="pg-td">
                <div className="pg-action-wrap">
                    <button className="pg-btn-edit" title="Update Merged Group"
                        onClick={() => onEdit({ ...firstTask, mergedTaskIDs: groupTasks.map(x => x.jobTaskID) })}>
                        <Edit3 size={12} />
                    </button>
                    <button className="pg-btn-view" title="View Merged Group"
                        onClick={() => onView({ ...firstTask, mergedTaskIDs: groupTasks.map(x => x.jobTaskID) })}>
                        <Eye size={12} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

/* ─── Mobile Task Card ─── */
function TaskCard({ task, onView, onEdit }) {
    const st = getStatusStyle(task.status);
    const job = task.job;
    return (
        <div className="pg-card">
            <div className="pg-card__header">
                <div className="pg-card__title-wrap">
                    <div className="pg-card__title">{job?.jobType || `Job #${task.jobRequestID}`}</div>
                    <div className="pg-card__subtitle">Task #{task.jobTaskID}{task.hoardingCode ? ` · ${task.hoardingCode}` : ''}</div>
                </div>
                <div className="pg-card__actions">
                    <button className="pg-card__btn-edit" onClick={() => onEdit(task)} title="Update"><Edit3 size={13} /></button>
                    <button className="pg-card__btn-view" onClick={() => onView(task)} title="View"><Eye size={13} /></button>
                </div>
            </div>
            <div className="pg-card__body">
                {task.isMerged && (
                    <div className="pg-card__row">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)', fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 800 }}>
                            {task.mergeAlongFlag === 'H' ? '↔' : '↕'} {task.mergeAlongFlag === 'H' ? 'Horizontal' : 'Vertical'} Merge
                        </span>
                    </div>
                )}
                <div className="pg-card__row">
                    <Layers size={12} color="#c0c0d8" className="pg-card__row-icon" />
                    <span className="pg-card__row-text">{task.hoardingCode || `Hoarding #${task.hoardingID}`}</span>
                </div>
                {task.siteAddress && (
                    <div className="pg-card__row">
                        <MapPin size={12} color="#c0c0d8" className="pg-card__row-icon" />
                        <span className="pg-card__row-text" style={{ fontSize: 11, color: '#6b7280' }}>{task.siteAddress}</span>
                    </div>
                )}
                <div className="pg-card__row">
                    <Calendar size={12} color="#c0c0d8" className="pg-card__row-icon" />
                    <span className="pg-card__row-text--ellipsis">{fmtDate(task.actualCompletionDate)}</span>
                </div>
                <div className="pg-card__grid2">
                    <div className="pg-card__grid-cell">
                        <Briefcase size={11} color="#c0c0d8" />
                        <span className="pg-card__grid-text">Job #{task.jobRequestID}</span>
                    </div>
                    <div className="pg-card__grid-cell">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color, fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800 }}>{task.status}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Mobile merged group card — individual buttons per task ─── */
function MergedGroupCard({ groupTasks, onView, onEdit }) {
    const flag = groupTasks[0]?.mergeAlongFlag || 'H';
    const firstTask = groupTasks[0];
    const job = firstTask?.job;
    const addresses = [...new Set(groupTasks.map(t => t.siteAddress).filter(Boolean))];

    return (
        <div className="pg-card" style={{ border: '1.5px solid rgba(124,58,237,0.3)', background: 'linear-gradient(135deg,rgba(124,58,237,0.03),#fff)' }}>
            {/* Merge header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 8px', borderBottom: '1px solid rgba(124,58,237,0.12)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16 }}>{flag === 'H' ? '↔' : '↕'}</span>
                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 900, color: '#7c3aed' }}>
                    {flag === 'H' ? 'Horizontal' : 'Vertical'} Merge
                </span>
                <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 11, color: '#9090a8', fontWeight: 600 }}>
                    · {groupTasks.length} hoardings
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {groupTasks.map(t => t.hoardingCode).filter(Boolean).map(code => (
                        <span key={code} style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 6, background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)' }}>{code}</span>
                    ))}
                </div>
            </div>

            <div className="pg-card__body">
                {/* Job info */}
                <div className="pg-card__row">
                    <Briefcase size={12} color="#c0c0d8" className="pg-card__row-icon" />
                    <span className="pg-card__row-text">{job?.jobType || `Job #${firstTask.jobRequestID}`}</span>
                </div>
                {job?.jobDescription && (
                    <div className="pg-card__row">
                        <ClipboardList size={12} color="#c0c0d8" className="pg-card__row-icon" />
                        <span className="pg-card__row-text" style={{ fontSize: 11, color: '#9090a8' }}>{job.jobDescription}</span>
                    </div>
                )}
                {addresses.length > 0 && (
                    <div className="pg-card__row">
                        <MapPin size={12} color="#c0c0d8" className="pg-card__row-icon" />
                        <span className="pg-card__row-text" style={{ fontSize: 11, color: '#6b7280' }}>{addresses.join(' / ')}</span>
                    </div>
                )}

                {/* ── Per-task rows with individual Edit + View buttons ── */}
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button
                        onClick={() => onEdit({ ...firstTask, mergedTaskIDs: groupTasks.map(x => x.jobTaskID) })}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '9px 14px', borderRadius: 10,
                            background: 'rgba(4,158,223,0.08)', border: '1.5px solid rgba(4,158,223,0.2)',
                            color: '#049edf', cursor: 'pointer', fontFamily: 'Nunito,sans-serif',
                            fontSize: 13, fontWeight: 800,
                        }}>
                        <Edit3 size={13} /> Edit Group
                    </button>
                    <button
                        onClick={() => onView({ ...firstTask, mergedTaskIDs: groupTasks.map(x => x.jobTaskID) })}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '9px 14px', borderRadius: 10,
                            background: 'linear-gradient(135deg,#049edf,#6c63ff)', border: 'none',
                            color: '#fff', cursor: 'pointer', fontFamily: 'Nunito,sans-serif',
                            fontSize: 13, fontWeight: 800,
                            boxShadow: '0 2px 8px rgba(4,158,223,0.28)',
                        }}>
                        <Eye size={13} /> View Group
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════
   WORKER TASKS PAGE
══════════════════════════════════════════ */
export default function WorkerTasksPage() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [modalTask, setModalTask] = useState(null);
    const [modalTab, setModalTab] = useState('view');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortKey, setSortKey] = useState('jobTaskID');
    const [sortDir, setSortDir] = useState('desc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const tableRef = useRef(null);
    const [tableReady, setTableReady] = useState(false);
    useResizableColumns(tableRef, tableReady, [80, 80, 180, 100, 130, 140, 130, 110]);

    const fetchData = useCallback(async () => {
        setLoading(true); setFetchError('');
        try {
            const userId = parseInt(localStorage.getItem('userId') || '0', 10);
            const assignRes = await apiService.getJobTaskAssignsByUserId(userId);
            const assigns = Array.isArray(assignRes) ? assignRes : Array.isArray(assignRes?.data) ? assignRes.data : [];
            if (assigns.length === 0) { setTasks([]); setLoading(false); return; }
            const assignedTaskIds = new Set(assigns.map(a => Number(a.jobTaskID ?? a.JobTaskID)));
            const [tRes, jRes, contractRes, hRaw, sRaw, mergeRaw] = await Promise.all([
                apiService.getAllJobTasks(),
                apiService.getAllJobRequests(),
                apiService.getAllCustomerContracts(),
                apiService.getAllHoardings(),
                apiService.getAllSites().catch(() => []),
                apiService.getAllHoardingMerges().catch(() => []),
            ]);
            const siteList = extractArray(sRaw);
            const siteMap = new Map(siteList.map(s => [Number(s.siteID ?? s.SiteID ?? 0), { addressLine1: s.addressLine1 ?? s.AddressLine1 ?? '', addressLine2: s.addressLine2 ?? s.AddressLine2 ?? '', city: s.city ?? s.City ?? '', district: s.district ?? s.District ?? '', landmark: s.landmark ?? s.Landmark ?? '' }]));
            const rawHoardings = extractArray(hRaw);
            const enrichedHoardings = rawHoardings.map(h => { const siteID = Number(h.siteID ?? h.SiteID ?? h.siteId ?? 0); return { ...h, site: siteMap.get(siteID) || h.site || null }; });
            const hoardingMap = new Map(enrichedHoardings.map(h => [Number(h.hoardingID ?? h.HoardingID ?? 0), h]));
            const mergeList = extractArray(mergeRaw);
            const mergeMap = new Map(mergeList.map(m => [Number(m.hoardingID ?? m.HoardingID ?? 0), m]));
            const allJobs = extractArray(jRes);
            const jobMap = {};
            allJobs.forEach(j => { const n = normalizeJob(j); jobMap[n.jobRequestID] = n; });
            const allContracts = extractArray(contractRes);
            const contractMap = {};
            allContracts.forEach(c => { contractMap[Number(c.customerContractID ?? c.CustomerContractID)] = c; });
            const allTasks = extractArray(tRes);
            const myTasks = allTasks
                .filter(t => assignedTaskIds.has(Number(t.jobTaskID ?? t.JobTaskID)))
                .map(raw => {
                    const task = normalizeTask(raw);
                    const h = hoardingMap.get(Number(task.hoardingID));
                    const merge = mergeMap.get(Number(task.hoardingID));
                    const jobObj = jobMap[task.jobRequestID] ?? null;
                    const contractID = jobObj?.customerContractID ?? 0;
                    return { ...task, hoardingCode: h?.hoardingCode ?? h?.HoardingCode ?? '', siteAddress: getSiteAddress(h), mergeAlongFlag: merge?.mergeAlongFlag ?? null, isMerged: !!merge, job: jobObj, contract: contractMap[contractID] ?? null };
                });
            const jobMergeFlags = new Map();
            myTasks.forEach(t => { if (t.isMerged && !jobMergeFlags.has(t.jobRequestID)) jobMergeFlags.set(t.jobRequestID, t.mergeAlongFlag); });
            const finalTasks = myTasks.map(t => jobMergeFlags.has(t.jobRequestID) ? { ...t, isMerged: true, mergeAlongFlag: t.mergeAlongFlag ?? jobMergeFlags.get(t.jobRequestID) } : t);
            setTasks(finalTasks);
        } catch (err) {
            setFetchError(err?.response?.data?.message || err?.message || 'Failed to load tasks.');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { if (!loading) setTableReady(true); }, [loading]);

    const handleSave = async (data) => {
        const userId = parseInt(localStorage.getItem('userId') || '0', 10);
        const nowISO = new Date().toISOString();
        const geo = data.geo ?? await getGeoPayload();
        await apiService.updateJobTask({
            jobTaskID: data.jobTaskID, jobRequestID: data.jobRequestID,
            hoardingID: data.hoardingID, status: 'Submitted',
            actualCompletionDate: data.actualCompletionDate,
            submitDTTM: nowISO, lastUpdateDttm: nowISO, lastUpdatedBy: userId,
        });
        const uploadWithGeo = async (file, photoFileType) => {
            const fd = new FormData();
            fd.append('JobTaskAttachID', '0'); fd.append('JobTaskID', String(data.jobTaskID));
            fd.append('JobRequestID', String(data.jobRequestID)); fd.append('HoardingID', String(data.hoardingID));
            fd.append('PhotoFileType', photoFileType); fd.append('Files', file);
            fd.append('PhotoFilePath', ''); fd.append('PhotoFilename', file.name);
            fd.append('LastUpdateDttm', nowISO); fd.append('LastUpdatedBy', String(userId));
            await apiService.uploadJobTaskAttachment(fd);
            const geoFd = new FormData();
            geoFd.append('Image', file); geoFd.append('Latitude', String(geo.latitude));
            geoFd.append('Longitude', String(geo.longitude)); geoFd.append('Accuracy', String(geo.accuracy));
            geoFd.append('Address', geo.address); geoFd.append('CapturedAt', nowISO);
            await apiService.uploadGeoLocation(geoFd);
        };
        for (const file of data.closeImgs ?? []) await uploadWithGeo(file, 'Near Photo');
        for (const file of data.farImgs ?? []) await uploadWithGeo(file, 'Far Photo');
        await fetchData();
    };

    const filtered = tasks.filter(t => {
        const q = search.toLowerCase();
        return (
            (String(t.jobTaskID).includes(q) || String(t.jobRequestID).includes(q) ||
                String(t.hoardingID).includes(q) || (t.status || '').toLowerCase().includes(q) ||
                (t.job?.jobType || '').toLowerCase().includes(q) || (t.job?.jobDescription || '').toLowerCase().includes(q) ||
                (t.hoardingCode || '').toLowerCase().includes(q) || (t.siteAddress || '').toLowerCase().includes(q))
            && (statusFilter === 'all' || t.status === statusFilter)
        );
    });

    const sorted = [...filtered].sort((a, b) => {
        let av = a[sortKey], bv = b[sortKey];
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const displayRows = useMemo(() => {
        const rows = [];
        const mergedGroupMap = new Map();
        sorted.forEach(task => {
            if (task.isMerged) {
                const key = `merged__${task.jobRequestID}`;
                if (mergedGroupMap.has(key)) { rows[mergedGroupMap.get(key)].groupTasks.push(task); }
                else { mergedGroupMap.set(key, rows.length); rows.push({ type: 'merged', groupTasks: [task] }); }
            } else {
                rows.push({ type: 'single', task });
            }
        });
        return rows;
    }, [sorted]);

    const totalPages = Math.max(1, Math.ceil(displayRows.length / pageSize));
    const paginatedRows = displayRows.slice((page - 1) * pageSize, page * pageSize);

    const handleSort = key => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
        setPage(1);
    };

    const openCount = tasks.filter(t => t.status === 'Open').length;
    const inProgCount = tasks.filter(t => t.status === 'In Progress').length;
    const subCount = tasks.filter(t => t.status === 'Submitted').length;

    const COLS = [
        { key: 'jobTaskID', label: 'Task ID', w: '7%' },
        { key: 'jobRequestID', label: 'Job ID', w: '7%' },
        { key: '_jobType', label: 'Job Type', w: '16%', noSort: true },
        { key: 'hoardingID', label: 'Hoarding', w: '14%' },
        { key: 'actualCompletionDate', label: 'Comp. Date', w: '11%', tabletHide: true },
        { key: 'submitDTTM', label: 'Submitted', w: '11%', tabletHide: true },
        { key: 'status', label: 'Status', w: '13%' },
        { key: '_action', label: 'Actions', w: '12%', noSort: true },
    ];

    const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
        .reduce((acc, p, i, arr) => { if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…'); acc.push(p); return acc; }, []);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
            <Loader2 size={32} color="#049edf" className="pg-spin" />
            <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>Loading your tasks…</span>
        </div>
    );
    if (fetchError) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
            <AlertCircle size={28} color="#ef4444" />
            <span style={{ fontFamily: 'Nunito,sans-serif', color: '#ef4444', fontSize: 14 }}>{fetchError}</span>
            <button className="pg-btn-add" onClick={fetchData}><RefreshCw size={13} /> Retry</button>
        </div>
    );

    return (
        <>
            {/* Add slide-up animation keyframe */}
            <style>{`
                @keyframes wt-slide-up {
                    from { opacity: 0; transform: translateY(40px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @media (min-width: 521px) {
                    .wt-modal-overlay {
                        align-items: center !important;
                        padding: 16px !important;
                    }
                    .wt-modal-inner {
                        border-radius: 22px !important;
                        max-width: 640px !important;
                        align-self: auto !important;
                    }
                    .wt-drag-handle { display: none !important; }
                }
                @media (max-width: 520px) {
                    .wt-modal-overlay { align-items: flex-end !important; }
                    .wt-modal-inner {
                        border-radius: 22px 22px 0 0 !important;
                        max-height: 92vh !important;
                        max-width: 100% !important;
                    }
                    .wt-drag-handle { display: block !important; }
                    .wt-modal-banner { border-radius: 22px 22px 0 0 !important; padding: 14px 14px 12px !important; }
                    .wt-modal-body { padding: 14px 14px !important; }
                    .wt-modal-tab-bar { padding: 0 12px !important; }
                    .wt-modal-footer { padding: 10px 14px 20px !important; flex-direction: column-reverse !important; align-items: stretch !important; }
                    .wt-modal-footer button { width: 100% !important; justify-content: center !important; }
                    .wt-photo-grid { grid-template-columns: 1fr !important; }
                }
                @media (max-width: 480px) {
                    .wt-page-header { flex-direction: column; align-items: flex-start; gap: 10px; }
                    .wt-header-actions { width: 100%; }
                    .wt-header-actions button { flex: 1; justify-content: center; }
                    .wt-stat-strip { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
                }
            `}</style>

            <div className="pg-page" style={{ padding: '20px 16px' }}>

                {/* ── Header ── */}
                <div className="pg-header wt-page-header" style={{ marginBottom: 16 }}>
                    <div>
                        <h1 className="pg-header__title" style={{ fontSize: 'clamp(18px,5vw,26px)' }}>My Tasks</h1>
                        <p className="pg-header__subtitle">All job tasks <strong>assigned to you</strong>.</p>
                    </div>
                    <div className="wt-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button className="pg-pg-btn" onClick={fetchData} title="Refresh" style={{ width: 38, height: 38 }}>
                            <RefreshCw size={14} />
                        </button>
                        <button
                            onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 11, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                        >
                            <LogOut size={14} /> Logout
                        </button>
                    </div>
                </div>

                {/* ── Stat strip ── */}
                <div className="wt-stat-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                    {[
                        { label: 'Total', val: tasks.length, color: '#1a1a2e', bg: 'rgba(100,100,180,0.08)', border: '#e0e0f0', filter: 'all' },
                        { label: 'Open', val: openCount, color: '#049edf', bg: 'rgba(4,158,223,0.08)', border: '#b3d9f5', filter: 'Open' },
                        { label: 'In Progress', val: inProgCount, color: '#e08a00', bg: 'rgba(245,158,11,0.08)', border: '#f5d87a', filter: 'In Progress' },
                        { label: 'Submitted', val: subCount, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: '#c4b5fd', filter: 'Submitted' },
                    ].map(s => (
                        <div key={s.label} onClick={() => { setStatusFilter(statusFilter === s.filter ? 'all' : s.filter); setPage(1); }}
                            style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 14, padding: '12px 14px', border: statusFilter === s.filter ? `2px solid ${s.color}` : `1.5px solid ${s.border}`, boxShadow: '0 2px 14px rgba(100,100,180,0.07)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <ClipboardList size={16} color={s.color} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: 9, color: '#9090a8', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
                                <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: 20, fontWeight: 900, color: s.color, margin: '2px 0 0' }}>{s.val}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Table container ── */}
                <div className="pg-container">
                    {/* toolbar */}
                    <div className="pg-toolbar">
                        <div className="pg-toolbar__inner">
                            <div className="pg-toolbar__count">
                                <ClipboardList size={14} color="#9090a8" />
                                <span><strong>{filtered.length}</strong> task{filtered.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="pg-search-box" style={{ flex: 1, maxWidth: 320 }}>
                                <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
                                <input placeholder="Search task, job, hoarding…" value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }} />
                                {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
                            </div>
                            <div className="wt-filter-btns" style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                {['all', 'Open', 'In Progress', 'Submitted'].map(f => (
                                    <button key={f} onClick={() => { setStatusFilter(f); setPage(1); }} style={{ padding: '5px 11px', borderRadius: 20, whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s', border: statusFilter === f ? '1.5px solid #049edf' : '1.5px solid #e8e8f4', background: statusFilter === f ? 'rgba(4,158,223,0.08)' : '#f8f8fd', color: statusFilter === f ? '#049edf' : '#7878a0', fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800 }}>
                                        {f === 'all' ? 'All' : f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* desktop table */}
                    <div className="pg-desktop-table">
                        <table ref={tableRef} className="pg-table" style={{ minWidth: 640 }}>
                            <thead>
                                <tr>
                                    {COLS.map(col => (
                                        <th key={col.key} style={{ width: col.w }}
                                            className={['pg-th', col.noSort ? '' : 'pg-th--sort', col.tabletHide ? 'pg-tablet-hide' : ''].filter(Boolean).join(' ')}
                                            onClick={() => !col.noSort && handleSort(col.key)}>
                                            <div className="pg-th__inner">
                                                {col.label}
                                                {!col.noSort ? <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} /> : <Filter size={10} color="#d0d0e4" style={{ marginLeft: 5 }} />}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRows.length === 0 ? (
                                    <tr><td colSpan={COLS.length} className="pg-td pg-empty" style={{ maxWidth: 'none' }}>
                                        <div className="pg-empty__inner"><ClipboardList size={36} color="#d0d0e8" /><span className="pg-empty__label">No tasks found</span></div>
                                    </td></tr>
                                ) : paginatedRows.map((row, i) => {
                                    if (row.type === 'merged') {
                                        return (
                                            <MergedGroupRow key={`merged-${row.groupTasks[0].jobTaskID}`}
                                                groupTasks={row.groupTasks}
                                                onView={t => { setModalTask(t); setModalTab('view'); }}
                                                onEdit={t => { setModalTask(t); setModalTab('update'); }} />
                                        );
                                    }
                                    const task = row.task;
                                    return (
                                        <tr key={task.jobTaskID} className="pg-tr">
                                            <td className="pg-td"><span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, color: '#049edf', fontSize: 12 }}>#{task.jobTaskID}</span></td>
                                            <td className="pg-td"><span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, color: '#6c63ff', fontSize: 12 }}>#{task.jobRequestID}</span></td>
                                            <td className="pg-td">
                                                <div className="pg-td__primary">{task.job?.jobType || '—'}</div>
                                                {task.job?.jobDescription && <div className="pg-td__secondary pg-td__ellipsis" title={task.job.jobDescription}>{task.job.jobDescription}</div>}
                                            </td>
                                            <td className="pg-td">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(108,99,255,0.08)', color: '#6c63ff', padding: '2px 9px', borderRadius: 20, fontWeight: 800, fontSize: 11 }}>
                                                        <Layers size={10} /> {task.hoardingCode || `#${task.hoardingID}`}
                                                    </span>
                                                    {task.siteAddress && (
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                                                            <MapPin size={10} color="#9090a8" style={{ flexShrink: 0, marginTop: 2 }} />
                                                            <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 10.5, color: '#6b7280', fontWeight: 600, lineHeight: 1.4 }}>{task.siteAddress}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="pg-td pg-tablet-hide">
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4a5568', fontSize: 12 }}>
                                                    <Calendar size={11} color="#c0c0d8" /> {fmtDate(task.actualCompletionDate)}
                                                </span>
                                            </td>
                                            <td className="pg-td pg-tablet-hide">
                                                <span style={{ color: '#4a5568', fontSize: 12 }}>{fmtDate(task.submitDTTM)}</span>
                                            </td>
                                            <td className="pg-td"><StatusBadge status={task.status} /></td>
                                            <td className="pg-td">
                                                <div className="pg-action-wrap">
                                                    <button className="pg-btn-edit" title="Update Task" onClick={() => { setModalTask(task); setModalTab('update'); }}><Edit3 size={13} /></button>
                                                    <button className="pg-btn-view" title="View Details" onClick={() => { setModalTask(task); setModalTab('view'); }}><Eye size={13} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* mobile cards */}
                    <div className="pg-mobile-cards">
                        {paginatedRows.length === 0
                            ? <div className="pg-empty__inner" style={{ padding: '40px 20px' }}><ClipboardList size={36} color="#d0d0e8" /><span className="pg-empty__label">No tasks found</span></div>
                            : paginatedRows.map((row) => {
                                if (row.type === 'merged') {
                                    return (
                                        <MergedGroupCard key={`merged-m-${row.groupTasks[0].jobTaskID}`}
                                            groupTasks={row.groupTasks}
                                            onView={t => { setModalTask(t); setModalTab('view'); }}
                                            onEdit={t => { setModalTask(t); setModalTab('update'); }} />
                                    );
                                }
                                return (
                                    <TaskCard key={row.task.jobTaskID} task={row.task}
                                        onView={t => { setModalTask(t); setModalTab('view'); }}
                                        onEdit={t => { setModalTask(t); setModalTab('update'); }} />
                                );
                            })
                        }
                    </div>

                    {/* pagination */}
                    <div className="pg-pagination">
                        <div className="pg-pagination__left">
                            <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button>
                            <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
                            {pageNums.map((p, i) =>
                                p === '…' ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span>
                                    : <button key={p} className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                            )}
                            <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></button>
                            <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={13} /></button>
                        </div>
                        <div className="pg-pagination__right">
                            <select className="pg-pagesize-select" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <span className="pg-pagination__text">/ page</span>
                            <span className="pg-pagination__text">{page}/{totalPages}</span>
                        </div>
                    </div>
                </div>
            </div>

            {modalTask && (
                <TaskModal task={modalTask} initialTab={modalTab}
                    onClose={() => setModalTask(null)} onSave={handleSave} />
            )}
        </>
    );
}