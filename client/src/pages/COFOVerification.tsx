import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Upload, FileText, CheckCircle2, XCircle, AlertCircle, Loader2, Phone, MapPin, User } from "lucide-react";
import { toast } from "sonner";

export default function COFOVerification() {
  const [certificateNumber, setCertificateNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const verifyCertificate = trpc.cofo.verify.useMutation({
    onSuccess: (data) => {
      toast.success("Verification complete!");
      if (data.smsNotification?.success) {
        toast.info(`SMS notification sent to ${phoneNumber}`);
      }
      // Reset form
      setCertificateNumber("");
      setOwnerName("");
      setPropertyAddress("");
      setPhoneNumber("");
      setDocumentFile(null);
      setUploadProgress(0);
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
    }
  });

  const { data: history, isLoading: historyLoading } = trpc.cofo.getHistory.useQuery({ limit: 20 });
  const { data: stats } = trpc.cofo.getStats.useQuery();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload PDF, JPG, or PNG files only.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit.');
        return;
      }

      setDocumentFile(file);
      toast.success(`File "${file.name}" selected`);
    }
  };

  const handleVerify = async () => {
    if (!certificateNumber.trim()) {
      toast.error("Please enter a certificate number");
      return;
    }

    if (!ownerName.trim()) {
      toast.error("Please enter the owner name");
      return;
    }

    if (!propertyAddress.trim()) {
      toast.error("Please enter the property address");
      return;
    }

    // Simulate document upload if file is selected
    let documentUrl: string | undefined;
    if (documentFile) {
      setUploadProgress(0);
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 100);

      // In production, upload to S3 here
      documentUrl = `https://storage.example.com/cofo/${documentFile.name}`;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    verifyCertificate.mutate({
      certificateNumber,
      ownerName,
      propertyAddress,
      phoneNumber: phoneNumber || undefined,
      documentUrl
    });
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Certificate of Occupancy Verification</h1>
        <p className="text-muted-foreground">
          Verify C of O certificates with Nigerian government registries (Lagos State & FCT Abuja)
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Verifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.verified}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.successRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">SMS Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.smsDeliveryRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="verify" className="space-y-6">
        <TabsList>
          <TabsTrigger value="verify">Verify Certificate</TabsTrigger>
          <TabsTrigger value="history">Verification History</TabsTrigger>
        </TabsList>

        <TabsContent value="verify" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verify C of O Certificate</CardTitle>
              <CardDescription>
                Enter certificate details and optionally upload the document for automated extraction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Document Upload Section */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  type="file"
                  id="document-upload"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
                <label htmlFor="document-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    {documentFile ? (
                      <>
                        <FileText className="h-12 w-12 text-green-600" />
                        <div>
                          <p className="font-medium">{documentFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        {uploadProgress > 0 && uploadProgress < 100 && (
                          <div className="w-full max-w-xs">
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Upload C of O Document</p>
                          <p className="text-sm text-muted-foreground">
                            PDF, JPG, or PNG (max 10MB)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </label>
                {documentFile && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setDocumentFile(null)}
                  >
                    Remove File
                  </Button>
                )}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Document upload is optional. If provided, we'll attempt to extract certificate details automatically.
                </AlertDescription>
              </Alert>

              {/* Manual Entry Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="certificate-number">
                    Certificate Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="certificate-number"
                    placeholder="e.g., LAG/2023/001234 or FCT/2023/009876"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: LAG/YYYY/XXXXXX (Lagos) or FCT/YYYY/XXXXXX (FCT Abuja)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner-name">
                    Owner Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="owner-name"
                      placeholder="Full name as on certificate"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="property-address">
                    Property Address <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="property-address"
                      placeholder="Full property address"
                      value={propertyAddress}
                      onChange={(e) => setPropertyAddress(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone-number">
                    Phone Number (Optional)
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone-number"
                      placeholder="+234 XXX XXX XXXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Receive SMS notification with verification results
                  </p>
                </div>
              </div>

              <Button
                onClick={handleVerify}
                disabled={verifyCertificate.isPending}
                className="w-full"
                size="lg"
              >
                {verifyCertificate.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying Certificate...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Verify Certificate
                  </>
                )}
              </Button>

              {/* Verification Result */}
              {verifyCertificate.data && (
                <Card className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Verification Result</CardTitle>
                      {verifyCertificate.data.status === 'verified' ? (
                        <Badge className="bg-green-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Verified
                        </Badge>
                      ) : verifyCertificate.data.status === 'not_verified' ? (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" />
                          Not Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Error
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Summary</p>
                      <p className="mt-1">{verifyCertificate.data.summary}</p>
                    </div>

                    {verifyCertificate.data.registryVerification.details && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Owner</p>
                          <p className="mt-1">{verifyCertificate.data.registryVerification.details.ownerName}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Registry</p>
                          <p className="mt-1 uppercase">{verifyCertificate.data.registryVerification.registry}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Plot Number</p>
                          <p className="mt-1">{verifyCertificate.data.registryVerification.details.plotNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Land Size</p>
                          <p className="mt-1">{verifyCertificate.data.registryVerification.details.landSize}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Registration Date</p>
                          <p className="mt-1">{verifyCertificate.data.registryVerification.details.registrationDate}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Confidence Score</p>
                          <p className="mt-1">{verifyCertificate.data.registryVerification.confidence}%</p>
                        </div>
                      </div>
                    )}

                    {verifyCertificate.data.registryVerification.details?.encumbrances && 
                     verifyCertificate.data.registryVerification.details.encumbrances.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Encumbrances:</strong> {verifyCertificate.data.registryVerification.details.encumbrances.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Verification History</CardTitle>
              <CardDescription>
                Recent certificate verifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : history && history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div
                      key={item.verificationId}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-medium">{item.certificateNumber}</p>
                          {item.status === 'verified' ? (
                            <Badge className="bg-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-3 w-3" />
                              Not Verified
                            </Badge>
                          )}
                        </div>
                        {item.ownerName && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Owner: {item.ownerName}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Registry: {item.registry.toUpperCase()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.verifiedAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.verifiedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No verification history yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
