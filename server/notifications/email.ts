import { notifyOwner } from "../_core/notification";

/**
 * Email Notification System
 * Uses the built-in Manus notification API to send emails to platform owner
 * For user-facing emails, integrate external email service (SendGrid, Mailgun, etc.)
 */

export interface EmailNotification {
  title: string;
  content: string;
}

/**
 * Send notification to platform owner
 */
export async function sendOwnerNotification(notification: EmailNotification): Promise<boolean> {
  return await notifyOwner({
    title: notification.title,
    content: notification.content,
  });
}

/**
 * Notify owner of new builder application
 */
export async function notifyNewBuilderApplication(builderData: {
  companyName: string;
  email: string;
  phone: string;
  cacNumber: string | null;
}) {
  return await sendOwnerNotification({
    title: "New Builder Application Received",
    content: `A new builder has applied for verification:

Company: ${builderData.companyName}
Email: ${builderData.email}
Phone: ${builderData.phone}
CAC Number: ${builderData.cacNumber || "Not provided"}

Please review the application in the admin panel.`,
  });
}

/**
 * Notify owner of builder verification status change
 */
export async function notifyBuilderVerificationUpdate(builderData: {
  companyName: string;
  status: string;
  adminName: string;
}) {
  return await sendOwnerNotification({
    title: `Builder Verification ${builderData.status}`,
    content: `Builder verification status updated:

Company: ${builderData.companyName}
New Status: ${builderData.status}
Updated By: ${builderData.adminName}`,
  });
}

/**
 * Notify owner of new project milestone completion
 */
export async function notifyMilestoneCompleted(milestoneData: {
  projectName: string;
  milestoneTitle: string;
  builderName: string;
  completionPercentage: number;
}) {
  return await sendOwnerNotification({
    title: "Project Milestone Completed",
    content: `A construction milestone has been marked as completed:

Project: ${milestoneData.projectName}
Milestone: ${milestoneData.milestoneTitle}
Builder: ${milestoneData.builderName}
Overall Progress: ${milestoneData.completionPercentage}%

Please verify the milestone to release escrow payment.`,
  });
}

/**
 * Notify owner of new property inquiry
 */
export async function notifyPropertyInquiry(inquiryData: {
  propertyAddress: string;
  buyerName: string;
  buyerEmail: string;
  message: string;
}) {
  return await sendOwnerNotification({
    title: "New Property Inquiry",
    content: `A buyer has inquired about a property:

Property: ${inquiryData.propertyAddress}
Buyer: ${inquiryData.buyerName}
Email: ${inquiryData.buyerEmail}

Message:
${inquiryData.message}`,
  });
}

/**
 * Notify owner of new short-let booking
 */
export async function notifyNewBooking(bookingData: {
  propertyName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
}) {
  return await sendOwnerNotification({
    title: "New Short-let Booking",
    content: `A new booking has been created:

Property: ${bookingData.propertyName}
Guest: ${bookingData.guestName}
Check-in: ${bookingData.checkIn}
Check-out: ${bookingData.checkOut}
Total Amount: ₦${bookingData.totalAmount.toLocaleString()}`,
  });
}

/**
 * Notify owner of payment received
 */
export async function notifyPaymentReceived(paymentData: {
  amount: number;
  gateway: string;
  type: string;
  referenceId: string;
  buyerName: string;
}) {
  return await sendOwnerNotification({
    title: "Payment Received",
    content: `A payment has been successfully processed:

Amount: ₦${paymentData.amount.toLocaleString()}
Gateway: ${paymentData.gateway}
Type: ${paymentData.type}
Reference: ${paymentData.referenceId}
Buyer: ${paymentData.buyerName}`,
  });
}

/**
 * Notify owner of payment failure
 */
export async function notifyPaymentFailed(paymentData: {
  amount: number;
  gateway: string;
  type: string;
  buyerName: string;
  reason: string;
}) {
  return await sendOwnerNotification({
    title: "Payment Failed",
    content: `A payment attempt has failed:

Amount: ₦${paymentData.amount.toLocaleString()}
Gateway: ${paymentData.gateway}
Type: ${paymentData.type}
Buyer: ${paymentData.buyerName}
Reason: ${paymentData.reason}

Please investigate and contact the buyer if necessary.`,
  });
}

/**
 * Notify owner of escrow payment release
 */
export async function notifyEscrowReleased(escrowData: {
  amount: number;
  projectName: string;
  builderName: string;
  milestoneTitle: string;
  releasedBy: string;
}) {
  return await sendOwnerNotification({
    title: "Escrow Payment Released",
    content: `Escrow funds have been released to builder:

Amount: ₦${escrowData.amount.toLocaleString()}
Project: ${escrowData.projectName}
Builder: ${escrowData.builderName}
Milestone: ${escrowData.milestoneTitle}
Released By: ${escrowData.releasedBy}`,
  });
}

/**
 * Notify owner of high-value transaction
 */
export async function notifyHighValueTransaction(transactionData: {
  amount: number;
  propertyAddress: string;
  buyerName: string;
  transactionType: string;
}) {
  return await sendOwnerNotification({
    title: "High-Value Transaction Alert",
    content: `A high-value transaction has been initiated:

Amount: ₦${transactionData.amount.toLocaleString()}
Property: ${transactionData.propertyAddress}
Buyer: ${transactionData.buyerName}
Type: ${transactionData.transactionType}

Please monitor this transaction closely.`,
  });
}

/**
 * Notify owner of suspicious activity
 */
export async function notifySuspiciousActivity(activityData: {
  userId: number;
  userName: string;
  activityType: string;
  details: string;
}) {
  return await sendOwnerNotification({
    title: "Suspicious Activity Detected",
    content: `Suspicious activity has been detected:

User ID: ${activityData.userId}
User: ${activityData.userName}
Activity: ${activityData.activityType}
Details: ${activityData.details}

Please review and take appropriate action.`,
  });
}

/**
 * Notify owner of system errors
 */
export async function notifySystemError(errorData: {
  errorType: string;
  message: string;
  stack?: string;
}) {
  return await sendOwnerNotification({
    title: `System Error: ${errorData.errorType}`,
    content: `A system error has occurred:

Error Type: ${errorData.errorType}
Message: ${errorData.message}

${errorData.stack ? `Stack Trace:\n${errorData.stack}` : ""}

Please investigate immediately.`,
  });
}
