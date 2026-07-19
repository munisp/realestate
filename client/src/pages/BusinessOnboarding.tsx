// @ts-nocheck
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
import { Loader2, Building2, Hotel, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Business Onboarding Page
 * 
 * Comprehensive KYB verification for:
 * - Builders/Developers (COREN, CORBON, building permits)
 * - Shortlet Operators (hospitality license, FIRS tax, fire safety)
 */

export default function BusinessOnboarding() {
  const { user, isAuthenticated } = useAuth();
  const [businessType, setBusinessType] = useState<"builder" | "shortlet">("builder");
  const [step, setStep] = useState(1);
  
  // Builder form state
  const [builderData, setBuilderData] = useState({
    rc_number: "",
    company_name: "",
    business_type: "developer",
    coren_number: "",
    principal_engineer: "",
    corbon_number: "",
    insurance_policy_number: "",
    current_projects: [] as any[]
  });
  
  // Shortlet form state
  const [shortletData, setShortletData] = useState({
    rc_number: "",
    company_name: "",
    operator_type: "shortlet",
    properties: [] as any[]
  });
  
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  // Mutations
  const verifyBuilderMutation = trpc.verification.verifyBuilder.useMutation({
    onSuccess: (data) => {
      setVerificationResult(data);
      toast.success("Builder verification complete");
      setStep(3);
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
    }
  });
  
  const verifyShortletMutation = trpc.verification.verifyShortlet.useMutation({
    onSuccess: (data) => {
      setVerificationResult(data);
      toast.success("Shortlet verification complete");
      setStep(3);
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
    }
  });
  
  const handleBuilderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyBuilderMutation.mutate(builderData);
  };
  
  const handleShortletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyShortletMutation.mutate(shortletData);
  };
  
  const addProject = () => {
    setBuilderData({
      ...builderData,
      current_projects: [
        ...builderData.current_projects,
        {
          name: "",
          permit_number: "",
          state: "Lagos",
          address: ""
        }
      ]
    });
  };
  
  const addProperty = () => {
    setShortletData({
      ...shortletData,
      properties: [
        ...shortletData.properties,
        {
          address: "",
          state: "Lagos",
          change_of_use_permit: "",
          occupancy_permit: "",
          fire_safety_certificate: "",
          env_health_permit: ""
        }
      ]
    });
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
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      VERIFIED: { variant: "default", color: "text-green-600" },
      PARTIAL: { variant: "secondary", color: "text-yellow-600" },
      FAILED: { variant: "destructive", color: "text-red-600" }
    };
    
    const config = variants[status] || variants.PARTIAL;
    
    return (
      <Badge variant={config.variant}>
        {status}
      </Badge>
    );
  };
  
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>
            Please log in to access business verification.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Business Verification (KYB)</h1>
        <p className="text-muted-foreground">
          Complete your business verification to start operating on the platform
        </p>
      </div>
      
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Business Type</CardTitle>
            <CardDescription>
              Choose your business category to start verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer transition-all ${
                  businessType === "builder" ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setBusinessType("builder")}
              >
                <CardHeader>
                  <Building2 className="h-12 w-12 mb-2 text-primary" />
                  <CardTitle>Builder / Developer</CardTitle>
                  <CardDescription>
                    Construction companies, property developers, contractors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• COREN verification</li>
                    <li>• CORBON registration</li>
                    <li>• Building permits</li>
                    <li>• Professional insurance</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card
                className={`cursor-pointer transition-all ${
                  businessType === "shortlet" ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setBusinessType("shortlet")}
              >
                <CardHeader>
                  <Hotel className="h-12 w-12 mb-2 text-primary" />
                  <CardTitle>Shortlet Operator</CardTitle>
                  <CardDescription>
                    Hotels, shortlets, apartments, guesthouses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Hospitality license</li>
                    <li>• FIRS tax registration</li>
                    <li>• Fire safety certificates</li>
                    <li>• Property permits</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            
            <Button onClick={() => setStep(2)} className="w-full">
              Continue
            </Button>
          </CardContent>
        </Card>
      )}
      
      {step === 2 && businessType === "builder" && (
        <Card>
          <CardHeader>
            <CardTitle>Builder / Developer Verification</CardTitle>
            <CardDescription>
              Provide your business and professional registration details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBuilderSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rc_number">CAC Registration Number (RC/BN)</Label>
                  <Input
                    id="rc_number"
                    value={builderData.rc_number}
                    onChange={(e) => setBuilderData({ ...builderData, rc_number: e.target.value })}
                    placeholder="RC123456"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={builderData.company_name}
                    onChange={(e) => setBuilderData({ ...builderData, company_name: e.target.value })}
                    placeholder="ABC Construction Ltd"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select
                    value={builderData.business_type}
                    onValueChange={(value) => setBuilderData({ ...builderData, business_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="developer">Property Developer</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="architect">Architect</SelectItem>
                      <SelectItem value="engineer">Engineer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="coren_number">COREN Number (Optional)</Label>
                  <Input
                    id="coren_number"
                    value={builderData.coren_number}
                    onChange={(e) => setBuilderData({ ...builderData, coren_number: e.target.value })}
                    placeholder="COREN/12345"
                  />
                </div>
                
                <div>
                  <Label htmlFor="principal_engineer">Principal Engineer Name</Label>
                  <Input
                    id="principal_engineer"
                    value={builderData.principal_engineer}
                    onChange={(e) => setBuilderData({ ...builderData, principal_engineer: e.target.value })}
                    placeholder="Eng. John Doe"
                  />
                </div>
                
                <div>
                  <Label htmlFor="corbon_number">CORBON Number (Optional)</Label>
                  <Input
                    id="corbon_number"
                    value={builderData.corbon_number}
                    onChange={(e) => setBuilderData({ ...builderData, corbon_number: e.target.value })}
                    placeholder="CORBON/12345"
                  />
                </div>
                
                <div>
                  <Label htmlFor="insurance_policy_number">Professional Indemnity Insurance Policy Number</Label>
                  <Input
                    id="insurance_policy_number"
                    value={builderData.insurance_policy_number}
                    onChange={(e) => setBuilderData({ ...builderData, insurance_policy_number: e.target.value })}
                    placeholder="POL123456789"
                  />
                </div>
                
                <div>
                  <Label>Current Projects (Optional)</Label>
                  {builderData.current_projects.map((project, index) => (
                    <div key={index} className="border p-4 rounded-md mt-2 space-y-2">
                      <Input
                        placeholder="Project Name"
                        value={project.name}
                        onChange={(e) => {
                          const projects = [...builderData.current_projects];
                          projects[index].name = e.target.value;
                          setBuilderData({ ...builderData, current_projects: projects });
                        }}
                      />
                      <Input
                        placeholder="Building Permit Number"
                        value={project.permit_number}
                        onChange={(e) => {
                          const projects = [...builderData.current_projects];
                          projects[index].permit_number = e.target.value;
                          setBuilderData({ ...builderData, current_projects: projects });
                        }}
                      />
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addProject} className="mt-2">
                    Add Project
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" disabled={verifyBuilderMutation.isPending} className="flex-1">
                  {verifyBuilderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify Business
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      {step === 2 && businessType === "shortlet" && (
        <Card>
          <CardHeader>
            <CardTitle>Shortlet Operator Verification</CardTitle>
            <CardDescription>
              Provide your business and property licensing details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleShortletSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rc_number">CAC Registration Number (RC/BN)</Label>
                  <Input
                    id="rc_number"
                    value={shortletData.rc_number}
                    onChange={(e) => setShortletData({ ...shortletData, rc_number: e.target.value })}
                    placeholder="RC123456"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={shortletData.company_name}
                    onChange={(e) => setShortletData({ ...shortletData, company_name: e.target.value })}
                    placeholder="ABC Hospitality Ltd"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="operator_type">Operator Type</Label>
                  <Select
                    value={shortletData.operator_type}
                    onValueChange={(value) => setShortletData({ ...shortletData, operator_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hotel">Hotel</SelectItem>
                      <SelectItem value="shortlet">Shortlet</SelectItem>
                      <SelectItem value="apartment">Serviced Apartment</SelectItem>
                      <SelectItem value="guesthouse">Guesthouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Properties</Label>
                  {shortletData.properties.map((property, index) => (
                    <div key={index} className="border p-4 rounded-md mt-2 space-y-2">
                      <Input
                        placeholder="Property Address"
                        value={property.address}
                        onChange={(e) => {
                          const properties = [...shortletData.properties];
                          properties[index].address = e.target.value;
                          setShortletData({ ...shortletData, properties });
                        }}
                      />
                      <Input
                        placeholder="Change of Use Permit Number"
                        value={property.change_of_use_permit}
                        onChange={(e) => {
                          const properties = [...shortletData.properties];
                          properties[index].change_of_use_permit = e.target.value;
                          setShortletData({ ...shortletData, properties });
                        }}
                      />
                      <Input
                        placeholder="Occupancy Permit Number"
                        value={property.occupancy_permit}
                        onChange={(e) => {
                          const properties = [...shortletData.properties];
                          properties[index].occupancy_permit = e.target.value;
                          setShortletData({ ...shortletData, properties });
                        }}
                      />
                      <Input
                        placeholder="Fire Safety Certificate Number"
                        value={property.fire_safety_certificate}
                        onChange={(e) => {
                          const properties = [...shortletData.properties];
                          properties[index].fire_safety_certificate = e.target.value;
                          setShortletData({ ...shortletData, properties });
                        }}
                      />
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addProperty} className="mt-2">
                    Add Property
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" disabled={verifyShortletMutation.isPending} className="flex-1">
                  {verifyShortletMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify Business
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      {step === 3 && verificationResult && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Verification Results</CardTitle>
                <div className="flex gap-2">
                  {getStatusBadge(verificationResult.verification_status)}
                  {getRiskBadge(verificationResult.risk_level)}
                </div>
              </div>
              <CardDescription>
                Compliance Score: {verificationResult.compliance_score}/100
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {verificationResult.missing_requirements?.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Missing Requirements:</strong>
                    <ul className="mt-2 space-y-1">
                      {verificationResult.missing_requirements.map((req: string, i: number) => (
                        <li key={i}>• {req}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              {verificationResult.recommendations?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Recommendations:</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {verificationResult.recommendations.map((rec: string, i: number) => (
                      <li key={i}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <Button onClick={() => {
                setStep(1);
                setVerificationResult(null);
              }}>
                Start New Verification
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
