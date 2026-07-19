import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Home,
  User,
  DollarSign,
  Calendar,
  Camera,
  FileText,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

/**
 * Shortlet Host Onboarding Wizard
 * 
 * Multi-step guided onboarding flow for new shortlet hosts
 * Includes profile setup, property details, pricing, photos, verification, and payout setup
 */

type OnboardingStep = 'profile' | 'property' | 'pricing' | 'photos' | 'verification' | 'payout' | 'complete';

const steps: { id: OnboardingStep; title: string; icon: any }[] = [
  { id: 'profile', title: 'Host Profile', icon: User },
  { id: 'property', title: 'Property Details', icon: Home },
  { id: 'pricing', title: 'Pricing & Availability', icon: DollarSign },
  { id: 'photos', title: 'Photos', icon: Camera },
  { id: 'verification', title: 'Verification', icon: FileText },
  { id: 'payout', title: 'Payout Setup', icon: CreditCard },
  { id: 'complete', title: 'Complete', icon: CheckCircle2 },
];

export default function ShortletHostOnboarding() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile');
  
  // Profile data
  const [hostName, setHostName] = useState('');
  const [hostBio, setHostBio] = useState('');
  const [hostPhone, setHostPhone] = useState('');
  const [hostLanguages, setHostLanguages] = useState<string[]>([]);
  
  // Property data
  const [propertyTitle, setPropertyTitle] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [maxGuests, setMaxGuests] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [houseRules, setHouseRules] = useState('');
  
  // Pricing data
  const [pricePerNight, setPricePerNight] = useState('');
  const [cleaningFee, setCleaningFee] = useState('');
  const [minNights, setMinNights] = useState('1');
  const [maxNights, setMaxNights] = useState('');
  
  // Photos
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  
  // Verification
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [proofOfOwnership, setProofOfOwnership] = useState<File | null>(null);
  
  // Payout
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  
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
  
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setUploadedPhotos(prev => [...prev, ...newFiles]);
    }
  };
  
  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };
  
  const toggleAmenity = (amenity: string) => {
    setAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };
  
  const handleSubmit = () => {
    // TODO: Submit to backend
    toast.success('Application submitted! We\'ll review your listing within 24-48 hours.');
    setCurrentStep('complete');
  };
  
  const availableAmenities = [
    'WiFi', 'Air Conditioning', 'Kitchen', 'Washer', 'Dryer', 'TV',
    'Parking', 'Pool', 'Gym', 'Security', 'Generator', 'Hot Water',
  ];
  
  const languages = ['English', 'Yoruba', 'Igbo', 'Hausa', 'French'];
  
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Become a Shortlet Host</h1>
          <p className="text-muted-foreground">
            Complete your profile to start hosting and earning
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
            {/* Profile Step */}
            {currentStep === 'profile' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="host-name">Full Name *</Label>
                  <Input
                    id="host-name"
                    placeholder="John Doe"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="host-bio">About You *</Label>
                  <Textarea
                    id="host-bio"
                    placeholder="Tell guests about yourself, your hosting experience, and what makes your place special..."
                    rows={4}
                    value={hostBio}
                    onChange={(e) => setHostBio(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {hostBio.length}/500 characters
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="host-phone">Phone Number *</Label>
                  <Input
                    id="host-phone"
                    type="tel"
                    placeholder="+234 XXX XXX XXXX"
                    value={hostPhone}
                    onChange={(e) => setHostPhone(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Languages Spoken</Label>
                  <div className="flex flex-wrap gap-2">
                    {languages.map(lang => (
                      <Badge
                        key={lang}
                        variant={hostLanguages.includes(lang) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          setHostLanguages(prev =>
                            prev.includes(lang)
                              ? prev.filter(l => l !== lang)
                              : [...prev, lang]
                          );
                        }}
                      >
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Property Step */}
            {currentStep === 'property' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="property-title">Property Title *</Label>
                  <Input
                    id="property-title"
                    placeholder="Cozy 2BR Apartment in Lekki"
                    value={propertyTitle}
                    onChange={(e) => setPropertyTitle(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="property-type">Property Type *</Label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger id="property-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="house">Entire House</SelectItem>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="property-address">Full Address *</Label>
                  <Textarea
                    id="property-address"
                    placeholder="Street address, city, state"
                    rows={2}
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Bedrooms *</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      min="0"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Bathrooms *</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      min="0"
                      step="0.5"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max-guests">Max Guests *</Label>
                    <Input
                      id="max-guests"
                      type="number"
                      min="1"
                      value={maxGuests}
                      onChange={(e) => setMaxGuests(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Amenities</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableAmenities.map(amenity => (
                      <div key={amenity} className="flex items-center space-x-2">
                        <Checkbox
                          id={amenity}
                          checked={amenities.includes(amenity)}
                          onCheckedChange={() => toggleAmenity(amenity)}
                        />
                        <label
                          htmlFor={amenity}
                          className="text-sm cursor-pointer"
                        >
                          {amenity}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="house-rules">House Rules</Label>
                  <Textarea
                    id="house-rules"
                    placeholder="No smoking, No pets, Check-in after 2 PM, etc."
                    rows={3}
                    value={houseRules}
                    onChange={(e) => setHouseRules(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {/* Pricing Step */}
            {currentStep === 'pricing' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price-per-night">Price Per Night (₦) *</Label>
                  <Input
                    id="price-per-night"
                    type="number"
                    min="0"
                    placeholder="25000"
                    value={pricePerNight}
                    onChange={(e) => setPricePerNight(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Set a competitive price based on your location and amenities
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cleaning-fee">Cleaning Fee (₦)</Label>
                  <Input
                    id="cleaning-fee"
                    type="number"
                    min="0"
                    placeholder="5000"
                    value={cleaningFee}
                    onChange={(e) => setCleaningFee(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-nights">Minimum Nights *</Label>
                    <Input
                      id="min-nights"
                      type="number"
                      min="1"
                      value={minNights}
                      onChange={(e) => setMinNights(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max-nights">Maximum Nights</Label>
                    <Input
                      id="max-nights"
                      type="number"
                      min="1"
                      placeholder="Optional"
                      value={maxNights}
                      onChange={(e) => setMaxNights(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Pricing Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Base price per night:</span>
                      <span className="font-medium">₦{pricePerNight || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cleaning fee:</span>
                      <span className="font-medium">₦{cleaningFee || '0'}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Platform fee (15%):</span>
                      <span>-₦{pricePerNight ? (parseFloat(pricePerNight) * 0.15).toFixed(0) : '0'}</span>
                    </div>
                    <div className="border-t pt-1 mt-1 flex justify-between font-semibold">
                      <span>You earn per night:</span>
                      <span className="text-primary">
                        ₦{pricePerNight ? (parseFloat(pricePerNight) * 0.85).toFixed(0) : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Photos Step */}
            {currentStep === 'photos' && (
              <div className="space-y-4">
                <div>
                  <Label>Property Photos * (Minimum 5 photos)</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload high-quality photos of your property. First photo will be the cover image.
                  </p>
                  
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="photo-upload"
                    />
                    <Label htmlFor="photo-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" asChild>
                        <span>Choose Photos</span>
                      </Button>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-2">
                      or drag and drop images here
                    </p>
                  </div>
                </div>
                
                {uploadedPhotos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Uploaded Photos ({uploadedPhotos.length})
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      {uploadedPhotos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          {index === 0 && (
                            <Badge className="absolute top-2 left-2">Cover</Badge>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removePhoto(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Verification Step */}
            {currentStep === 'verification' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-4">
                  <p className="text-sm">
                    To ensure safety and trust, we require all hosts to verify their identity and property ownership.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="id-document">Government-Issued ID *</Label>
                  <Input
                    id="id-document"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setIdDocument(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    National ID, Driver's License, or International Passport
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="proof-of-ownership">Proof of Property Ownership *</Label>
                  <Input
                    id="proof-of-ownership"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setProofOfOwnership(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Certificate of Occupancy, Deed of Assignment, or Tenancy Agreement
                  </p>
                </div>
                
                {idDocument && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    ID document uploaded: {idDocument.name}
                  </div>
                )}
                
                {proofOfOwnership && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Proof of ownership uploaded: {proofOfOwnership.name}
                  </div>
                )}
              </div>
            )}
            
            {/* Payout Step */}
            {currentStep === 'payout' && (
              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg mb-4">
                  <p className="text-sm">
                    Set up your bank account to receive payouts. Funds are transferred within 24 hours after guest check-in.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bank-name">Bank Name *</Label>
                  <Select value={bankName} onValueChange={setBankName}>
                    <SelectTrigger id="bank-name">
                      <SelectValue placeholder="Select your bank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gtbank">GTBank</SelectItem>
                      <SelectItem value="access">Access Bank</SelectItem>
                      <SelectItem value="zenith">Zenith Bank</SelectItem>
                      <SelectItem value="firstbank">First Bank</SelectItem>
                      <SelectItem value="uba">UBA</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="account-number">Account Number *</Label>
                  <Input
                    id="account-number"
                    placeholder="0123456789"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="account-name">Account Name *</Label>
                  <Input
                    id="account-name"
                    placeholder="As shown on your bank account"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must match the name on your ID document
                  </p>
                </div>
              </div>
            )}
            
            {/* Complete Step */}
            {currentStep === 'complete' && (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-2xl font-bold mb-2">Application Submitted!</h3>
                <p className="text-muted-foreground mb-6">
                  We're reviewing your listing. You'll receive an email within 24-48 hours.
                </p>
                <div className="space-y-2 text-sm text-left max-w-md mx-auto bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">What happens next?</h4>
                  <ul className="space-y-1">
                    <li>✓ Our team will verify your documents</li>
                    <li>✓ We'll review your property details and photos</li>
                    <li>✓ You'll receive approval or feedback for improvements</li>
                    <li>✓ Once approved, your listing goes live!</li>
                  </ul>
                </div>
                <Button
                  className="mt-6"
                  onClick={() => setLocation('/short-lets')}
                >
                  Browse Other Listings
                </Button>
              </div>
            )}
          </CardContent>
          
          {/* Navigation Buttons */}
          {currentStep !== 'complete' && (
            <div className="flex justify-between p-6 border-t">
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                disabled={currentStep === 'profile'}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              {currentStep === 'payout' ? (
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
