import type { IStorage } from '../types/index.js';
import prisma from '../../prisma';
import { Organization, User, OrganizationMember, Prisma } from '@prisma/client';

export class PrismaStorage implements IStorage {

    async getOrganization(id: string): Promise<Organization | null> {
        return prisma.organization.findUnique({
            where: { id },
        });
    }

    async updateOrganization(id: string, data: Partial<Organization>): Promise<Organization | null> {
        return prisma.organization.update({
            where: { id },
            data,
        });
    }

    async getOrganizationMembers(organizationId: string): Promise<User[]> {
        const members = await prisma.organizationMember.findMany({
            where: { organizationId },
            include: { user: true },
        });
        return members.map(member => member.user);
    }

    async createInvitation(data: { email: string; organizationId: string; invitedBy: string; role: string; token: string; expiresAt: Date; }): Promise<any> {
        // Assuming 'role' in data maps directly to UserRole enum in Prisma
        // And 'invitedBy' is the userId of the inviter
        const invitation = await prisma.organizationMember.create({
            data: {
                organization: {
                    connect: { id: data.organizationId }
                },
                user: {
                    connectOrCreate: {
                        where: { email: data.email },
                        create: { email: data.email, firstName: '' , lastName: ''}, // Minimal user creation
                    },
                },
                role: data.role as any, // Cast to any for now, will need proper enum mapping
                invitedBy: {
                    connect: { id: data.invitedBy }
                },
                invitedAt: new Date(),
                status: 'pending',
            },
        });
        return invitation; // Return the created OrganizationMember as the invitation
    }

    async updateOrganizationMember(organizationId: string, userId: string, data: { org_role?: string; permissions?: string[]; }): Promise<OrganizationMember | null> {
        return prisma.organizationMember.update({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId,
                },
            },
            data: {
                role: data.org_role as any, // Cast to any for now, will need proper enum mapping
            },
        });
    }

    async removeOrganizationMember(organizationId: string, userId: string): Promise<boolean> {
        try {
            await prisma.organizationMember.delete({
                where: {
                    organizationId_userId: {
                        organizationId,
                        userId,
                    },
                },
            });
            return true;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                // Record to delete does not exist
                return false;
            }
            throw error;
        }
    }

    // Implement other IStorage methods as needed, or throw Not Implemented errors
    async getTripTravelers(tripId: string): Promise<any[]> { throw new Error("Method not implemented."); }
    async getTripTraveler(id: string): Promise<any | undefined> { throw new Error("Method not implemented."); }
    async addTripTraveler(traveler: any): Promise<any> { throw new Error("Method not implemented."); }
    async updateTripTraveler(id: string, updates: any): Promise<any | undefined> { throw new Error("Method not implemented."); }
    async removeTripTraveler(id: string): Promise<boolean> { throw new Error("Method not implemented."); }
    async createCorporateCard(cardData: any): Promise<any> { throw new Error("Method not implemented."); }
    async updateCorporateCard(_id: string | number, _updates: any): Promise<boolean> { throw new Error("Method not implemented."); }
    async getCorporateCard(_id: string | number): Promise<any> { throw new Error("Method not implemented."); }
    async getUser(_id: string): Promise<User | undefined> { throw new Error("Method not implemented."); }
    async getUserByUsername(_username: string): Promise<User | undefined> { throw new Error("Method not implemented."); }
    async getUserByAuthId(_authId: string): Promise<User | undefined> { throw new Error("Method not implemented."); }
    async getUserByEmail(_email: string): Promise<User | undefined> { throw new Error("Method not implemented."); }
    async createUser(_user: any): Promise<User> { throw new Error("Method not implemented."); }
    async updateUser(_id: string, _user: any): Promise<User | undefined> { throw new Error("Method not implemented."); }
    async getTrip(_id: string, _organizationId: string): Promise<any | undefined> { throw new Error("Method not implemented."); }
    async getTripsByUserId(_userId: string, _organizationId?: string | null): Promise<any[]> { throw new Error("Method not implemented."); }
    async getTripsByOrganizationId(_organizationId: string): Promise<any[]> { throw new Error("Method not implemented."); }
    async getUserTrips(_userId: string, _organizationId?: string | null): Promise<any[]> { throw new Error("Method not implemented."); }
    async getTripByShareCode(_shareCode: string): Promise<any | undefined> { throw new Error("Method not implemented."); }
    async createTrip(_trip: any): Promise<any> { throw new Error("Method not implemented."); }
    async updateTrip(_id: string, _organizationId: string, _trip: any): Promise<any | undefined> { throw new Error("Method not implemented."); }
    async deleteTrip(_id: string, _organizationId: string): Promise<boolean> { throw new Error("Method not implemented."); }
    async getActivitiesByTripId(tripId: string): Promise<any[]> { throw new Error("Method not implemented."); }
    async getActivity(id: string): Promise<any | undefined> { throw new Error("Method not implemented."); }
    async createActivity(activity: any): Promise<any> { throw new Error("Method not implemented."); }
    async updateActivity(id: string, updates: any): Promise<any | undefined> { throw new Error("Method not implemented."); }
    async deleteActivity(id: string): Promise<boolean> { throw new Error("Method not implemented."); }
}
