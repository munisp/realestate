import { useState } from 'react';
import { PaymentCheckout } from './PaymentCheckout';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Badge } from './ui/badge';
import { CalendarIcon, Users, DollarSign, Loader2, Check } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: {
    id: number;
    title: string;
    pricePerNight: number;
    cleaningFee?: number;
    instantBooking?: boolean;
    maxGuests?: number;
  };
}

export default function BookingModal({ isOpen, onClose, property }: BookingModalProps) {
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const instantBookMutation = trpc.booking.instantBook.useMutation({
    onSuccess: (data) => {
      // Show payment screen instead of closing
      if (data.booking?.id) {
        setBookingId(data.booking.id);
        setShowPayment(true);
      } else {
        toast.success(data.message);
        onClose();
        resetForm();
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const requestBookMutation = trpc.booking.requestToBook.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const nightlyTotal = nights * property.pricePerNight;
  const cleaningFee = property.cleaningFee || 0;
  const serviceFee = Math.round(nightlyTotal * 0.1); // 10% service fee
  const totalAmount = nightlyTotal + cleaningFee + serviceFee;

  const handleInstantBook = () => {
    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    instantBookMutation.mutate({
      propertyId: property.id,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      numberOfGuests: guests,
      specialRequests: specialRequests || undefined,
    });
  };

  const handleRequestToBook = () => {
    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    if (!message.trim()) {
      toast.error('Please add a message to your booking request');
      return;
    }

    requestBookMutation.mutate({
      propertyId: property.id,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      numberOfGuests: guests,
      message,
      specialRequests: specialRequests || undefined,
    });
  };

  const resetForm = () => {
    setCheckIn(undefined);
    setCheckOut(undefined);
    setGuests(1);
    setMessage('');
    setSpecialRequests('');
    setShowPayment(false);
    setBookingId(null);
  };

  const handlePaymentSuccess = () => {
    toast.success('Payment successful! Your booking is confirmed.');
    onClose();
    resetForm();
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setBookingId(null);
  };

  const isLoading = instantBookMutation.isPending || requestBookMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {showPayment && bookingId ? (
          <PaymentCheckout
            bookingId={bookingId}
            amount={totalAmount}
            currency="ngn"
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        ) : (
        <>
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {property.instantBooking ? 'Book' : 'Request to Book'} {property.title}
          </DialogTitle>
          <DialogDescription>
            {property.instantBooking 
              ? 'Complete your booking instantly - no waiting for approval!' 
              : 'Send a booking request to the host. They will respond within 24 hours.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Instant Booking Badge */}
          {property.instantBooking && (
            <Badge variant="default" className="bg-green-500">
              <Check className="h-3 w-3 mr-1" />
              Instant Booking Available
            </Badge>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Check-in</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkIn ? format(checkIn, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={setCheckIn}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Check-out</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOut ? format(checkOut, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    onSelect={setCheckOut}
                    disabled={(date) => !checkIn || date <= checkIn}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Guests */}
          <div>
            <label className="text-sm font-medium mb-2 block">Number of Guests</label>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                min={1}
                max={property.maxGuests || 20}
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                className="flex-1"
              />
            </div>
            {property.maxGuests && (
              <p className="text-xs text-muted-foreground mt-1">
                Maximum {property.maxGuests} guests
              </p>
            )}
          </div>

          {/* Message (for Request to Book) */}
          {!property.instantBooking && (
            <div>
              <label className="text-sm font-medium mb-2 block">Message to Host *</label>
              <Textarea
                placeholder="Tell the host about your trip and why you'd like to stay..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
              />
            </div>
          )}

          {/* Special Requests */}
          <div>
            <label className="text-sm font-medium mb-2 block">Special Requests (Optional)</label>
            <Textarea
              placeholder="Early check-in, late check-out, etc."
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={2}
            />
          </div>

          {/* Price Breakdown */}
          {checkIn && checkOut && nights > 0 && (
            <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Price Breakdown</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>₦{property.pricePerNight.toLocaleString()} × {nights} {nights === 1 ? 'night' : 'nights'}</span>
                  <span>₦{nightlyTotal.toLocaleString()}</span>
                </div>
                {cleaningFee > 0 && (
                  <div className="flex justify-between">
                    <span>Cleaning fee</span>
                    <span>₦{cleaningFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Service fee</span>
                  <span>₦{serviceFee.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>₦{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          {property.instantBooking ? (
            <Button onClick={handleInstantBook} disabled={isLoading || !checkIn || !checkOut}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Booking'
              )}
            </Button>
          ) : (
            <Button onClick={handleRequestToBook} disabled={isLoading || !checkIn || !checkOut || !message.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Request'
              )}
            </Button>
          )}
        </DialogFooter>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
