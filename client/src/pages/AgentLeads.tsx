import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { TrendingUp, User, Eye, Heart, MessageSquare, Calendar } from "lucide-react";
import { Link } from "wouter";

export default function AgentLeads() {
  const { user, isAuthenticated } = useAuth();
  const { data: leads } = trpc.analytics.getQualifiedLeads.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin', // Restrict to agents/admins
  });

  if (!isAuthenticated) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Please sign in to view leads</p>
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">This page is only available to agents</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getIntentBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-green-600">Hot Lead</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-600">Warm Lead</Badge>;
    return <Badge variant="secondary">Cold Lead</Badge>;
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Qualified Leads</h1>
        <p className="text-muted-foreground">
          Buyers showing high intent based on their activity and engagement
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hot Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Intent Score 70+</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warm Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Intent Score 40-69</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All tracked buyers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Leads</CardTitle>
          <CardDescription>Sorted by intent score (highest first)</CardDescription>
        </CardHeader>
        <CardContent>
          {!leads || leads.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No leads yet</h3>
              <p className="text-muted-foreground mb-4">
                Leads will appear here as buyers interact with properties
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Example lead card structure */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Example Buyer</h4>
                      <p className="text-sm text-muted-foreground">example@email.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getIntentBadge(75)}
                    <div className="flex items-center gap-1 text-sm">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-medium">75</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span>12 views</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span>3 favorites</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>2 inquiries</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>1 viewing</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="default">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Contact
                  </Button>
                  <Button size="sm" variant="outline">
                    View Activity
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
