import os
#!/usr/bin/env python3
"""
Email automation for pilot program applications
Sends automated responses and follow-ups
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import csv

# Email templates
CONFIRMATION_EMAIL = """
Subject: Application Received - Shortlet Platform Pilot Program

Dear {name},

Thank you for applying to our Shortlet Platform Pilot Program!

We've received your application and our team is reviewing it. Here's what happens next:

📋 Review Process (3-5 business days)
- Our team will review your application
- Top candidates will be invited for a 30-minute video interview
- Final selection will be announced by {selection_date}

🎯 What We're Looking For
- Active shortlet hosts in Lekki, VI, or Ikoyi
- Minimum 1 property with regular bookings
- Willingness to test features and provide feedback

📱 Stay Connected
- Join our WhatsApp group for updates: [Link]
- Follow us on Instagram: @yourplatform
- Questions? Reply to this email

We're excited about the possibility of working with you!

Best regards,
Pilot Program Team
"""

ACCEPTANCE_EMAIL = """
Subject: Congratulations! You're Selected for Our Pilot Program 🎉

Dear {name},

Congratulations! You've been selected to join our exclusive Shortlet Platform Pilot Program!

🎁 Your Pilot Benefits
✅ 0% commission for 3 months (Feb-Apr 2025)
✅ Free professional photography (₦50,000 value)
✅ Dedicated account manager
✅ Priority support via WhatsApp
✅ Early access to all features

📅 Next Steps

1. Onboarding Session
   Date: {onboarding_date}
   Time: {onboarding_time}
   Location: {onboarding_location}
   
2. Platform Setup (Week of Feb 1)
   - Create your host account
   - List your first property
   - Connect Airbnb calendar
   - Set up Paystack/Flutterwave

3. Photography Session
   Schedule: {photography_date}
   Photographer will contact you directly

🔗 Important Links
- Host Dashboard: https://host.yourplatform.com
- Onboarding Guide: [Link]
- WhatsApp Support: +234 XXX XXX XXXX

Please confirm your attendance by replying to this email.

Welcome aboard!

Best regards,
{sender_name}
Pilot Program Manager
"""

REJECTION_EMAIL = """
Subject: Update on Your Pilot Program Application

Dear {name},

Thank you for your interest in our Shortlet Platform Pilot Program.

After careful review, we've decided to move forward with other candidates for this pilot round. This decision was difficult as we received many strong applications.

However, we'd love to keep you in mind for future opportunities:

🔔 Join Our Waitlist
- You'll get early access when we launch publicly
- Special launch pricing for waitlist members
- Updates on new features and improvements

📧 Stay in Touch
- Join our newsletter: [Link]
- Follow us on social media for updates
- We'll notify you about future pilot programs

Thank you again for your interest. We hope to work with you in the future!

Best regards,
Pilot Program Team
"""

def send_email(to_email, subject, body, from_email, smtp_server, smtp_port, password):
    """Send email via SMTP"""
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject
    
    msg.attach(MIMEText(body, 'plain'))
    
    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(from_email, password)
        server.send_message(msg)
        server.quit()
        print(f"✓ Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"✗ Failed to send email to {to_email}: {e}")
        return False

def process_applications(csv_file, email_type='confirmation'):
    """Process applications from CSV and send emails"""
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row['Full Name']
            email = row['Email Address']
            
            if email_type == 'confirmation':
                body = CONFIRMATION_EMAIL.format(
                    name=name,
                    selection_date=(datetime.now() + timedelta(days=7)).strftime('%B %d, %Y')
                )
            elif email_type == 'acceptance':
                body = ACCEPTANCE_EMAIL.format(
                    name=name,
                    onboarding_date='February 1, 2025',
                    onboarding_time='2:00 PM WAT',
                    onboarding_location='Online (Zoom link will be sent)',
                    photography_date='Week of February 3-7',
                    sender_name='Your Name'
                )
            elif email_type == 'rejection':
                body = REJECTION_EMAIL.format(name=name)
            
            # Send email (configure SMTP settings)
            send_email(
                to_email=email,
                subject=body.split('\n')[1].replace('Subject: ', ''),
                body='\n'.join(body.split('\n')[3:]),
                from_email=os.environ.get('FROM_EMAIL', 'pilot@yourplatform.com'),
                smtp_server='smtp.gmail.com',
                smtp_port=587,
                password=os.environ.get('SMTP_PASSWORD', '')
            )

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 3:
        print("Usage: python email-automation.py <csv_file> <confirmation|acceptance|rejection>")
        sys.exit(1)
    
    process_applications(sys.argv[1], sys.argv[2])
