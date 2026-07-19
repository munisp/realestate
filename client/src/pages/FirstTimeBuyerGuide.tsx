import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_TITLE } from "@/const";
import { 
  Building2, CheckCircle2, Download, ExternalLink,
  Calculator, FileText, Home, Search, DollarSign,
  ClipboardCheck, Key, AlertCircle, Play
} from "lucide-react";
import { Link } from "wouter";

export default function FirstTimeBuyerGuide() {
  const steps = [
    {
      id: 1,
      title: "Check Your Credit & Finances",
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      tasks: [
        "Review your credit report and score (aim for 620+)",
        "Calculate your debt-to-income ratio (should be under 43%)",
        "Start saving for down payment (typically 3-20%)",
        "Build emergency fund (3-6 months expenses)",
        "Reduce high-interest debt",
      ],
      tools: [
        { name: "Affordability Calculator", link: "/affordability-calculator" },
        { name: "Credit Score Guide", link: "#" },
      ],
      timeframe: "3-6 months before",
    },
    {
      id: 2,
      title: "Get Pre-Approved",
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
      tasks: [
        "Gather financial documents (pay stubs, tax returns, bank statements)",
        "Compare mortgage lenders and rates",
        "Submit pre-approval application",
        "Receive pre-approval letter",
        "Understand your budget and loan options",
      ],
      tools: [
        { name: "Mortgage Pre-Approval", link: "/mortgage/apply" },
        { name: "Lender Comparison", link: "#" },
      ],
      timeframe: "2-3 months before",
    },
    {
      id: 3,
      title: "Find Your Agent & Start House Hunting",
      icon: Search,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      tasks: [
        "Interview and select a buyer's agent",
        "Create your wish list (must-haves vs nice-to-haves)",
        "Research neighborhoods and schools",
        "Attend open houses and schedule viewings",
        "Take notes and photos of properties",
      ],
      tools: [
        { name: "Find an Agent", link: "/find-agent" },
        { name: "Property Search", link: "/search" },
        { name: "Neighborhood Guide", link: "#" },
      ],
      timeframe: "1-3 months",
    },
    {
      id: 4,
      title: "Make an Offer",
      icon: ClipboardCheck,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
      tasks: [
        "Review comparable sales with your agent",
        "Determine your offer price and terms",
        "Include contingencies (inspection, financing, appraisal)",
        "Submit offer with earnest money deposit",
        "Negotiate if needed",
      ],
      tools: [
        { name: "Offer Management", link: "/offers" },
        { name: "Property Comparison", link: "/compare" },
      ],
      timeframe: "1-2 weeks per property",
    },
    {
      id: 5,
      title: "Home Inspection & Appraisal",
      icon: Home,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
      tasks: [
        "Schedule professional home inspection",
        "Attend inspection and ask questions",
        "Review inspection report carefully",
        "Request repairs or negotiate price if needed",
        "Lender orders appraisal to confirm value",
      ],
      tools: [
        { name: "Schedule Inspection", link: "/property/1/schedule-inspection" },
        { name: "Inspection Checklist", link: "#" },
      ],
      timeframe: "7-14 days after offer",
    },
    {
      id: 6,
      title: "Finalize Financing",
      icon: Calculator,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-950",
      tasks: [
        "Complete full mortgage application",
        "Provide additional documents as requested",
        "Lock in your interest rate",
        "Review Loan Estimate carefully",
        "Get final loan approval",
      ],
      tools: [
        { name: "Closing Cost Calculator", link: "/closing-costs" },
        { name: "Mortgage Calculator", link: "/tax-calculator" },
      ],
      timeframe: "30-45 days",
    },
    {
      id: 7,
      title: "Close on Your Home",
      icon: Key,
      color: "text-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-950",
      tasks: [
        "Review Closing Disclosure (3 days before closing)",
        "Schedule final walk-through",
        "Arrange homeowners insurance",
        "Bring certified check for closing costs",
        "Sign documents and get your keys!",
      ],
      tools: [
        { name: "Closing Checklist", link: "#" },
        { name: "Moving Calculator", link: "/moving-calculator" },
      ],
      timeframe: "Closing day",
    },
  ];

  const resources = [
    {
      category: "Financial Calculators",
      items: [
        { name: "Affordability Calculator", description: "How much home can you afford?", link: "/affordability-calculator" },
        { name: "Mortgage Calculator", description: "Estimate monthly payments", link: "/tax-calculator" },
        { name: "Closing Cost Estimator", description: "Calculate total cash needed", link: "/closing-costs" },
        { name: "Rent vs Buy", description: "Should you rent or buy?", link: "/rent-vs-buy" },
      ],
    },
    {
      category: "Property Search Tools",
      items: [
        { name: "Property Search", description: "Browse available homes", link: "/search" },
        { name: "Map Search", description: "Search by location", link: "/map" },
        { name: "Saved Searches", description: "Save and track searches", link: "/saved-searches" },
        { name: "Property Alerts", description: "Get notified of new listings", link: "/alerts" },
      ],
    },
    {
      category: "Decision Support",
      items: [
        { name: "Property Comparison", description: "Compare multiple homes", link: "/compare" },
        { name: "School Ratings", description: "Research local schools", link: "#" },
        { name: "Neighborhood Insights", description: "Explore amenities", link: "#" },
        { name: "Home Warranty Guide", description: "Protect your investment", link: "/home-warranty" },
      ],
    },
  ];

  const faqs = [
    {
      question: "How much do I need for a down payment?",
      answer: "Down payments typically range from 3% to 20% of the home price. FHA loans require as little as 3.5%, conventional loans often need 5-20%. A 20% down payment helps you avoid PMI (private mortgage insurance) and may get you better rates.",
    },
    {
      question: "What credit score do I need?",
      answer: "Most lenders require a minimum credit score of 620 for conventional loans. FHA loans may accept scores as low as 580 (or 500 with 10% down). Higher scores (740+) typically qualify for the best interest rates.",
    },
    {
      question: "What's the difference between pre-qualification and pre-approval?",
      answer: "Pre-qualification is an informal estimate based on self-reported information. Pre-approval involves a thorough review of your finances and credit, resulting in a conditional commitment from a lender. Pre-approval carries more weight with sellers.",
    },
    {
      question: "How long does the home buying process take?",
      answer: "From offer to closing typically takes 30-45 days. However, the entire process from starting your search to closing can take 3-6 months, depending on market conditions and your preparation.",
    },
    {
      question: "What are closing costs?",
      answer: "Closing costs are fees associated with finalizing your home purchase, typically 2-5% of the purchase price. They include loan origination fees, appraisal, title insurance, escrow fees, and more. Use our Closing Cost Calculator to estimate yours.",
    },
    {
      question: "Should I buy a home warranty?",
      answer: "A home warranty can provide peace of mind by covering repairs and replacements of major systems and appliances. It's especially valuable for first-time buyers or older homes. Compare providers and coverage options on our Home Warranty page.",
    },
  ];

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
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge className="mb-4">Complete Guide</Badge>
            <h1 className="text-4xl font-bold mb-4">First-Time Home Buyer Guide</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your step-by-step roadmap to buying your first home with confidence
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">7</div>
                <p className="text-sm text-muted-foreground">Steps to Homeownership</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">15+</div>
                <p className="text-sm text-muted-foreground">Tools & Calculators</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">3-6</div>
                <p className="text-sm text-muted-foreground">Months Timeline</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">100%</div>
                <p className="text-sm text-muted-foreground">Free Resources</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="steps" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="steps">7-Step Process</TabsTrigger>
              <TabsTrigger value="resources">Tools & Resources</TabsTrigger>
              <TabsTrigger value="faq">FAQs</TabsTrigger>
            </TabsList>

            {/* Steps Tab */}
            <TabsContent value="steps" className="space-y-6">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Card key={step.id}>
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-full ${step.bgColor} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-6 h-6 ${step.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline">Step {step.id}</Badge>
                            <Badge variant="secondary">{step.timeframe}</Badge>
                          </div>
                          <CardTitle className="text-2xl">{step.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-3">What to Do:</h4>
                        <ul className="space-y-2">
                          {step.tasks.map((task, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-3">Helpful Tools:</h4>
                        <div className="flex flex-wrap gap-2">
                          {step.tools.map((tool, i) => (
                            <Link key={i} href={tool.link}>
                              <Button variant="outline" size="sm">
                                {tool.name}
                                <ExternalLink className="w-3 h-3 ml-2" />
                              </Button>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Download Checklist */}
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-2">Download Complete Checklist</h3>
                      <p className="text-sm opacity-90">
                        Get a printable PDF with all steps, tasks, and timelines
                      </p>
                    </div>
                    <Button variant="secondary" size="lg">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Resources Tab */}
            <TabsContent value="resources" className="space-y-6">
              {resources.map((category, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>{category.category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {category.items.map((item, i) => (
                        <Link key={i} href={item.link}>
                          <div className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold mb-1">{item.name}</h4>
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Video Tutorials */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Video Tutorials
                  </CardTitle>
                  <CardDescription>
                    Watch step-by-step guides from real estate experts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      "Understanding Credit Scores",
                      "How to Get Pre-Approved",
                      "Making a Strong Offer",
                      "Home Inspection 101",
                      "Closing Day Walkthrough",
                      "First-Time Buyer Programs",
                    ].map((title, i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                          <Play className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <h4 className="font-semibold text-sm">{title}</h4>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* FAQ Tab */}
            <TabsContent value="faq" className="space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                      {faq.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}

              {/* Still Have Questions */}
              <Card className="border-2 border-primary">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">Still Have Questions?</h3>
                    <p className="text-muted-foreground mb-4">
                      Connect with a local real estate agent who can guide you through the process
                    </p>
                    <Link href="/find-agent">
                      <Button size="lg">
                        Find an Agent
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Bottom CTA */}
          <Card className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Ready to Start Your Journey?</h2>
                <p className="text-muted-foreground mb-6">
                  Use our tools to get started on your path to homeownership today
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link href="/affordability-calculator">
                    <Button size="lg">
                      <Calculator className="w-4 h-4 mr-2" />
                      Check Affordability
                    </Button>
                  </Link>
                  <Link href="/search">
                    <Button size="lg" variant="outline">
                      <Search className="w-4 h-4 mr-2" />
                      Browse Homes
                    </Button>
                  </Link>
                  <Link href="/find-agent">
                    <Button size="lg" variant="outline">
                      Find an Agent
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
