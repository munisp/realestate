// @ts-nocheck
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Calendar,
  Building2,
  User,
  MapPin,
  ArrowLeft
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { ConsensusResultCard } from "@/components/ConsensusResultCard";

export default function CofOVerification() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [formData, setFormData] = useState({
    cofONumber: "",
    holderName: "",
    issueDate: "",
    issuingAuthority: "",
    state: "" as "LAGOS" | "FCT" | "" ,
    registrySource: "",
    fileNumber: "",
  });

  const [useGovernmentAPI, setUseGovernmentAPI] = useState(true);
  const [multiStateVerification, setMultiStateVerification] = useState(false);

  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Government API verification mutation
  const governmentVerifyMutation = trpc.governmentRegistry.verifyCofO.useMutation({
    onSuccess: (result) => {
      setVerificationResult(result);
      setIsVerifying(false);
      if (result.result.isValid) {
        toast.success("C of O verification successful via government registry!");
      } else {
        toast.warning("C of O verification completed with issues");
      }
    },
    onError: (error) => {
      setIsVerifying(false);
      toast.error(`Government verification failed: ${error.message}`);
    },
  });

  // Legacy verification mutation
  const verifyCofOMutation = trpc.landRecords.verifyCofO.useMutation({
    onSuccess: (result) => {
      setVerificationResult({ result });
      setIsVerifying(false);
      if (result.isValid) {
        toast.success("C of O verification successful!");
      } else {
        toast.warning("C of O verification completed with issues");
      }
    },
    onError: (error) => {
      setIsVerifying(false);
      toast.error(`Verification failed: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cofONumber) {
      toast.error("Please enter a C of O number");
      return;
    }

    if (useGovernmentAPI && !multiStateVerification && !formData.state) {
      toast.error("Please select a state for single-state verification");
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    // Use government API if enabled
    if (useGovernmentAPI) {
      governmentVerifyMutation.mutate({
        cofoNumber: formData.cofONumber,
        state: formData.state as "LAGOS" | "FCT" | undefined,
        multiState: multiStateVerification,
        useCache: true,
      });
    } else {
      // Fallback to legacy verification
      if (!formData.holderName || !formData.issueDate || 
          !formData.issuingAuthority || !formData.state || !formData.registrySource) {
        toast.error("Please fill in all required fields for manual verification");
        setIsVerifying(false);
        return;
      }

      verifyCofOMutation.mutate({
        cofONumber: formData.cofONumber,
        holderName: formData.holderName,
        issueDate: new Date(formData.issueDate),
        issuingAuthority: formData.issuingAuthority,
        state: formData.state,
        registrySource: formData.registrySource,
        fileNumber: formData.fileNumber || undefined,
      });
    }
  };

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container py-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/land-registry")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Land Registry
          </Button>
          <div>
            <h1 className="text-3xl font-bold">C of O Verification</h1>
            <p className="text-muted-foreground mt-1">
              Verify the authenticity of Certificate of Occupancy documents
            </p>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-4xl">
        <div className="grid gap-8">
          {/* Verification Form */}
          <Card>
            <CardHeader>
              <CardTitle>Enter C of O Details</CardTitle>
              <CardDescription>
                Provide the information from your Certificate of Occupancy for verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Government API Toggle */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Government Registry API</p>
                      <p className="text-sm text-blue-700">Verify directly with state land registries</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useGovernmentAPI}
                      onChange={(e) => setUseGovernmentAPI(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Enable</span>
                  </label>
                </div>

                {/* Multi-State Verification Toggle */}
                {useGovernmentAPI && (
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <p className="font-medium text-green-900">Multi-State Verification</p>
                      <p className="text-sm text-green-700">Verify across all available state registries for consensus</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={multiStateVerification}
                        onChange={(e) => setMultiStateVerification(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">Enable</span>
                    </label>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cofONumber">
                      C of O Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cofONumber"
                      placeholder="e.g., LA/1234/2020"
                      value={formData.cofONumber}
                      onChange={(e) =>
                        setFormData({ ...formData, cofONumber: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fileNumber">File Number</Label>
                    <Input
                      id="fileNumber"
                      placeholder="Optional"
                      value={formData.fileNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, fileNumber: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="holderName">
                      Holder Name {!useGovernmentAPI && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="holderName"
                      placeholder="Full name as on C of O"
                      value={formData.holderName}
                      onChange={(e) =>
                        setFormData({ ...formData, holderName: e.target.value })
                      }
                      required={!useGovernmentAPI}
                      disabled={useGovernmentAPI}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issueDate">
                      Issue Date {!useGovernmentAPI && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) =>
                        setFormData({ ...formData, issueDate: e.target.value })
                      }
                      required={!useGovernmentAPI}
                      disabled={useGovernmentAPI}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">
                      State {(!useGovernmentAPI || !multiStateVerification) && <span className="text-red-500">*</span>}
                    </Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) =>
                        setFormData({ ...formData, state: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lagos">Lagos</SelectItem>
                        <SelectItem value="Federal Capital Territory">FCT Abuja</SelectItem>
                        <SelectItem value="Rivers">Rivers</SelectItem>
                        <SelectItem value="Kano">Kano</SelectItem>
                        <SelectItem value="Oyo">Oyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registrySource">
                      Registry Source <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.registrySource}
                      onValueChange={(value) =>
                        setFormData({ ...formData, registrySource: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select registry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lagos_state">Lagos State Land Registry</SelectItem>
                        <SelectItem value="fct_abuja">FCT Abuja Land Registry</SelectItem>
                        <SelectItem value="rivers_state">Rivers State Land Registry</SelectItem>
                        <SelectItem value="kano_state">Kano State Land Registry</SelectItem>
                        <SelectItem value="oyo_state">Oyo State Land Registry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issuingAuthority">
                    Issuing Authority <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="issuingAuthority"
                    placeholder="e.g., Lagos State Government"
                    value={formData.issuingAuthority}
                    onChange={(e) =>
                      setFormData({ ...formData, issuingAuthority: e.target.value })
                    }
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isVerifying}>
                  {isVerifying ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Verify C of O
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Verification Results */}
          {verificationResult && verificationResult.result && (
            <ConsensusResultCard
              result={verificationResult.result}
              aggregated={verificationResult.aggregated}
              cached={verificationResult.cached}
            />
          )}

          {/* Legacy Verification Results */}
          {verificationResult && !verificationResult.result && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Verification Results</CardTitle>
                  {verificationResult.isValid ? (
                    <Badge className="bg-green-500 text-lg py-1 px-3">
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Valid
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500 text-lg py-1 px-3">
                      <XCircle className="w-5 h-5 mr-2" />
                      Invalid
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Verification Score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Verification Score</Label>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${getScoreColor(verificationResult.score)}`}>
                        {verificationResult.score}/100
                      </span>
                      {getScoreBadge(verificationResult.score)}
                    </div>
                  </div>
                  <Progress value={verificationResult.score} className="h-2" />
                </div>

                <Separator />

                {/* Registry Match */}
                {verificationResult.registryMatch && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center">
                      <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
                      Registry Match Found
                    </h3>
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 mt-1 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">Holder Name</p>
                          <p className="text-sm text-muted-foreground">
                            {verificationResult.registryMatch.holderName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-1 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">Location</p>
                          <p className="text-sm text-muted-foreground">
                            {verificationResult.registryMatch.location}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Building2 className="w-4 h-4 mt-1 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">Land Size</p>
                          <p className="text-sm text-muted-foreground">
                            {verificationResult.registryMatch.landSize} sqm
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 mt-1 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">Issue Date</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(verificationResult.registryMatch.issueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Issues Found */}
                {verificationResult.issues && verificationResult.issues.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center text-red-600">
                      <XCircle className="w-5 h-5 mr-2" />
                      Issues Found ({verificationResult.issues.length})
                    </h3>
                    <div className="space-y-2">
                      {verificationResult.issues.map((issue: string, index: number) => (
                        <div
                          key={index}
                          className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2"
                        >
                          <AlertTriangle className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
                          <p className="text-sm">{issue}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {verificationResult.recommendations && verificationResult.recommendations.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Recommendations
                    </h3>
                    <div className="space-y-2">
                      {verificationResult.recommendations.map((rec: string, index: number) => (
                        <div
                          key={index}
                          className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2"
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {index + 1}
                          </div>
                          <p className="text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setVerificationResult(null);
                      setFormData({
                        cofONumber: "",
                        holderName: "",
                        issueDate: "",
                        issuingAuthority: "",
                        state: "",
                        registrySource: "",
                        fileNumber: "",
                      });
                    }}
                  >
                    Verify Another
                  </Button>
                  {verificationResult.isValid && (
                    <Button onClick={() => toast.info("Save functionality coming soon")}>
                      Save Verification
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>About C of O Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Our C of O verification system checks your Certificate of Occupancy against
                government land registries and detects potential fraud indicators.
              </p>
              <p>
                <strong>What we verify:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>C of O number format validation</li>
                <li>Government registry database matching</li>
                <li>Holder name verification</li>
                <li>Issue date authenticity</li>
                <li>Fraud pattern detection</li>
              </ul>
              <p className="text-xs text-yellow-600 dark:text-yellow-500">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                This verification is for informational purposes only. Always conduct thorough
                due diligence and consult with legal professionals before property transactions.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
