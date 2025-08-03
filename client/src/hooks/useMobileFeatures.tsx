import { useState, useEffect, useRef } from 'react';

interface MobileGeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface OfflineDataItem {
  type: 'activity_update' | 'photo_upload';
  id: string | number;
  data: Record<string, unknown>;
  timestamp: number;
}

interface NotificationOptions {
  icon?: string;
  badge?: string;
  tag?: string;
  [key: string]: unknown;
}

interface MobileFeatures {
  // Location services
  currentLocation: MobileGeolocationPosition | null;
  isLocationEnabled: boolean;
  locationError: string | null;
  
  // Offline capabilities
  isOnline: boolean;
  offlineData: OfflineDataItem[];
  
  // Camera integration
  capturePhoto: () => Promise<string | null>;
  
  // Push notifications
  sendNotification: (title: string, body: string, options?: NotificationOptions) => void;
  requestNotificationPermission: () => Promise<boolean>;
  
  // Travel mode
  isTravelMode: boolean;
  setTravelMode: (enabled: boolean) => void;
  
  // Navigation
  openMapsNavigation: (destination: { lat: number; lng: number; name?: string }) => void;
}

export function useMobileFeatures(): MobileFeatures {
  const [currentLocation, setCurrentLocation] = useState<MobileGeolocationPosition | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineDataItem[]>([]);
  const [isTravelMode, setIsTravelMode] = useState(false);
  
  const watchIdRef = useRef<number | null>(null);

  // Initialize geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // Cache for 1 minute
    };

    const success = (position: GeolocationPosition) => {
      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      });
      setIsLocationEnabled(true);
      setLocationError(null);
    };

    const error = (err: GeolocationPositionError) => {
      setLocationError(err.message);
      setIsLocationEnabled(false);
      
      switch (err.code) {
        case err.PERMISSION_DENIED:
          setLocationError('Location access denied by user');
          break;
        case err.POSITION_UNAVAILABLE:
          setLocationError('Location information is unavailable');
          break;
        case err.TIMEOUT:
          setLocationError('Location request timed out');
          break;
        default:
          setLocationError('An unknown error occurred');
          break;
      }
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(success, error, options);

    // Start continuous tracking in travel mode
    if (isTravelMode) {
      watchIdRef.current = navigator.geolocation.watchPosition(success, error, options);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isTravelMode]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Sync offline data when back online
      syncOfflineData();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('nestmap_offline_data');
    if (saved) {
      try {
        setOfflineData(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading offline data:', error);
      }
    }
  }, []);

  const syncOfflineData = async () => {
    if (offlineData.length === 0) return;

    try {
      // Sync offline changes when connection is restored
      for (const item of offlineData) {
        if (item.type === 'activity_update') {
          await fetch(`/api/activities/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data)
          });
        } else if (item.type === 'photo_upload') {
          await fetch('/api/upload-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data)
          });
        }
      }
      
      // Clear offline data after successful sync
      setOfflineData([]);
      localStorage.removeItem('nestmap_offline_data');
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }
  };

  const capturePhoto = async (): Promise<string | null> => {
    try {
      // Check if we're in a mobile app with camera access
      if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment' // Use back camera
          } 
        });
        
        // Create a video element to capture the stream
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        return new Promise((resolve) => {
          video.addEventListener('loadedmetadata', () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0);
            
            // Stop the stream
            stream.getTracks().forEach(track => track.stop());
            
            // Convert to base64
            const dataURL = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataURL);
          });
        });
      } else {
        // Fallback to file input for desktop
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        
        return new Promise((resolve) => {
          input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            } else {
              resolve(null);
            }
          };
          input.click();
        });
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      return null;
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      // Browser does not support notifications
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const sendNotification = (title: string, body: string, options: NotificationOptions = {}) => {
    if (Notification.permission !== 'granted') {
      // Notification permission not granted
      return;
    }

    const defaultOptions = {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'nestmap-notification',
      ...options
    };

    new Notification(title, {
      body,
      ...defaultOptions
    });
  };

  const setTravelModeWithEffects = (enabled: boolean) => {
    setIsTravelMode(enabled);
    
    if (enabled) {
      // Request location permission and start tracking
      if (navigator.geolocation && !isLocationEnabled) {
        navigator.geolocation.getCurrentPosition(
          () => setIsLocationEnabled(true),
          (err) => setLocationError(err.message)
        );
      }
      
      // Request notification permission
      requestNotificationPermission();
      
      // Send welcome notification
      setTimeout(() => {
        sendNotification(
          'Travel Mode Active',
          'VoyageOps is now tracking your journey and will send helpful updates!'
        );
      }, 1000);
    }
  };

  const openMapsNavigation = (destination: { lat: number; lng: number; name?: string }) => {
    const { lat, lng, name } = destination;
    
    // Check if we're on mobile
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Try to open native maps app
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        // iOS Maps
        window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=w${name ? `&q=${encodeURIComponent(name)}` : ''}`);
      } else {
        // Google Maps for Android
        window.open(`geo:${lat},${lng}?q=${lat},${lng}${name ? `(${encodeURIComponent(name)})` : ''}`);
      }
    } else {
      // Desktop - open Google Maps in browser
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${name ? `&destination_place_id=${encodeURIComponent(name)}` : ''}`, '_blank');
    }
  };

  return {
    currentLocation,
    isLocationEnabled,
    locationError,
    isOnline,
    offlineData,
    capturePhoto,
    sendNotification,
    requestNotificationPermission,
    isTravelMode,
    setTravelMode: setTravelModeWithEffects,
    openMapsNavigation
  };
}