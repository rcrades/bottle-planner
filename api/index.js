// Serverless function for Vercel
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getRedisClient } = require('../src/server/api/redis-client');
const { getSettings, saveSettings } = require('../src/server/api/settings');
const { getAllRecommendations } = require('../src/server/api/recommendations');
const { getProfile } = require('../src/server/api/profile');
const { getFeedings, updateFeeding, planFeedings } = require('../src/server/api/feedings');

/**
 * Redis keys used in the application
 * Defined here to ensure consistency throughout the code
 */
const REDIS_KEYS = {
  PROFILE: "baby:profile",
  RECOMMENDATIONS: "baby:recommendations",
  SETTINGS: "baby:settings",
  PLANNED_FEEDINGS: "baby:plannedFeedings",
  ACTUAL_FEEDINGS: "baby:actualFeedings"
};

/**
 * Initializes Redis with required data if it doesn't exist
 * Returns true if successful, false otherwise
 */
const initDataIfNeeded = async () => {
  console.log("Checking if Redis data needs initialization...");
  
  try {
    const client = await getRedisClient();
    let dataInitialized = true;
    
    // Check if profile exists, if not create it
    const existingProfile = await client.get(REDIS_KEYS.PROFILE);
    if (!existingProfile) {
      console.log("Creating initial profile data...");
      const defaultProfile = {
        birthDate: "2025-03-20T00:00:00.000Z",
        ageInDays: 7,
        currentRecommendation: {
          date: "2025-03-26",
          ageInDays: 7,
          feedingFrequency: { minHours: 2, maxHours: 3 },
          amountPerFeeding: { minOz: 2, maxOz: 2, minMl: 60, maxMl: 60 },
          dailyIntake: { minOz: 18, maxOz: 20, minMl: 540, maxMl: 600 }
        }
      };
      await client.set(REDIS_KEYS.PROFILE, JSON.stringify(defaultProfile));
      dataInitialized = false;
      console.log("✅ Profile data initialized");
    }
    
    // Check if recommendations exist, if not create them
    const existingRecommendations = await client.get(REDIS_KEYS.RECOMMENDATIONS);
    if (!existingRecommendations) {
      console.log("Creating initial recommendations data...");
      const defaultRecommendations = [
        {
          date: "2025-03-24",
          ageInDays: 5,
          feedingFrequency: { minHours: 2, maxHours: 3 },
          amountPerFeeding: { minOz: 1.5, maxOz: 2, minMl: 45, maxMl: 60 },
          dailyIntake: { minOz: 16, maxOz: 20, minMl: 480, maxMl: 600 }
        },
        {
          date: "2025-03-25",
          ageInDays: 6,
          feedingFrequency: { minHours: 2, maxHours: 3 },
          amountPerFeeding: { minOz: 1.5, maxOz: 2, minMl: 45, maxMl: 60 },
          dailyIntake: { minOz: 16, maxOz: 20, minMl: 480, maxMl: 600 }
        },
        {
          date: "2025-03-26",
          ageInDays: 7,
          feedingFrequency: { minHours: 2, maxHours: 3 },
          amountPerFeeding: { minOz: 2, maxOz: 2, minMl: 60, maxMl: 60 },
          dailyIntake: { minOz: 18, maxOz: 20, minMl: 540, maxMl: 600 }
        }
      ];
      await client.set(REDIS_KEYS.RECOMMENDATIONS, JSON.stringify(defaultRecommendations));
      dataInitialized = false;
      console.log("✅ Recommendations data initialized");
    }
    
    // Check if settings exist, if not create them
    const existingSettings = await client.get(REDIS_KEYS.SETTINGS);
    if (!existingSettings) {
      console.log("Creating initial settings data...");
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
        useMetric: false,
        lockedFeedings: {
          enabled: true,
          times: ["22:00", "00:30", "03:00", "05:30", "08:00"],
        }
      };
      await client.set(REDIS_KEYS.SETTINGS, JSON.stringify(defaultSettings));
      dataInitialized = false;
      console.log("✅ Settings data initialized");
    }
    
    // Check if planned feedings exist, if not create initial feeding plan
    const existingPlannedFeedings = await client.get(REDIS_KEYS.PLANNED_FEEDINGS);
    if (!existingPlannedFeedings) {
      console.log("Creating initial planned feedings data...");
      const defaultFeedings = [
        {
          id: "feed-1",
          time: "08:00",
          amount: 2,
          isLocked: true,
          isCompleted: false
        },
        {
          id: "feed-2",
          time: "10:30",
          amount: 2,
          isLocked: false,
          isCompleted: false
        },
        {
          id: "feed-3",
          time: "13:00",
          amount: 2,
          isLocked: false,
          isCompleted: false
        },
        {
          id: "feed-4",
          time: "15:30",
          amount: 2,
          isLocked: false,
          isCompleted: false
        },
        {
          id: "feed-5",
          time: "18:00",
          amount: 2,
          isLocked: false,
          isCompleted: false
        }
      ];
      await client.set(REDIS_KEYS.PLANNED_FEEDINGS, JSON.stringify(defaultFeedings));
      dataInitialized = false;
      console.log("✅ Planned feedings data initialized");
    }
    
    // Check if actual feedings exist, if not create them
    const existingActualFeedings = await client.get(REDIS_KEYS.ACTUAL_FEEDINGS);
    if (!existingActualFeedings) {
      console.log("Creating initial actual feedings data...");
      const initialActualFeedings = [
        {
          id: "actual-1",
          date: "2025-03-24",
          time: "08:15",
          amount: 1.8,
          notes: "Baby seemed hungry but didn't finish bottle"
        },
        {
          id: "actual-2",
          date: "2025-03-24",
          time: "11:00",
          amount: 2.2,
          notes: "Finished entire bottle quickly"
        },
        {
          id: "actual-3",
          date: "2025-03-24",
          time: "14:30",
          amount: 2.0,
          notes: ""
        },
        {
          id: "actual-4",
          date: "2025-03-25",
          time: "09:00",
          amount: 2.1,
          notes: "Seemed very hungry"
        },
        {
          id: "actual-5",
          date: "2025-03-25",
          time: "13:15",
          amount: 1.5,
          notes: "Was distracted during feeding"
        }
      ];
      await client.set(REDIS_KEYS.ACTUAL_FEEDINGS, JSON.stringify(initialActualFeedings));
      dataInitialized = false;
      console.log("✅ Actual feedings data initialized");
    }
    
    if (dataInitialized) {
      console.log("✅ All Redis data is already initialized");
    } else {
      console.log("✅ Successfully initialized missing Redis data");
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error initializing data:", error);
    return false;
  }
};

// Create and configure Express app
const app = express();
app.use(cors());
app.use(express.json());

// Try to initialize data on startup (but don't block for serverless)
initDataIfNeeded().catch(err => {
  console.error("⚠️ Warning: Data initialization error:", err);
  console.log("API will continue, but some endpoints may fail if data is missing");
});

// Redis connection check
app.get("/api/redis/check-connection", async (req, res) => {
  try {
    const client = await getRedisClient();
    await client.ping();
    res.json({ 
      connected: true,
      message: "Successfully connected to Redis database"
    });
  } catch (error) {
    console.error("Redis connection error:", error);
    res.status(500).json({ 
      connected: false, 
      error: "Failed to connect to Redis",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Redis data initialization endpoint
app.post("/api/redis/initialize-data", async (req, res) => {
  console.log("Received request to initialize Redis data...");
  
  try {
    // Try to initialize all required data
    const success = await initDataIfNeeded();
    
    if (success) {
      console.log("✅ Redis data initialization was successful");
      res.json({
        success: true,
        message: "Redis data initialized successfully"
      });
    } else {
      console.error("❌ Redis data initialization failed");
      res.status(500).json({
        success: false,
        message: "Failed to initialize Redis data"
      });
    }
  } catch (error) {
    console.error("❌ Error while initializing Redis data:", error);
    res.status(500).json({
      success: false,
      message: "Error initializing Redis data",
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
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/api/feedings/update", async (req, res) => {
  try {
    const { feedingId, isCompleted } = req.body;
    
    if (!feedingId) {
      res.status(400).json({ 
        success: false, 
        message: "feedingId is required" 
      });
      return;
    }
    
    if (isCompleted === undefined) {
      res.status(400).json({ 
        success: false, 
        message: "isCompleted status is required" 
      });
      return;
    }
    
    await updateFeeding(feedingId, isCompleted);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating feeding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update feeding",
      error: error instanceof Error ? error.message : "Unknown error"
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
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Recommendations endpoint with improved error handling
app.get("/api/recommendations/get", async (req, res) => {
  try {
    console.log("Fetching recommendations from Redis...");
    
    // Add a timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Redis operation timed out")), 5000);
    });
    
    // Try to get recommendations with a timeout
    const recommendationsPromise = getAllRecommendations();
    const recommendations = await Promise.race([recommendationsPromise, timeoutPromise]);
    
    // Check if we got data
    if (!recommendations || recommendations.length === 0) {
      console.log("No recommendations found in database");
      res.status(404).json({
        success: false,
        message: "No recommendations found in database"
      });
      return;
    }
    
    console.log("Successfully fetched recommendations");
    res.json({ success: true, recommendations });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    
    // Always return a valid JSON response, even on severe errors
    res.status(500).json({
      success: false,
      message: "Failed to fetch recommendations",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Profile endpoint with improved error handling
app.get("/api/profile/get", async (req, res) => {
  try {
    console.log("Fetching profile from Redis...");
    
    // Add a timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Redis operation timed out")), 5000);
    });
    
    // Try to get profile with a timeout
    const profilePromise = getProfile();
    const profile = await Promise.race([profilePromise, timeoutPromise]);
    
    if (!profile) {
      console.log("Profile not found in database");
      res.status(404).json({
        success: false,
        message: "Profile not found in database"
      });
      return;
    }
    
    console.log("Successfully fetched profile");
    res.json({ success: true, profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    
    // Always return a valid JSON response, even on severe errors
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get actual feedings endpoint
app.get("/api/actual-feedings/get", async (req, res) => {
  try {
    console.log("Fetching actual feedings from Redis...");
    const client = await getRedisClient();
    const actualFeedings = await client.get(REDIS_KEYS.ACTUAL_FEEDINGS);
    
    if (!actualFeedings) {
      console.log("No actual feedings found in database");
      res.json({ success: true, actualFeedings: [] });
      return;
    }
    
    const parsedFeedings = JSON.parse(actualFeedings);
    console.log(`Successfully fetched ${parsedFeedings.length} actual feedings`);
    res.json({ success: true, actualFeedings: parsedFeedings });
  } catch (error) {
    console.error("Error fetching actual feedings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch actual feedings",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Add actual feeding endpoint
app.post("/api/actual-feedings/add", async (req, res) => {
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
      actualFeedings,
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
app.post("/api/actual-feedings/update", async (req, res) => {
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
      actualFeedings: updatedFeedings,
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
app.post("/api/actual-feedings/remove", async (req, res) => {
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
      actualFeedings: updatedFeedings,
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

// Root path handler with API information and status
app.get("/", (req, res) => {
  res.json({
    message: "Baby Bottle Planner API",
    status: "Running",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "production",
    endpoints: [
      "/api/redis/check-connection",
      "/api/settings/get",
      "/api/settings/save",
      "/api/recommendations/get",
      "/api/profile/get",
      "/api/feedings/get",
      "/api/feedings/plan",
      "/api/feedings/update",
      "/api/actual-feedings/get",
      "/api/actual-feedings/add",
      "/api/actual-feedings/update",
      "/api/actual-feedings/remove"
    ],
    documentation: "See API_SETUP.md for more information"
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ 
    error: err.message || "Internal Server Error"
  });
});

// Export the Express API
module.exports = app; 