import axios from 'axios';
import { CalendarService } from './calendar.service';
import { BookingService } from './booking.service';
import logger from '../utils/logger';

export interface AirbnbListing {
  id: string;
  name: string;
  icalUrl: string;
}

export class ChannelManagerService {
  private calendarService: CalendarService;
  private bookingService: BookingService;

  constructor() {
    this.calendarService = new CalendarService();
    this.bookingService = new BookingService();
  }

  async syncAirbnbCalendar(propertyId: string, icalUrl: string): Promise<void> {
    try {
      // Fetch iCal feed from Airbnb
      const response = await axios.get(icalUrl);
      const icalData = response.data;

      // Import calendar blocks
      await this.calendarService.importICalendar(propertyId, icalData);

      logger.info('Airbnb calendar synced', { propertyId });
    } catch (error: any) {
      logger.error('Failed to sync Airbnb calendar', { propertyId, error: error.message });
      throw new Error(`Calendar sync failed: ${error.message}`);
    }
  }

  async exportCalendarToAirbnb(propertyId: string): Promise<string> {
    // Generate iCal feed for Airbnb to import
    return await this.calendarService.exportICalendar(propertyId);
  }

  async syncBookingComCalendar(propertyId: string, icalUrl: string): Promise<void> {
    try {
      const response = await axios.get(icalUrl);
      await this.calendarService.importICalendar(propertyId, response.data);

      logger.info('Booking.com calendar synced', { propertyId });
    } catch (error: any) {
      logger.error('Failed to sync Booking.com calendar', { propertyId, error: error.message });
      throw new Error(`Calendar sync failed: ${error.message}`);
    }
  }

  async importExternalBooking(
    propertyId: string,
    externalBookingId: string,
    source: 'airbnb' | 'booking_com',
    checkInDate: Date,
    checkOutDate: Date,
    guestEmail: string,
    totalPrice: number
  ): Promise<void> {
    try {
      // Create booking record for external reservation
      await this.bookingService.createBooking({
        propertyId,
        guestId: 'external-guest', // Create guest record separately
        hostId: 'host-id', // Get from property
        checkInDate,
        checkOutDate,
        numberOfGuests: 1,
        basePrice: totalPrice,
        cleaningFee: 0,
      });

      logger.info('External booking imported', { propertyId, source, externalBookingId });
    } catch (error: any) {
      logger.error('Failed to import external booking', { error: error.message });
      throw error;
    }
  }

  async scheduledSync(propertyId: string, channels: string[]): Promise<void> {
    // This would be called by a cron job every hour
    for (const channel of channels) {
      try {
        if (channel === 'airbnb') {
          // Sync would require stored iCal URL per property
          logger.info('Scheduled Airbnb sync', { propertyId });
        } else if (channel === 'booking_com') {
          logger.info('Scheduled Booking.com sync', { propertyId });
        }
      } catch (error: any) {
        logger.error('Scheduled sync failed', { propertyId, channel, error: error.message });
      }
    }
  }
}
