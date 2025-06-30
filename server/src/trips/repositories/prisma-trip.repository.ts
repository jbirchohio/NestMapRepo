import { Prisma, PrismaClient, Trip as PrismaTrip, User as PrismaUser } from '@prisma/client';
import { UserRole } from '@shared/schema/types/auth/user.js';
import { logger } from '../../../utils/logger.js';
import { AuthUser } from '../../types/auth-user.js';
import { Trip, TripUser } from '../domain/trip.entity.js';
import { ITripRepository } from '../interfaces/trip.repository.interface.js';

interface TripMetadata extends Record<string, unknown> {
  destination?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  budget?: string | number;
  currency?: string;
  notes?: string;
  tags?: string[];
  parentTripId?: string;
}

type PrismaTripWithDetails = PrismaTrip & {
  createdBy?: PrismaUser | null;
  metadata?: Prisma.JsonValue;
};

function isMetadata(obj: unknown): obj is TripMetadata {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

function safeMetadata(metadata: Prisma.JsonValue | undefined): TripMetadata {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }
  return metadata as TripMetadata;
}

export class PrismaTripRepository implements ITripRepository {
  private readonly logger = logger;

  constructor(private readonly prisma: PrismaClient) {}

  private toDomainTrip(prismaTrip: PrismaTripWithDetails): Trip {
    if (!prismaTrip.createdById) {
      throw new Error(`Trip with id ${prismaTrip.id} has no creator.`);
    }
    
    if (!prismaTrip.startDate) {
      throw new Error(`Trip with id ${prismaTrip.id} has no start date.`);
    }

    const metadata = safeMetadata(prismaTrip.metadata);

    const user: TripUser = prismaTrip.createdBy
      ? {
          id: prismaTrip.createdBy.id,
          email: prismaTrip.createdBy.email,
          firstName: prismaTrip.createdBy.firstName || undefined,
          lastName: prismaTrip.createdBy.lastName || undefined,
          avatarUrl: prismaTrip.createdBy.avatarUrl || undefined,
          role: prismaTrip.createdBy.role as UserRole,
        }
      : {
          id: prismaTrip.createdById,
          email: '',
        };

    return {
      id: prismaTrip.id,
      userId: prismaTrip.createdById,
      organizationId: prismaTrip.organizationId,
      title: prismaTrip.title,
      description: prismaTrip.description ?? undefined,
      startDate: prismaTrip.startDate,
      endDate: prismaTrip.endDate ?? undefined,
      status: prismaTrip.status,
      isBusiness: prismaTrip.isBusiness,
      isPublic: prismaTrip.isPublic,
      createdAt: prismaTrip.createdAt,
      updatedAt: prismaTrip.updatedAt,
destination: metadata?.destination,
      budget: metadata?.budget ? Number(metadata.budget) : undefined,
      currency: metadata?.currency ?? 'USD',
      notes: metadata?.notes,
      tags: metadata?.tags ?? [],
      isRecurring: metadata?.isRecurring ?? false,
      recurrencePattern: metadata?.recurrencePattern,
      parentTripId: metadata?.parentTripId,
      user,
      metadata,
    };
  }

  async findById(id: string): Promise<Trip | null> {
    try {
      const trip = await this.prisma.trip.findUnique({
        where: { id },
        include: { createdBy: true },
      });
      return trip ? this.toDomainTrip(trip) : null;
    } catch (error) {
      this.logger.error(`Failed to find trip by id ${id}: ${error}`);
      throw new Error('Failed to find trip');
    }
  }

  async findAll(): Promise<Trip[]> {
    try {
      const trips = await this.prisma.trip.findMany({
        include: { createdBy: true },
      });
      return trips.map((trip) => this.toDomainTrip(trip));
    } catch (error) {
      this.logger.error(`Failed to find all trips: ${error}`);
      throw new Error('Failed to find trips');
    }
  }

  async create(data: Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'user'>): Promise<Trip> {
    try {
      const {
        userId,
        organizationId,
        title,
        description,
        startDate,
        endDate,
        status,
        isBusiness,
        isPublic,
        destination,
        budget,
        currency,
        notes,
        tags,
        isRecurring,
        recurrencePattern,
        parentTripId,
      } = data;

      const metadata = {
        destination,
        budget,
        currency,
        notes,
        tags,
        isRecurring,
        recurrencePattern,
        parentTripId,
      };

      const trip = await this.prisma.trip.create({
        data: {
          title,
          description,
          startDate,
          endDate,
          status,
          isBusiness,
          isPublic,
          organizationId,
          createdById: userId,
          metadata,
        },
        include: { createdBy: true },
      });
      return this.toDomainTrip(trip);
    } catch (error) {
      this.logger.error(`Failed to create trip: ${error}`);
      throw new Error('Failed to create trip');
    }
  }

  async update(id: string, data: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'user'>>): Promise<Trip | null> {
    try {
      const { metadata, ...coreData } = data;

      const trip = await this.prisma.trip.update({
        where: { id },
        data: {
          ...coreData,
          metadata: metadata || undefined,
        },
        include: { createdBy: true },
      });
      return this.toDomainTrip(trip);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      this.logger.error(`Failed to update trip ${id}: ${error}`);
      throw new Error('Failed to update trip');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.trip.delete({ where: { id } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      this.logger.error(`Failed to delete trip ${id}: ${error}`);
      return false;
    }
  }

  async findByUserId(userId: string): Promise<Trip[]> {
    try {
      const trips = await this.prisma.trip.findMany({
        where: { createdById: userId },
        include: { createdBy: true },
        orderBy: { startDate: 'desc' },
      });
      return trips.map((trip) => this.toDomainTrip(trip));
    } catch (error) {
      this.logger.error(`Failed to find trips for user ${userId}: ${error}`);
      throw new Error('Failed to find user trips');
    }
  }

  async checkTripAccess(tripId: string, user: AuthUser): Promise<boolean> {
    try {
      if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
        return true;
      }

      const trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
        select: { createdById: true, organizationId: true, isPublic: true },
      });

      if (!trip) {
        return false;
      }

      if (trip.isPublic && trip.organizationId === user.organizationId) {
        return true;
      }

      return trip.createdById === user.id;
    } catch (error) {
      this.logger.error(`Access check failed for user ${user.id} on trip ${tripId}: ${error}`);
      return false;
    }
  }
}



