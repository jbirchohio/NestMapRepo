import { UserRole } from '../../shared/src/schema.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        organizationId: string;
        [key: string]: unknown;
      };
      token?: string;
    }
  }
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  locationName?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  type?: string;
  status?: 'pending' | 'confirmed' | 'cancelled.js';
  notes?: string;
  tripId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityStorage {
  getTrip: (tripId: string, organizationId: string) => Promise<any>;
  getActivity: (activityId: string) => Promise<Activity | null>;
  createActivity: (activity: Partial<Activity>) => Promise<Activity>;
  getActivitiesByTripId: (tripId: string) => Promise<Activity[]>;
}
