import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { formatDate } from "@/lib/utils"
import { 
  Pencil, 
  Trash, 
  Plus, 
  Save, 
  X,
  Calendar,
  Clock
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

// Define the ActualFeeding interface
export interface ActualFeeding {
  id: string
  date: string
  time?: string
  actualTime: string
  planTime: string
  amount?: number
  Amount?: string
  notes?: string
}

interface ActualFeedingsProps {
  actualFeedings: ActualFeeding[]
  useMetric?: boolean
  onAddFeeding: (feeding: Omit<ActualFeeding, "id">) => Promise<void>
  onUpdateFeeding: (id: string, feeding: Partial<Omit<ActualFeeding, "id">>) => Promise<void>
  onRemoveFeeding: (id: string) => Promise<void>
}

export default function ActualFeedings({
  actualFeedings,
  useMetric = false,
  onAddFeeding,
  onUpdateFeeding,
  onRemoveFeeding
}: ActualFeedingsProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form states
  const [formDate, setFormDate] = useState(formatDate(new Date()))
  const [formPlanTime, setFormPlanTime] = useState("")
  const [formActualTime, setFormActualTime] = useState("")
  const [formAmount, setFormAmount] = useState("")
  const [formNotes, setFormNotes] = useState("")
  
  const { toast } = useToast()
  
  // Sort feedings by date and time (newest first)
  const sortedFeedings = [...actualFeedings].sort((a, b) => {
    const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime()
    if (dateComparison !== 0) return dateComparison
    
    // Compare by actualTime if available, or fall back to time
    const aTime = a.actualTime || a.time || ""
    const bTime = b.actualTime || b.time || ""
    return bTime.localeCompare(aTime)
  })
  
  const formatAmount = (feeding: ActualFeeding) => {
    // Handle both formats (amount as number or Amount as string)
    if (feeding.amount !== undefined) {
      return useMetric 
        ? `${Math.round(feeding.amount * 29.5735)} ml` 
        : `${feeding.amount} oz`
    } else if (feeding.Amount) {
      return feeding.Amount // Already formatted as string
    }
    return "N/A"
  }
  
  const startEditing = (feeding: ActualFeeding) => {
    setEditingId(feeding.id)
    setFormDate(feeding.date)
    setFormPlanTime(feeding.planTime || "")
    setFormActualTime(feeding.actualTime || feeding.time || "")
    // Handle both formats
    setFormAmount(feeding.amount !== undefined ? feeding.amount.toString() : 
                (feeding.Amount ? feeding.Amount.replace(/[^\d.-]/g, '') : ""))
    setFormNotes(feeding.notes || "")
  }
  
  const cancelEditing = () => {
    setEditingId(null)
    setIsAdding(false)
    resetForm()
  }
  
  const resetForm = () => {
    setFormDate(formatDate(new Date()))
    setFormPlanTime("")
    setFormActualTime("")
    setFormAmount("")
    setFormNotes("")
  }
  
  const handleAdd = () => {
    setIsAdding(true)
    resetForm()
  }
  
  const handleSubmit = async (e: React.FormEvent, id: string | null = null) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Validate form
      if (!formDate) {
        toast({
          variant: "destructive",
          title: "Date is required",
          description: "Please enter a date for the feeding"
        })
        return
      }
      
      if (!formActualTime) {
        toast({
          variant: "destructive",
          title: "Actual time is required",
          description: "Please enter the actual time when feeding occurred"
        })
        return
      }
      
      const amount = parseFloat(formAmount)
      if (isNaN(amount) || amount <= 0) {
        toast({
          variant: "destructive",
          title: "Invalid amount",
          description: "Please enter a valid amount greater than 0"
        })
        return
      }
      
      const feedingData = {
        date: formDate,
        planTime: formPlanTime,
        actualTime: formActualTime,
        amount,
        notes: formNotes
      }
      
      if (id && editingId) {
        // Update existing feeding
        await onUpdateFeeding(id, feedingData)
        toast({
          title: "Feeding updated",
          description: "The feeding record has been updated successfully"
        })
      } else {
        // Add new feeding
        await onAddFeeding(feedingData)
        toast({
          title: "Feeding added",
          description: "The feeding record has been added successfully"
        })
      }
      
      // Reset form and state
      cancelEditing()
    } catch (error) {
      console.error("Error submitting feeding:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error saving the feeding data"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleRemove = async (id: string) => {
    if (confirm("Are you sure you want to remove this feeding record?")) {
      try {
        await onRemoveFeeding(id)
        toast({
          title: "Feeding removed",
          description: "The feeding record has been removed successfully"
        })
      } catch (error) {
        console.error("Error removing feeding:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "There was an error removing the feeding data"
        })
      }
    }
  }
  
  // Format time function to remove timezone and convert to AM/PM format
  const formatTime = (timeString: string | undefined): string => {
    if (!timeString) return "N/A";
    
    // Remove timezone info (like CDT)
    const timeWithoutTimezone = timeString.replace(/\s+[A-Z]{3,4}$/i, '');
    
    // Check if it's already in AM/PM format
    if (timeWithoutTimezone.match(/am|pm/i)) {
      // Ensure consistent AM/PM capitalization
      return timeWithoutTimezone.replace(/am|pm/i, (match) => match.toUpperCase());
    }
    
    // Try to parse 24-hour format (like "15:00")
    const timeMatch = timeWithoutTimezone.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const [_, hours, minutes] = timeMatch;
      const hour = parseInt(hours, 10);
      const isPM = hour >= 12;
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${isPM ? 'PM' : 'AM'}`;
    }
    
    // Return original without timezone if we can't parse it
    return timeWithoutTimezone;
  };
  
  const renderEditForm = (feeding: ActualFeeding | null = null) => {
    const isEdit = !!feeding
    const title = isEdit ? "Edit Feeding" : "Add Feeding"
    
    return (
      <form onSubmit={(e) => handleSubmit(e, isEdit ? feeding.id : null)} className="space-y-4 p-4 border rounded-md mb-4">
        <h3 className="font-medium text-lg">{title}</h3>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <div className="relative">
              <Input 
                id="date" 
                type="date" 
                value={formDate} 
                onChange={(e) => setFormDate(e.target.value)}
                required
              />
              <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="planTime">Planned Time</Label>
            <div className="relative">
              <Input 
                id="planTime" 
                type="text" 
                placeholder="e.g., 9:30 am"
                value={formPlanTime} 
                onChange={(e) => setFormPlanTime(e.target.value)}
              />
              <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="actualTime">Actual Time</Label>
            <div className="relative">
              <Input 
                id="actualTime" 
                type="text"
                placeholder="e.g., 9:45 am" 
                value={formActualTime} 
                onChange={(e) => setFormActualTime(e.target.value)}
                required
              />
              <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="amount">Amount ({useMetric ? "ml" : "oz"})</Label>
          <Input 
            id="amount" 
            type="number" 
            step={useMetric ? "5" : "0.1"}
            min="0"
            value={formAmount} 
            onChange={(e) => setFormAmount(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input 
            id="notes" 
            value={formNotes} 
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="Any observations about this feeding"
          />
        </div>
        
        <div className="flex justify-end space-x-2 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={cancelEditing}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Feeding Records</span>
          <Button onClick={handleAdd} size="sm" className="flex items-center gap-1">
            <Plus className="h-4 w-4" /> Add Record
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isSubmitting && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}
        
        {!isSubmitting && (
          <>
            {isAdding && renderEditForm()}
            
            {sortedFeedings.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No feeding records found. Add your first record above.
              </div>
            ) : (
              <Table>
                <TableCaption>Record of all feedings</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Planned Time</TableHead>
                    <TableHead>Actual Time</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFeedings.map((feeding) => (
                    editingId === feeding.id ? (
                      <TableRow key={feeding.id + "-edit"}>
                        <TableCell colSpan={6}>
                          {renderEditForm(feeding)}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={feeding.id}>
                        <TableCell>{feeding.date}</TableCell>
                        <TableCell>{formatTime(feeding.planTime)}</TableCell>
                        <TableCell>{formatTime(feeding.actualTime || feeding.time)}</TableCell>
                        <TableCell>{formatAmount(feeding)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{feeding.notes || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              onClick={() => startEditing(feeding)} 
                              size="icon" 
                              variant="ghost"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              onClick={() => handleRemove(feeding.id)} 
                              size="icon" 
                              variant="ghost"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
} 