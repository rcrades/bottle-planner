/**
 * This script deletes the deprecated 'baby:feedings' Redis key
 * Run with: npx tsx src/scripts/delete-old-data.ts
 * 
 * After migrating to separate 'baby:plannedFeedings' and 'baby:actualFeedings' keys,
 * the original 'baby:feedings' key is no longer needed and can be safely deleted.
 */

import { getRedisClient, closeRedisConnection } from "../server/api/redis-client"
import 'dotenv/config'

// The deprecated key we want to remove
const DEPRECATED_FEEDINGS_KEY = "baby:feedings"

async function main() {
  console.log("Starting cleanup of deprecated Redis keys...")
  
  try {
    // Connect to Redis
    const client = await getRedisClient()
    console.log("✅ Connected to Redis successfully")
    
    // Check if the deprecated key exists
    const keyExists = await client.exists(DEPRECATED_FEEDINGS_KEY)
    
    if (keyExists) {
      console.log(`Found deprecated key: ${DEPRECATED_FEEDINGS_KEY}`)
      
      // Get the data before deleting (for backup purposes)
      const oldData = await client.get(DEPRECATED_FEEDINGS_KEY)
      console.log(`Backing up data from ${DEPRECATED_FEEDINGS_KEY} before deletion:`)
      console.log(oldData)
      
      // Delete the key
      await client.del(DEPRECATED_FEEDINGS_KEY)
      console.log(`✅ Successfully deleted ${DEPRECATED_FEEDINGS_KEY}`)
    } else {
      console.log(`Key ${DEPRECATED_FEEDINGS_KEY} does not exist. Nothing to delete.`)
    }
    
    // Verify the key is gone
    const keyStillExists = await client.exists(DEPRECATED_FEEDINGS_KEY)
    if (!keyStillExists) {
      console.log(`✅ Confirmed ${DEPRECATED_FEEDINGS_KEY} has been removed`)
    } else {
      console.error(`❌ Failed to delete ${DEPRECATED_FEEDINGS_KEY}`)
    }
    
    // Close Redis connection and exit
    await closeRedisConnection()
    console.log("Redis connection closed")
    
  } catch (error) {
    console.error("❌ Error during cleanup:", error)
    await closeRedisConnection()
    process.exit(1)
  }
}

// Run the cleanup process
main().catch(async (error) => {
  console.error("❌ Unhandled error in cleanup process:", error)
  await closeRedisConnection()
  process.exit(1)
}) 