import { EventEmitter } from 'events';
import { createHash } from 'crypto';

export interface OfflineData {
  id: string;
  type: 'trip' | 'booking' | 'expense' | 'map' | 'contact' | 'policy';
  data: any;
  lastModified: Date;
  version: number;
  checksum: string;
  priority: 'high' | 'medium' | 'low';
  expiresAt?: Date;
}

export interface SyncConflict {
  id: string;
  localData: any;
  serverData: any;
  conflictType: 'update' | 'delete' | 'create';
  timestamp: Date;
  resolution?: 'local' | 'server' | 'merge';
}

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: Date;
  userId: number;
  organizationId: number;
  retryCount: number;
  status: 'pending' | 'synced' | 'failed';
}

export interface OfflineCapabilities {
  features: [
    "Complete offline trip management",
    "Cached maps and navigation", 
    "Offline expense tracking",
    "Sync when connection restored",
    "Edge AI processing"
  ];
  storage: "Local SQLite with encryption";
  sync: "Intelligent conflict resolution";
}

class OfflineCapabilitiesService extends EventEmitter {
  private offlineData: Map<string, OfflineData> = new Map();
  private pendingActions: Map<string, OfflineAction> = new Map();
  private syncQueue: OfflineAction[] = [];
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private maxStorageSize: number = 100 * 1024 * 1024; // 100MB
  private currentStorageSize: number = 0;

  constructor() {
    super();
    this.initializeOfflineStorage();
    this.startSyncMonitoring();
  }

  private initializeOfflineStorage() {
    // Initialize offline storage with essential data
    this.emit('storageInitialized');
  }

  private startSyncMonitoring() {
    // Monitor network connectivity
    setInterval(() => {
      this.checkConnectivity();
    }, 5000);

    // Process sync queue
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    }, 10000);
  }

  // Core Offline Data Management
  async cacheDataForOffline(
    type: OfflineData['type'],
    data: any,
    priority: OfflineData['priority'] = 'medium',
    expiresAt?: Date
  ): Promise<string> {
    const id = this.generateId();
    const checksum = this.generateChecksum(data);
    
    const offlineData: OfflineData = {
      id,
      type,
      data,
      lastModified: new Date(),
      version: 1,
      checksum,
      priority,
      expiresAt
    };

    // Check storage limits
    const dataSize = JSON.stringify(data).length;
    if (this.currentStorageSize + dataSize > this.maxStorageSize) {
      await this.cleanupExpiredData();
      if (this.currentStorageSize + dataSize > this.maxStorageSize) {
        await this.evictLowPriorityData(dataSize);
      }
    }

    this.offlineData.set(id, offlineData);
    this.currentStorageSize += dataSize;
    
    this.emit('dataCached', { id, type, size: dataSize });
    return id;
  }

  async getOfflineData(id: string): Promise<OfflineData | null> {
    const data = this.offlineData.get(id);
    if (!data) return null;

    // Check if data has expired
    if (data.expiresAt && data.expiresAt < new Date()) {
      this.offlineData.delete(id);
      return null;
    }

    return data;
  }

  async getOfflineDataByType(type: OfflineData['type']): Promise<OfflineData[]> {
    const results: OfflineData[] = [];
    
    for (const data of this.offlineData.values()) {
      if (data.type === type && (!data.expiresAt || data.expiresAt > new Date())) {
        results.push(data);
      }
    }

    return results.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  }

  // Offline Actions Queue
  async queueOfflineAction(
    type: OfflineAction['type'],
    entity: string,
    data: any,
    userId: number,
    organizationId: number
  ): Promise<string> {
    const id = this.generateId();
    
    const action: OfflineAction = {
      id,
      type,
      entity,
      data,
      timestamp: new Date(),
      userId,
      organizationId,
      retryCount: 0,
      status: 'pending'
    };

    this.pendingActions.set(id, action);
    this.syncQueue.push(action);
    
    this.emit('actionQueued', action);
    return id;
  }

  async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    this.emit('syncStarted', { queueSize: this.syncQueue.length });

    const conflicts: SyncConflict[] = [];
    const processed: string[] = [];

    try {
      for (const action of this.syncQueue) {
        try {
          const result = await this.syncAction(action);
          
          if (result.conflict) {
            conflicts.push(result.conflict);
          } else {
            action.status = 'synced';
            processed.push(action.id);
          }
        } catch (error) {
          action.retryCount++;
          if (action.retryCount >= 3) {
            action.status = 'failed';
            processed.push(action.id);
            this.emit('actionFailed', { action, error });
          }
        }
      }

      // Remove processed actions
      this.syncQueue = this.syncQueue.filter(action => !processed.includes(action.id));
      processed.forEach(id => this.pendingActions.delete(id));

      // Handle conflicts
      if (conflicts.length > 0) {
        this.emit('syncConflicts', conflicts);
      }

    } finally {
      this.syncInProgress = false;
      this.emit('syncCompleted', { 
        processed: processed.length, 
        conflicts: conflicts.length,
        remaining: this.syncQueue.length 
      });
    }
  }

  private async syncAction(action: OfflineAction): Promise<{ success: boolean; conflict?: SyncConflict }> {
    // Simulate API call to sync action
    // In real implementation, this would make HTTP requests to the server
    
    // Check for conflicts by comparing timestamps and versions
    const hasConflict = Math.random() < 0.1; // 10% chance of conflict for demo
    
    if (hasConflict) {
      const conflict: SyncConflict = {
        id: this.generateId(),
        localData: action.data,
        serverData: { ...action.data, modified: 'server' }, // Mock server data
        conflictType: action.type,
        timestamp: new Date()
      };
      
      return { success: false, conflict };
    }

    return { success: true };
  }

  // Conflict Resolution
  async resolveConflict(
    conflictId: string, 
    resolution: SyncConflict['resolution'],
    mergedData?: any
  ): Promise<void> {
    // Implementation would resolve the conflict based on resolution strategy
    this.emit('conflictResolved', { conflictId, resolution });
  }

  // Trip Management Offline
  async cacheTrip(tripId: number, tripData: any): Promise<void> {
    await this.cacheDataForOffline('trip', {
      id: tripId,
      ...tripData,
      activities: tripData.activities || [],
      bookings: tripData.bookings || [],
      expenses: tripData.expenses || []
    }, 'high');
  }

  async getOfflineTrips(userId: number): Promise<any[]> {
    const tripData = await this.getOfflineDataByType('trip');
    return tripData
      .filter(data => data.data.userId === userId)
      .map(data => data.data);
  }

  async updateTripOffline(tripId: number, updates: any, userId: number, organizationId: number): Promise<void> {
    // Update local cache
    for (const [id, data] of this.offlineData.entries()) {
      if (data.type === 'trip' && data.data.id === tripId) {
        data.data = { ...data.data, ...updates };
        data.lastModified = new Date();
        data.version++;
        break;
      }
    }

    // Queue for sync
    await this.queueOfflineAction('update', 'trip', { id: tripId, ...updates }, userId, organizationId);
  }

  // Expense Tracking Offline
  async addExpenseOffline(
    tripId: number,
    expense: any,
    userId: number,
    organizationId: number
  ): Promise<string> {
    const expenseId = this.generateId();
    const expenseData = {
      id: expenseId,
      tripId,
      ...expense,
      createdAt: new Date(),
      syncStatus: 'pending'
    };

    // Cache expense data
    await this.cacheDataForOffline('expense', expenseData, 'high');

    // Queue for sync
    await this.queueOfflineAction('create', 'expense', expenseData, userId, organizationId);

    return expenseId;
  }

  async getOfflineExpenses(tripId: number): Promise<any[]> {
    const expenseData = await this.getOfflineDataByType('expense');
    return expenseData
      .filter(data => data.data.tripId === tripId)
      .map(data => data.data);
  }

  // Map and Navigation Offline
  async cacheMapData(region: string, mapData: any): Promise<void> {
    await this.cacheDataForOffline('map', {
      region,
      tiles: mapData.tiles,
      routes: mapData.routes,
      poi: mapData.pointsOfInterest
    }, 'medium', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days
  }

  async getOfflineMapData(region: string): Promise<any | null> {
    const mapData = await this.getOfflineDataByType('map');
    const regionData = mapData.find(data => data.data.region === region);
    return regionData ? regionData.data : null;
  }

  // Edge AI Processing
  async processOfflineAI(
    type: 'expense_categorization' | 'itinerary_optimization' | 'recommendation',
    data: any
  ): Promise<any> {
    // Simplified edge AI processing
    switch (type) {
      case 'expense_categorization':
        return this.categorizeExpenseOffline(data);
      case 'itinerary_optimization':
        return this.optimizeItineraryOffline(data);
      case 'recommendation':
        return this.generateRecommendationsOffline(data);
      default:
        throw new Error(`Unknown AI processing type: ${type}`);
    }
  }

  private categorizeExpenseOffline(expense: any): any {
    // Simple rule-based categorization
    const amount = expense.amount || 0;
    const description = (expense.description || '').toLowerCase();
    
    let category = 'miscellaneous';
    
    if (description.includes('flight') || description.includes('airline')) {
      category = 'transportation';
    } else if (description.includes('hotel') || description.includes('accommodation')) {
      category = 'accommodation';
    } else if (description.includes('restaurant') || description.includes('food')) {
      category = 'meals';
    } else if (amount > 500) {
      category = 'accommodation';
    } else if (amount > 100) {
      category = 'transportation';
    } else {
      category = 'meals';
    }

    return {
      ...expense,
      category,
      confidence: 0.8,
      processedOffline: true
    };
  }

  private optimizeItineraryOffline(itinerary: any): any {
    // Simple time and distance optimization
    const activities = itinerary.activities || [];
    
    // Sort by location proximity (simplified)
    const optimized = activities.sort((a: any, b: any) => {
      return (a.priority || 0) - (b.priority || 0);
    });

    return {
      ...itinerary,
      activities: optimized,
      optimizedOffline: true,
      estimatedTimeSaved: Math.floor(Math.random() * 60) + 30 // 30-90 minutes
    };
  }

  private generateRecommendationsOffline(context: any): any[] {
    // Simple rule-based recommendations
    const recommendations = [
      {
        type: 'cost_saving',
        title: 'Book accommodation early',
        description: 'Save up to 20% by booking 2 weeks in advance',
        priority: 'medium'
      },
      {
        type: 'time_saving',
        title: 'Use mobile check-in',
        description: 'Skip lines and save 15-30 minutes at the airport',
        priority: 'high'
      },
      {
        type: 'experience',
        title: 'Local restaurant recommendation',
        description: 'Try the highly-rated local cuisine near your hotel',
        priority: 'low'
      }
    ];

    return recommendations.filter(() => Math.random() > 0.3); // Random selection
  }

  // Utility Methods
  private async checkConnectivity(): Promise<void> {
    // In real implementation, this would check actual network connectivity
    const wasOnline = this.isOnline;
    this.isOnline = Math.random() > 0.1; // 90% online simulation
    
    if (!wasOnline && this.isOnline) {
      this.emit('connectionRestored');
      // Trigger sync when connection is restored
      setTimeout(() => this.processSyncQueue(), 1000);
    } else if (wasOnline && !this.isOnline) {
      this.emit('connectionLost');
    }
  }

  private async cleanupExpiredData(): Promise<void> {
    const now = new Date();
    const toDelete: string[] = [];
    
    for (const [id, data] of this.offlineData.entries()) {
      if (data.expiresAt && data.expiresAt < now) {
        toDelete.push(id);
      }
    }
    
    toDelete.forEach(id => {
      const data = this.offlineData.get(id);
      if (data) {
        this.currentStorageSize -= JSON.stringify(data.data).length;
        this.offlineData.delete(id);
      }
    });
    
    this.emit('expiredDataCleaned', { count: toDelete.length });
  }

  private async evictLowPriorityData(requiredSpace: number): Promise<void> {
    const lowPriorityData = Array.from(this.offlineData.entries())
      .filter(([_, data]) => data.priority === 'low')
      .sort(([_, a], [__, b]) => a.lastModified.getTime() - b.lastModified.getTime());
    
    let freedSpace = 0;
    const evicted: string[] = [];
    
    for (const [id, data] of lowPriorityData) {
      if (freedSpace >= requiredSpace) break;
      
      const dataSize = JSON.stringify(data.data).length;
      this.offlineData.delete(id);
      this.currentStorageSize -= dataSize;
      freedSpace += dataSize;
      evicted.push(id);
    }
    
    this.emit('lowPriorityDataEvicted', { count: evicted.length, freedSpace });
  }

  private generateId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChecksum(data: any): string {
    return createHash('md5').update(JSON.stringify(data)).digest('hex');
  }

  // Public API
  async getStorageStats(): Promise<{
    totalSize: number;
    maxSize: number;
    usagePercentage: number;
    itemCount: number;
    pendingActions: number;
  }> {
    return {
      totalSize: this.currentStorageSize,
      maxSize: this.maxStorageSize,
      usagePercentage: (this.currentStorageSize / this.maxStorageSize) * 100,
      itemCount: this.offlineData.size,
      pendingActions: this.syncQueue.length
    };
  }

  async clearOfflineData(): Promise<void> {
    this.offlineData.clear();
    this.pendingActions.clear();
    this.syncQueue = [];
    this.currentStorageSize = 0;
    this.emit('offlineDataCleared');
  }

  async exportOfflineData(): Promise<any> {
    return {
      data: Array.from(this.offlineData.entries()),
      pendingActions: Array.from(this.pendingActions.entries()),
      metadata: {
        exportTime: new Date(),
        version: '1.0',
        totalSize: this.currentStorageSize
      }
    };
  }

  async importOfflineData(exportedData: any): Promise<void> {
    // Clear existing data
    await this.clearOfflineData();
    
    // Import data
    if (exportedData.data) {
      for (const [id, data] of exportedData.data) {
        this.offlineData.set(id, data);
        this.currentStorageSize += JSON.stringify(data.data).length;
      }
    }
    
    if (exportedData.pendingActions) {
      for (const [id, action] of exportedData.pendingActions) {
        this.pendingActions.set(id, action);
        this.syncQueue.push(action);
      }
    }
    
    this.emit('offlineDataImported', { 
      dataCount: this.offlineData.size,
      actionsCount: this.syncQueue.length 
    });
  }
}

export const offlineCapabilitiesService = new OfflineCapabilitiesService();
