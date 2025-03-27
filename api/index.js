// Minimal API handler with Redis for Vercel
const express = require('express');
const cors = require('cors');
const redis = require('redis');

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
    message: "Baby Bottle Planner API is running - Redis Test Version"
  });
});

// Redis connection test endpoint
app.get("/api/redis/test", async (req, res) => {
  try {
    log("Testing Redis connection");
    
    // Create a minimal Redis client for testing
    const redisURL = process.env.REDIS_URL;
    if (!redisURL) {
      throw new Error("REDIS_URL environment variable is not defined");
    }
    
    log("Creating Redis client", { urlPrefix: redisURL.substring(0, 10) + '...' });
    
    const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL;
    
    // Simple Redis client with minimal configuration
    const client = redis.createClient({
      url: redisURL,
      socket: {
        tls: redisURL.startsWith('rediss://') || isProd,
        connectTimeout: 5000,
      }
    });
    
    // Add very minimal error handling
    client.on("error", (err) => {
      log("Redis client error", { message: err.message });
    });
    
    // Connect with basic error handling
    log("Connecting to Redis");
    await client.connect();
    log("Redis client connected");
    
    // Test with a ping
    log("Testing with PING");
    await client.ping();
    log("PING successful");
    
    // Close the connection
    await client.disconnect();
    log("Redis connection closed");
    
    res.json({ 
      success: true,
      message: "Redis connection test successful",
      environment: process.env.NODE_ENV || "development",
      vercel: process.env.VERCEL ? "true" : "false",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Redis test error:", error);
    res.status(500).json({
      success: false,
      message: "Redis connection test failed",
      error: error.message,
      environment: process.env.NODE_ENV || "development",
      vercel: process.env.VERCEL ? "true" : "false",
      timestamp: new Date().toISOString()
    });
  }
});

// Home/health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Bottle Planner API is running - Minimal version!",
    timestamp: new Date().toISOString()
  });
});

// Diagnostics endpoint
app.get("/api/diagnostics", (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    vercel: process.env.VERCEL ? "true" : "false",
    region: process.env.VERCEL_REGION || "unknown",
    nodeVersion: process.version,
    message: "Redis test version of the API for diagnostic purposes",
    redisURL: process.env.REDIS_URL ? 
      `${process.env.REDIS_URL.substring(0, 10)}...` : 
      "not set"
  });
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