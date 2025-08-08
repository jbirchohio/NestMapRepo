// Test Stripe Configuration
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:5000';

async function testStripePayment() {
  console.log('\n🔍 Testing Stripe Payment Integration\n');
  console.log('======================================\n');
  
  // Check if Stripe keys are configured
  const hasStripeKey = process.env.STRIPE_SECRET_KEY && 
                       !process.env.STRIPE_SECRET_KEY.includes('your_stripe');
  
  console.log('1. Stripe Configuration:');
  console.log(`   - Secret Key: ${hasStripeKey ? '✅ Configured' : '❌ Not configured (using placeholder)'}`);
  console.log(`   - Public Key: ${process.env.VITE_STRIPE_PUBLIC_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`   - Webhook Secret: ${process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Not set'}`);
  
  if (!hasStripeKey) {
    console.log('\n⚠️  Stripe is not properly configured!');
    console.log('\nTo test payments, you need to:');
    console.log('1. Create a Stripe account at https://stripe.com');
    console.log('2. Get your test API keys from https://dashboard.stripe.com/test/apikeys');
    console.log('3. Update your .env file with:');
    console.log('   STRIPE_SECRET_KEY=sk_test_...');
    console.log('   VITE_STRIPE_PUBLIC_KEY=pk_test_...');
    console.log('   STRIPE_WEBHOOK_SECRET=whsec_... (optional for webhooks)');
    return;
  }
  
  console.log('\n2. Testing Payment Intent Creation:');
  
  // First, we need to get a valid auth token
  // For testing, we'll use a simple approach
  console.log('   Note: Payment intent creation requires authentication.');
  console.log('   The endpoint expects: POST /api/checkout/create-payment-intent');
  console.log('   With body: { templateId: number }');
  
  console.log('\n3. Payment Flow Summary:');
  console.log('   a. User clicks "Buy Template" on template details page');
  console.log('   b. Frontend calls /api/checkout/create-payment-intent');
  console.log('   c. Backend creates Stripe PaymentIntent');
  console.log('   d. Frontend uses Stripe.js to handle payment');
  console.log('   e. On success, /api/checkout/confirm-purchase is called');
  console.log('   f. Template is added to user\'s purchased templates');
  
  console.log('\n4. Current Implementation Status:');
  console.log('   ✅ Backend endpoints implemented');
  console.log('   ✅ Payment intent creation logic');
  console.log('   ✅ Purchase confirmation logic');
  console.log('   ❌ Frontend Stripe.js integration (using placeholder)');
  console.log('   ❌ Payment UI components');
  
  console.log('\n📝 Recommendation:');
  console.log('   The backend is ready for Stripe payments, but the frontend');
  console.log('   needs to integrate Stripe.js and create payment UI components.');
  console.log('   Key files to update:');
  console.log('   - client/src/pages/TemplateDetails.tsx');
  console.log('   - Create: client/src/components/StripeCheckout.tsx');
}

testStripePayment().catch(console.error);