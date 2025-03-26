/**
 * This script imports real feeding data into the baby:actualFeedings Redis key
 * Run with: npx tsx src/scripts/import-actual-feedings.ts
 */

import { getRedisClient, closeRedisConnection } from "../server/api/redis-client"
import { nanoid } from "nanoid"
import 'dotenv/config'

// The Redis key for actual feedings
const ACTUAL_FEEDINGS_KEY = "baby:actualFeedings"

// The real feeding data to import
const actualFeedingsData = [
  {
    "date": "2025.03.23",
    "planTime": "10pm",
    "actualTime": "10 pm",
    "Amount": "35 ml"
  },
  {
    "date": "2025.03.24",
    "planTime": "12:30pm",
    "actualTime": "12:30 am",
    "Amount": "10 ml"
  },
  {
    "date": "2025.03.24",
    "planTime": "3:15am",
    "actualTime": "3:15 am",
    "Amount": "30 ml"
  },
  {
    "date": "2025.03.24",
    "planTime": "5:45am",
    "actualTime": "6:30 am",
    "Amount": "40 ml"
  },
  {
    "date": "2025.03.24",
    "planTime": "9:30 am",
    "actualTime": "9:30 am",
    "Amount": "30 ml"
  },
  {
    "date": "2025.03.24",
    "planTime": "12pm",
    "actualTime": "12:30 pm",
    "Amount": "30 ml"
  },
  {
    "date": "2025.03.24",
    "planTime": "3:00pm",
    "actualTime": "3:00 pm",
    "Amount": "30 ml"
  },
  {
    "date": "2025.03.24",
    "planTime": "5:30pm",
    "actualTime": "5:10 pm",
    "Amount": "50 ml"
  },
  {
    "date": "2025.03.24",
    "planTime": "7:30 pm",
    "actualTime": "7:30 pm",
    "Amount": "30 ml"
  },
  {
    "date": "2025.03.24",
    "planTime": "10pm",
    "actualTime": "10:15 pm",
    "Amount": "40 ml"
  },
  {
    "date": "2025.03.24",
    "planTime": "12:30 am",
    "actualTime": "12:30 am",
    "Amount": "30 ml"
  },
  {
    "date": "2025.03.24",
    "planTime": "3:am",
    "actualTime": "3:30 am",
    "Amount": "50 ml"
  },
  {
    "date": "2025.03.24",
    "planTime": "5:30 am",
    "actualTime": "5:30 am",
    "Amount": "20 ml"
  }
]

// Transform dates to standardized format (YYYY-MM-DD)
function standardizeDate(dateStr: string) {
  // Replace dots with dashes
  const standardized = dateStr.replace(/\./g, '-')
  return standardized
}

async function main() {
  console.log("Starting import of actual feedings data...")
  
  try {
    // Connect to Redis
    const client = await getRedisClient()
    console.log("✅ Connected to Redis successfully")
    
    // Add unique IDs to each feeding record
    const feedingsWithIds = actualFeedingsData.map(feeding => ({
      id: nanoid(),
      ...feeding,
      // Standardize the date format
      date: standardizeDate(feeding.date)
    }))
    
    console.log(`Prepared ${feedingsWithIds.length} feeding records for import`)
    
    // Save to Redis
    await client.set(ACTUAL_FEEDINGS_KEY, JSON.stringify(feedingsWithIds))
    console.log("✅ Successfully imported actual feedings data")
    
    // Verify the data was saved
    const savedData = await client.get(ACTUAL_FEEDINGS_KEY)
    if (savedData) {
      const parsedData = JSON.parse(savedData)
      console.log(`✅ Verified ${parsedData.length} records were saved to Redis`)
      console.log("Sample record:", parsedData[0])
    }
    
    // Close Redis connection and exit
    await closeRedisConnection()
    console.log("Redis connection closed")
    
  } catch (error) {
    console.error("❌ Error during import:", error)
    await closeRedisConnection()
    process.exit(1)
  }
}

// Run the import process
main().catch(async (error) => {
  console.error("❌ Unhandled error in import process:", error)
  await closeRedisConnection()
  process.exit(1)
}) 