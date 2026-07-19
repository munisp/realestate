// @ts-nocheck
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { APP_TITLE, getLoginUrl } from "@/const";
import { 
  Building2, Clock, CheckCircle2, AlertCircle, Upload, 
  FileText, Calendar, DollarSign, Loader2, Image as ImageIcon,
  MessageSquare, Download, Eye
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";

export default function MyProjects() {
  const { user, isAuthenticated } = useAuth();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [updateNotes, setUpdateNotes] = useState("");

  const { data: projects, isLoading } = trpc.builderProjects.getMyProjects.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: projectDetails } = trpc.builderProjects.getById.useQuery(
    { id: selectedProject! },
    { enabled: !!selectedProject }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to view your construction projects</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      case "pending": return "bg-yellow-500";
      case "on_hold": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Construction Projects</h1>
              <p className="text-gray-600 mt-1">Track progress and manage your building projects</p>
            </div>
            <Link href="/builders">
              <Button variant="outline">
                <Building2 className="h-4 w-4 mr-2" />
                Find Builders
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Projects</p>
                  <p className="text-2xl font-bold">{projects?.length || 0}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold">
                    {projects?.filter(p => p.status === "in_progress").length || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold">
                    {projects?.filter(p => p.status === "completed").length || 0}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Investment</p>
                  <p className="text-2xl font-bold">
                    ${projects?.reduce((sum, p) => sum + Number(p.budget), 0).toLocaleString() || 0}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects List */}
        {!projects || projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Projects Yet</h3>
              <p className="text-gray-600 mb-6">Start your construction journey by finding verified builders</p>
              <Link href="/builders">
                <Button>Browse Builders</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{project.name}</h3>
                        <Badge className={getStatusColor(project.status)}>
                          {getStatusLabel(project.status)}
                        </Badge>
                      </div>
                      <p className="text-gray-600">{project.description}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedProject(project.id)}
                    >
                      View Details
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4" />
                      <span>Budget: ${Number(project.budget).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Start: {format(new Date(project.startDate), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>End: {format(new Date(project.endDate), "MMM d, yyyy")}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Overall Progress</span>
                      <span className="font-semibold">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Project Details Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{projectDetails?.name}</DialogTitle>
            <DialogDescription>{projectDetails?.description}</DialogDescription>
          </DialogHeader>

          {projectDetails && (
            <Tabs defaultValue="milestones" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="milestones" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Project Milestones</h3>
                  <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Update
                  </Button>
                </div>

                {/* Milestone Timeline */}
                <div className="space-y-4">
                  {[
                    { name: "Foundation", status: "completed", progress: 100, date: "2024-01-15" },
                    { name: "Framing", status: "completed", progress: 100, date: "2024-02-20" },
                    { name: "Roofing", status: "in_progress", progress: 65, date: "2024-03-10" },
                    { name: "Electrical", status: "pending", progress: 0, date: "2024-04-01" },
                    { name: "Plumbing", status: "pending", progress: 0, date: "2024-04-15" },
                    { name: "Interior Finish", status: "pending", progress: 0, date: "2024-05-01" },
                  ].map((milestone, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        {milestone.status === "completed" ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : milestone.status === "in_progress" ? (
                          <Clock className="h-6 w-6 text-blue-500" />
                        ) : (
                          <AlertCircle className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{milestone.name}</h4>
                          <Badge variant={milestone.status === "completed" ? "default" : "secondary"}>
                            {getStatusLabel(milestone.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(milestone.date), "MMM d, yyyy")}</span>
                        </div>
                        <Progress value={milestone.progress} className="h-2" />
                        <p className="text-sm text-gray-600 mt-1">{milestone.progress}% complete</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="photos" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Construction Photos</h3>
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photos
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden group cursor-pointer">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-gray-400" />
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="sm" variant="secondary">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="secondary">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="text-white text-sm">Foundation - Jan 15</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="payments" className="space-y-4">
                <h3 className="text-lg font-semibold">Payment Schedule</h3>

                <div className="space-y-3">
                  {[
                    { milestone: "Foundation", amount: 50000, status: "paid", date: "2024-01-15" },
                    { milestone: "Framing", amount: 75000, status: "paid", date: "2024-02-20" },
                    { milestone: "Roofing", amount: 60000, status: "escrow", date: "2024-03-10" },
                    { milestone: "Electrical", amount: 40000, status: "pending", date: "2024-04-01" },
                    { milestone: "Plumbing", amount: 45000, status: "pending", date: "2024-04-15" },
                  ].map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{payment.milestone}</h4>
                        <p className="text-sm text-gray-600">{format(new Date(payment.date), "MMM d, yyyy")}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${payment.amount.toLocaleString()}</p>
                        <Badge 
                          variant={payment.status === "paid" ? "default" : "secondary"}
                          className={
                            payment.status === "paid" ? "bg-green-500" :
                            payment.status === "escrow" ? "bg-blue-500" :
                            "bg-gray-500"
                          }
                        >
                          {payment.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900">Escrow Protection</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Payments are held in escrow and released to the builder upon milestone completion and your approval.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Project Documents</h3>
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>

                <div className="space-y-3">
                  {[
                    { name: "Building Permit", type: "PDF", size: "2.4 MB", date: "2024-01-10" },
                    { name: "Architectural Plans", type: "PDF", size: "8.7 MB", date: "2024-01-12" },
                    { name: "Contract Agreement", type: "PDF", size: "1.2 MB", date: "2024-01-14" },
                    { name: "Insurance Certificate", type: "PDF", size: "0.8 MB", date: "2024-01-15" },
                  ].map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-500" />
                        <div>
                          <h4 className="font-semibold">{doc.name}</h4>
                          <p className="text-sm text-gray-600">{doc.type} • {doc.size}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Update Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Project Update</DialogTitle>
            <DialogDescription>
              Add photos and notes about the current progress
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Upload Photos</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <Textarea
                placeholder="Describe the progress made..."
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                toast.success("Update uploaded successfully");
                setUploadDialogOpen(false);
                setUpdateNotes("");
              }}>
                Upload Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
