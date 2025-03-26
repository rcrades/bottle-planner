import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { format, parseISO } from "date-fns"

interface Feeding {
  id: string
  time: string
  amount: number
  isLocked: boolean
  isCompleted: boolean
}

interface FeedingScheduleProps {
  feedings: Feeding[]
  useMetric: boolean
  onToggleCompleted: (id: string) => void
}

export default function FeedingSchedule({ feedings, useMetric, onToggleCompleted }: FeedingScheduleProps) {
  const convertToMl = (oz: number) => Math.round(oz * 29.5735)

  const formatTime = (timeString: string) => {
    try {
      // If it's a full ISO string
      if (timeString.includes("T")) {
        return format(parseISO(timeString), "h:mm a")
      }
      // If it's just a time (HH:MM)
      const [hours, minutes] = timeString.split(":").map(Number)
      const date = new Date()
      date.setHours(hours, minutes, 0)
      return format(date, "h:mm a")
    } catch (error) {
      return timeString // Fallback to original string if parsing fails
    }
  }

  const formatAmount = (amount: number) => {
    return useMetric ? `${convertToMl(amount)} ml` : `${amount} oz (${convertToMl(amount)} ml)`
  }

  const getNextFeeding = () => {
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    return feedings.find((feeding) => {
      if (feeding.isCompleted) return false

      const [hours, minutes] = feeding.time.split(":").map(Number)
      const feedingTime = hours * 60 + minutes

      return feedingTime > currentTime
    })
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
                    {formatTime(feeding.time)}
                    {feeding.isLocked && <Badge variant="outline">Locked</Badge>}
                    {isNext && <Badge variant="default">Next</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">{formatAmount(feeding.amount)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

