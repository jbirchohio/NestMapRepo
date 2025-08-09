# Stripe Webhook Setup Guide

## Overview
Stripe webhooks provide secure, real-time payment verification and handle edge cases like refunds, disputes, and failed payments automatically.

## Setup Instructions

### 1. Local Development (using Stripe CLI)

Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

The CLI will display your webhook signing secret:
```
> Ready! Your webhook signing secret is whsec_xxxxx (^C to quit)
```

Add this to your `.env` file:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 2. Production Setup (Railway)

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your endpoint URL:
   ```
   https://your-app.up.railway.app/api/webhooks/stripe
   ```
4. Select events to listen for:
   - `payment_intent.succeeded` ✅ (Required)
   - `payment_intent.payment_failed` ✅ (Required)
   - `charge.refunded` (Recommended)
   - `charge.dispute.created` (Recommended)

5. Copy the signing secret and add to Railway environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_production_secret_here
   ```

## Webhook Events Handled

### `payment_intent.succeeded`
- Creates purchase record in database
- Updates template sales count
- Updates seller balance
- Copies template to buyer's trips
- Handles idempotency (prevents duplicate purchases)

### `payment_intent.payment_failed`
- Logs failed payment attempts
- Can trigger notification emails (optional)

### `charge.refunded`
- Updates purchase status to "refunded"
- Decreases template sales count
- Adjusts seller balance
- Prevents negative balances

### `charge.dispute.created`
- Marks purchase as disputed
- Moves seller earnings to pending
- Notifies admin for resolution

## Security Features

1. **Signature Verification**: All webhooks are verified using Stripe's signature
2. **Idempotency**: Duplicate events are safely ignored
3. **Atomic Transactions**: Database updates are wrapped in transactions
4. **Error Recovery**: Failed webhook processing can be retried
5. **Audit Trail**: All events are logged with metadata

## Testing Webhooks

### Test Successful Payment:
```bash
stripe trigger payment_intent.succeeded
```

### Test Failed Payment:
```bash
stripe trigger payment_intent.payment_failed
```

### Test Refund:
```bash
stripe trigger charge.refunded
```

## Monitoring

Check webhook status in Stripe Dashboard:
- View success/failure rates
- Review event logs
- Retry failed webhooks
- Monitor endpoint health

## Troubleshooting

### Common Issues:

1. **Signature verification failed**
   - Ensure `STRIPE_WEBHOOK_SECRET` is correct
   - Check raw body is being captured correctly
   - Verify no proxy is modifying the request

2. **Webhook timing out**
   - Ensure database queries are optimized
   - Add indexes for frequently queried fields
   - Consider async processing for heavy operations

3. **Duplicate purchases**
   - Check idempotency logic
   - Ensure `stripe_payment_intent_id` has unique constraint
   - Review webhook retry settings

## Benefits

- **Reliability**: Payments verified server-side
- **Security**: Can't be spoofed by clients
- **Automation**: Handles edge cases automatically
- **Compliance**: Audit trail for disputes
- **Scalability**: Async processing reduces latency