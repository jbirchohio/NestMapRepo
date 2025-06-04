# NestMap Stripe Billing System Documentation

## Overview
Complete enterprise billing system with real Stripe integration for subscription management, plan upgrades/downgrades, and refund processing.

## Current Configuration
- **Stripe Mode**: Test mode (sk_test_*)
- **Team Plan**: $199/month 
- **Enterprise Plan**: $499/month
- **Database**: PostgreSQL with audit logging
- **Frontend**: React with real-time billing UI

## Architecture

### Backend Components
1. **Stripe Integration** (`server/stripe.ts`)
   - Customer creation and management
   - Subscription lifecycle management
   - Plan upgrade/downgrade functionality
   - Refund processing

2. **Billing Routes** (`server/routes/superadmin.ts`)
   - `POST /api/superadmin/billing/:orgId/upgrade`
   - `POST /api/superadmin/billing/:orgId/downgrade` 
   - `POST /api/superadmin/billing/:orgId/suspend`
   - `POST /api/superadmin/billing/:orgId/reactivate`
   - `POST /api/superadmin/billing/:orgId/refund`

3. **Database Schema** (`shared/schema.ts`)
   - Organizations table with Stripe metadata
   - Audit logging for all billing operations
   - Subscription status tracking

### Frontend Components
1. **Billing Management UI** (`client/src/pages/SuperadminOrganizationDetail.tsx`)
   - Plan upgrade/downgrade dialogs
   - Billing suspension controls
   - Refund processing interface
   - Real-time status updates

## Functionality

### Plan Management
- **Free Plan**: Basic features, no Stripe subscription
- **Team Plan**: $199/month with full collaboration features
- **Enterprise Plan**: $499/month with advanced features

### Billing Operations
1. **Upgrade Process**:
   - Creates Stripe customer if needed
   - Generates subscription with appropriate price ID
   - Updates organization plan in database
   - Logs audit trail

2. **Downgrade Process**:
   - Updates Stripe subscription or cancels if downgrading to free
   - Modifies organization plan
   - Maintains billing history

3. **Refund Processing**:
   - Retrieves latest invoice from Stripe
   - Processes refund through Stripe API
   - Records refund details with audit logging

### Security Features
- Superadmin role requirement for all billing operations
- Comprehensive audit logging with admin user tracking
- Input validation and error handling
- Secure API key management

## Environment Variables Required
```
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_PRICE_ID_TEAM=price_... (Team plan price ID)
STRIPE_PRICE_ID_ENTERPRISE=price_... (Enterprise plan price ID)
VITE_STRIPE_PUBLIC_KEY=pk_test_... (Frontend publishable key)
```

## Test Mode Setup
For testing, create products in Stripe test dashboard:
1. Team Plan at $199/month
2. Enterprise Plan at $499/month
3. Copy test mode price IDs to environment variables

## Production Readiness
- Complete error handling and validation
- Audit logging for compliance
- Real-time UI updates
- Stripe webhook support ready for implementation
- Scalable architecture supporting multiple organizations

## API Testing
Use the billing test endpoint to verify configuration:
```
GET /api/superadmin/billing/test-stripe
```

This returns complete system status including Stripe connectivity, price validation, and endpoint availability.