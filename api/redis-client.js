// Simple Redis client for Vercel API
const redis = require('redis');

// Basic logging function
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}]`, message, JSON.stringify(data));
  } else {
    console.log(`[${timestamp}]`, message);
  }
}

// Redis client singleton
let redisClient = null;

/**
 * Gets the Redis client, creating a new connection if needed
 */
async function getRedisClient() {
  // If we have an active client, return it
  if (redisClient && redisClient.isReady) {
    log("Reusing existing Redis connection");
    return redisClient;
  }

  log("Creating new Redis client connection");
  
  try {
    // Redis connection URL - use environment variable 
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is not defined");
    }
    
    log("Connecting to Redis", {
      environment: process.env.NODE_ENV || 'development',
      vercel: !!process.env.VERCEL,
      urlPrefix: redisUrl.substring(0, 10) + '...'
    });
    
    // Ensure we use TLS for production
    const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL;
    
    // Simple Redis client with minimal configuration
    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        tls: redisUrl.startsWith('rediss://') || isProd,
        connectTimeout: 5000,
      }
    });
    
    // Add event handlers
    redisClient.on("error", (err) => {
      console.error("[Redis ERROR]", err.message);
    });
    
    // Connect
    await redisClient.connect();
    log("Redis client connected successfully");
    
    // Verify connection with PING
    await redisClient.ping();
    log("Redis connection verified with PING");
    
    return redisClient;
  } catch (error) {
    console.error("Redis connection error:", error.message);
    
    // If client was created but not fully connected, try to disconnect
    if (redisClient) {
      try {
        await redisClient.disconnect();
        log("Disconnected partially created Redis client");
      } catch (disconnectError) {
        // Ignore disconnect errors
      }
      redisClient = null;
    }
    
    throw new Error(`Failed to connect to Redis: ${error.message}`);
  }
}

/**
 * Closes the Redis connection if it's open
 */
async function closeRedisConnection() {
  if (redisClient) {
    try {
      if (redisClient.isReady) {
        await redisClient.disconnect();
        log("Redis connection closed");
      }
    } catch (error) {
      console.error("Error closing Redis connection:", error.message);
    } finally {
      redisClient = null;
    }
  }
}

// Export functions
module.exports = {
  getRedisClient,
  closeRedisConnection
}; 