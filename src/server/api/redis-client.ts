import { createClient } from "redis"

// Redis client singleton
let redisClient: ReturnType<typeof createClient> | null = null

export async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: "redis://default:AWVjAAIjcDE0NGM3NTE4ODdmZjE0MzE2OTZkODAyYjE5ZmVhNDQyOHAxMA@awake-kid-25955.upstash.io:6379",
      socket: {
        tls: true,
      },
    })

    redisClient.on("error", (err) => {
      console.error("Redis Client Error", err)
      redisClient = null
    })

    await redisClient.connect()
  }

  return redisClient
}

export async function closeRedisConnection() {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}

