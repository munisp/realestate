import { Request, Response } from 'express';
import { BookingService } from '../services/booking.service';
import { PaymentService } from '../services/payment.service';
import logger from '../utils/logger';

const bookingService = new BookingService();
const paymentService = new PaymentService();

export class BookingController {
  async createBooking(req: Request, res: Response) {
    try {
      const booking = await bookingService.createBooking(req.body);
      
      // Initiate payment
      const payment = await paymentService.initiatePayment(
        booking.id,
        req.body.email,
        req.body.paymentProvider || 'paystack'
      );

      res.status(201).json({
        booking,
        payment,
      });
    } catch (error: any) {
      logger.error('Create booking failed', { error: error.message });
      res.status(400).json({ error: error.message });
    }
  }

  async getBooking(req: Request, res: Response) {
    try {
      const booking = await bookingService.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async confirmBooking(req: Request, res: Response) {
    try {
      const booking = await bookingService.confirmBooking(req.params.id);
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async cancelBooking(req: Request, res: Response) {
    try {
      const booking = await bookingService.cancelBooking(
        req.params.id,
        req.body.reason
      );
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async checkIn(req: Request, res: Response) {
    try {
      const booking = await bookingService.checkIn(req.params.id);
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async checkOut(req: Request, res: Response) {
    try {
      const booking = await bookingService.checkOut(req.params.id);
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getGuestBookings(req: Request, res: Response) {
    try {
      const bookings = await bookingService.getGuestBookings(req.params.guestId);
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getHostBookings(req: Request, res: Response) {
    try {
      const bookings = await bookingService.getHostBookings(req.params.hostId);
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
