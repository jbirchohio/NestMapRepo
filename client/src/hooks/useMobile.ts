import { useState, useEffect, useRef, useCallback } from 'react';

// Using the browser's built-in geolocation types
declare global {
    interface Window {
        GeolocationPosition: GeolocationPosition;
        GeolocationPositionError: GeolocationPositionError;
    }
}

// Use the standard browser types for geolocation
type GeolocationCoordinates = {
    readonly latitude: number;
    readonly longitude: number;
    readonly altitude: number | null;
    readonly accuracy: number;
    readonly altitudeAccuracy: number | null;
    readonly heading: number | null;
    readonly speed: number | null;
};

type GeolocationPosition = {
    readonly coords: GeolocationCoordinates;
    readonly timestamp: number;
};

type GeolocationPositionError = {
    readonly code: number;
    readonly message: string;
    readonly PERMISSION_DENIED: number;
    readonly POSITION_UNAVAILABLE: number;
    readonly TIMEOUT: number;
};

type PositionCallback = (position: GeolocationPosition) => void;
type PositionErrorCallback = (error: GeolocationPositionError) => void | null;

type PositionOptions = {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
};

export interface MobileFeatures {
    // Screen size
    isMobile: boolean;
    screenSize: { width: number; height: number };
    
    // Location
    currentLocation: GeolocationPosition | null;
    isLocationEnabled: boolean;
    locationError: string | null;
    
    // Network
    isOnline: boolean;
    
    // Camera
    capturePhoto: () => Promise<string | null>;
    
    // Notifications
    requestNotificationPermission: () => Promise<boolean>;
    sendNotification: (title: string, options?: NotificationOptions) => void;
    
    // Travel mode
    isTravelMode: boolean;
    setTravelMode: (enabled: boolean) => void;
    
    // Navigation
    openMapsNavigation: (destination: { lat: number; lng: number; name?: string }) => void;
}

const MOBILE_BREAKPOINT = 768;

export function useMobile(): MobileFeatures {
    // Screen size state
    const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false);
    const [screenSize, setScreenSize] = useState({ 
        width: typeof window !== 'undefined' ? window.innerWidth : 0, 
        height: typeof window !== 'undefined' ? window.innerHeight : 0 
    });

    // Location state
    const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
    const [isLocationEnabled, setIsLocationEnabled] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    
    // Network state
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    
    // Travel mode state
    const [isTravelMode, setIsTravelMode] = useState(false);
    
    const watchIdRef = useRef<number | null>(null);

    // Handle screen resize
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            setIsMobile(width < MOBILE_BREAKPOINT);
            setScreenSize({ width, height });
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call
        
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Handle online/offline status
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

    // Location tracking
    useEffect(() => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setLocationError('Geolocation is not supported by this browser');
            return;
        }

        const successCallback: PositionCallback = (pos) => {
            setCurrentLocation({
                coords: {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    altitude: pos.coords.altitude,
                    accuracy: pos.coords.accuracy,
                    altitudeAccuracy: pos.coords.altitudeAccuracy,
                    heading: pos.coords.heading,
                    speed: pos.coords.speed,
                },
                timestamp: pos.timestamp,
            });
            setIsLocationEnabled(true);
            setLocationError(null);
        };

        const errorCallback: PositionErrorCallback = (err) => {
            setLocationError(err.message);
            setIsLocationEnabled(false);
        };

        const options: PositionOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000 // Cache for 1 minute
        };

        // Get current position first
        navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);

        // Then watch position
        const watchId = navigator.geolocation.watchPosition(successCallback, errorCallback, options);
        watchIdRef.current = watchId;

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, []);

    // Camera capture
    const capturePhoto = useCallback(async (): Promise<string | null> => {
        try {
            if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
                throw new Error('Camera not available');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const video = document.createElement('video');
            video.srcObject = stream;
            await video.play();

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            stream.getTracks().forEach(track => track.stop());
            
            return canvas.toDataURL('image/jpeg');
        } catch (error) {
            console.error('Error capturing photo:', error);
            return null;
        }
    }, []);

    // Notifications
    const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
        if (typeof Notification === 'undefined') return false;
        
        try {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }, []);

    const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
        if (typeof Notification === 'undefined') return;
        
        try {
            if (Notification.permission === 'granted') {
                new Notification(title, options);
            }
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }, []);

    // Navigation
    const openMapsNavigation = useCallback((destination: { lat: number; lng: number; name?: string }) => {
        const { lat, lng, name } = destination;
        const label = encodeURIComponent(name || 'Destination');
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving&destination_place_id=${label}`;
        
        window.open(url, '_blank');
    }, []);

    return {
        // Screen
        isMobile,
        screenSize,
        
        // Location
        currentLocation,
        isLocationEnabled,
        locationError,
        
        // Network
        isOnline,
        
        // Camera
        capturePhoto,
        
        // Notifications
        requestNotificationPermission,
        sendNotification,
        
        // Travel mode
        isTravelMode,
        setTravelMode: (enabled: boolean) => setIsTravelMode(enabled),
        
        // Navigation
        openMapsNavigation
    };
}

export default useMobile;
