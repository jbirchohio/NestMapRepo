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

### **Admin Dashboard Implementation** `/admin-dashboard`

#### **Access & Security**
- **Route**: `/admin-dashboard` (accessible via sidebar navigation)
- **Authentication**: Super admin role required (`role: 'super_admin'`)
- **Security**: All API endpoints protected with organization-scoped access control

#### **Dashboard Interface Overview**
The admin dashboard provides four main tabs for complete white label management:

```typescript
interface AdminDashboardTabs {
  organizations: "Organization Management",
  requests: "Pending White Label Requests", 
  domains: "Custom Domain Management",
  billing: "White Label Billing"
}
```

### **Tab 1: Organization Management**

#### **Organization Table View**
**API Endpoint**: `GET /api/admin/organizations`

| Column | Data | Actions Available |
|--------|------|------------------|
| Organization | Name + ID | View details |
| Plan | Current subscription tier | Upgrade/downgrade |
| White Label | Current white label plan | Enable/disable |
| Status | Subscription status | Monitor billing |
| Actions | Quick controls | Plan changes, disable |

#### **Organization Management Actions**

**Enable White Label for Organization**:
```typescript
const handleEnableWhiteLabel = (org: Organization) => {
  updateOrgMutation.mutate({
    orgId: org.id,
    updates: {
      white_label_enabled: true,
      white_label_plan: 'basic'
    }
  });
};
```

**Upgrade/Downgrade Plans**:
- Dropdown selector with Basic/Premium/Enterprise options
- Immediate plan changes via `PATCH /api/admin/organizations/{orgId}`
- Real-time UI updates with React Query cache invalidation

**Disable White Label**:
- One-click disable with confirmation
- Reverts organization to standard NestMap branding
- Maintains data but removes white label features

### **Tab 2: Pending White Label Requests**

#### **Request Review Interface**
**API Endpoint**: `GET /api/admin/white-label-requests`

**Request Table Columns**:
- Organization name and requester details
- Request type (branding, domain, custom features)
- Creation date and current status
- Review actions (Approve/Reject with notes)

#### **Request Review Workflow**

**Review Dialog Interface**:
1. **Request Details**: Full JSON view of request data
2. **Organization Context**: Company information and current plan
3. **Review Notes**: Optional admin comments
4. **Approval Actions**: Approve or reject with reasoning

```typescript
const handleReviewRequest = (request: WhiteLabelRequest, status: 'approved' | 'rejected', notes?: string) => {
  reviewRequestMutation.mutate({
    requestId: request.id,
    status,
    notes
  });
};
```

**Post-Approval Actions**:
- Automatic organization white label enablement
- Email notification to requester
- Billing activation (if Stripe configured)
- Access to white label configuration panel

### **Tab 3: Custom Domain Management**

#### **Domain Verification Interface**
**API Endpoint**: `GET /api/admin/custom-domains`

**Domain Status Tracking**:
- DNS verification status (CNAME record validation)
- SSL certificate status (Let's Encrypt integration)
- Domain activation timeline
- Organization assignment and routing

#### **Domain Verification Process**

**Manual Verification Trigger**:
```typescript
const verifyDomainMutation = useMutation({
  mutationFn: async (domainId: number) => {
    return apiRequest("POST", `/api/admin/domains/${domainId}/verify`);
  }
});
```

**Verification Steps Display**:
1. DNS record configuration instructions
2. Real-time verification status checking
3. SSL certificate provisioning progress
4. Domain activation confirmation

### **Tab 4: White Label Billing**

#### **Billing Plan Overview Cards**
- **Basic Plan ($29/month)**: Logo, colors, 10 users, email support
- **Professional ($99/month)**: + custom domain, premium support, 50 users
- **Enterprise ($299/month)**: + API access, unlimited users, dedicated support

#### **Stripe Integration Requirements**
**Configuration Notice**: 
> "To enable white label billing, you need to configure Stripe API keys. This will allow automatic subscription management and payment processing."

**Required Environment Variables**:
- `STRIPE_SECRET_KEY`: For payment processing
- `STRIPE_WEBHOOK_SECRET`: For subscription event handling
- `STRIPE_PUBLISHABLE_KEY`: For frontend payment forms

### **Revenue Model Architecture**

#### **Database Schema**
```sql
organizations:
  - white_label_enabled: boolean
  - white_label_plan: 'basic' | 'premium' | 'enterprise'
  - subscription_status: 'active' | 'past_due' | 'canceled'
  - monthly_price: integer (in cents)

white_label_requests:
  - organization_id: integer
  - requested_by: integer (user_id)
  - request_type: 'branding' | 'domain' | 'features'
  - request_data: jsonb
  - status: 'pending' | 'approved' | 'rejected'
```

#### **Ongoing Billing Operations**
- **Subscription Monitoring**: Real-time status tracking in organization table
- **Usage Analytics**: User count and feature usage per organization
- **Automated Billing**: Stripe webhook integration for payment events
- **Plan Migrations**: Seamless upgrades/downgrades with prorated billing

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

## **5. ADMIN DASHBOARD ACCESS & TENANT MONITORING**

### **Accessing the Admin Dashboard**

#### **Navigation Path**
1. Login as super admin user (`role: 'super_admin'`)
2. Navigate to sidebar menu
3. Click "Admin Dashboard" link
4. Direct URL: `https://your-domain.com/admin-dashboard`

#### **Creating Super Admin Users**
```sql
-- Update existing user to super admin
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'admin@yourcompany.com';

-- Or create new super admin
INSERT INTO users (email, password_hash, role, display_name)
VALUES ('admin@yourcompany.com', 'hashed_password', 'super_admin', 'Platform Administrator');
```

### **Tenant Activity Monitoring**

#### **Real-Time Organization Metrics**
The admin dashboard provides comprehensive tenant monitoring capabilities:

**Organization Overview Table**:
- Total organizations registered
- Active white label subscriptions
- Revenue metrics per organization
- User count and activity levels
- Subscription status monitoring

**Key Performance Indicators**:
```typescript
interface TenantMetrics {
  totalOrganizations: number;
  activeWhiteLabelClients: number;
  monthlyRecurringRevenue: number;
  averageUsersPerOrg: number;
  churnRate: number;
  pendingRequests: number;
}
```

#### **Activity Monitoring Features**

**Organization Health Dashboard**:
- Login frequency and user engagement
- Trip creation and completion rates
- Feature usage analytics (maps, AI, proposals)
- Storage usage and API call metrics
- Payment status and billing health

**White Label Request Pipeline**:
- Request submission rate and trends
- Approval/rejection analytics
- Time to activation metrics
- Popular feature requests

**Domain Management Monitoring**:
- DNS verification success rates
- SSL certificate renewal tracking
- Custom domain usage statistics
- Domain configuration issues

### **Administrative Operations**

#### **Bulk Organization Management**
```typescript
// Enable white label for multiple organizations
const bulkEnableWhiteLabel = async (orgIds: number[], plan: string) => {
  for (const orgId of orgIds) {
    await apiRequest("PATCH", `/api/admin/organizations/${orgId}`, {
      white_label_enabled: true,
      white_label_plan: plan
    });
  }
};
```

#### **Automated Monitoring Alerts**
- Failed payment notifications
- Domain verification failures
- High usage threshold warnings
- Subscription cancellation alerts
- Security incident reporting

#### **Data Export & Reporting**
- Organization usage reports (CSV/PDF)
- Revenue analytics with trends
- White label adoption metrics
- Custom domain utilization reports
- User engagement statistics

### **Security & Audit Trail**

#### **Admin Action Logging**
All admin dashboard actions are automatically logged:
```sql
CREATE TABLE admin_audit_log (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER REFERENCES users(id),
  action_type VARCHAR NOT NULL,
  target_organization_id INTEGER,
  action_data JSONB,
  ip_address INET,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

**Tracked Actions**:
- White label enablement/disablement
- Plan upgrades and downgrades
- Request approvals and rejections
- Domain verification activities
- Billing modifications

#### **Access Control Matrix**
| Role | Organizations | Requests | Domains | Billing | Audit Logs |
|------|--------------|----------|---------|---------|------------|
| super_admin | Full access | Full access | Full access | Full access | Read/Write |
| admin | Own org only | Own org only | Own org only | Read only | Read only |
| user | None | None | None | None | None |

---

## **6. WHITE LABEL DOMAIN SETUP**

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