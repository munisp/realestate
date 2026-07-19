import { BookingRepository } from '../repositories/booking.repository';
import { CalendarRepository } from '../repositories/calendar.repository';
import { Booking } from '../models';
import { DynamicPricingEngine } from '../utils/pricing';
import { publishEvent } from '../config/kafka';
import logger from '../utils/logger';

export class BookingService {
  private bookingRepo: BookingRepository;
  private calendarRepo: CalendarRepository;
  private pricingEngine: DynamicPricingEngine;

  constructor() {
    this.bookingRepo = new BookingRepository();
    this.calendarRepo = new CalendarRepository();
    this.pricingEngine = new DynamicPricingEngine();
  }

  async createBooking(data: {
    propertyId: string;
    guestId: string;
    hostId: string;
    checkInDate: Date;
    checkOutDate: Date;
    numberOfGuests: number;
    basePrice: number;
    cleaningFee: number;
    specialRequests?: string;
  }): Promise<Booking> {
    // Check for overlapping bookings
    const overlapping = await this.bookingRepo.findOverlapping(
      data.propertyId,
      data.checkInDate,
      data.checkOutDate
    );

    if (overlapping.length > 0) {
      throw new Error('Property not available for selected dates');
    }

    // Calculate pricing
    const breakdown = this.pricingEngine.calculatePrice(
      data.basePrice,
      data.cleaningFee,
      data.checkInDate,
      data.checkOutDate,
      data.numberOfGuests
    );

    // Create booking
    const booking = await this.bookingRepo.create({
      propertyId: data.propertyId,
      guestId: data.guestId,
      hostId: data.hostId,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      numberOfGuests: data.numberOfGuests,
      totalPrice: breakdown.total,
      breakdown,
      status: 'pending',
      paymentStatus: 'pending',
      specialRequests: data.specialRequests,
      source: 'direct',
    });

    // Mark calendar as booked
    await this.calendarRepo.markAsBooked(
      data.propertyId,
      booking.id,
      data.checkInDate,
      data.checkOutDate,
      breakdown.nightlyRate
    );

    // Publish event
    await publishEvent('booking.created', {
      bookingId: booking.id,
      propertyId: data.propertyId,
      guestId: data.guestId,
      hostId: data.hostId,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      totalPrice: breakdown.total,
    });

    logger.info('Booking created', { bookingId: booking.id });
    return booking;
  }

  async confirmBooking(bookingId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.paymentStatus !== 'paid') {
      throw new Error('Payment required to confirm booking');
    }

    const updated = await this.bookingRepo.update(bookingId, {
      status: 'confirmed',
    });

    await publishEvent('booking.confirmed', {
      bookingId,
      propertyId: booking.propertyId,
      guestId: booking.guestId,
      hostId: booking.hostId,
    });

    logger.info('Booking confirmed', { bookingId });
    return updated!;
  }

  async cancelBooking(bookingId: string, reason: string): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Release calendar
    await this.calendarRepo.releaseBooking(bookingId);

    // Update booking
    const updated = await this.bookingRepo.update(bookingId, {
      status: 'cancelled',
      cancellationReason: reason,
    });

    await publishEvent('booking.cancelled', {
      bookingId,
      propertyId: booking.propertyId,
      guestId: booking.guestId,
      hostId: booking.hostId,
      reason,
    });

    logger.info('Booking cancelled', { bookingId, reason });
    return updated!;
  }

  async checkIn(bookingId: string): Promise<Booking> {
    const updated = await this.bookingRepo.update(bookingId, {
      status: 'checked_in',
    });

    await publishEvent('booking.checked_in', { bookingId });
    logger.info('Guest checked in', { bookingId });
    return updated!;
  }

  async checkOut(bookingId: string): Promise<Booking> {
    const updated = await this.bookingRepo.update(bookingId, {
      status: 'checked_out',
    });

    await publishEvent('booking.checked_out', { bookingId });
    logger.info('Guest checked out', { bookingId });
    return updated!;
  }

  async getBooking(bookingId: string): Promise<Booking | null> {
    return await this.bookingRepo.findById(bookingId);
  }

  async getGuestBookings(guestId: string): Promise<Booking[]> {
    return await this.bookingRepo.findByGuestId(guestId);
  }

  async getHostBookings(hostId: string): Promise<Booking[]> {
    return await this.bookingRepo.findByHostId(hostId);
  }
}
