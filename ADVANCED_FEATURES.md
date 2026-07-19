# Advanced Features Implementation Guide

This document provides detailed implementation guides for advanced platform features including appointment scheduling and buyer journey tracking.

---

## Appointment Scheduling System

### Overview
Enable buyers to schedule property viewings with agents through an integrated calendar system with automated reminders and Google Calendar sync.

### Database Schema

```sql
CREATE TABLE appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propertyId INT NOT NULL,
  buyerId INT NOT NULL,
  agentId INT,
  appointmentDate DATETIME NOT NULL,
  duration INT DEFAULT 60, -- minutes
  status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
  notes TEXT,
  reminderSent BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (propertyId) REFERENCES properties(id),
  FOREIGN KEY (buyerId) REFERENCES users(id),
  FOREIGN KEY (agentId) REFERENCES agents(id)
);

CREATE TABLE agentAvailability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agentId INT NOT NULL,
  dayOfWeek INT NOT NULL, -- 0-6 (Sunday-Saturday)
  startTime TIME NOT NULL,
  endTime TIME NOT NULL,
  isAvailable BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (agentId) REFERENCES agents(id)
);
```

### Implementation Steps

#### 1. Install Dependencies

```bash
pnpm add @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
pnpm add date-fns googleapis nodemailer
```

#### 2. Create Calendar Component

```tsx
// client/src/components/AppointmentCalendar.tsx
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function AppointmentCalendar({ propertyId, agentId }: { propertyId: number; agentId?: number }) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [notes, setNotes] = useState('');

  const { data: appointments } = trpc.appointments.list.useQuery({ propertyId });
  const { data: availability } = trpc.appointments.agentAvailability.useQuery({ agentId });
  
  const bookAppointment = trpc.appointments.create.useMutation({
    onSuccess: () => {
      toast.success('Appointment requested! Agent will confirm shortly.');
      setShowBookingDialog(false);
      setNotes('');
    },
    onError: () => {
      toast.error('Failed to book appointment');
    }
  });

  const handleDateClick = (arg: any) => {
    setSelectedDate(new Date(arg.dateStr));
    setShowBookingDialog(true);
  };

  const handleBooking = () => {
    if (!selectedDate) return;
    
    bookAppointment.mutate({
      propertyId,
      agentId,
      appointmentDate: selectedDate,
      duration: 60,
      notes,
    });
  };

  const events = appointments?.map(apt => ({
    id: apt.id.toString(),
    title: apt.status === 'confirmed' ? 'Viewing Scheduled' : 'Pending Confirmation',
    start: apt.appointmentDate,
    end: new Date(new Date(apt.appointmentDate).getTime() + apt.duration * 60000),
    backgroundColor: apt.status === 'confirmed' ? '#10b981' : '#f59e0b',
  })) || [];

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={events}
        dateClick={handleDateClick}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        businessHours={availability?.map(av => ({
          daysOfWeek: [av.dayOfWeek],
          startTime: av.startTime,
          endTime: av.endTime,
        }))}
      />

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Property Viewing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Date & Time</label>
              <Input
                type="datetime-local"
                value={selectedDate?.toISOString().slice(0, 16)}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific requirements or questions..."
              />
            </div>
            <Button onClick={handleBooking} className="w-full">
              Request Appointment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

#### 3. API Endpoints

```typescript
// server/routers.ts - Add appointments router
appointments: router({
  list: publicProcedure
    .input(z.object({ 
      propertyId: z.number().optional(),
      agentId: z.number().optional(),
      buyerId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return await db.getAppointments(input);
    }),

  create: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
      agentId: z.number().optional(),
      appointmentDate: z.date(),
      duration: z.number().default(60),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const appointmentId = await db.createAppointment({
        ...input,
        buyerId: ctx.user.id,
        status: 'pending',
      });

      // Send email notification to agent
      await sendAppointmentNotification({
        appointmentId,
        type: 'new_request',
      });

      return { id: appointmentId };
    }),

  confirm: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.updateAppointment(input.id, { status: 'confirmed' });
      
      // Send confirmation email to buyer
      const appointment = await db.getAppointmentById(input.id);
      await sendAppointmentConfirmation(appointment);
      
      return { success: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      await db.updateAppointment(input.id, { 
        status: 'cancelled',
        notes: input.reason 
      });
      
      // Send cancellation notification
      const appointment = await db.getAppointmentById(input.id);
      await sendAppointmentCancellation(appointment);
      
      return { success: true };
    }),

  agentAvailability: publicProcedure
    .input(z.object({ agentId: z.number().optional() }))
    .query(async ({ input }) => {
      if (!input.agentId) return [];
      return await db.getAgentAvailability(input.agentId);
    }),

  setAvailability: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      availability: z.array(z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string(),
        endTime: z.string(),
        isAvailable: z.boolean(),
      })),
    }))
    .mutation(async ({ input }) => {
      await db.setAgentAvailability(input.agentId, input.availability);
      return { success: true };
    }),
}),
```

#### 4. Email Notifications

```typescript
// server/integrations/email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendAppointmentNotification({ appointmentId, type }: { 
  appointmentId: number; 
  type: 'new_request' | 'confirmed' | 'cancelled' | 'reminder';
}) {
  const appointment = await db.getAppointmentById(appointmentId);
  const property = await db.getPropertyById(appointment.propertyId);
  const buyer = await db.getUserById(appointment.buyerId);
  const agent = appointment.agentId ? await db.getAgentById(appointment.agentId) : null;

  const templates = {
    new_request: {
      subject: `New Viewing Request - ${property.title}`,
      html: `
        <h2>New Property Viewing Request</h2>
        <p>A buyer has requested to view: <strong>${property.title}</strong></p>
        <p><strong>Requested Date:</strong> ${new Date(appointment.appointmentDate).toLocaleString()}</p>
        <p><strong>Buyer:</strong> ${buyer.name} (${buyer.email})</p>
        <p><strong>Notes:</strong> ${appointment.notes || 'None'}</p>
        <p><a href="${process.env.APP_URL}/appointments/${appointmentId}">View & Confirm</a></p>
      `,
    },
    confirmed: {
      subject: `Viewing Confirmed - ${property.title}`,
      html: `
        <h2>Your Property Viewing is Confirmed!</h2>
        <p><strong>Property:</strong> ${property.title}</p>
        <p><strong>Address:</strong> ${property.addressLine1}, ${property.city}</p>
        <p><strong>Date & Time:</strong> ${new Date(appointment.appointmentDate).toLocaleString()}</p>
        <p><strong>Agent:</strong> ${agent?.name || 'Property Owner'}</p>
        <p>We look forward to showing you this property!</p>
      `,
    },
    reminder: {
      subject: `Reminder: Property Viewing Tomorrow`,
      html: `
        <h2>Reminder: Property Viewing Tomorrow</h2>
        <p>This is a friendly reminder about your upcoming property viewing:</p>
        <p><strong>Property:</strong> ${property.title}</p>
        <p><strong>Date & Time:</strong> ${new Date(appointment.appointmentDate).toLocaleString()}</p>
        <p><strong>Address:</strong> ${property.addressLine1}, ${property.city}</p>
        <p>See you tomorrow!</p>
      `,
    },
  };

  const template = templates[type];
  const recipient = type === 'new_request' ? agent?.email : buyer.email;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: recipient,
    subject: template.subject,
    html: template.html,
  });
}
```

#### 5. Google Calendar Integration

```typescript
// server/integrations/googleCalendar.ts
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function addToGoogleCalendar(appointment: any) {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const event = {
    summary: `Property Viewing - ${appointment.property.title}`,
    location: `${appointment.property.addressLine1}, ${appointment.property.city}`,
    description: `Property viewing appointment\n\nNotes: ${appointment.notes || 'None'}`,
    start: {
      dateTime: new Date(appointment.appointmentDate).toISOString(),
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: new Date(new Date(appointment.appointmentDate).getTime() + appointment.duration * 60000).toISOString(),
      timeZone: 'America/New_York',
    },
    attendees: [
      { email: appointment.buyer.email },
      { email: appointment.agent?.email },
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 },
      ],
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });

  return response.data;
}
```

#### 6. Reminder Cron Job

```typescript
// server/jobs/appointmentReminders.ts
import cron from 'node-cron';

// Run every hour to check for appointments in the next 24 hours
cron.schedule('0 * * * *', async () => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const appointments = await db.getUpcomingAppointments(tomorrow);

  for (const appointment of appointments) {
    if (!appointment.reminderSent) {
      await sendAppointmentNotification({
        appointmentId: appointment.id,
        type: 'reminder',
      });
      
      await db.updateAppointment(appointment.id, { reminderSent: true });
    }
  }
});
```

### Environment Variables

```env
# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Real Estate Platform <noreply@yourdomain.com>"

# Google Calendar API
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

---

## Buyer Journey Tracking

### Overview
Track user behavior across the platform to provide personalized recommendations and help agents identify serious buyers.

### Database Schema

```sql
CREATE TABLE userActivity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  sessionId VARCHAR(255),
  activityType ENUM('view', 'search', 'favorite', 'inquiry', 'comparison', 'download') NOT NULL,
  propertyId INT,
  searchQuery JSON,
  metadata JSON,
  duration INT, -- seconds spent on activity
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (propertyId) REFERENCES properties(id),
  INDEX idx_user_activity (userId, timestamp),
  INDEX idx_session (sessionId, timestamp)
);

CREATE TABLE buyerProfiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL UNIQUE,
  preferredLocations JSON, -- ['Lagos', 'Abuja']
  priceRange JSON, -- {min: 50000000, max: 100000000}
  preferredPropertyTypes JSON, -- ['detached', 'semi-detached']
  minBedrooms INT,
  minBathrooms INT,
  preferredAmenities JSON, -- ['pool', 'gym', 'security']
  intentScore INT DEFAULT 0, -- 0-100
  lastActive TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE buyerIntentSignals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  signalType ENUM('repeat_view', 'long_view', 'favorite', 'inquiry', 'comparison', 'download_docs', 'mortgage_calc') NOT NULL,
  propertyId INT,
  weight INT DEFAULT 1, -- Signal strength
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (propertyId) REFERENCES properties(id)
);
```

### Implementation Steps

#### 1. Activity Tracking Middleware

```typescript
// client/src/hooks/useActivityTracker.ts
import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';

export function useActivityTracker(activityType: string, metadata?: any) {
  const startTime = useRef(Date.now());
  const trackActivity = trpc.analytics.trackActivity.useMutation();

  useEffect(() => {
    return () => {
      const duration = Math.floor((Date.now() - startTime.current) / 1000);
      
      trackActivity.mutate({
        activityType,
        metadata,
        duration,
      });
    };
  }, [activityType, metadata]);
}

// Usage in PropertyDetail.tsx
export default function PropertyDetail() {
  const { id } = useParams();
  useActivityTracker('view', { propertyId: id });
  
  // ... rest of component
}
```

#### 2. Search Query Tracking

```typescript
// In Properties.tsx, track search filters
const handleSearch = () => {
  trpc.analytics.trackActivity.mutate({
    activityType: 'search',
    searchQuery: {
      city,
      propertyType,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
    },
  });
  
  // Perform search...
};
```

#### 3. Intent Scoring Algorithm

```typescript
// server/analytics/intentScoring.ts
export async function calculateBuyerIntent(userId: number): Promise<number> {
  const signals = await db.getBuyerIntentSignals(userId);
  
  const weights = {
    repeat_view: 5,        // Viewed same property multiple times
    long_view: 3,          // Spent >5 minutes on property
    favorite: 10,          // Added to favorites
    inquiry: 20,           // Contacted agent
    comparison: 15,        // Compared properties
    download_docs: 12,     // Downloaded documents
    mortgage_calc: 18,     // Used mortgage calculator
  };
  
  let score = 0;
  const recentSignals = signals.filter(s => 
    new Date(s.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
  );
  
  for (const signal of recentSignals) {
    score += weights[signal.signalType] * signal.weight;
  }
  
  // Normalize to 0-100
  return Math.min(100, score);
}
```

#### 4. Buyer Profile Generation

```typescript
// server/analytics/profileGeneration.ts
export async function generateBuyerProfile(userId: number) {
  const activities = await db.getUserActivities(userId, 90); // Last 90 days
  
  // Extract preferences from activity
  const viewedProperties = activities
    .filter(a => a.activityType === 'view' && a.propertyId)
    .map(a => a.propertyId);
  
  const properties = await Promise.all(
    viewedProperties.map(id => db.getPropertyById(id))
  );
  
  // Analyze patterns
  const locations = properties.map(p => p.city);
  const preferredLocations = getMostFrequent(locations, 3);
  
  const prices = properties.map(p => p.price);
  const priceRange = {
    min: Math.min(...prices) * 0.8,
    max: Math.max(...prices) * 1.2,
  };
  
  const propertyTypes = properties.map(p => p.propertyType);
  const preferredPropertyTypes = getMostFrequent(propertyTypes, 2);
  
  const bedrooms = properties.map(p => p.bedrooms).filter(Boolean);
  const minBedrooms = Math.min(...bedrooms);
  
  const intentScore = await calculateBuyerIntent(userId);
  
  await db.upsertBuyerProfile({
    userId,
    preferredLocations,
    priceRange,
    preferredPropertyTypes,
    minBedrooms,
    intentScore,
    lastActive: new Date(),
  });
}

function getMostFrequent<T>(arr: T[], count: number): T[] {
  const frequency = arr.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([item]) => item as T);
}
```

#### 5. Personalized Recommendations

```typescript
// server/routers.ts - Add to properties router
personalizedRecommendations: protectedProcedure
  .input(z.object({ limit: z.number().default(10) }))
  .query(async ({ ctx, input }) => {
    const profile = await db.getBuyerProfile(ctx.user.id);
    
    if (!profile) {
      // Return popular properties if no profile exists
      return await db.getPopularProperties(input.limit);
    }
    
    // Find properties matching buyer profile
    const recommendations = await db.searchProperties({
      cities: profile.preferredLocations,
      propertyTypes: profile.preferredPropertyTypes,
      minPrice: profile.priceRange.min,
      maxPrice: profile.priceRange.max,
      minBedrooms: profile.minBedrooms,
      status: 'active',
      limit: input.limit,
    });
    
    // Score and rank recommendations
    const scored = recommendations.map(property => {
      let score = 0;
      
      // Location match
      if (profile.preferredLocations.includes(property.city)) score += 30;
      
      // Price range match
      if (property.price >= profile.priceRange.min && property.price <= profile.priceRange.max) {
        score += 25;
      }
      
      // Property type match
      if (profile.preferredPropertyTypes.includes(property.propertyType)) score += 20;
      
      // Bedrooms match
      if (property.bedrooms >= profile.minBedrooms) score += 15;
      
      // Recency bonus
      const daysOld = (Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld < 7) score += 10;
      
      return { ...property, recommendationScore: score };
    });
    
    return scored.sort((a, b) => b.recommendationScore - a.recommendationScore);
  }),
```

#### 6. Agent Lead Dashboard

```tsx
// client/src/pages/AgentLeads.tsx
export default function AgentLeads() {
  const { data: leads } = trpc.analytics.getQualifiedLeads.useQuery();
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Qualified Leads</h1>
      
      <div className="grid gap-4">
        {leads?.map(lead => (
          <Card key={lead.userId}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{lead.userName}</CardTitle>
                  <CardDescription>{lead.userEmail}</CardDescription>
                </div>
                <Badge variant={lead.intentScore > 70 ? "default" : "secondary"}>
                  Intent: {lead.intentScore}/100
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Interested in:</strong> {lead.preferredLocations.join(', ')}
                </div>
                <div>
                  <strong>Budget:</strong> ₦{lead.priceRange.min.toLocaleString()} - ₦{lead.priceRange.max.toLocaleString()}
                </div>
                <div>
                  <strong>Recent Activity:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {lead.recentActivities.map((activity, i) => (
                      <li key={i}>{activity}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Last Active:</strong> {new Date(lead.lastActive).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/messages?user=${lead.userId}`}>Contact Lead</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Privacy Considerations

- Implement GDPR/privacy compliance
- Allow users to opt-out of tracking
- Provide data export and deletion
- Anonymous tracking for non-logged-in users
- Clear privacy policy

### Testing Checklist

- [ ] Activity tracking fires correctly
- [ ] Search queries are logged accurately
- [ ] Intent scores calculate properly
- [ ] Buyer profiles generate from activity
- [ ] Recommendations are relevant
- [ ] Agent dashboard shows qualified leads
- [ ] Privacy controls work
- [ ] Performance impact is minimal

---

## Integration Priority

**Phase 1 (Immediate):**
1. Basic activity tracking (views, searches)
2. Simple appointment booking form
3. Email notifications for appointments

**Phase 2 (Short-term):**
4. Calendar integration
5. Buyer profile generation
6. Intent scoring

**Phase 3 (Long-term):**
7. Google Calendar sync
8. Advanced personalization
9. Agent lead qualification dashboard

---

## Performance Optimization

- Use background jobs for profile generation
- Cache buyer profiles with Redis
- Batch activity tracking to reduce DB writes
- Index activity tables by userId and timestamp
- Archive old activity data (>1 year)
