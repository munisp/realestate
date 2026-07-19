import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { APP_TITLE } from "@/const";
import { Building2, CheckCircle, Download, Home, Calendar, Mail } from "lucide-react";
import { Link } from "wouter";

export default function PaymentSuccess() {
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const reference = params.get("reference");
  const type = params.get("type");
  const amount = params.get("amount");

  // Trigger email confirmation
  useEffect(() => {
    if (reference && user?.email) {
      // TODO: Trigger email notification via backend
      console.log("Send confirmation email to:", user.email);
    }
  }, [reference, user]);

  const getBookingReference = () => {
    return reference || `BK-${Date.now()}`;
  };

  const getNextSteps = () => {
    if (type === "builder_project") {
      return [
        "Your payment is securely held in escrow",
        "Builder will be notified to begin work on the milestone",
        "Funds will be released only after milestone verification by our inspectors",
        "You'll receive email updates on construction progress",
        "Track milestone status in your dashboard",
      ];
    } else {
      return [
        "Booking confirmation sent to your email",
        "Host will be notified of your reservation",
        "You'll receive check-in instructions 24 hours before arrival",
        "Contact host directly through the platform for any questions",
        "View booking details in your dashboard",
      ];
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>{APP_TITLE}</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 py-12">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground">
              Your transaction has been completed successfully
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>Reference: {getBookingReference()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Transaction Type</p>
                  <p className="font-medium capitalize">
                    {type?.replace("_", " ") || "Booking"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount Paid</p>
                  <p className="font-medium">
                    ₦{amount ? Number(amount).toLocaleString() : "0"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="font-medium">{new Date().toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Status</p>
                  <p className="font-medium text-green-600">Completed</p>
                </div>
              </div>

              <Separator />

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Download Receipt
                </Button>
                <Button variant="outline" className="flex-1">
                  <Mail className="mr-2 h-4 w-4" />
                  Email Receipt
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {getNextSteps().map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button asChild className="flex-1">
              <Link href="/dashboard">
                <Calendar className="mr-2 h-4 w-4" />
                View My Bookings
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2025 {APP_TITLE}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
