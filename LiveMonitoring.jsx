import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../services/api';

export default function LiveMonitoring() {
  const [reading, setReading] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setError('');
      const [latest, hist] = await Promise.all([
        api.latestReading(),
        api.sensorHistory({ limit: 20 })
      ]);
      setReading(latest.data);
      setRows(hist.data?.data || hist.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load readings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Live Monitoring</h1>
          <p className="page-subtitle">Auto-refreshes every 5 seconds from the API</p>
        </div>
        <button className="btn btn-outline" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <div className="alert-box error">{error}</div>}
      {loading && <div className="loading">Loading…</div>}

      {reading && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header">
            <span className="card-title">Latest Reading</span>
            <span className={`badge ${reading.source === 'SIMULATION' ? 'badge-sim' : 'badge-hw'}`}>
              {reading.source}
            </span>
          </div>
          <div className="grid grid-4">
            <div>
              <div className="card-title">Soil Moisture</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                {reading.soil_moisture != null ? `${Number(reading.soil_moisture).toFixed(1)}%` : '—'}
              </div>
            </div>
            <div>
              <div className="card-title">Tank Level</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                {reading.tank_level != null ? `${Number(reading.tank_level).toFixed(1)}%` : '—'}
              </div>
            </div>
            <div>
              <div className="card-title">Temperature</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                {reading.air_temperature != null
                  ? `${Number(reading.air_temperature).toFixed(1)}°C`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="card-title">Humidity</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                {reading.air_humidity != null ? `${Number(reading.air_humidity).toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>
          <div className="stat-meta" style={{ marginTop: 12 }}>
            Valid: {reading.sensor_valid ? 'Yes' : 'No'} ·{' '}
            {reading.created_at ? new Date(reading.created_at).toLocaleString() : '—'} · Device:{' '}
            {reading.device_code || reading.device_id}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Readings</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Moisture %</th>
                <th>Tank %</th>
                <th>Temp °C</th>
                <th>Humidity %</th>
                <th>Valid</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No readings yet
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                    <td>{r.soil_moisture != null ? Number(r.soil_moisture).toFixed(1) : '—'}</td>
                    <td>{r.tank_level != null ? Number(r.tank_level).toFixed(1) : '—'}</td>
                    <td>
                      {r.air_temperature != null ? Number(r.air_temperature).toFixed(1) : '—'}
                    </td>
                    <td>{r.air_humidity != null ? Number(r.air_humidity).toFixed(1) : '—'}</td>
                    <td>{r.sensor_valid ? 'Yes' : 'No'}</td>
                    <td>
                      <span className={`badge ${r.source === 'SIMULATION' ? 'badge-sim' : 'badge-hw'}`}>
                        {r.source}
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
