import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Upload, Download, Share2, Trash2, Eye,
  FolderOpen, Clock, AlertCircle, CheckCircle2, Users
} from "lucide-react";
import { toast } from "sonner";

export default function DocumentVault() {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  // Mock data
  const documents = [
    {
      id: 1,
      name: "Pre-Approval Letter",
      category: "financing",
      size: "245 KB",
      uploadedDate: "2024-01-15",
      expiresDate: "2024-04-15",
      sharedWith: ["agent@example.com"],
      version: 1,
      status: "active",
    },
    {
      id: 2,
      name: "Home Inspection Report",
      category: "inspection",
      size: "1.2 MB",
      uploadedDate: "2024-01-18",
      expiresDate: null,
      sharedWith: ["agent@example.com", "lender@example.com"],
      version: 2,
      status: "active",
    },
    {
      id: 3,
      name: "Purchase Agreement",
      category: "contracts",
      size: "890 KB",
      uploadedDate: "2024-01-20",
      expiresDate: null,
      sharedWith: ["agent@example.com", "attorney@example.com"],
      version: 3,
      status: "active",
    },
    {
      id: 4,
      name: "Title Insurance Policy",
      category: "closing",
      size: "567 KB",
      uploadedDate: "2024-01-10",
      expiresDate: null,
      sharedWith: [],
      version: 1,
      status: "active",
    },
    {
      id: 5,
      name: "Homeowners Insurance Quote",
      category: "insurance",
      size: "123 KB",
      uploadedDate: "2024-01-12",
      expiresDate: "2024-02-12",
      sharedWith: ["lender@example.com"],
      version: 1,
      status: "expiring",
    },
  ];

  const categories = [
    { value: "all", label: "All Documents", count: documents.length },
    { value: "financing", label: "Financing", count: 1 },
    { value: "inspection", label: "Inspection", count: 1 },
    { value: "contracts", label: "Contracts", count: 1 },
    { value: "closing", label: "Closing", count: 1 },
    { value: "insurance", label: "Insurance", count: 1 },
  ];

  const stats = {
    totalDocuments: documents.length,
    sharedDocuments: documents.filter(d => d.sharedWith.length > 0).length,
    expiringDocuments: documents.filter(d => d.status === "expiring").length,
    storageUsed: "3.9 MB",
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive", icon: any }> = {
      active: { variant: "default", icon: CheckCircle2 },
      expiring: { variant: "destructive", icon: AlertCircle },
    };
    const config = variants[status] || { variant: "secondary" as const, icon: FileText };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status === "expiring" ? "Expiring Soon" : "Active"}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    return <FolderOpen className="w-4 h-4" />;
  };

  const handleShare = (doc: any) => {
    setSelectedDocument(doc);
    setShowShareDialog(true);
  };

  const handleDownload = (doc: any) => {
    toast.success(`Downloading ${doc.name}...`);
  };

  const handleDelete = (doc: any) => {
    toast.success(`${doc.name} deleted successfully`);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Document Vault</h1>
            <p className="text-muted-foreground">Securely store and share your real estate documents</p>
          </div>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Add a new document to your vault
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Document Name</Label>
                  <Input placeholder="e.g., Pre-Approval Letter" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financing">Financing</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="contracts">Contracts</SelectItem>
                      <SelectItem value="closing">Closing</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>File</Label>
                  <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png" />
                  <p className="text-xs text-muted-foreground">
                    Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Expiration Date (Optional)</Label>
                  <Input type="date" />
                  <p className="text-xs text-muted-foreground">
                    Set a reminder for when this document expires
                  </p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1" onClick={() => {
                    toast.success("Document uploaded successfully");
                    setShowUploadDialog(false);
                  }}>
                    Upload
                  </Button>
                  <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
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
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                  <p className="text-2xl font-bold">{stats.totalDocuments}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Shared Documents</p>
                  <p className="text-2xl font-bold">{stats.sharedDocuments}</p>
                </div>
                <Share2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold">{stats.expiringDocuments}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Storage Used</p>
                  <p className="text-2xl font-bold">{stats.storageUsed}</p>
                </div>
                <FolderOpen className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            {categories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.label} ({cat.count})
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat.value} value={cat.value} className="space-y-4">
              {documents
                .filter(doc => cat.value === "all" || doc.category === cat.value)
                .map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold truncate">{doc.name}</h3>
                                {getStatusBadge(doc.status)}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  {getCategoryIcon(doc.category)}
                                  {doc.category}
                                </span>
                                <span>{doc.size}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {doc.uploadedDate}
                                </span>
                                {doc.version > 1 && (
                                  <Badge variant="outline">v{doc.version}</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {doc.expiresDate && (
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-orange-600" />
                              <span className="text-sm text-muted-foreground">
                                Expires on {doc.expiresDate}
                              </span>
                            </div>
                          )}

                          {doc.sharedWith.length > 0 && (
                            <div className="flex items-center gap-2 mb-3">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Shared with {doc.sharedWith.length} {doc.sharedWith.length === 1 ? "person" : "people"}
                              </span>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleShare(doc)}>
                              <Share2 className="w-4 h-4 mr-2" />
                              Share
                            </Button>
                            <Button size="sm" variant="outline">
                              <Upload className="w-4 h-4 mr-2" />
                              New Version
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-destructive"
                              onClick={() => handleDelete(doc)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* Share Dialog */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Document</DialogTitle>
              <DialogDescription>
                Share "{selectedDocument?.name}" with others
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input placeholder="agent@example.com" type="email" />
                <p className="text-xs text-muted-foreground">
                  Enter the email address of the person you want to share with
                </p>
              </div>
              <div className="space-y-2">
                <Label>Permission Level</Label>
                <Select defaultValue="view">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="download">View & Download</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expiration (Optional)</Label>
                <Input type="date" />
                <p className="text-xs text-muted-foreground">
                  Set when this share link should expire
                </p>
              </div>
              {selectedDocument?.sharedWith && selectedDocument.sharedWith.length > 0 && (
                <div className="space-y-2">
                  <Label>Currently Shared With</Label>
                  <div className="space-y-2">
                    {selectedDocument.sharedWith.map((email: string, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{email}</span>
                        <Button size="sm" variant="ghost" onClick={() => toast.success("Access revoked")}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button className="flex-1" onClick={() => {
                  toast.success("Document shared successfully");
                  setShowShareDialog(false);
                }}>
                  Share
                </Button>
                <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Document Security & Privacy</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All documents are encrypted in transit and at rest</li>
                  <li>• You control who has access to your documents</li>
                  <li>• Shared links can be revoked at any time</li>
                  <li>• We'll remind you when documents are about to expire</li>
                  <li>• Version control keeps track of all document updates</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
