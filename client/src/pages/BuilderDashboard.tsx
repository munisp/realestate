import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Building2, Plus, Upload, Calendar, DollarSign, Users, 
  TrendingUp, AlertCircle, CheckCircle2, Clock 
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { PhotoGalleryManager } from "@/components/PhotoGalleryManager";

export default function BuilderDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreateProject, setShowCreateProject] = useState(false);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  // Fetch builder profile
  const { data: builderProfile } = trpc.builders.getMyProfile.useQuery();

  // Fetch builder's projects
  const { data: projects, refetch: refetchProjects } = trpc.builders.getProjects.useQuery(
    { builderId: builderProfile?.id || 0 },
    { enabled: !!builderProfile?.id }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pre_construction":
        return "bg-yellow-500";
      case "under_construction":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pre_construction":
        return "Pre-Construction";
      case "under_construction":
        return "Under Construction";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>{APP_TITLE}</span>
          </Link>
          <nav className="flex items-center gap-6">
            <span className="text-sm text-muted-foreground">
              {user?.name || user?.email}
            </span>
            <Link href="/dashboard" className="text-foreground hover:text-primary transition-colors">
              My Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Builder Profile Check */}
          {!builderProfile ? (
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                  Builder Profile Required
                </CardTitle>
                <CardDescription>
                  You need to create a builder profile before you can manage projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  To become a verified builder on our platform, you'll need to provide:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-6">
                  <li>Company registration (CAC) documents</li>
                  <li>Building licenses and certifications</li>
                  <li>Portfolio of completed projects</li>
                  <li>Bank account details for escrow payments</li>
                </ul>
                <Button>
                  Apply to Become a Builder
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Builder Dashboard</h1>
                  <p className="text-muted-foreground">
                    Manage your projects, track sales, and update construction progress
                  </p>
                </div>
                <Button onClick={() => setShowCreateProject(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </div>

              {/* Stats Cards */}
              <div className="grid md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Projects</CardDescription>
                    <CardTitle className="text-3xl">{projects?.length || 0}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>Active listings</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Units Sold</CardDescription>
                    <CardTitle className="text-3xl">0</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      <span>+0% this month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Revenue</CardDescription>
                    <CardTitle className="text-3xl">₦0</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>All time</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Active Buyers</CardDescription>
                    <CardTitle className="text-3xl">0</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Interested buyers</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Projects Tabs */}
              <Tabs defaultValue="all" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="all">All Projects</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  {projects && projects.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      {projects.map((project) => (
                        <Card key={project.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="mb-2">{project.projectName}</CardTitle>
                                <CardDescription className="flex items-center gap-2">
                                  <Badge className={getStatusColor(project.constructionStatus)}>
                                    {getStatusLabel(project.constructionStatus)}
                                  </Badge>
                                  <span className="text-xs">
                                    {project.projectType.replace("_", " ").toUpperCase()}
                                  </span>
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-4">
                            {/* Progress */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Completion</span>
                                <span className="font-semibold">{project.completionPercentage}%</span>
                              </div>
                              <Progress value={project.completionPercentage || 0} />
                            </div>

                            {/* Units */}
                            {project.totalUnits && project.totalUnits > 1 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Units Available</span>
                                <span className="font-semibold">
                                  {project.availableUnits || 0} / {project.totalUnits}
                                </span>
                              </div>
                            )}

                            {/* Price */}
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Current Price</span>
                              <span className="font-semibold">
                                ₦{project.currentPrice.toLocaleString()}
                              </span>
                            </div>

                            {/* Completion Date */}
                            {project.estimatedCompletionDate && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  Est. completion: {new Date(project.estimatedCompletionDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </CardContent>

                          <CardFooter className="flex gap-2">
                            <Button variant="outline" className="flex-1">
                              Edit Project
                            </Button>
                            <Button variant="outline" className="flex-1">
                              Update Progress
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-16 text-center">
                        <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
                        <p className="text-muted-foreground mb-6">
                          Create your first project to start selling units
                        </p>
                        <Button onClick={() => setShowCreateProject(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Project
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="active">
                  <Card>
                    <CardContent className="py-16 text-center">
                      <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Active projects will appear here</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="completed">
                  <Card>
                    <CardContent className="py-16 text-center">
                      <CheckCircle2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Completed projects will appear here</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2025 {APP_TITLE}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
