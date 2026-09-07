import React from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardTable({
  columns = [],
  data = [],
  emptyMessage = 'No records available',
  maxHeight = '280px',
  loading = false,
  getRowStyle,
  keyExtractor = (item, index) => item.id || item._id || index,
}) {
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '160px',
          gap: '10px',
          fontFamily: 'Nunito, sans-serif',
          color: '#9090a8',
          fontSize: '13px',
          fontWeight: 600,
        }}
      >
        <Loader2 size={24} className="spin" style={{ animation: 'spin 1s linear infinite', color: '#049edf' }} />
        <span>Loading details…</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '140px',
          fontFamily: 'Nunito, sans-serif',
          color: '#a0a0b8',
          fontSize: '13px',
          fontWeight: 600,
          background: '#fcfcfd',
          borderRadius: '10px',
          border: '1px dashed #e2e2ee',
          textAlign: 'center',
          padding: '20px',
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        overflowY: maxHeight ? 'auto' : 'visible',
        maxHeight: maxHeight || 'none',
        borderRadius: '10px',
        border: '1px solid #f0f0f8',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'Nunito, sans-serif',
          fontSize: '12.5px',
          textAlign: 'left',
        }}
      >
        <thead>
          <tr
            style={{
              background: '#f8fafc',
              borderBottom: '1.5px solid #edf2f7',
              position: 'sticky',
              top: 0,
              zIndex: 2,
            }}
          >
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                style={{
                  padding: '10px 14px',
                  fontWeight: 800,
                  fontSize: '11px',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: col.width || 'auto',
                  textAlign: col.align || 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => {
            const customStyle = getRowStyle ? getRowStyle(row, rowIdx) : {};
            const baseBg = customStyle?.backgroundColor || customStyle?.background || 'transparent';
            const hoverBg = customStyle?.hoverBackground || (baseBg !== 'transparent' ? '#fde2e4' : '#f8fafd');

            return (
              <tr
                key={keyExtractor(row, rowIdx)}
                style={{
                  borderBottom: rowIdx === data.length - 1 ? 'none' : '1px solid #f1f5f9',
                  transition: 'background-color 0.15s ease',
                  backgroundColor: baseBg,
                  ...customStyle,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = baseBg)}
              >
                {columns.map((col, colIdx) => {
                  const val = row[col.key];
                  return (
                    <td
                      key={col.key || colIdx}
                      style={{
                        padding: '11px 14px',
                        color: '#334155',
                        fontWeight: 600,
                        textAlign: col.align || 'left',
                        whiteSpace: col.nowrap !== false ? 'nowrap' : 'normal',
                        verticalAlign: 'middle',
                      }}
                    >
                      {col.render ? col.render(val, row, rowIdx) : (val != null ? String(val) : '—')}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
