import { useLocation, Link } from "react-router-dom";

function Forecast() {
  const location = useLocation();

  const { from, to, date, time } = location.state || {};

  
  return (
    <div className="app">

      {/* NAVBAR */}
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
        </div>

        <button className="nav-button">
          Dashboard
        </button>

      </nav>


      {/* FORECAST PAGE */}
      <main>

        <section className="prediction-section">

          <div className="prediction-header">

            <div>

              <div className="result-badge">
                ✦ AI PREDICTION
              </div>

              <h2>Traffic forecast</h2>

              <p>
                Predicted conditions for your selected journey.
              </p>

            </div>

            <div className="route-summary">

              <strong>{from}</strong>

              <span>→</span>

              <strong>{to}</strong>

            </div>

          </div>


          {/* RESULT CARDS */}

          <div className="prediction-cards">

            <div className="prediction-card">

              <span className="prediction-icon">
                🚦
              </span>

              <div>

                <small>CONGESTION</small>

                <h3>Moderate</h3>

                <p className="prediction-green">
                  Expected traffic level
                </p>

              </div>

            </div>


            <div className="prediction-card">

              <span className="prediction-icon">
                ⏱️
              </span>

              <div>

                <small>ESTIMATED TRAVEL TIME</small>

                <h3>2h 15m</h3>

                <p>
                  Predicted journey duration
                </p>

              </div>

            </div>


            <div className="prediction-card">

              <span className="prediction-icon">
                ⚠️
              </span>

              <div>

                <small>EXPECTED DELAY</small>

                <h3>+28 min</h3>

                <p>
                  Compared with normal conditions
                </p>

              </div>

            </div>

          </div>


          {/* CHART + RECOMMENDATION */}

          <div className="prediction-grid">


            {/* FORECAST CHART */}

            <div className="chart-card">

              <div className="chart-header">

                <div>

                  <h3>Traffic Forecast</h3>

                  <p>
                    Expected congestion throughout the day
                  </p>

                </div>

                <span className="chart-label">
                  Next 12 hours
                </span>

              </div>


              <div className="chart">

                <div className="chart-line">

                  <span style={{ height: "35%" }}></span>

                  <span style={{ height: "48%" }}></span>

                  <span style={{ height: "42%" }}></span>

                  <span style={{ height: "65%" }}></span>

                  <span style={{ height: "82%" }}></span>

                  <span style={{ height: "72%" }}></span>

                  <span style={{ height: "55%" }}></span>

                  <span style={{ height: "43%" }}></span>

                  <span style={{ height: "38%" }}></span>

                </div>


                <div className="chart-labels">

                  <span>6 AM</span>
                  <span>8 AM</span>
                  <span>10 AM</span>
                  <span>12 PM</span>
                  <span>2 PM</span>
                  <span>4 PM</span>
                  <span>6 PM</span>

                </div>

              </div>

            </div>


            {/* RECOMMENDATION */}

            <div className="recommendation-card">

              <div className="recommendation-icon">
                💡
              </div>

              <div>

                <small>
                  SMART RECOMMENDATION
                </small>

                <h3>
                  Consider leaving earlier
                </h3>

                <p>
                  Traffic is expected to increase around
                  your selected departure time.
                </p>

                <div className="recommended-time">

                  <span>
                    Recommended departure
                  </span>

                  <strong>
                    6:30 AM
                  </strong>

                </div>

              </div>

            </div>

          </div>


          {/* DISCLAIMER */}

          <div className="prediction-footer">

            <span>●</span>

            Prediction generated using historical
            traffic patterns. Live traffic data will
            be integrated later.

          </div>


          {/* JOURNEY INFO */}

          <div className="prediction-footer">

            📅 Departure date: {date}

            &nbsp;&nbsp;

            🕐 Departure time: {time}

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
