import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Building2, CheckCircle2, Circle, Upload, Calendar, 
  FileText, DollarSign, Home, Search, ClipboardCheck, Award 
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function BuyersChecklist() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { data: checklist, isLoading } = trpc.checklist.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const toggleTaskMutation = trpc.checklist.toggleTask.useMutation({
    onSuccess: () => {
      utils.checklist.get.invalidate();
      toast.success("Task updated");
    },
  });

  const uploadDocumentMutation = trpc.checklist.uploadDocument.useMutation({
    onSuccess: () => {
      utils.checklist.get.invalidate();
      setUploadDialogOpen(false);
      setUploadFile(null);
      toast.success("Document uploaded successfully");
    },
  });

  const handleToggleTask = async (milestoneId: number, taskId: number, completed: boolean) => {
    try {
      await toggleTaskMutation.mutateAsync({
        milestoneId,
        taskId,
        completed,
      });
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadFile || !selectedMilestone) {
      toast.error("Please select a file");
      return;
    }

    // In production, this would upload to S3
    try {
      await uploadDocumentMutation.mutateAsync({
        milestoneId: selectedMilestone.id,
        fileName: uploadFile.name,
        fileUrl: `/uploads/${uploadFile.name}`, // Mock URL
      });
    } catch (error) {
      toast.error("Failed to upload document");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please sign in to access your buyer's checklist
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const milestones = checklist?.milestones || [];
  const totalTasks = milestones.reduce((acc: number, m: any) => acc + m.tasks.length, 0);
  const completedTasks = milestones.reduce(
    (acc: number, m: any) => acc + m.tasks.filter((t: any) => t.completed).length,
    0
  );
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'pre_approval':
        return <DollarSign className="w-6 h-6" />;
      case 'property_search':
        return <Search className="w-6 h-6" />;
      case 'offer':
        return <FileText className="w-6 h-6" />;
      case 'inspection':
        return <ClipboardCheck className="w-6 h-6" />;
      case 'appraisal':
        return <Award className="w-6 h-6" />;
      case 'closing':
        return <Home className="w-6 h-6" />;
      default:
        return <Circle className="w-6 h-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>{APP_TITLE}</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <span className="text-sm text-muted-foreground">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Buyer's Checklist</h1>
          <p className="text-muted-foreground">
            Track your progress through the home buying journey
          </p>
        </div>

        {/* Overall Progress */}
        <Card className="mb-8 border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Overall Progress</CardTitle>
                <CardDescription>
                  {completedTasks} of {totalTasks} tasks completed
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-primary">
                  {progressPercentage.toFixed(0)}%
                </p>
                <p className="text-sm text-muted-foreground">Complete</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="h-3" />
          </CardContent>
        </Card>

        {/* Milestones */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {milestones.map((milestone: any, index: number) => {
              const milestoneCompleted = milestone.tasks.every((t: any) => t.completed);
              const milestoneProgress = (milestone.tasks.filter((t: any) => t.completed).length / milestone.tasks.length) * 100;

              return (
                <Card key={milestone.id} className={milestoneCompleted ? 'border-green-500 border-2' : ''}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        milestoneCompleted ? 'bg-green-100 text-green-600 dark:bg-green-900' : 'bg-primary/10 text-primary'
                      }`}>
                        {milestoneCompleted ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          getMilestoneIcon(milestone.type)
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle>{milestone.title}</CardTitle>
                          {milestoneCompleted && (
                            <Badge className="bg-green-600">Completed</Badge>
                          )}
                          <Badge variant="outline">
                            Step {index + 1} of {milestones.length}
                          </Badge>
                        </div>
                        <CardDescription>{milestone.description}</CardDescription>
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">
                              {milestone.tasks.filter((t: any) => t.completed).length} / {milestone.tasks.length} tasks
                            </span>
                            <span className="text-sm font-semibold">
                              {milestoneProgress.toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={milestoneProgress} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Tasks */}
                    <div className="space-y-3 mb-4">
                      {milestone.tasks.map((task: any) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                        >
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={(checked) =>
                              handleToggleTask(milestone.id, task.id, !!checked)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {task.description}
                              </p>
                            )}
                            {task.dueDate && (
                              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                          {task.completed && task.completedAt && (
                            <Badge variant="outline" className="text-xs">
                              ✓ {new Date(task.completedAt).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Documents */}
                    {milestone.documents && milestone.documents.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2">Uploaded Documents</h4>
                        <div className="space-y-2">
                          {milestone.documents.map((doc: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="text-sm">{doc.fileName}</span>
                              </div>
                              <Button variant="ghost" size="sm" asChild>
                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                  View
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upload Button */}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedMilestone(milestone);
                        setUploadDialogOpen(true);
                      }}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Upload documents for: {selectedMilestone?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="document">Select File</Label>
                <Input
                  id="document"
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: PDF, DOC, DOCX, JPG, PNG
                </p>
              </div>
              <Button
                onClick={handleUploadDocument}
                disabled={!uploadFile || uploadDocumentMutation.isPending}
                className="w-full"
              >
                {uploadDocumentMutation.isPending ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
