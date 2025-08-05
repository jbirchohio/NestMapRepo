# Remvana Technical Pivot Guide

## Quick Reference Implementation Checklist

### 🎯 Week 1: Rebranding Sprint

#### Frontend Changes
```typescript
// 1. Update client/src/components/Header.tsx
- "Remvana" → "Remvana"
- "Plan. Pin. Wander." → "Corporate Travel That Just Works"

// 2. Update client/src/pages/Home.tsx
- Hero: "Travel Reimagined" → "Book Compliant. Travel Human."
- Add "For Teams" and "For Travelers" sections
- Change "Create New Trip" → "Plan Business Trip"
- Add "Request Demo" button

// 3. Update theme colors (client/src/index.css)
- Primary: Professional blue #2563EB
- Secondary: Trust green #10B981
- Accent: Premium gold #F59E0B
```

#### Backend Changes
```typescript
// server/routes/index.ts
- Add /api/demo-request endpoint
- Add /api/organizations/onboarding endpoint
```

### 🔧 Week 2: Core Terminology Updates

#### Global Find & Replace
```
"trip" → "business trip" (in UI only)
"activities" → "appointments" (in business context)
"tourist" → "local" 
"sightseeing" → "exploration"
"weather activities" → "weather considerations"
```

#### Component Renames
```
TripTemplates.tsx → TravelPolicyTemplates.tsx
ShareTripModal.tsx → ShareItineraryModal.tsx
ActivityModal.tsx → AppointmentModal.tsx (add meeting type)
```

### 💼 Week 3-4: Business Features

#### 1. Update Trip Creation Modal
```typescript
// client/src/components/NewTripModal.tsx
// Add these fields:
- tripPurpose: "Client Meeting" | "Conference" | "Team Offsite" | "Sales Call"
- requiresApproval: boolean
- costCenter: string
- estimatedBudget: number

// Remove/Hide:
- Trip templates section
- Social sharing options
```

#### 2. Add Manager Dashboard
```typescript
// New file: client/src/pages/ManagerDashboard.tsx
- Pending approvals list
- Team travel calendar
- Budget overview
- Policy violations
```

#### 3. Update Activity Types
```typescript
// shared/schema.ts
// Modify activities table:
activityType: enum(['meeting', 'meal', 'transport', 'lodging', 'personal'])
isBillable: boolean
clientName: string (optional)
expenseAmount: decimal
receiptUrl: string
```

### 🤖 Week 5-6: AI Refactoring

#### Transform AI Prompts
```typescript
// server/routes/ai.ts

// OLD:
"Suggest fun activities in ${city}"

// NEW:
"Suggest appropriate business dining options near ${meetingLocation} for ${numberOfPeople} people with ${dietaryRestrictions}"

// ADD:
"Find convenient hotels near ${clientOffice} under ${policyLimit} per night"
"Recommend flight times to arrive ${hoursBeforeMeeting} hours before ${meetingTime}"
```

#### Policy Engine
```typescript
// New file: server/services/policyEngine.ts
interface TravelPolicy {
  flightBookingWindow: number; // days
  hotelMaxRate: Record<string, number>; // city -> max rate
  requiresApproval: (trip: Trip) => boolean;
  allowedAirlines: string[];
  mealAllowances: Record<MealType, number>;
}
```

### 📊 Week 7-8: Reporting & Compliance

#### Expense Integration
```typescript
// server/routes/expenses.ts
POST /api/trips/:tripId/expenses
GET /api/reports/expenses?startDate&endDate
POST /api/expenses/export/quickbooks
```

#### Approval Workflow
```typescript
// server/routes/approvals.ts
POST /api/trips/:tripId/submit-for-approval
PUT /api/approvals/:approvalId/approve
PUT /api/approvals/:approvalId/reject
GET /api/approvals/pending
```

### 🔄 Week 9-10: Integration Layer

#### Calendar Sync (Existing + Enhanced)
```typescript
// Enhance existing calendar integration:
- Auto-create calendar events for flights
- Add meeting rooms to appointments
- Sync with Outlook/Google Calendar
```

#### New Integrations
```typescript
// server/integrations/
- slack.ts (notifications)
- quickbooks.ts (expense export)
- concur.ts (migration tool)
```

### 🎨 Week 11-12: Polish Phase

#### Onboarding Flow
```typescript
// client/src/pages/Onboarding.tsx
1. Company info
2. Travel policy setup (wizard)
3. Invite team members
4. Connect integrations
5. Book first trip
```

#### Demo Mode
```typescript
// server/middleware/demoMode.ts
- Pre-populated company: "Acme Corp"
- Sample trips with various statuses
- Pending approvals
- Policy violations examples
- ROI dashboard
```

---

## Database Migration Scripts

```sql
-- Run these migrations in order:

-- 1. Add business fields
ALTER TABLE trips 
ADD COLUMN trip_purpose VARCHAR(50),
ADD COLUMN requires_approval BOOLEAN DEFAULT true,
ADD COLUMN cost_center VARCHAR(50),
ADD COLUMN total_budget DECIMAL(10,2),
ADD COLUMN approved_by INTEGER REFERENCES users(id),
ADD COLUMN approved_at TIMESTAMP,
ADD COLUMN approval_notes TEXT;

-- 2. Update activities for business
ALTER TABLE activities
ADD COLUMN activity_type VARCHAR(20) DEFAULT 'meeting',
ADD COLUMN is_billable BOOLEAN DEFAULT false,
ADD COLUMN expense_amount DECIMAL(10,2),
ADD COLUMN receipt_url TEXT,
ADD COLUMN client_name VARCHAR(255);

-- 3. Create new tables
CREATE TABLE travel_policies (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  rules JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE approval_requests (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id),
  requested_by INTEGER NOT NULL REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  decided_at TIMESTAMP
);

CREATE TABLE expense_reports (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id),
  total_amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'draft',
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  export_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Configuration Updates

### Environment Variables
```bash
# Add to .env
COMPANY_NAME="Remvana"
ENABLE_B2B_FEATURES=true
DEMO_MODE_ENABLED=true
QUICKBOOKS_CLIENT_ID=xxx
QUICKBOOKS_CLIENT_SECRET=xxx
SLACK_WEBHOOK_URL=xxx
DEFAULT_APPROVAL_REQUIRED=true
DEFAULT_BOOKING_WINDOW_DAYS=14
```

### Feature Flags
```typescript
// server/config/features.ts
export const features = {
  b2bMode: process.env.ENABLE_B2B_FEATURES === 'true',
  personalMode: true, // Keep for existing users
  approvalWorkflow: true,
  expenseTracking: true,
  policyEngine: true,
  teamFeatures: true,
  consumerTemplates: false,
  weatherActivities: false, // Disable for B2B
  socialSharing: false
};
```

---

## UI/UX Quick Wins

### 1. Business-Friendly Colors
```css
:root {
  --primary: #2563EB; /* Professional blue */
  --secondary: #10B981; /* Success green */
  --accent: #F59E0B; /* Premium gold */
  --danger: #EF4444; /* Warning red */
  --muted: #6B7280; /* Corporate gray */
}
```

### 2. Language Updates
```typescript
// Common replacements
const businessLanguage = {
  'activities': 'appointments',
  'fun things to do': 'recommended venues',
  'tourist spots': 'points of interest',
  'vacation': 'business trip',
  'traveler': 'team member',
  'guest': 'external attendee'
};
```

### 3. Icon Updates
```typescript
// Replace playful icons with professional ones
'🏖️' → '✈️' (flights)
'🎉' → '🤝' (meetings)  
'🍹' → '🍽️' (business dining)
'🎯' → '📊' (objectives)
```

---

## Testing Checklist

### Before Launch
- [ ] Approval workflow works end-to-end
- [ ] Expenses calculate correctly
- [ ] Policies enforce properly
- [ ] Integrations connect
- [ ] Demo mode impresses
- [ ] Onboarding takes <10 minutes
- [ ] Mobile works for approvals
- [ ] Email notifications send
- [ ] Reports export cleanly
- [ ] ROI calculator accurate

### User Acceptance Tests
1. **Admin**: Set up company in 10 minutes
2. **Manager**: Approve trip on mobile
3. **Traveler**: Book compliant trip easily
4. **Finance**: Export clean expense report
5. **Sales**: Demo converts prospects

---

## Rollout Strategy

### Phase 1: Soft Launch (Week 1)
- Internal team testing
- 5 friendly beta customers
- Gather feedback
- Fix critical bugs

### Phase 2: Beta (Week 2-4)
- 25 beta customers
- Onboarding feedback
- Feature requests
- Pricing validation

### Phase 3: GA (Week 5+)
- Public launch
- Product Hunt
- Press release
- Sales outreach

---

## Remember

**We're not killing features, we're recontextualizing them:**

- Weather → Travel disruption alerts
- Activities → Meetings + approved downtime
- Map → Navigate between appointments
- AI → Smart business assistant
- Optimization → Minimize transit time

The goal is to make corporate travel feel as easy as personal travel, while adding the compliance and reporting that businesses need.

**The magic is in the details** - every interaction should feel professional yet human.