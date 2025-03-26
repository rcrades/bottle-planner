/**
 * This script updates all baby:actualFeedings data with better formatted times
 * Run with: npx tsx src/scripts/update-formatted-feedings.ts
 */

import { getRedisClient, closeRedisConnection } from "../server/api/redis-client"
import 'dotenv/config'

// The Redis key for actual feedings
const ACTUAL_FEEDINGS_KEY = "baby:actualFeedings"

// The complete set of feeding data with better formatting
const updatedFeedingsData = [
  {
    "id": "QU6j_2i7aXkMBwc3slazy",
    "date": "2025-03-23",
    "planTime": "22:00 CDT",
    "actualTime": "22:00 CDT",
    "Amount": "35 ml"
  },
  {
    "id": "2DsNZ0ag94Ua8GrSmG4rH",
    "date": "2025-03-24",
    "planTime": "12:30 CDT",
    "actualTime": "00:30 CDT",
    "Amount": "10 ml"
  },
  {
    "id": "d-NbGZeXGvIqj9jdmryNi",
    "date": "2025-03-24",
    "planTime": "03:15 CDT",
    "actualTime": "03:15 CDT",
    "Amount": "30 ml"
  },
  {
    "id": "07Se6PysVND-DC5ltx_hR",
    "date": "2025-03-24",
    "planTime": "05:45 CDT",
    "actualTime": "06:30 CDT",
    "Amount": "40 ml"
  },
  {
    "id": "hqxgbWDEG64ED5l98DOwI",
    "date": "2025-03-24",
    "planTime": "09:30 CDT",
    "actualTime": "09:30 CDT",
    "Amount": "30 ml"
  },
  {
    "id": "NsMn93Nqm2ehQFBuE7P9c",
    "date": "2025-03-24",
    "planTime": "12:00 CDT",
    "actualTime": "12:30 CDT",
    "Amount": "30 ml"
  },
  {
    "id": "DBcVmbK2GoYugW4nO10cB",
    "date": "2025-03-24",
    "planTime": "15:00 CDT",
    "actualTime": "15:00 CDT",
    "Amount": "30 ml"
  },
  {
    "id": "-45gO7NxWlQSQxG0LSKEd",
    "date": "2025-03-24",
    "planTime": "17:30 CDT",
    "actualTime": "17:10 CDT",
    "Amount": "50 ml"
  },
  {
    "id": "cCNleXtl2QRndAAGTyHuh",
    "date": "2025-03-24",
    "planTime": "19:30 CDT",
    "actualTime": "19:30 CDT",
    "Amount": "30 ml"
  },
  {
    "id": "3i_uTDZNQVv1xhyNaxsic",
    "date": "2025-03-24",
    "planTime": "22:00 CDT",
    "actualTime": "22:15 CDT",
    "Amount": "40 ml"
  },
  {
    "id": "b7r4QPSpM2AZnA-JqozEV",
    "date": "2025-03-24",
    "planTime": "00:30 CDT",
    "actualTime": "00:30 CDT",
    "Amount": "30 ml"
  },
  {
    "id": "5mg5jZhICBKGcZBUo97I1",
    "date": "2025-03-24",
    "planTime": "03:00 CDT",
    "actualTime": "03:30 CDT",
    "Amount": "50 ml"
  },
  {
    "id": "TtKKe-oTIxzovfZNuS4Fo",
    "date": "2025-03-24",
    "planTime": "05:30 CDT",
    "actualTime": "05:30 CDT",
    "Amount": "20 ml"
  },
  {
    "id": "feed0001",
    "date": "2025-03-21",
    "planTime": "09:30 CDT",
    "actualTime": "09:30 CDT",
    "Amount": "22 ml"
  },
  {
    "id": "feed0002",
    "date": "2025-03-21",
    "planTime": "00:00 CDT",
    "actualTime": "23:45 CDT",
    "Amount": "15 ml"
  },
  {
    "id": "feed0003",
    "date": "2025-03-21",
    "planTime": "02:30 CDT",
    "actualTime": "02:00 CDT",
    "Amount": "7 ml"
  },
  {
    "id": "feed0004",
    "date": "2025-03-21",
    "planTime": "05:00 CDT",
    "actualTime": "04:45 CDT",
    "Amount": "10 ml"
  },
  {
    "id": "feed0005",
    "date": "2025-03-21",
    "planTime": "07:30 CDT",
    "actualTime": "08:00 CDT",
    "Amount": "10 ml"
  },
  {
    "id": "feed0006",
    "date": "2025-03-21",
    "planTime": "10:30 CDT",
    "actualTime": "11:30 CDT",
    "Amount": "10 ml"
  },
  {
    "id": "feed0007",
    "date": "2025-03-21",
    "planTime": "14:00 CDT",
    "actualTime": "14:25 CDT",
    "Amount": "19 ml"
  },
  {
    "id": "feed0008",
    "date": "2025-03-21",
    "planTime": "18:00 CDT",
    "actualTime": "18:00 CDT",
    "Amount": "25 ml"
  }
]

async function main() {
  console.log("Starting update of feeding data with better formatted times...")
  
  try {
    // Connect to Redis
    const client = await getRedisClient()
    console.log("✅ Connected to Redis successfully")
    
    // Save the complete updated data to Redis
    await client.set(ACTUAL_FEEDINGS_KEY, JSON.stringify(updatedFeedingsData))
    console.log(`✅ Successfully updated ${updatedFeedingsData.length} feeding records with formatted times`)
    
    // Verify the data was saved
    const savedData = await client.get(ACTUAL_FEEDINGS_KEY)
    if (savedData) {
      const parsedData = JSON.parse(savedData)
      console.log(`✅ Verified ${parsedData.length} records are now in Redis`)
      
      // Show a sample of the updated records
      console.log("Sample of updated records with formatted times:", parsedData.slice(0, 2))
    }
    
    // Close Redis connection and exit
    await closeRedisConnection()
    console.log("Redis connection closed")
    
  } catch (error) {
    console.error("❌ Error updating feeding data:", error)
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