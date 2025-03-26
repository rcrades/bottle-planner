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
const MAX_CONNECTION_ATTEMPTS = 3  // Reduced for faster fallbacks in production
const CONNECTION_TIMEOUT_MS = 3000 // Reduced to 3 seconds for faster response

/**
 * Gets the Redis client, creating a new connection if needed
 * Uses connection pooling to maintain a single connection across multiple serverless invocations
 */
export async function getRedisClient() {
  // If we have an active client, return it
  if (redisClient && redisClient.isReady) {
    return redisClient
  }
  
  // Always reset connection attempts in serverless environments 
  // This ensures we don't carry state between cold starts
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
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
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}, Vercel: ${!!process.env.VERCEL}`)
    
    // Ensure we use TLS for production and Upstash
    // Force TLS in production, regardless of URL
    const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL
    const isUpstash = redisUrl.includes("upstash.io")
    const forceTLS = isProd || isUpstash

    // Create a URL with forced TLS if needed, but preserving original credentials
    let connectionUrl = redisUrl
    if (forceTLS && redisUrl.startsWith('redis://')) {
      connectionUrl = redisUrl.replace('redis://', 'rediss://')
      console.log("Forced TLS connection for production/Upstash")
    }
    
    // Create Redis client with optimized settings for serverless
    const clientConfig: any = {
      url: connectionUrl,
      socket: {
        tls: forceTLS,
        reconnectStrategy: (retries: number) => {
          // Very limited reconnections for serverless
          if (retries > 1) {
            console.error("Maximum Redis reconnection attempts reached")
            return new Error("Maximum reconnection attempts reached")
          }
          
          // Minimal backoff for serverless
          const delay = 300
          console.log(`Redis reconnect attempt ${retries}, delay: ${delay}ms`)
          return delay
        },
        connectTimeout: CONNECTION_TIMEOUT_MS,
      },
      // Critical settings for serverless
      disableOfflineQueue: true,
      readonly: false,
      commandsQueueMaxLength: 1, // Minimal queue for serverless
    }
    
    // For Upstash in production environments, add special configurations
    if (isUpstash && isProd) {
      clientConfig.password = connectionUrl.split('@')[0].split(':').pop()
      clientConfig.socket.keepAlive = false // Disable for serverless
      console.log("Using optimized Upstash production configurations")
    }
    
    // Create the client
    redisClient = createClient(clientConfig)
    
    // Add event handlers
    redisClient.on("error", (err: Error) => {
      console.error("Redis client error:", err.message)
      connectionError = err
    })
    
    redisClient.on("connect", () => {
      console.log("Redis client connected")
      connectionError = null
    })
    
    redisClient.on("ready", () => {
      console.log("Redis client ready")
    })
    
    // Connect with timeout - extremely short for serverless
    const connectionPromise = redisClient.connect()
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Redis connection timed out after ${CONNECTION_TIMEOUT_MS}ms`)), 
        CONNECTION_TIMEOUT_MS)
    })
    
    await Promise.race([connectionPromise, timeoutPromise])
    console.log("Redis client connected successfully")
    
    // Simple ping without extra timeout in production
    if (isProd) {
      await redisClient.ping()
    } else {
      // More careful verification in development
      const pingPromise = redisClient.ping()
      const pingTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Redis ping timed out after 2000ms`)), 2000)
      })
      await Promise.race([pingPromise, pingTimeoutPromise])
    }
    
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
    
    // For production, use a simpler check
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      await client.ping()
      return true
    }
    
    // More careful check for development
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

