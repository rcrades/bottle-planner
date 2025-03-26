import express, { Request, Response, NextFunction, RequestHandler } from "express"
import cors from "cors"
import { getRedisClient, closeRedisConnection } from "./api/redis-client"
import { getSettings, saveSettings } from "./api/settings"
import { getAllRecommendations } from "./api/recommendations"
import { getProfile } from "./api/profile"
import { getFeedings, updateFeeding, planFeedings } from "./api/feedings"
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// Type for error handling
interface ApiError extends Error {
  status?: number;
}

// Redis connection check
const checkRedisConnection: RequestHandler = async (req, res) => {
  try {
    const client = await getRedisClient()
    res.json({ connected: true })
  } catch (error) {
    console.error("Redis connection error:", error)
    res.status(500).json({ connected: false, error: "Failed to connect to Redis" })
  }
}

// Settings endpoints
const getSettingsHandler: RequestHandler = async (req, res) => {
  try {
    const settings = await getSettings()
    res.json(settings)
  } catch (error) {
    console.error("Error getting settings:", error)
    res.status(500).json({ error: "Failed to get settings" })
  }
}

const saveSettingsHandler: RequestHandler = async (req, res) => {
  try {
    const { settings } = req.body
    await saveSettings(settings)
    res.json({ success: true })
  } catch (error) {
    console.error("Error saving settings:", error)
    res.status(500).json({ success: false, message: "Failed to save settings" })
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
    })
  }
}

const updateFeedingHandler: RequestHandler = async (req, res) => {
  try {
    const { feedingId, isCompleted } = req.body
    await updateFeeding(feedingId, isCompleted)
    res.json({ success: true })
  } catch (error) {
    console.error("Error updating feeding:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update feeding",
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
    })
  }
}

// API Routes
const getRecommendationsHandler: RequestHandler = async (req, res) => {
  try {
    console.log("Fetching recommendations from Redis...")
    const recommendations = await getAllRecommendations()
    res.json({ success: true, recommendations })
  } catch (error) {
    console.error("Error fetching recommendations:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch recommendations",
    })
  }
}

const getProfileHandler: RequestHandler = async (req, res) => {
  try {
    console.log("Fetching profile from Redis...")
    const profile = await getProfile()
    res.json({ success: true, profile })
  } catch (error) {
    console.error("Error fetching profile:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    })
  }
}

// Register routes
app.get("/api/redis/check-connection", checkRedisConnection)
app.get("/api/settings/get", getSettingsHandler)
app.post("/api/settings/save", saveSettingsHandler)
app.get("/api/recommendations/get", getRecommendationsHandler)
app.get("/api/profile/get", getProfileHandler)
app.get("/api/feedings/get", getFeedingsHandler)
app.post("/api/feedings/update", updateFeedingHandler)
app.post("/api/feedings/plan", planFeedingsHandler)

// Graceful shutdown
process.on("SIGINT", async () => {
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

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

