import React from "react";
import "./Dashboard.css";
import { Link } from "react-router-dom";

function Dashboard() {
  return (
    <div className="dashboard-page">

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <span className="dashboard-badge">✦ TRAFFIC ANALYTICS</span>
          <h1>Traffic Dashboard</h1>
          <p>
            Overview of your traffic prediction activity.
          </p>
        </div>
      </div>
      


      {/* Statistics */}
      <div className="dashboard-stats">

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div>
            <span>Total Predictions</span>
            <h2>24</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div>
            <span>Avg. Travel Time</span>
            <h2>1h 42m</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div>
            <span>Avg. Delay</span>
            <h2>+18 min</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📍</div>
          <div>
            <span>Most Used Route</span>
            <h2>Delhi</h2>
          </div>
        </div>

      </div>


      {/* Main analytics */}
      <div className="dashboard-grid">

        {/* Traffic Trend */}
        <div className="dashboard-card traffic-trend">

          <div className="card-header">
            <div>
              <span>TRAFFIC TREND</span>
              <h3>Congestion throughout the day</h3>
            </div>

            <div className="trend-label">
              Last 24 hours
            </div>
          </div>

          <div className="chart">

            <div className="chart-bars">

              <div className="bar-wrapper">
                <div className="bar bar-1"></div>
                <span>6 AM</span>
              </div>

              <div className="bar-wrapper">
                <div className="bar bar-2"></div>
                <span>8 AM</span>
              </div>

              <div className="bar-wrapper">
                <div className="bar bar-3"></div>
                <span>10 AM</span>
              </div>

              <div className="bar-wrapper">
                <div className="bar bar-4"></div>
                <span>12 PM</span>
              </div>

              <div className="bar-wrapper">
                <div className="bar bar-5"></div>
                <span>2 PM</span>
              </div>

              <div className="bar-wrapper">
                <div className="bar bar-6"></div>
                <span>4 PM</span>
              </div>

              <div className="bar-wrapper">
                <div className="bar bar-7"></div>
                <span>6 PM</span>
              </div>

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

              <strong>35%</strong>
            </div>

            <div className="congestion-item">
              <div>
                <span className="dot moderate"></span>
                Moderate
              </div>

              <strong>45%</strong>
            </div>

            <div className="congestion-item">
              <div>
                <span className="dot high"></span>
                High
              </div>

              <strong>20%</strong>
            </div>

          </div>

        </div>

      </div>


      {/* Recent journeys */}
      <div className="dashboard-card recent-journeys">

        <div className="card-header">
          <div>
            <span>RECENT ACTIVITY</span>
            <h3>Recent Journeys</h3>
          </div>
        </div>

        <div className="journey-table">

          <div className="journey-row journey-heading">
            <span>Route</span>
            <span>Congestion</span>
            <span>Delay</span>
            <span>Status</span>
          </div>

          <div className="journey-row">
            <span>New Delhi → North Delhi</span>
            <span className="moderate-text">Moderate</span>
            <span>+18 min</span>
            <span className="status-good">Analyzed</span>
          </div>

          <div className="journey-row">
            <span>Noida → New Delhi</span>
            <span className="high-text">High</span>
            <span>+32 min</span>
            <span className="status-good">Analyzed</span>
          </div>

          <div className="journey-row">
            <span>Ghaziabad → Noida</span>
            <span className="low-text">Low</span>
            <span>+5 min</span>
            <span className="status-good">Analyzed</span>
          </div>

          <div className="journey-row">
            <span>Greater Noida → Delhi</span>
            <span className="moderate-text">Moderate</span>
            <span>+21 min</span>
            <span className="status-good">Analyzed</span>
          </div>

        </div>

      </div>
      <Link to="/" className="home-button">
  ← Go to Home
</Link>

    </div>
  );
}

export default Dashboard;