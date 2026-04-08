import { useState, useEffect } from 'react';
import Login     from './Pages/Login';
import Dashboard from './Pages/Dashboard';
import './App.css';

export default function App() {
  // ── Persist login state across refreshes ──
  const [loggedIn, setLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  // ✅ Set proper browser tab title
  useEffect(() => {
    document.title = 'JalaramAd';
  }, []);

  const handleLogin = () => {
    localStorage.setItem('isLoggedIn', 'true');
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setLoggedIn(false);
  };

  return loggedIn
    ? <Dashboard onLogout={handleLogout} />
    : <Login     onLogin={handleLogin}  />;
}