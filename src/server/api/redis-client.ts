import { createClient } from "redis"

// Redis client singleton
let redisClient: any = null

export async function getRedisClient() {
  if (redisClient && redisClient.isReady) {
    return redisClient
  }

  try {
    console.log("Creating new Redis client...")
    
    // Redis connection URL - use environment variable or fallback to default
    const redisUrl = process.env.REDIS_URL || "redis://default:AWVjAAIjcDE0NGM3NTE4ODdmZjE0MzE2OTZkODAyYjE5ZmVhNDQyOHAxMA@awake-kid-25955.upstash.io:6379"
    
    console.log("Connecting to Redis...")
    
    // Create Redis client with connection retry strategy
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          // Exponential backoff with a max delay of 10 seconds
          const delay = Math.min(Math.pow(2, retries) * 100, 10000)
          console.log(`Redis reconnect attempt ${retries}, delay: ${delay}ms`)
          return delay
        }
      }
    })

    // Add error handler
    redisClient.on("error", (err: Error) => {
      console.error("Redis client error:", err)
      // Don't throw here - just log the error for monitoring
    })

    // Connect to Redis
    await redisClient.connect()
    console.log("Redis client connected successfully")
    
    return redisClient
  } catch (error) {
    console.error("Failed to create Redis client:", error)
    
    // In production, return a mock client that won't crash the app
    if (process.env.NODE_ENV === "production") {
      console.warn("Using mock Redis client for production fallback")
      return createMockRedisClient()
    }
    
    throw error
  }
}

// Mock Redis client for production fallbacks
function createMockRedisClient() {
  const mockData = new Map()
  
  return {
    isReady: true,
    get: async (key: string) => {
      console.log(`[MOCK REDIS] Getting key: ${key}`)
      return mockData.get(key) || null
    },
    set: async (key: string, value: string) => {
      console.log(`[MOCK REDIS] Setting key: ${key}`)
      mockData.set(key, value)
      return "OK"
    },
    disconnect: async () => {
      console.log("[MOCK REDIS] Disconnected")
    }
  }
}

export async function closeRedisConnection() {
  if (redisClient && redisClient.isReady) {
    try {
      await redisClient.disconnect()
      console.log("Redis connection closed")
    } catch (error) {
      console.error("Error closing Redis connection:", error)
    }
  }
}

