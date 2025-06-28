/**
 * Type definition for shared trip data structure
 * Used across client and server for consistent typing
 */

export interface SharedTripType {
  id: number;
  userId: number;
  title: string;
  startDate: string;
  endDate: string;
  organizationId: number;
  collaborators: Record<string, string>;
  updatedAt: string;
  createdAt: string;
  deletedAt: string | null;
  department: string;
  cost: number;
  status: string;
  city: string;
  country: string;
  location: string;
  [key: string]: unknown;
}

export default SharedTripType;
