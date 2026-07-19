import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, MapPin, Calendar, TrendingUp, Shield, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { SaveSearchDialog } from "@/components/SaveSearchDialog";

export default function BuilderProjects() {
  const { isAuthenticated } = useAuth();
  const [constructionStatus, setConstructionStatus] = useState<string>("");
  const [city, setCity] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100000000);

  // Fetch builder projects with filters
  const { data: projects, isLoading } = trpc.builderProjects.list.useQuery({
    constructionStatus: constructionStatus as any || undefined,
    city: city || undefined,
    minPrice: minPrice > 0 ? minPrice : undefined,
    maxPrice: maxPrice < 100000000 ? maxPrice : undefined,
    limit: 20,
  });

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
            <Link href="/properties" className="text-foreground hover:text-primary transition-colors">
              Properties
            </Link>
            <Link href="/short-lets" className="text-foreground hover:text-primary transition-colors">
              Short-lets
            </Link>
            {isAuthenticated ? (
              <Link href="/dashboard" className="text-foreground hover:text-primary transition-colors">
                Dashboard
              </Link>
            ) : (
              <Button asChild>
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Page Header */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12">
        <div className="container mx-auto px-4">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <h1 className="text-4xl font-bold mb-4">Builder Projects</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Invest in new construction from verified builders - pre-construction, under construction, or completed projects
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Select value={constructionStatus} onValueChange={setConstructionStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Construction Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pre_construction">Pre-Construction</SelectItem>
                <SelectItem value="under_construction">Under Construction</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />

            <div className="flex gap-2">
              <SaveSearchDialog
                searchCriteria={{
                  constructionStatus,
                  city,
                  minPrice,
                  maxPrice,
                }}
                variant="default"
                size="default"
              />
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setConstructionStatus("");
                  setCity("");
                  setMinPrice(0);
                  setMaxPrice(100000000);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Price Range: ₦{minPrice.toLocaleString()} - ₦{maxPrice.toLocaleString()}
            </label>
            <Slider
              min={0}
              max={100000000}
              step={1000000}
              value={[minPrice, maxPrice]}
              onValueChange={([min, max]) => {
                setMinPrice(min);
                setMaxPrice(max);
              }}
            />
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted" />
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                const images = project.images ? JSON.parse(project.images) : [];
                const primaryImage = images[0] || "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800";

                return (
                  <Link key={project.id} href={`/builder-project/${project.id}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                      <div className="relative h-48 overflow-hidden rounded-t-lg">
                        <img
                          src={primaryImage}
                          alt={project.projectName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge className={getStatusColor(project.constructionStatus)}>
                            {getStatusLabel(project.constructionStatus)}
                          </Badge>
                        </div>
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                          ₦{project.currentPrice.toLocaleString()}
                        </div>
                      </div>

                      <CardHeader>
                        <CardTitle className="line-clamp-1">{project.projectName}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {project.projectType.replace("_", " ").toUpperCase()}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Progress Bar */}
                        {project.constructionStatus !== "completed" && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-semibold">{project.completionPercentage}%</span>
                            </div>
                            <Progress value={project.completionPercentage || 0} />
                          </div>
                        )}

                        {/* Project Details */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {project.totalUnits && project.totalUnits > 1 && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Building2 className="h-4 w-4" />
                              <span>{project.availableUnits || 0}/{project.totalUnits} units</span>
                            </div>
                          )}
                          {project.estimatedCompletionDate && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(project.estimatedCompletionDate).getFullYear()}</span>
                            </div>
                          )}
                        </div>

                        {/* Price Info */}
                        {project.originalPrice !== project.currentPrice && (
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-muted-foreground line-through">
                              ₦{project.originalPrice.toLocaleString()}
                            </span>
                            <Badge variant="secondary" className="text-green-600">
                              Save ₦{(project.originalPrice - project.currentPrice).toLocaleString()}
                            </Badge>
                          </div>
                        )}
                      </CardContent>

                      <CardFooter>
                        <Button variant="outline" className="w-full">
                          View Project Details
                        </Button>
                      </CardFooter>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Projects Found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your filters or check back later for new projects
              </p>
              <Button asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Info Banner */}
      <section className="bg-primary/5 border-t py-8">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Verified Builders</h3>
              <p className="text-sm text-muted-foreground">
                All builders undergo rigorous verification and background checks
              </p>
            </div>
            <div>
              <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Milestone Payments</h3>
              <p className="text-sm text-muted-foreground">
                Funds released only when construction milestones are verified
              </p>
            </div>
            <div>
              <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Progress Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Weekly updates and scheduled site visits to monitor progress
              </p>
            </div>
          </div>
        </div>
      </section>

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
