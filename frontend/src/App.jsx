import { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";

import "./App.css";
import Forecast from "./Forecast";

/* =========================================================
   DELHI NCR LOCATIONS
========================================================= */

const ncrRegions = [
  // DELHI
  "Delhi",
  "New Delhi",
  "North Delhi",
  "North East Delhi",
  "North West Delhi",
  "West Delhi",
  "South West Delhi",
  "South Delhi",
  "South East Delhi",
  "Central Delhi",
  "East Delhi",
  "Shahdara",

  // GHAZIABAD
  "Ghaziabad",
  "Indirapuram",
  "Vaishali",
  "Vasundhara",
  "Kaushambi",
  "Crossings Republik",
  "Raj Nagar",
  "Raj Nagar Extension",
  "Kavi Nagar",
  "Loni",
  "Muradnagar",
  "Modinagar",

  // NOIDA / GREATER NOIDA
  "Noida",
  "Greater Noida",
  "Noida Extension",
  "Noida Sector 15",
  "Noida Sector 18",
  "Noida Sector 20",
  "Noida Sector 22",
  "Noida Sector 27",
  "Noida Sector 37",
  "Noida Sector 44",
  "Noida Sector 50",
  "Noida Sector 51",
  "Noida Sector 52",
  "Noida Sector 61",
  "Noida Sector 62",
  "Noida Sector 63",
  "Noida Sector 71",
  "Noida Sector 74",
  "Noida Sector 75",
  "Noida Sector 76",
  "Noida Sector 78",
  "Noida Sector 79",
  "Noida Sector 93",
  "Noida Sector 94",
  "Noida Sector 100",
  "Noida Sector 104",
  "Noida Sector 110",
  "Noida Sector 119",
  "Noida Sector 121",
  "Noida Sector 125",
  "Noida Sector 128",
  "Noida Sector 137",
  "Noida Sector 142",
  "Noida Sector 143",
  "Noida Sector 144",
  "Noida Sector 150",
  "Noida Sector 152",
  "Noida Sector 168",
  "Knowledge Park",
  "Pari Chowk",
  "Techzone",
  "Yamuna Expressway",

  // GURUGRAM
  "Gurugram",
  "Gurgaon",
  "Cyber City",
  "MG Road Gurugram",
  "Golf Course Road",
  "Golf Course Extension Road",
  "Sohna Road",
  "Dwarka Expressway",
  "Manesar",
  "Udyog Vihar",
  "DLF Phase 1",
  "DLF Phase 2",
  "DLF Phase 3",
  "DLF Phase 4",
  "DLF Phase 5",

  // FARIDABAD
  "Faridabad",
  "Ballabhgarh",
  "NIT Faridabad",
  "Old Faridabad",
  "Sector 15 Faridabad",
  "Sector 16 Faridabad",
  "Sector 21 Faridabad",
  "Greater Faridabad",

  // SONIPAT
  "Sonipat",
  "Murthal",
  "Kundli",
  "Ganaur",
  "Rai",
  "Barhi",

  // PANIPAT
  "Panipat",
  "Samalkha",

  // ROHTAK
  "Rohtak",
  "Meham",
  "Sampla",

  // JHAJJAR
  "Jhajjar",
  "Bahadurgarh",
  "Badli",

  // REWARI
  "Rewari",
  "Dharuhera",
  "Bawal",

  // PALWAL
  "Palwal",
  "Hodal",

  // MEERUT
  "Meerut",
  "Meerut Cantt",
  "Modipuram",
  "Daurala",
  "Mawana",
  "Sardhana",

  // BAGHPAT
  "Baghpat",
  "Baraut",
  "Khekra",

  // HAPUR
  "Hapur",
  "Pilkhuwa",
  "Garhmukteshwar",

  // BULANDSHAHR
  "Bulandshahr",
  "Khurja",
  "Sikandrabad",
  "Jahangirabad",

  // MUZAFFARNAGAR
  "Muzaffarnagar",
  "Budhana",
  "Khatauli",

  // SHAMLI
  "Shamli",
  "Kairana",
  "Thanabhawan",

  // NUH
  "Nuh",
  "Tauru",
  "Firozpur Jhirka",

  // JIND
  "Jind",
  "Narwana",
  "Safidon",

  // KARNAL
  "Karnal",
  "Gharaunda",
  "Taraori",

  // BHIWANI
  "Bhiwani",
  "Loharu",

  // CHARKHI DADRI
  "Charkhi Dadri",

  // MAHENDRAGARH
  "Narnaul",
  "Mahendragarh",

  // RAJASTHAN NCR
  "Alwar",
  "Bhiwadi",
  "Neemrana",
  "Behror",
  "Khairthal",
  "Tijara",
  "Bharatpur",
];

/* =========================================================
   SEARCHABLE LOCATION DROPDOWN
========================================================= */

function LocationDropdown({ label, value, setValue, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredLocations = ncrRegions.filter((location) =>
    location.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (location) => {
    setValue(location);
    setSearch("");
    setOpen(false);
  };

  return (
    <div className="input-group location-group" ref={dropdownRef}>
      <label>{label}</label>

      <div
        className={`input-wrapper location-wrapper ${
          open ? "location-active" : ""
        }`}
        onClick={() => setOpen(true)}
      >
        <span>📍</span>

        {!open ? (
          <div className={`location-value ${!value ? "placeholder" : ""}`}>
            {value || placeholder}
          </div>
        ) : (
          <input
            autoFocus
            type="text"
            value={search}
            placeholder={value || "Search NCR location..."}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        <span className={`dropdown-arrow ${open ? "arrow-up" : ""}`}>
          ▼
        </span>
      </div>

      {open && (
        <div className="location-dropdown">
          <div className="dropdown-search">
            <span>🔍</span>

            <input
              autoFocus
              type="text"
              value={search}
              placeholder="Search location..."
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="location-results">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((location) => (
                <button
                  type="button"
                  key={location}
                  className={`location-option ${
                    value === location ? "selected-location" : ""
                  }`}
                  onClick={() => handleSelect(location)}
                >
                  <span>📍</span>
                  <span>{location}</span>

                  {value === location && <span>✓</span>}
                </button>
              ))
            ) : (
              <div className="no-results">
                No NCR location found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   HOME PAGE
========================================================= */

function Home() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(null);
  const [selectedMinute, setSelectedMinute] = useState(null);

  const navigate = useNavigate();

  const handlePredict = () => {
    if (!from || !to || !date || !time) {
      alert("Please enter all trip details.");
      return;
    }

    if (from === to) {
      alert("Please select different starting and destination locations.");
      return;
    }

    navigate("/forecast", {
      state: {
        from,
        to,
        date,
        time,
      },
    });
  };

  return (
    <div className="app">

      {/* =================================================
          NAVBAR
      ================================================= */}

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

          <Link to="/forecast">Forecast</Link>

          <a href="#history">History</a>

        </div>

        <button className="nav-button">
          Dashboard
        </button>

      </nav>


      {/* =================================================
          SAFETY TICKER
      ================================================= */}

      <div className="safety-display">

        <div className="safety-display-track">

          

          <span className="safety-highlight">
            ⚠ SAFETY RULES
          </span>

          <span>• WEAR YOUR SEATBELT</span>

          <span>• FOLLOW TRAFFIC SIGNALS</span>

          <span>• DON'T TEXT WHILE DRIVING</span>

          <span>• MAINTAIN A SAFE DISTANCE</span>

          <span>• WEAR A HELMET</span>

          <span>• STAY ALERT</span>
          <span>• NEVER DRIVE UNDER THE INFLUENCE</span>

        </div>

      </div>


      {/* =================================================
          HERO
      ================================================= */}

      <section className="hero-section">

        <div className="hero-content">

          <div className="badge">

            <span>✦</span>

            AI-Powered Traffic Intelligence

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


          {/* =================================================
              PLANNER
          ================================================= */}

          <div className="planner-card">

            <div className="planner-header">

              <div>
                <h2>Plan your journey</h2>

                <p>
                  Enter your trip details to get a traffic prediction.
                </p>
              </div>

              <div className="planner-icon">
                ⤢
              </div>

            </div>


            <div className="form-grid">

              {/* FROM */}

              <LocationDropdown
                label="FROM"
                value={from}
                setValue={setFrom}
                placeholder="Select starting location"
              />


              {/* TO */}

              <LocationDropdown
                label="TO"
                value={to}
                setValue={setTo}
                placeholder="Select destination"
              />


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

  <div
    className="input-wrapper time-input"
    onClick={() => setShowTimePicker(true)}
    role="button"
    tabIndex={0}
  >
    <span>⏱️</span>

    <span className={time ? "time-value" : "time-placeholder"}>
      {time || "--:--"}
    </span>

    <span className="clock-icon">◷</span>
  </div>
</div>

            </div>


            {/* PREDICT BUTTON */}

            <button
              className="predict-button"
              onClick={handlePredict}
            >
              Predict Traffic →
            </button>

          </div>

        </div>


        {/* =================================================
            HERO VISUAL
        ================================================= */}

        <div className="hero-visual">

          <div className="traffic-orb">

            <div className="orb-ring ring-one"></div>

            <div className="orb-ring ring-two"></div>

            <div className="orb-center">
              🚦
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


      {/* =================================================
          FEATURES
      ================================================= */}

      <section className="features-section">

        <div className="feature">

          <div className="feature-icon">🔮</div>

          <div>
            <h3>AI Forecasting</h3>
            <p>Historical-based traffic predictions.</p>
          </div>

        </div>


        <div className="feature">

          <div className="feature-icon">🗺️</div>

          <div>
            <h3>Route Intelligence</h3>
            <p>Analyze traffic along your journey.</p>
          </div>

        </div>


        <div className="feature">

          <div className="feature-icon">⏱️</div>

          <div>
            <h3>Travel Time</h3>
            <p>Get estimated journey durations.</p>
          </div>

        </div>


        <div className="feature">

          <div className="feature-icon">⚡</div>

          <div>
            <h3>Smart Decisions</h3>
            <p>Find better times to travel.</p>
          </div>

        </div>

      </section>
          CUSTOM TIME PICKER
      ================================================= */

      {showTimePicker && (
        <div
          className="time-picker-overlay"
          onClick={() => setShowTimePicker(false)}
        >
          <div
            className="time-picker"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="time-picker-header">
              <span>DEPARTURE TIME</span>

              <button
                type="button"
                onClick={() => setShowTimePicker(false)}
              >
                ✕
              </button>
            </div>


            <div className="selected-time">

              <span
                className={
                  selectedHour !== null ? "active-time" : ""
                }
              >
                {selectedHour !== null
                  ? String(selectedHour).padStart(2, "0")
                  : "--"}
              </span>

              <span>:</span>

              <span
                className={
                  selectedMinute !== null ? "active-time" : ""
                }
              >
                {selectedMinute !== null
                  ? String(selectedMinute).padStart(2, "0")
                  : "--"}
              </span>

            </div>


            {/* CLOCK */}

            <div className="clock-face">

              {Array.from({ length: 12 }, (_, i) => {

                const hour = i + 1;
                const angle = i * 30 - 60;

                return (
                  <button
                    type="button"
                    key={hour}
                    className="clock-number"
                    style={{
                      transform: `
                        rotate(${angle}deg)
                        translate(100px)
                        rotate(${-angle}deg)
                      `
                    }}
                    onClick={() => {
                      setSelectedHour(hour);
                    }}
                  >
                    {hour}
                  </button>
                );

              })}

              <div className="clock-center"></div>

            </div>


            {/* MINUTES */}

            <div className="minute-section">

              <span>MINUTES</span>

              <div className="minute-options">

                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(
                  (minute) => (

                    <button
                      type="button"
                      key={minute}
                      className={
                        selectedMinute === minute
                          ? "minute-option selected"
                          : "minute-option"
                      }
                      onClick={() => {
                        setSelectedMinute(minute);
                      }}
                    >
                      {String(minute).padStart(2, "0")}
                    </button>

                  )
                )}

              </div>

            </div>


            {/* BUTTONS */}

            <div className="time-picker-actions">

              <button
                type="button"
                className="cancel-time"
                onClick={() => {
                  setShowTimePicker(false);
                }}
              >
                Cancel
              </button>


              <button
                type="button"
                className="confirm-time"
                onClick={() => {

                  if (
                    selectedHour !== null &&
                    selectedMinute !== null
                  ) {

                    const formatted =
                      `${String(selectedHour).padStart(2, "0")}:${String(
                        selectedMinute
                      ).padStart(2, "0")}`;

                    setTime(formatted);
                    setShowTimePicker(false);

                  }

                }}
              >
                Set Time →
              </button>

            </div>

          </div>
        </div>
      )}


    </div>
  );
}


/* =========================================================
   APP ROUTER
========================================================= */

function App() {

  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Home />} />

        <Route
          path="/forecast"
          element={<Forecast />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;