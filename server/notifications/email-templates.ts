/**
 * Email Templates for Platform Notifications
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function getBookingConfirmationEmail(data: {
  guestName: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  bookingReference: string;
}): EmailTemplate {
  return {
    subject: `Booking Confirmation - ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Booking Confirmed!</h2>
        <p>Dear ${data.guestName},</p>
        <p>Your booking has been confirmed. Here are the details:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${data.propertyTitle}</h3>
          <p><strong>Check-in:</strong> ${data.checkIn}</p>
          <p><strong>Check-out:</strong> ${data.checkOut}</p>
          <p><strong>Total Price:</strong> ₦${data.totalPrice.toLocaleString()}</p>
          <p><strong>Booking Reference:</strong> ${data.bookingReference}</p>
        </div>
        
        <p>We look forward to hosting you!</p>
        <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact our support team.</p>
      </div>
    `,
    text: `
Booking Confirmed!

Dear ${data.guestName},

Your booking has been confirmed. Here are the details:

Property: ${data.propertyTitle}
Check-in: ${data.checkIn}
Check-out: ${data.checkOut}
Total Price: ₦${data.totalPrice.toLocaleString()}
Booking Reference: ${data.bookingReference}

We look forward to hosting you!
    `.trim(),
  };
}

export function getPaymentConfirmationEmail(data: {
  userName: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  description: string;
}): EmailTemplate {
  return {
    subject: `Payment Confirmation - ₦${data.amount.toLocaleString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Payment Successful!</h2>
        <p>Dear ${data.userName},</p>
        <p>Your payment has been processed successfully.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> ₦${data.amount.toLocaleString()}</p>
          <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
          <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
          <p><strong>Description:</strong> ${data.description}</p>
        </div>
        
        <p>Thank you for your payment!</p>
        <p style="color: #6b7280; font-size: 14px;">Keep this email for your records.</p>
      </div>
    `,
    text: `
Payment Successful!

Dear ${data.userName},

Your payment has been processed successfully.

Amount: ₦${data.amount.toLocaleString()}
Transaction ID: ${data.transactionId}
Payment Method: ${data.paymentMethod}
Description: ${data.description}

Thank you for your payment!
    `.trim(),
  };
}

export function getBuilderApplicationStatusEmail(data: {
  builderName: string;
  companyName: string;
  status: "approved" | "rejected";
  reason?: string;
}): EmailTemplate {
  const isApproved = data.status === "approved";
  
  return {
    subject: `Builder Application ${isApproved ? "Approved" : "Update"}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isApproved ? "#10b981" : "#ef4444"};">
          Application ${isApproved ? "Approved" : "Update"}
        </h2>
        <p>Dear ${data.builderName},</p>
        
        ${isApproved ? `
          <p>Congratulations! Your builder application for <strong>${data.companyName}</strong> has been approved.</p>
          <p>You can now start creating projects and listing properties on our platform.</p>
          <div style="margin: 20px 0;">
            <a href="${process.env.VITE_APP_URL}/builder/dashboard" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
        ` : `
          <p>Thank you for your interest in joining our platform. After reviewing your application for <strong>${data.companyName}</strong>, we need additional information.</p>
          ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}
          <p>Please update your application with the required documents and resubmit.</p>
        `}
        
        <p>If you have any questions, please contact our support team.</p>
      </div>
    `,
    text: `
Application ${isApproved ? "Approved" : "Update"}

Dear ${data.builderName},

${isApproved 
  ? `Congratulations! Your builder application for ${data.companyName} has been approved. You can now start creating projects and listing properties on our platform.`
  : `Thank you for your interest in joining our platform. After reviewing your application for ${data.companyName}, we need additional information.${data.reason ? `\n\nReason: ${data.reason}` : ""}\n\nPlease update your application with the required documents and resubmit.`
}

If you have any questions, please contact our support team.
    `.trim(),
  };
}

export function getMilestoneVerificationEmail(data: {
  builderName: string;
  projectTitle: string;
  milestoneName: string;
  status: "approved" | "rejected";
  escrowAmount?: number;
  inspectorNotes?: string;
}): EmailTemplate {
  const isApproved = data.status === "approved";
  
  return {
    subject: `Milestone ${isApproved ? "Approved" : "Rejected"} - ${data.projectTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isApproved ? "#10b981" : "#ef4444"};">
          Milestone ${isApproved ? "Approved" : "Rejected"}
        </h2>
        <p>Dear ${data.builderName},</p>
        
        <p>The milestone "<strong>${data.milestoneName}</strong>" for project <strong>${data.projectTitle}</strong> has been ${data.status}.</p>
        
        ${isApproved && data.escrowAmount ? `
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Escrow Release:</strong> ₦${data.escrowAmount.toLocaleString()}</p>
            <p>The funds will be transferred to your account within 2-3 business days.</p>
          </div>
        ` : ""}
        
        ${data.inspectorNotes ? `
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Inspector Notes:</strong></p>
            <p>${data.inspectorNotes}</p>
          </div>
        ` : ""}
        
        ${!isApproved ? `
          <p>Please review the inspector's notes and make the necessary corrections before resubmitting.</p>
        ` : ""}
      </div>
    `,
    text: `
Milestone ${isApproved ? "Approved" : "Rejected"}

Dear ${data.builderName},

The milestone "${data.milestoneName}" for project ${data.projectTitle} has been ${data.status}.

${isApproved && data.escrowAmount ? `Escrow Release: ₦${data.escrowAmount.toLocaleString()}\nThe funds will be transferred to your account within 2-3 business days.` : ""}

${data.inspectorNotes ? `Inspector Notes:\n${data.inspectorNotes}` : ""}

${!isApproved ? "Please review the inspector's notes and make the necessary corrections before resubmitting." : ""}
    `.trim(),
  };
}
