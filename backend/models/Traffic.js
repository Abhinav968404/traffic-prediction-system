const mongoose = require("mongoose");

const trafficSchema = new mongoose.Schema({

    locationName: {
        type: String,
        required: true
    },

    latitude: {
        type: Number,
        required: true
    },

    longitude: {
        type: Number,
        required: true
    },

    currentSpeed: {
        type: Number,
        required: true
    },

    freeFlowSpeed: {
        type: Number,
        required: true
    },

    currentTravelTime: {
        type: Number,
        required: true
    },

    freeFlowTravelTime: {
        type: Number,
        required: true
    },

    confidence: {
        type: Number
    },

    roadClosure: {
        type: Boolean
    },

    timestamp: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("Traffic", trafficSchema);