import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { APP_TITLE } from "@/const";
import { Building2, XCircle, RefreshCw, Home, HelpCircle, Mail } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function PaymentFailure() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const reference = params.get("reference");
  const reason = params.get("reason");
  
  const handleRetry = () => {
    const type = params.get("type");
    const propertyId = params.get("propertyId");
    const total = params.get("total");
    const checkIn = params.get("checkIn");
    const checkOut = params.get("checkOut");
    const guests = params.get("guests");
    
    const checkoutParams = new URLSearchParams({
      type: type || "",
      propertyId: propertyId || "",
      total: total || "",
      ...(checkIn && { checkIn }),
      ...(checkOut && { checkOut }),
      ...(guests && { guests }),
    });
    setLocation(`/checkout?${checkoutParams.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>{APP_TITLE}</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 py-12">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Payment Failed</h1>
            <p className="text-muted-foreground">We couldn't process your payment</p>
          </div>

          {reference && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>
                <strong>Transaction Reference:</strong> {reference}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={handleRetry} className="md:col-span-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
