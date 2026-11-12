import { useEffect, useState } from 'react';
import api from '../services/api';

export default function AlertsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const res = await api.alerts({ limit: 50 });
      setRows(res.data?.data || res.data || []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id) {
    try {
      await api.resolveAlert(id);
      setMsg('Alert resolved');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="page-title">Alerts & Notifications</h1>
      <p className="page-subtitle">System alerts from sensors, safety, and devices</p>
      {error && <div className="alert-box error">{error}</div>}
      {msg && <div className="alert-box success">{msg}</div>}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Message</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No alerts
                  </td>
                </tr>
              ) : (
                rows.map((a) => (
                  <tr key={a.id}>
                    <td>{a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</td>
                    <td>{a.alert_type}</td>
                    <td>
                      <span
                        className={`badge ${
                          a.severity === 'CRITICAL' ? 'badge-crit' : 'badge-warn'
                        }`}
                      >
                        {a.severity}
                      </span>
                    </td>
                    <td>{a.message}</td>
                    <td>{a.is_resolved ? 'Resolved' : 'Active'}</td>
                    <td>
                      {!a.is_resolved && (
                        <button className="btn btn-outline" onClick={() => resolve(a.id)}>
                          Resolve
                        </button>
                      )}
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
