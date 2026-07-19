import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Shield,
  TrendingUp,
  Database
} from "lucide-react";

interface VerificationResult {
  isValid: boolean;
  cofoNumber: string;
  parcelId?: string;
  ownerName?: string;
  issueDate?: Date;
  expiryDate?: Date;
  status: string;
  verificationScore: number;
  verificationDetails: {
    documentAuthenticity: boolean;
    ownershipMatch: boolean;
    noEncumbrances: boolean;
    taxCompliance: boolean;
  };
}

interface AggregatedResult {
  primaryResult: VerificationResult;
  alternativeResults?: VerificationResult[];
  consensus: {
    isValid: boolean;
    confidence: number;
    conflictingFields: string[];
  };
  sources: string[];
}

interface ConsensusResultCardProps {
  result: VerificationResult;
  aggregated?: AggregatedResult;
  cached?: boolean;
}

export function ConsensusResultCard({ result, aggregated, cached }: ConsensusResultCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500">Good</Badge>;
    if (score >= 40) return <Badge className="bg-orange-500">Fair</Badge>;
    return <Badge className="bg-red-500">Poor</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      active: { color: "bg-green-500", label: "Active" },
      expired: { color: "bg-red-500", label: "Expired" },
      revoked: { color: "bg-red-600", label: "Revoked" },
      suspended: { color: "bg-orange-500", label: "Suspended" },
      pending_renewal: { color: "bg-yellow-500", label: "Pending Renewal" },
    };

    const statusInfo = statusMap[status] || { color: "bg-gray-500", label: status };
    return <Badge className={statusInfo.color}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Primary Result */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {result.isValid ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                Verification Result
              </CardTitle>
              <CardDescription>
                {aggregated ? "Primary result from government registry" : "Government registry verification"}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(result.status)}
              {cached && (
                <Badge variant="outline" className="text-xs">
                  <Database className="w-3 h-3 mr-1" />
                  Cached
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Verification Score */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Verification Score</span>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${getScoreColor(result.verificationScore)}`}>
                  {result.verificationScore}%
                </span>
                {getScoreBadge(result.verificationScore)}
              </div>
            </div>
            <Progress value={result.verificationScore} className="h-2" />
          </div>

          {/* C of O Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">C of O Number:</span>
              <p className="font-medium">{result.cofoNumber}</p>
            </div>
            {result.parcelId && (
              <div>
                <span className="text-muted-foreground">Parcel ID:</span>
                <p className="font-medium">{result.parcelId}</p>
              </div>
            )}
            {result.ownerName && (
              <div>
                <span className="text-muted-foreground">Owner Name:</span>
                <p className="font-medium">{result.ownerName}</p>
              </div>
            )}
            {result.issueDate && (
              <div>
                <span className="text-muted-foreground">Issue Date:</span>
                <p className="font-medium">{new Date(result.issueDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Verification Details */}
          <div>
            <h4 className="font-medium mb-3">Verification Checks</h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(result.verificationDetails).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  {value ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consensus Information (Multi-State) */}
      {aggregated && aggregated.consensus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Consensus Analysis
            </CardTitle>
            <CardDescription>
              Results from {aggregated.sources.length} state registr{aggregated.sources.length === 1 ? "y" : "ies"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Confidence Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Consensus Confidence</span>
                <span className="text-xl font-bold">{aggregated.consensus.confidence}%</span>
              </div>
              <Progress value={aggregated.consensus.confidence} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {aggregated.consensus.confidence >= 80
                  ? "High confidence - all sources agree"
                  : aggregated.consensus.confidence >= 60
                  ? "Moderate confidence - some discrepancies"
                  : "Low confidence - significant conflicts"}
              </p>
            </div>

            {/* Sources */}
            <div>
              <span className="text-sm font-medium">Verified Sources</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {aggregated.sources.map((source) => (
                  <Badge key={source} variant="outline">
                    <Shield className="w-3 h-3 mr-1" />
                    {source}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Conflicting Fields */}
            {aggregated.consensus.conflictingFields.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">Conflicting Information Detected</p>
                  <p className="text-sm">
                    The following fields have different values across state registries:
                  </p>
                  <ul className="list-disc list-inside text-sm mt-2">
                    {aggregated.consensus.conflictingFields.map((field) => (
                      <li key={field} className="capitalize">
                        {field.replace(/([A-Z])/g, " $1").trim()}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm mt-2 text-muted-foreground">
                    Manual verification recommended for conflicting fields.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Alternative Results */}
            {aggregated.alternativeResults && aggregated.alternativeResults.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Alternative Results</h4>
                <div className="space-y-2">
                  {aggregated.alternativeResults.map((altResult, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {altResult.isValid ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-sm font-medium">
                            Score: {altResult.verificationScore}%
                          </span>
                        </div>
                        {getStatusBadge(altResult.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
