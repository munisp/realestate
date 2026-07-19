import { PaystackService } from './paystack.service';
import { FlutterwaveService } from './flutterwave.service';
import { BookingRepository } from '../repositories/booking.repository';
import { publishEvent } from '../config/kafka';
import logger from '../utils/logger';

export type PaymentProvider = 'paystack' | 'flutterwave';

export class PaymentService {
  private paystackService: PaystackService;
  private flutterwaveService: FlutterwaveService;
  private bookingRepo: BookingRepository;

  constructor() {
    this.paystackService = new PaystackService();
    this.flutterwaveService = new FlutterwaveService();
    this.bookingRepo = new BookingRepository();
  }

  async initiatePayment(
    bookingId: string,
    email: string,
    provider: PaymentProvider = 'paystack'
  ): Promise<{ paymentUrl: string; reference: string }> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const reference = `BKG-${bookingId}-${Date.now()}`;

    if (provider === 'paystack') {
      const response = await this.paystackService.initializePayment(
        email,
        booking.totalPrice,
        reference,
        { bookingId, propertyId: booking.propertyId }
      );

      await publishEvent('payment.initiated', {
        bookingId,
        reference,
        amount: booking.totalPrice,
        provider: 'paystack',
      });

      return {
        paymentUrl: response.data.authorization_url,
        reference: response.data.reference,
      };
    } else {
      const response = await this.flutterwaveService.initializePayment(
        email,
        booking.totalPrice,
        reference,
        { bookingId, propertyId: booking.propertyId }
      );

      await publishEvent('payment.initiated', {
        bookingId,
        reference,
        amount: booking.totalPrice,
        provider: 'flutterwave',
      });

      return {
        paymentUrl: response.data.link,
        reference,
      };
    }
  }

  async verifyPayment(
    reference: string,
    provider: PaymentProvider
  ): Promise<boolean> {
    try {
      if (provider === 'paystack') {
        const response = await this.paystackService.verifyPayment(reference);
        
        if (response.data.status === 'success') {
          // Extract booking ID from metadata
          const bookingId = reference.split('-')[1];
          
          await this.bookingRepo.update(bookingId, {
            paymentStatus: 'paid',
          });

          await publishEvent('payment.completed', {
            bookingId,
            reference,
            amount: response.data.amount / 100,
            provider: 'paystack',
          });

          logger.info('Payment verified and booking updated', { bookingId, reference });
          return true;
        }
      } else {
        const response = await this.flutterwaveService.verifyPayment(reference);
        
        if (response.data.status === 'successful') {
          const bookingId = response.data.tx_ref.split('-')[1];
          
          await this.bookingRepo.update(bookingId, {
            paymentStatus: 'paid',
          });

          await publishEvent('payment.completed', {
            bookingId,
            reference: response.data.tx_ref,
            amount: response.data.amount,
            provider: 'flutterwave',
          });

          logger.info('Payment verified and booking updated', { bookingId, reference });
          return true;
        }
      }

      return false;
    } catch (error: any) {
      logger.error('Payment verification failed', { reference, error: error.message });
      return false;
    }
  }

  async releasePaymentToHost(
    bookingId: string,
    hostAccountNumber: string,
    hostBankCode: string,
    provider: PaymentProvider = 'paystack'
  ): Promise<void> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== 'checked_out') {
      throw new Error('Payment can only be released after checkout');
    }

    // Calculate host payout (total - platform fee 3%)
    const platformFee = booking.totalPrice * 0.03;
    const hostPayout = booking.totalPrice - platformFee;

    const reference = `PAYOUT-${bookingId}-${Date.now()}`;

    if (provider === 'paystack') {
      const recipientCode = await this.paystackService.createTransferRecipient(
        hostAccountNumber,
        hostBankCode,
        'Host Payout'
      );

      await this.paystackService.initiateTransfer(
        recipientCode,
        hostPayout,
        reference,
        `Payout for booking ${bookingId}`
      );
    } else {
      await this.flutterwaveService.initiateTransfer(
        hostAccountNumber,
        hostBankCode,
        hostPayout,
        reference,
        `Payout for booking ${bookingId}`
      );
    }

    await publishEvent('payment.released', {
      bookingId,
      hostId: booking.hostId,
      amount: hostPayout,
      platformFee,
      reference,
    });

    logger.info('Payment released to host', { bookingId, amount: hostPayout });
  }
}
