import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Camera, 
  MapPin, 
  Wifi, 
  WifiOff, 
  Download,
  Upload,
  CheckCircle,
  Map,
  Calendar,
  Share2
} from 'lucide-react';
import { format } from 'date-fns';

interface OfflineData {
  trips: any[];
  templates: any[];
  activities: any[];
}

export function MobileFeatures() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Enable offline mode for trip viewing
  const enableOfflineMode = async () => {
    try {
      // Download trip and template data
      const response = await fetch('/api/mobile/download-offline-data', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      // Store in localStorage for offline access
      localStorage.setItem('offlineData', JSON.stringify(data));
      setOfflineData(data);
      setOfflineMode(true);
    } catch (error) {
      console.error('Failed to enable offline mode:', error);
    }
  };

  // Sync changes when back online
  const syncOfflineData = async () => {
    if (!offlineData) return;

    try {
      // Sync any locally created activities or notes
      const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges') || '[]');
      
      for (const change of pendingChanges) {
        await fetch(`/api/${change.type}`, {
          method: change.method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(change.data)
        });
      }

      // Clear pending changes
      localStorage.removeItem('pendingChanges');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  // Mobile-optimized UI for consumer travel planning
  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Connection Status */}
      <Alert className={`mb-4 ${isOnline ? 'border-green-500' : 'border-orange-500'}`}>
        <AlertDescription className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                Offline Mode
              </>
            )}
          </span>
        </AlertDescription>
      </Alert>

      {/* Quick Actions for Travel Planning */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button 
            onClick={() => window.location.href = '/itinerary'}
            className="flex flex-col items-center gap-2 h-24"
          >
            <Calendar className="h-6 w-6" />
            <span className="text-xs">View Itinerary</span>
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/map'}
            variant="outline"
            className="flex flex-col items-center gap-2 h-24"
          >
            <Map className="h-6 w-6" />
            <span className="text-xs">Trip Map</span>
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/templates'}
            variant="outline"
            className="flex flex-col items-center gap-2 h-24"
          >
            <MapPin className="h-6 w-6" />
            <span className="text-xs">Browse Templates</span>
          </Button>
          
          <Button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'My Trip',
                  text: 'Check out my trip itinerary!',
                  url: window.location.href
                });
              }
            }}
            variant="outline"
            className="flex flex-col items-center gap-2 h-24"
          >
            <Share2 className="h-6 w-6" />
            <span className="text-xs">Share Trip</span>
          </Button>
        </CardContent>
      </Card>

      {/* Current Trip Summary */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>My Trips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm">
              <p className="font-medium">Weekend in Paris</p>
              <p className="text-gray-600">Mar 15-17, 2025</p>
            </div>
            <div className="text-sm">
              <p className="font-medium">Summer Road Trip</p>
              <p className="text-gray-600">Jun 1-14, 2025</p>
            </div>
            <Button size="sm" variant="outline" className="w-full">
              View All Trips
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Offline Mode for Trip Access */}
      <Card>
        <CardHeader>
          <CardTitle>Offline Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!offlineMode ? (
            <>
              <p className="text-sm text-gray-600">
                Download your trips for offline viewing
              </p>
              <Button onClick={enableOfflineMode} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Enable Offline Mode
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Offline mode enabled</span>
              </div>
              <p className="text-sm text-gray-600">
                Last synced: {format(new Date(), 'MMM d, h:mm a')}
              </p>
              {isOnline && (
                <Button onClick={syncOfflineData} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Sync Now
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper: Open IndexedDB for offline storage
async function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RemvanaOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('trips')) {
        db.createObjectStore('trips', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('activities')) {
        db.createObjectStore('activities', { keyPath: 'id' });
      }
    };
  });
}