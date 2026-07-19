// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Building2, Calendar as CalendarIcon, Clock, Star, Award, 
  CheckCircle2, MapPin, Phone, Mail, FileText, Shield 
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function PropertyInspectionScheduler() {
  const { id } = useParams<{ id: string }>();
  const propertyId = parseInt(id || '0');
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [selectedInspector, setSelectedInspector] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const { data: property } = trpc.properties.getById.useQuery(
    { id: propertyId },
    { enabled: !!propertyId }
  );

  const { data: inspectors, isLoading } = trpc.inspections.getInspectors.useQuery();

  const bookInspectionMutation = trpc.inspections.book.useMutation({
    onSuccess: () => {
      utils.inspections.getMyInspections.invalidate();
      setIsBookingOpen(false);
      resetForm();
      toast.success("Inspection scheduled successfully! You'll receive a confirmation email.");
    },
    onError: () => {
      toast.error("Failed to schedule inspection");
    },
  });

  const resetForm = () => {
    setSelectedInspector(null);
    setSelectedDate(undefined);
    setSelectedTime("");
    setNotes("");
  };

  const handleBookInspection = async () => {
    if (!selectedInspector || !selectedDate || !selectedTime) {
      toast.error("Please select an inspector, date, and time");
      return;
    }

    try {
      await bookInspectionMutation.mutateAsync({
        propertyId,
        inspectorId: selectedInspector.id,
        date: selectedDate.toISOString(),
        time: selectedTime,
        notes,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const availableTimeSlots = [
    "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
    "04:00 PM", "05:00 PM"
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please sign in to schedule a property inspection
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>{APP_TITLE}</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href={`/property/${propertyId}`}>
              <Button variant="ghost">Back to Property</Button>
            </Link>
            <span className="text-sm text-muted-foreground">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Schedule Property Inspection</h1>
          <p className="text-muted-foreground">
            {property?.address || 'Loading property...'}
          </p>
        </div>

        {/* Inspector Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Choose a Certified Inspector</h2>
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-20 bg-muted rounded mb-4"></div>
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inspectors?.map((inspector: any) => (
                <Card
                  key={inspector.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedInspector?.id === inspector.id ? 'border-2 border-primary' : ''
                  }`}
                  onClick={() => setSelectedInspector(inspector)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={inspector.avatar} />
                        <AvatarFallback>{inspector.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{inspector.name}</h3>
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{inspector.rating}</span>
                          <span className="text-sm text-muted-foreground">
                            ({inspector.reviewCount} reviews)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Award className="w-4 h-4 text-primary" />
                        <span>{inspector.yearsExperience} years experience</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="w-4 h-4 text-primary" />
                        <span>{inspector.certifications.join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>{inspector.inspectionsCompleted}+ inspections</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <span className="text-2xl font-bold text-primary">
                        ${inspector.price}
                      </span>
                      <Badge variant={inspector.available ? 'default' : 'secondary'}>
                        {inspector.available ? 'Available' : 'Busy'}
                      </Badge>
                    </div>

                    {inspector.specialties && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {inspector.specialties.map((specialty: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Booking Section */}
        {selectedInspector && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle>Schedule Inspection with {selectedInspector.name}</CardTitle>
              <CardDescription>
                Select a date and time for your property inspection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="calendar" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="calendar">Select Date</TabsTrigger>
                  <TabsTrigger value="time" disabled={!selectedDate}>Select Time</TabsTrigger>
                  <TabsTrigger value="details" disabled={!selectedTime}>Additional Details</TabsTrigger>
                </TabsList>

                <TabsContent value="calendar">
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date() || date.getDay() === 0}
                      className="rounded-md border"
                    />
                  </div>
                  {selectedDate && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-muted-foreground mb-2">Selected Date:</p>
                      <p className="font-semibold">
                        {selectedDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="time">
                  <div>
                    <h3 className="font-semibold mb-4">Available Time Slots</h3>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                      {availableTimeSlots.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? 'default' : 'outline'}
                          onClick={() => setSelectedTime(time)}
                          className="w-full"
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          {time}
                        </Button>
                      ))}
                    </div>
                    {selectedTime && (
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-medium mb-1">Selected Time:</p>
                        <p className="font-semibold">{selectedTime}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="details">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Additional Notes (Optional)</h3>
                      <Textarea
                        placeholder="Any specific areas of concern or special requests..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <h3 className="font-semibold mb-3">Booking Summary</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Inspector:</span>
                        <span className="font-medium">{selectedInspector.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Date:</span>
                        <span className="font-medium">
                          {selectedDate?.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Time:</span>
                        <span className="font-medium">{selectedTime}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Total Cost:</span>
                        <span className="text-xl font-bold text-primary">
                          ${selectedInspector.price}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={handleBookInspection}
                      disabled={bookInspectionMutation.isPending}
                      className="w-full"
                      size="lg"
                    >
                      {bookInspectionMutation.isPending ? "Scheduling..." : "Confirm Booking"}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      You'll receive a confirmation email with inspection details and a reminder 24 hours before the appointment.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Inspector Details Modal */}
        {selectedInspector && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>About {selectedInspector.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Contact Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedInspector.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedInspector.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedInspector.serviceArea}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Certifications</h3>
                    <div className="space-y-2">
                      {selectedInspector.certifications.map((cert: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-primary" />
                          <span className="text-sm">{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Bio</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedInspector.bio}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
