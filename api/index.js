// Final fixed API handler for Vercel
const express = require('express');
const cors = require('cors');

// Import Redis client with fixed configuration
const { getRedisClient } = require('../src/server/api/redis-client');
const { getSettings, saveSettings } = require('../src/server/api/settings');
const { getAllRecommendations } = require('../src/server/api/recommendations');
const { getProfile } = require('../src/server/api/profile');
const { getFeedings, updateFeeding, planFeedings } = require('../src/server/api/feedings');

/**
 * Redis keys used in the application
 */
const REDIS_KEYS = {
  PROFILE: "baby:profile",
  RECOMMENDATIONS: "baby:recommendations",
  SETTINGS: "baby:settings",
  PLANNED_FEEDINGS: "baby:plannedFeedings",
  ACTUAL_FEEDINGS: "baby:actualFeedings"
};

// Basic logging function
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}]`, message, JSON.stringify(data));
  } else {
    console.log(`[${timestamp}]`, message);
  }
}

// Create a simple Express API
const app = express();
app.use(cors());
app.use(express.json());

// Root API endpoint
app.get("/api", (req, res) => {
  res.json({ 
    status: "online",
    environment: process.env.NODE_ENV || "development",
    vercel: process.env.VERCEL ? "true" : "false",
    serverTime: new Date().toISOString(),
    message: "Baby Bottle Planner API is running - FIXED Version"
  });
});

// Redis connection check
app.get("/api/redis/check-connection", async (req, res) => {
  try {
    log("Checking Redis connection");
    const client = await getRedisClient();
    await client.ping();
    res.json({
      connected: true,
      message: "Successfully connected to Redis database",
      environment: process.env.NODE_ENV || "development",
      vercel: process.env.VERCEL ? "true" : "false",
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error("Redis connection error:", error);
    res.status(500).json({ 
      connected: false, 
      error: "Failed to connect to Redis",
      message: error instanceof Error ? error.message : "Unknown error",
      environment: process.env.NODE_ENV || "development",
      vercel: process.env.VERCEL ? "true" : "false",
      serverTime: new Date().toISOString()
    });
  }
});

// Home/health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Bottle Planner API is running - FIXED Version!",
    timestamp: new Date().toISOString()
  });
});

// Diagnostics endpoint
app.get("/api/diagnostics", async (req, res) => {
  try {
    // Get basic environment info
    const diagnosticInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      vercel: process.env.VERCEL ? "true" : "false",
      region: process.env.VERCEL_REGION || "unknown",
      nodeVersion: process.version,
      redisUrl: process.env.REDIS_URL ? 
        `${process.env.REDIS_URL.substring(0, 10)}...` : 
        "not set"
    };
    
    // Try to add Redis info if we can connect
    try {
      const client = await getRedisClient();
      await client.ping();
      diagnosticInfo.redisConnected = true;
      
      // Get some basic keys to verify functionality
      const keys = await client.keys('*');
      diagnosticInfo.redisKeys = keys.slice(0, 5); // First 5 keys
      diagnosticInfo.keyCount = keys.length;
    } catch (redisError) {
      diagnosticInfo.redisConnected = false;
      diagnosticInfo.redisError = redisError.message;
    }
    
    res.json(diagnosticInfo);
  } catch (error) {
    console.error("Error in diagnostics endpoint:", error);
    res.status(500).json({
      error: "Failed to gather diagnostics",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    });
  }
});

// Recommendations endpoint
app.get("/api/recommendations/get", async (req, res) => {
  try {
    log("Fetching recommendations");
    const recommendations = await getAllRecommendations();
    res.json({ success: true, recommendations });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recommendations",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Profile endpoint
app.get("/api/profile/get", async (req, res) => {
  try {
    log("Fetching profile");
    const profile = await getProfile();
    res.json({ success: true, profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Settings endpoints
app.get("/api/settings/get", async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    console.error("Error getting settings:", error);
    res.status(500).json({ 
      error: "Failed to get settings",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/api/settings/save", async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings) {
      res.status(400).json({ 
        success: false, 
        message: "No settings data provided in request body" 
      });
      return;
    }
    
    await saveSettings(settings);
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to save settings",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ 
    error: "Internal Server Error",
    message: err.message || "Unknown error"
  });
});

// Export the Express API
module.exports = app; 