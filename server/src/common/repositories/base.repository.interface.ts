/**
 * Base repository interface defining common CRUD operations
 */
export interface BaseRepository<T, ID, CreateData, UpdateData> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: CreateData): Promise<T>;
  update(id: ID, data: UpdateData): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
  count(filter?: Partial<T>): Promise<number>;
  exists(id: ID): Promise<boolean>;
}

