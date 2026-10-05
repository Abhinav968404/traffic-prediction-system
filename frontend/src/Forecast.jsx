import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});
const startIcon = L.divIcon({
  className: "custom-map-marker",
  html: `<div class="route-marker start-marker"></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const endIcon = L.divIcon({
  className: "custom-map-marker",
  html: `<div class="route-marker end-marker"></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});
function RouteMap({ routeData, from, to }) {

  if (
    !routeData ||
    !routeData.points ||
    routeData.points.length === 0
  ) {
    return null;
  }

  const routeCoordinates =
    routeData.points.map((point) => [
      point.latitude,
      point.longitude
    ]);

  const start =
    routeCoordinates[0];

  const end =
    routeCoordinates[
      routeCoordinates.length - 1
    ];

  return (
    <div className="route-map-card">

      <div className="route-map-header">

        <div>
          <h3>Journey Map</h3>

          <p>
            Live route between your selected locations
          </p>
        </div>

        <span className="chart-label">
          Live route
        </span>

      </div>

      <div className="route-map">

        <MapContainer
          center={start}
          zoom={12}
          scrollWheelZoom={true}
          style={{
            height: "450px",
            width: "100%"
          }}
        >

          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitRouteBounds coordinates={routeCoordinates} />

          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: "#00d9a6",
              weight: 6
            }}
          />

          <Marker
  position={start}
  icon={startIcon}
>
            <Popup>
              <strong>From</strong>
              <br />
              {from}
            </Popup>
          </Marker>

          <Marker
  position={end}
  icon={endIcon}
>
            <Popup>
              <strong>To</strong>
              <br />
              {to}
            </Popup>
          </Marker>

        </MapContainer>

      </div>

    </div>
  );
}
function FitRouteBounds({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 0) {
      map.fitBounds(coordinates, {
        padding: [30, 30],
      });
    }
  }, [coordinates, map]);

  return null;
}

function Forecast() {
  const location = useLocation();

  const { from, to, date, time } = location.state || {};

  const [routeData, setRouteData] = useState(null);
  const [trafficData, setTrafficData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!from || !to) {
      setLoading(false);
      setError("Please select both starting and destination locations.");
      return;
    }

    const fetchForecast = async () => {
      try {
        setLoading(true);
        setError("");

        // ==========================================
        // GET REAL ROUTE DATA FROM TOMTOM
        // ==========================================

        const routeResponse = await fetch(
          `http://localhost:3000/api/traffic/route?from=${encodeURIComponent(
            from
          )}&to=${encodeURIComponent(to)}`
        );

        const routeResult = await routeResponse.json();

        if (!routeResponse.ok || !routeResult.success) {
          throw new Error(
            routeResult.error || "Failed to calculate route"
          );
        }

        setRouteData(routeResult.route);


        // ==========================================
        // GET LIVE TRAFFIC DATA
        // ==========================================

        const trafficResponse = await fetch(
          "http://localhost:3000/api/traffic/latest"
        );

        const trafficResult = await trafficResponse.json();

        const traffic = trafficResult.traffic || [];

        // Try to find selected starting location
        const selectedTraffic = traffic.find(
          (item) =>
            item.locationName?.toLowerCase() ===
            from?.toLowerCase()
        );

        setTrafficData(selectedTraffic || null);

      } catch (error) {
        console.error("Forecast API error:", error);

        setError(
          error.message || "Unable to calculate traffic forecast."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [from, to]);


  // ==========================================
  // CONGESTION
  // ==========================================

  const getCongestion = () => {
    if (!routeData) return "Unavailable";

    const {
      travelTimeMinutes,
      freeFlowTimeMinutes,
      trafficDelayMinutes
    } = routeData;

    if (!freeFlowTimeMinutes) {
      return "Unavailable";
    }

    const delayRatio =
      trafficDelayMinutes / freeFlowTimeMinutes;

    if (delayRatio <= 0.10) {
      return "Low";
    }

    if (delayRatio <= 0.30) {
      return "Moderate";
    }

    return "High";
  };


  const congestion = getCongestion();


  // ==========================================
  // TRAVEL TIME
  // ==========================================

  const travelMinutes = routeData
    ? routeData.travelTimeMinutes
    : 0;

  const travelHours = Math.floor(
    travelMinutes / 60
  );

  const remainingMinutes =
    travelMinutes % 60;

  const travelTime =
    travelHours > 0
      ? `${travelHours}h ${remainingMinutes}m`
      : `${remainingMinutes} min`;


  // ==========================================
  // FREE FLOW TIME
  // ==========================================

  const freeFlowMinutes = routeData
    ? routeData.freeFlowTimeMinutes
    : 0;

  const freeFlowHours = Math.floor(
    freeFlowMinutes / 60
  );

  const freeFlowRemainingMinutes =
    freeFlowMinutes % 60;

  const freeFlowTime =
    freeFlowHours > 0
      ? `${freeFlowHours}h ${freeFlowRemainingMinutes}m`
      : `${freeFlowRemainingMinutes} min`;


  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="app">
        <main>
          <section className="prediction-section">

            <div className="prediction-header">
              <div>
                <div className="result-badge">
                  ✦ AI PREDICTION
                </div>

                <h2>
                  Calculating your route...
                </h2>

                <p>
                  Fetching real-time traffic and route
                  information.
                </p>
              </div>
            </div>

          </section>
        </main>
      </div>
    );
  }


  // ==========================================
  // ERROR
  // ==========================================

  if (error) {
    return (
      <div className="app">

        <nav className="navbar">

          <div className="logo">
            <span className="logo-icon">🚦</span>

            <div className="logo-brand">
              <span className="logo-name">
                Traff
                <span className="logo-highlight">
                  IQ
                </span>
              </span>

              <span className="logo-tagline">
                SMARTER JOURNEYS
              </span>
            </div>
          </div>

          <div className="nav-links">
            <Link to="/">
              Home
            </Link>
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
                  ⚠️ ROUTE ERROR
                </div>

                <h2>
                  Unable to calculate route
                </h2>

                <p>
                  {error}
                </p>

              </div>

            </div>

            <div className="another-journey-container">

              <Link
                to="/"
                className="another-journey-button"
              >
                ← Try another journey
              </Link>

            </div>

          </section>

        </main>

      </div>
    );
  }


  return (
    <div className="app">

      {/* ========================================
          NAVBAR
      ======================================== */}

      <nav className="navbar">

        <div className="logo">

          <span className="logo-icon">
            🚦
          </span>

          <div className="logo-brand">

            <span className="logo-name">
              Traff
              <span className="logo-highlight">
                IQ
              </span>
            </span>

            <span className="logo-tagline">
              SMARTER JOURNEYS
            </span>

          </div>

        </div>


        <div className="nav-links">

          <Link to="/">
            Home
          </Link>

        </div>


        <Link
          to="/dashboard"
          className="nav-button"
        >
          Dashboard
        </Link>

      </nav>


      {/* ========================================
          MAIN CONTENT
      ======================================== */}

      <main>

        <section className="prediction-section">


          {/* ====================================
              HEADER
          ==================================== */}

          <div className="prediction-header">

            <div>

              <div className="result-badge">
                ✦ AI PREDICTION
              </div>

              <h2>
                Traffic forecast
              </h2>

              <p>
                Real-time traffic conditions for your
                selected journey.
              </p>

            </div>


            <div className="route-summary">

              <strong>
                {from}
              </strong>

              <span>
                →
              </span>

              <strong>
                {to}
              </strong>

            </div>

          </div>


          {/* ====================================
              PREDICTION CARDS
          ==================================== */}

          <div className="prediction-cards">


            {/* CONGESTION */}

            <div className="prediction-card">

              <span className="prediction-icon">
                🚦
              </span>

              <div>

                <small>
                  CONGESTION
                </small>

                <h3>
                  {congestion}
                </h3>

                <p className="prediction-green">
                  Based on live route conditions
                </p>

              </div>

            </div>


            {/* TRAVEL TIME */}

            <div className="prediction-card">

              <span className="prediction-icon">
                ⏱️
              </span>

              <div>

                <small>
                  ESTIMATED TRAVEL TIME
                </small>

                <h3>
                  {travelTime}
                </h3>

                <p>
                  Current traffic route time
                </p>

              </div>

            </div>


            {/* DELAY */}

            <div className="prediction-card">

              <span className="prediction-icon">
                ⚠️
              </span>

              <div>

                <small>
                  EXPECTED DELAY
                </small>

                <h3>
                  +{routeData.trafficDelayMinutes} min
                </h3>

                <p>
                  Compared with free-flow conditions
                </p>

              </div>

            </div>

          </div>

          {/* ====================================
    JOURNEY MAP
==================================== */}

<RouteMap
  routeData={routeData}
  from={from}
  to={to}
/>


          {/* ====================================
              TRAFFIC DETAILS
          ==================================== */}

          <div className="prediction-grid">


            <div className="chart-card">

              <div className="chart-header">

                <div>

                  <h3>
                    Route Details
                  </h3>

                  <p>
                    Real-time TomTom route information
                  </p>

                </div>

                <span className="chart-label">
                  Live data
                </span>

              </div>


              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, 1fr)",
                  gap: "20px",
                  marginTop: "25px"
                }}
              >


                {/* DISTANCE */}

                <div>

                  <small>
                    DISTANCE
                  </small>

                  <h3>
                    {routeData.distanceKm} km
                  </h3>

                </div>


                {/* FREE FLOW */}

                <div>

                  <small>
                    FREE-FLOW TIME
                  </small>

                  <h3>
                    {freeFlowTime}
                  </h3>

                </div>


                {/* TRAFFIC DELAY */}

                <div>

                  <small>
                    TRAFFIC DELAY
                  </small>

                  <h3>
                    +{routeData.trafficDelayMinutes} min
                  </h3>

                </div>

              </div>


              {/* LIVE SPEED */}

              {trafficData && (

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, 1fr)",
                    gap: "20px",
                    marginTop: "30px",
                    paddingTop: "25px",
                    borderTop:
                      "1px solid rgba(255,255,255,0.08)"
                  }}
                >

                  <div>

                    <small>
                      CURRENT SPEED
                    </small>

                    <h3>
                      {trafficData.currentSpeed} km/h
                    </h3>

                  </div>


                  <div>

                    <small>
                      FREE-FLOW SPEED
                    </small>

                    <h3>
                      {trafficData.freeFlowSpeed} km/h
                    </h3>

                  </div>


                  <div>

                    <small>
                      CONFIDENCE
                    </small>

                    <h3>
                      {Math.round(
                        trafficData.confidence * 100
                      )}%
                    </h3>

                  </div>

                </div>

              )}

            </div>


            {/* ==================================
                RECOMMENDATION
            ================================== */}

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
                  current route traffic conditions.
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


          {/* ====================================
              LIVE DATA FOOTER
          ==================================== */}

          <div className="prediction-footer">

            <span>
              ●
            </span>

            Live route data retrieved from
            the TraffIQ backend.

          </div>


          <div className="prediction-footer">

            📅 Departure date:
            {" "}
            {date || "Not selected"}

            &nbsp;&nbsp;

            🕐 Departure time:
            {" "}
            {time || "Not selected"}

          </div>


          {/* ====================================
              PLAN ANOTHER JOURNEY
          ==================================== */}

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