import { useEffect, useState } from 'react';
import api from '../services/api';

export default function IrrigationControl() {
  const [pump, setPump] = useState(null);
  const [mode, setMode] = useState('AUTO');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const deviceId = 1;

  async function load() {
    try {
      const [p, m] = await Promise.all([api.pumpStatus(deviceId), api.irrigationMode(deviceId)]);
      setPump(p.data);
      setMode(m.data?.irrigation_mode || 'AUTO');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  async function changeMode(newMode) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.setIrrigationMode(deviceId, newMode);
      setMode(newMode);
      setMessage(`Mode set to ${newMode}`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendCommand(command) {
    if (command === 'ON' && !window.confirm('Start irrigation? Safety checks will still apply.')) {
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await api.sendPumpCommand(deviceId, command);
      setMessage(res.message || `Command ${command} accepted`);
      await load();
    } catch (err) {
      setError(err.message || 'Command failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Irrigation Control</h1>
      <p className="page-subtitle">
        Manual and automatic control · Safety checks enforced on the backend
      </p>

      {error && <div className="alert-box error">{error}</div>}
      {message && <div className="alert-box success">{message}</div>}

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Current Status</span>
          </div>
          <p>
            Pump:{' '}
            <span className={`badge ${pump?.pump_status === 'ON' ? 'badge-on' : 'badge-off'}`}>
              {pump?.pump_status || '—'}
            </span>
          </p>
          <p style={{ marginTop: 8 }}>
            Source: <span className="badge badge-sim">{pump?.pump_source || '—'}</span>
          </p>
          <p style={{ marginTop: 8 }}>Mode: <strong>{mode}</strong></p>
          <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
            {pump?.note}
          </p>
          {pump?.emergency_stop ? (
            <div className="alert-box warning" style={{ marginTop: 12 }}>
              Emergency stop is active
            </div>
          ) : null}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Mode Selection</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              className={`btn ${mode === 'AUTO' ? 'btn-primary' : 'btn-outline'}`}
              disabled={busy}
              onClick={() => changeMode('AUTO')}
            >
              AUTO
            </button>
            <button
              className={`btn ${mode === 'MANUAL' ? 'btn-primary' : 'btn-outline'}`}
              disabled={busy}
              onClick={() => changeMode('MANUAL')}
            >
              MANUAL
            </button>
          </div>
          <div className="card-header">
            <span className="card-title">Pump Commands</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={busy} onClick={() => sendCommand('ON')}>
              Pump ON
            </button>
            <button className="btn btn-outline" disabled={busy} onClick={() => sendCommand('OFF')}>
              Pump OFF
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={() => sendCommand('EMERGENCY_STOP')}>
              Emergency Stop
            </button>
          </div>
          <p style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--gray-600)' }}>
            Manual mode does not bypass low-water, invalid sensor, stale reading, or max-runtime
            protections.
          </p>
        </div>
      </div>
    </div>
  );
}
