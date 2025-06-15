/**
 * Interface for booking confirmation details
 */
export interface BookingConfirmationDetails {
  /**
   * Confirmation code or reference number
   */
  confirmationCode: string;
  
  /**
   * Date when the booking was confirmed
   */
  confirmedAt: Date;
  
  /**
   * Provider who confirmed the booking (e.g., hotel name, airline)
   */
  provider?: string;
  
  /**
   * Any additional confirmation details
   */
  additionalDetails?: Record<string, unknown>;
}

/**
 * Interface for user preferences related to bookings
 */
export interface UserBookingPreferences {
  /**
   * Preferred seat type (e.g., window, aisle)
   */
  seatPreference?: 'window' | 'aisle' | 'middle' | 'no-preference';
  
  /**
   * Dietary restrictions or meal preferences
   */
  dietaryRestrictions?: string[];
  
  /**
   * Preferred room type for accommodations
   */
  roomPreference?: 'single' | 'double' | 'suite' | 'no-preference';
  
  /**
   * Special assistance requirements
   */
  specialAssistance?: string[];
  
  /**
   * Loyalty program memberships
   */
  loyaltyPrograms?: Array<{
    program: string;
    membershipNumber: string;
    tier?: string;
  }>;
  
  /**
   * Other custom preferences
   */
  customPreferences?: Record<string, unknown>;
}

/**
 * Interface for organization settings related to bookings
 */
export interface OrganizationBookingSettings {
  /**
   * Default approval policy
   */
  approvalPolicy?: 'automatic' | 'manager' | 'department-head';
  
  /**
   * Budget constraints
   */
  budgetLimits?: {
    flight?: number;
    accommodation?: number;
    transportation?: number;
    meals?: number;
    total?: number;
  };
  
  /**
   * Preferred vendors
   */
  preferredVendors?: Array<{
    type: 'airline' | 'hotel' | 'car-rental' | 'other';
    name: string;
    contractId?: string;
  }>;
  
  /**
   * Travel policy settings
   */
  travelPolicy?: {
    allowBusinessClass?: boolean;
    maxHotelStars?: number;
    requireApprovalAboveAmount?: number;
  };
  
  /**
   * Custom organization settings
   */
  customSettings?: Record<string, unknown>;
}
