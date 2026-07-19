// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, Download, FileText, Plus, Upload } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { storagePut } from "../../../server/storage";

export default function Documents() {
  const { isAuthenticated, user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState<"contract" | "disclosure" | "inspection" | "appraisal" | "title" | "other">("other");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: transactions } = trpc.transactions.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const uploadDocumentMutation = trpc.documents.upload.useMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      toast.error("Please provide a title and select a file");
      return;
    }

    setUploading(true);
    try {
      // Note: In a real implementation, you would upload to S3 here
      // For now, we'll create a placeholder URL
      const fileUrl = `https://storage.example.com/documents/${Date.now()}-${selectedFile.name}`;

      await uploadDocumentMutation.mutateAsync({
        documentType,
        title,
        description: description || undefined,
        fileUrl,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
      });

      toast.success("Document uploaded successfully!");
      setIsDialogOpen(false);
      setTitle("");
      setDescription("");
      setSelectedFile(null);
    } catch (error) {
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to manage documents</CardDescription>
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>Real Estate Platform</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/properties" className="text-muted-foreground hover:text-foreground transition-colors">
              Properties
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Documents</h1>
            <p className="text-muted-foreground">
              Manage contracts, disclosures, and other transaction documents
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a document related to your property transaction
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Purchase Agreement"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Document Type</Label>
                  <Select value={documentType} onValueChange={(v: any) => setDocumentType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="disclosure">Disclosure</SelectItem>
                      <SelectItem value="inspection">Inspection Report</SelectItem>
                      <SelectItem value="appraisal">Appraisal</SelectItem>
                      <SelectItem value="title">Title Document</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add any notes about this document..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">File</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                    />
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
                  {uploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-pulse" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {!transactions || transactions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No transactions yet</p>
              <p className="text-sm text-muted-foreground">
                Documents will appear here once you have active transactions
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {transactions.map((transaction: any) => {
              const { data: docs } = trpc.documents.getByTransaction.useQuery(
                { transactionId: transaction.id },
                { enabled: !!transaction.id }
              );

              return (
                <Card key={transaction.id}>
                  <CardHeader>
                    <CardTitle>Transaction #{transaction.id}</CardTitle>
                    <CardDescription>
                      {transaction.status} • ${transaction.amount?.toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!docs || docs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                    ) : (
                      <div className="space-y-2">
                        {docs.map(doc => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{doc.title}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span className="capitalize">{doc.documentType}</span>
                                  <span>•</span>
                                  <span className="capitalize">{doc.status}</span>
                                  {doc.fileSize && (
                                    <>
                                      <span>•</span>
                                      <span>{(doc.fileSize / 1024).toFixed(2)} KB</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" asChild>
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
