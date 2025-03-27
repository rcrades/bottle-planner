/**
 * Redis Client for Baby Bottle Planner
 * 
 * This module provides a singleton Redis client connection that's optimized
 * for both development and production environments.
 */

import { createClient } from "redis"

// Enhanced logging with timestamps
function logWithTime(message: string, data: any = null) {
  const timestamp = new Date().toISOString()
  const logPrefix = `[${timestamp}] [Redis]`
  
  if (data) {
    console.log(logPrefix, message, JSON.stringify(data))
  } else {
    console.log(logPrefix, message)
  }
}

// Enhanced error logging
function logError(message: string, error: any) {
  const timestamp = new Date().toISOString()
  const logPrefix = `[${timestamp}] [Redis ERROR]`
  
  console.error(logPrefix, message)
  
  if (error) {
    console.error(`${logPrefix} Message:`, error.message || 'No message')
    
    if (error.code) {
      console.error(`${logPrefix} Error code:`, error.code)
    }
  }
}

// Redis client singleton
let redisClient: any = null
let connectionError: Error | null = null

// Connection status tracking
let connectionAttempts = 0
const MAX_CONNECTION_ATTEMPTS = 3
const CONNECTION_TIMEOUT_MS = 5000 // Increased to 5 seconds for more reliability

// Telemetry data for diagnosing issues
const connectionTelemetry = {
  lastConnectionAttempt: null as Date | null,
  lastSuccessfulConnection: null as Date | null,
  successfulConnections: 0,
  failedConnections: 0,
  lastSuccessfulOperation: null as Date | null,
  lastError: null as Error | null,
  errors: [] as {time: Date, message: string, code?: string}[]
}

/**
 * Gets the Redis client, creating a new connection if needed
 * Uses connection pooling to maintain a single connection across multiple serverless invocations
 */
export async function getRedisClient() {
  // Log telemetry data
  logWithTime("Redis client request telemetry", {
    successfulConnections: connectionTelemetry.successfulConnections,
    failedConnections: connectionTelemetry.failedConnections,
    lastSuccessfulConnection: connectionTelemetry.lastSuccessfulConnection,
    lastConnectionAttempt: connectionTelemetry.lastConnectionAttempt,
    errorCount: connectionTelemetry.errors.length,
    lastErrorMessage: connectionTelemetry.lastError?.message,
  })
  
  // If we have an active client, return it
  if (redisClient && redisClient.isReady) {
    logWithTime("Reusing existing Redis connection")
    return redisClient
  }
  
  // Always reset connection attempts in serverless environments 
  // This ensures we don't carry state between cold starts
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    connectionAttempts = 0
    connectionError = null
    logWithTime("Reset connection attempts for production/Vercel environment")
  }
  
  // If we've already tried to connect and failed too many times, don't keep trying
  if (connectionError && connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    logError(`Redis connection failed after ${connectionAttempts} attempts`, connectionError)
    throw new Error(`Failed to connect to Redis after ${connectionAttempts} attempts: ${connectionError.message}`)
  }

  logWithTime("Creating new Redis client connection")
  connectionAttempts++
  connectionTelemetry.lastConnectionAttempt = new Date()
  
  try {
    // Redis connection URL - use environment variable 
    const redisUrl = process.env.REDIS_URL
    
    if (!redisUrl) {
      const noUrlError = new Error("REDIS_URL environment variable is not defined")
      connectionTelemetry.lastError = noUrlError
      connectionTelemetry.errors.push({
        time: new Date(), 
        message: noUrlError.message
      })
      logError("Redis URL missing", noUrlError)
      throw noUrlError
    }
    
    logWithTime(`Connecting to Redis (Attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`, {
      environment: process.env.NODE_ENV || 'development',
      vercel: !!process.env.VERCEL,
      urlPrefix: redisUrl.substring(0, 10) + '...',
      isTls: redisUrl.startsWith('rediss://')
    })
    
    // Ensure we use TLS for production and Upstash
    const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL
    
    // Simple Redis client with minimal configuration - matches our successful test
    const clientConfig: any = {
      url: redisUrl,
      socket: {
        tls: redisUrl.startsWith('rediss://') || isProd,
        connectTimeout: CONNECTION_TIMEOUT_MS,
      }
    }
    
    // Create the client with simplified config
    redisClient = createClient(clientConfig)
    
    // Add event handlers
    redisClient.on("error", (err: Error) => {
      connectionTelemetry.lastError = err
      connectionTelemetry.errors.push({
        time: new Date(), 
        message: err.message,
        code: (err as any).code
      })
      logError("Redis client error event", err)
      connectionError = err
    })
    
    redisClient.on("connect", () => {
      logWithTime("Redis client connected event fired")
      connectionError = null
    })
    
    redisClient.on("ready", () => {
      logWithTime("Redis client ready event fired")
      connectionTelemetry.lastSuccessfulConnection = new Date()
      connectionTelemetry.successfulConnections++
    })
    
    // Connect - simple with no extra timeout race
    await redisClient.connect()
    logWithTime("Redis client connected successfully")
    
    // Verify connection with PING
    await redisClient.ping()
    logWithTime("Redis connection verified with PING")
    connectionTelemetry.lastSuccessfulOperation = new Date()
    
    return redisClient
  } catch (error: any) {
    connectionError = error
    connectionTelemetry.lastError = error
    connectionTelemetry.errors.push({
      time: new Date(), 
      message: error.message,
      code: error.code
    })
    connectionTelemetry.failedConnections++
    
    logError("Redis connection error", error)
    
    // If client was created but not fully connected, try to disconnect
    if (redisClient) {
      try {
        await redisClient.disconnect()
        logWithTime("Disconnected partially created Redis client")
      } catch (disconnectError) {
        // Ignore disconnect errors
        logError("Error disconnecting Redis client", disconnectError)
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
        logWithTime("Redis connection closed")
      } else {
        logWithTime("Redis connection was not ready, skipping disconnect")
      }
    } catch (error) {
      logError("Error closing Redis connection", error)
    } finally {
      redisClient = null
      connectionError = null
      connectionAttempts = 0
      logWithTime("Redis connection resources cleared")
    }
  }
}

/**
 * Checks if the Redis connection is working
 * Returns true if connected, false otherwise
 */
export async function checkRedisConnection() {
  try {
    logWithTime("Checking Redis connection")
    // Create connection with short timeout for checking
    const client = await getRedisClient()
    
    // For production, use a simpler check
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      logWithTime("Production Redis check - simple PING")
      await client.ping()
      logWithTime("Production Redis check successful")
      connectionTelemetry.lastSuccessfulOperation = new Date()
      return true
    }
    
    // More careful check for development
    logWithTime("Development Redis check - PING with timeout")
    const pingPromise = client.ping()
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Redis ping timed out")), 2000)
    })
    
    await Promise.race([pingPromise, timeoutPromise])
    logWithTime("Development Redis check successful")
    connectionTelemetry.lastSuccessfulOperation = new Date()
    return true
  } catch (error) {
    logError("Redis connection check failed", error)
    connectionTelemetry.lastError = error as Error
    connectionTelemetry.errors.push({
      time: new Date(), 
      message: (error as Error).message,
      code: (error as any).code
    })
    return false
  }
}

/**
 * Get Redis connection telemetry/diagnostics information
 */
export function getRedisTelemetry() {
  return {
    ...connectionTelemetry,
    // Limit error history to last 10 errors
    errors: connectionTelemetry.errors.slice(-10),
    redisClient: {
      exists: !!redisClient,
      isReady: redisClient?.isReady || false
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      VERCEL: !!process.env.VERCEL,
      REDIS_URL_PREFIX: process.env.REDIS_URL 
        ? `${process.env.REDIS_URL.substring(0, 10)}...` 
        : 'not set'
    }
  }
}

