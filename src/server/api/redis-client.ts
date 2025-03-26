import { createClient } from "redis"

// Redis client singleton
let redisClient: ReturnType<typeof createClient> | null = null

export async function getRedisClient() {
  try {
    if (!redisClient) {
      console.log("Creating new Redis client...")
      redisClient = createClient({
        url: "redis://default:AWVjAAIjcDE0NGM3NTE4ODdmZjE0MzE2OTZkODAyYjE5ZmVhNDQyOHAxMA@awake-kid-25955.upstash.io:6379",
        socket: {
          tls: true,
          reconnectStrategy: (retries) => {
            console.log(`Reconnect attempt ${retries}`)
            if (retries > 10) {
              console.error("Max reconnection attempts reached")
              return new Error("Max reconnection attempts reached")
            }
            return Math.min(retries * 100, 3000)
          },
        },
      })

      redisClient.on("error", (err) => {
        console.error("Redis Client Error:", err)
        redisClient = null
      })

      redisClient.on("connect", () => {
        console.log("Redis client connected successfully")
      })

      redisClient.on("reconnecting", () => {
        console.log("Redis client attempting to reconnect...")
      })

      console.log("Connecting to Redis...")
      await redisClient.connect()
    }

    if (!redisClient.isOpen) {
      throw new Error("Redis client is not connected")
    }

    return redisClient
  } catch (error) {
    console.error("Error in getRedisClient:", error)
    redisClient = null
    throw error
  }
}

export async function closeRedisConnection() {
  try {
    if (redisClient) {
      console.log("Closing Redis connection...")
      await redisClient.quit()
      redisClient = null
      console.log("Redis connection closed")
    }
  } catch (error) {
    console.error("Error closing Redis connection:", error)
    redisClient = null
    throw error
  }
}

