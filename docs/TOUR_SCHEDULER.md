# Property Tour Scheduler Documentation

## Overview

The property tour scheduler enables buyers to book in-person or virtual property tours directly through the platform. It includes availability management, automated confirmations, and calendar integration.

## Features

### ✅ Implemented Features

1. **Tour Booking Interface**
   - Date and time slot selection
   - In-person vs virtual tour options
   - Property details sidebar
   - Additional notes field
   - Real-time availability checking

2. **Agent Availability Management**
   - Day-of-week based schedules
   - Time slot configuration
   - Automatic conflict detection
   - Multiple agent support

3. **Tour Management**
   - View all scheduled tours (`/my-tours`)
   - Tour status tracking (pending, confirmed, cancelled, completed)
   - Cancellation with reason
   - Meeting link generation for virtual tours

4. **Automated Notifications**
   - Email confirmations to buyers
   - Agent notifications for new requests
   - Push notifications for tour updates
   - Cancellation notifications

5. **Calendar Integration**
   - iCalendar (.ics) file generation
   - Google Calendar sync ready
   - 24-hour reminder system (infrastructure ready)

## User Flow

### Booking a Tour

1. **Navigate to Property**
   - User views property details
   - Clicks "Schedule Tour" button
   - Redirected to `/property/:propertyId/schedule-tour`

2. **Select Tour Type**
   - Choose between in-person or virtual tour
   - View tour type descriptions

3. **Choose Date**
   - Select from next 14 days
   - Visual calendar interface
   - Dates displayed with day and date

4. **Select Time**
   - View available time slots for selected date
   - Slots generated based on agent availability
   - Booked slots automatically hidden

5. **Add Notes (Optional)**
   - Specify requirements or questions
   - Notes sent to agent

6. **Confirm Booking**
   - Review booking summary
   - Submit booking
   - Receive confirmation

### Managing Tours

1. **View Tours**
   - Navigate to `/my-tours`
   - See upcoming and past tours
   - Tours grouped by status

2. **Cancel Tour**
   - Click "Cancel Tour" button
   - Provide cancellation reason (optional)
   - Confirm cancellation

3. **Join Virtual Tour**
   - Click meeting link from tour details
   - Opens video conferencing platform

## API Endpoints

### `tours.getAvailableSlots`

Get available time slots for a property on a specific date.

**Input:**
```typescript
{
  propertyId: number;
  date: string; // YYYY-MM-DD
  agentId?: number;
}
```

**Output:**
```typescript
{
  slots: string[]; // ISO date strings
}
```

### `tours.bookTour`

Book a property tour.

**Input:**
```typescript
{
  propertyId: number;
  agentId?: number;
  appointmentDate: string; // ISO date string
  duration: number; // minutes, default 60
  tourType: 'in_person' | 'virtual';
  notes?: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  appointmentId: number;
  meetingLink?: string; // For virtual tours
}
```

### `tours.getMyTours`

Get user's scheduled tours.

**Output:**
```typescript
Array<{
  id: number;
  propertyId: number;
  appointmentDate: Date;
  duration: number;
  tourType: 'in_person' | 'virtual';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  meetingLink?: string;
  notes?: string;
  property: {
    addressLine1: string;
    city: string;
    state: string;
    primaryImage?: string;
    price?: number;
  };
}>
```

### `tours.cancelTour`

Cancel a scheduled tour.

**Input:**
```typescript
{
  appointmentId: number;
  reason?: string;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

### `tours.confirmTour` (Agent Only)

Confirm a tour request.

**Input:**
```typescript
{
  appointmentId: number;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

## Database Schema

### appointments Table

```sql
CREATE TABLE appointments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  propertyId INT NOT NULL,
  buyerId INT NOT NULL,
  agentId INT,
  
  appointmentDate TIMESTAMP NOT NULL,
  duration INT DEFAULT 60 NOT NULL,
  tourType ENUM('in_person', 'virtual') DEFAULT 'in_person' NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending' NOT NULL,
  meetingLink TEXT,
  
  notes TEXT,
  cancellationReason TEXT,
  reminderSent INT DEFAULT 0 NOT NULL,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);
```

### agentAvailability Table

```sql
CREATE TABLE agentAvailability (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agentId INT NOT NULL,
  
  dayOfWeek INT NOT NULL, -- 0-6 (Sunday-Saturday)
  startTime VARCHAR(5) NOT NULL, -- HH:MM format
  endTime VARCHAR(5) NOT NULL, -- HH:MM format
  isAvailable INT DEFAULT 1 NOT NULL,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);
```

## Email Notifications

### Tour Confirmation Email

Sent to buyer immediately after booking.

**Contains:**
- Property details (address, price, image)
- Tour date, time, and duration
- Tour type (in-person or virtual)
- Meeting link (for virtual tours)
- Agent information
- Cancellation instructions

### Agent Notification Email

Sent to agent when new tour is requested.

**Contains:**
- Buyer information
- Property details
- Tour date and time
- Tour type
- Link to confirm/manage tour

### Cancellation Email

Sent to buyer and agent when tour is cancelled.

**Contains:**
- Property details
- Original tour date/time
- Cancellation reason (if provided)
- Rebooking instructions

### Reminder Email (24 hours before)

Sent automatically 24 hours before tour.

**Contains:**
- Property details
- Tour date, time, and duration
- Meeting link (for virtual tours)
- Preparation instructions
- Contact information

## Agent Availability Configuration

### Setting Up Availability

Agents can configure their availability by day of week:

```typescript
// Example: Available Monday-Friday, 9 AM - 5 PM
const availability = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Monday
  { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // Tuesday
  { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }, // Wednesday
  { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }, // Thursday
  { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' }, // Friday
];
```

### Slot Generation

Time slots are generated hourly within availability windows:

1. Check agent availability for day of week
2. Generate hourly slots between start and end time
3. Filter out already booked slots
4. Return available slots

## Virtual Tour Integration

### Meeting Link Generation

Currently generates placeholder links. In production, integrate with:

**Zoom:**
```typescript
import { Zoom } from '@zoom/zoom-sdk';

const meeting = await zoom.meetings.create({
  topic: `Property Tour - ${property.address}`,
  type: 2, // Scheduled meeting
  start_time: appointmentDate,
  duration: 60,
  settings: {
    host_video: true,
    participant_video: true,
  },
});

meetingLink = meeting.join_url;
```

**Google Meet:**
```typescript
import { google } from 'googleapis';

const event = await calendar.events.insert({
  calendarId: 'primary',
  conferenceDataVersion: 1,
  requestBody: {
    summary: `Property Tour - ${property.address}`,
    start: { dateTime: appointmentDate },
    end: { dateTime: endDate },
    conferenceData: {
      createRequest: {
        requestId: `tour-${appointmentId}`,
      },
    },
  },
});

meetingLink = event.data.hangoutLink;
```

## Calendar Sync

### iCalendar Export

Generate .ics files for calendar import:

```typescript
import { generateICalendarEvent } from './server/emailService';

const icsContent = generateICalendarEvent({
  summary: `Property Tour - ${property.address}`,
  description: `Tour of ${property.address}`,
  location: property.address,
  startDate: appointmentDate,
  endDate: new Date(appointmentDate.getTime() + duration * 60000),
  organizerEmail: agent.email,
  attendeeEmail: buyer.email,
});

// Send as email attachment or download link
```

### Google Calendar Integration

```typescript
import { google } from 'googleapis';

const calendar = google.calendar('v3');

await calendar.events.insert({
  calendarId: 'primary',
  requestBody: {
    summary: `Property Tour - ${property.address}`,
    location: property.address,
    description: tourNotes,
    start: {
      dateTime: appointmentDate.toISOString(),
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'America/New_York',
    },
    attendees: [
      { email: buyer.email },
      { email: agent.email },
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 },
      ],
    },
  },
});
```

## Reminder System

### Automated Reminders

Set up cron job to send reminders 24 hours before tours:

```typescript
// Run daily at midnight
import { getDb } from './server/db';
import { appointments } from './drizzle/schema';
import { sendTourReminderEmail } from './server/emailService';
import { and, eq, gte, lte } from 'drizzle-orm';

async function sendTourReminders() {
  const db = await getDb();
  if (!db) return;

  // Get tours happening in 24 hours
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const tours = await db
    .select()
    .from(appointments)
    .where(
      and(
        gte(appointments.appointmentDate, tomorrow),
        lte(appointments.appointmentDate, dayAfter),
        eq(appointments.reminderSent, 0),
        sql`${appointments.status} IN ('pending', 'confirmed')`
      )
    );

  for (const tour of tours) {
    await sendTourReminderEmail({
      // ... tour details
    });

    // Mark reminder as sent
    await db
      .update(appointments)
      .set({ reminderSent: 1 })
      .where(eq(appointments.id, tour.id));
  }
}
```

## UI Components

### TourScheduler Component

Located at: `client/src/pages/TourScheduler.tsx`

**Features:**
- Property details sidebar
- Tour type selection (radio buttons)
- Date picker (14-day window)
- Time slot grid
- Notes textarea
- Booking summary card
- Loading states
- Error handling

### MyTours Component

Located at: `client/src/pages/MyTours.tsx`

**Features:**
- Upcoming tours section
- Past tours section
- Tour status badges
- Property images
- Tour details display
- Cancel tour dialog
- Empty states

## Integration Points

### Property Detail Page

Add "Schedule Tour" button to property detail page:

```tsx
import { Link } from 'wouter';

<Link href={`/property/${propertyId}/schedule-tour`}>
  <Button size="lg">
    <Calendar className="h-5 w-5 mr-2" />
    Schedule Tour
  </Button>
</Link>
```

### Dashboard

Add "My Tours" link to user dashboard:

```tsx
<Link href="/my-tours">
  <Button variant="outline">
    <Calendar className="h-4 w-4 mr-2" />
    My Tours
  </Button>
</Link>
```

### Navigation

Add to main navigation:

```tsx
<Link href="/my-tours">
  My Tours
</Link>
```

## Testing

### Manual Testing

1. **Book In-Person Tour**
   - Select property
   - Choose in-person tour
   - Select date and time
   - Add notes
   - Confirm booking
   - Verify confirmation email

2. **Book Virtual Tour**
   - Select property
   - Choose virtual tour
   - Select date and time
   - Confirm booking
   - Verify meeting link generated

3. **Cancel Tour**
   - Go to My Tours
   - Click Cancel on upcoming tour
   - Provide reason
   - Confirm cancellation
   - Verify cancellation email

4. **View Tours**
   - Check upcoming tours display
   - Check past tours display
   - Verify status badges
   - Test empty states

### Automated Testing

```typescript
// Test tour booking
const result = await trpc.tours.bookTour.mutate({
  propertyId: 1,
  appointmentDate: new Date('2025-01-20T14:00:00Z').toISOString(),
  duration: 60,
  tourType: 'in_person',
  notes: 'Interested in the backyard',
});

expect(result.success).toBe(true);
expect(result.appointmentId).toBeGreaterThan(0);

// Test tour cancellation
const cancelResult = await trpc.tours.cancelTour.mutate({
  appointmentId: result.appointmentId,
  reason: 'Schedule conflict',
});

expect(cancelResult.success).toBe(true);
```

## Future Enhancements

- [ ] Recurring availability patterns
- [ ] Buffer time between tours
- [ ] Multi-agent property support
- [ ] Tour feedback and ratings
- [ ] Automated rescheduling
- [ ] SMS reminders
- [ ] Video tour recording
- [ ] Tour notes and photos
- [ ] Agent calendar sync (two-way)
- [ ] Waitlist for fully booked dates
- [ ] Group tour scheduling
- [ ] Open house management
- [ ] Tour analytics and reporting

## Troubleshooting

### No Available Slots

**Cause:** Agent has no availability configured for the selected day.

**Solution:** 
1. Check agent availability in database
2. Add availability for the day of week
3. Ensure `isAvailable` is set to 1

### Meeting Link Not Generated

**Cause:** Virtual tour integration not configured.

**Solution:**
1. Integrate with Zoom/Google Meet API
2. Update meeting link generation in `tours.ts`
3. Store API credentials in environment variables

### Emails Not Sending

**Cause:** Email service not configured.

**Solution:**
1. Integrate with SendGrid/AWS SES/Mailgun
2. Update email functions in `emailService.ts`
3. Configure SMTP settings

### Double Bookings

**Cause:** Race condition in slot checking.

**Solution:**
1. Add database constraint on `(agentId, appointmentDate)`
2. Use database transactions
3. Implement optimistic locking

## Resources

- [FullCalendar Documentation](https://fullcalendar.io/docs)
- [iCalendar RFC](https://tools.ietf.org/html/rfc5545)
- [Zoom API](https://marketplace.zoom.us/docs/api-reference/zoom-api)
- [Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [SendGrid Email API](https://docs.sendgrid.com/api-reference/mail-send/mail-send)
