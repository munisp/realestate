import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppDataSource } from './config/database';
import { initKafka } from './config/kafka';
import { initRedis } from './config/redis';
import { BookingController } from './controllers/booking.controller';
import { CalendarController } from './controllers/calendar.controller';
import logger from './utils/logger';

const app = express();
const port = process.env.PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Controllers
const bookingController = new BookingController();
const calendarController = new CalendarController();

// Routes
app.post('/api/bookings', bookingController.createBooking);
app.get('/api/bookings/:id', bookingController.getBooking);
app.post('/api/bookings/:id/confirm', bookingController.confirmBooking);
app.post('/api/bookings/:id/cancel', bookingController.cancelBooking);
app.post('/api/bookings/:id/checkin', bookingController.checkIn);
app.post('/api/bookings/:id/checkout', bookingController.checkOut);
app.get('/api/guests/:guestId/bookings', bookingController.getGuestBookings);
app.get('/api/hosts/:hostId/bookings', bookingController.getHostBookings);

app.get('/api/calendar/:propertyId', calendarController.getCalendar);
app.post('/api/calendar/:propertyId/check-availability', calendarController.checkAvailability);
app.post('/api/calendar/:propertyId/block', calendarController.blockDates);
app.get('/api/calendar/:propertyId/export.ics', calendarController.exportICalendar);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'booking-service' });
});

// Initialize and start server
async function start() {
  try {
    // Initialize database
    await AppDataSource.initialize();
    logger.info('Database connected');

    // Initialize Kafka
    await initKafka();

    // Initialize Redis
    await initRedis();

    app.listen(port, () => {
      logger.info(`Booking Service running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

start();
