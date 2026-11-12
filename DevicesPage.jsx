import { useEffect, useState } from 'react';
import api from '../services/api';

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .devices()
      .then((res) => setDevices(res.data || []))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1 className="page-title">Devices</h1>
      <p className="page-subtitle">Registered irrigation controllers</p>
      {error && <div className="alert-box error">{error}</div>}
      <div className="grid grid-2">
        {devices.map((d) => (
          <div className="card" key={d.id}>
            <div className="card-header">
              <span className="card-title">{d.device_name}</span>
              <span
                className={`status-dot ${
                  d.connection_status === 'ONLINE'
                    ? 'online'
                    : d.connection_status === 'OFFLINE'
                      ? 'offline'
                      : 'unknown'
                }`}
              />
            </div>
            <p>
              <strong>Code:</strong> {d.device_code}
            </p>
            <p>
              <strong>Location:</strong> {d.location || '—'}
            </p>
            <p>
              <strong>Mode:</strong>{' '}
              <span className={`badge ${d.operating_mode === 'SIMULATION' ? 'badge-sim' : 'badge-hw'}`}>
                {d.operating_mode}
              </span>
            </p>
            <p>
              <strong>Status:</strong> {d.connection_status}
            </p>
            <p className="stat-meta">
              Last seen: {d.last_seen ? new Date(d.last_seen).toLocaleString() : '—'}
            </p>
          </div>
        ))}
        {devices.length === 0 && !error && (
          <div className="empty-state">No devices registered</div>
        )}
      </div>
    </div>
  );
}
