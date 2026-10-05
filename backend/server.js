
require("dotenv").config();

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
const locationNames = [
    "Connaught Place, Delhi",
    "India Gate, Delhi",
    "Lajpat Nagar, Delhi",
    "Saket, Delhi",
    "Dwarka, Delhi",
    "Rohini, Delhi"
];

let locations = [];

// ------------------------------------------
// GET LAT/LON FROM PLACE NAME
// ------------------------------------------

async function getCoordinates(placeName) {
    try {
        const response = await axios.get(
            "https://api.tomtom.com/search/2/search/" +
            encodeURIComponent(placeName) +
            ".json",
            {
                params: {
                    key: process.env.TOMTOM_API_KEY,
                    limit: 1,
                    countrySet: "IN"
                }
            }
        );

        const results = response.data.results;

        if (!results || results.length === 0) {
            throw new Error(`Location not found: ${placeName}`);
        }

        const result = results[0];

        return {
            name: placeName,
            latitude: result.position.lat,
            longitude: result.position.lon
        };

    } catch (error) {
        console.error(
            `Failed to find coordinates for ${placeName}:`,
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

        const { location, horizon = 12 } = req.query;

        if (!location) {
            return res.status(400).json({
                success: false,
                error: "Location is required"
            });
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

        // ------------------------------------------
        // Prepare time-series data
        // ------------------------------------------

      // ------------------------------------------
// Prepare time-series data
// ------------------------------------------

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

        if (!location) {
            return res.status(400).json({
                success: false,
                error: "Location is required"
            });
        }

        // ------------------------------------------
        // Get historical data
        // ------------------------------------------

        const history = await Traffic.find({
            locationName: location
        })
        .sort({ timestamp: 1 })
        .limit(100);

        if (history.length < 15) {
            return res.status(400).json({
                success: false,
                error: "Not enough historical data for evaluation"
            });
        }

        const speeds = history.map(
            item => Number(item.currentSpeed)
        );

        // ------------------------------------------
        // Train / Test split
        // ------------------------------------------

        const trainSize = Math.floor(
            speeds.length * 0.8
        );

        const trainData =
            speeds.slice(0, trainSize);

        const testData =
            speeds.slice(trainSize);

        // ------------------------------------------
        // Generate predictions
        // using Weighted Moving Average + Trend
        // ------------------------------------------

        const predictions = [];

        let workingData = [...trainData];

        for (let i = 0; i < testData.length; i++) {

            const recentCount =
                Math.min(12, workingData.length);

            const recentSpeeds =
                workingData.slice(-recentCount);

            // Weighted Moving Average

            let weightedSum = 0;
            let weightTotal = 0;

            recentSpeeds.forEach(
                (speed, index) => {

                    const weight = index + 1;

                    weightedSum +=
                        speed * weight;

                    weightTotal += weight;
                }
            );

            let basePrediction =
                weightedSum / weightTotal;

            // Recent trend

            const previousWindow =
                workingData.slice(
                    -(recentCount * 2),
                    -recentCount
                );

            let trend = 0;

            if (previousWindow.length > 0) {

                const previousAverage =
                    previousWindow.reduce(
                        (sum, value) =>
                            sum + value,
                        0
                    ) / previousWindow.length;

                const recentAverage =
                    recentSpeeds.reduce(
                        (sum, value) =>
                            sum + value,
                        0
                    ) / recentSpeeds.length;

                trend =
                    (recentAverage -
                        previousAverage) /
                    recentCount;
            }

            let predictedSpeed =
                basePrediction +
                trend;

            // Keep prediction realistic

            const maxSpeed =
                Number(
                    history[0].freeFlowSpeed
                );

            predictedSpeed = Math.max(
                5,
                Math.min(
                    predictedSpeed,
                    maxSpeed
                )
            );

            predictions.push(
                predictedSpeed
            );

            // Add actual value so the
            // next prediction can use
            // newly observed data

            workingData.push(
                testData[i]
            );
        }

        // ------------------------------------------
        // MAE
        // ------------------------------------------

        let absoluteError = 0;

        for (let i = 0; i < testData.length; i++) {

            absoluteError += Math.abs(
                testData[i] -
                predictions[i]
            );
        }

        const mae =
            absoluteError /
            testData.length;

        // ------------------------------------------
        // RMSE
        // ------------------------------------------

        let squaredError = 0;

        for (let i = 0; i < testData.length; i++) {

            const error =
                testData[i] -
                predictions[i];

            squaredError +=
                error * error;
        }

        const rmse =
            Math.sqrt(
                squaredError /
                testData.length
            );

        // ------------------------------------------
        // MAPE
        // ------------------------------------------

        let percentageError = 0;

        for (let i = 0; i < testData.length; i++) {

            if (testData[i] !== 0) {

                percentageError +=
                    Math.abs(
                        (testData[i] -
                            predictions[i]) /
                        testData[i]
                    );
            }
        }

        const mape =
            (percentageError /
                testData.length) * 100;

        // ------------------------------------------
        // Send result
        // ------------------------------------------

        res.json({

            success: true,

            location: location,

            model:
                "Weighted Moving Average + Trend",

            trainingSamples:
                trainData.length,

            testingSamples:
                testData.length,

            metrics: {

                MAE: Number(
                    mae.toFixed(2)
                ),

                RMSE: Number(
                    rmse.toFixed(2)
                ),

                MAPE: Number(
                    mape.toFixed(2)
                )

            },

            comparison:
                testData.map(
                    (actual, index) => ({
                        actual: actual,

                        predicted:
                            Number(
                                predictions[index]
                                    .toFixed(2)
                            )
                    })
                )

        });

    } catch (error) {

        console.error(
            "Model evaluation error:",
            error.message
        );

        res.status(500).json({

            success: false,

            error:
                "Failed to evaluate forecasting model"

        });

    }

});

// ===============================
// MONGODB CONNECTION
// ===============================

mongoose.connect(process.env.MONGO_URI)

    .then(async () => {

        console.log("MongoDB connected successfully!");

        // STEP 1:
        // Convert all place names into latitude/longitude
        await initializeLocations();

        // STEP 2:
        // Collect traffic data for all locations
        await collectTrafficData();

        // STEP 3:
        // Repeat every 5 minutes
        setInterval(collectTrafficData, 5 * 60 * 1000);

        // STEP 4:
        // Start server
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

    })

    .catch((error) => {

        console.error(
            "MongoDB connection failed:",
            error.message
        );

    });

// ===============================
// HOME ROUTE
// ===============================

app.get("/", (req, res) => {

    res.json({
        message: "Traffic Prediction Backend is running!"
    });

});