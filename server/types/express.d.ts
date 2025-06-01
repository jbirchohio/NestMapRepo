import { User } from '@shared/schema';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        organization_id?: number;
        role?: string;
        displayName?: string;
      };
      organizationId?: number;
      organizationContext?: {
        id?: number;
        name?: string;
        isOwner: boolean;
        canInvite: boolean;
        canManage: boolean;
      };
      dbMetrics?: {
        queryCount: number;
        totalQueryTime: number;
        slowQueries: any[];
        recordQuery: (queryName: string, duration: number) => void;
        getMetrics: () => any;
      };
      unifiedMetrics?: {
        startTime: bigint;
        dbQueries: number;
        dbTotalTime: number;
        slowQueries: any[];
        memoryBefore: number;
      };
      trackQuery?: (duration: number, query?: string) => void;
    }

    interface Session {
      userId?: number;
    }
  }
}

export {};