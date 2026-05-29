import { useState } from 'react';
import SupervisorLayout from '../components/SupervisorLayout.jsx';
import SupDashboardHome from './SupDashboardHome.jsx';
import WorkersPage from './Workers.jsx';
import { BarChart3, Layers, MapPin, Briefcase, CheckSquare } from 'lucide-react';

/* ── Placeholder for pages not yet built ── */
function PlaceholderPage({ title, Icon, color = '#10b981' }) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-icon-wrap"
        style={{ background: `linear-gradient(135deg,${color}1a,${color}11)` }}>
        <Icon size={34} color={color} />
      </div>
      <h2 className="placeholder-title">{title}</h2>
      <p className="placeholder-sub">
        Build your {title} page inside <code>src/Pages/supervisor/</code>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SUPERVISOR DASHBOARD  —  entry point
   Called from App.js when role === 'supervisor'
═══════════════════════════════════════════ */
export default function SupervisorDashboard({ onLogout }) {
  const [tab, setTab] = useState(
    () => sessionStorage.getItem('supTab') || 'sup-dashboard'
  );

  const changeTab = (id) => {
    setTab(id);
    sessionStorage.setItem('supTab', id);
  };

const renderPage = () => {
  switch (tab) {
    case 'sup-dashboard': return <SupDashboardHome changeTab={changeTab} />;
    case 'sup-hoardings': return <PlaceholderPage title="Hoardings"    Icon={Layers}      color="#10b981" />;
    case 'sup-sites':     return <PlaceholderPage title="Sites"        Icon={MapPin}      color="#049edf" />;
    case 'sup-job-list':  return <PlaceholderPage title="Job Requests" Icon={Briefcase}   color="#f59e0b" />;
    case 'sup-job-tasks': return <PlaceholderPage title="Job Tasks"    Icon={CheckSquare} color="#8b5cf6" />;
    case 'sup-reports':   return <PlaceholderPage title="Reports"      Icon={BarChart3}   color="#e84040" />;
    case 'workers':       return <WorkersPage />;   // ← add this line
    default:              return <SupDashboardHome changeTab={changeTab} />;
  }
};

  return (
    <SupervisorLayout tab={tab} changeTab={changeTab} onLogout={onLogout}>
      <div key={tab}>
        {renderPage()}
      </div>
    </SupervisorLayout>
  );
}