import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, Bell, Calendar, FileText, Home, TrendingUp, MapPin } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

export default function BuyerDashboard() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const stats = [
    { label: "Saved Properties", value: 12, icon: Heart, color: "text-red-500" },
    { label: "Active Alerts", value: 5, icon: Bell, color: "text-blue-500" },
    { label: "Scheduled Showings", value: 3, icon: Calendar, color: "text-green-500" },
    { label: "Submitted Offers", value: 2, icon: FileText, color: "text-purple-500" },
  ];

  const savedProperties = [
    { id: 1, address: "123 Main St, San Francisco", price: 875000, beds: 3, baths: 2, image: "/placeholder.jpg" },
    { id: 2, address: "456 Oak Ave, San Francisco", price: 950000, beds: 4, baths: 3, image: "/placeholder.jpg" },
    { id: 3, address: "789 Pine Rd, San Francisco", price: 825000, beds: 3, baths: 2.5, image: "/placeholder.jpg" },
  ];

  const upcomingShowings = [
    { id: 1, address: "123 Main St", date: "2024-01-20", time: "2:00 PM", agent: "John Smith" },
    { id: 2, address: "456 Oak Ave", date: "2024-01-22", time: "10:00 AM", agent: "Sarah Johnson" },
  ];

  const activeOffers = [
    { id: 1, address: "789 Pine Rd", amount: 825000, status: "pending", date: "2024-01-15" },
    { id: 2, address: "321 Elm St", amount: 900000, status: "countered", date: "2024-01-18" },
  ];

  const checklistProgress = 65;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container py-6">
          <h1 className="text-3xl font-bold">Buyer Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}!</p>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Checklist Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Home Buying Checklist</CardTitle>
                <CardDescription>Track your progress through the buying process</CardDescription>
              </div>
              <Button asChild>
                <Link href="/buyer-checklist">View Details</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span className="font-semibold">{checklistProgress}%</span>
              </div>
              <Progress value={checklistProgress} className="h-3" />
              <p className="text-sm text-muted-foreground">
                You've completed 13 of 20 tasks. Keep going!
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Saved Properties */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Saved Properties
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/favorites">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savedProperties.map((property) => (
                  <div key={property.id} className="flex gap-4 p-3 border rounded-lg hover:bg-muted/50">
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                      <Home className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{property.address}</h4>
                      <p className="text-sm text-muted-foreground">
                        {property.beds} bed • {property.baths} bath
                      </p>
                      <p className="text-lg font-bold text-primary mt-1">
                        ${property.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Showings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Upcoming Showings
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/showings">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingShowings.map((showing) => (
                  <div key={showing.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{showing.address}</h4>
                        <p className="text-sm text-muted-foreground">Agent: {showing.agent}</p>
                      </div>
                      <Badge>{showing.date}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>{showing.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Offers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Active Offers
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/offers">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeOffers.map((offer) => (
                <div key={offer.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">{offer.address}</h4>
                    <p className="text-sm text-muted-foreground">Submitted on {offer.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">${offer.amount.toLocaleString()}</p>
                    <Badge variant={offer.status === "pending" ? "secondary" : "default"}>
                      {offer.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
                <Link href="/search">
                  <MapPin className="w-6 h-6" />
                  <span>Search Properties</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
                <Link href="/pre-qualify">
                  <TrendingUp className="w-6 h-6" />
                  <span>Get Pre-Qualified</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
                <Link href="/find-agent">
                  <Home className="w-6 h-6" />
                  <span>Find an Agent</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
                <Link href="/tax-calculator">
                  <FileText className="w-6 h-6" />
                  <span>Calculate Costs</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
