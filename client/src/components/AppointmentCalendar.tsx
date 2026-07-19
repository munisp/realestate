import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AppointmentCalendarProps {
  propertyId: number;
  agentId?: number;
}

export function AppointmentCalendar({ propertyId, agentId }: AppointmentCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [notes, setNotes] = useState('');

  const { data: appointments, refetch } = trpc.appointments.list.useQuery({ propertyId });
  const { data: availability } = trpc.appointments.agentAvailability.useQuery(
    { agentId: agentId! },
    { enabled: !!agentId }
  );
  
  const bookAppointment = trpc.appointments.create.useMutation({
    onSuccess: () => {
      toast.success('Appointment requested! Agent will confirm shortly.');
      setShowBookingDialog(false);
      setNotes('');
      setSelectedDate(null);
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to book appointment: ' + error.message);
    }
  });

  const handleDateClick = (arg: any) => {
    const clickedDate = new Date(arg.dateStr);
    // Don't allow booking in the past
    if (clickedDate < new Date()) {
      toast.error('Cannot book appointments in the past');
      return;
    }
    setSelectedDate(clickedDate);
    setShowBookingDialog(true);
  };

  const handleBooking = () => {
    if (!selectedDate) {
      toast.error('Please select a date and time');
      return;
    }
    
    bookAppointment.mutate({
      propertyId,
      agentId,
      appointmentDate: selectedDate.toISOString(),
      duration: 60,
      notes,
    });
  };

  const events = appointments?.map(apt => ({
    id: apt.id.toString(),
    title: apt.status === 'confirmed' ? 'Viewing Scheduled' : 'Pending Confirmation',
    start: new Date(apt.appointmentDate),
    end: new Date(new Date(apt.appointmentDate).getTime() + (apt.duration || 60) * 60000),
    backgroundColor: apt.status === 'confirmed' ? '#10b981' : '#f59e0b',
    borderColor: apt.status === 'confirmed' ? '#059669' : '#d97706',
  })) || [];

  const businessHours = availability?.map(av => ({
    daysOfWeek: [av.dayOfWeek],
    startTime: av.startTime,
    endTime: av.endTime,
  })) || [];

  return (
    <>
      <div className="bg-white rounded-lg shadow p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={events}
          dateClick={handleDateClick}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          businessHours={businessHours.length > 0 ? businessHours : undefined}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          height="auto"
          nowIndicator={true}
        />
      </div>

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Property Viewing</DialogTitle>
            <DialogDescription>
              Request a viewing appointment for this property. The agent will confirm your request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="datetime">Date & Time</Label>
              <Input
                id="datetime"
                type="datetime-local"
                value={selectedDate ? format(selectedDate, "yyyy-MM-dd'T'HH:mm") : ''}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific requirements or questions..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleBooking} 
                className="flex-1"
                disabled={bookAppointment.isPending || !selectedDate}
              >
                {bookAppointment.isPending ? 'Requesting...' : 'Request Appointment'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowBookingDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
