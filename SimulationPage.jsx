import { useEffect, useState } from 'react';
import api from '../services/api';

const SCENARIOS = [
  { id: 'normal', label: 'Normal' },
  { id: 'drying_fast', label: 'Drying Fast' },
  { id: 'low_tank', label: 'Low Tank' },
  { id: 'invalid_sensor', label: 'Invalid Sensor' },
  { id: 'offline', label: 'Device Offline' }
];

export default function SimulationPage() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await api.simStatus();
      setStatus(res.data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  async function action(fn, okMsg) {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await fn();
      setMsg(okMsg);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Simulation Controls</h1>
      <p className="page-subtitle">
        Backend simulator generates realistic readings – never claims physical pump activity
      </p>
      {error && <div className="alert-box error">{error}</div>}
      {msg && <div className="alert-box success">{msg}</div>}

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <span className="card-title">Status</span>
          <span className={`badge ${status?.running ? 'badge-on' : 'badge-off'}`}>
            {status?.running ? 'RUNNING' : 'STOPPED'}
          </span>
        </div>
        <p>
          Scenario: <strong>{status?.scenario || '—'}</strong>
        </p>
        {(status?.devices || []).map((d) => (
          <div key={d.deviceId} style={{ marginTop: 12, fontSize: '0.9rem' }}>
            Device #{d.deviceId}: moisture {d.soilMoisture}% · tank {d.tankLevel}% · temp{' '}
            {d.airTemp}°C · valid={String(d.valid)} · online={String(d.online)}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() => action(() => api.simStart(), 'Simulation started')}
          >
            Start
          </button>
          <button
            className="btn btn-outline"
            disabled={busy}
            onClick={() => action(() => api.simStop(), 'Simulation stopped')}
          >
            Stop
          </button>
          <button
            className="btn btn-outline"
            disabled={busy}
            onClick={() => action(() => api.simReset(), 'Simulation reset (users/schema kept)')}
          >
            Reset Demo State
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Scenarios</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className={`btn ${status?.scenario === s.id ? 'btn-primary' : 'btn-outline'}`}
              disabled={busy}
              onClick={() =>
                action(() => api.simScenario(s.id), `Scenario set to ${s.label}`)
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
