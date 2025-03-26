/**
 * This script adds more feeding data to the existing baby:actualFeedings Redis key
 * Run with: npx tsx src/scripts/add-more-feedings.ts
 */

import { getRedisClient, closeRedisConnection } from "../server/api/redis-client"
import 'dotenv/config'

// The Redis key for actual feedings
const ACTUAL_FEEDINGS_KEY = "baby:actualFeedings"

// The additional feeding data to add (with IDs)
const additionalFeedingsData = [
  {
    "id": "feed0001",
    "date": "2025.03.21",
    "planTime": "9:30",
    "actualTime": "9:30",
    "Amount": "22 ml"
  },
  {
    "id": "feed0002",
    "date": "2025.03.21",
    "planTime": "12 am",
    "actualTime": "11:45",
    "Amount": "15 ml"
  },
  {
    "id": "feed0003",
    "date": "2025.03.21",
    "planTime": "2:30 am",
    "actualTime": "2 AM",
    "Amount": "7 ml"
  },
  {
    "id": "feed0004",
    "date": "2025.03.21",
    "planTime": "5 am",
    "actualTime": "4:45",
    "Amount": "10 ml"
  },
  {
    "id": "feed0005",
    "date": "2025.03.21",
    "planTime": "7:30 am",
    "actualTime": "8 am",
    "Amount": "10 ml"
  },
  {
    "id": "feed0006",
    "date": "2025.03.21",
    "planTime": "10:30 am",
    "actualTime": "11:30 am",
    "Amount": "10 ml"
  },
  {
    "id": "feed0007",
    "date": "2025.03.21",
    "planTime": "2 pm",
    "actualTime": "2:25",
    "Amount": "19 ml"
  },
  {
    "id": "feed0008",
    "date": "2025.03.21",
    "planTime": "6 pm",
    "actualTime": "6 pm",
    "Amount": "25 ml"
  }
]

async function main() {
  console.log("Starting addition of more feeding data...")
  
  try {
    // Connect to Redis
    const client = await getRedisClient()
    console.log("✅ Connected to Redis successfully")
    
    // Get existing data
    const existingDataStr = await client.get(ACTUAL_FEEDINGS_KEY)
    if (!existingDataStr) {
      console.error("❌ No existing data found in baby:actualFeedings")
      return
    }
    
    // Parse existing data
    const existingData = JSON.parse(existingDataStr)
    console.log(`Found ${existingData.length} existing feeding records`)
    
    // Check for duplicate IDs
    const existingIds = new Set(existingData.map(feeding => feeding.id))
    const duplicateIds = additionalFeedingsData.filter(feeding => existingIds.has(feeding.id))
    
    if (duplicateIds.length > 0) {
      console.warn(`⚠️ Warning: Found ${duplicateIds.length} duplicate IDs that will be updated:`)
      duplicateIds.forEach(feeding => console.warn(`  - ${feeding.id}`))
    }
    
    // Prepare combined data - replace existing records with matching IDs
    const combinedData = [
      ...existingData.filter(feeding => !additionalFeedingsData.some(newFeeding => newFeeding.id === feeding.id)),
      ...additionalFeedingsData
    ]
    
    // Save to Redis
    await client.set(ACTUAL_FEEDINGS_KEY, JSON.stringify(combinedData))
    console.log(`✅ Successfully combined data. Now have ${combinedData.length} feeding records`)
    
    // Verify the data was saved
    const savedData = await client.get(ACTUAL_FEEDINGS_KEY)
    if (savedData) {
      const parsedData = JSON.parse(savedData)
      console.log(`✅ Verified ${parsedData.length} records are now in Redis`)
      
      // Show sample of new records
      const newRecordsSample = parsedData.filter(feeding => 
        feeding.id && feeding.id.startsWith("feed000")
      ).slice(0, 2)
      console.log("Sample of new records:", newRecordsSample)
    }
    
    // Close Redis connection and exit
    await closeRedisConnection()
    console.log("Redis connection closed")
    
  } catch (error) {
    console.error("❌ Error adding feeding data:", error)
    await closeRedisConnection()
    process.exit(1)
  }
}

// Run the import process
main().catch(async (error) => {
  console.error("❌ Unhandled error:", error)
  await closeRedisConnection()
  process.exit(1)
}) 