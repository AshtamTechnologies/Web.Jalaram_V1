import { useState, useEffect } from 'react';
import {
  RefreshCw, Layers, CalendarCheck, TrendingDown,
  IndianRupee, TrendingUp, ArrowUpRight, Loader2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { apiService } from '../api/api';
import './Common1.css';

const STATUS_STYLE = {
  1: { bg: '#e8faf3', color: '#1a9e6e', label: 'Active' },
  3: { bg: '#fff8e1', color: '#e08a00', label: 'Pending' },
  2: { bg: '#ffeaea', color: '#e84040', label: 'Expired' },
};

function fmtCurrency(v) {
  if (v === '' || v == null || isNaN(Number(v))) return '—';
  return '₹' + Number(v).toLocaleString('en-IN');
}

function getStatusId(status) {
  const s = (status || '').toLowerCase();
  if (s === 'active') return 1;
  if (s === 'expired') return 2;
  return 3; // Pending
}

/* ── Window width hook (for responsive chart grid) ── */
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const rawData = payload[0].payload;
    const total = rawData.revenue;
    const sites = rawData.sites || [];

    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 14px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
          fontFamily: 'Nunito,sans-serif',
          width: '320px',
          zIndex: 99999,
        }}
        onMouseMove={e => e.stopPropagation()}
        onMouseEnter={e => e.stopPropagation()}
        onMouseLeave={e => e.stopPropagation()}
        onMouseOver={e => e.stopPropagation()}
        onMouseOut={e => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '13.5px', marginBottom: '4px' }}>
          {label}
        </div>
        <div style={{ color: '#049edf', fontWeight: 800, fontSize: '15px', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
          Total: ₹{total.toLocaleString('en-IN')}
        </div>
        {sites.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px', overscrollBehavior: 'contain' }}>
            {sites.map((s, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', fontSize: '11px', borderBottom: '1px dashed #f1f5f9', paddingBottom: '4px' }}>
                <span style={{ color: '#475569', fontWeight: 600, wordBreak: 'break-word', flex: 1 }}>
                  {s.siteLocation}
                </span>
                <span style={{ color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  ₹{s.revenue.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic' }}>
            No revenue recorded
          </div>
        )}
      </div>
    );
  }
  return null;
};

/* ═══════════════════════════════════════════
   DASHBOARD PAGE
   Props: changeTab  — passed from App.js via Layout
   const [selectedSiteFilter, setSelectedSiteFilter] = useState('all');
═══════════════════════════════════════════ */
export default function Dashboard({ changeTab }) {
  const [refreshing, setRefreshing] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const width = useWindowWidth();
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('all');
  const [hoveredMonthData, setHoveredMonthData] = useState(null);

  /* Read admin name from localStorage (same source as Layout) */
  useEffect(() => {
    const s = JSON.parse(localStorage.getItem('userData') || '{}');
    setAdminName(
      `${s?.first_Name || ''} ${s?.last_Name || ''}`.trim() ||
      s?.name ||
      s?.Name ||
      'Admin'
    );
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await apiService.getDashboardOverview();
      setData(res);
      setError('');
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await apiService.getDashboardOverview();
      setData(res);
      setError('');
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14, flexDirection: 'column' }}>
        <Loader2 size={32} color="#049edf" className="spin" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontFamily: 'Nunito,sans-serif', color: '#9090a8', fontSize: 14 }}>Loading dashboard...</span>
      </div>
    );
  }

  const hoardingsData = data?.hoardings || { totalHoardings: 0, addedThisMonth: 0 };
  const activeBookingsData = data?.activeBookings || { activeCount: 0, expiringThisWeek: 0 };
  const expiredBookingsData = data?.expiredBookings || { expiredCount: 0, pendingRenewals: 0 };
  const revenueData = data?.revenue || { totalRevenueActive: 0, percentVsLastMonth: 0 };

  const formatRevenue = (val) => {
    if (val == null) return '—';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const revenuePercent = revenueData.percentVsLastMonth ?? 0;
  const revenueSub = `${revenuePercent >= 0 ? '+' : ''}${revenuePercent}% vs last month`;

  const STATS = [
    { title: 'Total Hoardings', value: String(hoardingsData.totalHoardings ?? 0), sub: `+${hoardingsData.addedThisMonth ?? 0} added this month`, icon: Layers, color: '#049edf', bg: 'rgba(4,158,223,0.1)' },
    { title: 'Active Bookings', value: String(activeBookingsData.activeCount ?? 0), sub: `${activeBookingsData.expiringThisWeek ?? 0} expiring this week`, icon: CalendarCheck, color: '#1a9e6e', bg: 'rgba(26,158,110,0.1)' },
    // { title: 'Expired Bookings', value: String(expiredBookingsData.expiredCount ?? 0), sub: `${expiredBookingsData.pendingRenewals ?? 0} pending renewal`, icon: TrendingDown, color: '#e84040', bg: 'rgba(232,64,64,0.1)' },
    { title: 'Total active contract value', value: formatRevenue(revenueData.totalRevenueActive ?? 0), sub: revenueSub, icon: IndianRupee, color: '#6c63ff', bg: 'rgba(108,99,255,0.1)' },
  ];

  const siteOptions = [
    { value: 'all', label: 'All Sites' },
    ...Array.from(new Set((data?.monthlyRevenueBySite ?? []).map(item => item.siteLocation).filter(Boolean))).map(loc => ({
      value: loc,
      label: loc,
    })),
  ];

  const chartRevenueData = (() => {
    const list = data?.monthlyRevenueBySite ?? [];
    const filteredList = selectedSiteFilter === 'all'
      ? list
      : list.filter(item => item.siteLocation === selectedSiteFilter);

    const map = {};
    filteredList.forEach(item => {
      const key = `${item.monthName} ${item.year}`;
      if (!map[key]) {
        map[key] = {
          month: `${item.monthName} ${item.year}`,
          monthName: item.monthName,
          year: item.year,
          monthNum: item.month,
          revenue: 0,
          sites: [],
        };
      }
      map[key].revenue += (item.revenue ?? 0);
      if (item.revenue > 0) {
        map[key].sites.push({
          siteLocation: item.siteLocation,
          revenue: item.revenue,
        });
      }
    });

    // To prevent empty gaps in the timeline, ensure all months present in the original dataset are populated with 0 if no record exists
    const allMonthKeys = Array.from(new Set(list.map(item => `${item.monthName} ${item.year}`)));
    allMonthKeys.forEach(mKey => {
      if (!map[mKey]) {
        const [mName, yStr] = mKey.split(' ');
        const found = list.find(item => item.monthName === mName && String(item.year) === yStr);
        map[mKey] = {
          month: mKey,
          monthName: mName,
          year: Number(yStr),
          monthNum: found ? found.month : 7,
          revenue: 0,
          sites: [],
        };
      }
    });

    return Object.values(map)
      .map(item => {
        item.sites.sort((a, b) => b.revenue - a.revenue);
        return item;
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.monthNum - b.monthNum;
      });
  })();

  const chartBookingsData = (data?.monthlyBookings ?? []).map(b => ({
    month: b.monthName,
    bookings: b.bookingCount ?? 0,
  }));

  const bookingStatusData = [
    { name: 'Active', value: data?.bookingStatus?.active ?? 0, color: '#049edf' },
    { name: 'Expired', value: data?.bookingStatus?.expired ?? 0, color: '#e84040' },
    { name: 'Pending', value: data?.bookingStatus?.pending ?? 0, color: '#f59e0b' },
  ];

  const recentBookingsList = (data?.recentBookings ?? []).map(b => ({
    id: String(b.bookingId).startsWith('#') ? String(b.bookingId) : `#${b.bookingId}`,
    client: b.client || '—',
    site: b.siteLocation || '—',
    duration: b.durationDays ? `${b.durationDays} days` : '—',
    amount: b.amount != null ? fmtCurrency(b.amount) : '—',
    statusId: getStatusId(b.status),
  }));

  return (
    <div style={{ animation: 'fadeUp 0.4s ease both' }}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">
            Welcome, <strong>{adminName}</strong>!</p>
          <span style={{ fontSize: 13, color: '#9090a8', fontWeight: 600 }}>Here's what's happening {today}.</span>
        </div>
        <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="stats-grid">
        {STATS.map((s, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="stat-icon" style={{ background: s.bg }}>
              <s.icon size={21} color={s.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p className="stat-label">{s.title}</p>
              <p className="stat-value">{s.value}</p>
              <p className="stat-sub" style={{ color: s.color }}>
                <TrendingUp size={10} /> {s.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className={`charts-grid ${width >= 900 ? 'two-col' : 'one-col'}`}>

        {/* Monthly Revenue card with Site Sidebar */}
        <div className={`chart-card${width >= 900 ? ' full-width' : ''}`} style={{ padding: '20px 24px' }}>

          <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <h3 className="chart-title" style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Monthly Site Revenue</h3>
              {/* <span className="chart-badge" style={{ fontSize: '12px', color: '#94a3b8' }}>Trend & Site Breakdown</span> */}
            </div>
            <select
              value={selectedSiteFilter}
              onChange={e => setSelectedSiteFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1.5px solid #e0e0f0',
                outline: 'none',
                fontFamily: 'Nunito,sans-serif',
                fontSize: '12.5px',
                color: '#606078',
                backgroundColor: '#fff',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              {siteOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: width >= 900 ? '2.2fr 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>

            {/* Area Chart */}
            <div style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart
                  data={chartRevenueData}
                  onMouseMove={(state) => {
                    if (state && state.activePayload && state.activePayload.length) {
                      setHoveredMonthData(state.activePayload[0].payload);
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredMonthData(null);
                  }}
                >
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#049edf" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#049edf" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis
                    dataKey="month"
                    stroke="#c0c0d8"
                    tick={{ fontFamily: 'Nunito,sans-serif', fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#c0c0d8"
                    tick={{ fontFamily: 'Nunito,sans-serif', fontSize: 10 }}
                    tickFormatter={formatRevenue}
                    width={65}
                  />
                  <Tooltip content={<CustomTooltip />} wrapperStyle={{ pointerEvents: 'auto' }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#049edf"
                    strokeWidth={3}
                    fill="url(#revGrad)"
                    dot={{ fill: '#049edf', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Site Breakdown sidebar */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #f1f5f9',
              minWidth: 0,
            }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                Site Breakdown
              </h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                {hoveredMonthData ? `Active in ${hoveredMonthData.month}` : 'Total revenue per site'}
              </p>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '180px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}>
                {(() => {
                  let sitesList = [];
                  if (hoveredMonthData) {
                    sitesList = hoveredMonthData.sites || [];
                  } else {
                    const list = data?.monthlyRevenueBySite ?? [];
                    const map = {};
                    list.forEach(item => {
                      const loc = item.siteLocation || `Site #${item.siteId}`;
                      if (!map[loc]) map[loc] = 0;
                      map[loc] += (item.revenue ?? 0);
                    });
                    sitesList = Object.entries(map)
                      .map(([siteLocation, revenue]) => ({ siteLocation, revenue }))
                      .sort((a, b) => b.revenue - a.revenue);
                  }

                  if (sitesList.length === 0) {
                    return (
                      <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                        No revenue recorded
                      </span>
                    );
                  }

                  return sitesList.map((s, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      background: '#fff',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
                    }}>
                      <span style={{ color: '#475569', fontWeight: 600, fontSize: '11px', lineHeight: 1.3 }}>
                        {s.siteLocation}
                      </span>
                      <span style={{ color: '#049edf', fontWeight: 800, fontSize: '11.5px', textAlign: 'right' }}>
                        ₹{s.revenue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>

          </div>
        </div>

        {/* Monthly bookings bar chart */}
        <div className="chart-card">
          <h3 className="chart-title" style={{ marginBottom: 16 }}>Monthly Bookings</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartBookingsData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" stroke="#c0c0d8" tick={{ fontFamily: 'Nunito,sans-serif', fontSize: 11 }} />
              <YAxis stroke="#c0c0d8" tick={{ fontFamily: 'Nunito,sans-serif', fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e0e0f0', fontFamily: 'Nunito,sans-serif', fontSize: 12 }} />
              <Bar dataKey="bookings" radius={[8, 8, 0, 0]} name="Bookings">
                {chartBookingsData.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#049edf' : '#6c63ff'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Booking status pie chart */}
        <div className="chart-card">
          <h3 className="chart-title" style={{ marginBottom: 16 }}>Booking Status</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={bookingStatusData} cx="50%" cy="50%"
                outerRadius={68} innerRadius={38} dataKey="value"
                label={({ percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                labelLine={false} paddingAngle={3}
              >
                {bookingStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e0e0f0', fontFamily: 'Nunito,sans-serif', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="status-legend">
            {bookingStatusData.map(s => (
              <div key={s.name} className="legend-item">
                <div className="legend-value" style={{ color: s.color }}>{s.value}</div>
                <div className="legend-label">{s.name}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Recent bookings table ── */}
      <div className="bookings-card">
        <div className="bookings-header">
          <h3 className="bookings-title">Recent Bookings</h3>
          <button className="view-all-btn" onClick={() => changeTab?.('customer-contract')}>
            View All <ArrowUpRight size={13} />
          </button>
        </div>
        <div className="bookings-table-wrap">
          <table className="bookings-table">
            <thead>
              <tr>
                {['Booking ID', 'Client', 'Site Location', 'Duration', 'Amount', 'Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBookingsList.map((b, i) => {
                const st = STATUS_STYLE[b.statusId] || STATUS_STYLE[3];
                return (
                  <tr key={i} className="booking-row">
                    <td>{b.id}</td>
                    <td>{b.client}</td>
                    <td>{b.site}</td>
                    <td>{b.duration}</td>
                    <td>{b.amount}</td>
                    <td>
                      <span className="status-badge" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}