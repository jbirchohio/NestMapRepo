# **NestMap White Label Service & Billing Guide**

*Complete implementation guide for white label setup, enterprise billing, and travel agent invoicing workflows*

---

## **1. WHITE LABEL SERVICE FOR USERS**

### **Setup Process**

#### **Initial White Label Request**
1. **Organization Admin** accesses Admin Dashboard
2. Navigate to "White Label" tab
3. Submit white label request with:
   - Request type (branding, domain, features)
   - Business justification
   - Contact information
   - Preferred plan tier

#### **Available White Label Plans**

| Feature | Basic ($29/mo) | Professional ($99/mo) | Enterprise ($299/mo) |
|---------|----------------|----------------------|---------------------|
| Custom Logo | ✅ | ✅ | ✅ |
| Color Customization | ✅ | ✅ | ✅ |
| Custom Domain | ❌ | ✅ | ✅ |
| Remove "Powered by NestMap" | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ✅ |
| Max Users | 10 | 50 | Unlimited |
| Support Level | Email | Priority | Dedicated |

### **Configuration Interface**

#### **Branding Settings** (`WhiteLabelContext`)
```typescript
interface WhiteLabelConfig {
  // Company Identity
  companyName: string;
  companyLogo?: string;
  favicon?: string;
  tagline?: string;
  
  // Visual Branding
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  
  // Domain & Contact
  customDomain?: string;
  supportEmail?: string;
  helpUrl?: string;
  
  // Feature Controls
  enableGuestMode: boolean;
  enablePublicSignup: boolean;
  enableSocialLogin: boolean;
  enableMobileApp: boolean;
  
  // Legal & Footer
  companyWebsite?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  footerText?: string;
}
```

#### **Real-time Branding Application**
- **CSS Variables**: Automatically updates `--primary`, `--secondary`, `--accent` colors
- **Document Title**: Dynamic title based on company name
- **Favicon**: Custom favicon support
- **LocalStorage**: Persistent configuration across sessions

---

## **2. NESTMAP OWNER → ENTERPRISE CLIENT BILLING**

### **Revenue Model Architecture**

#### **Subscription Management**
```sql
organizations:
  - plan: 'basic' | 'professional' | 'enterprise'
  - white_label_enabled: boolean
  - white_label_plan: string
  - subscription_status: 'active' | 'past_due' | 'canceled'
  - monthly_price: integer (in cents)
```

#### **Billing Workflow**

**Step 1: White Label Request Processing**
1. Enterprise client submits request via Admin Dashboard
2. NestMap admin reviews request in `/api/admin/white-label-requests`
3. Approval triggers subscription creation
4. Automatic Stripe subscription setup (requires Stripe integration)

**Step 2: Subscription Activation**
```typescript
// Admin Dashboard Actions
handleEnableWhiteLabel(org: Organization) {
  updateOrgMutation.mutate({
    orgId: org.id,
    updates: {
      white_label_enabled: true,
      white_label_plan: 'basic'  // or selected plan
    }
  });
}
```

**Step 3: Ongoing Billing**
- **Monthly Recurring**: Automatic Stripe subscription charges
- **Usage Monitoring**: Track user count, API calls, storage usage
- **Plan Upgrades**: Self-service plan changes in Admin Dashboard
- **Invoice Generation**: Automatic PDF invoices with white label branding

#### **Enterprise Client Management**

**Admin Dashboard Features**:
- View all organization subscriptions
- Approve/deny white label requests
- Upgrade/downgrade plans
- Monitor usage and billing status
- Generate custom invoices

---

## **3. TRAVEL AGENT → CLIENT INVOICING WORKFLOW**

### **Proposal Generation System**

#### **Client Proposal Creation**
```typescript
// Proposal Data Structure
const proposalData = {
  trip: TripDetails,
  activities: Activity[],
  clientName: string,
  agentName: string,
  companyName: string,  // White label company name
  estimatedCost: number,
  costBreakdown: {
    flights: number,
    hotels: number,
    activities: number,
    meals: number,
    transportation: number,
    miscellaneous: number
  },
  proposalNotes: string,
  validUntil: Date,
  contactInfo: {
    email: string,
    phone?: string,
    website?: string
  }
};
```

#### **Professional PDF Generation**
- **Template Engine**: Handlebars with professional layout
- **Branded Design**: Uses organization's white label settings
- **Cost Breakdown**: Detailed expense categories
- **Terms & Conditions**: Customizable proposal terms
- **Digital Delivery**: Email integration with tracking

### **Client Invoicing Process**

#### **Step 1: Trip Booking Confirmation**
1. Travel agent creates trip proposal
2. Client approves proposal via email/platform
3. Agent converts proposal to booking
4. Invoice automatically generated

#### **Step 2: Invoice Generation**
```typescript
// Invoice Creation (extends proposal system)
const invoiceData = {
  ...proposalData,
  invoiceNumber: generateInvoiceNumber(),
  issueDate: new Date(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  paymentTerms: "Net 30",
  taxRate: organizationTaxRate,
  discounts: appliedDiscounts
};
```

#### **Step 3: Payment Processing**
- **Stripe Integration**: Secure payment processing
- **Payment Links**: Email-embedded payment buttons
- **Invoice Tracking**: Status monitoring (sent, viewed, paid)
- **Automatic Reminders**: Follow-up email sequences

---

## **4. BILLING IMPLEMENTATION DETAILS**

### **Database Schema**

#### **Organization Billing Table**
```sql
CREATE TABLE organization_billing (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id),
  subscription_id VARCHAR,  -- Stripe subscription ID
  customer_id VARCHAR,      -- Stripe customer ID
  plan_type VARCHAR,
  billing_cycle VARCHAR,
  next_billing_date DATE,
  amount_cents INTEGER,
  currency VARCHAR DEFAULT 'USD',
  status VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **Invoice Management**
```sql
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER,
  trip_id INTEGER,
  invoice_number VARCHAR UNIQUE,
  client_name VARCHAR,
  agent_id INTEGER,
  amount_cents INTEGER,
  tax_amount_cents INTEGER,
  total_amount_cents INTEGER,
  status VARCHAR, -- 'draft', 'sent', 'paid', 'overdue'
  issue_date DATE,
  due_date DATE,
  paid_date DATE,
  stripe_payment_intent_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Payment Integration**

#### **Stripe Configuration** (requires API keys)
```typescript
// Payment processing setup
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create payment intent for invoice
async function createPaymentIntent(invoiceId: number) {
  const invoice = await getInvoice(invoiceId);
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: invoice.total_amount_cents,
    currency: 'usd',
    metadata: {
      invoice_id: invoiceId,
      organization_id: invoice.organization_id
    }
  });
  
  return paymentIntent;
}
```

---

## **5. WHITE LABEL DOMAIN SETUP**

### **Custom Domain Configuration**

#### **DNS Requirements**
```
CNAME: travel.clientcompany.com → nestmap-production.domain.com
TXT: _nestmap-verification=abc123def456  (for ownership verification)
```

#### **SSL Certificate Management**
- **Automatic**: Let's Encrypt integration
- **Custom**: Upload client-provided certificates
- **Wildcard**: Support for subdomain routing

#### **Domain Verification Process**
1. Client adds DNS records
2. NestMap admin initiates verification via `/api/admin/domains/{id}/verify`
3. Automatic SSL provisioning
4. White label branding activation

---

## **6. IMPLEMENTATION CHECKLIST**

### **For NestMap Owners**
- [ ] Configure Stripe API keys for subscription billing
- [ ] Set up SendGrid for invoice email delivery
- [ ] Implement domain verification system
- [ ] Create admin billing dashboard
- [ ] Set up automated subscription management

### **For Travel Agents**
- [ ] Configure organization white label settings
- [ ] Set up client proposal templates
- [ ] Integrate payment processing
- [ ] Configure invoice numbering system
- [ ] Set up automated email workflows

### **For Enterprise Clients**
- [ ] Submit white label request with business requirements
- [ ] Provide custom domain and SSL requirements
- [ ] Configure payment methods for subscription
- [ ] Set up user management and permissions
- [ ] Train team on white label features

---

## **7. REVENUE OPTIMIZATION**

### **Pricing Strategy**
- **Basic Plan**: $29/month - entry-level branding for small agencies
- **Professional**: $99/month - full branding with custom domain
- **Enterprise**: $299/month - complete white label with API access

### **Upselling Opportunities**
1. **User Limits**: Charge per additional user beyond plan limits
2. **API Calls**: Usage-based pricing for enterprise integrations
3. **Custom Features**: Bespoke development for large clients
4. **Professional Services**: Setup and training packages

### **Client Retention Features**
- **Annual Discounts**: 20% discount for annual billing
- **Volume Pricing**: Enterprise rates for large user counts
- **White Glove Onboarding**: Dedicated setup for premium clients
- **24/7 Support**: Priority support for enterprise plans

---

*This guide provides the complete framework for NestMap's white label service and billing operations, enabling scalable B2B revenue growth through travel agency partnerships.*