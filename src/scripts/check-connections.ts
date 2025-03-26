/**
 * This script checks Redis connections and verifies all required keys exist
 * Run with: npx tsx src/scripts/check-connections.ts
 */

import { getRedisClient, closeRedisConnection } from "../server/api/redis-client"
import 'dotenv/config'

// All Redis keys used in the application
const REDIS_KEYS = {
  PROFILE: "baby:profile",
  RECOMMENDATIONS: "baby:recommendations",
  SETTINGS: "baby:settings",
  PLANNED_FEEDINGS: "baby:plannedFeedings",
  ACTUAL_FEEDINGS: "baby:actualFeedings"
};

async function main() {
  console.log("=== CONNECTION DIAGNOSTIC TOOL ===")
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  
  try {
    // 1. Basic Redis connection check
    console.log("\n1. Checking Redis connection...")
    console.log(`Redis URL: ${process.env.REDIS_URL || 'Not set - using defaults'}`)
    
    const startTime = Date.now()
    const client = await getRedisClient()
    const connectionTime = Date.now() - startTime
    
    console.log(`✅ Redis connected successfully in ${connectionTime}ms`)
    
    // 2. Check Redis PING
    console.log("\n2. Testing Redis PING...")
    const pingStartTime = Date.now()
    await client.ping()
    const pingTime = Date.now() - pingStartTime
    console.log(`✅ Redis PING successful in ${pingTime}ms`)
    
    // 3. Check all required keys exist
    console.log("\n3. Checking required Redis keys...")
    
    for (const [keyName, keyValue] of Object.entries(REDIS_KEYS)) {
      process.stdout.write(`Checking ${keyName} (${keyValue})... `)
      
      const exists = await client.exists(keyValue)
      if (exists) {
        const value = await client.get(keyValue)
        const dataSize = value ? value.length : 0
        console.log(`✅ EXISTS (${dataSize} bytes)`)
        
        // For actual feedings, check the content format
        if (keyValue === REDIS_KEYS.ACTUAL_FEEDINGS && value) {
          try {
            const parsedValue = JSON.parse(value)
            console.log(`   - Contains ${parsedValue.length} feeding records`)
            if (parsedValue.length > 0) {
              const sample = parsedValue[0]
              console.log(`   - Sample record fields: ${Object.keys(sample).join(', ')}`)
              
              // Check if it has the required fields
              const hasRequiredFields = sample.id && 
                (sample.actualTime || sample.time) && 
                sample.date && 
                (sample.amount !== undefined || sample.Amount !== undefined)
              
              if (hasRequiredFields) {
                console.log(`   - ✅ Sample record has required fields`)
              } else {
                console.log(`   - ❌ WARNING: Sample record missing required fields`)
                console.log(`   - Sample record: ${JSON.stringify(sample, null, 2)}`)
              }
            }
          } catch (parseError) {
            console.log(`   - ❌ ERROR: Invalid JSON data`)
          }
        }
      } else {
        console.log(`❌ MISSING`)
      }
    }
    
    // 4. Check Redis memory usage
    console.log("\n4. Checking Redis memory usage...")
    try {
      const info = await client.info("memory")
      const usedMemoryMatch = info.match(/used_memory_human:(.+)/)
      if (usedMemoryMatch) {
        console.log(`✅ Redis memory usage: ${usedMemoryMatch[1].trim()}`)
      } else {
        console.log(`❓ Unable to parse Redis memory info`)
        console.log(info)
      }
    } catch (memoryError) {
      console.log(`❌ Unable to get Redis memory info: ${memoryError}`)
    }
    
    // 5. Test basic write operation
    console.log("\n5. Testing basic write operation...")
    const testKey = "diagnostic:test"
    const testValue = `test_${Date.now()}`
    
    try {
      await client.set(testKey, testValue)
      const readBack = await client.get(testKey)
      
      if (readBack === testValue) {
        console.log(`✅ Write test successful`)
      } else {
        console.log(`❌ Write test failed: wrote "${testValue}" but read "${readBack}"`)
      }
      
      // Clean up
      await client.del(testKey)
    } catch (writeError) {
      console.log(`❌ Write test failed: ${writeError}`)
    }
    
    // Summary
    console.log("\n=== DIAGNOSTIC SUMMARY ===")
    console.log("Redis connection: ✅ WORKING")
    const missingKeys = Object.entries(REDIS_KEYS)
      .filter(async ([_, keyValue]) => !(await client.exists(keyValue)))
      .map(([keyName]) => keyName)
    
    if (missingKeys.length > 0) {
      console.log(`Missing keys: ${missingKeys.join(', ')}`)
      console.log("Run 'npx tsx src/scripts/init-all.ts' to initialize missing data")
    } else {
      console.log("All required Redis keys: ✅ PRESENT")
    }
    
    console.log("\nTo fix any issues with missing or corrupted data, run:")
    console.log("npx tsx src/scripts/init-all.ts")
    
    // Close Redis connection
    await closeRedisConnection()
    console.log("\nDiagnostic check complete.")
    
  } catch (error) {
    console.error("\n❌ DIAGNOSTIC FAILED:")
    console.error(error)
    
    console.log("\nPossible solutions:")
    console.log("1. Check if Redis is running")
    console.log("2. Verify REDIS_URL environment variable is correct")
    console.log("3. Check network connectivity to Redis")
    console.log("4. Run 'npx tsx src/scripts/init-all.ts' to reinitialize data")
    console.log("5. Restart the application with 'sh dev-setup.sh'")
    
    await closeRedisConnection()
    process.exit(1)
  }
}

// Run the diagnostic process
main().catch(async (error) => {
  console.error("❌ Unhandled error in diagnostic process:", error)
  await closeRedisConnection()
  process.exit(1)
}) 