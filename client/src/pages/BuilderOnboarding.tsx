import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  FileText,
  Award,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

/**
 * Builder Onboarding & Verification Wizard
 * 
 * Multi-step application flow for construction companies and builders
 * Includes company profile, document verification, portfolio showcase, and credentials
 */

type OnboardingStep = 'company' | 'documents' | 'portfolio' | 'credentials' | 'complete';

const steps: { id: OnboardingStep; title: string; icon: any }[] = [
  { id: 'company', title: 'Company Profile', icon: Building2 },
  { id: 'documents', title: 'Legal Documents', icon: FileText },
  { id: 'portfolio', title: 'Portfolio & Projects', icon: Briefcase },
  { id: 'credentials', title: 'Credentials & Certifications', icon: Award },
  { id: 'complete', title: 'Complete', icon: CheckCircle2 },
];

export default function BuilderOnboarding() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('company');
  
  // Company data
  const [companyName, setCompanyName] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [yearsInBusiness, setYearsInBusiness] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  
  // Documents
  const [cacDocument, setCacDocument] = useState<File | null>(null);
  const [taxId, setTaxId] = useState('');
  const [taxCertificate, setTaxCertificate] = useState<File | null>(null);
  const [businessLicense, setBusinessLicense] = useState<File | null>(null);
  const [insuranceCertificate, setInsuranceCertificate] = useState<File | null>(null);
  
  // Portfolio
  const [completedProjects, setCompletedProjects] = useState('');
  const [ongoingProjects, setOngoingProjects] = useState('');
  const [portfolioImages, setPortfolioImages] = useState<File[]>([]);
  const [projectDescriptions, setProjectDescriptions] = useState('');
  const [notableClients, setNotableClients] = useState('');
  
  // Credentials
  const [certifications, setCertifications] = useState<string[]>([]);
  const [professionalMemberships, setProfessionalMemberships] = useState('');
  const [certificationDocuments, setCertificationDocuments] = useState<File[]>([]);
  const [references, setReferences] = useState('');
  
  const getCurrentStepIndex = () => steps.findIndex(s => s.id === currentStep);
  const progress = ((getCurrentStepIndex() + 1) / steps.length) * 100;
  
  const goToNextStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };
  
  const goToPreviousStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };
  
  const handlePortfolioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPortfolioImages(prev => [...prev, ...newFiles]);
    }
  };
  
  const removePortfolioImage = (index: number) => {
    setPortfolioImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleCertificationUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setCertificationDocuments(prev => [...prev, ...newFiles]);
    }
  };
  
  const removeCertificationDoc = (index: number) => {
    setCertificationDocuments(prev => prev.filter((_, i) => i !== index));
  };
  
  const toggleSpecialization = (spec: string) => {
    setSpecializations(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };
  
  const toggleCertification = (cert: string) => {
    setCertifications(prev =>
      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
    );
  };
  
  const handleSubmit = () => {
    // TODO: Submit to backend
    toast.success('Application submitted! Our team will review your profile within 3-5 business days.');
    setCurrentStep('complete');
  };
  
  const availableSpecializations = [
    'Residential Construction',
    'Commercial Construction',
    'Renovation & Remodeling',
    'Luxury Homes',
    'Affordable Housing',
    'High-Rise Buildings',
    'Infrastructure',
    'Interior Design',
  ];
  
  const availableCertifications = [
    'COREN Registered',
    'ISO 9001 Certified',
    'NIOB Member',
    'CORBON Certified',
    'Green Building Certified',
    'Safety Certified',
  ];
  
  const companySizes = [
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-500 employees',
    '500+ employees',
  ];
  
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Join Our Builder Network</h1>
          <p className="text-muted-foreground">
            Complete your application to showcase projects and connect with clients
          </p>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = getCurrentStepIndex() > index;
              
              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs text-center ${isActive ? 'font-semibold' : ''}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps.find(s => s.id === currentStep)?.title}</CardTitle>
            <CardDescription>
              Step {getCurrentStepIndex() + 1} of {steps.length}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Company Profile Step */}
            {currentStep === 'company' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-logo">Company Logo</Label>
                  <Input
                    id="company-logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCompanyLogo(e.target.files?.[0] || null)}
                  />
                  {companyLogo && (
                    <div className="mt-2">
                      <img
                        src={URL.createObjectURL(companyLogo)}
                        alt="Company logo preview"
                        className="w-32 h-32 object-contain border rounded"
                      />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name *</Label>
                  <Input
                    id="company-name"
                    placeholder="ABC Construction Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company-description">Company Description *</Label>
                  <Textarea
                    id="company-description"
                    placeholder="Tell us about your company, expertise, and what sets you apart..."
                    rows={4}
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {companyDescription.length}/1000 characters
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-email">Company Email *</Label>
                    <Input
                      id="company-email"
                      type="email"
                      placeholder="info@company.com"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company-phone">Company Phone *</Label>
                    <Input
                      id="company-phone"
                      type="tel"
                      placeholder="+234 XXX XXX XXXX"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company-website">Company Website</Label>
                  <Input
                    id="company-website"
                    type="url"
                    placeholder="https://www.company.com"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company-address">Company Address *</Label>
                  <Textarea
                    id="company-address"
                    placeholder="Full business address"
                    rows={2}
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="years-in-business">Years in Business *</Label>
                    <Input
                      id="years-in-business"
                      type="number"
                      min="0"
                      placeholder="5"
                      value={yearsInBusiness}
                      onChange={(e) => setYearsInBusiness(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company-size">Company Size *</Label>
                    <select
                      id="company-size"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                    >
                      <option value="">Select size</option>
                      {companySizes.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Specializations *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableSpecializations.map(spec => (
                      <div key={spec} className="flex items-center space-x-2">
                        <Checkbox
                          id={spec}
                          checked={specializations.includes(spec)}
                          onCheckedChange={() => toggleSpecialization(spec)}
                        />
                        <label htmlFor={spec} className="text-sm cursor-pointer">
                          {spec}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Documents Step */}
            {currentStep === 'documents' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-4">
                  <p className="text-sm">
                    All builders must provide valid legal documents for verification. Documents will be kept confidential.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cac-document">CAC Registration Certificate *</Label>
                  <Input
                    id="cac-document"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setCacDocument(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Corporate Affairs Commission registration certificate
                  </p>
                  {cacDocument && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Uploaded: {cacDocument.name}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tax-id">Tax Identification Number (TIN) *</Label>
                  <Input
                    id="tax-id"
                    placeholder="12345678-0001"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tax-certificate">Tax Clearance Certificate *</Label>
                  <Input
                    id="tax-certificate"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setTaxCertificate(e.target.files?.[0] || null)}
                  />
                  {taxCertificate && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Uploaded: {taxCertificate.name}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="business-license">Building/Construction License *</Label>
                  <Input
                    id="business-license"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setBusinessLicense(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Valid construction/building license from relevant authority
                  </p>
                  {businessLicense && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Uploaded: {businessLicense.name}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="insurance-certificate">Insurance Certificate (Optional but Recommended)</Label>
                  <Input
                    id="insurance-certificate"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setInsuranceCertificate(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Professional liability or general liability insurance
                  </p>
                  {insuranceCertificate && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Uploaded: {insuranceCertificate.name}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Portfolio Step */}
            {currentStep === 'portfolio' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="completed-projects">Completed Projects *</Label>
                    <Input
                      id="completed-projects"
                      type="number"
                      min="0"
                      placeholder="25"
                      value={completedProjects}
                      onChange={(e) => setCompletedProjects(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ongoing-projects">Ongoing Projects</Label>
                    <Input
                      id="ongoing-projects"
                      type="number"
                      min="0"
                      placeholder="5"
                      value={ongoingProjects}
                      onChange={(e) => setOngoingProjects(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="project-descriptions">Project Descriptions *</Label>
                  <Textarea
                    id="project-descriptions"
                    placeholder="Describe your most notable projects, including project types, sizes, budgets, and outcomes..."
                    rows={5}
                    value={projectDescriptions}
                    onChange={(e) => setProjectDescriptions(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notable-clients">Notable Clients</Label>
                  <Textarea
                    id="notable-clients"
                    placeholder="List any notable clients or organizations you've worked with..."
                    rows={3}
                    value={notableClients}
                    onChange={(e) => setNotableClients(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label>Portfolio Images * (Minimum 5 images)</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload high-quality images of your completed projects
                  </p>
                  
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePortfolioUpload}
                      className="hidden"
                      id="portfolio-upload"
                    />
                    <Label htmlFor="portfolio-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" asChild>
                        <span>Choose Images</span>
                      </Button>
                    </Label>
                  </div>
                </div>
                
                {portfolioImages.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Uploaded Images ({portfolioImages.length})
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      {portfolioImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Portfolio ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removePortfolioImage(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Credentials Step */}
            {currentStep === 'credentials' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Professional Certifications</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableCertifications.map(cert => (
                      <div key={cert} className="flex items-center space-x-2">
                        <Checkbox
                          id={cert}
                          checked={certifications.includes(cert)}
                          onCheckedChange={() => toggleCertification(cert)}
                        />
                        <label htmlFor={cert} className="text-sm cursor-pointer">
                          {cert}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="professional-memberships">Professional Memberships</Label>
                  <Textarea
                    id="professional-memberships"
                    placeholder="List any professional organizations you belong to (NIOB, NSE, ARCON, etc.)"
                    rows={3}
                    value={professionalMemberships}
                    onChange={(e) => setProfessionalMemberships(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label>Certification Documents</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload copies of your certifications and licenses
                  </p>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={handleCertificationUpload}
                  />
                </div>
                
                {certificationDocuments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Uploaded Documents ({certificationDocuments.length})
                    </p>
                    {certificationDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{doc.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCertificationDoc(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="references">Professional References</Label>
                  <Textarea
                    id="references"
                    placeholder="Provide contact information for 2-3 professional references (name, company, phone, email)"
                    rows={4}
                    value={references}
                    onChange={(e) => setReferences(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {/* Complete Step */}
            {currentStep === 'complete' && (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-2xl font-bold mb-2">Application Submitted!</h3>
                <p className="text-muted-foreground mb-6">
                  Thank you for applying to join our builder network. Our verification team will review your application.
                </p>
                <div className="space-y-2 text-sm text-left max-w-md mx-auto bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Verification Process:</h4>
                  <ul className="space-y-1">
                    <li>✓ Document verification (1-2 business days)</li>
                    <li>✓ Background and reference checks (2-3 business days)</li>
                    <li>✓ Portfolio review and quality assessment</li>
                    <li>✓ Final approval decision (within 5 business days)</li>
                  </ul>
                </div>
                <div className="mt-6 space-x-4">
                  <Button onClick={() => setLocation('/builders')}>
                    Browse Builders
                  </Button>
                  <Button variant="outline" onClick={() => setLocation('/dashboard')}>
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          
          {/* Navigation Buttons */}
          {currentStep !== 'complete' && (
            <div className="flex justify-between p-6 border-t">
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                disabled={currentStep === 'company'}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              {currentStep === 'credentials' ? (
                <Button onClick={handleSubmit}>
                  Submit Application
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={goToNextStep}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
