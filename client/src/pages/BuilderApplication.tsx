// @ts-nocheck
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import { toast } from "sonner";
import { Loader2, Building2, CheckCircle } from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";

export default function BuilderApplication() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [builderId, setBuilderId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    companyName: "",
    cacNumber: "",
    companyType: "llc" as "individual" | "llc" | "corporation" | "partnership",
    phone: "",
    email: user?.email || "",
    website: "",
    address: "",
    city: "",
    state: "",
    bio: "",
  });

  const [documents, setDocuments] = useState<{
    cacCertificate?: string;
    buildingLicense?: string;
    portfolio?: string;
  }>({});

  const createBuilderMutation = trpc.builders.create.useMutation();
  const uploadDocumentMutation = trpc.documents.uploadBuilderDocument.useMutation();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createBuilderMutation.mutateAsync(formData);
      setBuilderId(result.id);
      setStep(2);
      toast.success("Builder profile created! Now upload your documents.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create builder profile");
    }
  };

  const handleDocumentUpload = async (file: File, documentType: "cac_certificate" | "building_license" | "portfolio") => {
    if (!builderId) {
      throw new Error("Builder profile not created yet");
    }

    // Convert file to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const result = await uploadDocumentMutation.mutateAsync({
      builderId,
      documentType,
      fileName: file.name,
      fileData: base64,
      mimeType: file.type,
    });

    setDocuments(prev => ({ ...prev, [documentType]: result.url }));
    return { url: result.url };
  };

  const handleFinalSubmit = () => {
    toast.success("Application submitted successfully! We'll review your documents and notify you via email.");
    setLocation("/builder/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Builder Application
          </h1>
          <p className="text-muted-foreground mt-2">
            Join our verified builder network and start listing your projects
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
            {step > 1 ? <CheckCircle className="h-5 w-5" /> : <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs">1</div>}
            <span className="text-sm font-medium">Company Info</span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
            {step > 2 ? <CheckCircle className="h-5 w-5" /> : <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs">2</div>}
            <span className="text-sm font-medium">Documents</span>
          </div>
        </div>

        {/* Step 1: Company Information */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Tell us about your construction company</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep1Submit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={e => handleInputChange("companyName", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="cacNumber">CAC Registration Number</Label>
                    <Input
                      id="cacNumber"
                      value={formData.cacNumber}
                      onChange={e => handleInputChange("cacNumber", e.target.value)}
                      placeholder="RC1234567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="companyType">Company Type *</Label>
                    <Select
                      value={formData.companyType}
                      onValueChange={value => handleInputChange("companyType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual/Sole Proprietor</SelectItem>
                        <SelectItem value="llc">Limited Liability Company</SelectItem>
                        <SelectItem value="corporation">Corporation</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={e => handleInputChange("phone", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={e => handleInputChange("email", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={e => handleInputChange("website", e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="address">Business Address *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={e => handleInputChange("address", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={e => handleInputChange("city", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={e => handleInputChange("state", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="bio">Company Bio *</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={e => handleInputChange("bio", e.target.value)}
                      rows={4}
                      placeholder="Tell us about your company's experience, specialization, and notable projects..."
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={createBuilderMutation.isPending}>
                  {createBuilderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue to Documents
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Document Upload */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Verification Documents</CardTitle>
              <CardDescription>Upload required documents for verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FileUpload
                label="CAC Certificate *"
                description="Upload your Corporate Affairs Commission certificate (PDF, max 10MB)"
                accept=".pdf"
                maxSize={10}
                maxFiles={1}
                onUpload={file => handleDocumentUpload(file, "cac_certificate")}
              />

              <FileUpload
                label="Building License *"
                description="Upload your building/construction license (PDF, max 10MB)"
                accept=".pdf"
                maxSize={10}
                maxFiles={1}
                onUpload={file => handleDocumentUpload(file, "building_license")}
              />

              <FileUpload
                label="Portfolio (Optional)"
                description="Upload portfolio of completed projects (PDF, images, max 10MB)"
                accept=".pdf,image/*"
                maxSize={10}
                maxFiles={1}
                onUpload={file => handleDocumentUpload(file, "portfolio")}
              />

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleFinalSubmit}
                  className="flex-1"
                  disabled={!documents.cacCertificate || !documents.buildingLicense}
                >
                  Submit Application
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
