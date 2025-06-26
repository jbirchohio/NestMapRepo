import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { TripService, ServiceUser } from '../interfaces/trip.service.interface.js';
import { ResponseFormatter } from '../../common/utils/response-formatter.util.js';
import { requireAuth, requireOrgContext } from '../../common/middleware/auth.middleware.js';

// Define the authenticated request types
type AuthenticatedRequest = Request & {
  user: Express.User;  // Using Express.User which extends AuthUser
};

type AuthenticatedRequestWithId = AuthenticatedRequest & {
  params: {
    id: string;
    [key: string]: string;
  };
};

// Helper function to map Express.User to ServiceUser
function mapToServiceUser(user: Express.User): ServiceUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username || user.email.split('@')[0],
    firstName: null,
    lastName: null,
    organizationId: user.organization_id || null,
    role: user.role,
    passwordHash: '', // Should be handled by auth layer
    passwordChangedAt: null, // Should be set by auth layer
    tokenVersion: 1, // Should be managed by auth layer
    // Initialize other required properties with default values
    passwordResetToken: null,
    passwordResetExpires: null,
    resetToken: null,
    resetTokenExpires: null,
    isActive: true,
    emailVerified: user.email_verified || false,
    lastLogin: user.last_login_at ? new Date(user.last_login_at) : null,
    createdAt: user.created_at ? new Date(user.created_at) : new Date(),
    updatedAt: user.updated_at ? new Date(user.updated_at) : new Date()
  };
}


@Injectable()
export class TripController {
    private readonly logger = new Logger(TripController.name);
    constructor(
    @Inject('TripService')
    private readonly tripService: TripService) { }

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
                    // Safely cast the request to our authenticated type
                    const authReq = req as unknown as AuthenticatedRequest;
                    const { id: userId, organization_id: orgId } = authReq.user;
                    
                    if (!orgId) {
                        throw new UnauthorizedException('Organization context required');
                    }
                    
                    const serviceUser = mapToServiceUser(authReq.user);
                    const trips = await this.tripService.getTripsByUserId(userId, orgId, serviceUser);
                    ResponseFormatter.success(res, trips, 'Trips retrieved successfully');
                } catch (error) {
                    next(error);
                }
            }
        ] as RequestHandler[];
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
                    // Safely cast the request to our authenticated type
                    const authReq = req as unknown as AuthenticatedRequest;
                    const { organization_id: orgId } = authReq.user;
                    
                    if (!orgId) {
                        throw new UnauthorizedException('Organization context required');
                    }
                    
                    const serviceUser = mapToServiceUser(authReq.user);
                    const trips = await this.tripService.getCorporateTrips(orgId, serviceUser);
                    ResponseFormatter.success(res, trips, 'Corporate trips retrieved successfully');
                } catch (error) {
                    next(error);
                }
            }
        ] as RequestHandler[];
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
                    // Safely cast the request to our authenticated type with ID
                    const authReq = req as AuthenticatedRequestWithId;
                    const tripId = authReq.params.id;
                    
                    if (!tripId) {
                        throw new NotFoundException('Trip ID is required');
                    }
                    
                    const serviceUser = mapToServiceUser(authReq.user);
                    const trip = await this.tripService.getTripById(tripId, serviceUser);
                    
                    if (!trip) {
                        throw new NotFoundException('Trip not found');
                    }
                    
                    // Check if user has permission to view this trip
                    const isAdmin = ['admin', 'super_admin'].includes(authReq.user.role);
                    const isTripOwner = trip.userId === authReq.user.id;
                    const isOrgMember = trip.organizationId === authReq.user.organization_id;
                    
                    if (!isAdmin && !isTripOwner && !isOrgMember) {
                        throw new UnauthorizedException('Not authorized to view this trip');
                    }
                    
                    ResponseFormatter.success(res, trip, 'Trip retrieved successfully');
                } catch (error) {
                    next(error);
                }
            }
        ] as RequestHandler[];
    }
}
