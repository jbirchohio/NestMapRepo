import Stripe from 'stripe';
import { StripeIssuingService, CardIssuanceRequest, CardControlsUpdate } from '../../services/stripeIssuingService.js';
import { storage } from '../../storage.js';
// Mock dependencies
jest.mock('stripe');
jest.mock('../../storage');
describe('Stripe Issuing Service', () => {
    let mockStripeInstance: jest.Mocked<Stripe>;
    let issuingService: StripeIssuingService;
    // Sample test data
    const mockUserId = 123;
    const mockOrgId = 456;
    const mockCardholderName = 'John Doe';
    const mockEmail = 'john.doe@example.com';
    const mockPhone = '+15555555555';
    const mockCardId = 'ic_mock123';
    const mockCardholderId = 'ich_mock123';
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        // Setup mock implementation for Stripe
        mockStripeInstance = new Stripe('mock_key') as jest.Mocked<Stripe>;
        // Mock storage methods
        (storage.getUser as jest.Mock).mockResolvedValue({
            id: mockUserId,
            email: mockEmail,
            phone: mockPhone,
            first_name: 'John',
            last_name: 'Doe'
        });
        (storage.getOrganization as jest.Mock).mockResolvedValue({
            id: mockOrgId,
            name: 'Test Organization',
            stripe_connect_account_id: 'acct_mock123',
            stripe_issuing_enabled: true
        });
        (storage.createCorporateCard as jest.Mock).mockResolvedValue({
            id: 1,
            user_id: mockUserId,
            organization_id: mockOrgId,
            stripe_card_id: mockCardId,
            last_four: '4242',
            status: 'active'
        });
        // Mock Stripe methods
        mockStripeInstance.paymentIntents = {
            create: jest.fn().mockResolvedValue({
                id: 'pi_mock123',
                amount: 5000,
                currency: 'usd',
                status: 'requires_capture',
                client_secret: 'pi_mock123_secret_xyz',
                metadata: {}
            }),
            capture: jest.fn().mockResolvedValue({
                id: 'pi_mock123',
                amount: 5000,
                currency: 'usd',
                status: 'succeeded',
                metadata: {}
            })
        } as any;
        mockStripeInstance.issuing = {
            cardholders: {
                create: jest.fn().mockResolvedValue({
                    id: mockCardholderId,
                    name: mockCardholderName,
                    email: mockEmail,
                    status: 'active'
                }),
                update: jest.fn().mockResolvedValue({
                    id: mockCardholderId,
                    status: 'active'
                })
            },
            cards: {
                create: jest.fn().mockResolvedValue({
                    id: mockCardId,
                    last4: '4242',
                    cardholder: mockCardholderId,
                    status: 'active',
                    type: 'virtual'
                }),
                update: jest.fn().mockResolvedValue({
                    id: mockCardId,
                    status: 'active'
                }),
                retrieve: jest.fn().mockResolvedValue({
                    id: mockCardId,
                    last4: '4242',
                    status: 'active'
                })
            }
        } as any;
        // Create instance of the service with mocked dependencies
        issuingService = new StripeIssuingService();
        (issuingService as any).stripe = mockStripeInstance;
    });
    test('should issue a new virtual card', async () => {
        const cardRequest: CardIssuanceRequest = {
            user_id: mockUserId,
            organization_id: mockOrgId,
            spend_limit: 10000, // $100.00
            interval: 'monthly',
            cardholder_name: mockCardholderName,
            purpose: 'Travel expenses',
            department: 'Sales'
        };
        const result = await issuingService.issueCard(cardRequest);
        // Verify cardholder was created
        expect(mockStripeInstance.issuing.cardholders.create).toHaveBeenCalledWith(expect.objectContaining({
            name: mockCardholderName,
            email: mockEmail,
            status: 'active',
            type: 'individual'
        }));
        // Verify card was created
        expect(mockStripeInstance.issuing.cards.create).toHaveBeenCalledWith(expect.objectContaining({
            cardholder: mockCardholderId,
            currency: 'usd',
            type: 'virtual',
            status: 'active',
            spending_controls: expect.objectContaining({
                spending_limits: [
                    {
                        amount: 10000,
                        interval: 'monthly'
                    }
                ]
            })
        }));
        // Verify card was saved to database
        expect(storage.createCorporateCard).toHaveBeenCalledWith(expect.objectContaining({
            user_id: mockUserId,
            organization_id: mockOrgId,
            stripe_card_id: mockCardId,
            last_four: '4242',
            status: 'active'
        }));
        // Verify result
        expect(result).toEqual(expect.objectContaining({
            id: 1,
            user_id: mockUserId,
            organization_id: mockOrgId,
            stripe_card_id: mockCardId
        }));
    });
    test('should update card controls', async () => {
        const cardUpdate: CardControlsUpdate = {
            card_id: 1,
            spend_limit: 20000, // $200.00
            status: 'active',
            allowed_categories: ['travel', 'food_and_drink']
        };
        // Mock getCorporateCard
        (storage.getCorporateCard as jest.Mock).mockResolvedValue({
            id: 1,
            user_id: mockUserId,
            organization_id: mockOrgId,
            stripe_card_id: mockCardId,
            last_four: '4242',
            status: 'active'
        });
        await issuingService.updateCardControls(cardUpdate);
        // Verify card was updated in Stripe
        expect(mockStripeInstance.issuing.cards.update).toHaveBeenCalledWith(mockCardId, expect.objectContaining({
            spending_controls: expect.objectContaining({
                spending_limits: [
                    {
                        amount: 20000,
                        interval: expect.any(String)
                    }
                ],
                allowed_categories: ['travel', 'food_and_drink']
            })
        }));
        // Verify card was updated in database
        expect(storage.updateCorporateCard).toHaveBeenCalledWith(1, expect.objectContaining({
            spend_limit: 20000,
            card_status: 'active'
        }));
    });
    test('should create payment intent for authorization', async () => {
        const authParams = {
            amount: 5000, // $50.00
            currency: 'usd',
            card: mockCardId,
            merchant_data: {
                name: 'Test Merchant',
                category: 'travel'
            }
        };
        // Mock the stripe.paymentIntents.create method
        (mockStripeInstance.paymentIntents.create as jest.Mock).mockResolvedValueOnce({
            id: 'pi_mock123',
            status: 'requires_capture',
            amount: 5000,
            currency: 'usd',
            // Add other required fields
        });
        // Import the stripe module
        const { authorizeTransaction } = await import('../../stripe');
        // Call the authorizeTransaction function
        const result = await authorizeTransaction({
            ...authParams,
            merchant_data: {
                ...authParams.merchant_data,
                city: undefined,
                state: undefined,
                country: undefined
            }
        });
        // Verify payment intent was created with correct parameters
        expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({
            amount: 5000,
            currency: 'usd',
            payment_method_types: ['card_present'],
            capture_method: 'manual',
            metadata: {
                merchant_name: 'Test Merchant',
                merchant_category: 'travel',
                is_authorization: 'true'
            }
        }));
        // Verify the result contains the expected fields
        expect(result).toHaveProperty('id', 'pi_mock123');
        expect(result).toHaveProperty('status', 'requires_capture');
    });
    test('should handle card freezing', async () => {
        // Mock getCorporateCard
        (storage.getCorporateCard as jest.Mock).mockResolvedValue({
            id: 1,
            user_id: mockUserId,
            organization_id: mockOrgId,
            stripe_card_id: mockCardId,
            last_four: '4242',
            status: 'active'
        });
        await issuingService.freezeCard(1, true);
        // Verify card was updated in Stripe
        expect(mockStripeInstance.issuing.cards.update).toHaveBeenCalledWith(mockCardId, expect.objectContaining({
            status: 'inactive'
        }));
        // Verify card was updated in database
        expect(storage.updateCorporateCard).toHaveBeenCalledWith(1, expect.objectContaining({
            status: 'inactive'
        }));
    });
    test('should handle card unfreezing', async () => {
        // Mock getCorporateCard
        (storage.getCorporateCard as jest.Mock).mockResolvedValue({
            id: 1,
            user_id: mockUserId,
            organization_id: mockOrgId,
            stripe_card_id: mockCardId,
            last_four: '4242',
            status: 'inactive'
        });
        await issuingService.freezeCard(1, false);
        // Verify card was updated in Stripe
        expect(mockStripeInstance.issuing.cards.update).toHaveBeenCalledWith(mockCardId, expect.objectContaining({
            status: 'active'
        }));
        // Verify card was updated in database
        expect(storage.updateCorporateCard).toHaveBeenCalledWith(1, expect.objectContaining({
            status: 'active'
        }));
    });
    test('should throw error when Stripe is not configured', async () => {
        // Remove Stripe from the service
        (issuingService as any).stripe = null;
        const cardRequest: CardIssuanceRequest = {
            user_id: mockUserId,
            organization_id: mockOrgId,
            spend_limit: 10000,
            interval: 'monthly',
            cardholder_name: mockCardholderName
        };
        await expect(issuingService.issueCard(cardRequest)).rejects.toThrow('Stripe not configured. Please provide STRIPE_SECRET_KEY environment variable.');
    });
    test('should throw error when organization is not Stripe Connect enabled', async () => {
        // Mock organization without Stripe Connect
        (storage.getOrganization as jest.Mock).mockResolvedValue({
            id: mockOrgId,
            name: 'Test Organization',
            stripe_connect_account_id: null,
            stripe_issuing_enabled: false
        });
        const cardRequest: CardIssuanceRequest = {
            user_id: mockUserId,
            organization_id: mockOrgId,
            spend_limit: 10000,
            interval: 'monthly',
            cardholder_name: mockCardholderName
        };
        await expect(issuingService.issueCard(cardRequest)).rejects.toThrow('Organization is not enabled for Stripe issuing');
    });
});
