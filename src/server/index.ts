import express, { Request, Response, NextFunction, RequestHandler } from "express"
import cors from "cors"
import { getRedisClient, closeRedisConnection } from "./api/redis-client"
import { getSettings, saveSettings } from "./api/settings"
import { getAllRecommendations } from "./api/recommendations"
import { getProfile } from "./api/profile"
import { 
  getFeedings, 
  updateFeeding, 
  planFeedings, 
  getActualFeedings, 
  addActualFeeding,
  updateActualFeeding,
  removeActualFeeding
} from "./api/feedings"
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env file
dotenv.config()

/**
 * Redis keys - to ensure consistency across the application
 */
const NEWBORN_PROFILE_KEY = "baby:profile"
const RECOMMENDATIONS_KEY = "baby:recommendations"
const SETTINGS_KEY = "baby:settings"
const FEEDINGS_KEY = "baby:feedings"

// Create Express app
const app = express()
app.use(cors())
app.use(express.json())

// Type for error handling
interface ApiError extends Error {
  status?: number;
}

/**
 * Initializes required data in Redis if it doesn't exist
 * This ensures the application always has data to work with
 */
async function initializeRedisData() {
  console.log("Checking Redis data initialization...")
  
  try {
    // Get Redis client
    const client = await getRedisClient()
    let dataInitialized = true
    
    // Check profile data
    const existingProfile = await client.get(NEWBORN_PROFILE_KEY)
    if (!existingProfile) {
      console.log("Profile data missing, initializing...")
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
      }
      await client.set(NEWBORN_PROFILE_KEY, JSON.stringify(defaultProfile))
      dataInitialized = false
    }
    
    // Check recommendations data
    const existingRecommendations = await client.get(RECOMMENDATIONS_KEY)
    if (!existingRecommendations) {
      console.log("Recommendations data missing, initializing...")
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
      ]
      await client.set(RECOMMENDATIONS_KEY, JSON.stringify(defaultRecommendations))
      dataInitialized = false
    }
    
    // Check settings data
    const existingSettings = await client.get(SETTINGS_KEY)
    if (!existingSettings) {
      console.log("Settings data missing, initializing...")
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
      }
      await client.set(SETTINGS_KEY, JSON.stringify(defaultSettings))
      dataInitialized = false
    }
    
    if (dataInitialized) {
      console.log("All Redis data is already initialized.")
    } else {
      console.log("Successfully initialized missing Redis data.")
    }
    
    return true
  } catch (error) {
    console.error("Error initializing Redis data:", error)
    return false
  }
}

// Redis connection check
const checkRedisConnection: RequestHandler = async (req, res) => {
  try {
    const client = await getRedisClient()
    
    // Also check if we can read/write data
    await client.ping()
    
    res.json({ 
      connected: true,
      message: "Successfully connected to Redis database"
    })
  } catch (error) {
    console.error("Redis connection error:", error)
    res.status(500).json({ 
      connected: false, 
      error: "Failed to connect to Redis",
      message: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

/**
 * API endpoint to initialize Redis data
 * This can be called from the frontend to fix missing data issues
 */
const initializeRedisDataHandler: RequestHandler = async (req, res) => {
  console.log("Received request to initialize Redis data...")
  
  try {
    // Try to initialize all required data
    const initialized = await initializeRedisData()
    
    if (initialized) {
      res.json({
        success: true,
        message: "Redis data initialized successfully"
      })
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to initialize Redis data"
      })
    }
  } catch (error) {
    console.error("Error while initializing Redis data:", error)
    res.status(500).json({
      success: false,
      message: "Error initializing Redis data",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

// Settings endpoints
const getSettingsHandler: RequestHandler = async (req, res) => {
  try {
    const settings = await getSettings()
    res.json(settings)
  } catch (error) {
    console.error("Error getting settings:", error)
    res.status(500).json({ 
      error: "Failed to get settings",
      message: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

const saveSettingsHandler: RequestHandler = async (req, res) => {
  try {
    const { settings } = req.body
    
    if (!settings) {
      res.status(400).json({ 
        success: false, 
        message: "No settings data provided in request body" 
      });
      return;
    }
    
    await saveSettings(settings)
    res.json({ success: true })
  } catch (error) {
    console.error("Error saving settings:", error)
    res.status(500).json({ 
      success: false, 
      message: "Failed to save settings",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

// Feedings endpoints
const getFeedingsHandler: RequestHandler = async (req, res) => {
  try {
    const feedings = await getFeedings()
    res.json({ success: true, feedings })
  } catch (error) {
    console.error("Error getting feedings:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get feedings",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

const updateFeedingHandler: RequestHandler = async (req, res) => {
  try {
    const { feedingId, isCompleted } = req.body
    
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
    
    await updateFeeding(feedingId, isCompleted)
    res.json({ success: true })
  } catch (error) {
    console.error("Error updating feeding:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update feeding",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

const planFeedingsHandler: RequestHandler = async (req, res) => {
  try {
    console.log("Planning feedings with AI...")
    const feedings = await planFeedings()
    res.json({ success: true, feedings })
  } catch (error) {
    console.error("Error planning feedings:", error)
    res.status(500).json({
      success: false,
      message: "Failed to plan feedings",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

// Actual feedings endpoints
const getActualFeedingsHandler: RequestHandler = async (req, res) => {
  try {
    const actualFeedings = await getActualFeedings()
    res.json({ success: true, actualFeedings })
  } catch (error) {
    console.error("Error getting actual feedings:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get actual feedings",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

const addActualFeedingHandler: RequestHandler = async (req, res) => {
  try {
    const { date, time, actualTime, planTime, amount, notes } = req.body
    
    if (!date) {
      res.status(400).json({ 
        success: false, 
        message: "date is required" 
      });
      return;
    }
    
    // We need at least one of time or actualTime
    if (!time && !actualTime) {
      res.status(400).json({ 
        success: false, 
        message: "time or actualTime is required" 
      });
      return;
    }
    
    if (amount === undefined) {
      res.status(400).json({ 
        success: false, 
        message: "amount is required" 
      });
      return;
    }
    
    const updatedFeedings = await addActualFeeding({
      date,
      // Use actualTime if provided, otherwise fallback to time
      actualTime: actualTime || time,
      // Use planTime if provided, otherwise use the same value as actualTime
      planTime: planTime || actualTime || time,
      amount,
      notes
    })
    
    res.json({ 
      success: true,
      actualFeedings: updatedFeedings
    })
  } catch (error) {
    console.error("Error adding actual feeding:", error)
    res.status(500).json({
      success: false,
      message: "Failed to add actual feeding",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

const updateActualFeedingHandler: RequestHandler = async (req, res) => {
  try {
    const { id, time, actualTime, planTime, date, amount, notes } = req.body
    
    if (!id) {
      res.status(400).json({ 
        success: false, 
        message: "id is required" 
      });
      return;
    }
    
    const updatedFeedings = await updateActualFeeding(id, {
      ...(time !== undefined && { time }),
      ...(actualTime !== undefined && { actualTime }),
      ...(planTime !== undefined && { planTime }),
      ...(date !== undefined && { date }),
      ...(amount !== undefined && { amount }),
      ...(notes !== undefined && { notes })
    })
    
    res.json({ 
      success: true,
      actualFeedings: updatedFeedings
    })
  } catch (error) {
    console.error("Error updating actual feeding:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update actual feeding",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

const removeActualFeedingHandler: RequestHandler = async (req, res) => {
  try {
    const { id } = req.body
    
    if (!id) {
      res.status(400).json({ 
        success: false, 
        message: "id is required" 
      });
      return;
    }
    
    const updatedFeedings = await removeActualFeeding(id)
    
    res.json({ 
      success: true,
      actualFeedings: updatedFeedings
    })
  } catch (error) {
    console.error("Error removing actual feeding:", error)
    res.status(500).json({
      success: false,
      message: "Failed to remove actual feeding",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

// API Routes
const getRecommendationsHandler: RequestHandler = async (req, res) => {
  try {
    console.log("Fetching recommendations from Redis...")
    const recommendations = await getAllRecommendations()
    
    if (!recommendations || recommendations.length === 0) {
      res.status(404).json({
        success: false,
        message: "No recommendations found in database"
      });
      return;
    }
    
    res.json({ success: true, recommendations })
  } catch (error) {
    console.error("Error fetching recommendations:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch recommendations",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

// Profile endpoint without fallback data
const getProfileHandler: RequestHandler = async (req, res) => {
  try {
    console.log("Fetching profile from Redis...")
    const profile = await getProfile()
    
    if (!profile) {
      res.status(404).json({
        success: false,
        message: "Profile not found in database"
      });
      return;
    }
    
    res.json({ success: true, profile });
  } catch (error) {
    console.error("Error fetching profile:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

// Register routes
app.get("/api/redis/check-connection", checkRedisConnection)
app.post("/api/redis/initialize-data", initializeRedisDataHandler)
app.get("/api/settings/get", getSettingsHandler)
app.post("/api/settings/save", saveSettingsHandler)
app.get("/api/recommendations/get", getRecommendationsHandler)
app.get("/api/profile/get", getProfileHandler)
app.get("/api/feedings/get", getFeedingsHandler)
app.post("/api/feedings/update", updateFeedingHandler)
app.post("/api/feedings/plan", planFeedingsHandler)

// New actual feedings endpoints
app.get("/api/actual-feedings/get", getActualFeedingsHandler)
app.post("/api/actual-feedings/add", addActualFeedingHandler)
app.post("/api/actual-feedings/update", updateActualFeedingHandler)
app.post("/api/actual-feedings/remove", removeActualFeedingHandler)

// Add a root path handler to show API info
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Baby Bottle Planner API",
    status: "Running",
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

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...")
  console.log("Closing Redis connection...")
  await closeRedisConnection()
  process.exit(0)
})

// Error handling middleware
app.use((err: ApiError, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ 
    error: err.message || "Internal Server Error"
  })
})

// Start the server
const PORT = process.env.PORT || 3000

// Initialize data before starting server
initializeRedisData()
  .then((initialized) => {
    if (initialized) {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`)
        console.log(`API available at http://localhost:${PORT}/`)
      })
    } else {
      console.error("Failed to initialize Redis data. Server not started.")
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error("Error during server startup:", error)
    process.exit(1)
  })

