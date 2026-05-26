import { useState, useEffect } from 'react';
import Login from './Pages/Login';
import Layout from './components/Layout';
import Dashboard from './Pages/Dashboard';
import OwnerPage from './Pages/Owner';
import SitePage from './Pages/Site.jsx';
import Hoarding from './Pages/Hoarding.jsx';
import Hoardingexpense from './Pages/Hoardingexpense.jsx';
import LandContract from './Pages/LandContract.jsx';
import LandPayment from './Pages/LandPayment.jsx';
import CustomerPage from './Pages/Customer.jsx';
import CustomerContract from './Pages/CustomerContract.jsx';
import HoardingMerge from './Pages/Hoardingmerge.jsx';
import Reports from './Pages/Reports.jsx';
import Quotation from './Pages/Quotation.jsx';
import Jobs from './Pages/Job.jsx'
import Terms from './Pages/Terms.jsx';
import { CalendarCheck, Users, CreditCard } from 'lucide-react';
import './App.css';

/* ─── Placeholder page (shared across routes) ─── */
const Placeholder = ({ title, Icon }) => (
  <div className="placeholder-page">
    <div className="placeholder-icon-wrap"><Icon size={34} color="#049edf" /></div>
    <h2 className="placeholder-title">{title}</h2>
    <p className="placeholder-sub">Connect your API to load real data here.</p>
  </div>
);

export default function App() {
  const [loggedIn, setLoggedIn] = useState(
    () => localStorage.getItem('isLoggedIn') === 'true'
  );
  const [tab, setTab] = useState(
    () => sessionStorage.getItem('dashTab') || 'dashboard'
  );

  /* ── Browser tab title ── */
  useEffect(() => { document.title = 'JalaramAd'; }, []);

  /* ── Clean stale URL params on mount ── */
  useEffect(() => {
    const url = new URL(window.location);
    if (url.searchParams.has('session')) {
      url.searchParams.delete('session');
      window.history.replaceState({}, document.title, url.pathname);
    }
  }, []);

  /* ── Auth handlers ── */
  const handleLogin = () => {
    localStorage.setItem('isLoggedIn', 'true');
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('dashTab');
    localStorage.clear();
    window.history.replaceState({}, document.title, '/');
    setLoggedIn(false);
  };

  /* ── Tab/route handler (passed down to Layout + pages) ── */
  const changeTab = (id) => {
    setTab(id);
    sessionStorage.setItem('dashTab', id);
  };

  /* ── Page renderer ── */
  const renderPage = () => {
    switch (tab) {
      case 'dashboard':         return <Dashboard changeTab={changeTab} />;
      case 'new-hoarding':      return <Hoarding />;
      case 'hoarding-expense':  return <Hoardingexpense />;
      case 'hoarding-merge':    return <HoardingMerge />;
      case 'land-contracts':    return <LandContract />;
      case 'land-payment':      return <LandPayment />;
      case 'bookings':          return <Placeholder title="Bookings"  Icon={CalendarCheck} />;
      case 'clients':           return <Placeholder title="Clients"   Icon={Users} />;
      case 'owners':            return <OwnerPage />;
      case 'payments':          return <Placeholder title="Payments"  Icon={CreditCard} />;
      case 'customer-details':  return <CustomerPage />;
      case 'customer-contract': return <CustomerContract />;
      case 'sites':             return <SitePage />;
      case 'reports':           return <Reports />;
      case 'quotation': return <Quotation onNavigateToContracts={() => changeTab('customer-contract')} />;
      case 'terms':             return <Terms />;
      case 'Jobs':             return <Jobs />;

      default:                  return <Dashboard changeTab={changeTab} />;
    }
  };

  if (!loggedIn) return <Login onLogin={handleLogin} />;

  return (
    <Layout tab={tab} changeTab={changeTab} onLogout={handleLogout}>
      {/* key={tab} forces a full remount on every navigation so each page
          always starts from its default state (e.g. grid view, not form) */}
      <div key={tab}>
        {renderPage()}
      </div>
    </Layout>
  );
}