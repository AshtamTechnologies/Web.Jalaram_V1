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

/* ═══════════════════════════════════════════
   DASHBOARD PAGE
   Props: changeTab  — passed from App.js via Layout
═══════════════════════════════════════════ */
export default function Dashboard({ changeTab }) {
  const [refreshing, setRefreshing] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const width = useWindowWidth();

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
  const revenueData = data?.revenue || { totalRevenue: 0, percentVsLastMonth: 0 };

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
    { title: 'Expired Bookings', value: String(expiredBookingsData.expiredCount ?? 0), sub: `${expiredBookingsData.pendingRenewals ?? 0} pending renewal`, icon: TrendingDown, color: '#e84040', bg: 'rgba(232,64,64,0.1)' },
    { title: 'Total Revenue', value: formatRevenue(revenueData.totalRevenue ?? 0), sub: revenueSub, icon: IndianRupee, color: '#6c63ff', bg: 'rgba(108,99,255,0.1)' },
  ];

  const chartRevenueData = (data?.monthlyRevenue ?? []).map(r => ({
    month: r.monthName,
    revenue: r.revenue ?? 0,
  }));

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

        {/* Revenue area chart */}
        <div className={`chart-card${width >= 900 ? ' full-width' : ''}`}>
          <div className="chart-header">
            <h3 className="chart-title">Monthly Revenue</h3>
            <span className="chart-badge">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartRevenueData}>
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
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                width={52}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e0e0f0', fontFamily: 'Nunito,sans-serif', fontSize: 12 }}
                formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
              />
              <Area
                type="monotone" dataKey="revenue"
                stroke="#049edf" strokeWidth={3} fill="url(#revGrad)"
                dot={{ fill: '#049edf', r: 4, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
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