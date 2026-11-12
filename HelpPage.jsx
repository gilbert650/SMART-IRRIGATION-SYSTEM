export default function HelpPage() {
  return (
    <div>
      <h1 className="page-title">Help & System Information</h1>
      <p className="page-subtitle">Smart Automated Irrigation System – Rwanda demo farm</p>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ marginBottom: 8 }}>What this system does</h3>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: '0.95rem' }}>
          <li>Monitors soil moisture, tank level, temperature and humidity</li>
          <li>Starts irrigation automatically when soil is dry (below start threshold)</li>
          <li>Stops when moisture reaches the stop threshold or safety rules fail</li>
          <li>Stores all readings and events in MySQL</li>
          <li>Works fully in SIMULATION mode without any hardware</li>
          <li>Supports future ESP32 + real sensors/pump integration</li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ marginBottom: 8 }}>Demo login</h3>
        <p>
          Email: <code>admin@irrigation.rw</code>
          <br />
          Password: <code>Admin@123</code>
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ marginBottom: 8 }}>Quick start</h3>
        <ol style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: '0.95rem' }}>
          <li>Start XAMPP MySQL and import database scripts</li>
          <li>Configure backend/.env and run <code>npm install && npm run dev</code> in backend/</li>
          <li>Run <code>npm install && npm run dev</code> in frontend/</li>
          <li>Open http://localhost:5173 and sign in</li>
          <li>Go to Simulation page and Start if not already running</li>
        </ol>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Important notes</h3>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: '0.95rem' }}>
          <li>SIMULATION MODE never means a physical pump is running</li>
          <li>All safety checks are enforced on the backend, not only in the browser</li>
          <li>Device API keys must never appear in frontend source code</li>
          <li>See README.md and docs/ for full architecture and hardware wiring</li>
        </ul>
      </div>
    </div>
  );
}
