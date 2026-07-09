import { useState, useEffect } from 'react';
import {
  RefreshCw, CheckCircle, Clock, AlertCircle,
  ArrowUpRight, MapPin, Calendar, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/* ── Mock data — replace with real API calls ── */
const MONTHLY_JOBS = [
  { month: 'Jan', open: 3, inProgress: 2, completed: 5  },
  { month: 'Feb', open: 4, inProgress: 3, completed: 8  },
  { month: 'Mar', open: 2, inProgress: 4, completed: 6  },
  { month: 'Apr', open: 5, inProgress: 2, completed: 10 },
  { month: 'May', open: 3, inProgress: 5, completed: 9  },
  { month: 'Jun', open: 4, inProgress: 3, completed: 12 },
];

const JOB_PIE = [
  { name: 'Completed',   value: 12, color: '#16a34a' },
  { name: 'In Progress', value: 3,  color: '#049edf' },
  { name: 'Open',        value: 4,  color: '#f59e0b' },
];

const MY_JOBS = [
  { id: '#JB-201', hoarding: 'HD-001', jobType: 'Banner Installation',  description: 'Install flex banner on front face',    site: 'NH-48 Ahmedabad',  date: '12 Jun 2025', statusId: 2 },
  { id: '#JB-200', hoarding: 'HD-004', jobType: 'Flex Printing',        description: 'Print & paste new creative artwork',   site: 'SG Highway, Sola', date: '13 Jun 2025', statusId: 3 },
  { id: '#JB-199', hoarding: 'HD-007', jobType: 'Repair & Maintenance', description: 'Fix damaged structure and repaint',    site: 'Manek Chowk',      date: '14 Jun 2025', statusId: 1 },
  { id: '#JB-198', hoarding: 'HD-012', jobType: 'Banner Installation',  description: 'Replace old banner with new creative', site: 'Vastrapur Lake',   date: '11 Jun 2025', statusId: 1 },
  { id: '#JB-197', hoarding: 'HD-003', jobType: 'Erection',             description: 'Erect new hoarding structure at site', site: 'Ring Road West',   date: '10 Jun 2025', statusId: 3 },
  { id: '#JB-196', hoarding: 'HD-009', jobType: 'Vinyl Pasting',        description: 'Paste vinyl sheet on hoarding face',   site: 'CG Road',          date: '09 Jun 2025', statusId: 2 },
];

const STATUS = {
  1: { bg: '#e8faf3', color: '#1a9e6e', label: 'Completed'   },
  3: { bg: '#fff8e1', color: '#e08a00', label: 'In Progress' },
  2: { bg: '#eaf5ff', color: '#049edf', label: 'Open'        },
};

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #e0e0f0', borderRadius: 12,
      padding: '10px 14px', fontFamily: 'Nunito,sans-serif', fontSize: 12,
      boxShadow: '0 4px 18px rgba(100,100,180,0.12)',
    }}>
      <p style={{ fontWeight: 800, color: '#1a1a2e', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: '#7878a0', fontWeight: 600 }}>{p.name}:</span>
          <span style={{ color: '#1a1a2e', fontWeight: 800 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function SupDashboardHome({ changeTab }) {
  const [refreshing, setRefreshing] = useState(false);
  const [supName, setSupName]       = useState('Supervisor');
  const [jobFilter, setJobFilter]   = useState('all');
  const width = useWindowWidth();

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem('userData') || '{}');
    setSupName(
      `${s?.first_Name || ''} ${s?.last_Name || ''}`.trim() ||
      s?.name || s?.Name || 'Supervisor'
    );
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 900));
    setRefreshing(false);
  };

  const openCount       = MY_JOBS.filter(j => j.statusId === 2).length;
  const inProgressCount = MY_JOBS.filter(j => j.statusId === 3).length;
  const completedCount  = MY_JOBS.filter(j => j.statusId === 1).length;

  const filteredJobs =
    jobFilter === 'all'        ? MY_JOBS :
    jobFilter === 'open'       ? MY_JOBS.filter(j => j.statusId === 2) :
    jobFilter === 'inprogress' ? MY_JOBS.filter(j => j.statusId === 3) :
                                 MY_JOBS.filter(j => j.statusId === 1);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const STAT_CARDS = [
    { title: 'Open Jobs',    value: openCount,       sub: 'Not yet started',     icon: AlertCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  filter: 'open'        },
    { title: 'In Progress',  value: inProgressCount, sub: 'Currently working',   icon: Clock,       color: '#049edf', bg: 'rgba(4,158,223,0.1)',   filter: 'inprogress'  },
    { title: 'Completed',    value: completedCount,  sub: 'Jobs done this month', icon: CheckCircle, color: '#16a34a', bg: 'rgba(16,185,129,0.1)', filter: 'completed'   },
  ];

  const FILTERS = [
    { key: 'all',        label: 'All'         },
    { key: 'open',       label: 'Open'        },
    { key: 'inprogress', label: 'In Progress' },
    { key: 'completed',  label: 'Completed'   },
  ];

  return (
    <div style={{ animation: 'fadeUp 0.4s ease both' }}>

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Supervisor Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <strong style={{ color: '#049edf' }}>{supName}</strong>!
            &nbsp;·&nbsp;
            <span style={{ fontSize: 13, color: '#9090a8', fontWeight: 600 }}>{today}</span>
          </p>
        </div>
        <button
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{ background: 'linear-gradient(135deg,#049edf,#6c63ff)', boxShadow: '0 4px 14px rgba(4,158,223,0.32)' }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* STAT CARDS */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', marginBottom: 20 }}>
        {STAT_CARDS.map((s, i) => (
          <div
            key={i}
            className="stat-card"
            style={{
              animationDelay: `${i * 0.07}s`, cursor: 'pointer',
              outline: jobFilter === s.filter ? `2px solid ${s.color}` : 'none',
              outlineOffset: 2,
            }}
            onClick={() => setJobFilter(jobFilter === s.filter ? 'all' : s.filter)}
          >
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

      {/* CHARTS */}
      <div className={`charts-grid ${width >= 900 ? 'two-col' : 'one-col'}`} style={{ marginBottom: 20 }}>

        {/* Area chart — my job activity */}
        <div className={`chart-card${width >= 900 ? ' full-width' : ''}`}>
          <div className="chart-header">
            <h3 className="chart-title">My Job Activity</h3>
            <span className="chart-badge">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={MONTHLY_JOBS} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <defs>
                {[['gOpen','#f59e0b'],['gProg','#049edf'],['gDone','#16a34a']].map(([id, c]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={c} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={c} stopOpacity={0}   />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" stroke="#c0c0d8" tick={{ fontFamily: 'Nunito,sans-serif', fontSize: 11 }} />
              <YAxis stroke="#c0c0d8" tick={{ fontFamily: 'Nunito,sans-serif', fontSize: 10 }} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="open"       name="Open"        stroke="#f59e0b" strokeWidth={2} fill="url(#gOpen)" dot={{ fill: '#f59e0b', r: 3, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="inProgress" name="In Progress" stroke="#049edf" strokeWidth={2} fill="url(#gProg)" dot={{ fill: '#049edf', r: 3, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="completed"  name="Completed"   stroke="#16a34a" strokeWidth={3} fill="url(#gDone)" dot={{ fill: '#16a34a', r: 4, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut — job status breakdown */}
        <div className="chart-card">
          <h3 className="chart-title" style={{ marginBottom: 12 }}>Job Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie
                data={JOB_PIE} cx="50%" cy="50%"
                outerRadius={70} innerRadius={40} dataKey="value"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false} paddingAngle={3}
              >
                {JOB_PIE.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e0e0f0', fontFamily: 'Nunito,sans-serif', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="status-legend">
            {JOB_PIE.map(s => (
              <div key={s.name} className="legend-item">
                <div className="legend-value" style={{ color: s.color }}>{s.value}</div>
                <div className="legend-label">{s.name}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MY JOBS TABLE */}
      <div className="bookings-card">
        <div className="bookings-header">
          <div>
            <h3 className="bookings-title">My Jobs</h3>
            <p style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, color: '#9090a8', margin: '2px 0 0', fontWeight: 600 }}>
              Jobs assigned to you
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setJobFilter(f.key)}
                  style={{
                    padding: '5px 11px', borderRadius: 20,
                    border: jobFilter === f.key ? '1.5px solid #049edf' : '1.5px solid #e8e8f4',
                    background: jobFilter === f.key ? 'rgba(4,158,223,0.08)' : '#f8f8fd',
                    color: jobFilter === f.key ? '#049edf' : '#7878a0',
                    fontFamily: 'Nunito,sans-serif', fontSize: 11, fontWeight: 800,
                    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              className="view-all-btn"
              onClick={() => changeTab?.('sup-jobs')}
              style={{ background: 'linear-gradient(135deg,#049edf,#6c63ff)', boxShadow: '0 3px 10px rgba(4,158,223,0.28)' }}
            >
              View All <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        <div className="bookings-table-wrap">
          <table className="bookings-table">
            <thead>
              <tr>
                {['Job ID', 'Hoarding', 'Job Type', 'Description', 'Site Location', 'Date', 'Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px 0', color: '#b0b0c8', fontFamily: 'Nunito,sans-serif', fontWeight: 700 }}>
                    No jobs found.
                  </td>
                </tr>
              ) : filteredJobs.map((j, i) => {
                const st = STATUS[j.statusId];
                return (
                  <tr key={i} className="booking-row">
                    <td style={{ fontWeight: 800, color: '#1a1a2e' }}>{j.id}</td>
                    <td style={{ color: '#049edf', fontWeight: 700 }}>{j.hoarding}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                        background: 'rgba(108,99,255,0.08)', color: '#6c63ff',
                        fontWeight: 800, fontSize: 11, whiteSpace: 'nowrap',
                      }}>
                        {j.jobType}
                      </span>
                    </td>
                    <td style={{ color: '#4a5568', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {j.description}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#1a1a2e' }}>
                        <MapPin size={11} color="#c0c0d8" /> {j.site}
                      </span>
                    </td>
                    <td style={{ color: '#9090a8', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={11} color="#c0c0d8" /> {j.date}
                      </span>
                    </td>
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

        {/* Footer count row */}
        <div style={{
          display: 'flex', gap: 16, padding: '10px 16px',
          borderTop: '1px solid #f0f0f8',
          fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 700, color: '#9090a8',
          flexWrap: 'wrap',
        }}>
          <span>Showing <strong style={{ color: '#1a1a2e' }}>{filteredJobs.length}</strong> jobs</span>
          <span>Open: <strong style={{ color: '#f59e0b' }}>{filteredJobs.filter(j => j.statusId === 2).length}</strong></span>
          <span>In Progress: <strong style={{ color: '#049edf' }}>{filteredJobs.filter(j => j.statusId === 3).length}</strong></span>
          <span>Completed: <strong style={{ color: '#16a34a' }}>{filteredJobs.filter(j => j.statusId === 1).length}</strong></span>
        </div>
      </div>

    </div>
  );
}