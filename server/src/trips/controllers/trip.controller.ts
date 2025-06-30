// NestJS and Express imports
import { 
  Controller, 
  Get, 
  Param, 
  UseGuards, 
  Req, 
  NotFoundException, 
  ForbiddenException, 
  ParseUUIDPipe,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
  BadRequestException,
  Inject
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { 
  ApiBearerAuth, 
  ApiOperation, 
  ApiTags, 
  ApiQuery,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse
} from '@nestjs/swagger';

// Application imports
import { BaseController } from '../../common/controllers/base.controller.js';
import type { TripService } from '../interfaces/trip.service.interface.js';
import type { Trip, PaginationOptions } from '../interfaces/trip.interface.js';
import type { AuthUser } from '@shared/schema/types/auth/user.js';
import { isAdminOrManager } from '@server/common/utils/auth-utils.js';

// Response DTOs for Swagger documentation
class TripResponse implements Omit<Trip, 'createdAt' | 'updatedAt'> {
  id!: string;
  title!: string;
  description: string | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;
  status = 'draft';
  organizationId!: string;
  createdById!: string;
  updatedById: string | null = null;
  metadata: Record<string, unknown> = {};
  coverImageUrl: string | null = null;
  isPublic = false;
}

class PaginatedTripsResponse {
  data: TripResponse[] = [];
  total = 0;
  page = 1;
  limit = 10;
  totalPages = 1;
  hasNext = false;
  hasPrevious = false;
}

@ApiBearerAuth()
@ApiTags('trips')
@Controller('trips')
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(ClassSerializerInterceptor)
export class TripController extends BaseController {
  constructor(
    @Inject('TripService')
    private readonly tripService: TripService
  ) {
    super('TripController');
  }

  /**
   * Validates that the user has an organization context
   * @param user The authenticated user
   * @returns The organization ID
   * @throws ForbiddenException if no organization ID is found
   */
  private validateOrganizationContext(user: AuthUser): string {
    const orgId = user.organization_id;
    if (!orgId) {
      throw new ForbiddenException('Organization context required');
    }
    return orgId;
  }

  /**
   * Handles controller errors consistently
   * @param error The caught error
   * @param context Context for error messages
   * @param rethrow Whether to rethrow the original error
   */
  private handleError(error: unknown, context: string, rethrow = false): never {
    const err = error as Error;
    this.logger.error(`Error ${context}: ${err.message}\n${err.stack || 'No stack trace'}`);
    
    if (error instanceof NotFoundException || 
        error instanceof ForbiddenException ||
        error instanceof BadRequestException) {
      throw error;
    }
    
    if (rethrow) {
      throw error;
    }
    
    throw new BadRequestException(`Failed to process ${context.toLowerCase()}`);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all trips for the current user',
    description: 'Returns a list of trips for the authenticated user. Admins and managers can see all trips in their organization.'
  })
  @ApiOkResponse({ 
    description: 'List of trips retrieved successfully',
    type: [TripResponse]
  })
  @ApiForbiddenResponse({ description: 'User does not have permission to access this resource' })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    description: 'Filter trips by status',
    type: String
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: 'Number of items per page',
    type: Number,
    example: 10
  })
  @ApiQuery({ 
    name: 'offset', 
    required: false, 
    description: 'Number of items to skip',
    type: Number,
    example: 0
  })
  async getTrips(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    const user = req.user as AuthUser;
    const orgId = this.validateOrganizationContext(user);

    try {
      const pagination: PaginationOptions | undefined = limit !== undefined && offset !== undefined 
        ? { 
            limit: Number(limit), 
            offset: Number(offset),
            sortBy: 'startDate',
            sortOrder: 'desc'
          } as PaginationOptions
        : undefined;
      
      const trips = isAdminOrManager(user)
        ? await this.tripService.getTripsByOrganizationId(orgId, status, pagination)
        : await this.tripService.getTripsByUserId(user.id, orgId, status, pagination);
      
      return this.success(trips);
    } catch (error) {
      this.handleError(error, 'getting trips', true);
    }
  }

  @Get('corporate')
  @ApiOperation({ 
    summary: 'Get all corporate trips for the organization',
    description: 'Returns a list of corporate trips for the authenticated user\'s organization.'
  })
  @ApiOkResponse({ 
    description: 'Corporate trips retrieved successfully',
    type: [TripResponse]
  })
  @ApiForbiddenResponse({ description: 'User does not have permission to access this resource' })
  async getCorporateTrips(@Req() req: Request) {
    const user = req.user as AuthUser;
    const orgId = this.validateOrganizationContext(user);

    try {
      const trips = await this.tripService.getCorporateTrips(orgId);
      return this.success(trips);
    } catch (error) {
      this.handleError(error, 'getting corporate trips');
    }
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get a trip by ID',
    description: 'Returns a single trip by ID if the user has permission to view it.'
  })
  @ApiOkResponse({ 
    description: 'Trip retrieved successfully',
    type: TripResponse
  })
  @ApiNotFoundResponse({ description: 'Trip not found' })
  @ApiForbiddenResponse({ description: 'User does not have permission to access this trip' })
  @ApiBadRequestResponse({ description: 'Invalid trip ID' })
  async getTripById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request
  ) {
    const user = req.user as AuthUser;
    const orgId = this.validateOrganizationContext(user);
    
    if (!id) {
      throw new BadRequestException('Trip ID is required');
    }

    try {
      const trip = await this.tripService.getTripById(id, user);
      
      if (!trip) {
        throw new NotFoundException(`Trip with ID ${id} not found`);
      }
      
      const isAdminOrManagerUser = isAdminOrManager(user);
      const isTripOwner = trip.createdById === user.id;
      const isSameOrg = trip.organizationId === orgId;
      
      if (!isTripOwner && !isAdminOrManagerUser) {
        throw new ForbiddenException('You do not have permission to view this trip');
      }
      
      if (isAdminOrManagerUser && !isSameOrg) {
        throw new ForbiddenException('You can only view trips within your organization');
      }
      
      return this.success(trip);
    } catch (error) {
      this.handleError(error, `getting trip ${id}`);
    }
  }
}
