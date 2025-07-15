import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Logger } from '@nestjs/common/services/logger.service.js';
import { UnauthorizedException, NotFoundException } from '@nestjs/common/exceptions/index.js';
import { TripService } from '../interfaces/trip.service.interface.js';
import ResponseFormatter from '../../utils/response.formatter.js';
import requireAuth from '../../auth/middleware/auth.middleware.js';
import requireOrgContext from '../../auth/middleware/org.middleware.js';
import { Injectable } from '@nestjs/common/decorators/core/injectable.decorator.js';

// Define the AuthUser interface to match the expected User type from the service
interface AuthUser {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  firstName: string | null;
  lastName: string | null;
  role: 'admin' | 'super_admin' | 'manager' | 'member' | 'guest';
  emailVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpires: Date | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  resetToken: string | null;
  resetTokenExpires: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLogin: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  mfaSecret: string | null;
  organizationId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  passwordChangedAt: Date | null;
  // For backward compatibility
  [key: string]: any;
}

// Define the AuthenticatedRequest type
type AuthenticatedRequest = Request & {
  user: AuthUser;
  params: {
    id?: string;
    [key: string]: string | undefined;
  };
};


@Injectable()
export class TripController {

  constructor(@Inject('TripService') private readonly tripService: TripService) {}

  /**
   * Get all trips for the authenticated user
   * @param logger Logger instance
   * @returns Array of Express middleware/handlers
   */
  public getTrips(logger: Logger): RequestHandler[] {
    return [
      requireAuth(logger),
      requireOrgContext(logger),
      async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
          const authReq = req as unknown as AuthenticatedRequest;
          const { id: userId, organizationId: orgId } = authReq.user;
          
          if (!orgId) {
            throw new UnauthorizedException('Organization context required');
          }
          
          const trips = await this.tripService.getTripsByUserId(userId, orgId);
          ResponseFormatter.success(res, trips, 'Trips retrieved successfully');
        } catch (error) {
          next(error);
        }
      }
    ];
  }

  /**
   * Get all corporate trips for the organization
   * @param logger Logger instance
   * @returns Array of Express middleware/handlers
   */
  public getCorporateTrips(logger: Logger): RequestHandler[] {
    return [
      requireAuth(logger),
      requireOrgContext(logger),
      async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
          const authReq = req as unknown as AuthenticatedRequest;
          const { organizationId: orgId } = authReq.user;
          
          if (!orgId) {
            throw new UnauthorizedException('Organization context required');
          }
          
          const trips = await this.tripService.getCorporateTrips(orgId);
          ResponseFormatter.success(res, trips, 'Corporate trips retrieved successfully');
        } catch (error) {
          next(error);
        }
      }
    ];
  }

  /**
   * Get a trip by ID
   * @param logger Logger instance
   * @returns Array of Express middleware/handlers
   */
  public getTripById(logger: Logger): RequestHandler[] {
    return [
      requireAuth(logger),
      async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
          const authReq = req as unknown as AuthenticatedRequest;
          const tripId = authReq.params?.id;
          
          if (!tripId) {
            throw new NotFoundException('Trip ID is required');
          }

          // Call the service method with proper typing and user context
          const trip = await this.tripService.getTripById(tripId, authReq.user);
          if (!trip) {
            throw new NotFoundException('Trip not found');
          }

          // Check if user has permission to view this trip
          if ((trip as any).userId !== authReq.user.id && authReq.user.role !== 'admin') {
            throw new UnauthorizedException('Not authorized to view this trip');
          }

          ResponseFormatter.success(res, trip, 'Trip retrieved successfully');
        } catch (error) {
          next(error);
        }
      }
    ];
  }
}
function Inject(_arg0: string): (target: typeof TripController, propertyKey: undefined, parameterIndex: 0) => void {
  throw new Error('Function not implemented.');
}

