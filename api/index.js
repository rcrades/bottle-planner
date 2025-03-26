// Serverless function for Vercel
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import Redis client with improved error handling
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
 * Adds logging information for Vercel serverless environment
 */
function logServerlessInfo() {
  // Add additional context for serverless debugging
  if (process.env.VERCEL) {
    console.log('Running in Vercel serverless environment');
    console.log(`Region: ${process.env.VERCEL_REGION || 'unknown'}`);
    console.log(`Node version: ${process.version}`);
    console.log(`Memory limit: ${process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || 'unknown'} MB`);
  }
}

/**
 * Initializes Redis with required data if it doesn't exist
 * Returns true if successful, false otherwise
 * Optimized for serverless with timeout handling
 */
const initDataIfNeeded = async () => {
  console.log("Checking if Redis data needs initialization...");
  
  // Add a timeout to prevent blocking in serverless
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Data initialization timed out")), 5000);
  });
  
  try {
    const initPromise = (async () => {
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
      // (only check if we haven't already initialized something to save time in serverless)
      if (dataInitialized) {
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
      }
      
      // Check if settings exist, if not create them
      // (only check if we haven't already initialized something to save time in serverless)
      if (dataInitialized) {
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
      }
      
      // Only check for feedings if nothing else needed initializing (to save time in serverless)
      if (dataInitialized) {
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
      }
      
      // Only check actual feedings as the last step (least critical)
      if (dataInitialized) {
        const existingActualFeedings = await client.get(REDIS_KEYS.ACTUAL_FEEDINGS);
        if (!existingActualFeedings) {
          console.log("Creating initial actual feedings data...");
          const initialActualFeedings = [
            {
              id: "actual-1",
              date: "2025-03-24",
              planTime: "08:00",
              actualTime: "08:15",
              Amount: 1.8,
              notes: "Baby seemed hungry but didn't finish bottle"
            },
            {
              id: "actual-2",
              date: "2025-03-24",
              planTime: "11:00",
              actualTime: "11:00",
              Amount: 2.2,
              notes: "Finished entire bottle quickly"
            }
          ];
          await client.set(REDIS_KEYS.ACTUAL_FEEDINGS, JSON.stringify(initialActualFeedings));
          dataInitialized = false;
          console.log("✅ Actual feedings data initialized");
        }
      }
      
      if (dataInitialized) {
        console.log("✅ All Redis data is already initialized");
      } else {
        console.log("✅ Successfully initialized missing Redis data");
      }
      
      return true;
    })();
    
    // Race the initialization against the timeout
    const result = await Promise.race([initPromise, timeoutPromise]);
    return result;
  } catch (error) {
    console.error("❌ Error initializing data:", error);
    if (error.message === "Data initialization timed out") {
      console.log("Initialization will be attempted on first endpoint access");
    }
    return false;
  }
};

// Create and configure Express app
const app = express();
app.use(cors({
  origin: '*', // In production, you might want to be more specific
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Log serverless information
logServerlessInfo();

// Root API endpoint - respond immediately regardless of Redis connectivity
// This is critical for Vercel's health checks and for frontend fallback checks
app.get("/api", (req, res) => {
  res.json({ 
    status: "online",
    environment: process.env.NODE_ENV || "development",
    vercel: process.env.VERCEL ? "true" : "false",
    serverTime: new Date().toISOString(),
    message: "Baby Bottle Planner API is running"
  });
});

// Home/health check endpoint - also respond immediately
app.get("/", (req, res) => {
  res.send("Bottle Planner API is running!");
});

// Try to initialize data on startup only in development
// Skip in production to avoid cold start delays
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  initDataIfNeeded().catch(err => {
    console.error("⚠️ Warning: Data initialization error:", err);
    console.log("API will continue, but some endpoints may fail if data is missing");
  });
}

// Redis connection check with better error information for production
app.get("/api/redis/check-connection", async (req, res) => {
  try {
    const client = await getRedisClient();
    await client.ping();
    res.json({ 
      connected: true,
      environment: process.env.NODE_ENV || "development", 
      vercel: process.env.VERCEL ? "true" : "false",
      serverTime: new Date().toISOString(),
      message: "Successfully connected to Redis database"
    });
  } catch (error) {
    console.error("Redis connection error:", error);
    res.status(500).json({ 
      connected: false, 
      environment: process.env.NODE_ENV || "development",
      vercel: process.env.VERCEL ? "true" : "false",
      serverTime: new Date().toISOString(),
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
    // In production with Vercel, use a more direct approach to reduce overhead
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.log("Production recommendations fetch - using direct approach");
      
      try {
        // Direct client with minimal overhead in production
        const client = await getRedisClient();
        const recommendationsData = await client.get(REDIS_KEYS.RECOMMENDATIONS);
        
        if (!recommendationsData) {
          // Initialize data if missing
          console.log("Recommendations not found in production. Initializing data...");
          
          // Create minimal recommendations only
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
          console.log("✅ Recommendations created in production");
          
          return res.json({ success: true, recommendations: defaultRecommendations });
        }
        
        // Parse recommendations data
        try {
          const recommendations = JSON.parse(recommendationsData);
          console.log(`Successfully fetched ${recommendations.length} recommendations in production`);
          return res.json({ success: true, recommendations });
        } catch (parseError) {
          console.error("Error parsing recommendations data in production:", parseError);
          res.status(500).json({
            success: false,
            message: "Invalid recommendations data format",
            serverTime: new Date().toISOString(),
            error: "The recommendations data could not be parsed",
            env: process.env.NODE_ENV || "production"
          });
        }
      } catch (prodError) {
        console.error("Production recommendations fetch error:", prodError);
        res.status(500).json({
          success: false,
          message: "Failed to fetch recommendations in production",
          serverTime: new Date().toISOString(),
          error: prodError instanceof Error ? prodError.message : "Unknown error",
          env: process.env.NODE_ENV || "production"
        });
      }
      return;
    }
    
    // In development, use the more robust approach with retries
    // Initialize data on first access (needed for cold starts in serverless)
    let initAttempted = false;
    
    const handleRecommendationsRequest = async (retryCount = 0) => {
      try {
        console.log(`Fetching recommendations from Redis... (attempt ${retryCount + 1})`);
        
        // Add a timeout to prevent hanging requests
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Redis operation timed out")), 3000);
        });
        
        // Try to get recommendations with a timeout
        const client = await getRedisClient();
        const recommendationsPromise = client.get(REDIS_KEYS.RECOMMENDATIONS);
        const recommendationsData = await Promise.race([recommendationsPromise, timeoutPromise]);
        
        if (!recommendationsData) {
          // Recommendations are missing but Redis is working - try to initialize data
          if (!initAttempted) {
            console.log("Recommendations not found. Attempting data initialization...");
            await initDataIfNeeded();
            initAttempted = true;
            
            // Retry the recommendations fetch after initialization
            return handleRecommendationsRequest(retryCount + 1);
          }
          
          console.log("No recommendations found in database");
          res.status(404).json({
            success: false,
            message: "No recommendations found in database. Try reloading or reinitializing data."
          });
          return;
        }
        
        // Parse recommendations data with proper error handling
        try {
          const recommendations = JSON.parse(recommendationsData);
          console.log(`Successfully fetched ${recommendations.length} recommendations`);
          res.json({ success: true, recommendations });
        } catch (parseError) {
          console.error("Error parsing recommendations data:", parseError);
          res.status(500).json({
            success: false,
            message: "Invalid recommendations data format",
            error: "The recommendations data could not be parsed"
          });
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
        
        // Handle retries for certain error types
        if (retryCount < 2 && (
          error.message.includes("timeout") || 
          error.message.includes("connection") ||
          error.code === "ECONNRESET" ||
          error.code === "ETIMEDOUT"
        )) {
          console.log(`Retrying recommendations fetch (attempt ${retryCount + 1})...`);
          // Wait briefly before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
          return handleRecommendationsRequest(retryCount + 1);
        }
        
        // Always return a valid JSON response, even on severe errors
        res.status(500).json({
          success: false,
          message: "Failed to fetch recommendations",
          error: error instanceof Error ? error.message : "Unknown error",
          retry: "Please refresh the page or try again later"
        });
      }
    };
    
    // Start the request handling for development
    await handleRecommendationsRequest();
  } catch (outerError) {
    // Catch any unexpected errors at the top level
    console.error("Unexpected error in recommendations endpoint:", outerError);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred in the recommendations endpoint",
      error: outerError instanceof Error ? outerError.message : "Unknown error",
      serverTime: new Date().toISOString()
    });
  }
});

// Profile endpoint with improved error handling for serverless environments
app.get("/api/profile/get", async (req, res) => {
  try {
    // In production with Vercel, use a more direct approach to reduce overhead
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.log("Production profile fetch - using direct approach");
      
      try {
        // Direct client with minimal overhead in production
        const client = await getRedisClient();
        const profileData = await client.get(REDIS_KEYS.PROFILE);
        
        if (!profileData) {
          // Initialize data if missing
          console.log("Profile not found in production. Initializing data...");
          
          // Create minimal profile only
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
          console.log("✅ Profile created in production");
          
          return res.json({ success: true, profile: defaultProfile });
        }
        
        // Parse profile data
        try {
          const profile = JSON.parse(profileData);
          console.log("Successfully fetched profile in production");
          return res.json({ success: true, profile });
        } catch (parseError) {
          console.error("Error parsing profile data in production:", parseError);
          res.status(500).json({
            success: false,
            message: "Invalid profile data format",
            serverTime: new Date().toISOString(),
            error: "The profile data could not be parsed",
            env: process.env.NODE_ENV || "production"
          });
        }
      } catch (prodError) {
        console.error("Production profile fetch error:", prodError);
        res.status(500).json({
          success: false,
          message: "Failed to fetch profile in production",
          serverTime: new Date().toISOString(),
          error: prodError instanceof Error ? prodError.message : "Unknown error",
          env: process.env.NODE_ENV || "production"
        });
      }
      return;
    }
    
    // In development, use the more robust approach with retries
    // Initialize data on first access (needed for cold starts in serverless)
    let initAttempted = false;
    
    const handleProfileRequest = async (retryCount = 0) => {
      try {
        console.log(`Fetching profile from Redis... (attempt ${retryCount + 1})`);
        
        // Add a timeout to prevent hanging requests
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Redis operation timed out")), 3000);
        });
        
        // Try to get profile with a timeout
        const client = await getRedisClient();
        const profilePromise = client.get(REDIS_KEYS.PROFILE);
        const profileData = await Promise.race([profilePromise, timeoutPromise]);
        
        if (!profileData) {
          // Profile is missing but Redis is working - try to initialize data
          if (!initAttempted) {
            console.log("Profile not found. Attempting data initialization...");
            await initDataIfNeeded();
            initAttempted = true;
            
            // Retry the profile fetch after initialization
            return handleProfileRequest(retryCount + 1);
          }
          
          console.log("Profile not found in database");
          res.status(404).json({
            success: false,
            message: "Profile not found in database. Try reloading or reinitializing data."
          });
          return;
        }
        
        // Parse profile data with proper error handling
        try {
          const profile = JSON.parse(profileData);
          console.log("Successfully fetched profile");
          res.json({ success: true, profile });
        } catch (parseError) {
          console.error("Error parsing profile data:", parseError);
          res.status(500).json({
            success: false,
            message: "Invalid profile data format",
            error: "The profile data could not be parsed"
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        
        // Handle retries for certain error types
        if (retryCount < 2 && (
          error.message.includes("timeout") || 
          error.message.includes("connection") ||
          error.code === "ECONNRESET" ||
          error.code === "ETIMEDOUT"
        )) {
          console.log(`Retrying profile fetch (attempt ${retryCount + 1})...`);
          // Wait briefly before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
          return handleProfileRequest(retryCount + 1);
        }
        
        // Always return a valid JSON response, even on severe errors
        res.status(500).json({
          success: false,
          message: "Failed to fetch profile",
          error: error instanceof Error ? error.message : "Unknown error",
          retry: "Please refresh the page or try again later"
        });
      }
    };
    
    // Start the request handling for development
    await handleProfileRequest();
  } catch (outerError) {
    // Catch any unexpected errors at the top level
    console.error("Unexpected error in profile endpoint:", outerError);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred in the profile endpoint",
      error: outerError instanceof Error ? outerError.message : "Unknown error",
      serverTime: new Date().toISOString()
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