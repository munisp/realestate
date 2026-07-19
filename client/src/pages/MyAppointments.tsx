import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, Video, X } from "lucide-react";
import { format } from "date-fns";

export default function MyAppointments() {
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const { data: appointments, isLoading, refetch } = trpc.appointments.getUserAppointments.useQuery();

  const updateStatus = trpc.appointments.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Appointment updated successfully");
      refetch();
      setCancellingId(null);
      setCancellationReason("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update appointment");
    },
  });

  const handleCancel = () => {
    if (!cancellingId) return;

    updateStatus.mutate({
      appointmentId: cancellingId,
      status: "cancelled",
      cancellationReason: cancellationReason || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      cancelled: "destructive",
      completed: "outline",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="text-center">Loading appointments...</div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Appointments</h1>
        <p className="text-muted-foreground">
          View and manage your property tour appointments
        </p>
      </div>

      {!appointments || appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Appointments</h3>
            <p className="text-muted-foreground">
              You haven't scheduled any property tours yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {appointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {appointment.tourType === "virtual" ? (
                        <Video className="h-5 w-5" />
                      ) : (
                        <MapPin className="h-5 w-5" />
                      )}
                      {appointment.tourType === "virtual" ? "Virtual Tour" : "In-Person Tour"}
                    </CardTitle>
                    <CardDescription>Property ID: {appointment.propertyId}</CardDescription>
                  </div>
                  {getStatusBadge(appointment.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(appointment.appointmentDate), "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(appointment.appointmentDate), "h:mm a")} (
                      {appointment.duration} minutes)
                    </span>
                  </div>
                </div>

                {appointment.notes && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">Notes:</p>
                    <p className="text-muted-foreground">{appointment.notes}</p>
                  </div>
                )}

                {appointment.meetingLink && appointment.tourType === "virtual" && (
                  <div className="pt-2">
                    <Button asChild variant="outline" className="w-full">
                      <a href={appointment.meetingLink} target="_blank" rel="noopener noreferrer">
                        Join Virtual Tour
                      </a>
                    </Button>
                  </div>
                )}

                {(appointment.status === "pending" || appointment.status === "confirmed") && (
                  <div className="pt-2">
                    <Button
                      variant="destructive"
                      onClick={() => setCancellingId(appointment.id)}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel Appointment
                    </Button>
                  </div>
                )}

                {appointment.status === "cancelled" && appointment.cancellationReason && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">Cancellation Reason:</p>
                    <p className="text-muted-foreground">{appointment.cancellationReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancellingId} onOpenChange={() => setCancellingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Cancellation (Optional)</label>
              <Textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Let us know why you're cancelling..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancellingId(null)}>
              Keep Appointment
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? "Cancelling..." : "Cancel Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
