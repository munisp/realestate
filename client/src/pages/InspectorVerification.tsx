import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Building2, CheckCircle, XCircle, Image as ImageIcon, FileText, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function InspectorVerification() {
  const { user, isAuthenticated } = useAuth();
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [verificationNotes, setVerificationNotes] = useState("");

  if (!isAuthenticated || user?.role !== "admin") {
    window.location.href = getLoginUrl();
    return null;
  }

  // Mock data - replace with actual API
  const pendingMilestones = [
    {
      id: 1,
      projectId: 101,
      projectName: "4BR Duplex - Lekki Phase 2",
      builderId: 5,
      builderName: "Premium Homes Ltd",
      milestoneName: "Roofing",
      description: "Complete roofing structure with waterproofing",
      escrowAmount: 8000000,
      submittedDate: "2025-01-15",
      photos: [
        "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800",
        "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800",
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800",
      ],
      builderNotes: "Roofing completed with premium waterproof materials. All structural elements verified by site engineer.",
    },
    {
      id: 2,
      projectId: 102,
      projectName: "3BR Bungalow - Ikoyi",
      builderId: 8,
      builderName: "Elite Builders",
      milestoneName: "Foundation",
      description: "Foundation laying and ground floor slab",
      escrowAmount: 5000000,
      submittedDate: "2025-01-18",
      photos: [
        "https://images.unsplash.com/photo-1590496793929-7223c8f6e5c2?w=800",
      ],
      builderNotes: "Foundation completed as per approved plans.",
    },
  ];

  const handleApprove = () => {
    if (!selectedMilestone) return;
    toast.success(`Milestone "${selectedMilestone.milestoneName}" approved. Escrow funds will be released.`);
    setSelectedMilestone(null);
    setVerificationNotes("");
  };

  const handleReject = () => {
    if (!selectedMilestone) return;
    if (!verificationNotes.trim()) {
      toast.error("Please provide rejection notes");
      return;
    }
    toast.success(`Milestone "${selectedMilestone.milestoneName}" rejected. Builder will be notified.`);
    setSelectedMilestone(null);
    setVerificationNotes("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>{APP_TITLE}</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/admin/builder-verification" className="text-foreground hover:text-primary transition-colors">
              Builder Verification
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1 py-8">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Milestone Verification</h1>
            <p className="text-muted-foreground">Review and approve construction milestones for escrow release</p>
          </div>

          <div className="grid gap-6">
            {pendingMilestones.map((milestone) => (
              <Card key={milestone.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{milestone.projectName}</CardTitle>
                      <CardDescription className="mt-2">
                        Milestone: {milestone.milestoneName} • Builder: {milestone.builderName}
                      </CardDescription>
                    </div>
                    <Badge>Pending Review</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Submitted</p>
                        <p className="font-medium">{new Date(milestone.submittedDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Escrow Amount</p>
                        <p className="font-medium">₦{milestone.escrowAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Photos</p>
                        <p className="font-medium">{milestone.photos.length} uploaded</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Project ID</p>
                        <p className="font-medium">#{milestone.projectId}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Description</p>
                      <p>{milestone.description}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Builder Notes</p>
                      <p className="text-sm bg-muted p-3 rounded-lg">{milestone.builderNotes}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-3">Progress Photos</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {milestone.photos.map((photo, idx) => (
                          <Dialog key={idx}>
                            <DialogTrigger asChild>
                              <div className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity">
                                <img src={photo} alt={`Progress ${idx + 1}`} className="w-full h-full object-cover" />
                              </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Progress Photo {idx + 1}</DialogTitle>
                              </DialogHeader>
                              <img src={photo} alt={`Progress ${idx + 1}`} className="w-full rounded-lg" />
                            </DialogContent>
                          </Dialog>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t">
                      <Dialog open={selectedMilestone?.id === milestone.id} onOpenChange={(open) => !open && setSelectedMilestone(null)}>
                        <DialogTrigger asChild>
                          <Button onClick={() => setSelectedMilestone(milestone)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve & Release Escrow
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Approve Milestone</DialogTitle>
                            <DialogDescription>
                              This will release ₦{milestone.escrowAmount.toLocaleString()} from escrow to the builder
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Textarea
                              placeholder="Add verification notes (optional)"
                              value={verificationNotes}
                              onChange={(e) => setVerificationNotes(e.target.value)}
                              rows={4}
                            />
                            <div className="flex gap-4">
                              <Button onClick={handleApprove} className="flex-1">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Confirm Approval
                              </Button>
                              <Button variant="outline" onClick={() => setSelectedMilestone(null)} className="flex-1">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" onClick={() => setSelectedMilestone(milestone)}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reject Milestone</DialogTitle>
                            <DialogDescription>
                              Please provide detailed feedback for the builder
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Textarea
                              placeholder="Rejection notes (required)"
                              value={verificationNotes}
                              onChange={(e) => setVerificationNotes(e.target.value)}
                              rows={4}
                              required
                            />
                            <div className="flex gap-4">
                              <Button variant="destructive" onClick={handleReject} className="flex-1">
                                <XCircle className="mr-2 h-4 w-4" />
                                Confirm Rejection
                              </Button>
                              <Button variant="outline" onClick={() => { setSelectedMilestone(null); setVerificationNotes(""); }} className="flex-1">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {pendingMilestones.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending milestones to review</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
