import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import LiveMonitoring from './pages/LiveMonitoring';
import IrrigationControl from './pages/IrrigationControl';
import SensorHistory from './pages/SensorHistory';
import IrrigationHistory from './pages/IrrigationHistory';
import AlertsPage from './pages/AlertsPage';
import DevicesPage from './pages/DevicesPage';
import SettingsPage from './pages/SettingsPage';
import SimulationPage from './pages/SimulationPage';
import HelpPage from './pages/HelpPage';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="live" element={<LiveMonitoring />} />
        <Route path="control" element={<IrrigationControl />} />
        <Route path="sensors" element={<SensorHistory />} />
        <Route path="irrigation-history" element={<IrrigationHistory />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="simulation" element={<SimulationPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
