/**
 * This script initializes all necessary data in Redis
 * Run with: npx tsx src/scripts/init-all.ts
 * 
 * This script ensures all required baby data is initialized in Redis:
 * - Profile information
 * - Feeding recommendations
 * - User settings
 * 
 * It includes retry logic to handle temporary connection issues.
 */

import { getRedisClient, closeRedisConnection } from "../server/api/redis-client"
import 'dotenv/config'

// Redis keys - used to store different data types
const NEWBORN_PROFILE_KEY = "baby:profile"
const RECOMMENDATIONS_KEY = "baby:recommendations"
const SETTINGS_KEY = "baby:settings"
const PLANNED_FEEDINGS_KEY = "baby:plannedFeedings"
const ACTUAL_FEEDINGS_KEY = "baby:actualFeedings"

// Settings data - default user preferences
const settings = {
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

// Profile data - basic baby information
const profile = {
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

// Recommendations data - age-based feeding guidelines
const recommendations = [
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
  },
  {
    date: "2025-03-27",
    ageInDays: 8,
    feedingFrequency: { minHours: 2, maxHours: 3 },
    amountPerFeeding: { minOz: 2, maxOz: 2, minMl: 60, maxMl: 60 },
    dailyIntake: { minOz: 18, maxOz: 20, minMl: 540, maxMl: 600 }
  }
]

// Initial feedings plan
const initialFeedings = [
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
]

// Initial actual feedings - sample data
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
]

// Retry configuration for Redis operations
const MAX_RETRIES = 5
const RETRY_DELAY_MS = 1000

/**
 * Attempts to initialize Redis data with retry logic
 */
async function main() {
  console.log("Initializing all data in Redis...")
  let retries = 0
  let client = null
  
  // Retry loop for Redis connection
  while (retries < MAX_RETRIES) {
    try {
      // Connect to Redis
      client = await getRedisClient()
      console.log("✅ Connected to Redis successfully")
      break
    } catch (error) {
      retries++
      console.error(`❌ Redis connection attempt ${retries}/${MAX_RETRIES} failed:`, error.message)
      
      if (retries >= MAX_RETRIES) {
        console.error("❌ Maximum connection attempts reached. Exiting.")
        process.exit(1)
      }
      
      // Wait before retrying
      console.log(`⏳ Waiting ${RETRY_DELAY_MS}ms before retrying...`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
    }
  }
  
  try {
    // Initialize profile
    console.log("\n📋 Checking profile data...")
    const existingProfile = await client.get(NEWBORN_PROFILE_KEY)
    
    if (existingProfile) {
      console.log("✅ Profile data already exists")
    } else {
      console.log("⏳ Initializing profile data...")
      await client.set(NEWBORN_PROFILE_KEY, JSON.stringify(profile))
      console.log("✅ Profile data initialized successfully")
    }
    
    // Initialize recommendations
    console.log("\n📋 Checking recommendations data...")
    const existingRecommendations = await client.get(RECOMMENDATIONS_KEY)
    
    if (existingRecommendations) {
      console.log("✅ Recommendations data already exists")
    } else {
      console.log("⏳ Initializing recommendations data...")
      await client.set(RECOMMENDATIONS_KEY, JSON.stringify(recommendations))
      console.log("✅ Recommendations data initialized successfully")
    }
    
    // Initialize settings
    console.log("\n📋 Checking settings data...")
    const existingSettings = await client.get(SETTINGS_KEY)
    
    if (existingSettings) {
      console.log("✅ Settings data already exists")
    } else {
      console.log("⏳ Initializing settings data...")
      await client.set(SETTINGS_KEY, JSON.stringify(settings))
      console.log("✅ Settings data initialized successfully")
    }
    
    // Initialize feedings
    console.log("\n📋 Checking planned feedings data...")
    const existingFeedings = await client.get(PLANNED_FEEDINGS_KEY)
    
    if (existingFeedings) {
      console.log("✅ Planned feedings data already exists")
    } else {
      console.log("⏳ Initializing planned feedings data...")
      await client.set(PLANNED_FEEDINGS_KEY, JSON.stringify(initialFeedings))
      console.log("✅ Planned feedings data initialized successfully")
    }
    
    // Initialize actual feedings
    console.log("\n📋 Checking actual feedings data...")
    const existingActualFeedings = await client.get(ACTUAL_FEEDINGS_KEY)
    
    if (existingActualFeedings) {
      console.log("✅ Actual feedings data already exists")
    } else {
      console.log("⏳ Initializing actual feedings data...")
      await client.set(ACTUAL_FEEDINGS_KEY, JSON.stringify(initialActualFeedings))
      console.log("✅ Actual feedings data initialized successfully")
    }
    
    // Final verification
    console.log("\n🔎 Final verification of all data:")
    const savedProfile = await client.get(NEWBORN_PROFILE_KEY)
    console.log(`- Profile data: ${savedProfile ? '✅ Exists' : '❌ Missing'}`)
    
    const savedRecommendations = await client.get(RECOMMENDATIONS_KEY)
    console.log(`- Recommendations data: ${savedRecommendations ? '✅ Exists' : '❌ Missing'}`)
    
    const savedSettings = await client.get(SETTINGS_KEY)
    console.log(`- Settings data: ${savedSettings ? '✅ Exists' : '❌ Missing'}`)
    
    const savedPlannedFeedings = await client.get(PLANNED_FEEDINGS_KEY)
    console.log(`- Planned feedings data: ${savedPlannedFeedings ? '✅ Exists' : '❌ Missing'}`)
    
    const savedActualFeedings = await client.get(ACTUAL_FEEDINGS_KEY)
    console.log(`- Actual feedings data: ${savedActualFeedings ? '✅ Exists' : '❌ Missing'}`)
    
    // Success message
    if (savedProfile && savedRecommendations && savedSettings && savedPlannedFeedings && savedActualFeedings) {
      console.log("\n✅ All data verified and ready for use!")
    } else {
      console.error("\n❌ Some data is still missing. Please check the logs above.")
    }
    
    // Close Redis connection and exit
    await closeRedisConnection()
    process.exit(0)
  } catch (error) {
    console.error("\n❌ Error initializing data:", error)
    await closeRedisConnection()
    process.exit(1)
  }
}

// Run the initialization process
main().catch(async (error) => {
  console.error("❌ Unhandled error in main process:", error)
  await closeRedisConnection()
  process.exit(1)
}) 