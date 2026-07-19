// @ts-nocheck
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Activity,
  BarChart3,
  Clock,
  Target
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function DataQualityDashboard() {
  const [days, setDays] = useState(30);
  const [confidenceThreshold, setConfidenceThreshold] = useState(50);

  const { data: report, isPending: isReportLoading } = trpc.dataQuality.getReport.useQuery();
  const { data: trends, isPending: isTrendsLoading } = trpc.dataQuality.getTrends.useQuery({ days });
  const { data: lowConfidence, isPending: isLowConfidenceLoading } = trpc.dataQuality.getLowConfidenceValuations.useQuery({
    threshold: confidenceThreshold,
    limit: 20,
  });

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return <Badge variant="default" className="bg-green-600">High</Badge>;
    if (confidence >= 60) return <Badge variant="default" className="bg-yellow-600">Medium</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Data Quality Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor valuation accuracy and data quality metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overall Metrics */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Average Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getConfidenceColor(report.overall.averageConfidence)}`}>
                {report.overall.averageConfidence.toFixed(1)}%
              </div>
              <Progress value={report.overall.averageConfidence} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Total Valuations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{report.overall.totalValuations.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground mt-2">
                {report.overall.highConfidenceCount} high confidence
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{report.accuracy.averageDeviation.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground mt-2">
                Average deviation from sale price
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Data Freshness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{report.freshness.last24Hours}</div>
              <p className="text-sm text-muted-foreground mt-2">
                Valuations in last 24 hours
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confidence Trends */}
      {trends && trends.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Confidence Trends</CardTitle>
            <CardDescription>Average confidence scores over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Confidence']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="averageConfidence" 
                  stroke="#8884d8" 
                  name="Average Confidence"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="highConfidencePercentage" 
                  stroke="#82ca9d" 
                  name="High Confidence %"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By Property Type */}
        {report && Object.keys(report.byPropertyType).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Confidence by Property Type</CardTitle>
              <CardDescription>Average confidence scores across property types</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(report.byPropertyType).map(([type, data]) => ({
                  type: type.replace(/_/g, ' '),
                  confidence: data.averageConfidence,
                  count: data.count,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Bar dataKey="confidence" fill="#8884d8" name="Confidence" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* By Neighborhood */}
        {report && Object.keys(report.byNeighborhood).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Neighborhoods by Quality</CardTitle>
              <CardDescription>Cities with highest data quality</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(report.byNeighborhood)
                  .sort(([, a], [, b]) => b.averageConfidence - a.averageConfidence)
                  .slice(0, 10)
                  .map(([city, data]) => (
                    <div key={city} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{city}</div>
                        <div className="text-sm text-muted-foreground">{data.count} valuations</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={data.averageConfidence} className="w-24" />
                        <span className={`text-sm font-medium ${getConfidenceColor(data.averageConfidence)}`}>
                          {data.averageConfidence.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Low Confidence Valuations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Low Confidence Valuations</CardTitle>
              <CardDescription>Valuations that may need review</CardDescription>
            </div>
            <Select 
              value={confidenceThreshold.toString()} 
              onValueChange={(v) => setConfidenceThreshold(parseInt(v))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Below 30%</SelectItem>
                <SelectItem value="50">Below 50%</SelectItem>
                <SelectItem value="70">Below 70%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLowConfidenceLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : lowConfidence && lowConfidence.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowConfidence.map((item) => (
                  <TableRow key={item.valuation.id}>
                    <TableCell>
                      <div className="font-medium">{item.valuation.address}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.valuation.city}, {item.valuation.state}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {item.valuation.propertyType?.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>${item.valuation.finalValue?.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getConfidenceBadge(item.confidence.overallConfidence)}
                        <span className={`text-sm ${getConfidenceColor(item.confidence.overallConfidence)}`}>
                          {item.confidence.overallConfidence}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {item.confidence.dataCompletenessScore < 50 && (
                          <Badge variant="outline" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Low data
                          </Badge>
                        )}
                        {item.confidence.comparableQualityScore < 50 && (
                          <Badge variant="outline" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Few comparables
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(item.valuation.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Low Confidence Valuations</h3>
              <p className="text-muted-foreground">
                All valuations meet the confidence threshold
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
