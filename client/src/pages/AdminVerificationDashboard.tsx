import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Download,
  ZoomIn,
  Home,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Admin Verification Dashboard
 * 
 * Admin panel for reviewing and approving shortlet host and builder applications
 * Includes document viewer, approval/rejection actions, feedback messaging, and status tracking
 */

interface Application {
  id: number;
  type: 'shortlet' | 'builder';
  applicantName: string;
  email: string;
  phone: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_info';
  documents: Document[];
  notes?: string;
  propertyTitle?: string;
  companyName?: string;
}

interface Document {
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

// Mock data
const mockApplications: Application[] = [
  {
    id: 1,
    type: 'shortlet',
    applicantName: 'John Doe',
    email: 'john@example.com',
    phone: '+234 XXX XXX XXXX',
    submittedAt: '2024-01-15T10:30:00',
    status: 'pending',
    propertyTitle: 'Luxury 3BR Apartment in Lekki',
    documents: [
      {
        name: 'National ID',
        type: 'identification',
        url: '/docs/id.pdf',
        uploadedAt: '2024-01-15T10:25:00',
      },
      {
        name: 'Proof of Ownership',
        type: 'ownership',
        url: '/docs/ownership.pdf',
        uploadedAt: '2024-01-15T10:26:00',
      },
    ],
  },
  {
    id: 2,
    type: 'builder',
    applicantName: 'ABC Construction Ltd',
    companyName: 'ABC Construction Ltd',
    email: 'info@abcconstruction.com',
    phone: '+234 XXX XXX XXXX',
    submittedAt: '2024-01-14T14:20:00',
    status: 'pending',
    documents: [
      {
        name: 'CAC Registration',
        type: 'cac',
        url: '/docs/cac.pdf',
        uploadedAt: '2024-01-14T14:15:00',
      },
      {
        name: 'Tax Clearance',
        type: 'tax',
        url: '/docs/tax.pdf',
        uploadedAt: '2024-01-14T14:16:00',
      },
      {
        name: 'Building License',
        type: 'license',
        url: '/docs/license.pdf',
        uploadedAt: '2024-01-14T14:17:00',
      },
    ],
  },
  {
    id: 3,
    type: 'shortlet',
    applicantName: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+234 XXX XXX XXXX',
    submittedAt: '2024-01-13T09:15:00',
    status: 'approved',
    propertyTitle: 'Modern 2BR Condo in Victoria Island',
    documents: [
      {
        name: 'Driver License',
        type: 'identification',
        url: '/docs/license.pdf',
        uploadedAt: '2024-01-13T09:10:00',
      },
      {
        name: 'Tenancy Agreement',
        type: 'ownership',
        url: '/docs/tenancy.pdf',
        uploadedAt: '2024-01-13T09:11:00',
      },
    ],
    notes: 'All documents verified. Property inspection completed.',
  },
];

export default function AdminVerificationDashboard() {
  const [applications, setApplications] = useState<Application[]>(mockApplications);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [feedback, setFeedback] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const filteredApplications = applications.filter(app => {
    if (filterStatus === 'all') return true;
    return app.status === filterStatus;
  });
  
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;
  const needsInfoCount = applications.filter(a => a.status === 'needs_info').length;
  
  const handleApprove = (appId: number) => {
    setApplications(apps =>
      apps.map(app =>
        app.id === appId
          ? { ...app, status: 'approved' as const, notes: feedback || app.notes }
          : app
      )
    );
    toast.success('Application approved! Notification sent to applicant.');
    setFeedback('');
    setSelectedApp(null);
  };
  
  const handleReject = (appId: number) => {
    if (!feedback.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setApplications(apps =>
      apps.map(app =>
        app.id === appId
          ? { ...app, status: 'rejected' as const, notes: feedback }
          : app
      )
    );
    toast.success('Application rejected. Notification sent to applicant.');
    setFeedback('');
    setSelectedApp(null);
  };
  
  const handleRequestInfo = (appId: number) => {
    if (!feedback.trim()) {
      toast.error('Please specify what information is needed');
      return;
    }
    setApplications(apps =>
      apps.map(app =>
        app.id === appId
          ? { ...app, status: 'needs_info' as const, notes: feedback }
          : app
      )
    );
    toast.success('Information request sent to applicant.');
    setFeedback('');
    setSelectedApp(null);
  };
  
  const getStatusBadge = (status: Application['status']) => {
    const variants = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pending' },
      approved: { variant: 'default' as const, icon: CheckCircle, label: 'Approved' },
      rejected: { variant: 'destructive' as const, icon: XCircle, label: 'Rejected' },
      needs_info: { variant: 'outline' as const, icon: AlertCircle, label: 'Needs Info' },
    };
    const { variant, icon: Icon, label } = variants[status];
    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Verification Dashboard</h1>
          <p className="text-muted-foreground">
            Review and approve shortlet host and builder applications
          </p>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{pendingCount}</span>
                <Clock className="w-8 h-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{approvedCount}</span>
                <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{rejectedCount}</span>
                <XCircle className="w-8 h-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Needs Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{needsInfoCount}</span>
                <AlertCircle className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Applications</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="needs_info">Needs Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Applications Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Applications</TabsTrigger>
            <TabsTrigger value="shortlet">
              <Home className="w-4 h-4 mr-2" />
              Shortlet Hosts
            </TabsTrigger>
            <TabsTrigger value="builder">
              <Building2 className="w-4 h-4 mr-2" />
              Builders
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            {filteredApplications.map(app => (
              <ApplicationCard
                key={app.id}
                application={app}
                onSelect={setSelectedApp}
                getStatusBadge={getStatusBadge}
                formatDate={formatDate}
              />
            ))}
          </TabsContent>
          
          <TabsContent value="shortlet" className="space-y-4">
            {filteredApplications
              .filter(app => app.type === 'shortlet')
              .map(app => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onSelect={setSelectedApp}
                  getStatusBadge={getStatusBadge}
                  formatDate={formatDate}
                />
              ))}
          </TabsContent>
          
          <TabsContent value="builder" className="space-y-4">
            {filteredApplications
              .filter(app => app.type === 'builder')
              .map(app => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onSelect={setSelectedApp}
                  getStatusBadge={getStatusBadge}
                  formatDate={formatDate}
                />
              ))}
          </TabsContent>
        </Tabs>
        
        {/* Application Review Dialog */}
        <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedApp?.type === 'shortlet' ? 'Shortlet Host' : 'Builder'} Application Review
              </DialogTitle>
              <DialogDescription>
                Review documents and approve or reject the application
              </DialogDescription>
            </DialogHeader>
            
            {selectedApp && (
              <div className="space-y-6">
                {/* Applicant Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Applicant Name</p>
                    <p className="font-medium">{selectedApp.applicantName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedApp.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedApp.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted</p>
                    <p className="font-medium">{formatDate(selectedApp.submittedAt)}</p>
                  </div>
                  {selectedApp.propertyTitle && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Property</p>
                      <p className="font-medium">{selectedApp.propertyTitle}</p>
                    </div>
                  )}
                  {selectedApp.companyName && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Company</p>
                      <p className="font-medium">{selectedApp.companyName}</p>
                    </div>
                  )}
                </div>
                
                {/* Documents */}
                <div>
                  <h4 className="font-semibold mb-3">Submitted Documents</h4>
                  <div className="space-y-2">
                    {selectedApp.documents.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded {formatDate(doc.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDocument(doc)}
                          >
                            <ZoomIn className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Previous Notes */}
                {selectedApp.notes && (
                  <div>
                    <h4 className="font-semibold mb-2">Previous Notes</h4>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">{selectedApp.notes}</p>
                    </div>
                  </div>
                )}
                
                {/* Feedback */}
                {selectedApp.status === 'pending' && (
                  <div>
                    <h4 className="font-semibold mb-2">Feedback / Notes</h4>
                    <Textarea
                      placeholder="Add notes or feedback for the applicant..."
                      rows={4}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                    />
                  </div>
                )}
                
                {/* Actions */}
                {selectedApp.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => handleApprove(selectedApp.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleRequestInfo(selectedApp.id)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Request Info
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleReject(selectedApp.id)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Document Viewer Dialog */}
        <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedDocument?.name}</DialogTitle>
            </DialogHeader>
            <div className="bg-muted rounded-lg p-8 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Document viewer would display the file here
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedDocument?.url}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ApplicationCard({
  application,
  onSelect,
  getStatusBadge,
  formatDate,
}: {
  application: Application;
  onSelect: (app: Application) => void;
  getStatusBadge: (status: Application['status']) => JSX.Element;
  formatDate: (date: string) => string;
}) {
  const Icon = application.type === 'shortlet' ? Home : Building2;
  
  return (
    <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => onSelect(application)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex gap-4 flex-1">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{application.applicantName}</h3>
                {getStatusBadge(application.status)}
              </div>
              {application.propertyTitle && (
                <p className="text-sm text-muted-foreground mb-1">{application.propertyTitle}</p>
              )}
              {application.companyName && (
                <p className="text-sm text-muted-foreground mb-1">{application.companyName}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{application.email}</span>
                <span>•</span>
                <span>{formatDate(application.submittedAt)}</span>
                <span>•</span>
                <span>{application.documents.length} documents</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm">
            Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
