import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  BarChart2, Download, FileSpreadsheet, FileText,
  ChevronDown, AlertCircle, Loader2, TrendingUp, Receipt,
} from 'lucide-react';
import { apiService } from '../api/api';

/* ─────────────────────────────────────────
   REPORTS REGISTRY
───────────────────────────────────────── */
const REPORTS = [
  {
    id: 'available-hoardings',
    title: 'Available Hoardings Report',
    description:
      'All hoardings currently available for booking — includes site details, dimensions, type, and rental information.',
    icon: TrendingUp,
    color: '#049edf',
    excelOnly: false,
    exportExcel: () => apiService.exportReportExcel('AvailableHoardings'),
    exportPDF:   () => apiService.exportReportPDF('AvailableHoardings'),
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
function useOutsideClick(ref, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, ref, onClose]);
}

/* ─────────────────────────────────────────
   DOWNLOAD DROPDOWN BUTTON
───────────────────────────────────────── */
function DownloadDropdown({ onExportExcel, onExportPDF, excelOnly }) {
  const [open, setOpen]           = useState(false);
  const [exporting, setExporting] = useState(null);
  const wrapRef = useRef(null);
  useOutsideClick(wrapRef, open, () => setOpen(false));

  const handle = async (type) => {
    setOpen(false);
    setExporting(type);
    try {
      if (type === 'excel') await onExportExcel();
      else                  await onExportPDF();
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(null);
    }
  };

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
function ReportCard({ report }) {
  const [exportError, setExportError] = useState('');
  const Icon = report.icon;

  const handleExcel = useCallback(async () => {
    setExportError('');
    try { await report.exportExcel(); }
    catch (err) { setExportError(err?.response?.data?.message || err?.message || 'Export failed.'); }
  }, [report]);

  const handlePDF = useCallback(async () => {
    setExportError('');
    try { await report.exportPDF(); }
    catch (err) { setExportError(err?.response?.data?.message || err?.message || 'Export failed.'); }
  }, [report]);

  // Badge color based on report color
  const iconBg  = report.color === '#7c3aed'
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

        {/* ── Left: icon + title + description ── */}
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

        {/* ── Right: Download button ── */}
        <div className="report-card-right">
          <DownloadDropdown
            onExportExcel={handleExcel}
            onExportPDF={handlePDF}
            excelOnly={report.excelOnly}
          />
        </div>
      </div>

      {/* ── Export error ── */}
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
          <strong>Excel</strong> or <strong>PDF</strong> where available. The file downloads automatically.
        </span>
      </div>

      {REPORTS.map(report => (
        <ReportCard key={report.id} report={report} />
      ))}

    </div>
  );
}