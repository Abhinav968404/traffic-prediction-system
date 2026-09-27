import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";

function Forecast() {
  const location = useLocation();

  const { from, to, date, time } = location.state || {};

  const [traffic, setTraffic] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3000/api/traffic/latest")
      .then((res) => res.json())
      .then((data) => {
        setTraffic(data.traffic || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Traffic API error:", error);
        setLoading(false);
      });
  }, []);

  // Find traffic data for selected locations
  const fromData = traffic.find(
    (item) =>
      item.locationName.toLowerCase() ===
      from?.toLowerCase()
  );

  const toData = traffic.find(
    (item) =>
      item.locationName.toLowerCase() ===
      to?.toLowerCase()
  );

  // Use available selected-location data
  const routeData = fromData || toData;

  const getCongestion = (item) => {
    if (!item) return "Unavailable";

    const ratio =
      item.currentSpeed / item.freeFlowSpeed;

    if (ratio >= 0.85) return "Low";
    if (ratio >= 0.6) return "Moderate";
    return "High";
  };

  const getDelay = (item) => {
    if (!item) return 0;

    return Math.max(
      0,
      Math.round(
        (item.currentTravelTime -
          item.freeFlowTravelTime) /
          60
      )
    );
  };

  const congestion = getCongestion(routeData);
  const delay = getDelay(routeData);

  const travelMinutes = routeData
    ? Math.round(routeData.currentTravelTime / 60)
    : 0;

  const travelHours = Math.floor(travelMinutes / 60);
  const remainingMinutes = travelMinutes % 60;

  const travelTime =
    travelHours > 0
      ? `${travelHours}h ${remainingMinutes}m`
      : `${remainingMinutes} min`;

  if (loading) {
    return (
      <div className="app">
        <main>
          <section className="prediction-section">
            <h2>Loading traffic forecast...</h2>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app">

      <nav className="navbar">

        <div className="logo">
          <span className="logo-icon">🚦</span>

          <div className="logo-brand">
            <span className="logo-name">
              Traff<span className="logo-highlight">IQ</span>
            </span>

            <span className="logo-tagline">
              SMARTER JOURNEYS
            </span>
          </div>
        </div>

        <div className="nav-links">
          <Link to="/">Home</Link>
        </div>

        <Link
          to="/dashboard"
          className="nav-button"
        >
          Dashboard
        </Link>

      </nav>


      <main>

        <section className="prediction-section">

          <div className="prediction-header">

            <div>

              <div className="result-badge">
                ✦ AI PREDICTION
              </div>

              <h2>Traffic forecast</h2>

              <p>
                Real-time traffic conditions for your
                selected journey.
              </p>

            </div>

            <div className="route-summary">
              <strong>{from}</strong>
              <span>→</span>
              <strong>{to}</strong>
            </div>

          </div>


          {/* Prediction Cards */}

          <div className="prediction-cards">

            <div className="prediction-card">

              <span className="prediction-icon">
                🚦
              </span>

              <div>

                <small>CONGESTION</small>

                <h3>{congestion}</h3>

                <p className="prediction-green">
                  Based on live traffic speed
                </p>

              </div>

            </div>


            <div className="prediction-card">

              <span className="prediction-icon">
                ⏱️
              </span>

              <div>

                <small>
                  ESTIMATED TRAVEL TIME
                </small>

                <h3>
                  {routeData
                    ? travelTime
                    : "Unavailable"}
                </h3>

                <p>
                  Current traffic travel time
                </p>

              </div>

            </div>


            <div className="prediction-card">

              <span className="prediction-icon">
                ⚠️
              </span>

              <div>

                <small>
                  EXPECTED DELAY
                </small>

                <h3>
                  {routeData
                    ? `+${delay} min`
                    : "Unavailable"}
                </h3>

                <p>
                  Compared with free-flow conditions
                </p>

              </div>

            </div>

          </div>


          {/* Traffic Information */}

          <div className="prediction-grid">

            <div className="chart-card">

              <div className="chart-header">

                <div>

                  <h3>Traffic Details</h3>

                  <p>
                    Current traffic conditions
                  </p>

                </div>

                <span className="chart-label">
                  Live data
                </span>

              </div>


              {routeData ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, 1fr)",
                    gap: "20px",
                    marginTop: "25px"
                  }}
                >

                  <div>
                    <small>CURRENT SPEED</small>

                    <h3>
                      {routeData.currentSpeed} km/h
                    </h3>
                  </div>

                  <div>
                    <small>FREE-FLOW SPEED</small>

                    <h3>
                      {routeData.freeFlowSpeed} km/h
                    </h3>
                  </div>

                  <div>
                    <small>CONFIDENCE</small>

                    <h3>
                      {Math.round(
                        routeData.confidence * 100
                      )}%
                    </h3>
                  </div>

                </div>
              ) : (
                <p style={{ marginTop: "30px" }}>
                  Live traffic data is not currently
                  available for this selected location.
                </p>
              )}

            </div>


            {/* Recommendation */}

            <div className="recommendation-card">

              <div className="recommendation-icon">
                💡
              </div>

              <div>

                <small>
                  SMART RECOMMENDATION
                </small>

                <h3>
                  {congestion === "High"
                    ? "Consider leaving later or using an alternate route"
                    : congestion === "Moderate"
                    ? "Consider leaving a little earlier"
                    : "Traffic conditions look good"}
                </h3>

                <p>
                  Recommendation based on the
                  current traffic conditions.
                </p>

                <div className="recommended-time">

                  <span>
                    Departure
                  </span>

                  <strong>
                    {time || "Not selected"}
                  </strong>

                </div>

              </div>

            </div>

          </div>


          <div className="prediction-footer">

            <span>●</span>

            Live traffic data retrieved from the
            TraffIQ backend.

          </div>


          <div className="prediction-footer">

            📅 Departure date: {date || "Not selected"}

            &nbsp;&nbsp;

            🕐 Departure time: {time || "Not selected"}

          </div>


          <div className="another-journey-container">

            <Link
              to="/"
              className="another-journey-button"
            >
              ← Plan another journey
            </Link>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Forecast;