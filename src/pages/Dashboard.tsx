"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "../hooks/use-toast"
import { Settings, RefreshCw, AlertTriangle, Database, Copy, X, Check } from "lucide-react"
import FeedingSchedule from "../components/feeding-schedule"
import ActualFeedings, { ActualFeeding } from "../components/actual-feedings"
import RecommendationsTable from "../components/recommendations-table"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { FeedingRecommendation } from "../server/api/recommendations"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ErrorNotification } from "@/components/error-notification"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

// Interface defining the structure of feeding settings
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

// Type for planned feedings (renamed from FeedingPlan)
interface PlannedFeeding {
  id: string
  time: string
  amount: number
  isLocked: boolean
  isCompleted: boolean
}

// Interface for actual feedings is imported from the component

export default function Dashboard() {
  const [settings, setSettings] = useState<FeedingSettings | null>(null)
  const [plannedFeedings, setPlannedFeedings] = useState<PlannedFeeding[]>([])
  const [actualFeedings, setActualFeedings] = useState<ActualFeeding[]>([])
  const [recommendations, setRecommendations] = useState<FeedingRecommendation[]>([])
  const [currentAgeInDays, setCurrentAgeInDays] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingActualFeedings, setIsLoadingActualFeedings] = useState(false)
  const [isPlanningFeeds, setIsPlanningFeeds] = useState(false)
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState<string>("")
  const [isInitializingData, setIsInitializingData] = useState(false)
  const [hasDataError, setHasDataError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showInitError, setShowInitError] = useState(false)
  const [errorMessages, setErrorMessages] = useState<{
    title: string;
    description?: string;
    command?: string;
    additionalInstructions?: string;
  } | null>(null);
  const { toast } = useToast()
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null)
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false)
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null)

  useEffect(() => {
    // Load settings, current feeding plans, and recommendations
    loadSettings()
    loadPlannedFeedings()
    loadActualFeedings()
    loadRecommendations()
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

  const loadPlannedFeedings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/feedings/get")
      const data = await response.json()

      if (data.feedings) {
        setPlannedFeedings(data.feedings)
      }
    } catch (error) {
      console.error("Failed to load planned feedings:", error)
      toast({
        variant: "destructive",
        title: "Failed to Load Feeding Plan",
        description: "Please check your connection and try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadActualFeedings = async () => {
    setIsLoadingActualFeedings(true)
    try {
      const response = await fetch("/api/actual-feedings/get")
      const data = await response.json()

      if (data.actualFeedings) {
        setActualFeedings(data.actualFeedings)
      }
    } catch (error) {
      console.error("Failed to load actual feedings:", error)
      toast({
        variant: "destructive",
        title: "Failed to Load Actual Feedings",
        description: "Please check your connection and try again.",
      })
    } finally {
      setIsLoadingActualFeedings(false)
    }
  }

  const loadRecommendations = async (retryCount = 0) => {
    setIsLoadingRecommendations(true)
    setRecommendationsError("")
    setHasDataError(false)
    setErrorMessages(null)
    
    // First check that the API server is accessible
    try {
      const connectionCheck = await fetch("/api/redis/check-connection", {
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        }
      });
      
      if (!connectionCheck.ok) {
        const errorText = await connectionCheck.text();
        console.error("API connection check failed:", connectionCheck.status, errorText);
        
        // For production deployment - try API root as fallback
        if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
          try {
            const rootApiCheck = await fetch("/api", {
              headers: {
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
              }
            });
            
            if (rootApiCheck.ok) {
              console.log("API root accessible, but Redis check failed. Proceeding with caution.");
              // Continue with load attempt despite Redis check failing
            } else {
              setErrorMessages({
                title: "API Connection Error",
                description: "Cannot connect to the API server in production. The server may be temporarily unavailable.",
                command: "npx tsx src/scripts/init-all.ts",
                additionalInstructions: "Copy to clipboard"
              });
              setHasDataError(true);
              setIsLoadingRecommendations(false);
              return;
            }
          } catch (rootApiError) {
            console.error("Root API check also failed:", rootApiError);
          }
        } else {
          // Development environment
          setErrorMessages({
            title: "API Connection Error",
            description: "Cannot connect to the API server. Please make sure it's running.",
            command: "sh dev-setup.sh",
            additionalInstructions: "This command will restart both the API and frontend servers."
          });
          setHasDataError(true);
          setIsLoadingRecommendations(false);
          return;
        }
      }
      
      // Connection successful if we reach here
      const connectionData = await connectionCheck.json().catch(() => ({ connected: false }));
      if (!connectionData.connected) {
        console.error("Redis connection check returned not connected:", connectionData);
        setErrorMessages({
          title: "Redis Connection Error",
          description: connectionData.message || "The API server cannot connect to Redis.",
          command: "npx tsx src/scripts/init-all.ts",
          additionalInstructions: "After running this command in your terminal, refresh this page."
        });
        setHasDataError(true);
        setIsLoadingRecommendations(false);
        return;
      }
      
      console.log("API and Redis connection successful, proceeding with data loading");
    } catch (connectionError) {
      console.error("Error during API connection check:", connectionError);
      
      // In production, try to continue anyway
      if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        console.log("Production environment: attempting to proceed despite connection check failure");
        // Continue with data loading despite connection check failure
      } else {
        setErrorMessages({
          title: "API Connection Error",
          description: connectionError instanceof Error ? connectionError.message : "Cannot reach the API server",
          command: "sh dev-setup.sh",
          additionalInstructions: "This command will restart both the API and frontend servers."
        });
        setHasDataError(true);
        setIsLoadingRecommendations(false);
        return;
      }
    }
    
    try {
      // Fetch profile data with better error handling
      console.log("Fetching profile data...")
      let profileData;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        const profileResponse = await fetch("/api/profile/get", {
          signal: controller.signal,
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
          }
        });
        
        clearTimeout(timeout);
        
        if (!profileResponse.ok) {
          const errorText = await profileResponse.text();
          console.error("Profile fetch returned error status:", profileResponse.status, errorText);
          
          // Check if we should retry
          if (retryCount < 2 && profileResponse.status >= 500) {
            console.log(`Retrying profile fetch (attempt ${retryCount + 1})...`);
            setIsLoadingRecommendations(false);
            // Wait a moment before retrying
            setTimeout(() => loadRecommendations(retryCount + 1), 1500);
            return;
          }
          
          // On production, display a more user-friendly error
          if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
            setErrorMessages({
              title: "API Connection Error",
              description: "The application could not connect to the API server: " + 
                           (errorText.includes("FUNCTION_INVOCATION_FAILED") ? 
                            "API returned status 500: A server error has occurred" : errorText.substring(0, 100)),
              command: "npx tsx src/scripts/init-all.ts",
              additionalInstructions: "Copy to clipboard\nIf the issue persists after running this command, try stopping and restarting the development servers with 'sh dev-setup.sh'."
            });
          } else {
            setErrorMessages({
              title: "API Connection Error",
              description: `Server returned ${profileResponse.status}: ${errorText.substring(0, 100)}`,
              command: "npx tsx src/scripts/init-all.ts",
              additionalInstructions: "If the issue persists after running this command, try stopping and restarting the development servers with 'sh dev-setup.sh'."
            });
          }
          
          setHasDataError(true);
          setIsLoadingRecommendations(false);
          return;
        }
        
        const responseText = await profileResponse.text()
        console.log("Raw profile response:", responseText)
        
        try {
          // Try to parse the response as JSON
          profileData = JSON.parse(responseText)
          console.log("Profile response parsed:", profileData)
        } catch (parseError) {
          console.error("Error parsing profile response:", parseError)
          console.error("Raw response:", responseText)
          
          // Check for specific error patterns
          if (responseText.includes("FUNCTION_INVOCATION_FAILED")) {
            setHasDataError(true)
            setErrorMessages({
              title: "API Connection Error",
              description: "The application could not connect to the API server: API returned status 500: A server error has occurred FUNCTION_INVOCATION_FAILED",
              command: "npx tsx src/scripts/init-all.ts",
              additionalInstructions: "Copy to clipboard\nIf the issue persists after running this command, try stopping and restarting the development servers with 'sh dev-setup.sh'."
            });
            throw new Error(`Redis connection error or serverless function timeout. Please try reinitializing the data.`)
          }
          
          setErrorMessages({
            title: "Server Response Error",
            description: `Invalid JSON response from server: ${responseText.substring(0, 50)}...`,
            command: "npx tsx src/scripts/init-all.ts",
            additionalInstructions: "After running this command in your terminal, refresh this page."
          });
          throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 50)}...`)
        }
      } catch (profileError: unknown) {
        console.error("Failed to fetch profile:", profileError)
        
        // Check if this was an abort error (timeout)
        if (profileError && typeof profileError === 'object' && 'name' in profileError && profileError.name === "AbortError") {
          setErrorMessages({
            title: "Request Timeout",
            description: "The profile data request timed out. The server might be overloaded or unresponsive.",
            command: "sh dev-setup.sh",
            additionalInstructions: "This command will restart both the API and frontend servers."
          });
        } else {
          setErrorMessages({
            title: "Profile Data Error",
            description: `Could not retrieve profile data: ${profileError instanceof Error ? profileError.message : 'Network error'}`,
            command: "npx tsx src/scripts/init-all.ts",
            additionalInstructions: "After running this command in your terminal, refresh this page."
          });
        }
        
        setHasDataError(true)
        throw profileError;
      }

      // Fetch recommendations data with better error handling
      console.log("Fetching recommendations data...")
      let recommendationsData;
      try {
        const recommendationsResponse = await fetch("/api/recommendations/get")
        const responseText = await recommendationsResponse.text()
        try {
          // Try to parse the response as JSON
          recommendationsData = JSON.parse(responseText)
          console.log("Recommendations response:", recommendationsData)
        } catch (parseError) {
          console.error("Error parsing recommendations response:", parseError)
          console.error("Raw response:", responseText)
          setHasDataError(true)
          throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 50)}...`)
        }
      } catch (recommendationsError) {
        console.error("Failed to fetch recommendations:", recommendationsError)
        setHasDataError(true)
        throw new Error(`Recommendations fetch failed: ${recommendationsError instanceof Error ? recommendationsError.message : 'Network error'}`)
      }

      // Process the responses
      if (!profileData.success) {
        setHasDataError(true)
        throw new Error(`Profile fetch failed: ${profileData.error || 'No profile data'}`)
      }

      if (!recommendationsData.success) {
        setHasDataError(true)
        throw new Error(`Recommendations fetch failed: ${recommendationsData.error || 'No recommendations data'}`)
      }

      if (profileData.profile) {
        setCurrentAgeInDays(profileData.profile.ageInDays)
      } else {
        setHasDataError(true)
        throw new Error("Profile data missing age information")
      }

      if (recommendationsData.recommendations) {
        setRecommendations(recommendationsData.recommendations)
      } else {
        setHasDataError(true)
        throw new Error("Recommendations data is empty")
      }
    } catch (error) {
      console.error("Failed to load recommendations:", error)
      // More descriptive error message based on the error
      const errorMessage = error instanceof Error 
        ? error.message
        : "Failed to load recommendations. Please check your connection and try again."
      setRecommendationsError(errorMessage)
      
      // Only set a generic error if a more specific one isn't already set
      if (!errorMessages) {
        setErrorMessages({
          title: "Data Loading Error",
          description: errorMessage,
          command: "npx tsx src/scripts/init-all.ts",
          additionalInstructions: "After running this command in your terminal, refresh this page."
        });
      }
      
      toast({
        variant: "destructive",
        title: "Failed to Load Data",
        description: "Please check the error message for details on how to fix this issue.",
        duration: 10000, // longer duration for errors
      })
    } finally {
      setIsLoadingRecommendations(false)
    }
  }

  // Function to reinitialize Redis data
  const reinitializeData = async () => {
    setIsInitializingData(true)
    try {
      // Call the server endpoint to reinitialize data
      const response = await fetch("/api/redis/initialize-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      })
      
      // If the endpoint doesn't exist, inform the user what command to run
      if (response.status === 404) {
        setErrorMessages({
          title: "Initialization Failed",
          description: "The initialization endpoint is not available.",
          command: "npx tsx src/scripts/init-all.ts",
          additionalInstructions: "After running this command in your terminal, refresh this page."
        });
        
        toast({
          title: "Server API Missing",
          description: "Please use the command shown in the error message.",
          duration: 8000
        })
        return
      }
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Data Initialized",
          description: "Redis database has been successfully initialized.",
        })
        
        // Reload the data
        setErrorMessages(null);
        setHasDataError(false);
        await loadSettings()
        await loadPlannedFeedings()
        await loadActualFeedings()
        await loadRecommendations()
      } else {
        setErrorMessages({
          title: "Initialization Failed",
          description: data.message || "The server could not initialize the data.",
          command: "npx tsx src/scripts/init-all.ts",
          additionalInstructions: "After running this command in your terminal, refresh this page."
        });
        
        throw new Error(data.message || "Failed to initialize data")
      }
    } catch (error) {
      console.error("Error initializing data:", error)
      
      setErrorMessages({
        title: "Initialization Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred during initialization.",
        command: "npx tsx src/scripts/init-all.ts",
        additionalInstructions: "After running this command in your terminal, refresh this page."
      });
      
      toast({
        variant: "destructive",
        title: "Initialization Failed",
        description: "Please use the command shown in the error message.",
        duration: 8000
      })
    } finally {
      setIsInitializingData(false)
    }
  }

  // Helper function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast({
          title: "Command Copied",
          description: "The initialization command has been copied to your clipboard."
        })
      },
      (err) => {
        console.error("Could not copy text: ", err)
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Could not copy to clipboard. Please select and copy manually."
        })
      }
    )
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
        setPlannedFeedings(data.feedings)
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
      const updatedPlan = plannedFeedings.map((feed: PlannedFeeding) =>
        feed.id === id ? { ...feed, isCompleted: !feed.isCompleted } : feed,
      )

      setPlannedFeedings(updatedPlan)

      await fetch("/api/feedings/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedingId: id,
          isCompleted: updatedPlan.find((f: PlannedFeeding) => f.id === id)?.isCompleted,
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
      loadPlannedFeedings()
    }
  }

  // Handlers for actual feedings
  const handleAddActualFeeding = async (feeding: Omit<ActualFeeding, "id">) => {
    try {
      const response = await fetch("/api/actual-feedings/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feeding),
      })

      const data = await response.json()
      
      if (data.success && data.actualFeedings) {
        setActualFeedings(data.actualFeedings)
      } else {
        throw new Error(data.message || "Failed to add actual feeding")
      }
    } catch (error) {
      console.error("Error adding actual feeding:", error)
      throw error // Re-throw to be handled by component
    }
  }

  const handleUpdateActualFeeding = async (id: string, feeding: Partial<Omit<ActualFeeding, "id">>) => {
    try {
      const response = await fetch("/api/actual-feedings/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          ...feeding
        }),
      })

      const data = await response.json()
      
      if (data.success && data.actualFeedings) {
        setActualFeedings(data.actualFeedings)
      } else {
        throw new Error(data.message || "Failed to update actual feeding")
      }
    } catch (error) {
      console.error("Error updating actual feeding:", error)
      throw error // Re-throw to be handled by component
    }
  }

  const handleRemoveActualFeeding = async (id: string) => {
    try {
      const response = await fetch("/api/actual-feedings/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      })

      const data = await response.json()
      
      if (data.success && data.actualFeedings) {
        setActualFeedings(data.actualFeedings)
      } else {
        throw new Error(data.message || "Failed to remove actual feeding")
      }
    } catch (error) {
      console.error("Error removing actual feeding:", error)
      throw error // Re-throw to be handled by component
    }
  }

  // Add a function to fetch diagnostics
  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true)
    setDiagnosticError(null)
    
    try {
      console.log("Fetching API diagnostics...")
      const response = await fetch("/api/diagnostics", {
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        }
      })
      
      if (!response.ok) {
        setDiagnosticError(`Failed to fetch diagnostics: ${response.status} ${response.statusText}`)
        setLoadingDiagnostics(false)
        return
      }
      
      const data = await response.json()
      console.log("Diagnostics data:", data)
      setDiagnosticInfo(data)
    } catch (error) {
      console.error("Error fetching diagnostics:", error)
      setDiagnosticError(`Error fetching diagnostics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoadingDiagnostics(false)
    }
  }

  // Update the error message component to include diagnostics
  const ErrorMessage = () => {
    if (!errorMessages) return null
    
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{errorMessages.title}</AlertTitle>
        <AlertDescription className="mt-2">
          <p>{errorMessages.description}</p>
          
          {errorMessages.command && (
            <div className="mt-3 bg-muted p-3 rounded-md flex justify-between items-center text-sm font-mono">
              {errorMessages.command}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  navigator.clipboard.writeText(errorMessages.command || "")
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </>
                )}
              </Button>
            </div>
          )}
          
          {errorMessages.additionalInstructions && (
            <p className="text-sm mt-3">{errorMessages.additionalInstructions}</p>
          )}
          
          {/* Add diagnostics button */}
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchDiagnostics} 
              disabled={loadingDiagnostics}
            >
              {loadingDiagnostics ? 
                "Loading diagnostics..." : 
                "Run API Diagnostics"
              }
            </Button>
            
            {/* Show diagnostics data if available */}
            {diagnosticInfo && (
              <div className="mt-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="diagnostics">
                    <AccordionTrigger className="text-sm">
                      API Diagnostics ({diagnosticInfo.environmentInfo.timestamp})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted p-2 rounded-md overflow-auto max-h-60 text-xs">
                        <p className="font-bold">Environment:</p>
                        <pre className="mb-2">{JSON.stringify(diagnosticInfo.environmentInfo, null, 2)}</pre>
                        
                        <p className="font-bold">Redis Check:</p>
                        <pre className="mb-2">{JSON.stringify(diagnosticInfo.redisCheckResult, null, 2)}</pre>
                        
                        <p className="font-bold">Redis Telemetry:</p>
                        <pre className="mb-2">{JSON.stringify(diagnosticInfo.redisTelemetry, null, 2)}</pre>
                        
                        <p className="font-bold">Memory Usage:</p>
                        <pre>{JSON.stringify(diagnosticInfo.memoryUsage, null, 2)}</pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
            
            {/* Show diagnostics error if failed */}
            {diagnosticError && (
              <div className="mt-2 text-sm text-destructive">{diagnosticError}</div>
            )}
          </div>
          
          <div className="mt-4">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => {
                setHasDataError(false)
                setErrorMessages(null)
                loadRecommendations()
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Retry Connection
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={() => {
                setHasDataError(false)
                setErrorMessages(null)
              }}
            >
              <X className="h-3 w-3 mr-1" /> Dismiss
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Baby Bottle Planner</h1>
        <Link to="/settings">
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Use the error notification component */}
      {errorMessages && (
        <ErrorNotification
          title={errorMessages.title}
          description={errorMessages.description}
          command={errorMessages.command}
          additionalInstructions={errorMessages.additionalInstructions}
          onClose={() => setErrorMessages(null)}
        />
      )}

      {/* Generic data error alert */}
      {hasDataError && !errorMessages && (
        <Alert variant="destructive" className="mb-6 relative">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Data Initialization Error</AlertTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setHasDataError(false)} 
            className="absolute top-2 right-2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
          <AlertDescription className="space-y-4">
            <p>There was a problem loading data from the database. This could be due to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Missing Redis data</li>
              <li>Redis connection issues</li>
              <li>Server processing errors</li>
            </ul>
            <div className="pt-2 flex flex-col space-y-2">
              <Button 
                onClick={reinitializeData} 
                disabled={isInitializingData}
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                {isInitializingData ? "Initializing..." : "Reinitialize Database"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {hasDataError ? (
        <ErrorMessage />
      ) : isLoadingRecommendations ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        </div>
      ) : (
        <>
          <Tabs defaultValue="plan">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="plan">Planned Feedings</TabsTrigger>
              <TabsTrigger value="actual">Actual Feedings</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="plan" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Feeding Schedule</CardTitle>
                  <CardDescription>
                    View and manage your baby's planned feeding schedule.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {plannedFeedings.length > 0 ? (
                    <FeedingSchedule 
                      feedings={plannedFeedings} 
                      useMetric={settings?.useMetric || false}
                      onToggleCompleted={toggleFeedingCompleted}
                    />
                  ) : (
                    <p>No feeding plan available. Generate a new plan to get started.</p>
                  )}
                </CardContent>
              </Card>
              
              <div className="flex justify-end">
                <Button 
                  onClick={planNextFeedings}
                  disabled={isPlanningFeeds}
                >
                  {isPlanningFeeds ? 
                    "Planning..." : 
                    "Plan Next 10 Feeds"
                  }
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="actual">
              <ActualFeedings 
                actualFeedings={actualFeedings} 
                useMetric={settings?.useMetric || false}
                onAddFeeding={async (feeding) => {
                  console.log('Add feeding not implemented', feeding);
                  await Promise.resolve();
                }}
                onUpdateFeeding={async (id, feeding) => {
                  console.log('Update feeding not implemented', id, feeding);
                  await Promise.resolve();
                }}
                onRemoveFeeding={async (id) => {
                  console.log('Remove feeding not implemented', id);
                  await Promise.resolve();
                }}
              />
            </TabsContent>
            
            <TabsContent value="recommendations">
              <Card>
                <CardHeader>
                  <CardTitle>Feeding Recommendations by Age</CardTitle>
                  <CardDescription>
                    Recommended feeding amounts and schedules for your baby at different ages.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recommendationsError ? (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {recommendationsError}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <RecommendationsTable 
                      recommendations={recommendations} 
                      currentAgeInDays={currentAgeInDays}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

