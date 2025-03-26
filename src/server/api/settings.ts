import { getRedisClient } from "./redis-client"

const SETTINGS_KEY = "baby:settings"

export async function getSettings() {
  try {
    const client = await getRedisClient()
    const settings = await client.get(SETTINGS_KEY)

    if (!settings) {
      return null
    }

    return JSON.parse(settings)
  } catch (error) {
    console.error("Error getting settings:", error)
    throw error
  }
}

export async function saveSettings(settings: any) {
  try {
    const client = await getRedisClient()
    await client.set(SETTINGS_KEY, JSON.stringify(settings))
    return true
  } catch (error) {
    console.error("Error saving settings:", error)
    throw error
  }
}

