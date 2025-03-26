import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import type { FeedingRecommendation } from "../server/api/recommendations"

interface RecommendationsTableProps {
  recommendations: FeedingRecommendation[]
  currentAgeInDays: number
  isLoading?: boolean
  error?: string
}

export default function RecommendationsTable({ 
  recommendations, 
  currentAgeInDays,
  isLoading = false,
  error
}: RecommendationsTableProps) {
  const [showMetric, setShowMetric] = useState(false)

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feeding Recommendations</CardTitle>
          <CardDescription>Daily feeding guidelines based on age</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feeding Recommendations</CardTitle>
          <CardDescription>Daily feeding guidelines based on age</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-8 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feeding Recommendations</CardTitle>
          <CardDescription>Daily feeding guidelines based on age</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No recommendations available. Please check your baby's profile is set up correctly.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Feeding Recommendations</CardTitle>
            <CardDescription>Daily feeding guidelines based on age</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="metric-toggle"
              checked={showMetric}
              onCheckedChange={setShowMetric}
            />
            <Label htmlFor="metric-toggle">Show Metric (mL)</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Age (Days)</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Feeding Window</TableHead>
              <TableHead>Amount per Feeding</TableHead>
              <TableHead>Daily Intake</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recommendations.map((rec) => (
              <TableRow 
                key={rec.ageInDays}
                className={rec.ageInDays === currentAgeInDays ? "bg-muted" : ""}
              >
                <TableCell>{rec.ageInDays}</TableCell>
                <TableCell>{new Date(rec.date).toLocaleDateString()}</TableCell>
                <TableCell>{rec.feedingFrequency.minHours}-{rec.feedingFrequency.maxHours} hours</TableCell>
                <TableCell>
                  {showMetric 
                    ? `${rec.amountPerFeeding.minMl}-${rec.amountPerFeeding.maxMl} mL`
                    : `${rec.amountPerFeeding.minOz}-${rec.amountPerFeeding.maxOz} oz`
                  }
                </TableCell>
                <TableCell>
                  {showMetric
                    ? `${rec.dailyIntake.minMl}-${rec.dailyIntake.maxMl} mL`
                    : `${rec.dailyIntake.minOz}-${rec.dailyIntake.maxOz} oz`
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
} 