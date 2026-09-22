import React from 'react';
import { ArrowRight, User, Calendar, MessageSquare, History } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function StatusTimeline({ logs = [] }) {
  if (!logs || logs.length === 0) {
    return (
      <div
        style={{
          padding: '24px 16px',
          textAlign: 'center',
          background: '#fafafd',
          borderRadius: 14,
          border: '1.5px dashed #e8e8f4',
          color: '#7878a0',
          fontSize: 13,
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 600,
        }}
      >
        <History size={24} color="#c0c0d8" style={{ marginBottom: 6 }} />
        <div>No status transition history recorded yet.</div>
      </div>
    );
  }

  // Sort logs by date descending (latest first) or ascending
  const sortedLogs = [...logs].sort((a, b) => {
    const da = a.changedDate ? new Date(a.changedDate).getTime() : 0;
    const db = b.changedDate ? new Date(b.changedDate).getTime() : 0;
    return da - db;
  });

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      {/* Vertical Track Line */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          bottom: 14,
          left: 7,
          width: 2,
          background: '#e2e8f0',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sortedLogs.map((log, idx) => (
          <div key={log.logID || idx} style={{ position: 'relative' }}>
            {/* Timeline Dot */}
            <div
              style={{
                position: 'absolute',
                left: -20,
                top: 4,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: idx === sortedLogs.length - 1 ? '#049edf' : '#fff',
                border: `3px solid ${idx === sortedLogs.length - 1 ? '#049edf' : '#94a3b8'}`,
                boxShadow: '0 0 0 2px #fff',
              }}
            />

            {/* Timeline Card */}
            <div
              style={{
                background: '#fff',
                border: '1.5px solid #e8e8f4',
                borderRadius: 12,
                padding: '12px 16px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              {/* Header: Old Status -> New Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {log.oldStatus ? (
                    <>
                      <StatusBadge status={log.oldStatus} />
                      <ArrowRight size={13} color="#94a3b8" />
                    </>
                  ) : null}
                  <StatusBadge status={log.newStatus} />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: '#94a3b8',
                    fontSize: 11.5,
                    fontFamily: 'Nunito, sans-serif',
                    fontWeight: 600,
                  }}
                >
                  <Calendar size={12} />
                  <span>{formatDate(log.changedDate)}</span>
                </div>
              </div>

              {/* Remarks */}
              {log.remarks && (
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: 8,
                    padding: '8px 10px',
                    color: '#334155',
                    fontSize: 12.5,
                    fontFamily: 'Nunito, sans-serif',
                    fontWeight: 600,
                    margin: '6px 0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                  }}
                >
                  <MessageSquare size={13} color="#049edf" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ whiteSpace: 'pre-wrap' }}>{log.remarks}</span>
                </div>
              )}

              {/* Author */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  color: '#64748b',
                  fontSize: 12,
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                <User size={12} color="#049edf" />
                <span>Changed by {log.changedByName || (log.changedBy ? `User #${log.changedBy}` : 'System')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
