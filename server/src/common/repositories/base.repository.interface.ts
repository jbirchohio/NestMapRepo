/**
 * Base repository interface that defines common CRUD operations
 * This interface can be extended by specific repository interfaces
 */
export interface BaseRepository<T, ID, CreateDTO, UpdateDTO> {
  // Basic CRUD operations
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: CreateDTO): Promise<T>;
  update(id: ID, data: UpdateDTO): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
  
  // Common query operations
  findByIds(ids: ID[]): Promise<T[]>;
  count(filter?: Partial<T>): Promise<number>;
  exists(id: ID): Promise<boolean>;
}
