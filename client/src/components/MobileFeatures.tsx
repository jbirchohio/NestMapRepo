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
  AlertTriangle,
  Plane,
  Hotel,
  Car,
  Receipt
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface OfflineData {
  trips: any[];
  expenses: any[];
  receipts: any[];
  pendingSync: {
    expenses: any[];
    receipts: any[];
    checkIns: any[];
  };
}

export function MobileFeatures() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const queryClient = useQueryClient();

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

  // Enable offline mode
  const enableOfflineMode = async () => {
    try {
      // Download essential data
      const response = await fetch('/api/mobile/download-offline-data', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      // Store in IndexedDB
      if ('indexedDB' in window) {
        const db = await openOfflineDB();
        const tx = db.transaction(['trips', 'expenses', 'receipts'], 'readwrite');
        
        // Store trips
        for (const trip of data.trips) {
          await tx.objectStore('trips').put(trip);
        }
        
        // Store expenses
        for (const expense of data.expenses) {
          await tx.objectStore('expenses').put(expense);
        }
        
        await new Promise((resolve, reject) => {
          tx.oncomplete = () => resolve(undefined);
          tx.onerror = () => reject(tx.error);
        });
      }
      
      // Store in localStorage as backup
      localStorage.setItem('offlineData', JSON.stringify(data));
      setOfflineData(data);
      setOfflineMode(true);
    } catch (error) {
      console.error('Failed to enable offline mode:', error);
    }
  };

  // Sync offline data when back online
  const syncOfflineData = async () => {
    if (!offlineData?.pendingSync) return;

    try {
      // Sync expenses
      for (const expense of offlineData.pendingSync.expenses) {
        await fetch('/api/enterprise-expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(expense)
        });
      }

      // Sync receipts
      for (const receipt of offlineData.pendingSync.receipts) {
        const formData = new FormData();
        formData.append('receipt', receipt.file);
        
        await fetch(`/api/enterprise-expenses/${receipt.expenseId}/receipt`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });
      }

      // Check-ins removed - duty of care API not available

      // Clear pending sync
      setOfflineData({
        ...offlineData,
        pendingSync: {
          expenses: [],
          receipts: [],
          checkIns: []
        }
      });

      localStorage.removeItem('pendingSync');
      queryClient.invalidateQueries();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  // Quick expense capture with camera
  const captureReceipt = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setCameraStream(stream);
    } catch (error) {
      console.error('Camera access failed:', error);
    }
  };

  const takePhoto = () => {
    if (!cameraStream) return;

    const video = document.querySelector('video') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      // Create expense with receipt
      const expense = {
        merchant_name: 'Quick Capture',
        amount: 0, // To be extracted by OCR
        transaction_date: new Date(),
        expense_category: 'other',
        receipt_blob: blob
      };

      if (isOnline) {
        // Upload immediately
        const formData = new FormData();
        formData.append('receipt', blob, 'receipt.jpg');
        formData.append('quickCapture', 'true');
        
        await fetch('/api/enterprise-expenses/quick-capture', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });
      } else {
        // Store offline
        const reader = new FileReader();
        reader.onloadend = () => {
          const pendingSync = JSON.parse(localStorage.getItem('pendingSync') || '{"receipts":[]}');
          pendingSync.receipts.push({
            file: reader.result,
            timestamp: new Date(),
            quickCapture: true
          });
          localStorage.setItem('pendingSync', JSON.stringify(pendingSync));
        };
        reader.readAsDataURL(blob);
      }

      // Stop camera
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }, 'image/jpeg');
  };

  // Location-based check-in
  const checkIn = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const checkInData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date()
        };

        // Location check-in feature removed - no duty of care API available
        alert('Check-in feature not available in this version');
      },
      (error) => {
        console.error('Location error:', error);
      }
    );
  };

  // Mobile-optimized UI
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
          {!isOnline && offlineData?.pendingSync && (
            <span className="text-sm">
              {Object.values(offlineData.pendingSync).flat().length} items pending sync
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Quick Actions */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button 
            onClick={captureReceipt}
            className="flex flex-col items-center gap-2 h-24"
          >
            <Camera className="h-6 w-6" />
            <span className="text-xs">Capture Receipt</span>
          </Button>
          
          {/* Check-in removed - no duty of care API */}
          
          <Button 
            onClick={() => window.location.href = '/mobile/expenses'}
            variant="outline"
            className="flex flex-col items-center gap-2 h-24"
          >
            <Receipt className="h-6 w-6" />
            <span className="text-xs">Log Expense</span>
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/mobile/emergency'}
            variant="destructive"
            className="flex flex-col items-center gap-2 h-24"
          >
            <AlertTriangle className="h-6 w-6" />
            <span className="text-xs">Emergency</span>
          </Button>
        </CardContent>
      </Card>

      {/* Current Trip */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Current Trip</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">New York → San Francisco</span>
              <Plane className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-sm">
              <p className="font-medium">Q1 Sales Conference</p>
              <p className="text-gray-600">Feb 15-18, 2025</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Hotel className="h-4 w-4 mr-1" />
                Hotel
              </Button>
              <Button size="sm" variant="outline">
                <Car className="h-4 w-4 mr-1" />
                Transport
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offline Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Offline Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!offlineMode ? (
            <>
              <p className="text-sm text-gray-600">
                Download trip data for offline access
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
              {isOnline && offlineData?.pendingSync && 
                Object.values(offlineData.pendingSync).flat().length > 0 && (
                <Button onClick={syncOfflineData} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Sync Now
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Camera View */}
      {cameraStream && (
        <div className="fixed inset-0 bg-black z-50">
          <video 
            autoPlay 
            playsInline
            className="w-full h-full object-cover"
            ref={(video) => {
              if (video && cameraStream) {
                video.srcObject = cameraStream;
              }
            }}
          />
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
            <Button 
              onClick={takePhoto}
              size="lg"
              className="rounded-full w-16 h-16"
            >
              <Camera className="h-6 w-6" />
            </Button>
            <Button 
              onClick={() => {
                cameraStream.getTracks().forEach(track => track.stop());
                setCameraStream(null);
              }}
              variant="outline"
              size="lg"
              className="rounded-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: Open IndexedDB
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
      if (!db.objectStoreNames.contains('expenses')) {
        db.createObjectStore('expenses', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('receipts')) {
        db.createObjectStore('receipts', { keyPath: 'id' });
      }
    };
  });
}