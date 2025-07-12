import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe.js';
import { db } from '../../db.js';
import request from 'supertest.js';
import express, { Application } from 'express';
import bodyParser from 'body-parser.js';

// Mock the required dependencies
jest.mock('stripe');
jest.mock('../../db');

// Import the webhook router
import webhookRouter from '../../shared/src/schema.js';

// Create a test Express app
const createTestApp = (): Application => {
  const app = express();
  // Parse JSON bodies
  app.use(bodyParser.json());
  // Parse raw body for webhooks
  app.use(bodyParser.raw({ type: 'application/json' }));
  // Mount the webhook router
  app.use('/webhooks', webhookRouter);
  return app;
};

// Mock the email service
jest.mock('../../src/email/services/nodemailer-email.service', () => ({
  NodemailerEmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue(true)
  }))
}));

// Mock the config service
jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, any> = {
        'STRIPE_SECRET_KEY': 'sk_test_mock',
        'STRIPE_WEBHOOK_SECRET': 'whsec_mock',
        'SMTP_HOST': 'smtp.example.com',
        'SMTP_USER': 'user',
        'SMTP_PASSWORD': 'password',
        'FRONTEND_URL': 'http://localhost:3000',
        'NODE_ENV': 'test'
      };
      return config[key];
    })
  }))
}));

describe('Stripe Webhook Endpoints', () => {
  let app: Application;
  let mockStripe: jest.Mocked<Stripe>;
  
  // Sample test data
  const testCustomerId = 'cus_test123.js';
  const testSubscriptionId = 'sub_test123.js';
  const testInvoiceId = 'in_test123.js';
  const testPriceId = 'price_test123.js';
  const testProductId = 'prod_test123.js';
  
  // Mock data for database responses
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    stripe_customer_id: testCustomerId
  };
  
  const mockOrganization = {
    id: 1,
    name: 'Test Org',
    stripe_customer_id: testCustomerId
  };
  
  const mockInvoice = {
    id: 1,
    stripe_invoice_id: testInvoiceId,
    user_id: 1,
    organization_id: 1,
    amount: 19900,
    status: 'paid',
    currency: 'usd',
    created_at: new Date()
  };
  
  // Mock Stripe event data
  const mockStripeEvent = {
    id: 'evt_test123',
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: testInvoiceId,
        customer: testCustomerId,
        subscription: testSubscriptionId,
        status: 'paid',
        amount_paid: 19900,
        currency: 'usd',
        lines: {
          data: [{
            price: {
              id: testPriceId,
              product: testProductId
            }
          }]
        },
        created: Math.floor(Date.now() / 1000)
      }
    }
  };
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a new test app for each test
    app = createTestApp();
    
    // Setup mock Stripe instance
    mockStripe = new Stripe('sk_test_mock', {
      apiVersion: '2025-05-28.basil'
    }) as jest.Mocked<Stripe>;
    
    // Mock Stripe webhook verification
    mockStripe.webhooks = {
      constructEvent: jest.fn().mockReturnValue(mockStripeEvent)
    } as any;
    
    // Mock Stripe client in the webhook router
    jest.mock('../../stripe', () => ({
      stripe: mockStripe
    }));
    
    // Mock database responses
    (db.select as jest.Mock).mockImplementation(() => ({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue([mockInvoice])
    }));
    
    (db.update as jest.Mock).mockImplementation(() => ({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([mockInvoice])
    }));
    
    (db.insert as jest.Mock).mockImplementation(() => ({
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([mockInvoice])
    }));
  });
  
  test('should handle invoice.payment_succeeded webhook', async () => {
    // Mock the webhook signature verification with proper type assertion
    (mockStripe.webhooks.constructEvent as jest.Mock).mockImplementationOnce(() => ({
      ...mockStripeEvent,
      type: 'invoice.payment_succeeded'
    }));
    
    // Mock database response for invoice
    (db.select as jest.Mock).mockImplementation(() => ({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue([mockInvoice])
    }));
    
    // Send the webhook request
    const response = await request(app)
      .post('/webhooks/stripe-invoice')
      .set('stripe-signature', 'test_signature')
      .send(mockStripeEvent);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    
    // Verify Stripe webhook was verified
    expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
      expect.any(Buffer),
      'test_signature',
      expect.any(String)
    );
    
    // Verify database was updated
    expect(db.update).toHaveBeenCalled();
  });
  
  test('should handle invoice.payment_failed webhook', async () => {
    // Mock the webhook signature verification with proper type assertion
    (mockStripe.webhooks.constructEvent as jest.Mock).mockImplementationOnce(() => ({
      ...mockStripeEvent,
      type: 'invoice.payment_failed',
      data: {
        object: {
          ...mockStripeEvent.data.object,
          status: 'open',
          next_payment_attempt: Math.floor(Date.now() / 1000) + 24 * 60 * 60 // 1 day from now
        }
      }
    }));
    
    // Send the webhook request
    const response = await request(app)
      .post('/webhooks/stripe-invoice')
      .set('stripe-signature', 'test_signature')
      .send({
        ...mockStripeEvent,
        type: 'invoice.payment_failed'
      });
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    
    // Verify Stripe webhook was verified
    expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
    
    // Verify database was updated
    expect(db.update).toHaveBeenCalled();
  });
  
  test('should handle customer.subscription.updated webhook', async () => {
    // Mock the webhook signature verification with proper type assertion
    (mockStripe.webhooks.constructEvent as jest.Mock).mockImplementationOnce(() => ({
      ...mockStripeEvent,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: testSubscriptionId,
          customer: testCustomerId,
          status: 'active'
        }
      }
    }));
    
    // Send the webhook request
    const response = await request(app)
      .post('/webhooks/stripe-invoice')
      .set('stripe-signature', 'test_signature')
      .send({
        ...mockStripeEvent,
        type: 'customer.subscription.updated'
      });
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    
    // Verify Stripe webhook was verified
    expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
    
    // Verify database was updated
    expect(db.update).toHaveBeenCalled();
  });
  
  test('should handle customer.subscription.deleted webhook', async () => {
    // Mock the webhook signature verification with proper type assertion
    (mockStripe.webhooks.constructEvent as jest.Mock).mockImplementationOnce(() => ({
      ...mockStripeEvent,
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: testSubscriptionId,
          customer: testCustomerId,
          status: 'canceled',
          canceled_at: Math.floor(Date.now() / 1000)
        }
      }
    }));
    
    // Send the webhook request
    const response = await request(app)
      .post('/webhooks/stripe-invoice')
      .set('stripe-signature', 'test_signature')
      .send({
        ...mockStripeEvent,
        type: 'customer.subscription.deleted'
      });
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    
    // Verify Stripe webhook was verified
    expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
    
    // Verify database was updated
    expect(db.update).toHaveBeenCalled();
  });
  
  test('should return 400 for missing Stripe signature', async () => {
    // Send request without Stripe signature header
    const response = await request(app)
      .post('/webhooks/stripe-invoice')
      .send(mockStripeEvent);
    
    // Verify error response
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Missing Stripe signature'
    });
  });
  
  test('should return 400 for invalid event type', async () => {
    // Mock the webhook signature verification to return an unknown event type
    (mockStripe.webhooks.constructEvent as jest.Mock).mockImplementationOnce(() => ({
      ...mockStripeEvent,
      type: 'unknown.event.type'
    }));
    
    // Send the webhook request with unknown event type
    const response = await request(app)
      .post('/webhooks/stripe-invoice')
      .set('stripe-signature', 'test_signature')
      .send({
        ...mockStripeEvent,
        type: 'unknown.event.type'
      });
    
    // Verify error response
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Unhandled event type: unknown.event.type'
    });
  });
  
  test('should return 400 for signature verification failure', async () => {
    // Make the signature verification fail
    (mockStripe.webhooks.constructEvent as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });
    
    // Send the webhook request
    const response = await request(app)
      .post('/webhooks/stripe-invoice')
      .set('stripe-signature', 'test_signature')
      .send(mockStripeEvent);
    
    // Verify error response
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Invalid signature'
    });
  });
});
