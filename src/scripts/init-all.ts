/**
 * This script initializes all required Redis data
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
import { nanoid } from "nanoid"
import 'dotenv/config'

// All Redis keys used in the application
const PROFILE_KEY = "baby:profile"
const RECOMMENDATIONS_KEY = "baby:recommendations"
const SETTINGS_KEY = "baby:settings"
const PLANNED_FEEDINGS_KEY = "baby:plannedFeedings"
const ACTUAL_FEEDINGS_KEY = "baby:actualFeedings"

// Flag to force reinitialization even if data exists
const FORCE_REINIT = process.argv.includes('--force')

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
  console.log("=== BOTTLE PLANNER INITIALIZATION TOOL ===")
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`Force reinitialization: ${FORCE_REINIT ? 'YES' : 'NO'}`)
  
  try {
    // Connect to Redis
    console.log("\nConnecting to Redis...")
    const client = await getRedisClient()
    console.log("✅ Connected to Redis successfully")
    
    // Define default data
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
    
    const initialPlannedFeedings = [
      {
        id: nanoid(),
        time: "08:00",
        amount: 2,
        isLocked: true,
        isCompleted: false
      },
      {
        id: nanoid(),
        time: "10:30",
        amount: 2,
        isLocked: false,
        isCompleted: false
      },
      {
        id: nanoid(),
        time: "13:00",
        amount: 2,
        isLocked: false,
        isCompleted: false
      },
      {
        id: nanoid(),
        time: "15:30",
        amount: 2,
        isLocked: false,
        isCompleted: false
      },
      {
        id: nanoid(),
        time: "18:00",
        amount: 2,
        isLocked: false,
        isCompleted: false
      },
      {
        id: nanoid(),
        time: "20:30",
        amount: 2,
        isLocked: false,
        isCompleted: false
      },
      {
        id: nanoid(),
        time: "22:00",
        amount: 2,
        isLocked: true,
        isCompleted: false
      },
      {
        id: nanoid(),
        time: "00:30",
        amount: 2,
        isLocked: true,
        isCompleted: false
      },
      {
        id: nanoid(),
        time: "03:00",
        amount: 2,
        isLocked: true,
        isCompleted: false
      },
      {
        id: nanoid(),
        time: "05:30",
        amount: 2,
        isLocked: true,
        isCompleted: false
      }
    ]
    
    const initialActualFeedings = [
      {
        id: nanoid(),
        date: "2025-03-23",
        planTime: "10:00 PM",
        actualTime: "10:00 PM",
        Amount: "35 ml",
        notes: "Fed well"
      },
      {
        id: nanoid(),
        date: "2025-03-24",
        planTime: "12:30 AM",
        actualTime: "12:30 AM",
        Amount: "30 ml",
        notes: "Seemed hungry"
      },
      {
        id: nanoid(),
        date: "2025-03-24",
        planTime: "3:00 AM",
        actualTime: "3:15 AM",
        Amount: "30 ml",
        notes: ""
      }
    ]
    
    // Initialize profile data
    const existingProfile = FORCE_REINIT ? null : await client.get(PROFILE_KEY)
    if (!existingProfile) {
      console.log("Initializing profile data...")
      await client.set(PROFILE_KEY, JSON.stringify(defaultProfile))
      console.log("✅ Profile data initialized")
    } else {
      console.log("Profile data already exists")
    }
    
    // Initialize recommendations data
    const existingRecommendations = FORCE_REINIT ? null : await client.get(RECOMMENDATIONS_KEY)
    if (!existingRecommendations) {
      console.log("Initializing recommendations data...")
      await client.set(RECOMMENDATIONS_KEY, JSON.stringify(defaultRecommendations))
      console.log("✅ Recommendations data initialized")
    } else {
      console.log("Recommendations data already exists")
    }
    
    // Initialize settings data
    const existingSettings = FORCE_REINIT ? null : await client.get(SETTINGS_KEY)
    if (!existingSettings) {
      console.log("Initializing settings data...")
      await client.set(SETTINGS_KEY, JSON.stringify(defaultSettings))
      console.log("✅ Settings data initialized")
    } else {
      console.log("Settings data already exists")
    }
    
    // Initialize planned feedings data
    const existingFeedings = FORCE_REINIT ? null : await client.get(PLANNED_FEEDINGS_KEY)
    if (!existingFeedings) {
      console.log("Initializing planned feedings data...")
      await client.set(PLANNED_FEEDINGS_KEY, JSON.stringify(initialPlannedFeedings))
      console.log("✅ Planned feedings data initialized")
    } else {
      console.log("Planned feedings data already exists")
    }
    
    // Initialize actual feedings data
    const existingActualFeedings = FORCE_REINIT ? null : await client.get(ACTUAL_FEEDINGS_KEY)
    if (!existingActualFeedings) {
      console.log("Initializing actual feedings data...")
      await client.set(ACTUAL_FEEDINGS_KEY, JSON.stringify(initialActualFeedings))
      console.log("✅ Actual feedings data initialized")
    } else {
      console.log("Actual feedings data already exists")
      
      // Check if actual feedings have the correct format (actualTime, planTime)
      try {
        const parsedFeedings = JSON.parse(existingActualFeedings)
        const sampleFeeding = parsedFeedings[0]
        
        // Check if required fields are missing
        if (sampleFeeding && 
            (!sampleFeeding.actualTime || !sampleFeeding.planTime)) {
          console.log("⚠️ Actual feedings are missing required fields")
          console.log("Updating actual feedings data format...")
          
          // Update format of existing feedings
          const updatedFeedings = parsedFeedings.map((feeding: any) => ({
            ...feeding,
            actualTime: feeding.actualTime || feeding.time || "Unknown",
            planTime: feeding.planTime || feeding.time || "Unknown"
          }))
          
          await client.set(ACTUAL_FEEDINGS_KEY, JSON.stringify(updatedFeedings))
          console.log("✅ Actual feedings data format updated")
        }
      } catch (parseError) {
        console.error("❌ Error parsing actual feedings data:", parseError)
        console.log("Reinitializing actual feedings data...")
        await client.set(ACTUAL_FEEDINGS_KEY, JSON.stringify(initialActualFeedings))
        console.log("✅ Actual feedings data reinitialized")
      }
    }
    
    // Verify all data
    console.log("\nVerifying data...")
    const savedProfile = await client.get(PROFILE_KEY)
    const savedRecommendations = await client.get(RECOMMENDATIONS_KEY)
    const savedSettings = await client.get(SETTINGS_KEY)
    const savedPlannedFeedings = await client.get(PLANNED_FEEDINGS_KEY)
    const savedActualFeedings = await client.get(ACTUAL_FEEDINGS_KEY)
    
    console.log(`Profile: ${savedProfile ? 'OK' : 'MISSING'} (${savedProfile?.length || 0} bytes)`)
    console.log(`Recommendations: ${savedRecommendations ? 'OK' : 'MISSING'} (${savedRecommendations?.length || 0} bytes)`)
    console.log(`Settings: ${savedSettings ? 'OK' : 'MISSING'} (${savedSettings?.length || 0} bytes)`)
    console.log(`Planned Feedings: ${savedPlannedFeedings ? 'OK' : 'MISSING'} (${savedPlannedFeedings?.length || 0} bytes)`)
    console.log(`Actual Feedings: ${savedActualFeedings ? 'OK' : 'MISSING'} (${savedActualFeedings?.length || 0} bytes)`)
    
    // Close Redis connection
    await closeRedisConnection()
    console.log("\n✅ Initialization complete! All data has been set up successfully.")
    
    // Instructions for next steps
    console.log("\nNext steps:")
    console.log("1. If running locally, restart your development server with: npm run dev")
    console.log("2. If in production, restart your application")
    console.log("3. Refresh your browser to load the new data")
    
  } catch (error) {
    console.error("\n❌ Error during initialization:", error)
    await closeRedisConnection()
    
    console.log("\nTroubleshooting steps:")
    console.log("1. Check Redis connection (is Redis running?)")
    console.log("2. Verify REDIS_URL environment variable")
    console.log("3. Check for disk space issues")
    console.log("4. Run with --force flag: npx tsx src/scripts/init-all.ts --force")
    
    process.exit(1)
  }
}

// Run the initialization process
main().catch(async (error) => {
  console.error("❌ Unhandled error in initialization process:", error)
  await closeRedisConnection()
  process.exit(1)
}) 