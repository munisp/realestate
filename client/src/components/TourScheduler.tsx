import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock, MapPin, Video } from "lucide-react";

interface TourSchedulerProps {
  propertyId: number;
  agentId?: number;
  propertyAddress: string;
  onScheduled?: () => void;
}

export function TourScheduler({
  propertyId,
  agentId,
  propertyAddress,
  onScheduled,
}: TourSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>();
  const [tourType, setTourType] = useState<"in_person" | "virtual">("in_person");
  const [notes, setNotes] = useState("");

  // Get available slots for selected date
  const { data: slots, isLoading: loadingSlots } = trpc.appointments.getAvailableSlots.useQuery(
    {
      agentId: agentId || 0,
      date: selectedDate?.toISOString() || "",
    },
    {
      enabled: !!selectedDate && !!agentId,
    }
  );

  const createAppointment = trpc.appointments.create.useMutation({
    onSuccess: () => {
      toast.success("Tour scheduled successfully!");
      setSelectedDate(undefined);
      setSelectedSlot(undefined);
      setNotes("");
      onScheduled?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to schedule tour");
    },
  });

  const handleSchedule = () => {
    if (!selectedDate || !selectedSlot) {
      toast.error("Please select a date and time");
      return;
    }

    const [hours, minutes] = selectedSlot.split(":").map(Number);
    const appointmentDate = new Date(selectedDate);
    appointmentDate.setHours(hours, minutes, 0, 0);

    createAppointment.mutate({
      propertyId,
      agentId,
      appointmentDate: appointmentDate.toISOString(),
      duration: 60,
      tourType,
      notes,
    });
  };

  const formatTimeSlot = (slot: any) => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    return `${start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })} - ${end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Schedule a Tour
        </CardTitle>
        <CardDescription>
          <div className="flex items-center gap-2 mt-2">
            <MapPin className="h-4 w-4" />
            {propertyAddress}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tour Type Selection */}
        <div className="space-y-3">
          <Label>Tour Type</Label>
          <RadioGroup
            value={tourType}
            onValueChange={(value) => setTourType(value as "in_person" | "virtual")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="in_person" id="in_person" />
              <Label htmlFor="in_person" className="flex items-center gap-2 cursor-pointer">
                <MapPin className="h-4 w-4" />
                In-Person Tour
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="virtual" id="virtual" />
              <Label htmlFor="virtual" className="flex items-center gap-2 cursor-pointer">
                <Video className="h-4 w-4" />
                Virtual Tour
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Calendar */}
        <div className="space-y-3">
          <Label>Select Date</Label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date() || date.getDay() === 0} // Disable past dates and Sundays
            className="rounded-md border"
          />
        </div>

        {/* Time Slots */}
        {selectedDate && agentId && (
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Available Time Slots
            </Label>
            {loadingSlots ? (
              <div className="text-sm text-muted-foreground">Loading available times...</div>
            ) : slots && slots.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {slots
                  .filter((slot) => slot.available)
                  .map((slot, index) => {
                    const slotTime = new Date(slot.start).toTimeString().slice(0, 5);
                    return (
                      <Button
                        key={index}
                        variant={selectedSlot === slotTime ? "default" : "outline"}
                        onClick={() => setSelectedSlot(slotTime)}
                        className="justify-start"
                      >
                        {formatTimeSlot(slot)}
                      </Button>
                    );
                  })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No available time slots for this date
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-3">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any special requests or questions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Schedule Button */}
        <Button
          onClick={handleSchedule}
          disabled={!selectedDate || !selectedSlot || createAppointment.isPending}
          className="w-full"
        >
          {createAppointment.isPending ? "Scheduling..." : "Schedule Tour"}
        </Button>
      </CardContent>
    </Card>
  );
}
