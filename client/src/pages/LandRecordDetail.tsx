import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { FileText, MapPin, Shield, Clock, Upload, Download, ExternalLink, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { useState, useCallback } from "react";
import { MapView } from "@/components/Map";

export default function LandRecordDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Fetch land record details
  const { data: landRecord, isLoading: loadingRecord } = trpc.landRecords.getById.useQuery(
    { id: parseInt(id!) },
    { enabled: !!id }
  );

  // Fetch ownership history
  const { data: ownershipHistory, isLoading: loadingHistory } = trpc.landRecords.getOwnershipHistory.useQuery(
    { landRecordId: parseInt(id!) },
    { enabled: !!id }
  );

  // Fetch documents
  const { data: documents, isLoading: loadingDocs } = trpc.landRecords.getDocuments.useQuery(
    { landRecordId: parseInt(id!) },
    { enabled: !!id }
  );

  // Fetch blockchain audit trail
  const { data: auditTrail, isLoading: loadingAudit } = trpc.landRecords.getAuditTrail.useQuery(
    { landRecordId: parseInt(id!) },
    { enabled: !!id }
  );

  // Fetch verification history
  const { data: verificationHistory } = trpc.landRecords.getVerificationHistory.useQuery(
    { landRecordId: parseInt(id!) },
    { enabled: !!id }
  );

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to view land record details.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loadingRecord) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!landRecord) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Land Record Not Found</CardTitle>
            <CardDescription>The requested land record does not exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/land-registry")}>Back to Land Registry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge className="bg-gray-500"><AlertCircle className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{landRecord.propertyAddress}</h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{landRecord.lga}, {landRecord.state}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>Parcel ID: {landRecord.parcelId}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {getVerificationBadge(landRecord.verificationStatus)}
          {landRecord.blockchainRegistered && (
            <Badge className="bg-blue-500">
              <Shield className="w-3 h-3 mr-1" />
              Blockchain Registered
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ownership">Ownership History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain Trail</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Land Size:</span>
                  <span className="font-medium">{landRecord.landSize} sqm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Land Use:</span>
                  <span className="font-medium capitalize">{landRecord.landUse}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zone:</span>
                  <span className="font-medium">{landRecord.zone || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ward:</span>
                  <span className="font-medium">{landRecord.ward || "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Ownership</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner:</span>
                  <span className="font-medium">{landRecord.currentOwnerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Acquisition Date:</span>
                  <span className="font-medium">
                    {landRecord.acquisitionDate ? new Date(landRecord.acquisitionDate).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">C of O Number:</span>
                  <span className="font-medium">{landRecord.cofoNumber || "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Map */}
          <Card>
            <CardHeader>
              <CardTitle>Property Location</CardTitle>
              <CardDescription>Property boundary and surrounding area</CardDescription>
            </CardHeader>
            <CardContent>
              {landRecord.latitude && landRecord.longitude ? (
                <div className="h-96 rounded-lg overflow-hidden">
                  <MapView
                    onMapReady={(map, google) => {
                      // Center map on property location
                      const propertyLocation = {
                        lat: landRecord.latitude!,
                        lng: landRecord.longitude!,
                      };

                      // Add marker for property
                      new google.maps.Marker({
                        position: propertyLocation,
                        map: map,
                        title: landRecord.propertyAddress,
                        icon: {
                          path: google.maps.SymbolPath.CIRCLE,
                          scale: 10,
                          fillColor: '#3B82F6',
                          fillOpacity: 1,
                          strokeColor: '#ffffff',
                          strokeWeight: 2,
                        },
                      });

                      // Add info window
                      const infoWindow = new google.maps.InfoWindow({
                        content: `
                          <div style="padding: 8px;">
                            <h3 style="font-weight: bold; margin-bottom: 4px;">${landRecord.propertyAddress}</h3>
                            <p style="margin: 2px 0;">Parcel ID: ${landRecord.parcelId}</p>
                            <p style="margin: 2px 0;">Land Size: ${landRecord.landSize} sqm</p>
                            <p style="margin: 2px 0;">Owner: ${landRecord.currentOwnerName}</p>
                          </div>
                        `,
                      });

                      // Show info window on marker click
                      const marker = new google.maps.Marker({
                        position: propertyLocation,
                        map: map,
                      });
                      marker.addListener('click', () => {
                        infoWindow.open(map, marker);
                      });

                      // Draw property boundary if coordinates available
                      // This is a placeholder - in production, fetch actual boundary coordinates
                      const boundaryCoords = [
                        { lat: propertyLocation.lat + 0.0005, lng: propertyLocation.lng - 0.0005 },
                        { lat: propertyLocation.lat + 0.0005, lng: propertyLocation.lng + 0.0005 },
                        { lat: propertyLocation.lat - 0.0005, lng: propertyLocation.lng + 0.0005 },
                        { lat: propertyLocation.lat - 0.0005, lng: propertyLocation.lng - 0.0005 },
                      ];

                      new google.maps.Polygon({
                        paths: boundaryCoords,
                        map: map,
                        strokeColor: '#3B82F6',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: '#3B82F6',
                        fillOpacity: 0.2,
                      });

                      // Set map bounds to show property
                      const bounds = new google.maps.LatLngBounds();
                      boundaryCoords.forEach((coord) => bounds.extend(coord));
                      map.fitBounds(bounds);
                    }}
                  />
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-2" />
                    <p>Location coordinates not available</p>
                    <p className="text-sm">Please add coordinates to view property on map</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ownership History Tab */}
        <TabsContent value="ownership" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ownership Timeline</CardTitle>
              <CardDescription>Complete history of property ownership transfers</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : ownershipHistory && ownershipHistory.length > 0 ? (
                <div className="relative border-l-2 border-gray-200 pl-6 space-y-6">
                  {ownershipHistory.map((record, index) => (
                    <div key={record.id} className="relative">
                      <div className="absolute -left-8 top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white"></div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{record.ownerName}</h4>
                            <p className="text-sm text-muted-foreground">{record.ownerContact || "No contact info"}</p>
                          </div>
                          {index === 0 && (
                            <Badge className="bg-green-500">Current Owner</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Transfer Date:</span>
                            <span className="ml-2 font-medium">
                              {new Date(record.transferDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Transfer Type:</span>
                            <span className="ml-2 font-medium capitalize">{record.transferType}</span>
                          </div>
                          {record.transferValue && (
                            <div>
                              <span className="text-muted-foreground">Transfer Value:</span>
                              <span className="ml-2 font-medium">₦{record.transferValue.toLocaleString()}</span>
                            </div>
                          )}
                          {record.deedNumber && (
                            <div>
                              <span className="text-muted-foreground">Deed Number:</span>
                              <span className="ml-2 font-medium">{record.deedNumber}</span>
                            </div>
                          )}
                        </div>
                        {record.notes && (
                          <p className="mt-2 text-sm text-muted-foreground">{record.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-2" />
                  <p>No ownership history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Document Vault</CardTitle>
                  <CardDescription>All documents related to this land record</CardDescription>
                </div>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDocs ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-500" />
                        <div>
                          <h4 className="font-medium">{doc.documentName}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="capitalize">{doc.documentType}</span>
                            <span>•</span>
                            <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                            {doc.verificationStatus === "verified" && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Verified
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2" />
                  <p>No documents uploaded yet</p>
                  <Button className="mt-4" onClick={() => setUploadDialogOpen(true)}>
                    Upload First Document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blockchain Trail Tab */}
        <TabsContent value="blockchain" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blockchain Audit Trail</CardTitle>
              <CardDescription>Immutable record of all transactions on the blockchain</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAudit ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : auditTrail && auditTrail.length > 0 ? (
                <div className="space-y-4">
                  {auditTrail.map((entry) => (
                    <div key={entry.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-blue-500" />
                          <h4 className="font-semibold capitalize">{entry.eventType.replace("_", " ")}</h4>
                        </div>
                        <Badge variant="outline">
                          {new Date(entry.timestamp).toLocaleString()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                        <div>
                          <span className="text-muted-foreground">Transaction Hash:</span>
                          <p className="font-mono text-xs mt-1 break-all">{entry.transactionHash}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Block Number:</span>
                          <p className="font-medium mt-1">{entry.blockNumber}</p>
                        </div>
                      </div>
                      {entry.eventData && (
                        <div className="mt-3">
                          <span className="text-sm text-muted-foreground">Event Data:</span>
                          <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                            {JSON.stringify(entry.eventData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-2" />
                  <p>No blockchain records available</p>
                  {!landRecord.blockchainRegistered && (
                    <p className="text-sm mt-2">This property has not been registered on the blockchain yet.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verification History</CardTitle>
              <CardDescription>Timeline of all verification attempts and results</CardDescription>
            </CardHeader>
            <CardContent>
              {verificationHistory && verificationHistory.length > 0 ? (
                <div className="space-y-4">
                  {verificationHistory.map((verification) => (
                    <div key={verification.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">Verification Request</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(verification.requestDate).toLocaleString()}
                          </p>
                        </div>
                        {getVerificationBadge(verification.status)}
                      </div>
                      {verification.verificationScore !== null && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Verification Score</span>
                            <span className="font-semibold">{verification.verificationScore}/100</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                verification.verificationScore >= 80
                                  ? "bg-green-500"
                                  : verification.verificationScore >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${verification.verificationScore}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      {verification.verificationDetails && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Details:</span>
                          <pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(verification.verificationDetails, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                  <p>No verification history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
