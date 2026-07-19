import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  FileText, 
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Edit,
  Trash,
  UserPlus,
  Shield
} from 'lucide-react';
import { AdvancedFilters, FilterValues } from '@/components/AdvancedFilters';
import { Label } from '@/components/ui/label';

interface AuditLogEntry {
  id: number;
  adminId: number;
  adminName: string;
  action: string;
  actionType: 'approve' | 'reject' | 'edit' | 'delete' | 'create' | 'suspend';
  targetType: 'property' | 'user' | 'report' | 'transaction' | 'escrow';
  targetId: number;
  details: string;
  timestamp: Date;
  ipAddress: string;
  metadata?: Record<string, any>;
}

const actionIcons: Record<AuditLogEntry['actionType'], any> = {
  approve: CheckCircle,
  reject: XCircle,
  edit: Edit,
  delete: Trash,
  create: UserPlus,
  suspend: Shield,
};

const actionColors: Record<AuditLogEntry['actionType'], string> = {
  approve: 'text-green-600',
  reject: 'text-red-600',
  edit: 'text-blue-600',
  delete: 'text-red-600',
  create: 'text-green-600',
  suspend: 'text-orange-600',
};

export default function AuditLog() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<FilterValues>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Mock data - replace with actual tRPC query
  const logs: AuditLogEntry[] = [
    {
      id: 1,
      adminId: 2,
      adminName: 'Jane Smith',
      action: 'Approved property listing',
      actionType: 'approve',
      targetType: 'property',
      targetId: 12345,
      details: 'Approved property "Modern Downtown Condo" after review',
      timestamp: new Date(Date.now() - 5 * 60000),
      ipAddress: '192.168.1.100',
      metadata: { propertyTitle: 'Modern Downtown Condo', price: 450000 },
    },
    {
      id: 2,
      adminId: 2,
      adminName: 'Jane Smith',
      action: 'Rejected user report',
      actionType: 'reject',
      targetType: 'report',
      targetId: 789,
      details: 'Rejected spam report - no violation found',
      timestamp: new Date(Date.now() - 15 * 60000),
      ipAddress: '192.168.1.100',
    },
    {
      id: 3,
      adminId: 2,
      adminName: 'Jane Smith',
      action: 'Suspended user account',
      actionType: 'suspend',
      targetType: 'user',
      targetId: 456,
      details: 'Suspended user for violating terms of service',
      timestamp: new Date(Date.now() - 30 * 60000),
      ipAddress: '192.168.1.100',
      metadata: { reason: 'TOS violation', duration: '30 days' },
    },
    {
      id: 4,
      adminId: 2,
      adminName: 'Jane Smith',
      action: 'Edited property details',
      actionType: 'edit',
      targetType: 'property',
      targetId: 12340,
      details: 'Updated property price and description',
      timestamp: new Date(Date.now() - 60 * 60000),
      ipAddress: '192.168.1.100',
      metadata: { oldPrice: 400000, newPrice: 425000 },
    },
    {
      id: 5,
      adminId: 2,
      adminName: 'Jane Smith',
      action: 'Released escrow funds',
      actionType: 'approve',
      targetType: 'escrow',
      targetId: 999,
      details: 'Released $450,000 to seller after successful transaction',
      timestamp: new Date(Date.now() - 120 * 60000),
      ipAddress: '192.168.1.100',
      metadata: { amount: 450000, transactionId: 999 },
    },
  ];

  const stats = {
    total: logs.length,
    today: logs.filter(l => {
      const today = new Date();
      return l.timestamp.toDateString() === today.toDateString();
    }).length,
    thisWeek: logs.filter(l => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return l.timestamp >= weekAgo;
    }).length,
  };

  const handleExport = () => {
    toast.success('Exporting audit logs to CSV...');
  };

  const viewLogDetails = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return timestamp.toLocaleString();
  };

  // Filter logs based on search and filters
  const filteredLogs = logs.filter(log => {
    if (filters.search && !log.action.toLowerCase().includes(filters.search.toLowerCase()) && 
        !log.adminName.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.dateFrom && log.timestamp < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo) {
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      if (log.timestamp > endOfDay) {
        return false;
      }
    }
    return true;
  });

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Audit Log
          </h1>
          <p className="text-muted-foreground mt-2">
            Track all administrative actions for compliance and accountability
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.thisWeek}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <AdvancedFilters
              onFilterChange={setFilters}
              showStatus={false}
              searchPlaceholder="Search by action or admin name..."
            />
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Audit Entries ({filteredLogs.length})</CardTitle>
              <CardDescription>Comprehensive log of all administrative actions</CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const Icon = actionIcons[log.actionType];
                  const colorClass = actionColors[log.actionType];

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{log.adminName}</div>
                        <div className="text-xs text-muted-foreground">{log.ipAddress}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${colorClass}`} />
                          <Badge variant="outline" className="capitalize">
                            {log.actionType}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm capitalize">{log.targetType}</div>
                          <div className="text-xs text-muted-foreground">ID: {log.targetId}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm truncate">{log.details}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewLogDetails(log)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Log Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Audit Log Details</DialogTitle>
              <DialogDescription>
                Comprehensive information about this administrative action
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Timestamp</Label>
                    <p className="text-sm mt-1">{selectedLog.timestamp.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Admin</Label>
                    <p className="text-sm mt-1">{selectedLog.adminName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Action Type</Label>
                    <p className="text-sm mt-1">
                      <Badge variant="outline" className="capitalize">
                        {selectedLog.actionType}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Target</Label>
                    <p className="text-sm mt-1 capitalize">
                      {selectedLog.targetType} #{selectedLog.targetId}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">IP Address</Label>
                    <p className="text-sm mt-1">{selectedLog.ipAddress}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Log ID</Label>
                    <p className="text-sm mt-1">#{selectedLog.id}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Action</Label>
                  <p className="text-sm mt-1">{selectedLog.action}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Details</Label>
                  <p className="text-sm mt-1">{selectedLog.details}</p>
                </div>
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Additional Metadata</Label>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <pre className="text-xs">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
