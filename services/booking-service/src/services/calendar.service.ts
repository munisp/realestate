import { CalendarRepository } from '../repositories/calendar.repository';
import { CalendarBlock } from '../models';
import { addMonths, startOfMonth, endOfMonth } from 'date-fns';
import ICAL from 'ical.js';

export class CalendarService {
  private calendarRepo: CalendarRepository;

  constructor() {
    this.calendarRepo = new CalendarRepository();
  }

  async getCalendar(
    propertyId: string,
    months: number = 3
  ): Promise<CalendarBlock[]> {
    const startDate = startOfMonth(new Date());
    const endDate = endOfMonth(addMonths(startDate, months));

    return await this.calendarRepo.getAvailability(
      propertyId,
      startDate,
      endDate
    );
  }

  async checkAvailability(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date
  ): Promise<boolean> {
    const blocks = await this.calendarRepo.getAvailability(
      propertyId,
      checkInDate,
      checkOutDate
    );

    // Check if all dates are available
    return blocks.every(block => block.status === 'available');
  }

  async blockDates(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    notes?: string
  ): Promise<CalendarBlock[]> {
    return await this.calendarRepo.blockDates(
      propertyId,
      startDate,
      endDate,
      notes
    );
  }

  async updatePricing(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    price: number
  ): Promise<void> {
    await this.calendarRepo.updatePricing(propertyId, startDate, endDate, price);
  }

  async exportICalendar(propertyId: string): Promise<string> {
    const blocks = await this.getCalendar(propertyId, 12);

    const cal = new ICAL.Component(['vcalendar', [], []]);
    cal.updatePropertyWithValue('prodid', '-//Booking Service//EN');
    cal.updatePropertyWithValue('version', '2.0');

    blocks.filter(b => b.status === 'booked').forEach(block => {
      const vevent = new ICAL.Component('vevent');
      vevent.updatePropertyWithValue('uid', block.bookingId || block.id);
      vevent.updatePropertyWithValue('summary', 'Booked');
      vevent.updatePropertyWithValue('dtstart', ICAL.Time.fromJSDate(block.date, false));
      vevent.updatePropertyWithValue('dtend', ICAL.Time.fromJSDate(block.date, false));
      cal.addSubcomponent(vevent);
    });

    return cal.toString();
  }

  async importICalendar(propertyId: string, icalData: string): Promise<void> {
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    for (const vevent of vevents) {
      const dtstart = vevent.getFirstPropertyValue('dtstart');
      const dtend = vevent.getFirstPropertyValue('dtend');

      if (dtstart && dtend) {
        await this.calendarRepo.blockDates(
          propertyId,
          dtstart.toJSDate(),
          dtend.toJSDate(),
          'Imported from iCal'
        );
      }
    }
  }
}
