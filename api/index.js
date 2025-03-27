// Minimal API handler for Vercel
const express = require('express');
const cors = require('cors');

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
    message: "Baby Bottle Planner API is running - Minimal version"
  });
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
    message: "This is a minimal version of the API for diagnostic purposes"
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