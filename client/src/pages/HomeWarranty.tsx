// @ts-nocheck
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Building2, Shield, CheckCircle2, XCircle, Star, 
  DollarSign, Phone, FileText, TrendingUp 
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function HomeWarranty() {
  const { data: providers, isLoading } = trpc.homeWarranty.getProviders.useQuery();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleGetQuote = (providerName: string) => {
    toast.success(`Redirecting to ${providerName} for a quote...`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>{APP_TITLE}</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost">Dashboard</Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Home Warranty Comparison</h1>
            <p className="text-muted-foreground">
              Compare top home warranty providers to protect your appliances and home systems
            </p>
          </div>

          {/* What is Home Warranty */}
          <Card className="mb-8 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                What is a Home Warranty?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">
                A home warranty is a service contract that covers the repair or replacement of major home systems and appliances that break down due to normal wear and tear. Unlike homeowners insurance, which covers damage from events like fires or storms, a home warranty protects you from unexpected repair costs.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Budget Protection</p>
                    <p className="text-xs text-muted-foreground">Avoid surprise repair bills</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Convenient Service</p>
                    <p className="text-xs text-muted-foreground">24/7 claims hotline</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Peace of Mind</p>
                    <p className="text-xs text-muted-foreground">Professional repairs</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider Comparison */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-32 bg-muted rounded mb-4"></div>
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {providers?.map((provider: any, index: number) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-2xl mb-2">{provider.name}</CardTitle>
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{provider.rating}</span>
                            <span className="text-sm text-muted-foreground">
                              ({provider.reviewCount} reviews)
                            </span>
                          </div>
                          {provider.bestFor && (
                            <Badge variant="secondary">{provider.bestFor}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{provider.description}</p>
                      </div>
                      <Shield className="w-12 h-12 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="coverage" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="coverage">Coverage</TabsTrigger>
                        <TabsTrigger value="pricing">Pricing</TabsTrigger>
                        <TabsTrigger value="claims">Claims</TabsTrigger>
                      </TabsList>

                      <TabsContent value="coverage" className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Appliances */}
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              Appliances Covered
                            </h4>
                            <ul className="space-y-1 text-sm">
                              {provider.coverage.appliances.map((item: string, idx: number) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <span className="text-green-600">✓</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Systems */}
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              Systems Covered
                            </h4>
                            <ul className="space-y-1 text-sm">
                              {provider.coverage.systems.map((item: string, idx: number) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <span className="text-green-600">✓</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Optional Add-ons */}
                        {provider.coverage.optionalAddons && provider.coverage.optionalAddons.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">Optional Add-ons</h4>
                            <div className="flex flex-wrap gap-2">
                              {provider.coverage.optionalAddons.map((addon: string, idx: number) => (
                                <Badge key={idx} variant="outline">{addon}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="pricing" className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-4">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground mb-1">Annual Cost</p>
                                <p className="text-2xl font-bold">{formatCurrency(provider.pricing.annualCost)}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatCurrency(provider.pricing.annualCost / 12)}/month
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground mb-1">Service Fee</p>
                                <p className="text-2xl font-bold">{formatCurrency(provider.pricing.serviceFee)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Per claim</p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground mb-1">Coverage Limit</p>
                                <p className="text-2xl font-bold">
                                  {provider.pricing.coverageLimit === 'unlimited' 
                                    ? 'Unlimited' 
                                    : formatCurrency(provider.pricing.coverageLimit)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">Per item</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-semibold mb-2">What's Included</h4>
                          <ul className="space-y-1 text-sm">
                            <li className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span>No limit on number of claims</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span>30-day waiting period for new contracts</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span>Transferable to new homeowner</span>
                            </li>
                          </ul>
                        </div>
                      </TabsContent>

                      <TabsContent value="claims" className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold mb-3">Claims Process</h4>
                            <ol className="space-y-3">
                              {provider.claimsProcess.steps.map((step: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-3">
                                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    {idx + 1}
                                  </div>
                                  <span className="text-sm">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>

                          <div className="space-y-4">
                            <div className="p-4 border rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Phone className="w-5 h-5 text-primary" />
                                <h4 className="font-semibold">Response Time</h4>
                              </div>
                              <p className="text-2xl font-bold mb-1">{provider.claimsProcess.responseTime}</p>
                              <p className="text-xs text-muted-foreground">Average time to dispatch technician</p>
                            </div>

                            <div className="p-4 border rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Star className="w-5 h-5 text-yellow-400" />
                                <h4 className="font-semibold">Customer Satisfaction</h4>
                              </div>
                              <p className="text-2xl font-bold mb-1">{provider.claimsProcess.satisfaction}%</p>
                              <p className="text-xs text-muted-foreground">Based on customer reviews</p>
                            </div>

                            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                              <h4 className="font-semibold mb-2">24/7 Support</h4>
                              <p className="text-sm text-muted-foreground">
                                Call anytime to file a claim or get help with your coverage
                              </p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="mt-6 flex items-center gap-4">
                      <Button 
                        className="flex-1" 
                        size="lg"
                        onClick={() => handleGetQuote(provider.name)}
                      >
                        Get Free Quote
                      </Button>
                      <Button variant="outline" size="lg">
                        Learn More
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* FAQ */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">When should I buy a home warranty?</h4>
                <p className="text-sm text-muted-foreground">
                  The best time is when you close on your home. Many sellers also offer to pay for a home warranty as part of the sale.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">What's not covered?</h4>
                <p className="text-sm text-muted-foreground">
                  Pre-existing conditions, improper installation, cosmetic issues, and items outside normal wear and tear are typically not covered.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Can I choose my own contractor?</h4>
                <p className="text-sm text-muted-foreground">
                  Most warranties require you to use their network of contractors, but some offer the option to use your own for an additional fee.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Is a home warranty worth it?</h4>
                <p className="text-sm text-muted-foreground">
                  If you have older appliances or systems, or want budget predictability, a home warranty can save you thousands in repair costs.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
