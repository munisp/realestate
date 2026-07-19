import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileSignature,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Send,
  Eye,
  FileText,
  Users,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { getLoginUrl } from '@/const';

export default function DocumentSigning() {
  const { user, isAuthenticated } = useAuth();
  const [selectedTab, setSelectedTab] = useState('pending');

  const { data: documents, isLoading, refetch } = trpc.eSignature.getMyDocuments.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
    }
  );

  const { data: stats } = trpc.eSignature.getStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const sendReminderMutation = trpc.eSignature.sendReminder.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
  });

  const voidDocumentMutation = trpc.eSignature.voidDocument.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_signature':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'partially_signed':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-blue-600">
            <FileSignature className="h-3 w-3" />
            Partially Signed
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        );
      case 'voided':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Voided
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Document Signing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Sign in to manage and sign your property documents electronically.
            </p>
            <Button className="w-full" asChild>
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  const pendingDocs = documents?.filter(
    (d: any) => d.status === 'pending_signature' || d.status === 'partially_signed'
  ) || [];
  const completedDocs = documents?.filter((d: any) => d.status === 'completed') || [];
  const voidedDocs = documents?.filter((d: any) => d.status === 'voided') || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <FileSignature className="h-8 w-8 text-primary" />
                Document Signing
              </h1>
              <p className="text-muted-foreground">
                Manage and sign property documents electronically
              </p>
            </div>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid md:grid-cols-4 gap-4 mt-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Total Documents</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Pending Signature</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Avg. Completion</p>
                  <p className="text-2xl font-bold">{stats.avgCompletionTime} days</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingDocs.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedDocs.length})
            </TabsTrigger>
            <TabsTrigger value="voided">Voided ({voidedDocs.length})</TabsTrigger>
          </TabsList>

          {/* Pending Documents */}
          <TabsContent value="pending" className="space-y-4">
            {pendingDocs.length > 0 ? (
              pendingDocs.map((doc: any) => (
                <Card key={doc.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h3 className="font-semibold text-lg">{doc.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {getDocumentTypeLabel(doc.type)}
                            </p>
                          </div>
                        </div>

                        {doc.propertyTitle && (
                          <Link href={`/property/${doc.propertyId}`}>
                            <Button variant="link" className="p-0 h-auto text-sm mb-3">
                              Property: {doc.propertyTitle}
                            </Button>
                          </Link>
                        )}

                        {/* Signers Status */}
                        <div className="space-y-2 mb-4">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Signers ({doc.signers.filter((s: any) => s.status === 'signed').length}/
                            {doc.signers.length})
                          </p>
                          <div className="space-y-1">
                            {doc.signers.map((signer: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                              >
                                <div>
                                  <span className="font-medium">{signer.name}</span>
                                  <span className="text-muted-foreground ml-2">
                                    ({signer.role})
                                  </span>
                                </div>
                                {signer.status === 'signed' ? (
                                  <Badge variant="default" className="bg-green-600">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Signed
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                          {getStatusBadge(doc.status)}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Link href={`/documents/sign/${doc.id}`}>
                          <Button size="sm">
                            <FileSignature className="h-4 w-4 mr-2" />
                            Sign
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendReminderMutation.mutate({ documentId: doc.id })}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Remind
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to void this document?')) {
                              voidDocumentMutation.mutate({
                                documentId: doc.id,
                                reason: 'User requested',
                              });
                            }
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Void
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Pending Documents</h3>
                  <p className="text-muted-foreground">
                    All documents are signed or there are no documents awaiting signature
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Completed Documents */}
          <TabsContent value="completed" className="space-y-4">
            {completedDocs.length > 0 ? (
              completedDocs.map((doc: any) => (
                <Card key={doc.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h3 className="font-semibold text-lg">{doc.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {getDocumentTypeLabel(doc.type)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                          <span>Completed {new Date(doc.completedAt).toLocaleDateString()}</span>
                          {getStatusBadge(doc.status)}
                        </div>

                        <p className="text-sm text-muted-foreground">
                          Signed by {doc.signers.length} parties
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Link href={`/documents/${doc.id}/audit`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Audit Trail
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Completed Documents</h3>
                  <p className="text-muted-foreground">
                    Completed documents will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Voided Documents */}
          <TabsContent value="voided" className="space-y-4">
            {voidedDocs.length > 0 ? (
              voidedDocs.map((doc: any) => (
                <Card key={doc.id} className="opacity-60">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">{doc.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {getDocumentTypeLabel(doc.type)}
                        </p>
                        {getStatusBadge(doc.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <XCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Voided Documents</h3>
                  <p className="text-muted-foreground">
                    Voided documents will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
