import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { format, parseISO } from "date-fns"

interface Feeding {
  id: string
  date?: string
  time?: string  // For backward compatibility
  planTime?: string
  amount: number
  amountUnit: string
  isLocked: boolean
  isCompleted: boolean
  generatedAt: string
}

interface FeedingScheduleProps {
  feedings: Feeding[]
  useMetric: boolean
  onToggleCompleted: (id: string) => void
}

export default function FeedingSchedule({ feedings, useMetric, onToggleCompleted }: FeedingScheduleProps) {
  const convertToMl = (oz: number) => Math.round(oz * 29.5735)

  const formatTime = (feeding: Feeding) => {
    try {
      // Use either planTime or time
      const timeString = feeding.planTime || feeding.time
      if (!timeString) return "No time set"

      // Extract just the time part if it includes timezone
      const timePart = timeString.split(' ')[0]
      // If it's just a time (HH:MM)
      const [hours, minutes] = timePart.split(":").map(Number)
      const date = new Date()
      date.setHours(hours, minutes, 0)
      return format(date, "h:mm a")
    } catch (error) {
      return "Invalid time" // Fallback to error message if parsing fails
    }
  }

  const formatAmount = (amount: number, unit: string) => {
    return useMetric ? `${convertToMl(amount)} ml` : `${amount} ${unit} (${convertToMl(amount)} ml)`
  }

  const getNextFeeding = () => {
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    return feedings.find((feeding) => {
      if (!feeding || (!feeding.planTime && !feeding.time) || feeding.isCompleted) return false

      try {
        // Use either planTime or time
        const timeString = feeding.planTime || feeding.time
        const timePart = timeString.split(' ')[0]
        const [hours, minutes] = timePart.split(":").map(Number)
        if (isNaN(hours) || isNaN(minutes)) return false
        
        const feedingTime = hours * 60 + minutes
        return feedingTime > currentTime
      } catch (error) {
        console.warn("Error parsing feeding time:", error)
        return false
      }
    })
  }

  const formatDate = (feeding: Feeding) => {
    try {
      if (feeding.date) {
        return new Date(feeding.date).toLocaleDateString()
      }
      // If no date, extract from generatedAt
      return new Date(feeding.generatedAt).toLocaleDateString()
    } catch (error) {
      return "Invalid date"
    }
  }

  const nextFeeding = getNextFeeding()

  return (
    <div className="space-y-4">
      {feedings.map((feeding, index) => {
        const isNext = feeding.id === nextFeeding?.id

        return (
          <Card
            key={feeding.id}
            className={`
              ${feeding.isCompleted ? "opacity-60" : ""}
              ${isNext ? "border-primary" : ""}
            `}
          >
            <CardContent className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={feeding.isCompleted}
                  onCheckedChange={() => onToggleCompleted(feeding.id)}
                  id={`feeding-${feeding.id}`}
                />
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {formatTime(feeding)}
                    <Badge variant="secondary" className="text-xs">
                      {formatDate(feeding)}
                    </Badge>
                    {feeding.isLocked && <Badge variant="outline">Locked</Badge>}
                    {isNext && <Badge variant="default">Next</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {feeding.amount && feeding.amountUnit ? 
                      formatAmount(feeding.amount, feeding.amountUnit) : 
                      "No amount set"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

