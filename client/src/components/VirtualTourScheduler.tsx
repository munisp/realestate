import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Video, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface VirtualTourSchedulerProps {
  propertyId: number;
  propertyTitle: string;
}

/**
 * Virtual Tour Scheduler Component
 * 
 * Allows users to schedule virtual open house appointments
 * with calendar integration and automated reminders
 */
export default function VirtualTourScheduler({
  propertyId,
  propertyTitle,
}: VirtualTourSchedulerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  
  const { data: timeSlots } = trpc.recommendations.getAvailableTimeSlots.useQuery(
    {
      propertyId,
      date: selectedDate?.toISOString().split('T')[0] || '',
    },
    {
      enabled: !!selectedDate && isOpen,
    }
  );
  
  const scheduleTour = trpc.recommendations.scheduleVirtualTour.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to schedule tour: ' + error.message);
    },
  });
  
  const resetForm = () => {
    setSelectedDate(new Date());
    setSelectedTime('');
    setNotes('');
    setContactPhone('');
  };
  
  const handleSchedule = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select a date and time');
      return;
    }
    
    // Combine date and time
    const [hours, minutes] = selectedTime.split(':');
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    scheduleTour.mutate({
      propertyId,
      scheduledTime: scheduledDateTime.toISOString(),
      notes,
      contactPhone,
    });
  };
  
  // Filter out past dates
  const disabledDates = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <Video className="w-5 h-5 mr-2" />
          Schedule Virtual Tour
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Virtual Tour</DialogTitle>
          <DialogDescription>
            Book a virtual viewing for {propertyTitle}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Calendar */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Select Date
            </Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={disabledDates}
              className="rounded-md border"
            />
          </div>
          
          {/* Time & Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Select Time
              </Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a time slot" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots && timeSlots.length > 0 ? (
                    timeSlots.map((slot) => (
                      <SelectItem
                        key={slot.time}
                        value={slot.time}
                        disabled={!slot.available}
                      >
                        {slot.time} {!slot.available && '(Booked)'}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>
                      Loading available slots...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Contact Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+234 XXX XXX XXXX"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any specific questions or areas you'd like to focus on?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
        </div>
        
        {/* Info Box */}
        <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
          <p className="font-medium">What to expect:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>You'll receive a confirmation email with a video meeting link</li>
            <li>A calendar invite will be sent to help you remember</li>
            <li>You'll get a reminder 1 hour before the tour</li>
            <li>The tour typically lasts 30 minutes with Q&A</li>
          </ul>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={scheduleTour.isPending || !selectedDate || !selectedTime}
          >
            {scheduleTour.isPending ? 'Scheduling...' : 'Confirm Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
