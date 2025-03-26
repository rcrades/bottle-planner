import { useState, useEffect } from "react"
import type { NewbornProfile } from "../server/api/recommendations"

export function useNewbornProfile() {
  const [profile, setProfile] = useState<NewbornProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/profile/get")
      const data = await response.json()

      if (data.success) {
        setProfile(data.profile)
        setError(null)
      } else {
        throw new Error(data.message || "Failed to fetch newborn profile")
      }
    } catch (err) {
      console.error("Error fetching newborn profile:", err)
      setError("Failed to load newborn profile")
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (birthDate: string) => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ birthDate }),
      })

      const data = await response.json()

      if (data.success) {
        setProfile(data.profile)
        setError(null)
      } else {
        throw new Error(data.message || "Failed to update newborn profile")
      }
    } catch (err) {
      console.error("Error updating newborn profile:", err)
      setError("Failed to update newborn profile")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    refreshProfile: fetchProfile,
  }
} 