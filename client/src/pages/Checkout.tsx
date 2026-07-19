import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Building2, CreditCard, Loader2, CheckCircle, AlertCircle, Shield, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Checkout() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [paymentGateway, setPaymentGateway] = useState<"stripe" | "flutterwave" | "paystack">("stripe");
  const [processing, setProcessing] = useState(false);
  const [fraudCheck, setFraudCheck] = useState<any>(null);
  const [fraudLoading, setFraudLoading] = useState(false);

  // Get checkout details from URL params
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type"); // "shortlet" or "builder_project"
  const propertyId = params.get("propertyId");
  const total = params.get("total");
  const checkIn = params.get("checkIn");
  const checkOut = params.get("checkOut");
  const guests = params.get("guests");

  const createPaymentMutation = trpc.payments.createCheckout.useMutation();
  const analyzeFraudMutation = trpc.microservices.analyzeFraud.useMutation();

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [isAuthenticated]);

  if (!type || !propertyId || !total) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Invalid Checkout</CardTitle>
            <CardDescription>Missing required checkout information</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePayment = async () => {
    setProcessing(true);

    try {
      // Run fraud detection first
      setFraudLoading(true);
      const fraudAnalysis = await analyzeFraudMutation.mutateAsync({
        user_id: String(user?.id || 0),
        amount: Number(total),
        currency: "NGN",
        payment_method: paymentGateway,
        ip_address: undefined,
        device_id: undefined,
        location: undefined,
      });
      setFraudCheck(fraudAnalysis);
      setFraudLoading(false);

      // Block critical risk transactions
      if (fraudAnalysis.risk_level === "critical") {
        toast.error("Transaction blocked due to high fraud risk");
        setProcessing(false);
        return;
      }

      // Warn on high risk
      if (fraudAnalysis.risk_level === "high") {
        const proceed = window.confirm(
          `This transaction has been flagged as high risk (${(fraudAnalysis.risk_score * 100).toFixed(0)}% risk score). Do you want to proceed?`
        );
        if (!proceed) {
          setProcessing(false);
          return;
        }
      }

      const result = await createPaymentMutation.mutateAsync({
        transactionId: 0, // TODO: Create transaction first
        propertyId: Number(propertyId),
        amount: Number(total),
      });

      // Redirect to payment gateway
      if (result.url) {
        window.location.href = result.url;
      } else {
        toast.success("Payment initiated successfully");
        setLocation(`/payment-success`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed");
      setProcessing(false);
    }
  };

  const getPaymentGatewayLogo = (gateway: string) => {
    switch (gateway) {
      case "stripe":
        return "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg";
      case "flutterwave":
        return "https://flutterwave.com/images/logo/full.svg";
      case "paystack":
        return "https://paystack.com/assets/img/logo/paystack-logo.svg";
      default:
        return "";
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
          <div className="flex items-center gap-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm text-muted-foreground">Secure Checkout</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Payment Method Selection */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">Complete Your Payment</h1>
                <p className="text-muted-foreground">
                  Choose your preferred payment method to complete the transaction
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>
                    Select a payment gateway to process your transaction securely
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={paymentGateway} onValueChange={(value: any) => setPaymentGateway(value)}>
                    <div className="space-y-4">
                      {/* Stripe */}
                      <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                        <RadioGroupItem value="stripe" id="stripe" />
                        <Label htmlFor="stripe" className="flex-1 cursor-pointer flex items-center justify-between">
                          <div>
                            <p className="font-medium">Stripe</p>
                            <p className="text-sm text-muted-foreground">
                              Credit/Debit Cards, Apple Pay, Google Pay
                            </p>
                          </div>
                          <img src={getPaymentGatewayLogo("stripe")} alt="Stripe" className="h-6" />
                        </Label>
                      </div>

                      {/* Flutterwave */}
                      <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                        <RadioGroupItem value="flutterwave" id="flutterwave" />
                        <Label htmlFor="flutterwave" className="flex-1 cursor-pointer flex items-center justify-between">
                          <div>
                            <p className="font-medium">Flutterwave</p>
                            <p className="text-sm text-muted-foreground">
                              Cards, Bank Transfer, Mobile Money
                            </p>
                          </div>
                          <img src={getPaymentGatewayLogo("flutterwave")} alt="Flutterwave" className="h-6" />
                        </Label>
                      </div>

                      {/* Paystack */}
                      <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                        <RadioGroupItem value="paystack" id="paystack" />
                        <Label htmlFor="paystack" className="flex-1 cursor-pointer flex items-center justify-between">
                          <div>
                            <p className="font-medium">Paystack</p>
                            <p className="text-sm text-muted-foreground">
                              Cards, Bank Transfer, USSD
                            </p>
                          </div>
                          <img src={getPaymentGatewayLogo("paystack")} alt="Paystack" className="h-6" />
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Fraud Detection Warning */}
              {fraudLoading && (
                <Alert>
                  <Shield className="h-4 w-4 animate-pulse" />
                  <AlertDescription>
                    Running fraud detection analysis...
                  </AlertDescription>
                </Alert>
              )}

              {fraudCheck && fraudCheck.risk_level === "low" && (
                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Secure Transaction:</strong> This transaction has been verified as low risk ({(fraudCheck.risk_score * 100).toFixed(0)}% risk score).
                  </AlertDescription>
                </Alert>
              )}

              {fraudCheck && fraudCheck.risk_level === "medium" && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <strong>Moderate Risk:</strong> This transaction has a {(fraudCheck.risk_score * 100).toFixed(0)}% risk score. Please verify your details.
                    {fraudCheck.risk_factors && fraudCheck.risk_factors.length > 0 && (
                      <div className="mt-2 text-sm">
                        Factors: {fraudCheck.risk_factors.join(", ")}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {fraudCheck && fraudCheck.risk_level === "high" && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>High Risk Warning:</strong> This transaction has been flagged as high risk ({(fraudCheck.risk_score * 100).toFixed(0)}% risk score). Proceed with caution.
                    {fraudCheck.risk_factors && fraudCheck.risk_factors.length > 0 && (
                      <div className="mt-2 text-sm">
                        Factors: {fraudCheck.risk_factors.join(", ")}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {type === "builder_project" && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Escrow Protection:</strong> Your payment will be held in escrow and released to the builder only when construction milestones are verified by our inspectors.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Order Summary */}
            <div className="md:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction Type</p>
                    <p className="font-medium capitalize">{type?.replace("_", " ")}</p>
                  </div>

                  {checkIn && checkOut && (
                    <div>
                      <p className="text-sm text-muted-foreground">Dates</p>
                      <p className="font-medium">
                        {new Date(checkIn).toLocaleDateString()} - {new Date(checkOut).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {guests && (
                    <div>
                      <p className="text-sm text-muted-foreground">Guests</p>
                      <p className="font-medium">{guests}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span>₦{Number(total).toLocaleString()}</span>
                  </div>

                  <Button
                    onClick={handlePayment}
                    disabled={processing}
                    className="w-full"
                    size="lg"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay ₦{Number(total).toLocaleString()}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By completing this purchase, you agree to our Terms of Service and Privacy Policy
                  </p>
                </CardContent>
              </Card>
            </div>
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
