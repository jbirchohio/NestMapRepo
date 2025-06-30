/**
 * Base repository interface that defines common CRUD operations
 */
export interface BaseRepository<T, ID, CreateInput, UpdateInput> {
  /**
   * Find a single entity by its ID
   */
  findById(id: ID): Promise<T | null>;
  
  /**
   * Find all entities with optional pagination and filtering
   */
  findAll(params?: {
    skip?: number;
    take?: number;
    cursor?: any;
    where?: any;
    orderBy?: any;
  }): Promise<T[]>;
  
  /**
   * Create a new entity
   */
  create(data: CreateInput): Promise<T>;
  
  /**
   * Update an existing entity
   */
  update(id: ID, data: UpdateInput): Promise<T | null>;
  
  /**
   * Delete an entity by ID
   */
  delete(id: ID): Promise<boolean>;
  
  /**
   * Count entities matching the given filter
   */
  count(where?: any): Promise<number>;
}
