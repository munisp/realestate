import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DollarSign, TrendingUp, Users, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AgentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState("overview");

  // Fetch agent's appointments
  const { data: appointments, isLoading: loadingAppointments, refetch: refetchAppointments } = 
    trpc.appointments.getAgentAppointments.useQuery(
      { agentId: user?.id || 0 },
      { enabled: !!user }
    );

  // Fetch agent's offers
  const { data: agentOffers, isLoading: loadingOffers, refetch: refetchOffers } = 
    trpc.offers.getAgentOffers.useQuery(
      { agentId: user?.id || 0 },
      { enabled: !!user }
    );

  // Update appointment status
  const updateAppointment = trpc.appointments.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Appointment updated successfully");
      refetchAppointments();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update appointment");
    },
  });

  // Update offer status
  const updateOffer = trpc.offers.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Offer updated successfully");
      refetchOffers();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update offer");
    },
  });

  if (authLoading) {
    return (
      <div className="container py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Please log in to access the agent dashboard</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate statistics
  const totalAppointments = appointments?.length || 0;
  const pendingAppointments = appointments?.filter(a => a.status === "pending").length || 0;
  const confirmedAppointments = appointments?.filter(a => a.status === "confirmed").length || 0;
  
  const totalOffers = agentOffers?.length || 0;
  const pendingOffers = agentOffers?.filter(o => o.status === "pending").length || 0;
  const acceptedOffers = agentOffers?.filter(o => o.status === "accepted").length || 0;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      cancelled: "destructive",
      completed: "outline",
      accepted: "default",
      rejected: "destructive",
      countered: "outline",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Agent Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your appointments, offers, and client interactions
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {pendingAppointments} pending, {confirmedAppointments} confirmed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Offers</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOffers}</div>
            <p className="text-xs text-muted-foreground">
              {pendingOffers} pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted Offers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acceptedOffers}</div>
            <p className="text-xs text-muted-foreground">
              {totalOffers > 0 ? `${Math.round((acceptedOffers / totalOffers) * 100)}%` : "0%"} acceptance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set([...(appointments?.map(a => a.buyerId) || []), ...(agentOffers?.map(o => o.buyerId) || [])]).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique clients served</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4 mt-6">
          {loadingAppointments ? (
            <div className="text-center py-12">Loading appointments...</div>
          ) : !appointments || appointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Appointments</h3>
                <p className="text-muted-foreground">You don't have any scheduled appointments yet</p>
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
                          <Clock className="h-5 w-5" />
                          {format(new Date(appointment.appointmentDate), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                        </CardTitle>
                        <CardDescription>Property ID: {appointment.propertyId}</CardDescription>
                      </div>
                      {getStatusBadge(appointment.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tour Type:</span>
                        <span className="font-medium">{appointment.tourType === "virtual" ? "Virtual" : "In-Person"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">{appointment.duration} minutes</span>
                      </div>
                      {appointment.notes && (
                        <div>
                          <span className="text-muted-foreground">Notes:</span>
                          <p className="mt-1">{appointment.notes}</p>
                        </div>
                      )}
                    </div>

                    {appointment.status === "pending" && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="default"
                          onClick={() => updateAppointment.mutate({ appointmentId: appointment.id, status: "confirmed" })}
                          disabled={updateAppointment.isPending}
                          className="flex-1"
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => updateAppointment.mutate({ appointmentId: appointment.id, status: "cancelled" })}
                          disabled={updateAppointment.isPending}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="offers" className="space-y-4 mt-6">
          {loadingOffers ? (
            <div className="text-center py-12">Loading offers...</div>
          ) : !agentOffers || agentOffers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Offers</h3>
                <p className="text-muted-foreground">You don't have any offers to review yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {agentOffers.map((offer) => (
                <Card key={offer.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          {formatCurrency(offer.offerAmount)}
                        </CardTitle>
                        <CardDescription>Property ID: {offer.propertyId}</CardDescription>
                      </div>
                      {getStatusBadge(offer.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Financing:</span>
                        <span className="font-medium">{offer.financingType.toUpperCase()}</span>
                      </div>
                      {offer.earnestMoney && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Earnest Money:</span>
                          <span className="font-medium">{formatCurrency(offer.earnestMoney)}</span>
                        </div>
                      )}
                      {offer.proposedClosingDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Closing Date:</span>
                          <span className="font-medium">
                            {format(new Date(offer.proposedClosingDate), "MMM d, yyyy")}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Submitted:</span>
                        <span className="font-medium">
                          {format(new Date(offer.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>

                    {offer.additionalTerms && (
                      <div className="text-sm">
                        <p className="font-medium mb-1">Additional Terms:</p>
                        <p className="text-muted-foreground">{offer.additionalTerms}</p>
                      </div>
                    )}

                    {offer.status === "pending" && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="default"
                          onClick={() => updateOffer.mutate({ offerId: offer.id, status: "accepted" })}
                          disabled={updateOffer.isPending}
                          className="flex-1"
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => toast.info("Counteroffer feature coming soon")}
                          className="flex-1"
                        >
                          Counter
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => updateOffer.mutate({ offerId: offer.id, status: "rejected" })}
                          disabled={updateOffer.isPending}
                          className="flex-1"
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
