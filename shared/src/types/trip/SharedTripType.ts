/**
 * Type definition for shared trip data structure
 * Used across client and server for consistent typing
 */

export interface SharedTripType {
  id: number;
  title: string;
  userId: number;
  userName?: string;
  department: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  cost: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
  updatedAt: string;
  // Add any additional fields that are shared between client and server
}

export default SharedTripType;
