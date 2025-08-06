# Creator Payout API Setup Guide

## Quick Start (Recommended Path)

### Option 1: Tremendous (Easiest - Recommended for MVP)
**Best for:** Quick setup, multiple payout methods, low barrier to entry

1. **Sign Up**: https://app.tremendous.com/signup
2. **Get API Key**: 
   - Dashboard → Settings → API Keys
   - Create a new API key
3. **Add to .env**:
   ```
   TREMENDOUS_API_KEY=YOUR_API_KEY
   TREMENDOUS_MODE=sandbox
   ```
4. **Test in Sandbox**: Free sandbox with $5,000 test credits
5. **Go Live**: Add payment method, instant approval

**Pros:**
- ✅ Instant approval
- ✅ PayPal, gift cards, bank transfers
- ✅ No monthly fees
- ✅ Great API docs

**Cons:**
- ❌ 3-5% transaction fees
- ❌ $10 minimum payout

---

## Alternative Options

### Option 2: Stripe Connect (Best if using Stripe for payments)
**Best for:** Unified payment/payout system

1. **Enable Connect**: https://dashboard.stripe.com/connect/overview
2. **Get OAuth Client ID**: 
   - Settings → Connect → Platform Settings
3. **Add to .env**:
   ```
   STRIPE_CONNECT_CLIENT_ID=ca_xxx
   ```
4. **Onboard Creators**: Use Stripe's onboarding flow
5. **Test**: Use test mode first

**Pros:**
- ✅ Integrated with payment processing
- ✅ Handles tax forms (1099s)
- ✅ Global coverage
- ✅ Instant payouts available

**Cons:**
- ❌ 0.25% + $0.25 per payout
- ❌ Complex onboarding
- ❌ Creators need Stripe accounts

---

### Option 3: PayPal Payouts (Traditional choice)
**Best for:** Creators who prefer PayPal

1. **Developer Account**: https://developer.paypal.com
2. **Create App**: 
   - Dashboard → My Apps → Create App
   - Select "Merchant" type
3. **Enable Payouts**:
   - App settings → Features → Enable Payouts
4. **Add to .env**:
   ```
   PAYPAL_CLIENT_ID=YOUR_CLIENT_ID
   PAYPAL_CLIENT_SECRET=YOUR_SECRET
   PAYPAL_MODE=sandbox
   ```
5. **Production Requirements**:
   - Business account
   - May need to contact PayPal for approval
   - Maintain balance for payouts

**Pros:**
- ✅ Widely accepted
- ✅ International support
- ✅ Instant transfers

**Cons:**
- ❌ Business account required
- ❌ 2% fee (max $20 USD)
- ❌ Approval can take weeks
- ❌ Hold funds for compliance

---

### Option 4: Wise (Best for international)
**Best for:** Global creator base

1. **API Access**: https://api.wise.com
2. **Create API Token**: 
   - Settings → API tokens
3. **Add to .env**:
   ```
   WISE_API_TOKEN=YOUR_TOKEN
   WISE_PROFILE_ID=YOUR_PROFILE_ID
   ```

**Pros:**
- ✅ Best exchange rates
- ✅ 170+ countries
- ✅ Transparent fees

**Cons:**
- ❌ Business verification required
- ❌ No gift cards
- ❌ Setup complexity

---

### Option 5: Amazon Incentives API (Enterprise only)
**Best for:** Large platforms with high volume

1. **Apply**: https://developer.amazon.com/incentives-api
2. **Requirements**:
   - Registered business
   - $10,000+ monthly volume
   - 2-4 week approval
3. **After Approval**:
   ```
   AMAZON_INCENTIVES_ACCESS_KEY=YOUR_KEY
   AMAZON_INCENTIVES_SECRET_KEY=YOUR_SECRET
   AMAZON_INCENTIVES_PARTNER_ID=YOUR_ID
   ```

**Pros:**
- ✅ Amazon gift cards globally
- ✅ Bulk processing
- ✅ Enterprise support

**Cons:**
- ❌ High barrier to entry
- ❌ 5-7% fees
- ❌ Long approval process
- ❌ Minimum volume requirements

---

## Testing Payouts Locally

### Without Real APIs
The app works without payout APIs configured:
1. Creators can request payouts (stored in database)
2. Admin can manually process payouts
3. Track everything for when you add APIs

### Mock Testing
Add to `.env` for testing:
```
PAYOUT_MOCK_MODE=true
```

This will:
- Simulate successful payouts
- Generate fake transaction IDs
- Allow full flow testing

---

## Implementation Priority

1. **Start with:** Manual payouts (current setup)
2. **MVP:** Add Tremendous for automation
3. **Scale:** Migrate to Stripe Connect
4. **Enterprise:** Add multiple options

---

## Cost Comparison

| Provider | Setup Fee | Transaction Fee | Minimum | Speed |
|----------|-----------|----------------|---------|-------|
| Tremendous | $0 | 3-5% | $10 | Instant |
| Stripe Connect | $0 | 0.25% + $0.25 | $0.50 | 1-2 days |
| PayPal | $0 | 2% (max $20) | $1 | Instant |
| Wise | $0 | ~0.5-2% | $1 | 1-3 days |
| Amazon | $0 | 5-7% | $5 | Instant |

---

## Quick Decision Tree

```
Do you already use Stripe for payments?
  ├─ Yes → Use Stripe Connect
  └─ No → Do you need instant setup?
      ├─ Yes → Use Tremendous
      └─ No → Is PayPal important to creators?
          ├─ Yes → Use PayPal Payouts
          └─ No → Use Tremendous
```

---

## Security Notes

1. **Never commit API keys** - Use environment variables
2. **Use webhook signatures** - Verify all callbacks
3. **Implement rate limiting** - Prevent abuse
4. **Log all transactions** - For auditing
5. **Use sandbox first** - Test thoroughly
6. **Implement 2FA** - For payout requests
7. **Set daily limits** - Prevent large fraud

---

## Support & Documentation

- **Tremendous**: https://developers.tremendous.com
- **Stripe Connect**: https://stripe.com/docs/connect
- **PayPal**: https://developer.paypal.com/docs/payouts
- **Wise**: https://api-docs.wise.com
- **Amazon**: https://developer.amazon.com/docs/incentives-api

---

## Need Help?

Start with Tremendous in sandbox mode - it's the fastest path to a working payout system. You can always migrate to other providers as you scale.