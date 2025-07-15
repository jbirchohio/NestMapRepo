// Define base repository interface
export interface BaseRepository<T, ID, CreateDto = Omit<T, 'id' | 'createdAt' | 'updatedAt'>, UpdateDto = Partial<CreateDto>> {
  // CRUD operations
  create(data: CreateDto): Promise<T>;
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  update(id: ID, data: UpdateDto): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
  
  // Common query operations
  count(): Promise<number>;
  exists(id: ID): Promise<boolean>;
}
