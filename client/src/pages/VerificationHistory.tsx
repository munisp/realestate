// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Calendar, Download, FileCheck, Search, TrendingUp, Database, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from "date-fns";

export default function VerificationHistory() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "state" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Date range filter states
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [datePreset, setDatePreset] = useState<string>("all");
  
  // Date preset handler
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    
    switch (preset) {
      case "7d":
        setDateFrom(startOfDay(subDays(now, 7)));
        setDateTo(endOfDay(now));
        break;
      case "30d":
        setDateFrom(startOfDay(subDays(now, 30)));
        setDateTo(endOfDay(now));
        break;
      case "3m":
        setDateFrom(startOfDay(subMonths(now, 3)));
        setDateTo(endOfDay(now));
        break;
      case "1y":
        setDateFrom(startOfDay(subYears(now, 1)));
        setDateTo(endOfDay(now));
        break;
      case "all":
      default:
        setDateFrom(undefined);
        setDateTo(undefined);
        break;
    }
    setPage(1); // Reset to first page when filter changes
  };

  // Fetch verification history
  const { data: historyData, isLoading } = trpc.governmentRegistry.getUserVerificationHistory.useQuery(
    {
      page,
      pageSize,
      search: searchQuery || undefined,
      state: stateFilter !== "all" ? stateFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      sortBy,
      sortOrder,
      dateFrom: dateFrom?.toISOString(),
      dateTo: dateTo?.toISOString(),
    },
    { enabled: !!user }
  );

  // Fetch statistics
  const { data: stats } = trpc.governmentRegistry.getVerificationStats.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Redirect if not authenticated
  if (!authLoading && !user) {
    setLocation("/");
    return null;
  }

  const handleExportCSV = () => {
    if (!(historyData as any)?.items) return;

    const headers = ["Date", "C of O Number", "State", "Status", "Cached", "Multi-State"];
    const rows = (historyData as any).items.map((item) => [
      format(new Date(item.createdAt), "yyyy-MM-dd HH:mm:ss"),
      item.cofoNumber,
      item.state || "Multi-State",
      item.result?.verified ? "Verified" : "Invalid",
      item.cached ? "Yes" : "No",
      item.multiState ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verification-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (verified: boolean | undefined) => {
    if (verified === undefined) {
      return <Badge variant="outline">Pending</Badge>;
    }
    return verified ? (
      <Badge className="bg-green-500 hover:bg-green-600">Verified</Badge>
    ) : (
      <Badge variant="destructive">Invalid</Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verification History</h1>
          <p className="text-gray-600">
            View your Certificate of Occupancy verification history and export records
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Verifications</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats as any)?.totalVerifications || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats as any)?.successRate ? `${(stats as any).successRate.toFixed(1)}%` : "0%"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Verified C of O</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats as any)?.cachedRate ? `${(stats as any).cachedRate.toFixed(1)}%` : "0%"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Instant results</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search and filter your verification history</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Date Range Presets */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Date Range</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={datePreset === "all" ? "default" : "outline"}
                  onClick={() => handleDatePreset("all")}
                >
                  All Time
                </Button>
                <Button
                  size="sm"
                  variant={datePreset === "7d" ? "default" : "outline"}
                  onClick={() => handleDatePreset("7d")}
                >
                  Last 7 Days
                </Button>
                <Button
                  size="sm"
                  variant={datePreset === "30d" ? "default" : "outline"}
                  onClick={() => handleDatePreset("30d")}
                >
                  Last 30 Days
                </Button>
                <Button
                  size="sm"
                  variant={datePreset === "3m" ? "default" : "outline"}
                  onClick={() => handleDatePreset("3m")}
                >
                  Last 3 Months
                </Button>
                <Button
                  size="sm"
                  variant={datePreset === "1y" ? "default" : "outline"}
                  onClick={() => handleDatePreset("1y")}
                >
                  Last Year
                </Button>
              </div>
              {dateFrom && dateTo && (
                <p className="text-xs text-gray-500 mt-2">
                  Showing: {format(dateFrom, "MMM d, yyyy")} - {format(dateTo, "MMM d, yyyy")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search C of O number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* State Filter */}
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  <SelectItem value="Lagos">Lagos</SelectItem>
                  <SelectItem value="FCT">FCT Abuja</SelectItem>
                  <SelectItem value="Rivers">Rivers</SelectItem>
                  <SelectItem value="Kano">Kano</SelectItem>
                  <SelectItem value="Oyo">Oyo</SelectItem>
                  <SelectItem value="multi">Multi-State</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="invalid">Invalid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(value) => {
                  const [by, order] = value.split("-") as [typeof sortBy, typeof sortOrder];
                  setSortBy(by);
                  setSortOrder(order);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                  <SelectItem value="state-asc">State (A-Z)</SelectItem>
                  <SelectItem value="state-desc">State (Z-A)</SelectItem>
                  <SelectItem value="status-asc">Status (A-Z)</SelectItem>
                  <SelectItem value="status-desc">Status (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600">per page</span>
              </div>

              <Button onClick={handleExportCSV} variant="outline" disabled={!(historyData as any)?.items?.length}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Records</CardTitle>
            <CardDescription>
              {(historyData as any)?.total || 0} total records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading verification history...</p>
              </div>
            ) : !(historyData as any)?.items?.length ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Verification History</h3>
                <p className="text-gray-600 mb-4">
                  You haven't verified any Certificate of Occupancy yet.
                </p>
                <Button onClick={() => setLocation("/land-registry/verify-cofo")}>
                  Verify C of O
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>C of O Number</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cached</TableHead>
                        <TableHead>Multi-State</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(historyData as any).items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {format(new Date(item.createdAt), "MMM dd, yyyy HH:mm")}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{item.cofoNumber}</TableCell>
                          <TableCell>
                            {item.multiState ? (
                              <Badge variant="outline">Multi-State</Badge>
                            ) : (
                              <span>{item.state || "N/A"}</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(item.result?.verified)}</TableCell>
                          <TableCell>
                            {item.cached ? (
                              <Badge variant="secondary">Cached</Badge>
                            ) : (
                              <Badge variant="outline">Live</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.multiState ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {(historyData as any).totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6">
                    <p className="text-sm text-gray-600">
                      Showing {(page - 1) * pageSize + 1} to{" "}
                      {Math.min(page * pageSize, (historyData as any).total)} of {(historyData as any).total} records
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min((historyData as any).totalPages, p + 1))}
                        disabled={page === (historyData as any).totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
