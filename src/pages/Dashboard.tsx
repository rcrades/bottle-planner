"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { useToast } from "../hooks/use-toast"
import { Settings, RefreshCw } from "lucide-react"
import FeedingSchedule from "../components/feeding-schedule"
import { Skeleton } from "../components/ui/skeleton"

interface FeedingSettings {
  feedWindows: {
    min: number
    max: number
    ideal: number
  }
  feedAmounts: {
    min: number
    max: number
    target: number
  }
  useMetric: boolean
  lockedFeedings: {
    enabled: boolean
    times: string[]
  }
}

interface FeedingPlan {
  id: string
  time: string
  amount: number
  isLocked: boolean
  isCompleted: boolean
}

export default function Dashboard() {
  const [settings, setSettings] = useState<FeedingSettings | null>(null)
  const [feedingPlan, setFeedingPlan] = useState<FeedingPlan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPlanningFeeds, setIsPlanningFeeds] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Load settings and current feeding plan
    loadSettings()
    loadFeedingPlan()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/settings/get")
      const data = await response.json()

      if (data.settings) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
      toast({
        variant: "destructive",
        title: "Failed to Load Settings",
        description: "Please check your connection and try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadFeedingPlan = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/feedings/get")
      const data = await response.json()

      if (data.feedings) {
        setFeedingPlan(data.feedings)
      }
    } catch (error) {
      console.error("Failed to load feeding plan:", error)
      toast({
        variant: "destructive",
        title: "Failed to Load Feeding Plan",
        description: "Please check your connection and try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const planNextFeedings = async () => {
    setIsPlanningFeeds(true)
    try {
      const response = await fetch("/api/feedings/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success && data.feedings) {
        setFeedingPlan(data.feedings)
        toast({
          title: "Feeding Plan Generated",
          description: "Your next 10 feedings have been planned.",
        })
      } else {
        throw new Error(data.message || "Failed to plan feedings")
      }
    } catch (error) {
      console.error("Error planning feedings:", error)
      toast({
        variant: "destructive",
        title: "Planning Failed",
        description: "Could not generate feeding plan. Please try again.",
      })
    } finally {
      setIsPlanningFeeds(false)
    }
  }

  const toggleFeedingCompleted = async (id: string) => {
    try {
      const updatedPlan = feedingPlan.map((feed) =>
        feed.id === id ? { ...feed, isCompleted: !feed.isCompleted } : feed,
      )

      setFeedingPlan(updatedPlan)

      await fetch("/api/feedings/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedingId: id,
          isCompleted: updatedPlan.find((f) => f.id === id)?.isCompleted,
        }),
      })
    } catch (error) {
      console.error("Error updating feeding status:", error)
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update feeding status. Please try again.",
      })
      // Revert the change in UI
      loadFeedingPlan()
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Baby Bottle Planner</h1>
        <Link to="/settings">
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Feeding Schedule</CardTitle>
          <CardDescription>View and manage your baby's feeding schedule.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : feedingPlan.length > 0 ? (
            <FeedingSchedule
              feedings={feedingPlan}
              useMetric={settings?.useMetric || false}
              onToggleCompleted={toggleFeedingCompleted}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No feeding plan available. Generate a new plan to get started.
              </p>
              <Button onClick={planNextFeedings} disabled={isPlanningFeeds || !settings}>
                {isPlanningFeeds ? "Planning..." : "Plan Next 10 Feeds"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {feedingPlan.length > 0 && (
        <div className="flex justify-center">
          <Button onClick={planNextFeedings} disabled={isPlanningFeeds} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            {isPlanningFeeds ? "Planning..." : "Plan Next 10 Feeds"}
          </Button>
        </div>
      )}
    </div>
  )
}

