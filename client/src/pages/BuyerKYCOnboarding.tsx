import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, User, Globe, Shield, CheckCircle2, XCircle, AlertCircle, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Buyer KYC Onboarding Page
 * 
 * Multi-tier verification system:
 * - FULL: NIN + BVN + Face Match (₦5M limit)
 * - INTERNATIONAL: Passport + Proof of Address ($10K limit)
 * - BASIC: NIN only (₦100K limit)
 * - SOCIAL: Phone + Social Login (₦50K limit)
 */

type VerificationTier = "FULL" | "INTERNATIONAL" | "BASIC" | "SOCIAL";

export default function BuyerKYCOnboarding() {
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedTier, setSelectedTier] = useState<VerificationTier | null>(null);
  
  // Nigerian local buyer data
  const [localData, setLocalData] = useState({
    nin: "",
    bvn: "",
    first_name: "",
    last_name: "",
    date_of_birth: "",
    phone_number: "",
    selfie_photo: ""
  });
  
  // Diaspora buyer data
  const [diasporaData, setDiasporaData] = useState({
    country: "US",
    document_type: "passport",
    document_number: "",
    first_name: "",
    last_name: "",
    date_of_birth: "",
    expiry_date: "",
    document_image: "",
    selfie_video: "",
    proof_of_address_type: "utility_bill",
    proof_of_address_image: "",
    proof_of_address_date: "",
    address: ""
  });
  
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  // Mutations
  const verifyLocalBuyerMutation = trpc.buyerKYC.verifyLocal.useMutation({
    onSuccess: (data) => {
      setVerificationResult(data);
      toast.success("Verification complete");
      setStep(3);
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
    }
  });
  
  const verifyDiasporaBuyerMutation = trpc.buyerKYC.verifyDiaspora.useMutation({
    onSuccess: (data) => {
      setVerificationResult(data);
      toast.success("Verification complete");
      setStep(3);
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
    }
  });
  
  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const verificationType = selectedTier === "FULL" ? "FULL" : selectedTier === "BASIC" ? "BASIC" : "SOCIAL";
    
    verifyLocalBuyerMutation.mutate({
      verification_type: verificationType,
      ...localData,
      user_id: user?.id.toString() || ""
    });
  };
  
  const handleDiasporaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyDiasporaBuyerMutation.mutate({
      ...diasporaData,
      user_id: user?.id.toString() || ""
    });
  };
  
  const tierInfo = {
    FULL: {
      title: "Full Verification",
      limit: "₦5,000,000",
      icon: Shield,
      color: "text-green-600",
      requirements: ["NIN", "BVN", "Face Match"],
      description: "Highest transaction limit for serious buyers"
    },
    INTERNATIONAL: {
      title: "International Buyer",
      limit: "$10,000",
      icon: Globe,
      color: "text-blue-600",
      requirements: ["Passport", "Proof of Address", "Liveness Check"],
      description: "For diaspora and international buyers"
    },
    BASIC: {
      title: "Basic Verification",
      limit: "₦100,000",
      icon: User,
      color: "text-yellow-600",
      requirements: ["NIN only"],
      description: "Quick verification for browsing"
    },
    SOCIAL: {
      title: "Social Verification",
      limit: "₦50,000",
      icon: User,
      color: "text-gray-600",
      requirements: ["Phone + Social Login"],
      description: "Minimal verification for exploration"
    }
  };
  
  const getRiskBadge = (riskLevel: string) => {
    const variants: Record<string, any> = {
      LOW: { variant: "default", icon: CheckCircle2, color: "text-green-600" },
      MEDIUM: { variant: "secondary", icon: AlertCircle, color: "text-yellow-600" },
      HIGH: { variant: "destructive", icon: XCircle, color: "text-red-600" }
    };
    
    const config = variants[riskLevel] || variants.MEDIUM;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {riskLevel} RISK
      </Badge>
    );
  };
  
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>
            Please log in to complete buyer verification.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Buyer Verification (KYC)</h1>
        <p className="text-muted-foreground">
          Complete your verification to unlock property transactions
        </p>
      </div>
      
      {/* Step 1: Select Tier */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Verification Tier</CardTitle>
            <CardDescription>
              Choose your verification level based on transaction needs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Verification */}
              <Card
                className={`cursor-pointer transition-all ${
                  selectedTier === "FULL" ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedTier("FULL")}
              >
                <CardHeader>
                  <Shield className="h-12 w-12 mb-2 text-green-600" />
                  <CardTitle>Full Verification</CardTitle>
                  <CardDescription>₦5,000,000 limit</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• NIN verification</li>
                    <li>• BVN verification</li>
                    <li>• Biometric face match</li>
                    <li>• Highest transaction limit</li>
                  </ul>
                </CardContent>
              </Card>
              
              {/* International */}
              <Card
                className={`cursor-pointer transition-all ${
                  selectedTier === "INTERNATIONAL" ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedTier("INTERNATIONAL")}
              >
                <CardHeader>
                  <Globe className="h-12 w-12 mb-2 text-blue-600" />
                  <CardTitle>International Buyer</CardTitle>
                  <CardDescription>$10,000 limit</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Passport verification</li>
                    <li>• Proof of address</li>
                    <li>• Liveness check</li>
                    <li>• For diaspora buyers</li>
                  </ul>
                </CardContent>
              </Card>
              
              {/* Basic */}
              <Card
                className={`cursor-pointer transition-all ${
                  selectedTier === "BASIC" ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedTier("BASIC")}
              >
                <CardHeader>
                  <User className="h-12 w-12 mb-2 text-yellow-600" />
                  <CardTitle>Basic Verification</CardTitle>
                  <CardDescription>₦100,000 limit</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• NIN verification only</li>
                    <li>• Quick process</li>
                    <li>• Good for browsing</li>
                  </ul>
                </CardContent>
              </Card>
              
              {/* Social */}
              <Card
                className={`cursor-pointer transition-all ${
                  selectedTier === "SOCIAL" ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedTier("SOCIAL")}
              >
                <CardHeader>
                  <User className="h-12 w-12 mb-2 text-gray-600" />
                  <CardTitle>Social Verification</CardTitle>
                  <CardDescription>₦50,000 limit</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Phone verification</li>
                    <li>• Social login</li>
                    <li>• Minimal requirements</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            
            <Button 
              onClick={() => setStep(2)} 
              disabled={!selectedTier}
              className="w-full"
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Step 2: Verification Form */}
      {step === 2 && selectedTier && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{tierInfo[selectedTier].title}</CardTitle>
                <CardDescription>
                  Transaction limit: {tierInfo[selectedTier].limit}
                </CardDescription>
              </div>
              <Badge variant="outline">{selectedTier}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {(selectedTier === "FULL" || selectedTier === "BASIC" || selectedTier === "SOCIAL") && (
              <form onSubmit={handleLocalSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={localData.first_name}
                      onChange={(e) => setLocalData({ ...localData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={localData.last_name}
                      onChange={(e) => setLocalData({ ...localData, last_name: e.target.value })}
                      required
                    />
                  </div>
                  
                  {selectedTier !== "SOCIAL" && (
                    <>
                      <div>
                        <Label htmlFor="nin">NIN (National Identification Number)</Label>
                        <Input
                          id="nin"
                          value={localData.nin}
                          onChange={(e) => setLocalData({ ...localData, nin: e.target.value })}
                          placeholder="12345678901"
                          maxLength={11}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          value={localData.date_of_birth}
                          onChange={(e) => setLocalData({ ...localData, date_of_birth: e.target.value })}
                          required
                        />
                      </div>
                    </>
                  )}
                  
                  {selectedTier === "FULL" && (
                    <>
                      <div>
                        <Label htmlFor="bvn">BVN (Bank Verification Number)</Label>
                        <Input
                          id="bvn"
                          value={localData.bvn}
                          onChange={(e) => setLocalData({ ...localData, bvn: e.target.value })}
                          placeholder="12345678901"
                          maxLength={11}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="phone_number">Phone Number</Label>
                        <Input
                          id="phone_number"
                          value={localData.phone_number}
                          onChange={(e) => setLocalData({ ...localData, phone_number: e.target.value })}
                          placeholder="+234XXXXXXXXXX"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="selfie">Selfie Photo (for face matching)</Label>
                        <div className="border-2 border-dashed rounded-md p-4 text-center">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Upload a clear selfie</p>
                          <Input
                            id="selfie"
                            type="file"
                            accept="image/*"
                            className="mt-2"
                            onChange={(e) => {
                              // Handle file upload
                              const file = e.target.files?.[0];
                              if (file) {
                                // Convert to base64 or upload to server
                                setLocalData({ ...localData, selfie_photo: "base64_encoded_photo" });
                              }
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                  
                  {selectedTier === "SOCIAL" && (
                    <div>
                      <Label htmlFor="phone_number">Phone Number</Label>
                      <Input
                        id="phone_number"
                        value={localData.phone_number}
                        onChange={(e) => setLocalData({ ...localData, phone_number: e.target.value })}
                        placeholder="+234XXXXXXXXXX"
                        required
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="submit" disabled={verifyLocalBuyerMutation.isPending} className="flex-1">
                    {verifyLocalBuyerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify Identity
                  </Button>
                </div>
              </form>
            )}
            
            {selectedTier === "INTERNATIONAL" && (
              <form onSubmit={handleDiasporaSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={diasporaData.country}
                      onValueChange={(value) => setDiasporaData({ ...diasporaData, country: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="GB">United Kingdom</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="DE">Germany</SelectItem>
                        <SelectItem value="FR">France</SelectItem>
                        <SelectItem value="ZA">South Africa</SelectItem>
                        <SelectItem value="GH">Ghana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="document_type">Document Type</Label>
                    <Select
                      value={diasporaData.document_type}
                      onValueChange={(value) => setDiasporaData({ ...diasporaData, document_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="drivers_license">Driver's License</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="document_number">Document Number</Label>
                    <Input
                      id="document_number"
                      value={diasporaData.document_number}
                      onChange={(e) => setDiasporaData({ ...diasporaData, document_number: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={diasporaData.first_name}
                        onChange={(e) => setDiasporaData({ ...diasporaData, first_name: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={diasporaData.last_name}
                        onChange={(e) => setDiasporaData({ ...diasporaData, last_name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={diasporaData.date_of_birth}
                        onChange={(e) => setDiasporaData({ ...diasporaData, date_of_birth: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="expiry_date">Expiry Date</Label>
                      <Input
                        id="expiry_date"
                        type="date"
                        value={diasporaData.expiry_date}
                        onChange={(e) => setDiasporaData({ ...diasporaData, expiry_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Upload Document</Label>
                    <div className="border-2 border-dashed rounded-md p-4 text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Upload passport or driver's license</p>
                      <Input
                        type="file"
                        accept="image/*"
                        className="mt-2"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={diasporaData.address}
                      onChange={(e) => setDiasporaData({ ...diasporaData, address: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Proof of Address (within 3 months)</Label>
                    <Select
                      value={diasporaData.proof_of_address_type}
                      onValueChange={(value) => setDiasporaData({ ...diasporaData, proof_of_address_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utility_bill">Utility Bill</SelectItem>
                        <SelectItem value="bank_statement">Bank Statement</SelectItem>
                        <SelectItem value="tax_document">Tax Document</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="border-2 border-dashed rounded-md p-4 text-center mt-2">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <Input type="file" accept="image/*,application/pdf" className="mt-2" />
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="submit" disabled={verifyDiasporaBuyerMutation.isPending} className="flex-1">
                    {verifyDiasporaBuyerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify Identity
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Step 3: Results */}
      {step === 3 && verificationResult && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Verification Complete</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{verificationResult.verification_tier}</Badge>
                  {getRiskBadge(verificationResult.risk_level)}
                </div>
              </div>
              <CardDescription>
                Transaction Limit: {verificationResult.transaction_limit_usd 
                  ? `$${verificationResult.transaction_limit_usd.toLocaleString()}` 
                  : `₦${verificationResult.transaction_limit?.toLocaleString()}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Compliance Score</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={verificationResult.compliance_score} className="flex-1" />
                  <span className="text-sm font-medium">{verificationResult.compliance_score}%</span>
                </div>
              </div>
              
              {verificationResult.recommendations?.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Recommendations:</strong>
                    <ul className="mt-2 space-y-1">
                      {verificationResult.recommendations.map((rec: string, i: number) => (
                        <li key={i}>• {rec}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-2">
                <Button onClick={() => {
                  setStep(1);
                  setVerificationResult(null);
                  setSelectedTier(null);
                }} variant="outline">
                  Start New Verification
                </Button>
                <Button onClick={() => window.location.href = "/"} className="flex-1">
                  Start Browsing Properties
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
