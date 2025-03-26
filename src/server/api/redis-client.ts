/**
 * Redis Client for Baby Bottle Planner
 * 
 * This module provides a singleton Redis client connection that's optimized
 * for both development and production environments.
 */

import { createClient } from "redis"

// Redis client singleton
let redisClient: any = null
let connectionError: Error | null = null

// Connection status tracking
let connectionAttempts = 0
const MAX_CONNECTION_ATTEMPTS = 5
const CONNECTION_TIMEOUT_MS = 5000 // Reduced to 5 seconds for serverless environments

/**
 * Gets the Redis client, creating a new connection if needed
 * Uses connection pooling to maintain a single connection across multiple serverless invocations
 */
export async function getRedisClient() {
  // If we have an active client, return it
  if (redisClient && redisClient.isReady) {
    return redisClient
  }
  
  // Reset connection attempts in serverless environment to avoid carrying over
  // state between invocations
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    connectionAttempts = 0
    connectionError = null
  }
  
  // If we've already tried to connect and failed too many times, don't keep trying
  if (connectionError && connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    console.error(`Redis connection failed after ${connectionAttempts} attempts:`, connectionError.message)
    throw new Error(`Failed to connect to Redis after ${connectionAttempts} attempts: ${connectionError.message}`)
  }

  console.log("Creating new Redis client connection...")
  connectionAttempts++
  
  try {
    // Redis connection URL - use environment variable 
    const redisUrl = process.env.REDIS_URL
    
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is not defined. Please set it in your .env file or environment variables.")
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
          // Limit reconnection attempts - more aggressive for serverless
          if (retries > 3) {
            console.error("Maximum Redis reconnection attempts reached")
            return new Error("Maximum reconnection attempts reached")
          }
          
          // Shorter backoff for serverless environments
          const delay = Math.min(Math.pow(2, retries) * 50, 2000)
          console.log(`Redis reconnect attempt ${retries}, delay: ${delay}ms`)
          return delay
        },
        // Set a shorter connection timeout for serverless
        connectTimeout: CONNECTION_TIMEOUT_MS,
      },
      // Other configuration options - critical for serverless
      disableOfflineQueue: true,
      readonly: false, // Ensure we can write
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
    
    // Connect with timeout - reduced for serverless
    const connectionPromise = redisClient.connect()
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Redis connection timed out after ${CONNECTION_TIMEOUT_MS}ms`)), 
        CONNECTION_TIMEOUT_MS)
    })
    
    await Promise.race([connectionPromise, timeoutPromise])
    console.log("Redis client connected successfully")
    
    // Ping to verify connection with shorter timeout
    const pingPromise = redisClient.ping()
    const pingTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Redis ping timed out after 2000ms`)), 2000)
    })
    
    await Promise.race([pingPromise, pingTimeoutPromise])
    console.log("Redis connection verified with PING")
    
    return redisClient
  } catch (error: any) {
    connectionError = error
    console.error("Redis connection error:", error.message)
    
    // If client was created but not fully connected, try to disconnect
    if (redisClient) {
      try {
        await redisClient.disconnect()
      } catch (disconnectError) {
        // Ignore disconnect errors
      }
      redisClient = null
    }
    
    throw new Error(`Failed to connect to Redis: ${error.message}`)
  }
}

/**
 * Closes the Redis connection if it's open
 */
export async function closeRedisConnection() {
  if (redisClient) {
    try {
      if (redisClient.isReady) {
        await redisClient.disconnect()
        console.log("Redis connection closed")
      } else {
        console.log("Redis connection was not ready, skipping disconnect")
      }
    } catch (error) {
      console.error("Error closing Redis connection:", error)
    } finally {
      redisClient = null
      connectionError = null
      connectionAttempts = 0
      console.log("Redis connection closed")
    }
  }
}

/**
 * Checks if the Redis connection is working
 * Returns true if connected, false otherwise
 */
export async function checkRedisConnection() {
  try {
    // Create connection with short timeout for checking
    const client = await getRedisClient()
    
    // Simple connection test with timeout
    const pingPromise = client.ping()
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Redis ping timed out")), 2000)
    })
    
    await Promise.race([pingPromise, timeoutPromise])
    return true
  } catch (error) {
    console.error("Redis connection check failed:", error)
    return false
  }
}

