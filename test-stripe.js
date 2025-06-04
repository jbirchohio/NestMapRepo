import { stripe, SUBSCRIPTION_PLANS, createStripeCustomer, createSubscription } from './server/stripe.ts';

async function testStripeIntegration() {
  console.log('Testing Stripe Integration...');
  
  try {
    // Test 1: Check subscription plans configuration
    console.log('\n1. Subscription Plans:');
    console.log(JSON.stringify(SUBSCRIPTION_PLANS, null, 2));
    
    // Test 2: Test Stripe connection
    console.log('\n2. Testing Stripe Connection...');
    const balance = await stripe.balance.retrieve();
    console.log('Stripe balance retrieved successfully:', balance.object);
    
    // Test 3: Test customer creation
    console.log('\n3. Testing Customer Creation...');
    const testCustomer = await createStripeCustomer(
      'test@example.com',
      'Test Organization'
    );
    console.log('Customer created:', testCustomer.id);
    
    // Test 4: Test subscription creation (Team plan)
    if (SUBSCRIPTION_PLANS.team.stripePriceId) {
      console.log('\n4. Testing Team Subscription Creation...');
      const teamSubscription = await createSubscription(
        testCustomer.id,
        SUBSCRIPTION_PLANS.team.stripePriceId
      );
      console.log('Team subscription created:', teamSubscription.id);
      console.log('Subscription status:', teamSubscription.status);
      
      // Cancel test subscription
      await stripe.subscriptions.cancel(teamSubscription.id);
      console.log('Test subscription cancelled');
    }
    
    // Test 5: Test subscription creation (Enterprise plan)
    if (SUBSCRIPTION_PLANS.enterprise.stripePriceId) {
      console.log('\n5. Testing Enterprise Subscription Creation...');
      const enterpriseSubscription = await createSubscription(
        testCustomer.id,
        SUBSCRIPTION_PLANS.enterprise.stripePriceId
      );
      console.log('Enterprise subscription created:', enterpriseSubscription.id);
      console.log('Subscription status:', enterpriseSubscription.status);
      
      // Cancel test subscription
      await stripe.subscriptions.cancel(enterpriseSubscription.id);
      console.log('Test subscription cancelled');
    }
    
    // Clean up test customer
    await stripe.customers.del(testCustomer.id);
    console.log('Test customer deleted');
    
    console.log('\n✅ All Stripe tests passed!');
    
  } catch (error) {
    console.error('❌ Stripe test failed:', error.message);
    if (error.type === 'StripeInvalidRequestError') {
      console.error('This might be due to invalid price IDs or API keys');
    }
  }
}

testStripeIntegration();