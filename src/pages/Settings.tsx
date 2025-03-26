"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { ChevronLeft, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// This interface defines the structure of our feeding settings
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

const defaultSettings: FeedingSettings = {
  feedWindows: {
    min: 2,
    max: 3,
    ideal: 2.5,
  },
  feedAmounts: {
    min: 1.5,
    max: 2.5,
    target: 2,
  },
  useMetric: false,
  lockedFeedings: {
    enabled: true,
    times: ["22:00", "00:30", "03:00", "05:30", "08:00"],
  },
}

export default function Settings() {
  const [settings, setSettings] = useState<FeedingSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Load settings from Redis
    setIsLoading(true)
    fetch("/api/settings/get")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setSettings(data.settings)
        }
      })
      .catch((err) => {
        console.error("Failed to load settings:", err)
        toast({
          variant: "destructive",
          title: "Failed to Load Settings",
          description: "Using default settings instead.",
        })
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [toast])

  const handleSaveSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/settings/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Settings Saved",
          description: "Your feeding settings have been saved successfully.",
        })
      } else {
        throw new Error(data.message || "Failed to save settings")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save your settings. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTimeChange = (index: number, value: string) => {
    setSettings((prev) => {
      const newTimes = [...prev.lockedFeedings.times]
      newTimes[index] = value
      return {
        ...prev,
        lockedFeedings: {
          ...prev.lockedFeedings,
          times: newTimes,
        },
      }
    })
  }

  const addLockedFeeding = () => {
    setSettings((prev) => ({
      ...prev,
      lockedFeedings: {
        ...prev.lockedFeedings,
        times: [...prev.lockedFeedings.times, "12:00"],
      },
    }))
  }

  const removeLockedFeeding = (index: number) => {
    setSettings((prev) => {
      const newTimes = [...prev.lockedFeedings.times]
      newTimes.splice(index, 1)
      return {
        ...prev,
        lockedFeedings: {
          ...prev.lockedFeedings,
          times: newTimes,
        },
      }
    })
  }

  const convertToMl = (oz: number) => Math.round(oz * 29.5735)

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Link to="/" className="mr-4">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Feeding Settings</h1>
      </div>

      <Alert variant="default" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Settings Override Not Available</AlertTitle>
        <AlertDescription>
          The ability to override feeding settings is not yet available. The system is currently using pediatrician-recommended settings based on your baby's age.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="windows" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="windows" disabled>Feed Windows</TabsTrigger>
          <TabsTrigger value="amounts" disabled>Feed Amounts</TabsTrigger>
          <TabsTrigger value="schedule" disabled>Locked Feedings</TabsTrigger>
        </TabsList>

        <TabsContent value="windows">
          <Card>
            <CardHeader>
              <CardTitle>Feeding Windows</CardTitle>
              <CardDescription>Set the minimum, maximum, and ideal time between feedings in hours.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-window">Minimum</Label>
                  <Input
                    id="min-window"
                    type="number"
                    step="0.25"
                    min="0.5"
                    max={settings.feedWindows.max}
                    value={settings.feedWindows.min}
                    disabled
                  />
                  <p className="text-sm text-muted-foreground">hours</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ideal-window">Ideal</Label>
                  <Input
                    id="ideal-window"
                    type="number"
                    step="0.25"
                    min={settings.feedWindows.min}
                    max={settings.feedWindows.max}
                    value={settings.feedWindows.ideal}
                    disabled
                  />
                  <p className="text-sm text-muted-foreground">hours</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-window">Maximum</Label>
                  <Input
                    id="max-window"
                    type="number"
                    step="0.25"
                    min={settings.feedWindows.min}
                    value={settings.feedWindows.max}
                    disabled
                  />
                  <p className="text-sm text-muted-foreground">hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amounts">
          <Card>
            <CardHeader>
              <CardTitle>Feeding Amounts</CardTitle>
              <CardDescription>Set the minimum, maximum, and target amount for each feeding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="use-metric"
                  checked={settings.useMetric}
                  disabled
                />
                <Label htmlFor="use-metric">Use Metric (ml)</Label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-amount">Minimum</Label>
                  <Input
                    id="min-amount"
                    type="number"
                    step="0.25"
                    min="0.5"
                    max={settings.feedAmounts.max}
                    value={settings.feedAmounts.min}
                    disabled
                  />
                  <p className="text-sm text-muted-foreground">
                    {settings.useMetric
                      ? `ml (${convertToMl(settings.feedAmounts.min)} ml)`
                      : `oz (${convertToMl(settings.feedAmounts.min)} ml)`}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-amount">Target</Label>
                  <Input
                    id="target-amount"
                    type="number"
                    step="0.25"
                    min={settings.feedAmounts.min}
                    max={settings.feedAmounts.max}
                    value={settings.feedAmounts.target}
                    disabled
                  />
                  <p className="text-sm text-muted-foreground">
                    {settings.useMetric
                      ? `ml (${convertToMl(settings.feedAmounts.target)} ml)`
                      : `oz (${convertToMl(settings.feedAmounts.target)} ml)`}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-amount">Maximum</Label>
                  <Input
                    id="max-amount"
                    type="number"
                    step="0.25"
                    min={settings.feedAmounts.min}
                    value={settings.feedAmounts.max}
                    disabled
                  />
                  <p className="text-sm text-muted-foreground">
                    {settings.useMetric
                      ? `ml (${convertToMl(settings.feedAmounts.max)} ml)`
                      : `oz (${convertToMl(settings.feedAmounts.max)} ml)`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Locked Feedings</CardTitle>
              <CardDescription>
                Set specific times for locked feedings that will always be included in the schedule.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="enable-locked"
                  checked={settings.lockedFeedings.enabled}
                  disabled
                />
                <Label htmlFor="enable-locked">Enable Locked Feedings</Label>
              </div>

              {settings.lockedFeedings.enabled && (
                <div className="space-y-4">
                  {settings.lockedFeedings.times.map((time, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input 
                        type="time"
                        value={time}
                        disabled
                        className="border rounded p-2"
                        aria-label="Select feeding time"
                      />
                      <Button 
                        variant="outline" 
                        size="icon" 
                        disabled
                        aria-label="Remove locked feeding time"
                      >
                        <span className="sr-only">Remove</span>
                        <span>×</span>
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" disabled>
                    Add Locked Feeding
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button disabled>
          Settings Override Not Available
        </Button>
      </div>
    </div>
  )
}

