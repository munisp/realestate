/**
 * CalendarWidget Component
 * 
 * Mobile-responsive calendar widget for tour scheduling with agent availability visualization
 */

import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, MapPin, Video, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface CalendarWidgetProps {
  propertyId: number;
  agentId?: number;
  onBookingComplete?: (appointmentId: number) => void;
}

export function CalendarWidget({ propertyId, agentId, onBookingComplete }: CalendarWidgetProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | undefined>(undefined);
  const [tourType, setTourType] = useState<'in-person' | 'virtual'>('in-person');

  // Fetch available slots for selected date
  const { data: availableSlots, isLoading: slotsLoading } = trpc.appointments.getAvailableSlots.useQuery(
    {
      propertyId,
      date: selectedDate || new Date(),
      agentId,
    },
    {
      enabled: !!selectedDate,
    }
  );

  // Book appointment mutation
  const bookAppointment = trpc.appointments.bookTour.useMutation({
    onSuccess: (data) => {
      toast.success('Tour scheduled successfully!');
      setSelectedDate(undefined);
      setSelectedTimeSlot(undefined);
      onBookingComplete?.(data.appointmentId);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to schedule tour');
    },
  });

  // Group slots by time period
  const groupedSlots = useMemo(() => {
    if (!availableSlots) return { morning: [], afternoon: [], evening: [] };

    const morning: string[] = [];
    const afternoon: string[] = [];
    const evening: string[] = [];

    availableSlots.forEach((slot) => {
      const hour = parseInt(slot.split(':')[0]);
      if (hour < 12) morning.push(slot);
      else if (hour < 17) afternoon.push(slot);
      else evening.push(slot);
    });

    return { morning, afternoon, evening };
  }, [availableSlots]);

  const handleBooking = () => {
    if (!selectedDate || !selectedTimeSlot) {
      toast.error('Please select a date and time');
      return;
    }

    bookAppointment.mutate({
      propertyId,
      appointmentDate: selectedDate,
      appointmentTime: selectedTimeSlot,
      tourType,
      agentId,
    });
  };

  // Disable past dates and Sundays
  const disabledDates = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today || date.getDay() === 0;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Calendar Section */}
      <Card>
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
          <CardDescription>Choose a date for your property tour</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={disabledDates}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {/* Time Slots & Booking Section */}
      <Card>
        <CardHeader>
          <CardTitle>Select Time & Tour Type</CardTitle>
          <CardDescription>
            {selectedDate
              ? `Available slots for ${selectedDate.toLocaleDateString()}`
              : 'Select a date to view available times'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tour Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tour Type</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={tourType === 'in-person' ? 'default' : 'outline'}
                onClick={() => setTourType('in-person')}
                className="w-full"
              >
                <MapPin className="mr-2 h-4 w-4" />
                In-Person
              </Button>
              <Button
                variant={tourType === 'virtual' ? 'default' : 'outline'}
                onClick={() => setTourType('virtual')}
                className="w-full"
              >
                <Video className="mr-2 h-4 w-4" />
                Virtual
              </Button>
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="space-y-4">
              {slotsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading available times...</div>
              ) : availableSlots && availableSlots.length > 0 ? (
                <>
                  {/* Morning Slots */}
                  {groupedSlots.morning.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4" />
                        Morning (9 AM - 12 PM)
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {groupedSlots.morning.map((slot) => (
                          <Button
                            key={slot}
                            variant={selectedTimeSlot === slot ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTimeSlot(slot)}
                            className="w-full"
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Afternoon Slots */}
                  {groupedSlots.afternoon.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4" />
                        Afternoon (12 PM - 5 PM)
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {groupedSlots.afternoon.map((slot) => (
                          <Button
                            key={slot}
                            variant={selectedTimeSlot === slot ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTimeSlot(slot)}
                            className="w-full"
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Evening Slots */}
                  {groupedSlots.evening.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4" />
                        Evening (5 PM - 6 PM)
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {groupedSlots.evening.map((slot) => (
                          <Button
                            key={slot}
                            variant={selectedTimeSlot === slot ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTimeSlot(slot)}
                            className="w-full"
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No available time slots for this date
                </div>
              )}
            </div>
          )}

          {/* Booking Summary */}
          {selectedDate && selectedTimeSlot && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{selectedDate.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">{selectedTimeSlot}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant={tourType === 'in-person' ? 'default' : 'secondary'}>
                    {tourType === 'in-person' ? 'In-Person' : 'Virtual'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Book Button */}
          <Button
            onClick={handleBooking}
            disabled={!selectedDate || !selectedTimeSlot || bookAppointment.isPending}
            className="w-full"
            size="lg"
          >
            {bookAppointment.isPending ? (
              'Scheduling...'
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Schedule Tour
              </>
            )}
          </Button>

          {/* Availability Note */}
          <p className="text-xs text-muted-foreground text-center">
            Tours are available Monday-Saturday, 9 AM - 6 PM. You'll receive a confirmation email with details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
