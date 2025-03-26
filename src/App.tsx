"use client"

import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./components/theme-provider"
import Settings from "./pages/Settings"
import Dashboard from "./pages/Dashboard"
import { Toaster } from "./components/ui/toaster"
import { useToast } from "./hooks/use-toast"
import { ErrorNotification } from "./components/error-notification"

function App() {
  const { toast } = useToast()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)

  useEffect(() => {
    // Check Redis connection on app load
    const checkConnection = async () => {
      setIsCheckingConnection(true)
      try {
        // Try checking the connection
        console.log("Checking Redis connection...")
        const res = await fetch("/api/redis/check-connection")
        
        // Check if the response status is OK
        if (!res.ok) {
          const errorText = await res.text()
          console.error("Redis connection check returned non-OK status:", res.status, errorText)
          setConnectionError(`API returned status ${res.status}: ${errorText.substring(0, 100)}`)
          setIsConnected(false)
          return
        }
        
        // Parse the response as JSON
        let data
        try {
          const responseText = await res.text()
          console.log("Raw response:", responseText)
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error("Failed to parse response as JSON:", parseError)
          setConnectionError("Invalid JSON response from connection check")
          setIsConnected(false)
          return
        }
        
        // Check if the connection is successful
        setIsConnected(data.connected)
        
        if (data.connected) {
          toast({
            title: "Database Connected",
            description: "Successfully connected to Upstash Redis database",
          })
        } else {
          console.error("Redis connection failed:", data)
          setConnectionError(data.error || "Unknown connection error")
          toast({
            variant: "destructive",
            title: "Connection Failed",
            description: data.message || "Could not connect to the database. Some features may not work.",
          })
        }
      } catch (err) {
        console.error("Exception during Redis connection check:", err)
        setIsConnected(false)
        setConnectionError(err instanceof Error ? err.message : "Network error")
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: "Could not connect to the API server. Check if the server is running.",
        })
      } finally {
        setIsCheckingConnection(false)
      }
    }
    
    checkConnection()
  }, [toast])

  // Reinitialize Redis data
  const reinitializeRedisData = async () => {
    try {
      // Call the server endpoint to reinitialize data
      const response = await fetch("/api/redis/initialize-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        toast({
          variant: "destructive",
          title: "Initialization Failed",
          description: `Server returned error: ${errorText.substring(0, 100)}`,
        })
        return
      }
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Data Initialized",
          description: "Redis database has been successfully initialized.",
        })
        
        // Refresh the page to reload all data
        window.location.reload()
      } else {
        throw new Error(data.message || "Failed to initialize data")
      }
    } catch (error) {
      console.error("Error initializing data:", error)
      toast({
        variant: "destructive",
        title: "Initialization Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred during initialization.",
      })
    }
  }

  return (
    <ThemeProvider defaultTheme="light">
      <Router>
        <div className="min-h-screen bg-background">
          {connectionError && (
            <ErrorNotification
              title="API Connection Error"
              description={`The application could not connect to the API server: ${connectionError}`}
              command="npx tsx src/scripts/init-all.ts"
              additionalInstructions="If the issue persists after running this command, try stopping and restarting the development servers with 'sh dev-setup.sh'."
              onClose={() => setConnectionError(null)}
            />
          )}
          
          {!isConnected && !isCheckingConnection && (
            <div className="flex justify-center pt-8">
              <button 
                onClick={reinitializeRedisData}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
              >
                Reinitialize Redis Data
              </button>
            </div>
          )}
          
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App

