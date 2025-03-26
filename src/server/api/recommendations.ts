import { getRedisClient } from "./redis-client"

// Types for feeding recommendations
export interface FeedingRecommendation {
  date: string
  ageInDays: number
  feedingFrequency: {
    minHours: number
    maxHours: number
  }
  amountPerFeeding: {
    minOz: number
    maxOz: number
    minMl: number
    maxMl: number
  }
  dailyIntake: {
    minOz: number
    maxOz: number
    minMl: number
    maxMl: number
  }
}

export interface NewbornProfile {
  birthDate: string // ISO date string
  ageInDays: number
  currentRecommendation: FeedingRecommendation
}

const NEWBORN_PROFILE_KEY = "baby:profile"
const RECOMMENDATIONS_KEY = "baby:recommendations"

// Default feeding recommendations data
const defaultRecommendations: FeedingRecommendation[] = [
  {
    date: "2025-03-24",
    ageInDays: 5,
    feedingFrequency: { minHours: 2, maxHours: 3 },
    amountPerFeeding: { minOz: 1.5, maxOz: 2, minMl: 45, maxMl: 60 },
    dailyIntake: { minOz: 16, maxOz: 20, minMl: 480, maxMl: 600 }
  },
  {
    date: "2025-03-25",
    ageInDays: 6,
    feedingFrequency: { minHours: 2, maxHours: 3 },
    amountPerFeeding: { minOz: 1.5, maxOz: 2, minMl: 45, maxMl: 60 },
    dailyIntake: { minOz: 16, maxOz: 20, minMl: 480, maxMl: 600 }
  },
  {
    date: "2025-03-26",
    ageInDays: 7,
    feedingFrequency: { minHours: 2, maxHours: 3 },
    amountPerFeeding: { minOz: 2, maxOz: 2, minMl: 60, maxMl: 60 },
    dailyIntake: { minOz: 18, maxOz: 20, minMl: 540, maxMl: 600 }
  },
  {
    date: "2025-03-27",
    ageInDays: 8,
    feedingFrequency: { minHours: 2, maxHours: 3 },
    amountPerFeeding: { minOz: 2, maxOz: 2, minMl: 60, maxMl: 60 },
    dailyIntake: { minOz: 18, maxOz: 20, minMl: 540, maxMl: 600 }
  },
  {
    date: "2025-03-28",
    ageInDays: 9,
    feedingFrequency: { minHours: 2, maxHours: 3 },
    amountPerFeeding: { minOz: 2, maxOz: 2.5, minMl: 60, maxMl: 75 },
    dailyIntake: { minOz: 18, maxOz: 22, minMl: 540, maxMl: 660 }
  },
  {
    date: "2025-03-29",
    ageInDays: 10,
    feedingFrequency: { minHours: 2, maxHours: 3 },
    amountPerFeeding: { minOz: 2, maxOz: 2.5, minMl: 60, maxMl: 75 },
    dailyIntake: { minOz: 18, maxOz: 22, minMl: 540, maxMl: 660 }
  },
  {
    date: "2025-03-30",
    ageInDays: 11,
    feedingFrequency: { minHours: 2, maxHours: 3 },
    amountPerFeeding: { minOz: 2, maxOz: 2.5, minMl: 60, maxMl: 75 },
    dailyIntake: { minOz: 18, maxOz: 22, minMl: 540, maxMl: 660 }
  },
  {
    date: "2025-03-31",
    ageInDays: 12,
    feedingFrequency: { minHours: 2, maxHours: 3 },
    amountPerFeeding: { minOz: 2.5, maxOz: 2.5, minMl: 75, maxMl: 75 },
    dailyIntake: { minOz: 20, maxOz: 24, minMl: 600, maxMl: 720 }
  },
  {
    date: "2025-04-01",
    ageInDays: 13,
    feedingFrequency: { minHours: 2, maxHours: 3 },
    amountPerFeeding: { minOz: 2.5, maxOz: 2.5, minMl: 75, maxMl: 75 },
    dailyIntake: { minOz: 20, maxOz: 24, minMl: 600, maxMl: 720 }
  },
  {
    date: "2025-04-02",
    ageInDays: 14,
    feedingFrequency: { minHours: 2, maxHours: 3 },
    amountPerFeeding: { minOz: 2.5, maxOz: 3, minMl: 75, maxMl: 90 },
    dailyIntake: { minOz: 20, maxOz: 24, minMl: 600, maxMl: 720 }
  },
  {
    date: "2025-04-03",
    ageInDays: 15,
    feedingFrequency: { minHours: 2, maxHours: 3 },
    amountPerFeeding: { minOz: 2.5, maxOz: 3, minMl: 75, maxMl: 90 },
    dailyIntake: { minOz: 20, maxOz: 24, minMl: 600, maxMl: 720 }
  },
  {
    date: "2025-04-04",
    ageInDays: 16,
    feedingFrequency: { minHours: 2, maxHours: 3 },
    amountPerFeeding: { minOz: 3, maxOz: 3, minMl: 90, maxMl: 90 },
    dailyIntake: { minOz: 22, maxOz: 26, minMl: 660, maxMl: 780 }
  },
  {
    date: "2025-04-05",
    ageInDays: 17,
    feedingFrequency: { minHours: 2, maxHours: 3 },
    amountPerFeeding: { minOz: 3, maxOz: 3, minMl: 90, maxMl: 90 },
    dailyIntake: { minOz: 22, maxOz: 26, minMl: 660, maxMl: 780 }
  },
  {
    date: "2025-04-06",
    ageInDays: 18,
    feedingFrequency: { minHours: 2, maxHours: 4 },
    amountPerFeeding: { minOz: 3, maxOz: 3.5, minMl: 90, maxMl: 105 },
    dailyIntake: { minOz: 22, maxOz: 28, minMl: 660, maxMl: 840 }
  },
  {
    date: "2025-04-07",
    ageInDays: 19,
    feedingFrequency: { minHours: 2, maxHours: 4 },
    amountPerFeeding: { minOz: 3, maxOz: 3.5, minMl: 90, maxMl: 105 },
    dailyIntake: { minOz: 22, maxOz: 28, minMl: 660, maxMl: 840 }
  },
  {
    date: "2025-04-08",
    ageInDays: 20,
    feedingFrequency: { minHours: 2, maxHours: 4 },
    amountPerFeeding: { minOz: 3, maxOz: 3.5, minMl: 90, maxMl: 105 },
    dailyIntake: { minOz: 22, maxOz: 28, minMl: 660, maxMl: 840 }
  }
]

// Helper function to calculate age in days
function calculateAgeInDays(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - birth.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Helper function to get recommendations from Redis or initialize with defaults
export async function getAllRecommendations(): Promise<FeedingRecommendation[]> {
  const client = await getRedisClient()
  const recommendations = await client.get(RECOMMENDATIONS_KEY)

  if (!recommendations) {
    await client.set(RECOMMENDATIONS_KEY, JSON.stringify(defaultRecommendations))
    return defaultRecommendations
  }

  return JSON.parse(recommendations)
}

// Helper function to get current recommendation based on age
async function getCurrentRecommendation(ageInDays: number): Promise<FeedingRecommendation> {
  const recommendations = await getAllRecommendations()
  
  // Find the recommendation that matches the age or get the closest one
  const recommendation = recommendations.reduce((closest, current) => {
    if (current.ageInDays === ageInDays) {
      return current
    }
    
    if (current.ageInDays < ageInDays && 
        (closest === null || current.ageInDays > closest.ageInDays)) {
      return current
    }
    
    return closest
  }, null as FeedingRecommendation | null)

  // Return the found recommendation or the first one if too young
  return recommendation || recommendations[0]
}

// Initialize newborn profile with March 20th, 2024 birth date
const defaultProfile: NewbornProfile = {
  birthDate: "2024-03-20T00:00:00.000Z",
  ageInDays: 0,
  currentRecommendation: defaultRecommendations[0]
}

export async function getProfile() {
  try {
    const client = await getRedisClient()
    let profile = await client.get(NEWBORN_PROFILE_KEY)
    
    if (!profile) {
      await client.set(NEWBORN_PROFILE_KEY, JSON.stringify(defaultProfile))
      profile = JSON.stringify(defaultProfile)
    }

    const parsedProfile = JSON.parse(profile)
    
    // Update age and recommendations
    const ageInDays = calculateAgeInDays(parsedProfile.birthDate)
    const currentRecommendation = await getCurrentRecommendation(ageInDays)

    const updatedProfile = {
      ...parsedProfile,
      ageInDays,
      currentRecommendation
    }

    // Store updated profile
    await client.set(NEWBORN_PROFILE_KEY, JSON.stringify(updatedProfile))

    return updatedProfile
  } catch (error) {
    console.error("Error getting newborn profile:", error)
    throw error
  }
}

export async function updateProfile(birthDate: string) {
  try {
    if (!birthDate) {
      throw new Error("Birth date is required")
    }

    const ageInDays = calculateAgeInDays(birthDate)
    const currentRecommendation = await getCurrentRecommendation(ageInDays)

    const profile: NewbornProfile = {
      birthDate,
      ageInDays,
      currentRecommendation
    }

    const client = await getRedisClient()
    await client.set(NEWBORN_PROFILE_KEY, JSON.stringify(profile))

    return profile
  } catch (error) {
    console.error("Error updating newborn profile:", error)
    throw error
  }
}

// Function to initialize or update recommendations in Redis
export async function initializeRecommendations() {
  try {
    const client = await getRedisClient()
    await client.set(RECOMMENDATIONS_KEY, JSON.stringify(defaultRecommendations))
    return { success: true, message: "Recommendations initialized successfully" }
  } catch (error) {
    console.error("Error initializing recommendations:", error)
    throw error
  }
} 