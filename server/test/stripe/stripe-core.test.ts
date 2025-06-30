import Stripe from 'stripe';
import { createStripeCustomer, createSubscription, updateSubscription, cancelSubscription, getSubscriptionDetails, SUBSCRIPTION_PLANS } from '../../stripe.js';
// Mock Stripe SDK
jest.mock('stripe');
describe('Stripe Core Functionality', () => {
    let mockStripeInstance: jest.Mocked<Stripe>;
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        // Setup mock implementation for Stripe
        mockStripeInstance = new Stripe('mock_key') as jest.Mocked<Stripe>;
        // Mock the customers.create method
        mockStripeInstance.customers.create = jest.fn().mockResolvedValue({
            id: 'cus_mock123',
            email: 'test@example.com',
            name: 'Test User'
        });
        // Mock the subscriptions methods
        mockStripeInstance.subscriptions.create = jest.fn().mockResolvedValue({
            id: 'sub_mock123',
            customer: 'cus_mock123',
            status: 'incomplete',
            latest_invoice: {
                payment_intent: {
                    client_secret: 'pi_mock_secret'
                }
            }
        });
        mockStripeInstance.subscriptions.update = jest.fn().mockResolvedValue({
            id: 'sub_mock123',
            customer: 'cus_mock123',
            status: 'active'
        });
        mockStripeInstance.subscriptions.cancel = jest.fn().mockResolvedValue({
            id: 'sub_mock123',
            customer: 'cus_mock123',
            status: 'canceled'
        });
        mockStripeInstance.subscriptions.retrieve = jest.fn().mockResolvedValue({
            id: 'sub_mock123',
            customer: 'cus_mock123',
            status: 'active',
            items: {
                data: [{
                        price: {
                            id: 'price_mock123',
                            product: 'prod_mock123'
                        }
                    }]
            },
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days from now
        });
        // Replace the imported stripe instance with our mock
        (global as any).stripe = mockStripeInstance;
    });
    test('should create a customer', async () => {
        const email = 'test@example.com';
        const name = 'Test User';
        const customer = await createStripeCustomer(email, name);
        expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
            email,
            name
        });
        expect(customer).toEqual({
            id: 'cus_mock123',
            email: 'test@example.com',
            name: 'Test User'
        });
    });
    test('should create a subscription', async () => {
        const customerId = 'cus_mock123';
        const priceId = 'price_mock123';
        const subscription = await createSubscription(customerId, priceId);
        expect(mockStripeInstance.subscriptions.create).toHaveBeenCalledWith({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent']
        });
        expect(subscription).toEqual({
            id: 'sub_mock123',
            customer: 'cus_mock123',
            status: 'incomplete',
            latest_invoice: {
                payment_intent: {
                    client_secret: 'pi_mock_secret'
                }
            }
        });
    });
    test('should update a subscription', async () => {
        const subscriptionId = 'sub_mock123';
        const newPriceId = 'price_new456';
        const updatedSubscription = await updateSubscription(subscriptionId, newPriceId);
        expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(subscriptionId, {
            cancel_at_period_end: false,
            proration_behavior: 'create_prorations',
            items: [{
                    id: expect.any(String),
                    price: newPriceId
                }]
        });
        expect(updatedSubscription).toEqual({
            id: 'sub_mock123',
            customer: 'cus_mock123',
            status: 'active'
        });
    });
    test('should cancel a subscription', async () => {
        const subscriptionId = 'sub_mock123';
        const canceledSubscription = await cancelSubscription(subscriptionId);
        expect(mockStripeInstance.subscriptions.cancel).toHaveBeenCalledWith(subscriptionId);
        expect(canceledSubscription).toEqual({
            id: 'sub_mock123',
            customer: 'cus_mock123',
            status: 'canceled'
        });
    });
    test('should get subscription details', async () => {
        const subscriptionId = 'sub_mock123';
        const subscriptionDetails = await getSubscriptionDetails(subscriptionId);
        expect(mockStripeInstance.subscriptions.retrieve).toHaveBeenCalledWith(subscriptionId);
        expect(subscriptionDetails).toEqual({
            id: 'sub_mock123',
            customer: 'cus_mock123',
            status: 'active',
            items: {
                data: [{
                        price: {
                            id: 'price_mock123',
                            product: 'prod_mock123'
                        }
                    }]
            },
            current_period_end: expect.any(Number)
        });
    });
    test('should have valid subscription plans configuration', () => {
        // Verify the structure of subscription plans
        expect(SUBSCRIPTION_PLANS).toHaveProperty('free');
        expect(SUBSCRIPTION_PLANS).toHaveProperty('team');
        expect(SUBSCRIPTION_PLANS).toHaveProperty('enterprise');
        // Verify free plan has no stripe price ID
        expect(SUBSCRIPTION_PLANS.free.stripePriceId).toBeNull();
        // Verify paid plans have stripe price IDs
        expect(SUBSCRIPTION_PLANS.team.stripePriceId).toBeDefined();
        expect(SUBSCRIPTION_PLANS.enterprise.stripePriceId).toBeDefined();
    });
});
