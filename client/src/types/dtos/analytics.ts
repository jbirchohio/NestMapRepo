import { Timestamp } from './common';

export interface AnalyticsTimeRange {
  start: Timestamp;
  end: Timestamp;
}

export interface AnalyticsFilterParams {
  organizationId?: string;
  userId?: string;
  dateRange?: {
    from: Timestamp;
    to: Timestamp;
  };
  status?: string[];
  tags?: string[];
}

export interface AgencyAnalyticsDTO {
  overview: {
    totalProposals: number;
    totalRevenue: number;
    winRate: number;
    activeClients: number;
    pendingApprovals: number;
    upcomingTrips: number;
  };
  revenueTrends: {
    date: Timestamp;
    revenue: number;
    trips: number;
  }[];
  topDestinations: Array<{
    destination: string;
    count: number;
    totalRevenue: number;
  }>;
  clientMetrics: Array<{
    clientName: string;
    tripCount: number;
    totalSpend: number;
    lastTripDate: Timestamp;
  }>;
}

export interface CorporateAnalyticsDTO {
  overview: {
    totalTrips: number;
    totalBudget: number;
    avgDuration: number;
    teamSize: number;
    activeTrips: number;
    upcomingTrips: number;
    completedTrips: number;
  };
  spendingByDepartment: Array<{
    department: string;
    budget: number;
    actualSpend: number;
    tripCount: number;
  }>;
  travelTrends: Array<{
    month: string;
    tripCount: number;
    totalSpend: number;
    avgTripCost: number;
  }>;
  topTravelers: Array<{
    userId: string;
    name: string;
    email: string;
    tripCount: number;
    totalSpend: number;
  }>;
}
