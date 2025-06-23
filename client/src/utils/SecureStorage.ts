const secureStorage = window.localStorage;
export class SecureStorage {
    private storage = secureStorage;
    async getItem(key: string): Promise<string | null> {
        try {
            return this.storage.getItem(key);
        }
        catch (error) {
            console.error('Error retrieving secure storage item:', error);
            return null;
        }
    }
    async setItem(key: string, value: string): Promise<void> {
        try {
            this.storage.setItem(key, value);
        }
        catch (error) {
            console.error('Error setting secure storage item:', error);
            throw error;
        }
    }
    async removeItem(key: string): Promise<void> {
        try {
            this.storage.removeItem(key);
        }
        catch (error) {
            console.error('Error removing secure storage item:', error);
            throw error;
        }
    }
    async clear(): Promise<void> {
        try {
            this.storage.clear();
        }
        catch (error) {
            console.error('Error clearing secure storage:', error);
            throw error;
        }
    }
}
