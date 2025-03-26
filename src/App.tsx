"use client"

import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./components/theme-provider"
import Settings from "./pages/Settings"
import Dashboard from "./pages/Dashboard"
import { Toaster } from "./components/ui/toaster"
import { useToast } from "./hooks/use-toast"

function App() {
  const { toast } = useToast()
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Check Redis connection on app load
    fetch("/api/redis/check-connection")
      .then((res) => res.json())
      .then((data) => {
        setIsConnected(data.connected)
        if (data.connected) {
          toast({
            title: "Database Connected",
            description: "Successfully connected to Upstash Redis database",
          })
        }
      })
      .catch((err) => {
        console.error("Failed to connect to Redis:", err)
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: "Could not connect to the database. Some features may not work.",
        })
      })
  }, [toast])

  return (
    <ThemeProvider defaultTheme="light">
      <Router>
        <div className="min-h-screen bg-background">
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

