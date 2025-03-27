// Final fixed API handler for Vercel
const express = require('express');
const cors = require('cors');

// Import Redis client directly from the API directory
const { getRedisClient } = require('./redis-client');

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

// Recommendations endpoint - minimal implementation 
app.get("/api/recommendations/get", async (req, res) => {
  try {
    log("Fetching recommendations");
    const client = await getRedisClient();
    const recommendationsData = await client.get(REDIS_KEYS.RECOMMENDATIONS);
    
    if (!recommendationsData) {
      // Return empty array if no data
      res.json({ success: true, recommendations: [] });
      return;
    }
    
    const recommendations = JSON.parse(recommendationsData);
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

// Profile endpoint - minimal implementation
app.get("/api/profile/get", async (req, res) => {
  try {
    log("Fetching profile");
    const client = await getRedisClient();
    const profileData = await client.get(REDIS_KEYS.PROFILE);
    
    if (!profileData) {
      // Return default profile if none exists
      const defaultProfile = {
        birthDate: "2025-03-20T00:00:00.000Z",
        ageInDays: 7
      };
      res.json({ success: true, profile: defaultProfile });
      return;
    }
    
    const profile = JSON.parse(profileData);
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

// Settings endpoints - minimal implementation
app.get("/api/settings/get", async (req, res) => {
  try {
    log("Fetching settings");
    const client = await getRedisClient();
    const settingsData = await client.get(REDIS_KEYS.SETTINGS);
    
    if (!settingsData) {
      // Return default settings if none exists
      const defaultSettings = {
        feedWindows: {
          min: 2,
          max: 3,
          ideal: 2.5,
        },
        feedAmounts: {
          min: 1.5,
          max: 2.5,
          target: 2,
        },
        useMetric: false
      };
      res.json(defaultSettings);
      return;
    }
    
    const settings = JSON.parse(settingsData);
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
    
    const client = await getRedisClient();
    await client.set(REDIS_KEYS.SETTINGS, JSON.stringify(settings));
    
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

// Replace the generic feedings endpoint with separate endpoints
app.get("/api/feedings/planned/get", async (req, res) => {
  try {
    log("Fetching planned feedings");
    const client = await getRedisClient();
    
    // Get planned feedings
    const plannedFeedingsData = await client.get(REDIS_KEYS.PLANNED_FEEDINGS);
    const plannedFeedings = plannedFeedingsData ? JSON.parse(plannedFeedingsData) : [];
    
    // Return in the expected format for the UI
    res.json({ success: true, feedings: { planned: plannedFeedings } });
  } catch (error) {
    console.error("Error getting planned feedings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get planned feedings",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/api/feedings/actual/get", async (req, res) => {
  try {
    log("Fetching actual feedings");
    const client = await getRedisClient();
    
    // Get actual feedings
    const actualFeedingsData = await client.get(REDIS_KEYS.ACTUAL_FEEDINGS);
    const actualFeedings = actualFeedingsData ? JSON.parse(actualFeedingsData) : [];
    
    // Return in the expected format for the UI
    res.json({ success: true, feedings: { actual: actualFeedings } });
  } catch (error) {
    console.error("Error getting actual feedings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get actual feedings",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/api/feedings/update", async (req, res) => {
  try {
    const { feedingId, isCompleted } = req.body;
    
    if (!feedingId) {
      res.status(400).json({ success: false, message: "feedingId is required" });
      return;
    }
    
    if (isCompleted === undefined) {
      res.status(400).json({ success: false, message: "isCompleted status is required" });
      return;
    }
    
    // Get existing planned feedings
    const client = await getRedisClient();
    const plannedFeedingsData = await client.get(REDIS_KEYS.PLANNED_FEEDINGS);
    
    if (!plannedFeedingsData) {
      res.status(404).json({ success: false, message: "No planned feedings found" });
      return;
    }
    
    // Parse and update the feeding
    const plannedFeedings = JSON.parse(plannedFeedingsData);
    const updatedFeedings = plannedFeedings.map(feeding => {
      if (feeding.id === feedingId) {
        return { ...feeding, isCompleted };
      }
      return feeding;
    });
    
    // Save updated feedings
    await client.set(REDIS_KEYS.PLANNED_FEEDINGS, JSON.stringify(updatedFeedings));
    
    // Return in the expected format for the UI
    res.json({ success: true, feedings: { planned: updatedFeedings } });
  } catch (error) {
    console.error("Error updating feeding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update feeding",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Add actual feeding endpoint
app.post("/api/feedings/actual/add", async (req, res) => {
  try {
    const { time, date, amount, notes } = req.body;
    
    if (!time) {
      res.status(400).json({ success: false, message: "time is required" });
      return;
    }
    
    if (!date) {
      res.status(400).json({ success: false, message: "date is required" });
      return;
    }
    
    if (amount === undefined) {
      res.status(400).json({ success: false, message: "amount is required" });
      return;
    }
    
    // Generate unique ID for new feeding
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    const client = await getRedisClient();
    const actualFeedingsStr = await client.get(REDIS_KEYS.ACTUAL_FEEDINGS);
    let actualFeedings = actualFeedingsStr ? JSON.parse(actualFeedingsStr) : [];
    
    const newFeeding = {
      id,
      time,
      date,
      amount,
      notes: notes || ""
    };
    
    actualFeedings.push(newFeeding);
    await client.set(REDIS_KEYS.ACTUAL_FEEDINGS, JSON.stringify(actualFeedings));
    
    res.json({ 
      success: true, 
      feedings: { actual: actualFeedings },
      message: "Actual feeding added successfully"
    });
  } catch (error) {
    console.error("Error adding actual feeding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add actual feeding",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Update actual feeding endpoint
app.post("/api/feedings/actual/update", async (req, res) => {
  try {
    const { id, time, date, amount, notes } = req.body;
    
    if (!id) {
      res.status(400).json({ success: false, message: "id is required" });
      return;
    }
    
    const client = await getRedisClient();
    const actualFeedingsStr = await client.get(REDIS_KEYS.ACTUAL_FEEDINGS);
    
    if (!actualFeedingsStr) {
      res.status(404).json({ success: false, message: "No actual feedings found" });
      return;
    }
    
    let actualFeedings = JSON.parse(actualFeedingsStr);
    
    // Find and update the feeding
    const updatedFeedings = actualFeedings.map(feeding => {
      if (feeding.id === id) {
        return {
          ...feeding,
          ...(time !== undefined && { time }),
          ...(date !== undefined && { date }),
          ...(amount !== undefined && { amount }),
          ...(notes !== undefined && { notes })
        };
      }
      return feeding;
    });
    
    await client.set(REDIS_KEYS.ACTUAL_FEEDINGS, JSON.stringify(updatedFeedings));
    
    res.json({ 
      success: true, 
      feedings: { actual: updatedFeedings },
      message: "Actual feeding updated successfully"
    });
  } catch (error) {
    console.error("Error updating actual feeding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update actual feeding",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Remove actual feeding endpoint
app.post("/api/feedings/actual/remove", async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      res.status(400).json({ success: false, message: "id is required" });
      return;
    }
    
    const client = await getRedisClient();
    const actualFeedingsStr = await client.get(REDIS_KEYS.ACTUAL_FEEDINGS);
    
    if (!actualFeedingsStr) {
      res.status(404).json({ success: false, message: "No actual feedings found" });
      return;
    }
    
    let actualFeedings = JSON.parse(actualFeedingsStr);
    
    // Filter out the feeding to remove
    const updatedFeedings = actualFeedings.filter(feeding => feeding.id !== id);
    
    await client.set(REDIS_KEYS.ACTUAL_FEEDINGS, JSON.stringify(updatedFeedings));
    
    res.json({ 
      success: true, 
      feedings: { actual: updatedFeedings },
      message: "Actual feeding removed successfully"
    });
  } catch (error) {
    console.error("Error removing actual feeding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove actual feeding",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Plan feedings endpoint
app.post("/api/feedings/plan", async (req, res) => {
  try {
    log("Planning new feeding schedule");
    const client = await getRedisClient();
    
    // Get settings to use for planning
    const settingsData = await client.get(REDIS_KEYS.SETTINGS);
    const settings = settingsData ? JSON.parse(settingsData) : {
      feedWindows: { min: 2, max: 3, ideal: 2.5 },
      feedAmounts: { min: 1.5, max: 2.5, target: 2 },
      useMetric: false,
      lockedFeedings: { enabled: true, times: ["08:00", "12:00", "16:00", "20:00"] }
    };
    
    // Create a basic feeding plan based on settings
    const feedingPlan = [];
    const { feedAmounts, lockedFeedings } = settings;
    
    // Add locked feedings if enabled
    if (lockedFeedings && lockedFeedings.enabled && lockedFeedings.times) {
      lockedFeedings.times.forEach((time, index) => {
        feedingPlan.push({
          id: `feed-${index + 1}`,
          time,
          amount: feedAmounts.target || 2,
          isLocked: true,
          isCompleted: false
        });
      });
    } else {
      // If no locked feedings, create a default 8 feeding schedule
      const startHour = 6; // Start at 6 AM
      const feedingInterval = 3; // Every 3 hours
      
      for (let i = 0; i < 8; i++) {
        const hour = (startHour + (i * feedingInterval)) % 24;
        const hourFormatted = hour.toString().padStart(2, '0');
        
        feedingPlan.push({
          id: `feed-${i + 1}`,
          time: `${hourFormatted}:00`,
          amount: feedAmounts.target || 2,
          isLocked: false,
          isCompleted: false
        });
      }
    }
    
    // Sort the feeding plan by time
    feedingPlan.sort((a, b) => {
      const timeA = parseInt(a.time.replace(':', ''));
      const timeB = parseInt(b.time.replace(':', ''));
      return timeA - timeB;
    });
    
    // Save the new plan
    await client.set(REDIS_KEYS.PLANNED_FEEDINGS, JSON.stringify(feedingPlan));
    
    res.json({ 
      success: true, 
      feedings: { planned: feedingPlan },
      message: "New feeding plan generated successfully"
    });
  } catch (error) {
    console.error("Error planning feedings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to plan feedings",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Add backward compatibility for the original endpoints
// This is needed because the frontend is still using these paths
app.get("/api/feedings/get", async (req, res) => {
  try {
    log("Using legacy endpoint: /api/feedings/get");
    const client = await getRedisClient();
    
    // Get planned feedings
    const plannedFeedingsData = await client.get(REDIS_KEYS.PLANNED_FEEDINGS);
    const plannedFeedings = plannedFeedingsData ? JSON.parse(plannedFeedingsData) : [];
    
    // Get actual feedings
    const actualFeedingsData = await client.get(REDIS_KEYS.ACTUAL_FEEDINGS);
    const actualFeedings = actualFeedingsData ? JSON.parse(actualFeedingsData) : [];
    
    // Return both in the expected format
    res.json({ 
      success: true, 
      feedings: {
        planned: plannedFeedings,
        actual: actualFeedings
      } 
    });
  } catch (error) {
    console.error("Error getting feedings from legacy endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get feedings",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/api/actual-feedings/get", async (req, res) => {
  try {
    log("Using legacy endpoint: /api/actual-feedings/get");
    const client = await getRedisClient();
    
    // Get actual feedings
    const actualFeedingsData = await client.get(REDIS_KEYS.ACTUAL_FEEDINGS);
    const actualFeedings = actualFeedingsData ? JSON.parse(actualFeedingsData) : [];
    
    res.json({ success: true, actualFeedings });
  } catch (error) {
    console.error("Error getting actual feedings from legacy endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get actual feedings",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Backward compatibility for actual feeding management endpoints
app.post("/api/actual-feedings/add", async (req, res) => {
  try {
    log("Using legacy endpoint: /api/actual-feedings/add");
    const { time, date, amount, notes } = req.body;
    
    if (!time) {
      res.status(400).json({ success: false, message: "time is required" });
      return;
    }
    
    if (!date) {
      res.status(400).json({ success: false, message: "date is required" });
      return;
    }
    
    if (amount === undefined) {
      res.status(400).json({ success: false, message: "amount is required" });
      return;
    }
    
    // Generate unique ID for new feeding
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    const client = await getRedisClient();
    const actualFeedingsStr = await client.get(REDIS_KEYS.ACTUAL_FEEDINGS);
    let actualFeedings = actualFeedingsStr ? JSON.parse(actualFeedingsStr) : [];
    
    const newFeeding = {
      id,
      time,
      date,
      amount,
      notes: notes || ""
    };
    
    actualFeedings.push(newFeeding);
    await client.set(REDIS_KEYS.ACTUAL_FEEDINGS, JSON.stringify(actualFeedings));
    
    res.json({ 
      success: true, 
      actualFeedings,
      message: "Actual feeding added successfully"
    });
  } catch (error) {
    console.error("Error adding actual feeding from legacy endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add actual feeding",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/api/actual-feedings/update", async (req, res) => {
  try {
    log("Using legacy endpoint: /api/actual-feedings/update");
    const { id, time, date, amount, notes } = req.body;
    
    if (!id) {
      res.status(400).json({ success: false, message: "id is required" });
      return;
    }
    
    const client = await getRedisClient();
    const actualFeedingsStr = await client.get(REDIS_KEYS.ACTUAL_FEEDINGS);
    
    if (!actualFeedingsStr) {
      res.status(404).json({ success: false, message: "No actual feedings found" });
      return;
    }
    
    let actualFeedings = JSON.parse(actualFeedingsStr);
    
    // Find and update the feeding
    const updatedFeedings = actualFeedings.map(feeding => {
      if (feeding.id === id) {
        return {
          ...feeding,
          ...(time !== undefined && { time }),
          ...(date !== undefined && { date }),
          ...(amount !== undefined && { amount }),
          ...(notes !== undefined && { notes })
        };
      }
      return feeding;
    });
    
    await client.set(REDIS_KEYS.ACTUAL_FEEDINGS, JSON.stringify(updatedFeedings));
    
    res.json({ 
      success: true, 
      actualFeedings: updatedFeedings,
      message: "Actual feeding updated successfully"
    });
  } catch (error) {
    console.error("Error updating actual feeding from legacy endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update actual feeding",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/api/actual-feedings/remove", async (req, res) => {
  try {
    log("Using legacy endpoint: /api/actual-feedings/remove");
    const { id } = req.body;
    
    if (!id) {
      res.status(400).json({ success: false, message: "id is required" });
      return;
    }
    
    const client = await getRedisClient();
    const actualFeedingsStr = await client.get(REDIS_KEYS.ACTUAL_FEEDINGS);
    
    if (!actualFeedingsStr) {
      res.status(404).json({ success: false, message: "No actual feedings found" });
      return;
    }
    
    let actualFeedings = JSON.parse(actualFeedingsStr);
    
    // Filter out the feeding to remove
    const updatedFeedings = actualFeedings.filter(feeding => feeding.id !== id);
    
    await client.set(REDIS_KEYS.ACTUAL_FEEDINGS, JSON.stringify(updatedFeedings));
    
    res.json({ 
      success: true, 
      actualFeedings: updatedFeedings,
      message: "Actual feeding removed successfully"
    });
  } catch (error) {
    console.error("Error removing actual feeding from legacy endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove actual feeding",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get recent feedings for preview (most recent 3)
app.get("/api/feedings/recent", async (req, res) => {
  try {
    // Get limit parameter from query, default to 3
    const limit = parseInt(req.query.limit) || 3;
    
    log(`Fetching ${limit} recent feedings for preview`);
    const client = await getRedisClient();
    
    // Get actual feedings
    const actualFeedingsData = await client.get(REDIS_KEYS.ACTUAL_FEEDINGS);
    const allActualFeedings = actualFeedingsData ? JSON.parse(actualFeedingsData) : [];
    
    // Sort by date and time (most recent first)
    const sortedFeedings = allActualFeedings.sort((a, b) => {
      // Create date objects based on the available fields
      let dateA, dateB;
      
      try {
        // Handle different time formats that might be in the data
        if (a.date) {
          // Try to parse with actualTime or time
          const timeA = a.actualTime || a.time || "00:00";
          // Remove any timezone info from time string if present
          const cleanTimeA = timeA.replace(/ [A-Z]{3}$/, "");
          dateA = new Date(a.date + "T" + cleanTimeA);
        } else {
          // Fallback to current date
          dateA = new Date();
        }
        
        if (b.date) {
          // Try to parse with actualTime or time
          const timeB = b.actualTime || b.time || "00:00";
          // Remove any timezone info from time string if present
          const cleanTimeB = timeB.replace(/ [A-Z]{3}$/, "");
          dateB = new Date(b.date + "T" + cleanTimeB);
        } else {
          // Fallback to current date
          dateB = new Date();
        }
      } catch (e) {
        // If date parsing fails, use timestamps or current time
        dateA = a.timestamp ? new Date(a.timestamp) : new Date();
        dateB = b.timestamp ? new Date(b.timestamp) : new Date();
      }
      
      // Sort newer dates first
      return dateB - dateA;
    });
    
    // Get the most recent feedings based on the limit
    const recentFeedings = sortedFeedings.slice(0, limit);
    
    // Enhance with display-ready information
    const enhancedRecentFeedings = recentFeedings.map(feeding => {
      // Calculate time ago for display
      let timeAgo = "";
      try {
        const feedingTime = new Date(feeding.date + "T" + (feeding.actualTime || feeding.time || "00:00").replace(/ [A-Z]{3}$/, ""));
        const now = new Date();
        const diffMs = now - feedingTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 0) {
          timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
          timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMins > 0) {
          timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        } else {
          timeAgo = 'Just now';
        }
      } catch (e) {
        timeAgo = "Recently";
      }
      
      // Format the amount with units
      let formattedAmount = "";
      if (feeding.amount || feeding.Amount) {
        const amount = feeding.amount || feeding.Amount;
        // Check if amount already has units
        if (typeof amount === 'string' && (amount.includes('oz') || amount.includes('ml'))) {
          formattedAmount = amount;
        } else {
          // Add default unit (oz)
          formattedAmount = `${amount} oz`;
        }
      }
      
      return {
        ...feeding,
        displayTime: feeding.actualTime || feeding.time || "",
        displayDate: feeding.date || "",
        displayAmount: formattedAmount,
        timeAgo
      };
    });
    
    res.json({ 
      success: true, 
      recentFeedings: enhancedRecentFeedings 
    });
  } catch (error) {
    console.error("Error getting recent feedings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get recent feedings",
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