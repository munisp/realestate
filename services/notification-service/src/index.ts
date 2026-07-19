import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import admin from 'firebase-admin';
import axios from 'axios';

const app = express();
app.use(express.json());

interface Notification {
  userId: string;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'WHATSAPP' | 'IN_APP';
  subject?: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  data?: any;
}

class NotificationService {
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: twilio.Twilio;
  private whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

  constructor() {
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      admin.initializeApp({
        credential: admin.credential.cert(
          JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        )
      });
    }
  }

  async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const info = await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@realestate.com',
        to,
        subject,
        text: text || subject,
        html
      });

      return {
        success: true,
        messageId: info.messageId,
        channel: 'EMAIL'
      };
    } catch (error: any) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error.message,
        channel: 'EMAIL'
      };
    }
  }

  async sendSMS(to: string, message: string) {
    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
      });

      return {
        success: true,
        messageId: result.sid,
        channel: 'SMS'
      };
    } catch (error: any) {
      console.error('SMS send error:', error);
      return {
        success: false,
        error: error.message,
        channel: 'SMS'
      };
    }
  }

  async sendPushNotification(deviceToken: string, title: string, body: string, data?: any) {
    try {
      const message = {
        notification: {
          title,
          body
        },
        data: data || {},
        token: deviceToken
      };

      const response = await admin.messaging().send(message);

      return {
        success: true,
        messageId: response,
        channel: 'PUSH'
      };
    } catch (error: any) {
      console.error('Push notification error:', error);
      return {
        success: false,
        error: error.message,
        channel: 'PUSH'
      };
    }
  }

  async sendWhatsApp(to: string, message: string) {
    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.whatsappNumber,
        to: `whatsapp:${to}`
      });

      return {
        success: true,
        messageId: result.sid,
        channel: 'WHATSAPP'
      };
    } catch (error: any) {
      console.error('WhatsApp send error:', error);
      return {
        success: false,
        error: error.message,
        channel: 'WHATSAPP'
      };
    }
  }

  async sendMultiChannel(notification: Notification, userContacts: {
    email?: string;
    phone?: string;
    deviceToken?: string;
  }) {
    const results: any[] = [];

    if (notification.type === 'EMAIL' && userContacts.email) {
      const emailResult = await this.sendEmail(
        userContacts.email,
        notification.subject || 'Notification',
        notification.message
      );
      results.push(emailResult);
    }

    if (notification.type === 'SMS' && userContacts.phone) {
      const smsResult = await this.sendSMS(userContacts.phone, notification.message);
      results.push(smsResult);
    }

    if (notification.type === 'PUSH' && userContacts.deviceToken) {
      const pushResult = await this.sendPushNotification(
        userContacts.deviceToken,
        notification.subject || 'Notification',
        notification.message,
        notification.data
      );
      results.push(pushResult);
    }

    if (notification.type === 'WHATSAPP' && userContacts.phone) {
      const whatsappResult = await this.sendWhatsApp(userContacts.phone, notification.message);
      results.push(whatsappResult);
    }

    return {
      success: results.some(r => r.success),
      results,
      userId: notification.userId
    };
  }

  async sendPropertyAlert(userId: string, propertyId: string, alertType: string, userContacts: any) {
    const messages: Record<string, { subject: string; body: string }> = {
      'PRICE_DROP': {
        subject: '🏠 Price Drop Alert!',
        body: `Great news! A property you're watching has dropped in price. Check it out now: Property #${propertyId}`
      },
      'NEW_LISTING': {
        subject: '🆕 New Property Match',
        body: `A new property matching your preferences is now available. View Property #${propertyId}`
      },
      'VIEWING_REMINDER': {
        subject: '📅 Viewing Reminder',
        body: `Reminder: Your property viewing is scheduled for tomorrow. Property #${propertyId}`
      },
      'OFFER_ACCEPTED': {
        subject: '✅ Offer Accepted!',
        body: `Congratulations! Your offer on Property #${propertyId} has been accepted.`
      },
      'OFFER_REJECTED': {
        subject: '❌ Offer Update',
        body: `Your offer on Property #${propertyId} was not accepted. Consider making a new offer.`
      }
    };

    const template = messages[alertType] || {
      subject: 'Property Update',
      body: `Update on Property #${propertyId}`
    };

    return await this.sendMultiChannel(
      {
        userId,
        type: 'EMAIL',
        subject: template.subject,
        message: template.body,
        priority: 'HIGH',
        data: { propertyId, alertType }
      },
      userContacts
    );
  }

  async sendTransactionNotification(
    userId: string,
    transactionId: string,
    status: string,
    amount: number,
    userContacts: any
  ) {
    const statusMessages: Record<string, string> = {
      'PENDING': `Your transaction #${transactionId} for ₦${amount.toLocaleString()} is pending confirmation.`,
      'COMPLETED': `✅ Transaction #${transactionId} for ₦${amount.toLocaleString()} completed successfully!`,
      'FAILED': `❌ Transaction #${transactionId} failed. Please try again or contact support.`,
      'REFUNDED': `💰 Refund processed for transaction #${transactionId}. Amount: ₦${amount.toLocaleString()}`
    };

    return await this.sendMultiChannel(
      {
        userId,
        type: 'EMAIL',
        subject: `Transaction ${status}`,
        message: statusMessages[status] || `Transaction #${transactionId} status: ${status}`,
        priority: 'HIGH',
        data: { transactionId, status, amount }
      },
      userContacts
    );
  }

  async sendBulkNotifications(notifications: Array<{
    notification: Notification;
    userContacts: any;
  }>) {
    const results = await Promise.allSettled(
      notifications.map(n => this.sendMultiChannel(n.notification, n.userContacts))
    );

    return {
      total: notifications.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results
    };
  }
}

const service = new NotificationService();

app.post('/send/email', async (req: Request, res: Response) => {
  try {
    const { to, subject, html, text } = req.body;
    const result = await service.sendEmail(to, subject, html, text);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/send/sms', async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;
    const result = await service.sendSMS(to, message);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/send/push', async (req: Request, res: Response) => {
  try {
    const { deviceToken, title, body, data } = req.body;
    const result = await service.sendPushNotification(deviceToken, title, body, data);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/send/whatsapp', async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;
    const result = await service.sendWhatsApp(to, message);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/send/multi-channel', async (req: Request, res: Response) => {
  try {
    const { notification, userContacts } = req.body;
    const result = await service.sendMultiChannel(notification, userContacts);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/alert/property', async (req: Request, res: Response) => {
  try {
    const { userId, propertyId, alertType, userContacts } = req.body;
    const result = await service.sendPropertyAlert(userId, propertyId, alertType, userContacts);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/alert/transaction', async (req: Request, res: Response) => {
  try {
    const { userId, transactionId, status, amount, userContacts } = req.body;
    const result = await service.sendTransactionNotification(
      userId, transactionId, status, amount, userContacts
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/send/bulk', async (req: Request, res: Response) => {
  try {
    const { notifications } = req.body;
    const result = await service.sendBulkNotifications(notifications);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'notification' });
});

const PORT = process.env.PORT || 5104;
app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
});
