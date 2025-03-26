import React from 'react'
import { format } from 'date-fns'
import { Button } from './ui/button'
import { CheckCircle, Circle } from 'lucide-react'

interface FeedingPlan {
  id: string
  time: string
  amount: number
  isLocked: boolean
  isCompleted: boolean
}

interface FeedingScheduleProps {
  feedings: FeedingPlan[]
  useMetric: boolean
  onToggleCompleted: (id: string) => void
}

const FeedingSchedule: React.FC<FeedingScheduleProps> = ({
  feedings,
  useMetric,
  onToggleCompleted,
}) => {
  const formatAmount = (amount: number) => {
    return `${amount}${useMetric ? 'ml' : 'oz'}`
  }

  return (
    <div className="space-y-4">
      {feedings.map((feeding) => (
        <div
          key={feeding.id}
          className="flex items-center justify-between p-4 rounded-lg border"
        >
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleCompleted(feeding.id)}
              className={feeding.isCompleted ? 'text-green-500' : 'text-gray-400'}
            >
              {feeding.isCompleted ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                <Circle className="h-6 w-6" />
              )}
            </Button>
            <div>
              <p className="font-medium">{format(new Date(feeding.time), 'h:mm a')}</p>
              <p className="text-sm text-muted-foreground">
                {formatAmount(feeding.amount)}
                {feeding.isLocked && ' (Locked)'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default FeedingSchedule 