import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Building2, Calendar, DollarSign, MapPin, CheckCircle, Clock, XCircle, Shield } from "lucide-react";
import { Link } from "wouter";

export default function BookingsDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("all");

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  // Mock data - replace with actual API calls
  const bookings = [
    {
      id: 1,
      type: "shortlet",
      property: "Luxury 3BR Apartment in Lekki",
      location: "Lagos",
      checkIn: "2025-02-01",
      checkOut: "2025-02-07",
      amount: 315000,
      status: "confirmed",
      reference: "BK-1234567890",
    },
    {
      id: 2,
      type: "builder_project",
      property: "4BR Duplex - Lekki Phase 2",
      location: "Lagos",
      amount: 25000000,
      status: "escrow",
      reference: "BP-9876543210",
      escrowProgress: 40,
      milestones: [
        { name: "Foundation", status: "completed", amount: 5000000 },
        { name: "Roofing", status: "in_progress", amount: 8000000 },
        { name: "Finishing", status: "pending", amount: 12000000 },
      ],
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      confirmed: { variant: "default", icon: CheckCircle, label: "Confirmed" },
      pending: { variant: "secondary", icon: Clock, label: "Pending" },
      escrow: { variant: "outline", icon: Shield, label: "In Escrow" },
      completed: { variant: "default", icon: CheckCircle, label: "Completed" },
      cancelled: { variant: "destructive", icon: XCircle, label: "Cancelled" },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>{APP_TITLE}</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-foreground hover:text-primary transition-colors">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1 py-8">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
            <p className="text-muted-foreground">Manage your reservations and track builder project progress</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Bookings</TabsTrigger>
              <TabsTrigger value="shortlet">Short-lets</TabsTrigger>
              <TabsTrigger value="builder">Builder Projects</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{booking.property}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-2">
                          <MapPin className="h-4 w-4" />
                          {booking.location}
                        </CardDescription>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Reference</p>
                          <p className="font-medium">{booking.reference}</p>
                        </div>
                        {booking.checkIn && (
                          <>
                            <div>
                              <p className="text-sm text-muted-foreground">Check-in</p>
                              <p className="font-medium">{new Date(booking.checkIn).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Check-out</p>
                              <p className="font-medium">{new Date(booking.checkOut!).toLocaleDateString()}</p>
                            </div>
                          </>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">Amount Paid</p>
                          <p className="font-medium">₦{booking.amount.toLocaleString()}</p>
                        </div>
                      </div>

                      {booking.type === "builder_project" && booking.milestones && (
                        <div className="pt-4 border-t">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold">Construction Progress</h4>
                            <span className="text-sm text-muted-foreground">{booking.escrowProgress}% Complete</span>
                          </div>
                          <Progress value={booking.escrowProgress} className="mb-4" />
                          <div className="space-y-3">
                            {booking.milestones.map((milestone, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div className="flex items-center gap-3">
                                  {milestone.status === "completed" && <CheckCircle className="h-5 w-5 text-green-600" />}
                                  {milestone.status === "in_progress" && <Clock className="h-5 w-5 text-blue-600" />}
                                  {milestone.status === "pending" && <Clock className="h-5 w-5 text-muted-foreground" />}
                                  <div>
                                    <p className="font-medium">{milestone.name}</p>
                                    <p className="text-sm text-muted-foreground capitalize">{milestone.status.replace("_", " ")}</p>
                                  </div>
                                </div>
                                <p className="font-medium">₦{milestone.amount.toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4 pt-4">
                        <Button variant="outline" size="sm">View Details</Button>
                        {booking.type === "shortlet" && booking.status === "confirmed" && (
                          <Button variant="outline" size="sm">Contact Host</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="shortlet">
              <p className="text-muted-foreground">Short-let bookings will appear here</p>
            </TabsContent>

            <TabsContent value="builder">
              <p className="text-muted-foreground">Builder project bookings will appear here</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
