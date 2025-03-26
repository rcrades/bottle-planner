import { getRedisClient } from "./redis-client"
import { getSettings } from "./settings"
import { nanoid } from "nanoid"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Keys used to store feedings data in Redis
const PLANNED_FEEDINGS_KEY = "baby:plannedFeedings"
const ACTUAL_FEEDINGS_KEY = "baby:actualFeedings"

// Types for our feeding data structures
export interface PlannedFeeding {
  id: string
  time: string
  amount: number
  isLocked: boolean
  isCompleted: boolean
}

export interface ActualFeeding {
  id: string
  date: string
  time?: string
  actualTime: string
  planTime: string
  amount?: number
  Amount?: string
  notes?: string
}

/**
 * Gets all planned feedings from Redis storage
 * @returns Array of planned feeding objects, or empty array if none found
 */
export async function getPlannedFeedings() {
  try {
    const client = await getRedisClient()
    const feedings = await client.get(PLANNED_FEEDINGS_KEY)

    if (!feedings) {
      return []
    }

    return JSON.parse(feedings)
  } catch (error) {
    console.error("Error getting planned feedings:", error)
    throw error
  }
}

/**
 * Gets all feedings from Redis storage (for backward compatibility)
 * @returns Array of feeding objects, or empty array if none found
 */
export async function getFeedings() {
  return getPlannedFeedings()
}

/**
 * Gets all actual feedings from Redis storage
 * @returns Array of actual feeding objects, or empty array if none found
 */
export async function getActualFeedings() {
  try {
    const client = await getRedisClient()
    const feedings = await client.get(ACTUAL_FEEDINGS_KEY)

    if (!feedings) {
      return []
    }

    return JSON.parse(feedings)
  } catch (error) {
    console.error("Error getting actual feedings:", error)
    throw error
  }
}

/**
 * Saves planned feedings to Redis
 * @param feedings Array of planned feeding objects
 * @returns true if successful
 */
export async function savePlannedFeedings(feedings: PlannedFeeding[]) {
  try {
    const client = await getRedisClient()
    await client.set(PLANNED_FEEDINGS_KEY, JSON.stringify(feedings))
    return true
  } catch (error) {
    console.error("Error saving planned feedings:", error)
    throw error
  }
}

/**
 * Saves feedings to Redis (for backward compatibility)
 * @param feedings Array of feeding objects
 * @returns true if successful
 */
export async function saveFeedings(feedings: any[]) {
  return savePlannedFeedings(feedings)
}

/**
 * Saves actual feedings to Redis
 * @param feedings Array of actual feeding objects
 * @returns true if successful
 */
export async function saveActualFeedings(feedings: ActualFeeding[]) {
  try {
    const client = await getRedisClient()
    await client.set(ACTUAL_FEEDINGS_KEY, JSON.stringify(feedings))
    return true
  } catch (error) {
    console.error("Error saving actual feedings:", error)
    throw error
  }
}

/**
 * Adds a new actual feeding record
 * @param feeding The actual feeding data to add
 * @returns The updated list of actual feedings
 */
export async function addActualFeeding(feeding: Omit<ActualFeeding, "id">) {
  try {
    const actualFeedings = await getActualFeedings()
    
    // Transform data if needed - handle both formats
    const newFeeding: ActualFeeding = {
      id: nanoid(),
      ...feeding,
      // If Amount is provided as string but amount isn't, try to parse
      amount: feeding.amount || (feeding.Amount ? parseFloat(feeding.Amount.replace(/[^\d.-]/g, '')) : undefined),
      // If time isn't provided but actualTime is, use that
      time: feeding.time || feeding.actualTime
    }
    
    const updatedFeedings = [...actualFeedings, newFeeding]
    await saveActualFeedings(updatedFeedings)
    
    return updatedFeedings
  } catch (error) {
    console.error("Error adding actual feeding:", error)
    throw error
  }
}

/**
 * Updates an existing actual feeding record
 * @param id ID of the feeding to update
 * @param updatedData Updated feeding data
 * @returns The updated list of actual feedings
 */
export async function updateActualFeeding(id: string, updatedData: Partial<Omit<ActualFeeding, "id">>) {
  try {
    const actualFeedings = await getActualFeedings()
    
    // Transform data if needed
    const processedData = { ...updatedData }
    
    // If Amount is provided as string but amount isn't, try to parse
    if (processedData.Amount && !processedData.amount) {
      processedData.amount = parseFloat(processedData.Amount.replace(/[^\d.-]/g, ''))
    }
    
    // If time isn't provided but actualTime is, use that
    if (processedData.actualTime && !processedData.time) {
      processedData.time = processedData.actualTime
    }
    
    const updatedFeedings = actualFeedings.map((feeding: ActualFeeding) => 
      feeding.id === id ? { ...feeding, ...processedData } : feeding
    )
    
    await saveActualFeedings(updatedFeedings)
    return updatedFeedings
  } catch (error) {
    console.error("Error updating actual feeding:", error)
    throw error
  }
}

/**
 * Removes an actual feeding record
 * @param id ID of the feeding to remove
 * @returns The updated list of actual feedings
 */
export async function removeActualFeeding(id: string) {
  try {
    const actualFeedings = await getActualFeedings()
    const updatedFeedings = actualFeedings.filter((feeding: ActualFeeding) => feeding.id !== id)
    
    await saveActualFeedings(updatedFeedings)
    return updatedFeedings
  } catch (error) {
    console.error("Error removing actual feeding:", error)
    throw error
  }
}

/**
 * Updates a planned feeding completion status
 * @param feedingId ID of the feeding to update
 * @param isCompleted New completion status
 * @returns true if successful
 */
export async function updateFeeding(feedingId: string, isCompleted: boolean) {
  try {
    const feedings = await getPlannedFeedings()
    const updatedFeedings = feedings.map((feeding: PlannedFeeding) =>
      feeding.id === feedingId ? { ...feeding, isCompleted } : feeding,
    )

    await savePlannedFeedings(updatedFeedings)
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

