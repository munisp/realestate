import { useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Eye, Heart, Calendar, TrendingUp, Download,
  Users, Mail, Phone, MessageSquare
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";

export default function PropertyPerformanceDashboard() {
  const { id } = useParams<{ id: string }>();
  const [timeRange, setTimeRange] = useState("30days");

  // Mock data
  const property = {
    id: parseInt(id || "1"),
    address: "123 Main St, San Francisco, CA",
    price: "$2,500,000",
    status: "active",
    listedDate: "2024-01-01",
    daysOnMarket: 45,
  };

  const stats = {
    totalViews: 1247,
    favorites: 89,
    showingRequests: 24,
    offers: 3,
    leadGeneration: 156,
    avgTimeOnPage: "3:42",
  };

  const viewsData = [
    { date: "Jan 1", views: 45, favorites: 3 },
    { date: "Jan 8", views: 62, favorites: 5 },
    { date: "Jan 15", views: 78, favorites: 8 },
    { date: "Jan 22", views: 95, favorites: 12 },
    { date: "Jan 29", views: 112, favorites: 15 },
    { date: "Feb 5", views: 134, favorites: 18 },
    { date: "Feb 12", views: 156, favorites: 22 },
  ];

  const activityData = [
    { type: "Page Views", count: 1247 },
    { type: "Favorites", count: 89 },
    { type: "Showings", count: 24 },
    { type: "Offers", count: 3 },
  ];

  const leadSources = [
    { source: "Direct Search", count: 67, percentage: 43 },
    { source: "Email Campaign", count: 42, percentage: 27 },
    { source: "Social Media", count: 31, percentage: 20 },
    { source: "Referral", count: 16, percentage: 10 },
  ];

  const recentActivity = [
    {
      id: 1,
      type: "view",
      user: "John Smith",
      action: "Viewed property",
      timestamp: "2 hours ago",
      icon: Eye,
    },
    {
      id: 2,
      type: "favorite",
      user: "Sarah Johnson",
      action: "Added to favorites",
      timestamp: "4 hours ago",
      icon: Heart,
    },
    {
      id: 3,
      type: "showing",
      user: "Michael Brown",
      action: "Requested showing",
      timestamp: "6 hours ago",
      icon: Calendar,
    },
    {
      id: 4,
      type: "message",
      user: "Emily Davis",
      action: "Sent inquiry",
      timestamp: "8 hours ago",
      icon: MessageSquare,
    },
  ];

  const leads = [
    {
      id: 1,
      name: "John Smith",
      email: "john@example.com",
      phone: "(555) 123-4567",
      interest: "High",
      lastContact: "2024-02-10",
      actions: 5,
      source: "Direct Search",
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah@example.com",
      phone: "(555) 234-5678",
      interest: "Medium",
      lastContact: "2024-02-09",
      actions: 3,
      source: "Email Campaign",
    },
    {
      id: 3,
      name: "Michael Brown",
      email: "michael@example.com",
      phone: "(555) 345-6789",
      interest: "High",
      lastContact: "2024-02-08",
      actions: 7,
      source: "Social Media",
    },
  ];

  const handleExportPDF = () => {
    toast.success("Exporting performance report to PDF...");
  };

  const getInterestBadge = (interest: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      High: "default",
      Medium: "secondary",
      Low: "destructive",
    };
    return <Badge variant={variants[interest]}>{interest}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Property Performance</h1>
            <p className="text-muted-foreground">{property.address}</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Property Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="text-2xl font-bold">{property.price}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="default" className="mt-1">Active</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Listed Date</p>
                <p className="text-lg font-semibold">{property.listedDate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Days on Market</p>
                <p className="text-2xl font-bold">{property.daysOnMarket}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-3xl font-bold">{stats.totalViews.toLocaleString()}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    +12% vs last period
                  </p>
                </div>
                <Eye className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Favorites</p>
                  <p className="text-3xl font-bold">{stats.favorites}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    +8% vs last period
                  </p>
                </div>
                <Heart className="w-10 h-10 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Showing Requests</p>
                  <p className="text-3xl font-bold">{stats.showingRequests}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    +15% vs last period
                  </p>
                </div>
                <Calendar className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Views Over Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Views & Favorites Over Time</CardTitle>
                <CardDescription>Track how interest in your property changes over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={viewsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} name="Views" />
                    <Line type="monotone" dataKey="favorites" stroke="#ef4444" strokeWidth={2} name="Favorites" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Activity Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Breakdown</CardTitle>
                <CardDescription>Distribution of user actions on your property</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-4">
            {/* Lead Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Sources</CardTitle>
                <CardDescription>Where your property views are coming from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leadSources.map((source, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{source.source}</span>
                        <span className="text-sm text-muted-foreground">
                          {source.count} leads ({source.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${source.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Engagement Metrics */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">Avg Time on Page</p>
                  <p className="text-2xl font-bold">{stats.avgTimeOnPage}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">Lead Generation</p>
                  <p className="text-2xl font-bold">{stats.leadGeneration}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">Conversion Rate</p>
                  <p className="text-2xl font-bold">7.2%</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-4">
            {leads.map((lead) => (
              <Card key={lead.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{lead.name}</h3>
                        {getInterestBadge(lead.interest)}
                      </div>
                      <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {lead.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {lead.phone}
                        </div>
                        <div>
                          <span className="font-medium">Source:</span> {lead.source}
                        </div>
                        <div>
                          <span className="font-medium">Last Contact:</span> {lead.lastContact}
                        </div>
                        <div>
                          <span className="font-medium">Actions:</span> {lead.actions} interactions
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                      <Button size="sm" variant="outline">
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            {recentActivity.map((activity) => {
              const Icon = activity.icon;
              return (
                <Card key={activity.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.user}</p>
                        <p className="text-sm text-muted-foreground">{activity.action}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {activity.timestamp}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
