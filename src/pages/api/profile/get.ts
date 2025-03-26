import { getProfile } from "../../../server/api/recommendations"

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" })
  }

  try {
    console.log("Fetching profile from Redis...")
    const profile = await getProfile()
    console.log("Profile fetched:", profile)
    
    return res.status(200).json({ 
      success: true, 
      profile 
    })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch profile" 
    })
  }
} 