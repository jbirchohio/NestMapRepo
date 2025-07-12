// Import MemStorage first to avoid circular dependencies
import { MemStorage } from './storage/implementations/MemStorage.js';

// Re-export types and interfaces
export * from './storage/types.js';
export * from './storage/implementations/MemStorage.js';

// For backward compatibility
export { MemStorage as Storage };

// Export the default storage instance
const storage = new MemStorage();
export { storage };

export default storage;