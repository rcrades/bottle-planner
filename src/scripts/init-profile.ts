/**
 * This script initializes the baby profile data in Redis
 * Run with: npx tsx src/scripts/init-profile.ts
 */

import { getRedisClient } from "../server/api/redis-client"
import 'dotenv/config'

// Default baby profile
const NEWBORN_PROFILE_KEY = "baby:profile"

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

async function main() {
  console.log("Initializing baby profile in Redis...")
  
  try {
    // Connect to Redis
    const client = await getRedisClient()
    console.log("Connected to Redis")
    
    // Check if profile already exists
    const existingProfile = await client.get(NEWBORN_PROFILE_KEY)
    
    if (existingProfile) {
      console.log("Profile already exists in Redis:", existingProfile)
      console.log("Overwriting with default profile...")
    }
    
    // Save default profile
    await client.set(NEWBORN_PROFILE_KEY, JSON.stringify(defaultProfile))
    console.log("Default profile successfully saved to Redis")
    
    // Verify profile was saved
    const savedProfile = await client.get(NEWBORN_PROFILE_KEY)
    console.log("Verified profile in Redis:", savedProfile)
    
    console.log("Profile initialization completed successfully")
    process.exit(0)
  } catch (error) {
    console.error("Error initializing profile:", error)
    process.exit(1)
  }
}

main().catch(console.error) 