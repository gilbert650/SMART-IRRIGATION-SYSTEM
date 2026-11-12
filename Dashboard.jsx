import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Droplets,
  Thermometer,
  Waves,
  Gauge,
  AlertTriangle,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import api from '../services/api';

function fmt(v, unit = '') {
  if (v === null || v === undefined) return '—';
  return `${Number(v).toFixed(1)}${unit}`;
}

export default function Dashboard() {
  const [reading, setReading] = useState(null);
  const [pump, setPump] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setError('');
      const [r, p, a, h, e] = await Promise.all([
        api.latestReading(),
        api.pumpStatus(1),
        api.activeAlerts(),
        api.sensorHistory({ limit: 24 }),
        api.irrigationEvents({ limit: 5 })
      ]);
      setReading(r.data);
      setPump(p.data);
      setAlerts(a.data || []);
      setHistory((h.data?.data || h.data || []).reverse());
      setEvents(e.data?.data || e.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div className="loading">Loading dashboard…</div>;

  const chartData = (Array.isArray(history) ? history : []).map((row) => ({
    time: row.created_at ? new Date(row.created_at).toLocaleTimeString() : '',
    moisture: row.soil_moisture != null ? Number(row.soil_moisture) : null,
    tank: row.tank_level != null ? Number(row.tank_level) : null
  }));

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">
        Live farm overview · Data from API ·{' '}
        {reading?.source === 'SIMULATION' ? (
          <span className="badge badge-sim">SIMULATION</span>
        ) : (
          <span className="badge badge-hw">HARDWARE</span>
        )}
      </p>

      {error && <div className="alert-box error">{error}</div>}

      <div className="grid grid-4" style={{ marginBottom: '1.25rem' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Soil Moisture</span>
            <Droplets size={18} color="#2e7d32" />
          </div>
          <div className="stat-value">
            {fmt(reading?.soil_moisture)}
            <span className="stat-unit">%</span>
          </div>
          <div className="stat-meta">
            {reading?.sensor_valid ? 'Valid reading' : '⚠ Invalid'} ·{' '}
            {reading?.created_at ? new Date(reading.created_at).toLocaleTimeString() : '—'}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Tank Level</span>
            <Waves size={18} color="#0277bd" />
          </div>
          <div className="stat-value">
            {fmt(reading?.tank_level)}
            <span className="stat-unit">%</span>
          </div>
          <div className="stat-meta">Water available for irrigation</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Temperature</span>
            <Thermometer size={18} color="#e65100" />
          </div>
          <div className="stat-value">
            {fmt(reading?.air_temperature)}
            <span className="stat-unit">°C</span>
          </div>
          <div className="stat-meta">Air temperature</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Humidity</span>
            <Gauge size={18} color="#1565c0" />
          </div>
          <div className="stat-value">
            {fmt(reading?.air_humidity)}
            <span className="stat-unit">%</span>
          </div>
          <div className="stat-meta">Air humidity</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '1.25rem' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pump Status</span>
            <Activity size={18} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span className={`badge ${pump?.pump_status === 'ON' ? 'badge-on' : 'badge-off'}`}>
              {pump?.pump_status || 'UNKNOWN'}
            </span>
            <span className="badge badge-sim">{pump?.pump_source || '—'}</span>
            <span style={{ fontSize: '0.85rem' }}>Mode: {pump?.irrigation_mode || '—'}</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{pump?.note}</p>
          <div style={{ marginTop: 12 }}>
            <Link to="/control" className="btn btn-primary">
              Open Control
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Active Alerts</span>
            <AlertTriangle size={18} color="#c62828" />
          </div>
          {alerts.length === 0 ? (
            <div className="empty-state" style={{ padding: '1rem' }}>
              No active alerts
            </div>
          ) : (
            <ul style={{ listStyle: 'none' }}>
              {alerts.slice(0, 5).map((a) => (
                <li
                  key={a.id}
                  style={{
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--gray-200)',
                    fontSize: '0.85rem'
                  }}
                >
                  <span className={`badge badge-${a.severity === 'CRITICAL' ? 'crit' : 'warn'}`}>
                    {a.severity}
                  </span>{' '}
                  {a.message}
                </li>
              ))}
            </ul>
          )}
          <Link to="/alerts" style={{ fontSize: '0.85rem', color: 'var(--green)' }}>
            View all alerts →
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <span className="card-title">Soil Moisture & Tank History</span>
        </div>
        {chartData.length === 0 ? (
          <div className="empty-state">No history yet – start simulation to generate data</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="moisture"
                stroke="#2e7d32"
                strokeWidth={2}
                dot={false}
                name="Moisture %"
              />
              <Line
                type="monotone"
                dataKey="tank"
                stroke="#0277bd"
                strokeWidth={2}
                dot={false}
                name="Tank %"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Irrigation Events</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Mode</th>
                <th>Reason</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(events) ? events : []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No events yet
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id}>
                    <td>{ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'}</td>
                    <td>{ev.event_type}</td>
                    <td>{ev.mode}</td>
                    <td>{ev.reason}</td>
                    <td>
                      <span className={`badge ${ev.source === 'SIMULATION' ? 'badge-sim' : 'badge-hw'}`}>
                        {ev.source}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
