import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import { Link } from "react-router-dom";

function Dashboard() {
  const [traffic, setTraffic] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  // Latest record for each location
  const latestByLocation = Object.values(
    traffic.reduce((acc, item) => {
      if (!acc[item.locationName]) {
        acc[item.locationName] = item;
      }
      return acc;
    }, {})
  );

  // Congestion based on current speed vs free-flow speed
  const getCongestion = (item) => {
    const ratio = item.currentSpeed / item.freeFlowSpeed;

    if (ratio >= 0.85) return "Low";
    if (ratio >= 0.6) return "Moderate";
    return "High";
  };

  const getDelay = (item) => {
    const delay = item.currentTravelTime - item.freeFlowTravelTime;
    return Math.max(0, Math.round(delay / 60));
  };

  const avgSpeed =
    latestByLocation.length > 0
      ? Math.round(
          latestByLocation.reduce(
            (sum, item) => sum + item.currentSpeed,
            0
          ) / latestByLocation.length
        )
      : 0;

  const avgDelay =
    latestByLocation.length > 0
      ? Math.round(
          latestByLocation.reduce(
            (sum, item) => sum + getDelay(item),
            0
          ) / latestByLocation.length
        )
      : 0;

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

  const lowPercentage = Math.round((lowCount / totalLocations) * 100);
  const moderatePercentage = Math.round(
    (moderateCount / totalLocations) * 100
  );
  const highPercentage = Math.round(
    (highCount / totalLocations) * 100
  );

  if (loading) {
    return (
      <div className="dashboard-page">
        <h2>Loading traffic data...</h2>
      </div>
    );
  }

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
          <div className="stat-icon">📍</div>
          <div>
            <span>Locations Tracked</span>
            <h2>{latestByLocation.length}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚗</div>
          <div>
            <span>Average Speed</span>
            <h2>{avgSpeed} km/h</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div>
            <span>Average Delay</span>
            <h2>+{avgDelay} min</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div>
            <span>Traffic Records</span>
            <h2>{traffic.length}</h2>
          </div>
        </div>

      </div>


      {/* Main analytics */}
      <div className="dashboard-grid">

        {/* Traffic Trend */}
        <div className="dashboard-card traffic-trend">

          <div className="card-header">
            <div>
              <span>TRAFFIC CONDITIONS</span>
              <h3>Current congestion by location</h3>
            </div>

            <div className="trend-label">
              Live data
            </div>
          </div>

          <div className="chart">

            <div className="chart-bars">

              {latestByLocation.map((item) => {
                const ratio =
                  item.currentSpeed / item.freeFlowSpeed;

                const congestionHeight = Math.max(
                  10,
                  Math.round((1 - ratio) * 100)
                );

                return (
                  <div
                    className="bar-wrapper"
                    key={item.locationName}
                  >
                    <div
                      className="bar"
                      style={{
                        height: `${congestionHeight}%`
                      }}
                    ></div>

                    <span>
                      {item.locationName
                        .replace(", Delhi", "")
                        .replace("Connaught Place", "CP")}
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
              <span>CONGESTION</span>
              <h3>Traffic distribution</h3>
            </div>
          </div>

          <div className="congestion-list">

            <div className="congestion-item">
              <div>
                <span className="dot low"></span>
                Low
              </div>

              <strong>{lowPercentage}%</strong>
            </div>

            <div className="congestion-item">
              <div>
                <span className="dot moderate"></span>
                Moderate
              </div>

              <strong>{moderatePercentage}%</strong>
            </div>

            <div className="congestion-item">
              <div>
                <span className="dot high"></span>
                High
              </div>

              <strong>{highPercentage}%</strong>
            </div>

          </div>

        </div>

      </div>


      {/* Recent Traffic */}
      <div className="dashboard-card recent-journeys">

        <div className="card-header">
          <div>
            <span>LIVE TRAFFIC DATA</span>
            <h3>Recent Traffic Conditions</h3>
          </div>
        </div>

        <div className="journey-table">

          <div className="journey-row journey-heading">
            <span>Location</span>
            <span>Congestion</span>
            <span>Delay</span>
            <span>Status</span>
          </div>

          {latestByLocation.map((item) => {
            const congestion = getCongestion(item);
            const delay = getDelay(item);

            return (
              <div
                className="journey-row"
                key={item.locationName}
              >
                <span>{item.locationName}</span>

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
                  {delay > 0 ? `+${delay} min` : "No delay"}
                </span>

                <span className="status-good">
                  Live
                </span>
              </div>
            );
          })}

        </div>

      </div>


      <Link to="/" className="home-button">
        ← Go to Home
      </Link>

    </div>
  );
}

export default Dashboard;