
import React, { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import "./Dashboard.css";

const API = "http://localhost:3000/api/traffic";

const formatTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value ?? "")
    : date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
};

const numberOrDash = (value, digits = 0) =>
  Number.isFinite(Number(value))
    ? Number(value).toFixed(digits)
    : "—";

function Dashboard() {
  const [traffic, setTraffic] = useState([]);
  const [history, setHistory] = useState([]);
  const [evaluationModel, setEvaluationModel] = useState("arima");
  const [forecast, setForecast] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [analysisType, setAnalysisType] = useState("trend");
  const [evaluation, setEvaluation] = useState(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetch(`${API}/latest`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load traffic records.");
        }
        return response.json();
      })
      .then((data) => {
        if (!active) return;

        setTraffic(data.traffic || []);
        setError("");
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Unable to load traffic data.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const latestByLocation = useMemo(() => {
    const records = new Map();

    traffic.forEach((item) => {
      const name =
        item.locationName || item.location || "Unknown location";

      const previous = records.get(name);
      const itemTime = new Date(item.timestamp).getTime() || 0;

      const previousTime = previous
        ? new Date(previous.timestamp).getTime() || 0
        : -1;

      if (!previous || itemTime >= previousTime) {
        records.set(name, item);
      }
    });

    return [...records.entries()].map(([locationName, item]) => ({
      ...item,
      locationName,
    }));
  }, [traffic]);

  useEffect(() => {
    if (!selectedLocation && latestByLocation.length) {
      setSelectedLocation(latestByLocation[0].locationName);
    }
  }, [latestByLocation, selectedLocation]);

  useEffect(() => {
    if (!selectedLocation) return undefined;

    let active = true;

    const locationQuery = `?location=${encodeURIComponent(selectedLocation)}`;
    const forecastQuery = `${locationQuery}&model=arima`;
    const evaluationQuery = `${locationQuery}&model=${evaluationModel}`;

    fetch(`${API}/history${locationQuery}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("History request failed");
        }
        return response.json();
      })
      .then((data) => {
        if (!active) return;

        setHistory(
          (data.traffic || []).map((item) => ({
            timestamp: item.timestamp,
            time: formatTime(item.timestamp),
            speed: Number(item.currentSpeed),
            freeFlow: Number(item.freeFlowSpeed),
          }))
        );
      })
      .catch((err) => {
        console.error("History API error:", err);
      });

    fetch(`${API}/forecast${forecastQuery}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Forecast request failed");
        }
        return response.json();
      })
      .then((data) => {
        if (!active) return;

        const historical = (data.historical || []).map((item) => ({
          ...item,
          time: formatTime(item.timestamp || item.time),
          speed: Number(item.currentSpeed ?? item.speed),
          freeFlow: Number(item.freeFlowSpeed ?? item.freeFlow),
        }));

        if (historical.length) {
          setHistory(historical);
        }

        setForecast(
          (data.predictions || []).map((item) => ({
            ...item,
            time: formatTime(item.timestamp || item.time),
            predictedSpeed: Number(
              item.predictedSpeed ??
                item.speed ??
                item.prediction
            ),
          }))
        );
      })
      .catch((err) => {
        console.error("Forecast API error:", err);

        if (active) {
          setForecast([]);
        }
      });

    setEvaluationLoading(true);

    fetch(`${API}/evaluate${evaluationQuery}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Evaluation request failed");
        }
        return response.json();
      })
      .then((data) => {
        if (active) {
          setEvaluation(data);
        }
      })
      .catch((err) => {
        console.error("Evaluation API error:", err);

        if (active) {
          setEvaluation(null);
        }
      })
      .finally(() => {
        if (active) {
          setEvaluationLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedLocation,evaluationModel]);

  const getCongestion = (item) => {
    const current = Number(item.currentSpeed);
    const freeFlow = Number(item.freeFlowSpeed);

    if (
      !Number.isFinite(current) ||
      !Number.isFinite(freeFlow) ||
      freeFlow <= 0
    ) {
      return "Unknown";
    }

    const ratio = current / freeFlow;

    if (ratio >= 0.85) return "Low";
    if (ratio >= 0.6) return "Moderate";

    return "High";
  };

  const getDelay = (item) => {
    const current = Number(item.currentTravelTime);
    const freeFlow = Number(item.freeFlowTravelTime);

    if (
      !Number.isFinite(current) ||
      !Number.isFinite(freeFlow)
    ) {
      return null;
    }

    return Math.max(
      0,
      Math.round((current - freeFlow) / 60)
    );
  };

  const stats = useMemo(() => {
    const validSpeeds = latestByLocation
      .map((item) => Number(item.currentSpeed))
      .filter(Number.isFinite);

    const delays = latestByLocation
      .map(getDelay)
      .filter((value) => value !== null);

    const counts = {
      Low: 0,
      Moderate: 0,
      High: 0,
    };

    latestByLocation.forEach((item) => {
      const level = getCongestion(item);

      if (level in counts) {
        counts[level] += 1;
      }
    });

    const average = (values) =>
      values.length
        ? values.reduce((sum, value) => sum + value, 0) /
          values.length
        : null;

    return {
      locations: latestByLocation.length,
      speed: average(validSpeeds),
      delay: average(delays),
      counts,
    };
  }, [latestByLocation]);

  const selectedRecord = latestByLocation.find(
    (item) => item.locationName === selectedLocation
  );

  const selectedCongestion = selectedRecord
    ? getCongestion(selectedRecord)
    : "Unknown";

  
const chartData = useMemo(() => {
  // TREND VIEW: historical + forecast data
  if (analysisType === "trend") {
    const past = history.map((item) => ({
      time: item.time || formatTime(item.timestamp),
      actualSpeed: Number(
        item.speed ?? item.currentSpeed
      ),
      freeFlow: Number(
        item.freeFlow ?? item.freeFlowSpeed
      ),
    }));

    const future = forecast.map((item) => ({
      time: item.time || formatTime(item.timestamp),
      forecastSpeed: Number(
        item.predictedSpeed ??
          item.speed ??
          item.prediction
      ),
    }));

    return [...past, ...future].filter((item) =>
      Object.values(item).some(
        (value) =>
          typeof value === "number" &&
          Number.isFinite(value)
      )
    );
  }

  // SEASONALITY VIEW: average speed for each hour
  const hourlyData = Array.from(
    { length: 24 },
    (_, hour) => ({
      hour,
      time: `${String(hour).padStart(2, "0")}:00`,
      totalSpeed: 0,
      count: 0,
    })
  );

  history.forEach((item) => {
    const timestamp = new Date(item.timestamp);

    if (Number.isNaN(timestamp.getTime())) return;

    const speed = Number(
      item.speed ?? item.currentSpeed
    );

    if (!Number.isFinite(speed)) return;

    const hour = timestamp.getHours();

    hourlyData[hour].totalSpeed += speed;
    hourlyData[hour].count += 1;
  });

  return hourlyData.map((item) => ({
    time: item.time,
    averageSpeed:
      item.count > 0
        ? Number(
            (item.totalSpeed / item.count).toFixed(1)
          )
        : null,
  }));
}, [history, forecast, analysisType]);
const evaluationChartData = useMemo(() => {
    return (evaluation?.comparison || []).map((item, index) => ({
        testPoint: index + 1,
        timestamp: item.timestamp,
        actual: Number(item.actual),
        predicted: Number(item.predicted),
        absoluteError: Number(item.absoluteError),
    }));
}, [evaluation]);


  const distributionTotal =
    stats.counts.Low +
    stats.counts.Moderate +
    stats.counts.High;

  const percent = (value) =>
    distributionTotal
      ? Math.round((value / distributionTotal) * 100)
      : 0;

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">
          <span className="loading-orb" />
          Loading traffic intelligence…
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">

        {/* Top navigation */}

        <div className="dashboard-topline">
          <Link to="/" className="home-button">
            <span aria-hidden="true">←</span>
            Back to Home
          </Link>

          <div className="live-indicator">
            <span />
            Live data overview
          </div>
        </div>

        {/* Dashboard header */}

        <header className="dashboard-header">
          <div>
            <div className="dashboard-eyebrow">
              <span className="eyebrow-mark">✳</span>
              TRAFFIQ / INTELLIGENCE CENTER
            </div>

            <h1>
              Traffic <span>Dashboard</span>
            </h1>

            <p>
              A live snapshot of road conditions, traffic
              patterns, and forecast insights.
            </p>
          </div>

          <div className="header-location">
            <label htmlFor="dashboard-location">
              MONITORING AREA
            </label>

            <select
              id="dashboard-location"
              value={selectedLocation}
              onChange={(event) =>
                setSelectedLocation(event.target.value)
              }
            >
              {latestByLocation.map((item) => (
                <option
                  key={item.locationName}
                  value={item.locationName}
                >
                  {item.locationName}
                </option>
              ))}
            </select>
          </div>
        </header>

        {error && (
          <div className="dashboard-error" role="alert">
            {error}
          </div>
        )}

        {/* Traffic summary cards */}

        <section
          className="dashboard-stats"
          aria-label="Traffic summary"
        >
          <article className="stat-card stat-primary">
            <div className="stat-top">
              <span className="stat-icon">⌁</span>
              <span className="stat-kicker">
                NETWORK COVERAGE
              </span>
            </div>

            <div className="stat-value">
              {stats.locations}
              <small> areas</small>
            </div>

            <div className="stat-foot">
              <span className="stat-dot green" />
              Locations reporting traffic data
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span className="stat-icon blue">↗</span>
              <span className="stat-kicker">
                AVERAGE SPEED
              </span>
            </div>

            <div className="stat-value">
              {numberOrDash(stats.speed, 1)}
              <small> km/h</small>
            </div>

            <div className="stat-foot">
              Across monitored locations
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span className="stat-icon amber">◷</span>
              <span className="stat-kicker">
                AVERAGE DELAY
              </span>
            </div>

            <div className="stat-value">
              {numberOrDash(stats.delay)}
              <small> min</small>
            </div>

            <div className="stat-foot">
              Compared with free-flow travel time
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span className="stat-icon red">⌁</span>
              <span className="stat-kicker">
                HIGH CONGESTION
              </span>
            </div>

            <div className="stat-value">
              {stats.counts.High}
              <small> areas</small>
            </div>

            <div className="stat-foot">
              <span className="stat-dot red" />
              Requiring extra travel time
            </div>
          </article>
        </section>

        {/* Main dashboard charts */}

        <section className="dashboard-main-grid">

          {/* Speed analytics */}

          <article className="dashboard-panel trend-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-eyebrow">
                  TRAFFIC FLOW
                </span>

                <h2>Speed analytics</h2>

                <p>
                  Historical movement and predicted flow
                </p>
              </div>

              <div
                className="chart-switch"
                role="group"
                aria-label="Chart type"
              >
                <button
                  className={
                    analysisType === "trend" ? "active" : ""
                  }
                  onClick={() => setAnalysisType("trend")}
                >
                  Trend
                </button>

                <button
                  className={
                    analysisType === "seasonality"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setAnalysisType("seasonality")
                  }
                >
                  Seasonality
                </button>
              </div>
            </div>

            <div className="chart-legend-note">
              <span className="legend-line" />
              Actual speed

              <span className="legend-line forecast-line" />
              Forecast

              <span className="legend-line freeflow-line" />
              Free-flow
            </div>

            <div className="dashboard-chart">
              {chartData.length ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={chartData}
                    margin={{
                      top: 8,
                      right: 10,
                      left: -16,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      stroke="#203148"
                      strokeDasharray="3 5"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="time"
                      tick={{
                        fill: "#8295ad",
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={24}
                    />

                    <YAxis
                      tick={{
                        fill: "#8295ad",
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        background: "#101e30",
                        border: "1px solid #2b4059",
                        borderRadius: 10,
                        color: "#f3f7fc",
                      }}
                    />

                    <Legend
                      wrapperStyle={{
                        display: "none",
                      }}
                    />

                    
{analysisType === "trend" ? (
  <>
    <Line
      type="monotone"
      dataKey="actualSpeed"
      name="Actual speed"
      stroke="#36d99a"
      strokeWidth={2.5}
      dot={false}
      connectNulls
    />

    <Line
      type="monotone"
      dataKey="forecastSpeed"
      name="Forecast"
      stroke="#45b8f0"
      strokeWidth={2.5}
      strokeDasharray="5 5"
      dot={false}
      connectNulls
    />

    <Line
      type="monotone"
      dataKey="freeFlow"
      name="Free-flow"
      stroke="#8392a7"
      strokeWidth={1.5}
      strokeDasharray="3 5"
      dot={false}
      connectNulls
    />
  </>
) : (
  <Line
    type="monotone"
    dataKey="averageSpeed"
    name="Hourly average speed"
    stroke="#45b8f0"
    strokeWidth={2.5}
    dot={{ r: 3 }}
    connectNulls
  />
)}


                    
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  <span>⌁</span>

                  <strong>No chart data yet</strong>

                  <p>
                    Historical and forecast data will appear
                    when available for this area.
                  </p>
                </div>
              )}
            </div>

            {analysisType === "seasonality" && (
              <p className="chart-caption">
                Seasonality view uses the available
                time-series observations for the selected area.
              </p>
            )}
          </article>

          {/* Congestion levels */}

          <article className="dashboard-panel congestion-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-eyebrow">
                  NETWORK STATUS
                </span>

                <h2>Congestion levels</h2>

                <p>
                  Latest reading by monitored area
                </p>
              </div>

              <span className="panel-tag">
                {distributionTotal} locations
              </span>
            </div>

            <div
              className="distribution-ring"
              style={{
                "--low": `${percent(stats.counts.Low)}%`,
                "--moderate": `${percent(
                  stats.counts.Moderate
                )}%`,
                "--high": `${percent(stats.counts.High)}%`,
              }}
            >
              <div className="ring-center">
                <strong>{distributionTotal}</strong>
                <span>AREAS</span>
              </div>
            </div>

            <div className="distribution-list">
              <div>
                <span className="level-label">
                  <i className="level-dot low" />
                  Low
                </span>

                <strong>
                  {stats.counts.Low}
                  <small>
                    {percent(stats.counts.Low)}%
                  </small>
                </strong>
              </div>

              <div>
                <span className="level-label">
                  <i className="level-dot moderate" />
                  Moderate
                </span>

                <strong>
                  {stats.counts.Moderate}
                  <small>
                    {percent(stats.counts.Moderate)}%
                  </small>
                </strong>
              </div>

              <div>
                <span className="level-label">
                  <i className="level-dot high" />
                  High
                </span>

                <strong>
                  {stats.counts.High}
                  <small>
                    {percent(stats.counts.High)}%
                  </small>
                </strong>
              </div>
            </div>

            <div className="congestion-summary">
              <span
                className={`status-pill ${selectedCongestion.toLowerCase()}`}
              >
                {selectedCongestion} traffic
              </span>
          
      </div>
    </article>

      
{/* ARIMA / SARIMA MODEL EVALUATION */}

<div className="dashboard-card">
  <div className="card-header">
    <div>
      <span>MODEL PERFORMANCE</span>
      <h3>Traffic Forecast Evaluation</h3>
      <p>Test-set predictions compared with observed traffic speed</p>
    </div>

    <select
      className="location-select"
      value={evaluationModel}
      onChange={(e) => setEvaluationModel(e.target.value)}
    >
      <option value="arima">ARIMA</option>
      <option value="sarima">SARIMA</option>
      <option value="xgboost">XGBoost</option>
    </select>
  </div>

  {evaluationLoading ? (
    <p>Loading evaluation...</p>
  ) : evaluation?.success ? (
    <>
      <p>
        Model: {evaluation.model} · Test observations:{" "}
        {evaluation.testingSamples}
      </p>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div>
            <span>MAE (km/h)</span>
            <h2>{evaluation.metrics.MAE}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div>
            <span>RMSE (km/h)</span>
            <h2>{evaluation.metrics.RMSE}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div>
            <span>MAPE (%)</span>
            <h2>
              {evaluation.metrics.MAPE == null
                ? "N/A"
                : `${evaluation.metrics.MAPE}%`}
            </h2>
          </div>
        </div>
      </div>

      <h4>Actual vs Predicted Speed</h4>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={evaluationChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="testPoint" hide />
            <YAxis label={{
              value: "Speed (km/h)",
              angle: -90,
              position: "insideLeft",
            }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Speed"
              stroke="#2563eb"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              name="Predicted Speed"
              stroke="#f59e0b"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h4>Absolute Prediction Error Over Time</h4>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={evaluationChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="testPoint" hide />
            <YAxis label={{
              value: "Error (km/h)",
              angle: -90,
              position: "insideLeft",
            }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="absoluteError"
              name="Absolute Error"
              stroke="#dc2626"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  ) : (
    <p>
      {evaluation?.error ||
        "No evaluation data available for this location and model."}
    </p>
  )}
</div>

      {/* Recent Traffic */}

      <div className="dashboard-card recent-journeys">

        <div className="card-header">

          <div>

            <span>
              LIVE TRAFFIC DATA
            </span>

              <h2>Traffic by location</h2>

              <p>
                Current speed compared with each road’s
                free-flow speed
              </p>
            </div>

            <span className="panel-tag">
              <span className="mini-live-dot" />
              Latest records
            </span>
          </div>

          <div className="location-table-wrap">
            <table className="location-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Current speed</th>
                  <th>Free-flow</th>
                  <th>Delay</th>
                  <th>Traffic status</th>
                </tr>
              </thead>

              <tbody>
                {latestByLocation.map((item) => {
                  const level = getCongestion(item);
                  const delay = getDelay(item);

                  return (
                    <tr
                      key={item.locationName}
                      className={
                        item.locationName === selectedLocation
                          ? "selected-row"
                          : ""
                      }
                      onClick={() =>
                        setSelectedLocation(item.locationName)
                      }
                    >
                      <td>
                        <span className="location-name">
                          <span className="location-pin">
                            ⌖
                          </span>

                          {item.locationName}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {numberOrDash(
                            Number(item.currentSpeed),
                            1
                          )}{" "}
                          <small>km/h</small>
                        </strong>
                      </td>

                      <td>
                        {numberOrDash(
                          Number(item.freeFlowSpeed),
                          1
                        )}{" "}
                        <small>km/h</small>
                      </td>

                      <td>
                        {delay === null
                          ? "—"
                          : `${delay} min`}
                      </td>

                      <td>
                        <span
                          className={`status-pill ${level.toLowerCase()}`}
                        >
                          {level}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {!latestByLocation.length && (
                  <tr>
                    <td
                      colSpan="5"
                      className="table-empty"
                    >
                      No traffic records are available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        </section>

        {/* Dashboard footer */}

        <footer className="dashboard-footer">
          <span>
            <span className="footer-mark">✳</span>
            TraffIQ
            <span className="footer-divider">/</span>
            Traffic intelligence, made clear.
          </span>

          <span>
            {evaluationLoading
              ? "Model evaluation updating…"
              : evaluation
                ? "Forecast model evaluation available"
                : "Model evaluation unavailable"}

            <span className="footer-divider">·</span>

            Data served by TraffIQ API
          </span>
        </footer>

      </div>
    </main>
  );
}

export default Dashboard;
