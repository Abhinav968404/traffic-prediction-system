const fs = require("fs/promises");
const { ACTIVE_LOCATIONS } = require("./config/locations");

require("dotenv").config();
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const Traffic = require("./models/Traffic");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use("/api/auth", authRoutes);


// ===============================
// TOMTOM TRAFFIC API
// ===============================

app.get("/api/traffic", async (req, res) => {
    try {
        const { lat, lon } = req.query;

        // Check coordinates
        if (!lat || !lon) {
            return res.status(400).json({
                error: "Latitude and longitude are required"
            });
        }

        // Call TomTom API
        const response = await axios.get(
            "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json",
            {
                params: {
                    point: `${lat},${lon}`,
                    unit: "KMPH",
                    key: process.env.TOMTOM_API_KEY
                }
            }
        );

        const data = response.data.flowSegmentData;

        // Save useful traffic information
        const trafficRecord = await Traffic.create({
            latitude: Number(lat),
            longitude: Number(lon),
            currentSpeed: data.currentSpeed,
            freeFlowSpeed: data.freeFlowSpeed,
            currentTravelTime: data.currentTravelTime,
            freeFlowTravelTime: data.freeFlowTravelTime,
            confidence: data.confidence,
            roadClosure: data.roadClosure
        });

        // Send response back to frontend
        res.json({
            success: true,
            traffic: trafficRecord
        });

    } catch (error) {
        console.error("Traffic API error:", error.message);

        res.status(500).json({
            success: false,
            error: "Failed to fetch traffic data"
        });
    }
});

// ========================================
// TOMTOM PLACE SEARCH / GEOCODING
// ========================================

app.get("/api/search-location", async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({
                error: "Please provide a location name"
            });
        }

        const response = await axios.get(
            "https://api.tomtom.com/search/2/search/" +
            encodeURIComponent(query) +
            ".json",
            {
                params: {
                    key: process.env.TOMTOM_API_KEY,
                    limit: 5,
                    countrySet: "IN"
                }
            }
        );

        const results = response.data.results;

        if (!results || results.length === 0) {
            return res.status(404).json({
                error: "Location not found"
            });
        }

        const locations = results.map(result => ({
            name: result.address?.freeformAddress || query,
            latitude: result.position.lat,
            longitude: result.position.lon,
            type: result.type
        }));

        res.json({
            success: true,
            query: query,
            locations: locations
        });

    } catch (error) {
        console.error(
            "Location search failed:",
            error.response?.data || error.message
        );

        res.status(500).json({
            error: "Failed to search location"
        });
    }
});

// ==========================================
// GET LATEST TRAFFIC DATA FROM MONGODB
// ==========================================
// ==========================================
// ROUTE TRAFFIC PREDICTION
// ==========================================

app.get("/api/traffic/route", async (req, res) => {

    try {

        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({
                success: false,
                error: "Both from and to locations are required"
            });
        }


        // ==========================================
        // STEP 1: FIND START LOCATION
        // ==========================================

        const fromLocation = await getCoordinates(from);

        if (!fromLocation) {
            return res.status(404).json({
                success: false,
                error: `Could not find starting location: ${from}`
            });
        }


        // ==========================================
        // STEP 2: FIND DESTINATION
        // ==========================================

        const toLocation = await getCoordinates(to);

        if (!toLocation) {
            return res.status(404).json({
                success: false,
                error: `Could not find destination: ${to}`
            });
        }


        // ==========================================
        // STEP 3: CURRENT TRAFFIC ROUTE
        // ==========================================

        const trafficResponse = await axios.get(
            "https://api.tomtom.com/routing/1/calculateRoute/" +
            `${fromLocation.latitude},${fromLocation.longitude}:` +
            `${toLocation.latitude},${toLocation.longitude}/json`,
            {
                params: {
                    key: process.env.TOMTOM_API_KEY,
                    traffic: true,
                    travelMode: "car"
                }
            }
        );


        if (
            !trafficResponse.data.routes ||
            trafficResponse.data.routes.length === 0
        ) {
            return res.status(404).json({
                success: false,
                error: "No route found"
            });
        }


        const trafficRoute = trafficResponse.data.routes[0];

        const trafficSummary = trafficRoute.summary;
        const routePoints =
        trafficRoute.legs?.[0]?.points || [];


        // ==========================================
        // STEP 4: FREE-FLOW ROUTE
        // ==========================================

        const freeFlowResponse = await axios.get(
            "https://api.tomtom.com/routing/1/calculateRoute/" +
            `${fromLocation.latitude},${fromLocation.longitude}:` +
            `${toLocation.latitude},${toLocation.longitude}/json`,
            {
                params: {
                    key: process.env.TOMTOM_API_KEY,
                    traffic: false,
                    travelMode: "car"
                }
            }
        );


        if (
            !freeFlowResponse.data.routes ||
            freeFlowResponse.data.routes.length === 0
        ) {
            return res.status(404).json({
                success: false,
                error: "Could not calculate free-flow route"
            });
        }


        const freeFlowRoute =
            freeFlowResponse.data.routes[0];

        const freeFlowSummary =
            freeFlowRoute.summary;


        // ==========================================
        // STEP 5: CALCULATE TIMES
        // ==========================================

        const travelTimeMinutes = Math.round(
            trafficSummary.travelTimeInSeconds / 60
        );

        const freeFlowTimeMinutes = Math.round(
            freeFlowSummary.travelTimeInSeconds / 60
        );

        const trafficDelayMinutes = Math.max(
            0,
            travelTimeMinutes - freeFlowTimeMinutes
        );


        // ==========================================
        // STEP 6: SEND RESULT
        // ==========================================

        res.json({

            success: true,

            from: {
                name: from,
                latitude: fromLocation.latitude,
                longitude: fromLocation.longitude
            },

            to: {
                name: to,
                latitude: toLocation.latitude,
                longitude: toLocation.longitude
            },

            route: {

                distanceKm: Number(
                    (
                        trafficSummary.lengthInMeters / 1000
                    ).toFixed(1)
                ),

                travelTimeMinutes,

                freeFlowTimeMinutes,

                trafficDelayMinutes,

                points: routePoints

            }

        });


    } catch (error) {

        console.error(
            "Route calculation failed:",
            error.response?.data || error.message
        );

        res.status(500).json({
            success: false,
            error: "Failed to calculate route"
        });

    }

});

app.get("/api/traffic/latest", async (req, res) => {
    try {

        const trafficData = await Traffic.find()
            .sort({ timestamp: -1 })
            .limit(50);

        res.json({
            success: true,
            count: trafficData.length,
            traffic: trafficData
        });

    } catch (error) {

        console.error("Failed to fetch traffic data:", error.message);

        res.status(500).json({
            success: false,
            error: "Failed to fetch traffic data"
        });
    }
});

// ==========================================
// GET TRAFFIC HISTORY
// ==========================================

app.get("/api/traffic/history", async (req, res) => {
    try {

        const { location, limit = 200 } = req.query;

        const query = location
            ? { locationName: location }
            : {};

        const trafficData = await Traffic.find(query)
            .sort({ timestamp: 1 })
            .limit(Number(limit));

        res.json({
            success: true,
            count: trafficData.length,
            traffic: trafficData
        });

    } catch (error) {

        console.error(
            "Failed to fetch traffic history:",
            error.message
        );

        res.status(500).json({
            success: false,
            error: "Failed to fetch traffic history"
        });
    }
});
// ==========================================
// AUTOMATIC TRAFFIC DATA COLLECTION
// ==========================================

// We only provide place names.
// TomTom will find the latitude and longitude.
const locationNames = ACTIVE_LOCATIONS.map(
    location => location.name
);

let locations = [];

// ------------------------------------------
// GET LAT/LON FROM PLACE NAME
// ------------------------------------------

async function getCoordinates(placeName) {
    const normalize = (value) => String(value || "")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const originalName = normalize(placeName);
    if (!originalName) return null;

    // Model location identifiers are often underscored; add NCR context
    // to improve TomTom's search precision without hardcoding coordinates.
    const queryCandidates = [
        `${originalName}, Delhi NCR, India`,
        `${originalName}, India`,
        originalName
    ];

    const normalizeTokens = (value) => normalize(value)
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .split(/\s+/)
        .filter(Boolean);

    const wanted = normalizeTokens(originalName);
    let best = null;
    let bestScore = -1;

    try {
        for (const query of [...new Set(queryCandidates)]) {
            const response = await axios.get(
                `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json`,
                {
                    params: {
                        key: process.env.TOMTOM_API_KEY,
                        limit: 10,
                        countrySet: "IN",
                        language: "en-US"
                    },
                    timeout: 15000
                }
            );

            const results = response.data?.results || [];
            for (const result of results) {
                const address = result.address || {};
                const fields = [
                    result.poi?.name,
                    address.freeformAddress,
                    address.municipality,
                    address.municipalitySubdivision,
                    address.streetName,
                    address.countrySubdivision
                ].filter(Boolean).join(" ");

                const candidateTokens = new Set(normalizeTokens(fields));
                const overlap = wanted.filter(token => candidateTokens.has(token)).length;
                const coverage = wanted.length ? overlap / wanted.length : 0;
                const poiName = normalizeTokens(result.poi?.name || "");
                const poiOverlap = wanted.filter(token => poiName.includes(token)).length;
                const poiCoverage = wanted.length ? poiOverlap / wanted.length : 0;
                const score = coverage * 0.65 + poiCoverage * 0.35;

                // Prefer results in Delhi / Haryana / Uttar Pradesh (NCR area).
                const region = normalize(`${address.countrySubdivision || ""} ${address.municipality || ""}`).toLowerCase();
                const ncrBonus = /delhi|haryana|uttar pradesh|noida|gurugram|ghaziabad|faridabad/.test(region) ? 0.08 : 0;
                const finalScore = Math.min(1, score + ncrBonus);

                if (result.position && finalScore > bestScore) {
                    bestScore = finalScore;
                    best = {
                        name: originalName,
                        latitude: result.position.lat,
                        longitude: result.position.lon,
                        resolvedName: address.freeformAddress || result.poi?.name || originalName,
                        confidence: Number(finalScore.toFixed(3))
                    };
                }
            }

            // Stop once a strong result is found; otherwise try the next query form.
            if (bestScore >= 0.78) break;
        }

        if (!best || bestScore < 0.45) {
            console.warn(`Could not confidently resolve location: ${originalName} (score: ${bestScore})`);
            return null;
        }

        return best;
    } catch (error) {
        console.error(
            `Failed to find coordinates for ${originalName}:`,
            error.response?.data || error.message
        );
        return null;
    }
}

// ------------------------------------------
// RESOLVE ALL LOCATIONS
// ------------------------------------------

async function initializeLocations() {

    console.log("Finding coordinates for locations...");

    locations = [];

    for (const placeName of locationNames) {

        const location = await getCoordinates(placeName);

        if (location) {

            locations.push(location);

            console.log(
                `${location.name} → ` +
                `${location.latitude}, ${location.longitude}`
            );
        }
    }

    console.log(
        `Successfully resolved ${locations.length}/${locationNames.length} locations.`
    );
}

// ------------------------------------------
// COLLECT TRAFFIC DATA
// ------------------------------------------

async function collectTrafficData() {

    console.log("Collecting traffic data...");

    for (const location of locations) {

        try {

            const response = await axios.get(
                "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json",
                {
                    params: {
                        point: `${location.latitude},${location.longitude}`,
                        unit: "KMPH",
                        key: process.env.TOMTOM_API_KEY
                    }
                }
            );

            const data = response.data.flowSegmentData;

            await Traffic.create({

                locationName: location.name,

                latitude: location.latitude,
                longitude: location.longitude,

                currentSpeed: data.currentSpeed,
                freeFlowSpeed: data.freeFlowSpeed,

                currentTravelTime: data.currentTravelTime,
                freeFlowTravelTime: data.freeFlowTravelTime,

                confidence: data.confidence,
                roadClosure: data.roadClosure
            });

            console.log(
                `Traffic data saved for ${location.name}:`,
                `Speed = ${data.currentSpeed} km/h`
            );

        } catch (error) {

            console.error(
                `Failed to collect traffic data for ${location.name}:`,
                error.message
            );
        }
    }
}

// ==========================================
// TIME SERIES TRAFFIC FORECAST
// ==========================================

app.get("/api/traffic/forecast", async (req, res) => {
    try {

        const {
            location,
            horizon = 4,
            model = "moving-average"
        } = req.query;

        if (!location) {
            return res.status(400).json({
                success: false,
                error: "Location is required"
            });
        }




        // Use saved ARIMA/SARIMA models when requested.
        if (["arima", "sarima", "xgboost"].includes(model.toLowerCase())) {
            const steps = Math.min(
                24,
                Math.max(1, Number(horizon) || 4)
            );

            try {
                const scriptPath = path.resolve(
                    __dirname,
                    "../ml/predict.py"
                );

                const pythonExecutable =
                    process.env.PYTHON_EXECUTABLE || "python3";

                const { stdout } = await execFileAsync(
                    pythonExecutable,
                    [
                        scriptPath,
                        "--location",
                        location,
                        "--model",
                        model.toLowerCase(),
                        "--steps",
                        String(steps)
                    ],
                    { timeout: 30000 }
                );

                
const result = JSON.parse(stdout);

let modelSelection = null;

if (model.toLowerCase() === "xgboost") {
    const selectionPath = path.resolve(
        __dirname,
        "../ml/xgboost_model_selection.json"
    );

    const selectionData = JSON.parse(
        await fs.readFile(selectionPath, "utf8")
    );

    modelSelection = selectionData[location] || null;
}

return res.json({
    success: true,
    ...result,
    modelSelection: modelSelection ? {
        selectedModel: modelSelection.selected_model,
        modelLabel:
            modelSelection.selected_model === "tuned"
                ? "Fine-tuned XGBoost"
                : "Baseline XGBoost",
        baselineMAE: modelSelection.baseline_mae,
        tunedMAE: modelSelection.tuned_mae,
        baselineRMSE: modelSelection.baseline_rmse,
        tunedRMSE: modelSelection.tuned_rmse
    } : null,
    intervalMinutes:
        model.toLowerCase() === "xgboost" ? 15 : null,
    note: model.toLowerCase() === "xgboost"
        ? "XGBoost forecasts use 15-minute future intervals."
        : "Forecast steps represent future observations, not guaranteed 15-minute intervals."
});

            } catch (error) {
                console.error(
                    "ARIMA/SARIMA forecast failed:",
                    error.stderr || error.message
                );

                return res.status(500).json({
                    success: false,
                    error: "Unable to generate the requested model forecast. Check model availability and Python dependencies."
                });
            }
        }

        // Get historical traffic records
        const history = await Traffic.find({
            locationName: location
        })
        .sort({ timestamp: -1 })
        .limit(60);

        if (history.length < 5) {
            return res.status(400).json({
                success: false,
                error: "Not enough historical data for forecasting"
            });
        }

        // Reverse so data is oldest → newest
        history.reverse();

        // Prepare time-series data
        const speeds = history.map(
            item => Number(item.currentSpeed)
        );

        const lastRecord = history[history.length - 1];

        const lastTimestamp = new Date(
            lastRecord.timestamp
        );

        // ------------------------------------------
        // WEIGHTED MOVING AVERAGE
        // ------------------------------------------

        // Give more importance to recent observations
        const recentCount = Math.min(12, speeds.length);

        const recentSpeeds = speeds.slice(
            -recentCount
        );

        let weightedSum = 0;
        let weightTotal = 0;

        recentSpeeds.forEach((speed, index) => {

            const weight = index + 1;

            weightedSum += speed * weight;

            weightTotal += weight;
        });

        let basePrediction =
            weightedSum / weightTotal;

        // ------------------------------------------
        // RECENT TREND
        // ------------------------------------------

        // Compare recent traffic with older traffic
        const previousWindow =
            speeds.slice(
                -(recentCount * 2),
                -recentCount
            );

        let trend = 0;

        if (previousWindow.length > 0) {

            const previousAverage =
                previousWindow.reduce(
                    (sum, value) => sum + value,
                    0
                ) / previousWindow.length;

            const recentAverage =
                recentSpeeds.reduce(
                    (sum, value) => sum + value,
                    0
                ) / recentSpeeds.length;

            trend =
                (recentAverage - previousAverage) /
                recentCount;
        }

        // ------------------------------------------
        // GENERATE FORECAST
        // ------------------------------------------

        const forecastCount =
            Math.min(Number(horizon), 12);

        const predictions = [];

        for (
            let i = 1;
            i <= forecastCount;
            i++
        ) {

            let predictedSpeed =
                basePrediction + trend * i;

            // Keep prediction realistic
            predictedSpeed = Math.max(
                5,
                Math.min(
                    predictedSpeed,
                    Number(lastRecord.freeFlowSpeed)
                )
            );

            const futureTime =
                new Date(lastTimestamp);

            futureTime.setMinutes(
                futureTime.getMinutes() + i * 5
            );

            predictions.push({
                timestamp: futureTime,

predictedSpeed: Number(
    predictedSpeed.toFixed(1)
)

});
}

// ------------------------------------------
// Send response
// ------------------------------------------

res.json({

    success: true,

    location: location,

    model: "Weighted Moving Average + Trend",

    intervalMinutes: 5,

    historical: history.map(item => ({
        timestamp: item.timestamp,
        speed: item.currentSpeed,
        freeFlowSpeed: item.freeFlowSpeed
    })),

    predictions

});

} catch (error) {

    console.error(
        "Forecast error:",
        error.message
    );

    res.status(500).json({
        success: false,
        error: "Failed to generate traffic forecast"
    });

}

});

// ==========================================
// TIME SERIES MODEL EVALUATION
// ==========================================


app.get("/api/traffic/evaluate", async (req, res) => {
    try {
        const { location } = req.query;
        const modelType = (req.query.model || "arima").toLowerCase();

        if (!location) {
            return res.status(400).json({
                success: false,
                error: "Location is required"
            });
        }

        if (!["arima", "sarima", "xgboost"].includes(modelType)) {
            return res.status(400).json({
                success: false,
                error: "Model must be arima, sarima or xgboost"
            });
        }

        const csvPath = path.resolve(
            __dirname,
            "../ml/evaluation_predictions.csv"
        );

        const csvText = await fs.readFile(csvPath, "utf8");
        const lines = csvText.trim().split(/\r?\n/);

        if (lines.length < 2) {
            return res.status(404).json({
                success: false,
                error: "Evaluation CSV contains no predictions"
            });
        }

        // Parse CSV while preserving commas inside quoted fields.
        function parseCsvLine(line) {
            const fields = [];
            let field = "";
            let quoted = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];

                if (char === '"') {
                    if (quoted && line[i + 1] === '"') {
                        field += '"';
                        i++;
                    } else {
                        quoted = !quoted;
                    }
                } else if (char === "," && !quoted) {
                    fields.push(field);
                    field = "";
                } else {
                    field += char;
                }
            }

            fields.push(field);
            return fields;
        }

        const headers = parseCsvLine(lines[0]).map(h => h.trim());

        const required = [
            "location",
            "model",
            "timestamp",
            "actualSpeed",
            "predictedSpeed",
            "absoluteError"
        ];

        const missing = required.filter(h => !headers.includes(h));

        if (missing.length) {
            return res.status(500).json({
                success: false,
                error: `CSV missing columns: ${missing.join(", ")}`
            });
        }

        const rows = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
                const values = parseCsvLine(line);
                return Object.fromEntries(
                    headers.map((header, index) => [
                        header,
                        values[index]
                    ])
                );
            });

        const modelRows = rows.filter(row => {
            const rowModel = row.model.toLowerCase();

            return row.location === location &&
                (
                    modelType === "arima"
                    ? rowModel.includes("arima") &&
                        !rowModel.includes("sarima")
                    : modelType === "sarima"
                        ? rowModel.includes("sarima")
                        : rowModel.trim() === "xgboost"
                );
        }).map(row => ({
            timestamp: row.timestamp,
            actual: Number(row.actualSpeed),
            predicted: Number(row.predictedSpeed),
            absoluteError: Number(row.absoluteError)
        })).filter(row =>
            Number.isFinite(row.actual) &&
            Number.isFinite(row.predicted) &&
            Number.isFinite(row.absoluteError) &&
            !Number.isNaN(Date.parse(row.timestamp))
        ).sort((a, b) =>
            new Date(a.timestamp) - new Date(b.timestamp)
        );

        if (modelRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No ${modelType.toUpperCase()} evaluation data found for ${location}`
            });
        }

        const count = modelRows.length;

        const mae = modelRows.reduce(
            (sum, row) => sum + Math.abs(row.actual - row.predicted),
            0
        ) / count;

        const rmse = Math.sqrt(
            modelRows.reduce(
                (sum, row) => sum + Math.pow(row.actual - row.predicted, 2),
                0
            ) / count
        );

        const nonZeroActual = modelRows.filter(row => row.actual !== 0);

        const mape = nonZeroActual.length
            ? nonZeroActual.reduce(
                (sum, row) =>
                    sum + Math.abs(
                        (row.actual - row.predicted) / row.actual
                    ),
                0
            ) / nonZeroActual.length * 100
            : null;

        res.json({
            success: true,
            location,
            model: modelType.toUpperCase(),
            testingSamples: count,
            metrics: {
                MAE: Number(mae.toFixed(3)),
                RMSE: Number(rmse.toFixed(3)),
                MAPE: mape === null ? null : Number(mape.toFixed(2))
            },
            comparison: modelRows
        });

    } catch (error) {
        console.error("Model evaluation error:", error.message);

        res.status(500).json({
            success: false,
            error: "Failed to load model evaluation data"
        });
    }
});


// ==========================================
// TRAINED MODEL LOCATIONS (from predict.py)
// ==========================================

// ==========================================
// FIXED NCR MODEL LOCATIONS
// ==========================================

app.get("/api/traffic/model-locations", (req, res) => {
    res.json({
        success: true,
        locations: ACTIVE_LOCATIONS
    });
});

// ==========================================
// MONGODB CONNECTION
// ==========================================

mongoose.connect(process.env.MONGO_URI)

    .then(async () => {

        console.log(
            "MongoDB connected successfully!"
        );

        // STEP 1: Resolve location coordinates
        await initializeLocations();

        // STEP 2: Collect traffic data
        await collectTrafficData();

        // STEP 3: Repeat traffic collection
        setInterval(
            collectTrafficData,
            15 * 60 * 1000
        );

        // STEP 4: Start server
        app.listen(PORT, () => {
            console.log(
                `Server running on http://localhost:${PORT}`
            );
        });

    })

    .catch((error) => {

        console.error(
            "MongoDB connection failed:",
            error.message
        );

    });

// ==========================================
// HOME ROUTE
// ==========================================

app.get("/", (req, res) => {

    res.json({
        message: "Traffic Prediction Backend is running!"
    });

});