/**
 * Types related to business trip requests
 */

export interface BusinessTripRequest {
  clientName: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  workSchedule: {
    workDays: string[];
    workHours: string;
    meetingBlocks?: string[];
  };
  preferences: {
    foodTypes: string[];
    accommodationType: 'luxury' | 'business' | 'budget';
    activityTypes: string[];
    dietaryRestrictions?: string[];
    accessibility?: string[];
  };
  companyInfo: {
    name: string;
    industry: string;
    travelPolicy?: Record<string, unknown>;
  };
  tripPurpose: string;
  groupSize: number;
}
