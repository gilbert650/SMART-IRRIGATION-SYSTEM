import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import api from '../services/api';

export default function SensorHistory() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  async function load(p = 1) {
    try {
      setError('');
      const res = await api.sensorHistory({ page: p, limit: 50 });
      const data = res.data?.data || res.data || [];
      setRows(data);
      setTotal(res.data?.pagination?.total || data.length);
      setPage(p);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load(1);
  }, []);

  const chartData = [...rows].reverse().map((r) => ({
    time: r.created_at ? new Date(r.created_at).toLocaleString() : '',
    moisture: r.soil_moisture != null ? Number(r.soil_moisture) : null,
    tank: r.tank_level != null ? Number(r.tank_level) : null,
    temp: r.air_temperature != null ? Number(r.air_temperature) : null,
    humidity: r.air_humidity != null ? Number(r.air_humidity) : null
  }));

  return (
    <div>
      <h1 className="page-title">Sensor History</h1>
      <p className="page-subtitle">Historical readings from MySQL via the API</p>
      {error && <div className="alert-box error">{error}</div>}

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <span className="card-title">Charts</span>
        </div>
        {chartData.length === 0 ? (
          <div className="empty-state">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="moisture" stroke="#2e7d32" name="Moisture %" dot={false} />
              <Line type="monotone" dataKey="tank" stroke="#0277bd" name="Tank %" dot={false} />
              <Line type="monotone" dataKey="temp" stroke="#e65100" name="Temp °C" dot={false} />
              <Line type="monotone" dataKey="humidity" stroke="#6a1b9a" name="Humidity %" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Table (page {page} · {total} total)</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" disabled={page <= 1} onClick={() => load(page - 1)}>
              Prev
            </button>
            <button className="btn btn-outline" onClick={() => load(page + 1)}>
              Next
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Moisture</th>
                <th>Tank</th>
                <th>Temp</th>
                <th>Humidity</th>
                <th>Valid</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                  <td>{r.soil_moisture != null ? Number(r.soil_moisture).toFixed(1) : '—'}</td>
                  <td>{r.tank_level != null ? Number(r.tank_level).toFixed(1) : '—'}</td>
                  <td>{r.air_temperature != null ? Number(r.air_temperature).toFixed(1) : '—'}</td>
                  <td>{r.air_humidity != null ? Number(r.air_humidity).toFixed(1) : '—'}</td>
                  <td>{r.sensor_valid ? 'Yes' : 'No'}</td>
                  <td>
                    <span className={`badge ${r.source === 'SIMULATION' ? 'badge-sim' : 'badge-hw'}`}>
                      {r.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
