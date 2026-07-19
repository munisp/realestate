import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Calendar, Clock, MapPin, Video, User, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';

export default function TourScheduler() {
  const params = useParams<{ propertyId: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  
  const propertyId = parseInt(params.propertyId || '0');
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [tourType, setTourType] = useState<'in_person' | 'virtual'>('in_person');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch property details
  const { data: property, isLoading: propertyLoading } = trpc.properties.getById.useQuery(
    { id: propertyId },
    { enabled: propertyId > 0 }
  );

  // Fetch available slots
  const { data: slotsData, isLoading: slotsLoading } = trpc.tours.getAvailableSlots.useQuery(
    {
      propertyId,
      date: selectedDate,
    },
    { enabled: !!selectedDate && propertyId > 0 }
  );

  const bookTourMutation = trpc.tours.bookTour.useMutation();

  // Generate next 14 days for date selection
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1); // Start from tomorrow
    return date.toISOString().split('T')[0];
  });

  // Set default date to tomorrow
  useEffect(() => {
    if (!selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[0]);
    }
  }, []);

  const handleBookTour = async () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    if (!selectedTime) {
      toast.error('Please select a time slot');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await bookTourMutation.mutateAsync({
        propertyId,
        appointmentDate: selectedTime,
        duration: 60,
        tourType,
        notes: notes || undefined,
      });

      toast.success('Tour booked successfully!');
      
      // Navigate to dashboard or tours page
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error booking tour:', error);
      toast.error(error.message || 'Failed to book tour');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (propertyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading property...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Property Not Found</CardTitle>
            <CardDescription>The property you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/properties')} className="w-full">
              Browse Properties
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Property Info Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {property.primaryImage && (
                  <img
                    src={property.primaryImage}
                    alt={property.addressLine1}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                <div>
                  <h3 className="font-semibold">{property.addressLine1}</h3>
                  <p className="text-sm text-muted-foreground">
                    {property.city}, {property.state}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                  ${property.price?.toLocaleString()}
                </div>
                <div className="flex gap-4 text-sm">
                  <span>{property.bedrooms} bed</span>
                  <span>{property.bathrooms} bath</span>
                  <span>{property.squareFeet} sqft</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scheduler */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Schedule a Tour</h1>
              <p className="text-muted-foreground mt-2">
                Choose your preferred date, time, and tour type
              </p>
            </div>

            {/* Tour Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Tour Type
                </CardTitle>
                <CardDescription>
                  Choose between in-person or virtual tour
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={tourType} onValueChange={(v) => setTourType(v as any)}>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="in_person" id="in_person" />
                    <Label htmlFor="in_person" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium">In-Person Tour</div>
                          <div className="text-sm text-muted-foreground">
                            Visit the property with an agent
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent mt-2">
                    <RadioGroupItem value="virtual" id="virtual" />
                    <Label htmlFor="virtual" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Video className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium">Virtual Tour</div>
                          <div className="text-sm text-muted-foreground">
                            Video call with an agent
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Date Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Select Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {availableDates.map((date) => (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`p-3 text-center border rounded-lg transition-colors ${
                        selectedDate === date
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <div className="text-xs font-medium">
                        {formatDate(date).split(',')[0]}
                      </div>
                      <div className="text-sm font-semibold mt-1">
                        {new Date(date).getDate()}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Time Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Select Time
                </CardTitle>
                <CardDescription>
                  {selectedDate && `Available times for ${formatDate(selectedDate)}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {slotsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading available times...</p>
                  </div>
                ) : slotsData && slotsData.slots.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slotsData.slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className={`p-3 text-center border rounded-lg transition-colors ${
                          selectedTime === slot
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'hover:bg-accent'
                        }`}
                      >
                        <div className="text-sm font-medium">{formatTime(slot)}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No available time slots for this date. Please select another date.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Notes (Optional)</CardTitle>
                <CardDescription>
                  Any specific requirements or questions for the agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="E.g., I'm interested in the backyard, parking situation, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Booking Summary */}
            {selectedTime && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="text-lg">Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{formatDate(selectedDate)}</div>
                      <div className="text-sm text-muted-foreground">Date</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{formatTime(selectedTime)}</div>
                      <div className="text-sm text-muted-foreground">Time (60 minutes)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {tourType === 'in_person' ? (
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Video className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="font-medium">
                        {tourType === 'in_person' ? 'In-Person Tour' : 'Virtual Tour'}
                      </div>
                      <div className="text-sm text-muted-foreground">Tour type</div>
                    </div>
                  </div>
                  <Button
                    onClick={handleBookTour}
                    disabled={isSubmitting}
                    className="w-full mt-4"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Booking...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Confirm Booking
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
