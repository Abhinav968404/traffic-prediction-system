import React, { useEffect, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import "./Dashboard.css";
import { Link } from "react-router-dom";

function Dashboard() {
  const [traffic, setTraffic] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [analysisType, setAnalysisType] = useState("trend");
  const [forecast, setForecast] = useState([]);

  const [evaluation, setEvaluation] = useState(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // HISTORICAL TRAFFIC DATA
  // ==========================================

  useEffect(() => {
    if (!selectedLocation) return;

    fetch(
      `http://localhost:3000/api/traffic/history?location=${encodeURIComponent(
        selectedLocation
      )}`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch history");
        }

        return res.json();
      })
      .then((data) => {
        const formattedData = (data.traffic || []).map((item) => ({
          timestamp: item.timestamp,
          speed: item.currentSpeed,
          freeFlow: item.freeFlowSpeed,
        }));

        setHistory(formattedData);
      })
      .catch((err) => {
        console.error("History API error:", err);
      });
  }, [selectedLocation]);

  // ==========================================
  // FORECAST DATA
  // ==========================================

  useEffect(() => {
    if (!selectedLocation) return;

    fetch(
      `http://localhost:3000/api/traffic/forecast?location=${encodeURIComponent(
        selectedLocation
      )}`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch forecast");
        }

        return res.json();
      })
      .then((data) => {
        console.log("Forecast data:", data);

        setHistory(data.historical || []);
        setForecast(data.predictions || []);
      })
      .catch((err) => {
        console.error("Forecast error:", err);
        setForecast([]);
      });
  }, [selectedLocation]);

  // ==========================================
  // MODEL EVALUATION
  // ==========================================

  useEffect(() => {
    if (!selectedLocation) return;

    setEvaluationLoading(true);

    fetch(
      `http://localhost:3000/api/traffic/evaluate?location=${encodeURIComponent(
        selectedLocation
      )}`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to evaluate model");
        }

        return res.json();
      })
      .then((data) => {
        console.log("Evaluation data:", data);

        setEvaluation(data);
        setEvaluationLoading(false);
      })
      .catch((err) => {
        console.error("Evaluation error:", err);

        setEvaluation(null);
        setEvaluationLoading(false);
      });
  }, [selectedLocation]);

  // ==========================================
  // LATEST TRAFFIC DATA
  // ==========================================

  useEffect(() => {
    fetch("http://localhost:3000/api/traffic/latest")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch traffic data");
        }

        return res.json();
      })
      .then((data) => {
        setTraffic(data.traffic || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load traffic data");
        setLoading(false);
      });
  }, []);

  // ==========================================
  // LATEST RECORD FOR EACH LOCATION
  // ==========================================

  const latestByLocation = Object.values(
    traffic.reduce((acc, item) => {
      if (!acc[item.locationName]) {
        acc[item.locationName] = item;
      }

      return acc;
    }, {})
  );

  useEffect(() => {
    if (!selectedLocation && latestByLocation.length > 0) {
      setSelectedLocation(latestByLocation[0].locationName);
    }
  }, [latestByLocation, selectedLocation]);

  // ==========================================
  // CONGESTION
  // ==========================================

  const getCongestion = (item) => {
    const ratio = item.currentSpeed / item.freeFlowSpeed;

    if (ratio >= 0.85) return "Low";
    if (ratio >= 0.6) return "Moderate";

    return "High";
  };

  // ==========================================
  // DELAY
  // ==========================================

  const getDelay = (item) => {
    const delay =
      item.currentTravelTime - item.freeFlowTravelTime;

    return Math.max(0, Math.round(delay / 60));
  };

  // ==========================================
  // AVERAGE SPEED
  // ==========================================

  const avgSpeed =
    latestByLocation.length > 0
      ? Math.round(
          latestByLocation.reduce(
            (sum, item) => sum + item.currentSpeed,
            0
          ) / latestByLocation.length
        )
      : 0;

  // ==========================================
  // AVERAGE DELAY
  // ==========================================

  const avgDelay =
    latestByLocation.length > 0
      ? Math.round(
          latestByLocation.reduce(
            (sum, item) => sum + getDelay(item),
            0
          ) / latestByLocation.length
        )
      : 0;

  // ==========================================
  // CONGESTION COUNTS
  // ==========================================

  const lowCount = latestByLocation.filter(
    (item) => getCongestion(item) === "Low"
  ).length;

  const moderateCount = latestByLocation.filter(
    (item) => getCongestion(item) === "Moderate"
  ).length;

  const highCount = latestByLocation.filter(
    (item) => getCongestion(item) === "High"
  ).length;

  const totalLocations = latestByLocation.length || 1;

  const lowPercentage = Math.round(
    (lowCount / totalLocations) * 100
  );

  const moderatePercentage = Math.round(
    (moderateCount / totalLocations) * 100
  );

  const highPercentage = Math.round(
    (highCount / totalLocations) * 100
  );

  // ==========================================
  // TIME SERIES + FORECAST DATA
  // ==========================================

  const chartData = [
    ...history.map((item) => ({
      time: new Date(item.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),

      currentSpeed: item.speed,
      freeFlowSpeed: item.freeFlow,
      predictedSpeed: null,
    })),

    ...forecast.map((item) => ({
      time: new Date(item.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),

      currentSpeed: null,
      freeFlowSpeed: null,
      predictedSpeed: item.predictedSpeed,
    })),
  ];

  // ==========================================
  // ACTUAL VS PREDICTED EVALUATION DATA
  // ==========================================

  const evaluationChartData =
    evaluation?.comparison?.map((item, index) => ({
      testPoint: `Test ${index + 1}`,
      actual: item.actual,
      predicted: item.predicted,
    })) || [];

  // ==========================================
  // TREND + SEASONALITY DATA
  // ==========================================

  const trendData = [...history]
  .filter((item) => item.timestamp)
  .sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime()
  )
  .map((item) => ({
    time: new Date(item.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    speed: item.speed ?? item.currentSpeed,
    freeFlow: item.freeFlow ?? item.freeFlowSpeed,
  }));

  // ==========================================
  // SEASONALITY DATA
  // ==========================================

  const seasonalityMap = {};

  history.forEach((item) => {
    if (!item.timestamp) return;

    const date = new Date(item.timestamp);
    const hour = date.getHours();

    const speed = item.speed ?? item.currentSpeed;

    if (speed == null) return;

    if (!seasonalityMap[hour]) {
      seasonalityMap[hour] = {
        hour,
        speeds: [],
      };
    }

    seasonalityMap[hour].speeds.push(Number(speed));
  });

  const seasonalityData = Object.values(seasonalityMap)
    .map((item) => ({
      hour: new Date(
        2000,
        0,
        1,
        item.hour
      ).toLocaleTimeString([], {
        hour: "2-digit",
        hour12: true,
      }),

      averageSpeed: Number(
        (
          item.speeds.reduce(
            (sum, value) => sum + value,
            0
          ) / item.speeds.length
        ).toFixed(1)
      ),
    }))
    .sort((a, b) => {
      return (
        new Date(`2000/01/01 ${a.hour}`) -
        new Date(`2000/01/01 ${b.hour}`)
      );
    });

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="dashboard-page">
        <h2>Loading traffic data...</h2>
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error) {
    return (
      <div className="dashboard-page">
        <h2>{error}</h2>

        <p>
          Make sure the backend is running on
          http://localhost:3000
        </p>
      </div>
    );
  }

  // ==========================================
  // MAIN DASHBOARD
  // ==========================================

  return (
    <div className="dashboard-page">

      {/* Header */}

      <div className="dashboard-header">

        <div>

          <span className="dashboard-badge">
            ✦ LIVE TRAFFIC ANALYTICS
          </span>

          <h1>Traffic Dashboard</h1>

          <p>
            Real-time traffic conditions collected from the
            connected traffic data service.
          </p>

        </div>

      </div>


      {/* Statistics */}

      <div className="dashboard-stats">

        <div className="stat-card">

          <div className="stat-icon">
            📍
          </div>

          <div>

            <span>
              Locations Tracked
            </span>

            <h2>
              {latestByLocation.length}
            </h2>

          </div>

        </div>


        <div className="stat-card">

          <div className="stat-icon">
            🚗
          </div>

          <div>

            <span>
              Average Speed
            </span>

            <h2>
              {avgSpeed} km/h
            </h2>

          </div>

        </div>


        <div className="stat-card">

          <div className="stat-icon">
            ⚠️
          </div>

          <div>

            <span>
              Average Delay
            </span>

            <h2>
              +{avgDelay} min
            </h2>

          </div>

        </div>


        <div className="stat-card">

          <div className="stat-icon">
            📊
          </div>

          <div>

            <span>
              Traffic Records
            </span>

            <h2>
              {traffic.length}
            </h2>

          </div>

        </div>

      </div>


      {/* Historical Traffic Trend */}

      <div className="dashboard-card historical-trend">

        <div className="card-header">

          <div>

            <span>
              TIME SERIES ANALYSIS
            </span>

            <h3>
              {analysisType === "trend"
                ? "Historical Traffic Trend"
                : "Traffic Seasonality"}
            </h3>

            <p>
              {analysisType === "trend"
                ? "Traffic speed variation over time"
                : "Average traffic speed by hour of day"}
            </p>

          </div>


          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >

            {/* Analysis selector */}

            <select
              value={analysisType}
              onChange={(e) =>
                setAnalysisType(e.target.value)
              }
              className="location-select"
            >

              <option value="trend">
                Trend
              </option>

              <option value="seasonality">
                Seasonality
              </option>

            </select>


            {/* Location selector */}

            <select
              value={selectedLocation}
              onChange={(e) =>
                setSelectedLocation(e.target.value)
              }
              className="location-select"
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

        </div>


        <div
          style={{
            width: "100%",
            height: "350px",
            marginTop: "25px",
          }}
        >

          {history.length > 0 || forecast.length > 0 ? (

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              {analysisType === "trend" ? (

                <LineChart data={trendData}>

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="time"
                  />

                  <YAxis
                    label={{
                      value: "Speed (km/h)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />

                  <Tooltip />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="speed"
                    name="Current Speed"
                    strokeWidth={3}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="freeFlow"
                    name="Free-Flow Speed"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />

                </LineChart>

              ) : (

                <LineChart data={seasonalityData}>

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="hour"
                  />

                  <YAxis
                    label={{
                      value: "Average Speed (km/h)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />

                  <Tooltip />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="averageSpeed"
                    name="Average Speed"
                    strokeWidth={3}
                    dot={false}
                  />

                </LineChart>

              )}

            </ResponsiveContainer>

          ) : (

            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >

              <p>
                Collecting historical traffic data...
              </p>

            </div>

          )}

        </div>

      </div>


      {/* Main analytics */}

      <div className="dashboard-grid">

        {/* Traffic Trend */}

        <div className="dashboard-card traffic-trend">

          <div className="card-header">

            <div>

              <span>
                TRAFFIC CONDITIONS
              </span>

              <h3>
                Current congestion by location
              </h3>

            </div>

            <div className="trend-label">
              Live data
            </div>

          </div>


          <div className="chart">

            <div className="chart-bars">

              {latestByLocation.map((item) => {

                const ratio =
                  item.currentSpeed /
                  item.freeFlowSpeed;

                const congestionHeight =
                  Math.max(
                    10,
                    Math.round(
                      (1 - ratio) * 100
                    )
                  );

                return (

                  <div
                    className="bar-wrapper"
                    key={item.locationName}
                  >

                    <div
                      className="bar"
                      style={{
                        height: `${congestionHeight}%`,
                      }}
                    ></div>

                    <span>
                      {item.locationName
                        .replace(", Delhi", "")
                        .replace(
                          "Connaught Place",
                          "CP"
                        )}
                    </span>

                  </div>

                );

              })}

            </div>

          </div>

        </div>


        {/* Congestion */}

        <div className="dashboard-card">

          <div className="card-header">

            <div>

              <span>
                CONGESTION
              </span>

              <h3>
                Traffic distribution
              </h3>

            </div>

          </div>


          <div className="congestion-list">

            <div className="congestion-item">

              <div>

                <span className="dot low"></span>

                Low

              </div>

              <strong>
                {lowPercentage}%
              </strong>

            </div>


            <div className="congestion-item">

              <div>

                <span className="dot moderate"></span>

                Moderate

              </div>

              <strong>
                {moderatePercentage}%
              </strong>

            </div>


            <div className="congestion-item">

              <div>

                <span className="dot high"></span>

                High

              </div>

              <strong>
                {highPercentage}%
              </strong>

            </div>

          </div>

        </div>

      </div>


      {/* Recent Traffic */}

      <div className="dashboard-card recent-journeys">

        <div className="card-header">

          <div>

            <span>
              LIVE TRAFFIC DATA
            </span>

            <h3>
              Recent Traffic Conditions
            </h3>

          </div>

        </div>


        <div className="journey-table">

          <div className="journey-row journey-heading">

            <span>
              Location
            </span>

            <span>
              Congestion
            </span>

            <span>
              Delay
            </span>

            <span>
              Status
            </span>

          </div>


          {latestByLocation.map((item) => {

            const congestion =
              getCongestion(item);

            const delay =
              getDelay(item);

            return (

              <div
                className="journey-row"
                key={item.locationName}
              >

                <span>
                  {item.locationName}
                </span>


                <span
                  className={
                    congestion === "High"
                      ? "high-text"
                      : congestion === "Moderate"
                      ? "moderate-text"
                      : "low-text"
                  }
                >
                  {congestion}
                </span>


                <span>
                  {delay > 0
                    ? `+${delay} min`
                    : "No delay"}
                </span>


                <span className="status-good">
                  Live
                </span>

              </div>

            );

          })}

        </div>

      </div>


      <Link
        to="/"
        className="home-button"
      >
        ← Go to Home
      </Link>

    </div>
  );
}

export default Dashboard;