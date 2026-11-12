import { useEffect, useState } from 'react';
import api from '../services/api';

export default function SettingsPage() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const deviceId = 1;

  useEffect(() => {
    api
      .settings(deviceId)
      .then((res) => setForm(res.data))
      .catch((err) => setError(err.message));
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      const res = await api.updateSettings(deviceId, {
        start_moisture_threshold: Number(form.start_moisture_threshold),
        stop_moisture_threshold: Number(form.stop_moisture_threshold),
        maximum_runtime_seconds: Number(form.maximum_runtime_seconds),
        cooldown_seconds: Number(form.cooldown_seconds),
        stale_reading_timeout_seconds: Number(form.stale_reading_timeout_seconds),
        min_tank_level_percent: Number(form.min_tank_level_percent),
        simulation_interval_ms: Number(form.simulation_interval_ms)
      });
      setForm(res.data);
      setMsg('Settings saved – they persist in MySQL after restart');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!form && !error) return <div className="loading">Loading settings…</div>;

  return (
    <div>
      <h1 className="page-title">Irrigation Settings</h1>
      <p className="page-subtitle">Thresholds and safety limits (validated on backend)</p>
      {error && <div className="alert-box error">{error}</div>}
      {msg && <div className="alert-box success">{msg}</div>}
      {form && (
        <form className="card" onSubmit={save} style={{ maxWidth: 480 }}>
          <div className="form-group">
            <label>Start moisture threshold (%)</label>
            <input
              type="number"
              step="0.1"
              value={form.start_moisture_threshold}
              onChange={(e) => update('start_moisture_threshold', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Stop moisture threshold (%)</label>
            <input
              type="number"
              step="0.1"
              value={form.stop_moisture_threshold}
              onChange={(e) => update('stop_moisture_threshold', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Maximum runtime (seconds)</label>
            <input
              type="number"
              value={form.maximum_runtime_seconds}
              onChange={(e) => update('maximum_runtime_seconds', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Cooldown (seconds)</label>
            <input
              type="number"
              value={form.cooldown_seconds}
              onChange={(e) => update('cooldown_seconds', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Stale reading timeout (seconds)</label>
            <input
              type="number"
              value={form.stale_reading_timeout_seconds}
              onChange={(e) => update('stale_reading_timeout_seconds', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Minimum tank level (%)</label>
            <input
              type="number"
              step="0.1"
              value={form.min_tank_level_percent}
              onChange={(e) => update('min_tank_level_percent', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Simulation interval (ms)</label>
            <input
              type="number"
              value={form.simulation_interval_ms}
              onChange={(e) => update('simulation_interval_ms', e.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Save Settings
          </button>
        </form>
      )}
    </div>
  );
}
