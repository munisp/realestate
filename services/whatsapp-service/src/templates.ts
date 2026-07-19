export const messageTemplates = {
  bookingConfirmation: (guestName: string, propertyTitle: string, checkIn: string, checkOut: string) => ({
    name: 'booking_confirmation',
    language: { code: 'en' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: guestName },
          { type: 'text', text: propertyTitle },
          { type: 'text', text: checkIn },
          { type: 'text', text: checkOut },
        ],
      },
    ],
  }),

  checkInInstructions: (guestName: string, propertyAddress: string, accessCode: string) => ({
    name: 'check_in_instructions',
    language: { code: 'en' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: guestName },
          { type: 'text', text: propertyAddress },
          { type: 'text', text: accessCode },
        ],
      },
    ],
  }),

  paymentReminder: (guestName: string, amount: string, dueDate: string) => ({
    name: 'payment_reminder',
    language: { code: 'en' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: guestName },
          { type: 'text', text: amount },
          { type: 'text', text: dueDate },
        ],
      },
    ],
  }),

  reviewRequest: (guestName: string, propertyTitle: string, reviewLink: string) => ({
    name: 'review_request',
    language: { code: 'en' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: guestName },
          { type: 'text', text: propertyTitle },
        ],
      },
      {
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [
          { type: 'text', text: reviewLink },
        ],
      },
    ],
  }),
};

export function formatBookingConfirmation(
  guestName: string,
  propertyTitle: string,
  checkIn: string,
  checkOut: string
): string {
  return `Hi ${guestName}! 🎉\n\nYour booking for ${propertyTitle} has been confirmed!\n\n📅 Check-in: ${checkIn}\n📅 Check-out: ${checkOut}\n\nWe're excited to host you!`;
}

export function formatCheckInInstructions(
  guestName: string,
  propertyAddress: string,
  accessCode: string,
  wifiPassword: string
): string {
  return `Hi ${guestName}! 🏠\n\nWelcome! Here are your check-in details:\n\n📍 Address: ${propertyAddress}\n🔑 Access Code: ${accessCode}\n📶 WiFi Password: ${wifiPassword}\n\nEnjoy your stay!`;
}

export function formatPaymentReminder(
  guestName: string,
  amount: string,
  dueDate: string
): string {
  return `Hi ${guestName},\n\nThis is a friendly reminder that your payment of ${amount} is due on ${dueDate}.\n\nPlease complete the payment to confirm your booking.`;
}

export function formatReviewRequest(
  guestName: string,
  propertyTitle: string
): string {
  return `Hi ${guestName}! 🌟\n\nThank you for staying at ${propertyTitle}. We hope you had a great experience!\n\nWould you mind leaving us a review? Your feedback helps us improve.`;
}
