import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, Clock, MapPin, Users, Mail, QrCode,
  Plus, Download, Share2, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import { toast } from "sonner";

export default function OpenHouseScheduler() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Mock data
  const events = [
    {
      id: 1,
      propertyId: 101,
      propertyAddress: "123 Main St, San Francisco, CA",
      date: "2024-02-15",
      startTime: "2:00 PM",
      endTime: "4:00 PM",
      status: "upcoming",
      rsvps: 24,
      attended: 0,
      description: "Join us for an exclusive open house viewing",
      qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=openhouse-1",
    },
    {
      id: 2,
      propertyId: 102,
      propertyAddress: "456 Oak Ave, San Francisco, CA",
      date: "2024-02-10",
      startTime: "1:00 PM",
      endTime: "3:00 PM",
      status: "completed",
      rsvps: 18,
      attended: 15,
      description: "Beautiful property with stunning views",
      qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=openhouse-2",
    },
    {
      id: 3,
      propertyId: 103,
      propertyAddress: "789 Pine Rd, San Francisco, CA",
      date: "2024-02-20",
      startTime: "10:00 AM",
      endTime: "12:00 PM",
      status: "upcoming",
      rsvps: 31,
      attended: 0,
      description: "Spacious family home in great neighborhood",
      qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=openhouse-3",
    },
  ];

  const rsvpList = [
    {
      id: 1,
      name: "John Smith",
      email: "john@example.com",
      phone: "(555) 123-4567",
      guests: 2,
      status: "confirmed",
      checkedIn: false,
      notes: "Interested in making an offer",
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah@example.com",
      phone: "(555) 234-5678",
      guests: 1,
      status: "confirmed",
      checkedIn: false,
      notes: "",
    },
    {
      id: 3,
      name: "Michael Brown",
      email: "michael@example.com",
      phone: "(555) 345-6789",
      guests: 3,
      status: "pending",
      checkedIn: false,
      notes: "First-time buyer",
    },
  ];

  const stats = {
    upcomingEvents: events.filter(e => e.status === "upcoming").length,
    totalRSVPs: events.reduce((sum, e) => sum + e.rsvps, 0),
    averageAttendance: 83, // percentage
    completedEvents: events.filter(e => e.status === "completed").length,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive", icon: any, label: string }> = {
      upcoming: { variant: "default", icon: Calendar, label: "Upcoming" },
      completed: { variant: "secondary", icon: CheckCircle2, label: "Completed" },
      cancelled: { variant: "destructive", icon: XCircle, label: "Cancelled" },
    };
    const config = variants[status] || variants.upcoming;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getRSVPStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" }> = {
      confirmed: { variant: "default" },
      pending: { variant: "secondary" },
      cancelled: { variant: "destructive" },
    };
    return <Badge variant={variants[status]?.variant || "secondary"}>{status}</Badge>;
  };

  const handleCreateEvent = () => {
    toast.success("Open house event created successfully");
    setShowCreateDialog(false);
  };

  const handleSendInvites = () => {
    toast.success("Invitations sent successfully");
    setShowInviteDialog(false);
  };

  const handleDownloadQR = (event: any) => {
    toast.success(`QR code for ${event.propertyAddress} downloaded`);
  };

  const handleDownloadSignIn = (event: any) => {
    toast.success("Sign-in sheet downloaded");
  };

  const handleCheckIn = (rsvp: any) => {
    toast.success(`${rsvp.name} checked in successfully`);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Open House Scheduler</h1>
            <p className="text-muted-foreground">Manage open house events and track attendance</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Open House
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule Open House</DialogTitle>
                <DialogDescription>
                  Create a new open house event for your property
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Property</Label>
                  <Input placeholder="Select or enter property address" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="time" placeholder="Start" />
                      <Input type="time" placeholder="End" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    placeholder="Add details about the open house..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Attendees (Optional)</Label>
                  <Input type="number" placeholder="e.g., 50" />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1" onClick={handleCreateEvent}>
                    Create Event
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming Events</p>
                  <p className="text-2xl font-bold">{stats.upcomingEvents}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total RSVPs</p>
                  <p className="text-2xl font-bold">{stats.totalRSVPs}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Attendance</p>
                  <p className="text-2xl font-bold">{stats.averageAttendance}%</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{stats.completedEvents}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({stats.upcomingEvents})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({stats.completedEvents})</TabsTrigger>
            <TabsTrigger value="all">All Events</TabsTrigger>
          </TabsList>

          {["upcoming", "completed", "all"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {events
                .filter(event => 
                  tab === "all" || 
                  (tab === "upcoming" && event.status === "upcoming") ||
                  (tab === "completed" && event.status === "completed")
                )
                .map((event) => (
                  <Card key={event.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <img 
                            src={event.qrCode}
                            alt="QR Code"
                            className="w-full h-full object-contain p-2"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold truncate">{event.propertyAddress}</h3>
                                {getStatusBadge(event.status)}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {event.date}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {event.startTime} - {event.endTime}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {event.rsvps} RSVPs
                                </span>
                                {event.status === "completed" && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {event.attended} attended
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-4">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedEvent(event);
                                setShowInviteDialog(true);
                              }}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Send Invites
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDownloadQR(event)}
                            >
                              <QrCode className="w-4 h-4 mr-2" />
                              Download QR
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDownloadSignIn(event)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Sign-In Sheet
                            </Button>
                            <Button size="sm" variant="outline">
                              <Share2 className="w-4 h-4 mr-2" />
                              Share
                            </Button>
                            <Button size="sm" variant="outline">
                              View RSVPs ({event.rsvps})
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* RSVP List Preview */}
                      {event.status === "upcoming" && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-semibold mb-3">Recent RSVPs</h4>
                          <div className="space-y-2">
                            {rsvpList.slice(0, 3).map((rsvp) => (
                              <div key={rsvp.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{rsvp.name}</span>
                                    {getRSVPStatusBadge(rsvp.status)}
                                    {rsvp.checkedIn && (
                                      <Badge variant="default" className="bg-green-600">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Checked In
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {rsvp.email} • {rsvp.guests} {rsvp.guests === 1 ? 'guest' : 'guests'}
                                  </div>
                                  {rsvp.notes && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      Note: {rsvp.notes}
                                    </div>
                                  )}
                                </div>
                                {!rsvp.checkedIn && event.status === "upcoming" && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleCheckIn(rsvp)}
                                  >
                                    <QrCode className="w-4 h-4 mr-2" />
                                    Check In
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* Invite Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Invitations</DialogTitle>
              <DialogDescription>
                Send open house invitations to interested buyers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient List</Label>
                <Textarea 
                  placeholder="Enter email addresses (one per line)"
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Or import from saved searches and favorites
                </p>
              </div>
              <div className="space-y-2">
                <Label>Message (Optional)</Label>
                <Textarea 
                  placeholder="Add a personal message to the invitation..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button className="flex-1" onClick={handleSendInvites}>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitations
                </Button>
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">QR Code Check-In</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Display the QR code at your open house entrance</li>
                  <li>• Visitors scan the code to check in automatically</li>
                  <li>• Track attendance in real-time from your phone</li>
                  <li>• Download sign-in sheets for your records</li>
                  <li>• Send follow-up messages to all attendees</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
