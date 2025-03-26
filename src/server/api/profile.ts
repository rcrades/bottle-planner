import { getRedisClient } from "./redis-client"
import { getProfile as getProfileFromRecommendations, updateProfile } from "./recommendations"

// Re-export the getProfile function
export const getProfile = getProfileFromRecommendations

export async function handleGetProfile() {
  try {
    const profile = await getProfile()
    return { success: true, profile }
  } catch (error) {
    console.error("Failed to get newborn profile:", error)
    return { success: false, message: "Failed to get newborn profile" }
  }
}

export async function handleUpdateProfile(birthDate: string) {
  try {
    if (!birthDate) {
      return { success: false, message: "Birth date is required" }
    }

    const profile = await updateProfile(birthDate)
    return { success: true, profile }
  } catch (error) {
    console.error("Failed to update newborn profile:", error)
    return { success: false, message: "Failed to update newborn profile" }
  }
} 