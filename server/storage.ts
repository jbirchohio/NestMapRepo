// Import MemStorage first to avoid circular dependencies
import { PrismaStorage } from './storage/implementations/PrismaStorage.js';
// Re-export types and interfaces
export * from './storage/types/index.js';
export * from './storage/implementations/PrismaStorage.js';
// For backward compatibility
export { PrismaStorage as Storage };
// Export the default storage instance
const storage = new PrismaStorage();
export { storage };
export default storage;
