import { Request, Response } from 'express';
import { CalendarService } from '../services/calendar.service';

const calendarService = new CalendarService();

export class CalendarController {
  async getCalendar(req: Request, res: Response) {
    try {
      const { propertyId } = req.params;
      const months = parseInt(req.query.months as string) || 3;
      
      const calendar = await calendarService.getCalendar(propertyId, months);
      res.json(calendar);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async checkAvailability(req: Request, res: Response) {
    try {
      const { propertyId } = req.params;
      const { checkInDate, checkOutDate } = req.body;
      
      const available = await calendarService.checkAvailability(
        propertyId,
        new Date(checkInDate),
        new Date(checkOutDate)
      );
      
      res.json({ available });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async blockDates(req: Request, res: Response) {
    try {
      const { propertyId } = req.params;
      const { startDate, endDate, notes } = req.body;
      
      const blocks = await calendarService.blockDates(
        propertyId,
        new Date(startDate),
        new Date(endDate),
        notes
      );
      
      res.json(blocks);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async exportICalendar(req: Request, res: Response) {
    try {
      const { propertyId } = req.params;
      const ical = await calendarService.exportICalendar(propertyId);
      
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename="${propertyId}.ics"`);
      res.send(ical);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
