import { useState } from "react";
import "./App.css";

function App() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [showPrediction, setShowPrediction] = useState(false);

  const handlePredict = () => {
    if (!from || !to || !date || !time) {
      alert("Please enter all trip details.");
      return;
    }

    setShowPrediction(true);
  };

  return (
    <div className="app">

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">🚦</span>
          <span>
            Traffic<span className="logo-highlight">AI</span>
          </span>
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#forecast">Forecast</a>
          <a href="#history">History</a>
        </div>

        <button className="nav-button">Dashboard</button>
      </nav>

      {/* HERO */}
      <main id="home">
        <section className="hero-section">

          <div className="hero-content">

            <div className="badge">
              <span>✦</span> AI-Powered Traffic Intelligence
            </div>

            <h1>
              Predict your journey.
              <br />
              <span>Beat the traffic.</span>
            </h1>

            <p className="hero-text">
              Plan smarter journeys with AI-based traffic forecasting.
              Get congestion insights, estimated travel time and
              recommended departure times.
            </p>

            {/* TRIP PLANNER */}
            <div className="planner-card">

              <div className="planner-header">
                <div>
                  <h2>Plan your journey</h2>
                  <p>
                    Enter your trip details to get a traffic prediction.
                  </p>
                </div>

                <div className="planner-icon">⌁</div>
              </div>

              <div className="form-grid">

                {/* FROM */}
                <div className="input-group">
                  <label>FROM</label>

                  <div className="input-wrapper">
                    <span>📍</span>

                    <input
                      type="text"
                      placeholder="e.g. Meerut"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </div>
                </div>

                {/* TO */}
                <div className="input-group">
                  <label>TO</label>

                  <div className="input-wrapper">
                    <span>📍</span>

                    <input
                      type="text"
                      placeholder="e.g. Delhi"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </div>
                </div>

                {/* DATE */}
                <div className="input-group">
                  <label>DEPARTURE DATE</label>

                  <div className="input-wrapper">
                    <span>📅</span>

                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* TIME */}
                <div className="input-group">
                  <label>DEPARTURE TIME</label>

                  <div className="input-wrapper">
                    <span>🕐</span>

                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>

              </div>

              <button
                className="predict-button"
                onClick={handlePredict}
              >
                Predict Traffic
                <span>→</span>
              </button>

            </div>
          </div>

          {/* RIGHT VISUAL */}
          <div className="hero-visual">

            <div className="traffic-orb">

              <div className="orb-ring ring-one"></div>
              <div className="orb-ring ring-two"></div>

              <div className="orb-center">
                <span>🚦</span>
              </div>

            </div>

            <div className="floating-card card-top">
              <span className="status-dot"></span>

              <div>
                <small>LIVE TRAFFIC</small>
                <strong>Monitoring</strong>
              </div>
            </div>

            <div className="floating-card card-bottom">
              <span>📈</span>

              <div>
                <small>AI FORECAST</small>
                <strong>Next 24 hours</strong>
              </div>
            </div>

          </div>

        </section>

        {/* ========================= */}
        {/* PREDICTION RESULT */}
        {/* ========================= */}

        {showPrediction && (
          <section className="prediction-section" id="forecast">

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
                <span className="prediction-icon">🚦</span>

                <div>
                  <small>CONGESTION</small>
                  <h3>Moderate</h3>
                  <p className="prediction-green">
                    Expected traffic level
                  </p>
                </div>
              </div>

              <div className="prediction-card">
                <span className="prediction-icon">⏱️</span>

                <div>
                  <small>ESTIMATED TRAVEL TIME</small>
                  <h3>2h 15m</h3>
                  <p>Predicted journey duration</p>
                </div>
              </div>

              <div className="prediction-card">
                <span className="prediction-icon">⚠️</span>

                <div>
                  <small>EXPECTED DELAY</small>
                  <h3>+28 min</h3>
                  <p>Compared with normal conditions</p>
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
                    <p>Expected congestion throughout the day</p>
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
                  <small>SMART RECOMMENDATION</small>

                  <h3>
                    Consider leaving earlier
                  </h3>

                  <p>
                    Traffic is expected to increase around your
                    selected departure time.
                  </p>

                  <div className="recommended-time">
                    <span>Recommended departure</span>
                    <strong>6:30 AM</strong>
                  </div>
                </div>

              </div>

            </div>

            {/* DISCLAIMER / MODEL STATUS */}

            <div className="prediction-footer">
              <span>●</span>
              Prediction generated using historical traffic patterns.
              Live traffic data will be integrated later.
            </div>

          </section>
        )}

        {/* FEATURES */}

        <section className="features-section">

          <div className="feature">
            <div className="feature-icon">🧠</div>

            <div>
              <h3>AI Forecasting</h3>
              <p>
                Time-series based traffic predictions.
              </p>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">🗺️</div>

            <div>
              <h3>Route Intelligence</h3>
              <p>
                Analyze traffic along your journey.
              </p>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">⏱️</div>

            <div>
              <h3>Travel Time</h3>
              <p>
                Get estimated journey duration.
              </p>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">⚡</div>

            <div>
              <h3>Smart Decisions</h3>
              <p>
                Find better times to travel.
              </p>
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}

export default App;