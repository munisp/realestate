/**
 * Email Service for Tour Confirmations and Notifications
 * 
 * In production, integrate with:
 * - SendGrid
 * - AWS SES
 * - Mailgun
 * - Postmark
 * 
 * For now, this logs emails to console and uses the built-in notification system
 */

import { notifyOwner } from './_core/notification';

export interface TourConfirmationEmail {
  to: string;
  toName: string;
  property: {
    address: string;
    city: string;
    state: string;
    price: number;
    image?: string;
  };
  tour: {
    date: Date;
    duration: number;
    tourType: 'in_person' | 'virtual';
    meetingLink?: string;
  };
  agent?: {
    name: string;
    email: string;
    phone?: string;
  };
}

export interface TourCancellationEmail {
  to: string;
  toName: string;
  property: {
    address: string;
  };
  tour: {
    date: Date;
  };
  reason?: string;
}

export interface TourReminderEmail {
  to: string;
  toName: string;
  property: {
    address: string;
    city: string;
    state: string;
  };
  tour: {
    date: Date;
    duration: number;
    tourType: 'in_person' | 'virtual';
    meetingLink?: string;
  };
}

/**
 * Send tour confirmation email to buyer
 */
export async function sendTourConfirmationEmail(data: TourConfirmationEmail): Promise<boolean> {
  try {
    const { date, duration, tourType, meetingLink } = data.tour;
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const emailContent = `
Tour Confirmation

Dear ${data.toName},

Your property tour has been scheduled!

Property Details:
${data.property.address}
${data.property.city}, ${data.property.state}
Price: $${data.property.price.toLocaleString()}

Tour Details:
Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${duration} minutes
Type: ${tourType === 'in_person' ? 'In-Person Tour' : 'Virtual Tour'}
${meetingLink ? `Meeting Link: ${meetingLink}` : ''}

${data.agent ? `
Agent Information:
Name: ${data.agent.name}
Email: ${data.agent.email}
${data.agent.phone ? `Phone: ${data.agent.phone}` : ''}
` : ''}

We look forward to showing you this property!

Best regards,
Real Estate Platform Team
    `.trim();

    console.log('[Email] Tour Confirmation Email:');
    console.log(`To: ${data.to}`);
    console.log(`Subject: Tour Confirmed - ${data.property.address}`);
    console.log(emailContent);
    console.log('---');

    // In production, send actual email here
    // await sendEmailViaProvider({ to: data.to, subject: '...', html: '...' });

    return true;
  } catch (error) {
    console.error('[Email] Error sending tour confirmation:', error);
    return false;
  }
}

/**
 * Send tour confirmation notification to agent
 */
export async function sendAgentTourNotificationEmail(data: TourConfirmationEmail): Promise<boolean> {
  try {
    const { date, duration, tourType } = data.tour;
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const emailContent = `
New Tour Request

Hello ${data.agent?.name || 'Agent'},

You have a new tour request!

Buyer: ${data.toName}
Contact: ${data.to}

Property:
${data.property.address}
${data.property.city}, ${data.property.state}

Tour Details:
Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${duration} minutes
Type: ${tourType === 'in_person' ? 'In-Person Tour' : 'Virtual Tour'}

Please confirm or reschedule this tour through your dashboard.

Best regards,
Real Estate Platform Team
    `.trim();

    console.log('[Email] Agent Tour Notification:');
    console.log(`To: ${data.agent?.email || 'agent@example.com'}`);
    console.log(`Subject: New Tour Request - ${data.property.address}`);
    console.log(emailContent);
    console.log('---');

    // Notify platform owner about new tour
    await notifyOwner({
      title: 'New Tour Scheduled',
      content: `${data.toName} scheduled a ${tourType} tour for ${data.property.address} on ${formattedDate} at ${formattedTime}`,
    }).catch((err) => console.error('[Email] Owner notification failed:', err));

    return true;
  } catch (error) {
    console.error('[Email] Error sending agent notification:', error);
    return false;
  }
}

/**
 * Send tour cancellation email
 */
export async function sendTourCancellationEmail(data: TourCancellationEmail): Promise<boolean> {
  try {
    const formattedDate = data.tour.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = data.tour.date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const emailContent = `
Tour Cancellation

Dear ${data.toName},

Your property tour has been cancelled.

Property: ${data.property.address}
Date: ${formattedDate}
Time: ${formattedTime}

${data.reason ? `Reason: ${data.reason}` : ''}

If you'd like to reschedule, please visit our website to book a new tour.

Best regards,
Real Estate Platform Team
    `.trim();

    console.log('[Email] Tour Cancellation Email:');
    console.log(`To: ${data.to}`);
    console.log(`Subject: Tour Cancelled - ${data.property.address}`);
    console.log(emailContent);
    console.log('---');

    return true;
  } catch (error) {
    console.error('[Email] Error sending cancellation email:', error);
    return false;
  }
}

/**
 * Send tour reminder email (24 hours before)
 */
export async function sendTourReminderEmail(data: TourReminderEmail): Promise<boolean> {
  try {
    const { date, duration, tourType, meetingLink } = data.tour;
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const emailContent = `
Tour Reminder

Dear ${data.toName},

This is a reminder about your upcoming property tour tomorrow!

Property:
${data.property.address}
${data.property.city}, ${data.property.state}

Tour Details:
Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${duration} minutes
Type: ${tourType === 'in_person' ? 'In-Person Tour' : 'Virtual Tour'}
${meetingLink ? `\nMeeting Link: ${meetingLink}` : ''}

${tourType === 'in_person' 
  ? 'Please arrive 5 minutes early. Don\'t forget to bring a valid ID.'
  : 'Please test your audio and video before the tour starts.'}

Looking forward to seeing you!

Best regards,
Real Estate Platform Team
    `.trim();

    console.log('[Email] Tour Reminder Email:');
    console.log(`To: ${data.to}`);
    console.log(`Subject: Reminder: Property Tour Tomorrow`);
    console.log(emailContent);
    console.log('---');

    return true;
  } catch (error) {
    console.error('[Email] Error sending reminder email:', error);
    return false;
  }
}

/**
 * Generate iCalendar (.ics) file content for calendar sync
 */
export function generateICalendarEvent(data: {
  summary: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  organizerEmail?: string;
  attendeeEmail?: string;
}): string {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const uid = `tour-${Date.now()}@realestate-platform.com`;
  const dtstamp = formatDate(new Date());
  const dtstart = formatDate(data.startDate);
  const dtend = formatDate(data.endDate);

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Real Estate Platform//Tour Scheduler//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${data.summary}
DESCRIPTION:${data.description.replace(/\n/g, '\\n')}
LOCATION:${data.location}
${data.organizerEmail ? `ORGANIZER:mailto:${data.organizerEmail}` : ''}
${data.attendeeEmail ? `ATTENDEE:mailto:${data.attendeeEmail}` : ''}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
}
