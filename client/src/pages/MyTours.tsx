import { useState } from 'react';
import { Calendar, Clock, MapPin, Video, XCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Link } from 'wouter';

export default function MyTours() {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const { data: tours, isLoading, refetch } = trpc.tours.getMyTours.useQuery();
  const cancelMutation = trpc.tours.cancelTour.useMutation();

  const handleCancelClick = (tourId: number) => {
    setSelectedTourId(tourId);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedTourId) return;

    try {
      await cancelMutation.mutateAsync({
        appointmentId: selectedTourId,
        reason: cancellationReason || undefined,
      });

      toast.success('Tour cancelled successfully');
      setCancelDialogOpen(false);
      setSelectedTourId(null);
      setCancellationReason('');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel tour');
    }
  };

  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return {
      date: d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      pending: {
        variant: 'secondary',
        label: 'Pending',
        icon: AlertCircle,
      },
      confirmed: {
        variant: 'default',
        label: 'Confirmed',
        icon: CheckCircle,
      },
      cancelled: {
        variant: 'destructive',
        label: 'Cancelled',
        icon: XCircle,
      },
      completed: {
        variant: 'outline',
        label: 'Completed',
        icon: CheckCircle,
      },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Separate tours by status
  const upcomingTours = tours?.filter(
    (t) => t.status === 'pending' || t.status === 'confirmed'
  ) || [];
  const pastTours = tours?.filter(
    (t) => t.status === 'cancelled' || t.status === 'completed'
  ) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your tours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">My Tours</h1>
            <p className="text-muted-foreground mt-2">
              View and manage your scheduled property tours
            </p>
          </div>

          {/* Upcoming Tours */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Upcoming Tours</h2>
            {upcomingTours.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No upcoming tours scheduled</p>
                  <Link href="/properties">
                    <Button>Browse Properties</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingTours.map((tour) => {
                  const { date, time } = formatDateTime(tour.appointmentDate);
                  return (
                    <Card key={tour.id}>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* Property Image */}
                          {tour.property?.primaryImage && (
                            <div className="w-full md:w-48 h-32 flex-shrink-0">
                              <img
                                src={tour.property.primaryImage}
                                alt={tour.property.addressLine1}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            </div>
                          )}

                          {/* Tour Details */}
                          <div className="flex-1 space-y-3">
                            <div>
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <Link href={`/property/${tour.propertyId}`}>
                                    <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                                      {tour.property?.addressLine1}
                                    </h3>
                                  </Link>
                                  <p className="text-sm text-muted-foreground">
                                    {tour.property?.city}, {tour.property?.state}
                                  </p>
                                </div>
                                {getStatusBadge(tour.status)}
                              </div>
                              {tour.property?.price && (
                                <p className="text-lg font-bold text-primary mt-1">
                                  ${tour.property.price.toLocaleString()}
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{date}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{time} ({tour.duration} min)</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                {tour.tourType === 'in_person' ? (
                                  <>
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span>In-Person Tour</span>
                                  </>
                                ) : (
                                  <>
                                    <Video className="h-4 w-4 text-muted-foreground" />
                                    <span>Virtual Tour</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {tour.meetingLink && (
                              <div className="pt-2">
                                <a
                                  href={tour.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline flex items-center gap-1"
                                >
                                  <Video className="h-4 w-4" />
                                  Join Virtual Tour
                                </a>
                              </div>
                            )}

                            {tour.notes && (
                              <div className="pt-2 border-t">
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium">Notes:</span> {tour.notes}
                                </p>
                              </div>
                            )}

                            {/* Actions */}
                            {(tour.status === 'pending' || tour.status === 'confirmed') && (
                              <div className="flex gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelClick(tour.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancel Tour
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Tours */}
          {pastTours.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Past Tours</h2>
              <div className="space-y-4">
                {pastTours.map((tour) => {
                  const { date, time } = formatDateTime(tour.appointmentDate);
                  return (
                    <Card key={tour.id} className="opacity-75">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                          {tour.property?.primaryImage && (
                            <div className="w-full md:w-48 h-32 flex-shrink-0">
                              <img
                                src={tour.property.primaryImage}
                                alt={tour.property.addressLine1}
                                className="w-full h-full object-cover rounded-lg grayscale"
                              />
                            </div>
                          )}

                          <div className="flex-1 space-y-3">
                            <div>
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h3 className="font-semibold text-lg">
                                    {tour.property?.addressLine1}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {tour.property?.city}, {tour.property?.state}
                                  </p>
                                </div>
                                {getStatusBadge(tour.status)}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{date}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{time}</span>
                              </div>
                            </div>

                            {tour.cancellationReason && (
                              <div className="pt-2 border-t">
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium">Cancellation reason:</span>{' '}
                                  {tour.cancellationReason}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Tour</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this tour? The agent will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Reason for cancellation (optional)</Label>
              <Textarea
                id="reason"
                placeholder="E.g., Found another property, schedule conflict, etc."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setCancellationReason('');
              }}
            >
              Keep Tour
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Tour'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
