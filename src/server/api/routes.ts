import { getAllRecommendations } from "./recommendations"

// Get all recommendations
export async function handleGetRecommendations() {
  try {
    const recommendations = await getAllRecommendations()
    return { success: true, recommendations }
  } catch (error) {
    console.error("Error getting recommendations:", error)
    return { success: false, error: "Failed to get recommendations" }
  }
} 