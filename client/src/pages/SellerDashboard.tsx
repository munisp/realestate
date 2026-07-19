import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Home, Plus, Eye, MessageSquare, DollarSign, 
  TrendingUp, Calendar, Users, CheckCircle2,
  Clock, XCircle, AlertCircle, BarChart3
} from "lucide-react";
import { Link } from "wouter";

export default function SellerDashboard() {
  const [showListingDialog, setShowListingDialog] = useState(false);

  // Mock data
  const stats = {
    activeListings: 3,
    totalViews: 1247,
    scheduledShowings: 8,
    pendingOffers: 2,
  };

  const listings = [
    {
      id: 1,
      address: "123 Main St, Lagos",
      price: 45000000,
      status: "active",
      views: 456,
      showings: 12,
      offers: 2,
      daysOnMarket: 15,
      image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400",
    },
    {
      id: 2,
      address: "456 Oak Ave, Abuja",
      price: 38000000,
      status: "pending",
      views: 523,
      showings: 18,
      offers: 1,
      daysOnMarket: 22,
      image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400",
    },
    {
      id: 3,
      address: "789 Pine Rd, Port Harcourt",
      price: 52000000,
      status: "active",
      views: 268,
      showings: 6,
      offers: 0,
      daysOnMarket: 8,
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400",
    },
  ];

  const showings = [
    {
      id: 1,
      propertyId: 1,
      address: "123 Main St, Lagos",
      buyerName: "John Doe",
      date: "2024-01-20",
      time: "10:00 AM",
      status: "confirmed",
      agentName: "Sarah Johnson",
    },
    {
      id: 2,
      propertyId: 1,
      address: "123 Main St, Lagos",
      buyerName: "Jane Smith",
      date: "2024-01-20",
      time: "2:00 PM",
      status: "pending",
      agentName: "Michael Brown",
    },
    {
      id: 3,
      propertyId: 2,
      address: "456 Oak Ave, Abuja",
      buyerName: "Robert Wilson",
      date: "2024-01-21",
      time: "11:00 AM",
      status: "confirmed",
      agentName: "Emily Davis",
    },
  ];

  const offers = [
    {
      id: 1,
      propertyId: 1,
      address: "123 Main St, Lagos",
      buyerName: "John Doe",
      offerAmount: 43000000,
      downPayment: 8600000,
      contingencies: ["Inspection", "Financing"],
      submittedDate: "2024-01-18",
      expiresDate: "2024-01-25",
      status: "pending",
      closingDate: "2024-03-15",
    },
    {
      id: 2,
      propertyId: 1,
      address: "123 Main St, Lagos",
      buyerName: "Jane Smith",
      offerAmount: 44500000,
      downPayment: 8900000,
      contingencies: ["Inspection"],
      submittedDate: "2024-01-19",
      expiresDate: "2024-01-26",
      status: "pending",
      closingDate: "2024-03-20",
    },
    {
      id: 3,
      propertyId: 2,
      address: "456 Oak Ave, Abuja",
      buyerName: "Robert Wilson",
      offerAmount: 39000000,
      downPayment: 7800000,
      contingencies: ["Inspection", "Financing", "Appraisal"],
      submittedDate: "2024-01-17",
      expiresDate: "2024-01-24",
      status: "countered",
      closingDate: "2024-03-10",
      counterAmount: 39500000,
    },
  ];

  const marketAnalytics = {
    avgDaysOnMarket: 28,
    avgPricePerSqFt: 185000,
    competitorListings: 47,
    priceReduction: 0,
    comparableSales: [
      { address: "111 Market St", price: 46000000, soldDate: "2024-01-10", daysOnMarket: 25 },
      { address: "222 Commerce Ave", price: 43500000, soldDate: "2024-01-05", daysOnMarket: 32 },
      { address: "333 Trade Blvd", price: 47200000, soldDate: "2023-12-28", daysOnMarket: 18 },
    ],
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      active: { variant: "default", label: "Active" },
      pending: { variant: "secondary", label: "Pending" },
      sold: { variant: "outline", label: "Sold" },
      confirmed: { variant: "default", label: "Confirmed" },
      countered: { variant: "secondary", label: "Countered" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Seller Dashboard</h1>
            <p className="text-muted-foreground">Manage your property listings and track offers</p>
          </div>
          <Dialog open={showListingDialog} onOpenChange={setShowListingDialog}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="w-4 h-4 mr-2" />
                List New Property
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>List New Property</DialogTitle>
                <DialogDescription>
                  Fill in the details to list your property for sale
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Property Address</Label>
                    <Input placeholder="123 Main Street" />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input placeholder="Lagos" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Listing Price (₦)</Label>
                    <Input type="number" placeholder="45000000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Property Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_family">Single Family</SelectItem>
                        <SelectItem value="condo">Condo</SelectItem>
                        <SelectItem value="townhouse">Townhouse</SelectItem>
                        <SelectItem value="multi_family">Multi-Family</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Bedrooms</Label>
                    <Input type="number" placeholder="3" />
                  </div>
                  <div className="space-y-2">
                    <Label>Bathrooms</Label>
                    <Input type="number" placeholder="2" />
                  </div>
                  <div className="space-y-2">
                    <Label>Square Feet</Label>
                    <Input type="number" placeholder="2000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe your property..." rows={4} />
                </div>
                <div className="space-y-2">
                  <Label>Photos</Label>
                  <Input type="file" multiple accept="image/*" />
                  <p className="text-xs text-muted-foreground">Upload up to 20 photos</p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1" onClick={() => setShowListingDialog(false)}>
                    Create Listing
                  </Button>
                  <Button variant="outline" onClick={() => setShowListingDialog(false)}>
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
                  <p className="text-sm text-muted-foreground">Active Listings</p>
                  <p className="text-2xl font-bold">{stats.activeListings}</p>
                </div>
                <Home className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-bold">{stats.totalViews}</p>
                </div>
                <Eye className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled Showings</p>
                  <p className="text-2xl font-bold">{stats.scheduledShowings}</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Offers</p>
                  <p className="text-2xl font-bold">{stats.pendingOffers}</p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="listings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="listings">My Listings</TabsTrigger>
            <TabsTrigger value="showings">Showings</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
            <TabsTrigger value="analytics">Market Analytics</TabsTrigger>
          </TabsList>

          {/* Listings Tab */}
          <TabsContent value="listings" className="space-y-4">
            {listings.map((listing) => (
              <Card key={listing.id}>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <img
                      src={listing.image}
                      alt={listing.address}
                      className="w-48 h-32 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold">{listing.address}</h3>
                          <p className="text-2xl font-bold text-primary">
                            ₦{listing.price.toLocaleString()}
                          </p>
                        </div>
                        {getStatusBadge(listing.status)}
                      </div>
                      <div className="grid grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Views</p>
                          <p className="text-lg font-semibold flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {listing.views}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Showings</p>
                          <p className="text-lg font-semibold flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {listing.showings}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Offers</p>
                          <p className="text-lg font-semibold flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {listing.offers}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Days on Market</p>
                          <p className="text-lg font-semibold flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {listing.daysOnMarket}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Link href={`/property/${listing.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View Listing
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          Schedule Showing
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Showings Tab */}
          <TabsContent value="showings" className="space-y-4">
            {showings.map((showing) => (
              <Card key={showing.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{showing.address}</h3>
                        {getStatusBadge(showing.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Buyer</p>
                          <p className="font-medium flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {showing.buyerName}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Agent</p>
                          <p className="font-medium">{showing.agentName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Date</p>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {showing.date}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Time</p>
                          <p className="font-medium flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {showing.time}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {showing.status === "pending" && (
                        <>
                          <Button size="sm" variant="default">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Confirm
                          </Button>
                          <Button size="sm" variant="outline">
                            <XCircle className="w-4 h-4 mr-2" />
                            Decline
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offers" className="space-y-4">
            {offers.map((offer) => (
              <Card key={offer.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{offer.address}</h3>
                          {getStatusBadge(offer.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">From: {offer.buyerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          ₦{offer.offerAmount.toLocaleString()}
                        </p>
                        {offer.status === "countered" && offer.counterAmount && (
                          <p className="text-sm text-muted-foreground">
                            Counter: ₦{offer.counterAmount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Down Payment</p>
                        <p className="font-medium">
                          ₦{offer.downPayment.toLocaleString()} ({Math.round((offer.downPayment / offer.offerAmount) * 100)}%)
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Closing Date</p>
                        <p className="font-medium">{offer.closingDate}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expires</p>
                        <p className="font-medium">{offer.expiresDate}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Contingencies</p>
                      <div className="flex gap-2">
                        {offer.contingencies.map((contingency, i) => (
                          <Badge key={i} variant="outline">
                            {contingency}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {offer.status === "pending" && (
                        <>
                          <Button size="sm" variant="default">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Accept Offer
                          </Button>
                          <Button size="sm" variant="outline">
                            Counter Offer
                          </Button>
                          <Button size="sm" variant="outline">
                            <XCircle className="w-4 h-4 mr-2" />
                            Decline
                          </Button>
                        </>
                      )}
                      {offer.status === "countered" && (
                        <Button size="sm" variant="outline">
                          View Counter Details
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message Buyer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Offer Comparison */}
            {offers.length > 1 && (
              <Card className="border-2 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Compare Offers
                  </CardTitle>
                  <CardDescription>
                    Side-by-side comparison of all offers for better decision making
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Buyer</th>
                          <th className="text-right p-2">Offer Amount</th>
                          <th className="text-right p-2">Down Payment</th>
                          <th className="text-center p-2">Closing Date</th>
                          <th className="text-center p-2">Contingencies</th>
                          <th className="text-center p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {offers.map((offer) => (
                          <tr key={offer.id} className="border-b">
                            <td className="p-2">{offer.buyerName}</td>
                            <td className="text-right p-2 font-semibold">
                              ₦{offer.offerAmount.toLocaleString()}
                            </td>
                            <td className="text-right p-2">
                              {Math.round((offer.downPayment / offer.offerAmount) * 100)}%
                            </td>
                            <td className="text-center p-2">{offer.closingDate}</td>
                            <td className="text-center p-2">{offer.contingencies.length}</td>
                            <td className="text-center p-2">{getStatusBadge(offer.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Avg Days on Market</p>
                  <p className="text-2xl font-bold">{marketAnalytics.avgDaysOnMarket}</p>
                  <p className="text-xs text-muted-foreground mt-1">In your area</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Avg Price/Sq Ft</p>
                  <p className="text-2xl font-bold">₦{marketAnalytics.avgPricePerSqFt.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">In your area</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Competitor Listings</p>
                  <p className="text-2xl font-bold">{marketAnalytics.competitorListings}</p>
                  <p className="text-xs text-muted-foreground mt-1">Similar properties</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Price Reduction</p>
                  <p className="text-2xl font-bold">{marketAnalytics.priceReduction}%</p>
                  <p className="text-xs text-green-600 mt-1">No reduction needed</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Comparable Sales</CardTitle>
                <CardDescription>
                  Similar properties sold in your area in the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {marketAnalytics.comparableSales.map((sale, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-semibold">{sale.address}</p>
                        <p className="text-sm text-muted-foreground">Sold on {sale.soldDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          ₦{sale.price.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">{sale.daysOnMarket} days</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-950">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Pricing Recommendation</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Based on recent comparable sales and current market conditions, your property is priced competitively. 
                      Consider highlighting unique features in your listing to stand out from the {marketAnalytics.competitorListings} similar properties currently on the market.
                    </p>
                    <Button size="sm" variant="outline">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      View Full Market Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
