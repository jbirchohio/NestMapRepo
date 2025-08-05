# Remvana B2B Pivot Plan

## Executive Summary

Pivoting from consumer trip planning to **"The Modern Corporate Travel Management Platform"** while retaining human-centric features that make business travel better.

**Vision**: Corporate travel management that doesn't suck - combining compliance with quality of life.

**Target Market**: SMB to mid-market companies (50-1000 employees) who are outgrowing spreadsheets but aren't ready for Concur's complexity.

---

## Phase 1: Foundation (Weeks 1-4)

### Branding & Messaging

1. **Rename to "Remvana"** (already in progress)
   - Tagline: "Corporate Travel That Just Works"
   - Secondary: "Compliance Meets Convenience"

2. **Update Landing Page**
   - Hero: "Book compliant. Travel human."
   - Features focus on ROI + employee satisfaction
   - Add "Book a Demo" as primary CTA
   - Create separate "For Teams" and "For Travelers" sections

### Core Travel Workflow

**Keep & Enhance:**
- ✅ Itinerary builder (rebrand as "Travel Planner")
- ✅ Activity management (position as "Meeting & Appointment Scheduler")
- ✅ Map view (emphasize "Navigate between meetings")
- ✅ Time optimization (focus on "Minimize transit time")

**Reframe Consumer Features for Business:**
```
Old: "Add a morning coffee stop"
New: "Schedule client breakfast"

Old: "Find tourist attractions"  
New: "Discover client entertainment options"

Old: "Weather-based activities"
New: "Weather alerts for travel disruptions"
```

### Database Schema Updates

```sql
-- Add business context to existing tables
ALTER TABLE trips ADD COLUMN trip_purpose VARCHAR(255);
ALTER TABLE trips ADD COLUMN cost_center VARCHAR(100);
ALTER TABLE trips ADD COLUMN requires_approval BOOLEAN DEFAULT true;
ALTER TABLE trips ADD COLUMN approved_by INTEGER REFERENCES users(id);
ALTER TABLE trips ADD COLUMN approval_date TIMESTAMP;

ALTER TABLE activities ADD COLUMN activity_type ENUM('meeting', 'meal', 'transport', 'accommodation', 'personal');
ALTER TABLE activities ADD COLUMN is_billable BOOLEAN DEFAULT false;
ALTER TABLE activities ADD COLUMN client_id INTEGER REFERENCES organizations(id);

-- New tables for B2B
CREATE TABLE travel_policies (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id),
  policy_name VARCHAR(255),
  policy_rules JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE approval_workflows (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER REFERENCES trips(id),
  approver_id INTEGER REFERENCES users(id),
  status ENUM('pending', 'approved', 'rejected'),
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Phase 2: B2B Features (Weeks 5-8)

### 1. Smart Booking Assistant

**Transform existing AI for business context:**

```javascript
// Old approach
"What do you want to do in Paris?"

// New approach
"I'll help plan your Paris business trip. What's the primary purpose?"
- Client meeting → Find hotels near client office
- Conference → Book near venue, add networking events
- Team offsite → Group bookings, meeting spaces
```

### 2. Expense Integration

**Leverage existing activity structure:**
- Each activity can have expense attached
- Auto-categorize based on activity type
- Receipt upload to existing activity cards
- Export to QuickBooks/Expensify format

### 3. Approval Workflows

```javascript
// Trip creation flow
1. Create trip (existing)
2. Add flights/hotels (existing)
3. NEW: Submit for approval
4. NEW: Manager reviews on dashboard
5. NEW: Approved → Bookings confirmed
```

### 4. Travel Policy Engine

**AI-powered policy compliance:**
```javascript
// Natural language policies
"Flights must be booked 14+ days in advance"
"Hotels max $200/night, except NYC/SF ($300)"
"Business class allowed for flights over 6 hours"

// Real-time enforcement
if (flightPrice > policy.limit) {
  showWarning("This exceeds policy by $150. Add justification?")
}
```

---

## Phase 3: The Human Touch (Weeks 9-12)

### Keep the Joy in Business Travel

1. **Smart Downtime Planning**
   ```
   "You have 3 hours between meetings. Suggestions:"
   - Work from hotel lounge
   - Visit nearby gym (you usually exercise Tuesdays)
   - Recommended lunch spot with WiFi
   ```

2. **Team Experiences**
   ```
   "Team dinner options near hotel:"
   - Filtered by: Dietary restrictions, price range, private dining
   - One-click reservation for 8 people
   - Automatic expense categorization
   ```

3. **Wellness Features**
   ```
   - Jet lag optimizer (existing time zone handling)
   - Running routes near hotel
   - Healthy meal options flagged
   - Meditation spaces/quiet work areas
   ```

---

## Technical Implementation Plan

### Week 1-2: Rebranding
- [ ] Update logo, colors, fonts
- [ ] Rewrite landing page copy
- [ ] Add "Request Demo" flow
- [ ] Create pricing page

### Week 3-4: Core Adjustments
- [ ] Add trip purpose to creation flow
- [ ] Rename consumer terminology
- [ ] Add expense fields to activities
- [ ] Create manager dashboard

### Week 5-6: Approval System
- [ ] Build approval workflow UI
- [ ] Add email notifications
- [ ] Create approval dashboard
- [ ] Add policy override mechanism

### Week 7-8: Policy Engine
- [ ] Natural language policy parser
- [ ] Real-time compliance checking
- [ ] Policy violation reporting
- [ ] Approval justification system

### Week 9-10: Integrations
- [ ] QuickBooks export
- [ ] Calendar sync (existing)
- [ ] Slack notifications
- [ ] Email reports

### Week 11-12: Polish
- [ ] Onboarding flow
- [ ] Demo data/mode
- [ ] Sales materials
- [ ] Customer success tools

---

## What We're NOT Changing

1. **Itinerary Builder** - Just rebrand as "Travel Planner"
2. **Activity Management** - Perfect for meetings + downtime
3. **Map Integration** - Essential for navigating cities
4. **AI Assistance** - Refocus on business context
5. **Mobile Support** - Critical for travelers

---

## Migration Strategy

### For Existing Users
1. Email: "Exciting changes coming to Remvana"
2. Grandfather personal accounts at special rate
3. Offer business upgrade path
4. Keep consumer features in "Personal" mode

### For New Users
1. Default to business mode
2. Onboarding focuses on team setup
3. Demo with business scenarios
4. Free trial with full features

---

## Success Metrics

### Month 1
- 10 beta customers
- 50% complete approval workflow
- Basic policy engine working

### Month 3  
- 50 paying customers
- $25K MRR
- 3 integration partners
- <2 hour onboarding

### Month 6
- 200 customers
- $100K MRR
- Series A ready
- Market leader in SMB segment

---

## Competitive Advantages

1. **Modern UX** - Concur looks like 2005
2. **AI-First** - Natural language everything
3. **Human-Centric** - Travel is more than compliance
4. **Fast Setup** - Hours not months
5. **Fair Pricing** - No hidden fees or percentages

---

## The Pitch

"Remvana is Slack for corporate travel. Your team will actually want to use it.

- **For Finance**: Cut travel costs by 20% with smart policies
- **For Managers**: Approve trips in one click
- **For Travelers**: Book like consumer apps, expense automatically
- **For Admins**: Set up in hours, not months

We keep the humanity in business travel while ensuring compliance. Because great business happens when people meet in person - we just make getting there easier."

---

## Next Steps

1. Get buy-in on this plan
2. Set up development sprints
3. Recruit 10 beta customers
4. Build MVP of approval flow
5. Start selling!

**Remember**: We're not removing features, we're recontextualizing them for business use. The magic is in making compliance feel effortless while keeping travel human.