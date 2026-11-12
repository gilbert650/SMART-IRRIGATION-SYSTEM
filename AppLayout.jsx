import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Droplets,
  LineChart,
  History,
  Bell,
  Cpu,
  Settings,
  FlaskConical,
  HelpCircle,
  Menu,
  LogOut,
  Leaf
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/live', label: 'Live Monitoring', icon: Activity },
  { to: '/control', label: 'Irrigation Control', icon: Droplets },
  { to: '/sensors', label: 'Sensor History', icon: LineChart },
  { to: '/irrigation-history', label: 'Irrigation History', icon: History },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/devices', label: 'Devices', icon: Cpu },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/simulation', label: 'Simulation', icon: FlaskConical },
  { to: '/help', label: 'Help', icon: HelpCircle }
];

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const [sys, setSys] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const load = () => {
      api.systemStatus().then((r) => setSys(r.data)).catch(() => setSys(null));
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const now = new Date().toLocaleString();
  const simRunning = sys?.simulation?.running;

  return (
    <div className="app-shell">
      <div className={`overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Leaf size={28} color="#43a047" />
          <div>
            <h1>Smart Irrigation</h1>
            <span>Rwanda Farm Monitor</span>
          </div>
        </div>
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: 8 }}>
            {user?.full_name || user?.email}
          </div>
          <button
            className="btn btn-outline"
            style={{ width: '100%', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-toggle" onClick={() => setOpen(true)} aria-label="Menu">
              <Menu size={22} />
            </button>
            <span className={`mode-badge ${simRunning ? 'sim' : 'hw'}`}>
              {simRunning ? 'SIMULATION MODE' : 'HARDWARE / IDLE'}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
              DB: {sys?.database === 'UP' ? '● Online' : '○ Offline'}
            </span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>{now}</div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
