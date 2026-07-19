// @ts-nocheck
import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  Users,
  QrCode,
  BarChart3,
  Clock,
  MapPin,
  Video,
  Home,
  Send,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { getLoginUrl } from '@/const';

export default function OpenHouseManagement() {
  const { user, isAuthenticated } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedOpenHouse, setSelectedOpenHouse] = useState<number | null>(null);

  const { data: myOpenHouses, isLoading } = trpc.openHouse.getMyOpenHouses.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: attendees } = trpc.openHouse.getAttendees.useQuery(
    { openHouseId: selectedOpenHouse! },
    { enabled: !!selectedOpenHouse }
  );

  const { data: analytics } = trpc.openHouse.getAnalytics.useQuery(
    { openHouseId: selectedOpenHouse! },
    { enabled: !!selectedOpenHouse }
  );

  const createMutation = trpc.openHouse.create.useMutation({
    onSuccess: (data) => {
      toast.success('Open house created successfully!');
      setShowCreateDialog(false);
    },
  });

  const sendRemindersMutation = trpc.openHouse.sendReminders.useMutation({
    onSuccess: (data) => {
      toast.success((data as any).message);
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              Open House Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Sign in to manage open house events.
            </p>
            <Button className="w-full" asChild>
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading open houses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Home className="h-8 w-8 text-primary" />
                Open House Management
              </h1>
              <p className="text-muted-foreground">
                Schedule and manage open house events
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Open House
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Schedule Open House</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Property ID</Label>
                    <Input type="number" placeholder="Enter property ID" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <Input type="datetime-local" />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input type="datetime-local" />
                    </div>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <select className="w-full mt-2 px-3 py-2 border rounded-md">
                      <option value="in-person">In-Person</option>
                      <option value="virtual">Virtual</option>
                    </select>
                  </div>
                  <div>
                    <Label>Max Attendees (Optional)</Label>
                    <Input type="number" placeholder="20" />
                  </div>
                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea placeholder="Add event details..." rows={3} />
                  </div>
                  <Button className="w-full" onClick={() => createMutation.mutate({
                    propertyId: 1,
                    startTime: '2025-01-25T14:00:00',
                    endTime: '2025-01-25T16:00:00',
                    type: 'in-person',
                  })}>
                    Create Open House
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Upcoming Open Houses */}
          <TabsContent value="upcoming" className="space-y-6">
            {(myOpenHouses as any)?.filter((oh: any) => oh.status === 'upcoming').length > 0 ? (
              <div className="grid gap-6">
                {myOpenHouses
                  .filter((oh: any) => oh.status === 'upcoming')
                  .map((openHouse: any) => (
                    <Card key={openHouse.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="mb-2">{openHouse.propertyTitle}</CardTitle>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(openHouse.startTime).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {new Date(openHouse.startTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {' - '}
                                {new Date(openHouse.endTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                          <Badge variant={openHouse.type === 'virtual' ? 'secondary' : 'default'}>
                            {openHouse.type === 'virtual' ? (
                              <Video className="h-3 w-3 mr-1" />
                            ) : (
                              <MapPin className="h-3 w-3 mr-1" />
                            )}
                            {openHouse.type}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-3 gap-6 mb-6">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Registrations</p>
                            <p className="text-2xl font-bold">{openHouse.registrations}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Capacity</p>
                            <p className="text-2xl font-bold">
                              {openHouse.attendees}/{openHouse.maxAttendees}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Status</p>
                            <Badge variant="outline" className="text-sm">
                              {openHouse.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOpenHouse(openHouse.id)}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            View Attendees
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendRemindersMutation.mutate({ openHouseId: openHouse.id })}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Reminders
                          </Button>
                          <Button variant="outline" size="sm">
                            <QrCode className="h-4 w-4 mr-2" />
                            QR Code
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Upcoming Open Houses</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first open house event
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    Create Open House
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Completed Open Houses */}
          <TabsContent value="completed" className="space-y-6">
            {(myOpenHouses as any)?.filter((oh: any) => oh.status === 'completed').length > 0 ? (
              <div className="grid gap-6">
                {myOpenHouses
                  .filter((oh: any) => oh.status === 'completed')
                  .map((openHouse: any) => (
                    <Card key={openHouse.id}>
                      <CardHeader>
                        <CardTitle>{openHouse.propertyTitle}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {new Date(openHouse.startTime).toLocaleDateString()}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Registrations</p>
                            <p className="text-xl font-bold">{openHouse.registrations}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Attended</p>
                            <p className="text-xl font-bold">{openHouse.attendees}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Attendance Rate</p>
                            <p className="text-xl font-bold">
                              {Math.round((openHouse.attendees / openHouse.registrations) * 100)}%
                            </p>
                          </div>
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOpenHouse(openHouse.id)}
                            >
                              <BarChart3 className="h-4 w-4 mr-2" />
                              View Analytics
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Completed Open Houses</h3>
                  <p className="text-muted-foreground">
                    Completed events will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {selectedOpenHouse && analytics ? (
              <>
                <div className="grid md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Registrations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{(analytics as any).registrations}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Attendance Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{(analytics as any).attendanceRate}%</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Average Rating
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{(analytics as any).avgRating}/5</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Lead Quality</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Hot Leads</span>
                          <Badge variant="destructive">{(analytics as any).leadQuality.hot}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Warm Leads</span>
                          <Badge variant="default">{(analytics as any).leadQuality.warm}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Cold Leads</span>
                          <Badge variant="secondary">{(analytics as any).leadQuality.cold}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Traffic Sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(analytics as any).trafficSources.map((source: any) => (
                          <div key={source.source} className="flex items-center justify-between">
                            <span className="text-sm">{source.source}</span>
                            <span className="font-semibold">{source.count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Analytics Available</h3>
                  <p className="text-muted-foreground">
                    Select an open house to view detailed analytics
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Attendees Dialog */}
        {selectedOpenHouse && attendees && (
          <Dialog open={!!selectedOpenHouse} onOpenChange={() => setSelectedOpenHouse(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Attendee List</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {attendees.map((attendee: any) => (
                  <Card key={attendee.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{attendee.name}</p>
                          <p className="text-sm text-muted-foreground">{attendee.email}</p>
                          <p className="text-sm text-muted-foreground">{attendee.phone}</p>
                          {attendee.feedback && (
                            <p className="text-sm mt-2 italic">"{attendee.feedback}"</p>
                          )}
                        </div>
                        <div className="text-right">
                          {attendee.checkedIn ? (
                            <Badge variant="default" className="mb-2">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Checked In
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="mb-2">
                              <XCircle className="h-3 w-3 mr-1" />
                              Not Checked In
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Registered: {new Date(attendee.registeredAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
