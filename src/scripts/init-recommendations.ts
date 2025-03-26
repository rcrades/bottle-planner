import { initializeRecommendations } from "../server/api/recommendations"

async function main() {
  try {
    const result = await initializeRecommendations()
    console.log("Success:", result.message)
    process.exit(0)
  } catch (error) {
    console.error("Failed to initialize recommendations:", error)
    process.exit(1)
  }
}

main() 