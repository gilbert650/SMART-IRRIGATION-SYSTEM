import { useEffect, useState } from 'react';
import api from '../services/api';

export default function IrrigationHistory() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .irrigationEvents({ limit: 50 })
      .then((res) => setRows(res.data?.data || res.data || []))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1 className="page-title">Irrigation History</h1>
      <p className="page-subtitle">Start / stop cycles recorded in MySQL</p>
      {error && <div className="alert-box error">{error}</div>}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Mode</th>
                <th>Reason</th>
                <th>Pump</th>
                <th>Duration (s)</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No irrigation events yet
                  </td>
                </tr>
              ) : (
                rows.map((ev) => (
                  <tr key={ev.id}>
                    <td>{ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'}</td>
                    <td>{ev.event_type}</td>
                    <td>{ev.mode}</td>
                    <td>{ev.reason}</td>
                    <td>{ev.pump_status}</td>
                    <td>{ev.duration_seconds ?? '—'}</td>
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
