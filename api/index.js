// Serverless function for Vercel
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getRedisClient, closeRedisConnection } = require('../src/server/api/redis-client');
const { getSettings, saveSettings } = require('../src/server/api/settings');
const { getAllRecommendations } = require('../src/server/api/recommendations');
const { getProfile } = require('../src/server/api/profile');
const { getFeedings, updateFeeding, planFeedings } = require('../src/server/api/feedings');

// Create and configure Express app
const app = express();
app.use(cors());
app.use(express.json());

// Type for error handling
class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

// Redis connection check
app.get("/api/redis/check-connection", async (req, res) => {
  try {
    const client = await getRedisClient();
    res.json({ connected: true });
  } catch (error) {
    console.error("Redis connection error:", error);
    res.status(500).json({ connected: false, error: "Failed to connect to Redis" });
  }
});

// Settings endpoints
app.get("/api/settings/get", async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    console.error("Error getting settings:", error);
    res.status(500).json({ error: "Failed to get settings" });
  }
});

app.post("/api/settings/save", async (req, res) => {
  try {
    const { settings } = req.body;
    await saveSettings(settings);
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    res.status(500).json({ success: false, message: "Failed to save settings" });
  }
});

// Feedings endpoints
app.get("/api/feedings/get", async (req, res) => {
  try {
    const feedings = await getFeedings();
    res.json({ success: true, feedings });
  } catch (error) {
    console.error("Error getting feedings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get feedings",
    });
  }
});

app.post("/api/feedings/update", async (req, res) => {
  try {
    const { feedingId, isCompleted } = req.body;
    await updateFeeding(feedingId, isCompleted);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating feeding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update feeding",
    });
  }
});

app.post("/api/feedings/plan", async (req, res) => {
  try {
    console.log("Planning feedings with AI...");
    const feedings = await planFeedings();
    res.json({ success: true, feedings });
  } catch (error) {
    console.error("Error planning feedings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to plan feedings",
    });
  }
});

// API Routes
app.get("/api/recommendations/get", async (req, res) => {
  try {
    console.log("Fetching recommendations from Redis...");
    const recommendations = await getAllRecommendations();
    res.json({ success: true, recommendations });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recommendations",
    });
  }
});

app.get("/api/profile/get", async (req, res) => {
  try {
    console.log("Fetching profile from Redis...");
    const profile = await getProfile();
    res.json({ success: true, profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ 
    error: err.message || "Internal Server Error"
  });
});

// Export the Express app as a serverless function
module.exports = app; 