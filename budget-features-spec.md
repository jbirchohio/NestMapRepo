# Budget Features Specification for Remvana
## Making Travel Planning Accessible for All Income Levels

### 🎯 Core Budget Features

#### 1. **Trip Budget Setting & Tracking**
```typescript
// Add to trip creation/edit
interface TripBudget {
  totalBudget: number;
  currency: string;
  categories: {
    accommodation: number;
    transportation: number;
    food: number;
    activities: number;
    shopping: number;
    emergency: number;
  };
  spent: number;
  remaining: number;
  dailyAverage: number;
}
```

**Visual Implementation:**
- Progress bar showing spent vs remaining
- Color coding: Green (under), Yellow (80-90%), Red (over)
- Daily spending pace indicator
- "You're spending $X per day, budget allows $Y"

#### 2. **Activity Cost Tracking**
```typescript
// Extend activity model
interface ActivityCost {
  estimated: number;
  actual?: number;
  category: 'transport' | 'food' | 'accommodation' | 'entertainment' | 'shopping';
  notes?: string;
  splitBetween?: number; // for group trips
  paid?: boolean;
}
```

**Features:**
- Quick cost entry per activity
- Running total in sidebar
- "Mark as paid" checkbox
- Cost per person for groups
- Receipt photo attachment

#### 3. **Smart Budget Suggestions**

**Free/Cheap Activity Finder:**
- "Free things to do near [location]"
- Public parks, markets, viewpoints
- Free museum days
- Walking tours (pay-what-you-want)
- Beach/hiking trail access

**Budget Alternative Suggestions:**
- When adding expensive restaurant: "Similar cuisine for less: [suggestions]"
- "This museum is free on Tuesdays"
- "Consider this hostel 10 min away - saves $80/night"
- "Take the bus instead of taxi - saves $30"

#### 4. **Price Comparison Integration**
```typescript
interface PriceComparison {
  activity: string;
  providers: [
    {
      name: string; // GetYourGuide, Viator, Official Site
      price: number;
      url: string;
      includes: string[];
    }
  ];
  savings: number;
  recommendation: string;
}
```

**Implementation:**
- Automatic price fetching for common activities
- "Book direct and save" notifications
- Group discount detection
- Off-season pricing alerts

#### 5. **Budget Templates & Presets**

**Pre-configured Budget Levels:**
- **Backpacker**: $30-50/day
- **Budget**: $50-100/day  
- **Comfort**: $100-200/day
- **Luxury**: $200+/day

**Smart Distribution:**
```javascript
// Auto-allocate budget based on trip type
function suggestBudgetAllocation(totalBudget, tripDays, tripType) {
  const dailyBudget = totalBudget / tripDays;
  
  const allocations = {
    'city': { accommodation: 0.4, food: 0.25, activities: 0.25, transport: 0.1 },
    'beach': { accommodation: 0.5, food: 0.2, activities: 0.2, transport: 0.1 },
    'adventure': { accommodation: 0.3, food: 0.2, activities: 0.35, transport: 0.15 },
    'cultural': { accommodation: 0.35, food: 0.2, activities: 0.3, transport: 0.15 }
  };
  
  return allocations[tripType];
}
```

#### 6. **Money-Saving AI Assistant**

**Prompts to Add:**
- "Find me free activities in [city] for [date]"
- "Where do locals eat cheap in [neighborhood]"
- "Optimize my itinerary to minimize transport costs"
- "Find hostels near these attractions under $40"
- "What's the cheapest way to get from A to B"

**Cost Alerts:**
- "This area is tourist-priced. Try [local area] instead"
- "Booking 2 weeks ahead could save ~30%"
- "Consider visiting in [month] - 40% cheaper"
- "Split this Uber with others on your trip"

#### 7. **Visual Budget Dashboard**

```typescript
interface BudgetDashboard {
  // Main metrics
  totalBudget: number;
  totalSpent: number;
  daysRemaining: number;
  projectedOverUnder: number;
  
  // Breakdowns
  spentByCategory: PieChart;
  dailySpending: LineChart;
  biggestExpenses: ExpenseItem[];
  savingsAchieved: number;
  
  // Warnings
  overBudgetCategories: string[];
  unusualExpenses: ExpenseItem[];
}
```

**Visual Elements:**
- Spending heatmap calendar
- Category pie charts
- Daily spending trend line
- "Biggest expenses" list
- Savings achievements badges

#### 8. **Group Budget Features**

**Split Management:**
- Who owes whom
- Settle up calculator
- Expense assignment
- Uneven splits (couple + single)
- Payment tracking

**Shared Budget Pool:**
- Group budget vs individual budgets
- Contribution tracking
- Shared expenses vs personal
- Automatic split calculations

#### 9. **Deal Discovery**

**Integration Points:**
- Groupon activities API
- Happy hour finders
- Market day schedules
- Free event calendars
- Student/senior discounts
- City tourist cards worth calculator

**Notifications:**
- "Flash sale on this activity"
- "20% off if booked today"
- "Group discount available (need 2 more)"
- "Free concert near your hotel tonight"

#### 10. **Export & Reports**

**Budget Reports:**
- PDF budget breakdown
- Expense CSV export
- Charts for trip recap
- Cost per person summary
- Category analysis

### 💰 Monetization Without Subscriptions

#### **One-Time Purchases:**
1. **Budget Template Packs** ($4.99)
   - "Europe on $50/day"
   - "Southeast Asia Backpacker"
   - "USA Road Trip Budget Guide"

2. **Premium Budget Features** ($9.99 lifetime)
   - Advanced analytics
   - Historical spending patterns
   - Predictive budgeting
   - Custom categories

3. **Group Trip Tools** ($14.99 lifetime)
   - Unlimited group members
   - Advanced splitting options
   - Venmo/PayPal integration
   - Settlement reminders

#### **Commission-Based:**
- Affiliate links to budget accommodations
- Hostel bookings (higher commission)
- Budget airline referrals
- Travel insurance for budget travelers
- Multi-city transport passes

#### **Template Marketplace:**
- "Paris on $75/day" templates
- "Family of 4 Disney Budget"
- "Month in Thailand for $1000"
- Created by actual budget travelers
- $2-5 per template

### 📊 Implementation Priority

**Phase 1 (Essential):**
1. Basic budget setting on trips
2. Cost field on activities
3. Running total display
4. Simple spent/remaining tracker

**Phase 2 (Valuable):**
1. Category breakdowns
2. Free activity suggestions
3. Budget warning system
4. Basic group splitting

**Phase 3 (Differentiating):**
1. AI money-saving suggestions
2. Price comparison engine
3. Deal discovery
4. Advanced analytics

### 🎯 Technical Implementation

**Database Changes:**
```sql
-- Add to trips table
ALTER TABLE trips ADD COLUMN total_budget DECIMAL(10,2);
ALTER TABLE trips ADD COLUMN budget_currency VARCHAR(3) DEFAULT 'USD';

-- Add to activities table  
ALTER TABLE activities ADD COLUMN estimated_cost DECIMAL(10,2);
ALTER TABLE activities ADD COLUMN actual_cost DECIMAL(10,2);
ALTER TABLE activities ADD COLUMN cost_category VARCHAR(20);
ALTER TABLE activities ADD COLUMN split_between INTEGER DEFAULT 1;

-- New budget_categories table
CREATE TABLE budget_categories (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
  category VARCHAR(20),
  allocated DECIMAL(10,2),
  spent DECIMAL(10,2)
);
```

**UI Components Needed:**
- Budget progress bar
- Expense input modal
- Category pie chart
- Daily spending line chart
- Budget warning badges
- Cost splitter interface

### 🎨 UI/UX Approach

**Non-Intrusive Design:**
- Budget bar at top (collapsible)
- Optional cost fields (not required)
- Subtle color coding
- Quick-add expense button
- Hide budget features if not set

**Encouraging, Not Shaming:**
- "Great job staying on budget!"
- "You saved $X with these choices"
- "Smart traveler" badges
- No red alerts unless requested
- Focus on value, not restriction

This approach makes Remvana inclusive for ALL travelers, not just those with unlimited budgets.