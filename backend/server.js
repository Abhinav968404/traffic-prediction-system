
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const Traffic = require("./models/Traffic");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());


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
// ===============================
// MONGODB CONNECTION
// ===============================

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