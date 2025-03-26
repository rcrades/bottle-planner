import { getRedisClient } from "./redis-client"
import { getSettings } from "./settings"
import { nanoid } from "nanoid"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Key used to store feedings data in Redis
const FEEDINGS_KEY = "baby:feedings"

/**
 * Gets all feedings from Redis storage
 * @returns Array of feeding objects, or empty array if none found
 */
export async function getFeedings() {
  try {
    const client = await getRedisClient()
    const feedings = await client.get(FEEDINGS_KEY)

    if (!feedings) {
      return []
    }

    return JSON.parse(feedings)
  } catch (error) {
    console.error("Error getting feedings:", error)
    throw error
  }
}

export async function saveFeedings(feedings: any[]) {
  try {
    const client = await getRedisClient()
    await client.set(FEEDINGS_KEY, JSON.stringify(feedings))
    return true
  } catch (error) {
    console.error("Error saving feedings:", error)
    throw error
  }
}

export async function updateFeeding(feedingId: string, isCompleted: boolean) {
  try {
    const feedings = await getFeedings()
    const updatedFeedings = feedings.map((feeding: any) =>
      feeding.id === feedingId ? { ...feeding, isCompleted } : feeding,
    )

    await saveFeedings(updatedFeedings)
    return true
  } catch (error) {
    console.error("Error updating feeding:", error)
    throw error
  }
}

/**
 * Plans the next 10 feedings using the OpenAI API or falls back to a rule-based approach
 * @returns Array of feeding plan objects
 */
export async function planFeedings() {
  try {
    const settings = await getSettings()
    if (!settings) {
      console.error("Settings not found, cannot plan feedings")
      throw new Error("Settings not found")
    }

    // Get current feedings to use as context
    const currentFeedings = await getFeedings()
    console.log("Planning feedings with current settings:", JSON.stringify(settings, null, 2))

    try {
      // Use AI SDK to generate the feeding plan
      console.log("Generating feeding plan with AI...")
      const prompt = generateFeedingPrompt(settings, currentFeedings)
      console.log("Using prompt:", prompt)
      
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: prompt,
        maxTokens: 1000,
      })
      
      console.log("AI response received:", text.substring(0, 100) + "...")

      // Parse the AI response
      const feedingPlan = parseFeedingPlan(text, settings)
      console.log("Feeding plan parsed successfully:", feedingPlan.length, "feedings planned")

      // Save the new feeding plan
      await saveFeedings(feedingPlan)
      console.log("Feeding plan saved to Redis")

      return feedingPlan
    } catch (aiError: unknown) {
      console.error("Error using AI to plan feedings:", aiError)
      console.error("Error details:", aiError instanceof Error ? aiError.stack : "No stack trace available")
      console.log("Falling back to rule-based approach...")
      
      // If AI generation fails, use the fallback plan
      const fallbackPlan = generateFallbackPlan(settings)
      console.log("Generated fallback plan with", fallbackPlan.length, "feedings")
      await saveFeedings(fallbackPlan)
      
      return fallbackPlan
    }
  } catch (error: unknown) {
    console.error("Error planning feedings:", error)
    console.error("Error details:", error instanceof Error ? error.stack : "No stack trace available")
    throw error
  }
}

function generateFeedingPrompt(settings: any, currentFeedings: any[]) {
  const now = new Date()
  const formattedDate = now.toISOString()

  return `
    You are a baby feeding planner assistant. I need you to create a feeding schedule for the next 10 feedings.
    
    Current time: ${formattedDate}
    
    Feeding settings:
    - Minimum time between feedings: ${settings.feedWindows.min} hours
    - Maximum time between feedings: ${settings.feedWindows.max} hours
    - Ideal time between feedings: ${settings.feedWindows.ideal} hours
    - Minimum feeding amount: ${settings.feedAmounts.min} oz
    - Maximum feeding amount: ${settings.feedAmounts.max} oz
    - Target feeding amount: ${settings.feedAmounts.target} oz
    
    ${
      settings.lockedFeedings.enabled
        ? `
    Locked feedings (these must be included):
    ${settings.lockedFeedings.times.map((time: string) => `- ${time}`).join("\n")}
    `
        : "No locked feedings."
    }
    
    ${
      currentFeedings.length > 0
        ? `
    Recent feedings:
    ${currentFeedings
      .slice(0, 5)
      .map((feeding: any) => `- Time: ${feeding.time}, Amount: ${feeding.amount} oz, Completed: ${feeding.isCompleted}`)
      .join("\n")}
    `
        : "No recent feedings."
    }
    
    Please generate a feeding schedule with the following format for each feeding:
    1. Time in 24-hour format (HH:MM)
    2. Amount in oz (decimal allowed)
    3. Whether it's a locked feeding
    
    Return the schedule as a JSON array with objects containing time, amount, and isLocked properties.
  `
}

function parseFeedingPlan(aiResponse: string, settings: any) {
  try {
    // Extract JSON from the AI response
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("Could not parse AI response")
    }

    const feedingData = JSON.parse(jsonMatch[0])

    // Process the feeding data
    return feedingData.map((feeding: any) => ({
      id: nanoid(),
      time: feeding.time,
      amount: feeding.amount,
      isLocked: feeding.isLocked,
      isCompleted: false,
    }))
  } catch (error) {
    console.error("Error parsing AI response:", error)

    // Fallback: Generate a basic feeding plan
    return generateFallbackPlan(settings)
  }
}

function generateFallbackPlan(settings: any) {
  const feedings = []
  const now = new Date()
  let currentTime = now

  // Add locked feedings if enabled
  if (settings.lockedFeedings.enabled) {
    for (const timeString of settings.lockedFeedings.times) {
      const [hours, minutes] = timeString.split(":").map(Number)
      const feedingTime = new Date(now)
      feedingTime.setHours(hours, minutes, 0, 0)

      // If the time has passed today, set it for tomorrow
      if (feedingTime < now) {
        feedingTime.setDate(feedingTime.getDate() + 1)
      }

      feedings.push({
        id: nanoid(),
        time: timeString,
        amount: settings.feedAmounts.target,
        isLocked: true,
        isCompleted: false,
      })
    }
  }

  // Add regular feedings to reach 10 total
  while (feedings.length < 10) {
    currentTime = new Date(currentTime.getTime() + settings.feedWindows.ideal * 60 * 60 * 1000)

    const hours = currentTime.getHours().toString().padStart(2, "0")
    const minutes = currentTime.getMinutes().toString().padStart(2, "0")
    const timeString = `${hours}:${minutes}`

    // Check if this time conflicts with a locked feeding
    const isTimeConflict = feedings.some((feeding) => feeding.time === timeString)

    if (!isTimeConflict) {
      feedings.push({
        id: nanoid(),
        time: timeString,
        amount: settings.feedAmounts.target,
        isLocked: false,
        isCompleted: false,
      })
    }
  }

  // Sort feedings by time
  return feedings.sort((a, b) => {
    const [aHours, aMinutes] = a.time.split(":").map(Number)
    const [bHours, bMinutes] = b.time.split(":").map(Number)

    return aHours * 60 + aMinutes - (bHours * 60 + bMinutes)
  })
}

