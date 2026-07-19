import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  Home,
  Heart,
  X as XIcon,
  MapPin,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

/**
 * Buyer Profile Onboarding Wizard
 * 
 * Guided onboarding flow to capture buyer preferences and immediately
 * show personalized property recommendations
 */

type OnboardingStep = 'budget' | 'must-haves' | 'deal-breakers' | 'lifestyle' | 'recommendations';

const steps: { id: OnboardingStep; title: string; icon: any }[] = [
  { id: 'budget', title: 'Budget & Financing', icon: DollarSign },
  { id: 'must-haves', title: 'Must-Have Features', icon: Home },
  { id: 'deal-breakers', title: 'Deal-Breakers', icon: XIcon },
  { id: 'lifestyle', title: 'Lifestyle & Commute', icon: Briefcase },
  { id: 'recommendations', title: 'Your Recommendations', icon: Sparkles },
];

export default function BuyerOnboarding() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('budget');
  
  // Budget data
  const [minBudget, setMinBudget] = useState(50000000);
  const [maxBudget, setMaxBudget] = useState(200000000);
  const [financingType, setFinancingType] = useState('');
  const [downPayment, setDownPayment] = useState(20);
  
  // Must-haves
  const [propertyType, setPropertyType] = useState('');
  const [minBedrooms, setMinBedrooms] = useState('2');
  const [minBathrooms, setMinBathrooms] = useState('2');
  const [mustHaveFeatures, setMustHaveFeatures] = useState<string[]>([]);
  
  // Deal-breakers
  const [dealBreakers, setDealBreakers] = useState<string[]>([]);
  const [maxAge, setMaxAge] = useState('');
  
  // Lifestyle
  const [preferredNeighborhoods, setPreferredNeighborhoods] = useState<string[]>([]);
  const [workLocation, setWorkLocation] = useState('');
  const [maxCommute, setMaxCommute] = useState('30');
  const [lifestylePreferences, setLifestylePreferences] = useState<string[]>([]);
  
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
  
  const toggleFeature = (feature: string, list: string[], setList: (list: string[]) => void) => {
    setList(list.includes(feature) ? list.filter(f => f !== feature) : [...list, feature]);
  };
  
  const handleComplete = () => {
    toast.success('Profile saved! Generating your personalized recommendations...');
    setTimeout(() => {
      setCurrentStep('recommendations');
    }, 1000);
  };
  
  const handleSkip = () => {
    setLocation('/search');
  };
  
  const availableFeatures = [
    'Parking', 'Pool', 'Gym', 'Security', 'Generator', 'Air Conditioning',
    'Garden', 'Balcony', 'Elevator', 'Smart Home', 'Furnished', 'Pet-Friendly',
  ];
  
  const dealBreakerOptions = [
    'No Parking', 'Ground Floor', 'Top Floor', 'Near Highway',
    'No Natural Light', 'Shared Walls', 'No Outdoor Space', 'Far from Transit',
  ];
  
  const neighborhoods = [
    'Victoria Island', 'Ikoyi', 'Lekki Phase 1', 'Lekki Phase 2',
    'Banana Island', 'Parkview Estate', 'Oniru', 'Ajah',
  ];
  
  const lifestyleOptions = [
    'Family-Friendly', 'Nightlife', 'Quiet & Peaceful', 'Walkable',
    'Near Schools', 'Near Shopping', 'Near Parks', 'Near Restaurants',
  ];
  
  const formatCurrency = (amount: number) => {
    return `₦${(amount / 1000000).toFixed(0)}M`;
  };
  
  // Mock recommendations
  const recommendations = [
    {
      id: 1,
      title: 'Luxury 3BR Apartment in Lekki',
      price: 145000000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 2100,
      neighborhood: 'Lekki Phase 1',
      matchScore: 95,
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
    },
    {
      id: 2,
      title: 'Modern 2BR Condo in Victoria Island',
      price: 128000000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1650,
      neighborhood: 'Victoria Island',
      matchScore: 92,
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      id: 3,
      title: 'Spacious 4BR House in Ikoyi',
      price: 195000000,
      bedrooms: 4,
      bathrooms: 3,
      sqft: 3200,
      neighborhood: 'Ikoyi',
      matchScore: 88,
      image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400',
    },
  ];
  
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Find Your Perfect Home</h1>
          <p className="text-muted-foreground">
            Tell us what you're looking for and we'll show you the best matches
          </p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={handleSkip}>
            Skip for now
          </Button>
        </div>
        
        {/* Progress Bar */}
        {currentStep !== 'recommendations' && (
          <div className="mb-8">
            <div className="flex justify-between mb-4">
              {steps.slice(0, -1).map((step, index) => {
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
        )}
        
        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps.find(s => s.id === currentStep)?.title}</CardTitle>
            {currentStep !== 'recommendations' && (
              <CardDescription>
                Step {getCurrentStepIndex() + 1} of {steps.length - 1}
              </CardDescription>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Budget Step */}
            {currentStep === 'budget' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Budget Range</Label>
                  <div className="px-2">
                    <Slider
                      min={10000000}
                      max={500000000}
                      step={5000000}
                      value={[minBudget, maxBudget]}
                      onValueChange={([min, max]) => {
                        setMinBudget(min);
                        setMaxBudget(max);
                      }}
                      className="mb-4"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{formatCurrency(minBudget)}</span>
                    <span className="text-muted-foreground">to</span>
                    <span className="font-medium">{formatCurrency(maxBudget)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="financing-type">Financing Type</Label>
                  <Select value={financingType} onValueChange={setFinancingType}>
                    <SelectTrigger id="financing-type">
                      <SelectValue placeholder="Select financing type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash Purchase</SelectItem>
                      <SelectItem value="mortgage">Mortgage</SelectItem>
                      <SelectItem value="installment">Installment Plan</SelectItem>
                      <SelectItem value="undecided">Not Sure Yet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {financingType === 'mortgage' && (
                  <div className="space-y-2">
                    <Label>Down Payment: {downPayment}%</Label>
                    <Slider
                      min={10}
                      max={50}
                      step={5}
                      value={[downPayment]}
                      onValueChange={([value]) => setDownPayment(value)}
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatCurrency((minBudget * downPayment) / 100)}</span>
                      <span>to</span>
                      <span>{formatCurrency((maxBudget * downPayment) / 100)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Must-Haves Step */}
            {currentStep === 'must-haves' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="property-type">Property Type</Label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger id="property-type">
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="any">Any Type</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-bedrooms">Minimum Bedrooms</Label>
                    <Select value={minBedrooms} onValueChange={setMinBedrooms}>
                      <SelectTrigger id="min-bedrooms">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}+ bedrooms
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="min-bathrooms">Minimum Bathrooms</Label>
                    <Select value={minBathrooms} onValueChange={setMinBathrooms}>
                      <SelectTrigger id="min-bathrooms">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}+ bathrooms
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Must-Have Features</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableFeatures.map(feature => (
                      <div key={feature} className="flex items-center space-x-2">
                        <Checkbox
                          id={feature}
                          checked={mustHaveFeatures.includes(feature)}
                          onCheckedChange={() =>
                            toggleFeature(feature, mustHaveFeatures, setMustHaveFeatures)
                          }
                        />
                        <label htmlFor={feature} className="text-sm cursor-pointer">
                          {feature}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Deal-Breakers Step */}
            {currentStep === 'deal-breakers' && (
              <div className="space-y-6">
                <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                  <p className="text-sm">
                    Help us filter out properties that won't work for you. Select any conditions that would make a property unsuitable.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Deal-Breakers</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {dealBreakerOptions.map(option => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={option}
                          checked={dealBreakers.includes(option)}
                          onCheckedChange={() =>
                            toggleFeature(option, dealBreakers, setDealBreakers)
                          }
                        />
                        <label htmlFor={option} className="text-sm cursor-pointer">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max-age">Maximum Property Age (years)</Label>
                  <Input
                    id="max-age"
                    type="number"
                    placeholder="e.g., 10 (leave empty for any age)"
                    value={maxAge}
                    onChange={(e) => setMaxAge(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {/* Lifestyle Step */}
            {currentStep === 'lifestyle' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Preferred Neighborhoods</Label>
                  <div className="flex flex-wrap gap-2">
                    {neighborhoods.map(neighborhood => (
                      <Badge
                        key={neighborhood}
                        variant={preferredNeighborhoods.includes(neighborhood) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() =>
                          toggleFeature(neighborhood, preferredNeighborhoods, setPreferredNeighborhoods)
                        }
                      >
                        {neighborhood}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="work-location">Work Location (Optional)</Label>
                  <Input
                    id="work-location"
                    placeholder="e.g., Victoria Island, Ikoyi"
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                  />
                </div>
                
                {workLocation && (
                  <div className="space-y-2">
                    <Label>Maximum Commute Time: {maxCommute} minutes</Label>
                    <Slider
                      min={15}
                      max={90}
                      step={5}
                      value={[parseInt(maxCommute)]}
                      onValueChange={([value]) => setMaxCommute(value.toString())}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Lifestyle Preferences</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {lifestyleOptions.map(option => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={option}
                          checked={lifestylePreferences.includes(option)}
                          onCheckedChange={() =>
                            toggleFeature(option, lifestylePreferences, setLifestylePreferences)
                          }
                        />
                        <label htmlFor={option} className="text-sm cursor-pointer">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Recommendations Step */}
            {currentStep === 'recommendations' && (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-2xl font-bold mb-2">Your Personalized Recommendations</h3>
                  <p className="text-muted-foreground">
                    Based on your preferences, we found {recommendations.length} properties that match your criteria
                  </p>
                </div>
                
                <div className="space-y-4">
                  {recommendations.map(property => (
                    <Card key={property.id} className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <img
                            src={property.image}
                            alt={property.title}
                            className="w-32 h-32 object-cover rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold">{property.title}</h4>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {property.neighborhood}
                                </p>
                              </div>
                              <Badge variant="default" className="ml-2">
                                {property.matchScore}% Match
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                              <span>{property.bedrooms} bed</span>
                              <span>{property.bathrooms} bath</span>
                              <span>{property.sqft.toLocaleString()} sqft</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-primary">
                                {formatCurrency(property.price)}
                              </span>
                              <Button size="sm" onClick={() => setLocation(`/property/${property.id}`)}>
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="flex justify-center gap-4 pt-4">
                  <Button variant="outline" onClick={() => setLocation('/search')}>
                    Browse All Properties
                  </Button>
                  <Button onClick={() => setLocation('/my-recommendations')}>
                    <Heart className="w-4 h-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          
          {/* Navigation Buttons */}
          {currentStep !== 'recommendations' && (
            <div className="flex justify-between p-6 border-t">
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                disabled={currentStep === 'budget'}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              {currentStep === 'lifestyle' ? (
                <Button onClick={handleComplete}>
                  Show Recommendations
                  <Sparkles className="w-4 h-4 ml-2" />
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
