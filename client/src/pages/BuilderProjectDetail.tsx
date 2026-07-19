import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { APP_TITLE, getLoginUrl } from "@/const";
import { 
  Building2, MapPin, Calendar, DollarSign, Home, Bed, Bath, 
  Square, CheckCircle2, Clock, MessageCircle, Phone, Mail,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

// Mock data - replace with actual API call
const mockProject = {
  id: 1,
  projectName: "Lekki Heights Luxury Apartments",
  projectType: "apartment",
  description: "Premium 3-bedroom apartments in the heart of Lekki Phase 1. Modern design with world-class amenities including swimming pool, gym, 24/7 security, and backup power.",
  city: "Lagos",
  state: "Lagos",
  address: "Plot 45, Admiralty Way, Lekki Phase 1",
  constructionStatus: "under_construction",
  completionPercentage: 65,
  totalUnits: 24,
  availableUnits: 12,
  currentPrice: 45000000,
  estimatedCompletionDate: new Date("2025-12-31"),
  bedrooms: 3,
  bathrooms: 3,
  squareFeet: 1500,
  builder: {
    id: 1,
    companyName: "ABC Construction Ltd",
    verificationStatus: "verified",
    yearsInBusiness: 10,
    completedProjects: 15,
  },
  images: [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
  ],
  milestones: [
    { id: 1, name: "Foundation", status: "completed", completedDate: new Date("2024-06-01") },
    { id: 2, name: "Structural Work", status: "completed", completedDate: new Date("2024-10-15") },
    { id: 3, name: "Roofing", status: "in_progress", targetDate: new Date("2025-03-01") },
    { id: 4, name: "Interior Finishing", status: "pending", targetDate: new Date("2025-08-01") },
    { id: 5, name: "Final Inspection", status: "pending", targetDate: new Date("2025-12-01") },
  ],
  amenities: ["Swimming Pool", "Gym", "24/7 Security", "Backup Generator", "Parking", "Elevator"],
};

export default function BuilderProjectDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showInquiryForm, setShowInquiryForm] = useState(false);

  const project = mockProject; // Replace with: trpc.builders.getProjectById.useQuery({ id: Number(id) })

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % project.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + project.images.length) % project.images.length);
  };

  const handleInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    toast.success("Inquiry sent! The builder will contact you soon.");
    setShowInquiryForm(false);
  };

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

  const getMilestoneIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
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
            <Link href="/builder-projects" className="text-foreground hover:text-primary transition-colors">
              Back to Projects
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Image Gallery */}
          <div className="mb-8">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={project.images[currentImageIndex]}
                alt={project.projectName}
                className="w-full h-full object-cover"
              />
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {project.images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2 h-2 rounded-full ${
                      idx === currentImageIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title & Status */}
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{project.projectName}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{project.address}, {project.city}</span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(project.constructionStatus)}>
                    {project.constructionStatus.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Construction Progress</span>
                    <span className="font-semibold">{project.completionPercentage}%</span>
                  </div>
                  <Progress value={project.completionPercentage} />
                </div>
              </div>

              {/* Key Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Bed className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Bedrooms</p>
                        <p className="font-semibold">{project.bedrooms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bath className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Bathrooms</p>
                        <p className="font-semibold">{project.bathrooms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Square className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Size</p>
                        <p className="font-semibold">{project.squareFeet} sqft</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Units Available</p>
                        <p className="font-semibold">{project.availableUnits}/{project.totalUnits}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="description">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="milestones">Milestones</TabsTrigger>
                  <TabsTrigger value="amenities">Amenities</TabsTrigger>
                </TabsList>

                <TabsContent value="description" className="space-y-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-muted-foreground leading-relaxed">
                        {project.description}
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="milestones" className="space-y-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {project.milestones.map((milestone, idx) => (
                          <div key={milestone.id} className="flex items-start gap-4">
                            <div className="mt-1">
                              {getMilestoneIcon(milestone.status)}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold mb-1">{milestone.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {milestone.status === "completed"
                                  ? `Completed ${milestone.completedDate?.toLocaleDateString()}`
                                  : `Target: ${milestone.targetDate?.toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="amenities" className="space-y-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-3">
                        {project.amenities.map((amenity, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Price Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-3xl">
                    ₦{project.currentPrice.toLocaleString()}
                  </CardTitle>
                  <CardDescription>Current price per unit</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Est. completion: {project.estimatedCompletionDate.toLocaleDateString()}</span>
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => setShowInquiryForm(true)}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Make an Inquiry
                  </Button>
                </CardContent>
              </Card>

              {/* Builder Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Builder Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-semibold">{project.builder.companyName}</p>
                    <Badge className="mt-1 bg-green-500">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Verified Builder
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{project.builder.yearsInBusiness} years in business</p>
                    <p>{project.builder.completedProjects} completed projects</p>
                  </div>
                </CardContent>
              </Card>

              {/* Inquiry Form */}
              {showInquiryForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>Send Inquiry</CardTitle>
                    <CardDescription>
                      Get in touch with the builder
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleInquiry} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" required defaultValue={user?.name || ""} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" required defaultValue={user?.email || ""} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" type="tel" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea id="message" required rows={4} />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1">Send</Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowInquiryForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
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
