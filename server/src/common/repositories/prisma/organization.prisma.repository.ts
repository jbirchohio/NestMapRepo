import { PrismaClient, Organization as PrismaOrganization, OrganizationStatus as PrismaOrganizationStatus, OrganizationPlan as PrismaOrganizationPlan } from '@prisma/client';
import { OrganizationRepository } from '../organization/organization.repository.interface.js';
import { Organization, OrganizationMember, OrganizationRole, OrganizationPlan, OrganizationStatus, CreateOrganizationData, UpdateOrganizationData, OrganizationSettings } from '@shared/schema/types/organizations';
import { logger } from '../../../../utils/logger.js';

export class PrismaOrganizationRepository implements OrganizationRepository {
    private readonly logger = logger;
    
    constructor(private readonly prisma: PrismaClient) {}

    private toDomainOrganization(prismaOrg: PrismaOrganization & {
        members?: Array<{
            userId: string;
            role: string;
            joinedAt: Date;
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
            };
        }>;
    }): Organization {
        return {
            id: prismaOrg.id,
            name: prismaOrg.name,
            slug: prismaOrg.slug,
            description: prismaOrg.description || undefined,
            logoUrl: prismaOrg.logoUrl || undefined,
            website: prismaOrg.website || undefined,
            status: prismaOrg.status as OrganizationStatus,
            plan: prismaOrg.plan as OrganizationPlan,
            settings: prismaOrg.settings as OrganizationSettings || {},
            createdAt: prismaOrg.createdAt,
            updatedAt: prismaOrg.updatedAt,
            members: prismaOrg.members?.map(member => ({
                userId: member.userId,
                email: member.user.email,
                firstName: member.user.firstName || undefined,
                lastName: member.user.lastName || undefined,
                role: member.role as OrganizationRole,
                joinedAt: member.joinedAt
            })) || []
        };
    }

    async findById(id: string): Promise<Organization | null> {
        try {
            const org = await this.prisma.organization.findUnique({
                where: { id },
                include: {
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true,
                                }
                            }
                        }
                    }
                }
            });

            return org ? this.toDomainOrganization(org) : null;
        } catch (error) {
            this.logger.error(`Failed to find organization by id ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find organization');
        }
    }

    async findBySlug(slug: string): Promise<Organization | null> {
        try {
            const org = await this.prisma.organization.findUnique({
                where: { slug },
                include: {
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true,
                                }
                            }
                        }
                    }
                }
            });

            return org ? this.toDomainOrganization(org) : null;
        } catch (error) {
            this.logger.error(`Failed to find organization by slug ${slug}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find organization');
        }
    }

    async findAll(): Promise<Organization[]> {
        try {
            const orgs = await this.prisma.organization.findMany({
                include: {
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true,
                                }
                            }
                        }
                    }
                }
            });

            return orgs.map(org => this.toDomainOrganization(org));
        } catch (error) {
            this.logger.error(`Failed to find all organizations: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to find organizations');
        }
    }

    async create(organizationData: CreateOrganizationData): Promise<Organization> {
        try {
            const { ownerId, ...data } = organizationData;
            
            const org = await this.prisma.organization.create({
                data: {
                    ...data,
                    status: data.status || 'ACTIVE',
                    plan: data.plan || 'FREE',
                    members: ownerId ? {
                        create: [{
                            userId: ownerId,
                            role: 'ADMIN',
                            joinedAt: new Date()
                        }]
                    } : undefined
                },
                include: {
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true,
                                }
                            }
                        }
                    }
                }
            });

            return this.toDomainOrganization(org);
        } catch (error) {
            this.logger.error(`Failed to create organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to create organization');
        }
    }

    async update(id: string, organizationData: UpdateOrganizationData): Promise<Organization> {
        try {
            const org = await this.prisma.organization.update({
                where: { id },
                data: organizationData,
                include: {
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true,
                                }
                            }
                        }
                    }
                }
            });

            return this.toDomainOrganization(org);
        } catch (error) {
            this.logger.error(`Failed to update organization ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to update organization');
        }
    }

    async delete(id: string): Promise<boolean> {
        try {
            await this.prisma.organization.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            this.logger.error(`Failed to delete organization ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    // Implement other methods from the interface...
    async addMember(organizationId: string, userId: string, role: OrganizationRole): Promise<OrganizationMember> {
        try {
            const member = await this.prisma.organizationMember.create({
                data: {
                    organizationId,
                    userId,
                    role,
                    joinedAt: new Date()
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        }
                    }
                }
            });

            return {
                userId: member.userId,
                email: member.user.email,
                firstName: member.user.firstName || undefined,
                lastName: member.user.lastName || undefined,
                role: member.role as OrganizationRole,
                joinedAt: member.joinedAt
            };
        } catch (error) {
            this.logger.error(`Failed to add member to organization ${organizationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to add member to organization');
        }
    }

    async removeMember(organizationId: string, userId: string): Promise<boolean> {
        try {
            await this.prisma.organizationMember.delete({
                where: {
                    organizationId_userId: {
                        organizationId,
                        userId
                    }
                }
            });
            return true;
        } catch (error) {
            this.logger.error(`Failed to remove member from organization ${organizationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    async updateMemberRole(organizationId: string, userId: string, role: OrganizationRole): Promise<OrganizationMember | null> {
        try {
            const member = await this.prisma.organizationMember.update({
                where: {
                    organizationId_userId: {
                        organizationId,
                        userId
                    }
                },
                data: { role },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        }
                    }
                }
            });

            return {
                userId: member.userId,
                email: member.user.email,
                firstName: member.user.firstName || undefined,
                lastName: member.user.lastName || undefined,
                role: member.role as OrganizationRole,
                joinedAt: member.joinedAt
            };
        } catch (error) {
            this.logger.error(`Failed to update member role in organization ${organizationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        }
    }

    async getMembers(organizationId: string): Promise<OrganizationMember[]> {
        try {
            const members = await this.prisma.organizationMember.findMany({
                where: { organizationId },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        }
                    }
                }
            });

            return members.map(member => ({
                userId: member.userId,
                email: member.user.email,
                firstName: member.user.firstName || undefined,
                lastName: member.user.lastName || undefined,
                role: member.role as OrganizationRole,
                joinedAt: member.joinedAt
            }));
        } catch (error) {
            this.logger.error(`Failed to get members for organization ${organizationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to get organization members');
        }
    }

    async isMember(organizationId: string, userId: string): Promise<boolean> {
        try {
            const count = await this.prisma.organizationMember.count({
                where: {
                    organizationId,
                    userId
                }
            });
            return count > 0;
        } catch (error) {
            this.logger.error(`Failed to check membership for user ${userId} in organization ${organizationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    async updateSettings(organizationId: string, settings: OrganizationSettings): Promise<OrganizationSettings> {
        try {
            const org = await this.prisma.organization.update({
                where: { id: organizationId },
                data: { settings },
                select: { settings: true }
            });

            return org.settings as OrganizationSettings;
        } catch (error) {
            this.logger.error(`Failed to update settings for organization ${organizationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to update organization settings');
        }
    }

    async getSettings(organizationId: string): Promise<OrganizationSettings> {
        try {
            const org = await this.prisma.organization.findUnique({
                where: { id: organizationId },
                select: { settings: true }
            });

            if (!org) {
                throw new Error('Organization not found');
            }

            return org.settings as OrganizationSettings;
        } catch (error) {
            this.logger.error(`Failed to get settings for organization ${organizationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error('Failed to get organization settings');
        }
    }
}
