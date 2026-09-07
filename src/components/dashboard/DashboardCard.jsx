import React from 'react';

export default function DashboardCard({
  title,
  icon: Icon,
  rightContent,
  children,
  style = {},
  headerStyle = {},
  className = '',
}) {
  return (
    <div
      className={`dashboard-card ${className}`}
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1.5px solid #e8e8f4',
        boxShadow: '0 4px 20px rgba(100, 100, 180, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        ...style,
      }}
    >
      {/* Header */}
      <div
        className="dashboard-card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1.5px solid #f1f1f9',
          background: '#fafbfe',
          ...headerStyle,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {Icon && (
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'rgba(4, 158, 223, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#049edf',
                flexShrink: 0,
              }}
            >
              <Icon size={18} />
            </div>
          )}
          <h3
            style={{
              margin: 0,
              fontFamily: 'Nunito, sans-serif',
              fontSize: '15px',
              fontWeight: 800,
              color: '#1a1a2e',
              letterSpacing: '-0.2px',
            }}
          >
            {title}
          </h3>
        </div>

        {rightContent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {rightContent}
          </div>
        )}
      </div>

      {/* Body */}
      <div
        className="dashboard-card-body"
        style={{
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}
