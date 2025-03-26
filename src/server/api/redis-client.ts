/**
 * Redis Client for Baby Bottle Planner
 * 
 * This module provides a singleton Redis client connection that's optimized
 * for both development and production (Vercel serverless) environments.
 */

import { createClient } from "redis"

// Redis client singleton
let redisClient: any = null
let connectionError: Error | null = null

// Connection status tracking
let connectionAttempts = 0
const MAX_CONNECTION_ATTEMPTS = 5

/**
 * Gets the Redis client, creating a new connection if needed
 * Uses connection pooling to maintain a single connection across multiple serverless invocations
 */
export async function getRedisClient() {
  // If we have an active client, return it
  if (redisClient && redisClient.isReady) {
    return redisClient
  }
  
  // If we've already tried to connect and failed, don't keep trying
  if (connectionError && connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    console.error(`Redis connection failed after ${connectionAttempts} attempts:`, connectionError.message)
    throw connectionError
  }

  console.log("Creating new Redis client connection...")
  connectionAttempts++
  
  try {
    // Redis connection URL - use environment variable or fallback to default
    const redisUrl = process.env.REDIS_URL || "redis://default:AWVjAAIjcDE0NGM3NTE4ODdmZjE0MzE2OTZkODAyYjE5ZmVhNDQyOHAxMA@awake-kid-25955.upstash.io:6379"
    
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is not defined")
    }
    
    console.log(`Connecting to Redis (Attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})...`)
    
    // Determine if we need TLS
    const isTLS = redisUrl.startsWith("rediss://") || 
                redisUrl.includes("upstash.io") ||
                process.env.NODE_ENV === "production"
    
    // Create Redis client with connection retry strategy
    redisClient = createClient({
      url: redisUrl,
      socket: {
        tls: isTLS,
        reconnectStrategy: (retries: number) => {
          // Don't try to reconnect more than 5 times in serverless environments
          if (process.env.VERCEL && retries > 5) {
            console.error("Maximum Redis reconnection attempts reached in serverless environment")
            return new Error("Maximum reconnection attempts reached")
          }
          
          // Exponential backoff with a max delay of 10 seconds
          const delay = Math.min(Math.pow(2, retries) * 100, 10000)
          console.log(`Redis reconnect attempt ${retries}, delay: ${delay}ms`)
          return delay
        },
        // Set a connection timeout for serverless functions
        connectTimeout: process.env.VERCEL ? 5000 : 10000,
      },
      // Set reasonable timeouts for serverless environments
      disableOfflineQueue: process.env.VERCEL ? true : false,
    })
    
    // Add event handlers
    redisClient.on("error", (err: Error) => {
      console.error("Redis client error:", err.message)
      connectionError = err
    })
    
    redisClient.on("connect", () => {
      console.log("Redis client connected")
      connectionError = null
    })
    
    redisClient.on("reconnecting", () => {
      console.log("Redis client reconnecting...")
    })
    
    redisClient.on("ready", () => {
      console.log("Redis client ready")
    })
    
    // Connect to Redis
    await redisClient.connect()
    console.log("Redis client connected successfully")
    
    // Ping to verify connection
    await redisClient.ping()
    console.log("Redis connection verified with PING")
    
    return redisClient
  } catch (error: any) {
    connectionError = error
    console.error("Redis connection error:", error.message)
    throw error
  }
}

/**
 * Closes the Redis connection if it's open
 */
export async function closeRedisConnection() {
  if (redisClient && redisClient.isReady) {
    try {
      await redisClient.disconnect()
      redisClient = null
      connectionError = null
      connectionAttempts = 0
      console.log("Redis connection closed")
    } catch (error) {
      console.error("Error closing Redis connection:", error)
    }
  }
}

/**
 * Checks if the Redis connection is working
 * Returns true if connected, false otherwise
 */
export async function checkRedisConnection() {
  try {
    const client = await getRedisClient()
    await client.ping()
    return true
  } catch (error) {
    console.error("Redis connection check failed:", error)
    return false
  }
}

