/**
 * This script initializes the settings data in Redis
 * Run with: npx tsx src/scripts/init-settings.ts
 */

import { getRedisClient } from "../server/api/redis-client"
import 'dotenv/config'

const SETTINGS_KEY = "baby:settings"

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
  },
}

async function main() {
  console.log("Initializing settings in Redis...")
  
  try {
    // Connect to Redis
    const client = await getRedisClient()
    console.log("Connected to Redis")
    
    // Check if settings already exist
    const existingSettings = await client.get(SETTINGS_KEY)
    
    if (existingSettings) {
      console.log("Settings already exist in Redis:", existingSettings)
      console.log("Overwriting with default settings...")
    }
    
    // Save default settings
    await client.set(SETTINGS_KEY, JSON.stringify(defaultSettings))
    console.log("Default settings successfully saved to Redis")
    
    // Verify settings were saved
    const savedSettings = await client.get(SETTINGS_KEY)
    console.log("Verified settings in Redis:", savedSettings)
    
    console.log("Settings initialization completed successfully")
    process.exit(0)
  } catch (error) {
    console.error("Error initializing settings:", error)
    process.exit(1)
  }
}

main().catch(console.error) 