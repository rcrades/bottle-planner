import { getAllRecommendations } from "../../../server/api/recommendations"

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" })
  }

  try {
    console.log("Fetching recommendations from Redis...")
    const recommendations = await getAllRecommendations()
    console.log("Recommendations fetched:", recommendations)
    
    return res.status(200).json({ 
      success: true, 
      recommendations 
    })
  } catch (error) {
    console.error("Error fetching recommendations:", error)
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch recommendations" 
    })
  }
} 