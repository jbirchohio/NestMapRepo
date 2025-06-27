/**
 * Represents a shared item in the collaboration system
 */
export interface SharedItemDataType {
    id: string;
    type: string;
    title?: string;
    description?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    createdBy?: number;
    updatedBy?: number;
    metadata?: Record<string, unknown>;
    [key: string]: unknown; // Allow additional properties
}

export default SharedItemDataType;
