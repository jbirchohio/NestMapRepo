import type { 
  Organization, 
  OrganizationMember, 
  OrganizationRole, 
  OrganizationPlan,
  OrganizationStatus,
  CreateOrganizationData,
  UpdateOrganizationData,
  OrganizationSettings
} from '@shared/types/organizations.js';
import type { User } from '@shared/types/users.js';
/**
 * Interface for organization data access operations
 */
export interface OrganizationRepository {
    // Organization retrieval
    
    /**
     * Finds an organization by its ID
     * @param id - The ID of the organization to find
     * @returns The organization if found, null otherwise
     */
    findById(id: string): Promise<Organization | null>;
    
    /**
     * Finds an organization by its slug
     * @param slug - The URL-friendly identifier for the organization
     * @returns The organization if found, null otherwise
     */
    findBySlug(slug: string): Promise<Organization | null>;
    
    /**
     * Retrieves all organizations
     * @returns Array of all organizations
     */
    findAll(): Promise<Organization[]>;
    
    // Organization management
    
    /**
     * Creates a new organization
     * @param organizationData - Data for the new organization
     * @returns The created organization
     */
    create(organizationData: CreateOrganizationData): Promise<Organization>;
    
    /**
     * Updates an existing organization
     * @param id - The ID of the organization to update
     * @param organizationData - Data to update
     * @returns The updated organization, or null if not found
     */
    update(id: string, organizationData: UpdateOrganizationData): Promise<Organization | null>;
    
    /**
     * Soft deletes an organization
     * @param id - The ID of the organization to delete
     * @returns true if deleted, false otherwise
     */
    delete(id: string): Promise<boolean>;
    
    // Organization members
    
    /**
     * Retrieves all members of an organization
     * @param organizationId - The ID of the organization
     * @returns Array of organization members with user data
     */
    getMembers(organizationId: string): Promise<OrganizationMember[]>;
    
    /**
     * Adds a user as a member to an organization
     * @param organizationId - The ID of the organization
     * @param userId - The ID of the user to add
     * @param role - The role to assign to the user
     * @returns The created/updated organization member
     */
    addMember(organizationId: string, userId: string, role: OrganizationRole): Promise<OrganizationMember>;
    
    /**
     * Removes a user from an organization
     * @param organizationId - The ID of the organization
     * @param userId - The ID of the user to remove
     * @returns true if removed, false otherwise
     */
    removeMember(organizationId: string, userId: string): Promise<boolean>;
    
    /**
     * Updates a member's role in an organization
     * @param organizationId - The ID of the organization
     * @param userId - The ID of the user
     * @param role - The new role
     * @returns true if updated, false otherwise
     */
    updateMemberRole(organizationId: string, userId: string, role: OrganizationRole): Promise<boolean>;
    
    // Plan and settings
    
    /**
     * Updates an organization's subscription plan
     * @param organizationId - The ID of the organization
     * @param plan - The new plan
     * @returns The updated organization, or null if not found
     */
    updatePlan(organizationId: string, plan: OrganizationPlan): Promise<Organization | null>;
    
    /**
     * Updates an organization's settings
     * @param organizationId - The ID of the organization
     * @param settings - The new settings (shallow merged with existing)
     * @returns The updated organization, or null if not found
     */
    updateSettings(organizationId: string, settings: Partial<OrganizationSettings>): Promise<Organization | null>;
}
