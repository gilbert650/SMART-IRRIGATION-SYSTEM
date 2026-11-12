/**
 * API client – all frontend data access goes through this layer.
 * Never talk to MySQL from React.
 */
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('sis_token');
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch (err) {
    throw {
      code: 'NETWORK_ERROR',
      message: 'Cannot reach the API. Is the backend running on port 5000?'
    };
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw body.error || { code: 'HTTP_ERROR', message: res.statusText };
  }
  return body;
}

export const api = {
  // Health
  health: () => request('/health'),
  dbHealth: () => request('/health/database'),
  systemStatus: () => request('/system/status'),

  // Auth
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),

  // Devices
  devices: () => request('/devices'),
  device: (id) => request(`/devices/${id}`),
  deviceStatus: (id) => request(`/devices/${id}/status`),

  // Sensors
  latestReading: (deviceId) =>
    request(`/sensors/latest${deviceId ? `?device_id=${deviceId}` : ''}`),
  sensorHistory: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/sensors/history?${q}`);
  },

  // Pump
  pumpStatus: (deviceId) =>
    request(`/pump/status${deviceId ? `?device_id=${deviceId}` : ''}`),
  pumpCommands: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/pump/commands?${q}`);
  },
  sendPumpCommand: (device_id, command) =>
    request('/pump/command', {
      method: 'POST',
      body: JSON.stringify({ device_id, command })
    }),

  // Irrigation
  irrigationMode: (deviceId) =>
    request(`/irrigation/mode${deviceId ? `?device_id=${deviceId}` : ''}`),
  setIrrigationMode: (device_id, mode) =>
    request('/irrigation/mode', {
      method: 'PUT',
      body: JSON.stringify({ device_id, mode })
    }),
  irrigationEvents: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/irrigation/events?${q}`);
  },

  // Settings
  settings: (deviceId) =>
    request(`/settings${deviceId ? `?device_id=${deviceId}` : ''}`),
  updateSettings: (deviceId, data) =>
    request(`/settings/${deviceId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Alerts
  alerts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/alerts?${q}`);
  },
  activeAlerts: (deviceId) =>
    request(`/alerts/active${deviceId ? `?device_id=${deviceId}` : ''}`),
  resolveAlert: (id) => request(`/alerts/${id}/resolve`, { method: 'PATCH' }),

  // Simulation
  simStatus: () => request('/simulation/status'),
  simStart: () => request('/simulation/start', { method: 'POST' }),
  simStop: () => request('/simulation/stop', { method: 'POST' }),
  simReset: () => request('/simulation/reset', { method: 'POST' }),
  simScenario: (scenario) =>
    request('/simulation/scenario', {
      method: 'PUT',
      body: JSON.stringify({ scenario })
    })
};

export default api;
