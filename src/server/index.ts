import express from "express"
import cors from "cors"
import { getRedisClient, closeRedisConnection } from "./api/redis-client"
import { getSettings, saveSettings } from "./api/settings"
import { getFeedings, updateFeeding, planFeedings } from "./api/feedings"

const app = express()
app.use(cors())
app.use(express.json())

// Redis connection check
app.get("/api/redis/check-connection", async (req, res) => {
  try {
    const client = await getRedisClient()
    await client.ping()
    res.json({ connected: true })
  } catch (error) {
    console.error("Redis connection check failed:", error)
    res.status(500).json({ connected: false, error: "Failed to connect to Redis" })
  }
})

// Settings endpoints
app.get("/api/settings/get", async (req, res) => {
  try {
    const settings = await getSettings()
    res.json({ settings })
  } catch (error) {
    console.error("Error getting settings:", error)
    res.status(500).json({ error: "Failed to get settings" })
  }
})

app.post("/api/settings/save", async (req, res) => {
  try {
    const { settings } = req.body
    await saveSettings(settings)
    res.json({ success: true })
  } catch (error) {
    console.error("Error saving settings:", error)
    res.status(500).json({ success: false, message: "Failed to save settings" })
  }
})

// Feedings endpoints
app.get("/api/feedings/get", async (req, res) => {
  try {
    const feedings = await getFeedings()
    res.json({ feedings })
  } catch (error) {
    console.error("Error getting feedings:", error)
    res.status(500).json({ error: "Failed to get feedings" })
  }
})

app.post("/api/feedings/update", async (req, res) => {
  try {
    const { feedingId, isCompleted } = req.body
    await updateFeeding(feedingId, isCompleted)
    res.json({ success: true })
  } catch (error) {
    console.error("Error updating feeding:", error)
    res.status(500).json({ success: false, message: "Failed to update feeding" })
  }
})

app.post("/api/feedings/plan", async (req, res) => {
  try {
    const feedings = await planFeedings()
    res.json({ success: true, feedings })
  } catch (error) {
    console.error("Error planning feedings:", error)
    res.status(500).json({ success: false, message: "Failed to plan feedings" })
  }
})

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Closing Redis connection...")
  await closeRedisConnection()
  process.exit(0)
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

