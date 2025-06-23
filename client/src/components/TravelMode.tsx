import { useState, useEffect } from 'react';
import { useMobileFeatures } from '@/hooks/useMobileFeatures';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { MapPin, Navigation, Camera, Bell, Wifi, WifiOff, CheckCircle, Clock, Route, Star, Upload, Phone } from 'lucide-react';
interface TravelActivity {
    id: number;
    title: string;
    description: string;
    locationName: string;
    address?: string;
    latitude: string;
    longitude: string;
    category: string;
    duration: number;
    startTime?: string;
    endTime?: string;
    day?: number;
    price?: number;
    rating?: number;
    imageUrl?: string;
    tags?: string[];
    status?: 'planned' | 'in-progress' | 'completed' | 'cancelled';
    notes?: string;
}
interface TravelModeProps {
    tripId: number;
    activities: TravelActivity[];
    currentActivity?: TravelActivity;
}
export default function TravelMode({ tripId, activities, currentActivity }: TravelModeProps) {
    const { currentLocation, isLocationEnabled, locationError, isOnline, capturePhoto, sendNotification, isTravelMode, setTravelMode, openMapsNavigation } = useMobileFeatures();
    const [checkedInActivities, setCheckedInActivities] = useState<Set<number>>(new Set());
    const [tripPhotos, setTripPhotos] = useState<string[]>([]);
    const [nearbyActivities, setNearbyActivities] = useState<any[]>([]);
    // Calculate travel progress
    const totalActivities = activities.length;
    const completedActivities = checkedInActivities.size;
    const progressPercentage = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;
    // Find nearby activities when location changes
    useEffect(() => {
        if (currentLocation && activities.length > 0) {
            const nearby = activities.filter(activity => {
                if (!activity.latitude || !activity.longitude)
                    return false;
                const distance = calculateDistance(
                    currentLocation?.latitude || 0, 
                    currentLocation?.longitude || 0, 
                    parseFloat(activity.latitude), 
                    parseFloat(activity.longitude)
                );
                return distance <= 0.5; // Within 500 meters
            }).sort((a, b) => {
                const distanceA = calculateDistance(
                    currentLocation?.latitude || 0, 
                    currentLocation?.longitude || 0, 
                    parseFloat(a.latitude), 
                    parseFloat(a.longitude)
                );
                const distanceB = calculateDistance(
                    currentLocation?.latitude || 0, 
                    currentLocation?.longitude || 0, 
                    parseFloat(b.latitude), 
                    parseFloat(b.longitude)
                );
                return distanceA - distanceB;
            });
            setNearbyActivities(nearby);
            // Send notification for nearby activities
            if (nearby.length > 0 && isTravelMode && currentLocation) {
                const closestActivity = nearby[0];
                if (closestActivity && !checkedInActivities.has(closestActivity.id)) {
                    const distance = calculateDistance(
                        currentLocation.latitude, 
                        currentLocation.longitude, 
                        parseFloat(closestActivity.latitude), 
                        parseFloat(closestActivity.longitude)
                    );
                    sendNotification(
                        'You\'re near an activity!', 
                        `${closestActivity.title} is just ${Math.round(distance * 1000)}m away`
                    );
                }
            }
        }
    }, [currentLocation, activities, checkedInActivities, isTravelMode, sendNotification]);
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };
    const handleCheckIn = (activityId: number) => {
        setCheckedInActivities(prev => new Set([...prev, activityId]));
        const activity = activities.find(a => a.id === activityId);
        if (activity) {
            sendNotification('Activity Checked In!', `You've checked in to ${activity.title}. Enjoy your visit!`);
        }
    };
    const handlePhotoCapture = async () => {
        try {
            const photoData = await capturePhoto();
            if (photoData) {
                setTripPhotos(prev => [...prev, photoData]);
                // Store photo with current location if available
                if (currentLocation) {
                    const photoWithLocation = {
                        data: photoData,
                        location: currentLocation,
                        timestamp: Date.now(),
                        activityId: currentActivity?.id
                    };
                    // Save to localStorage for offline mode
                    const savedPhotos = JSON.parse(localStorage.getItem('trip_photos') || '[]');
                    savedPhotos.push(photoWithLocation);
                    localStorage.setItem('trip_photos', JSON.stringify(savedPhotos));
                }
                sendNotification('Photo Captured!', 'Your travel photo has been saved to this trip');
            }
        }
        catch (error) {
            console.error('Error capturing photo:', error);
        }
    };
    const getNextActivity = () => {
        return activities.find(activity => !checkedInActivities.has(activity.id));
    };
    const nextActivity = getNextActivity();
    if (!isTravelMode) {
        return (<Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="w-5 h-5"/>
            Travel Mode
          </CardTitle>
          <CardDescription>
            Activate travel mode for GPS tracking, notifications, and real-time assistance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">Ready to travel?</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Get location-aware features and travel assistance
              </div>
            </div>
            <Switch checked={isTravelMode} onCheckedChange={setTravelMode}/>
          </div>
        </CardContent>
      </Card>);
    }
    return (<div className="space-y-4">
      {/* Status Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Route className="w-5 h-5 text-blue-600"/>
              <span className="font-medium">Travel Mode Active</span>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (<Wifi className="w-4 h-4 text-green-600"/>) : (<WifiOff className="w-4 h-4 text-red-600"/>)}
              <span className="text-sm text-gray-600">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Trip Progress</span>
              <span className="text-sm font-medium">
                {completedActivities}/{totalActivities} activities
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2"/>
          </div>
        </CardContent>
      </Card>

      {/* Location Status */}
      {locationError && (<Alert className="border-yellow-200 bg-yellow-50">
          <MapPin className="w-4 h-4"/>
          <AlertDescription>
            {locationError}. Some features may be limited.
          </AlertDescription>
        </Alert>)}

      {/* Current Location */}
      {currentLocation && (<Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600"/>
              Your Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Lat: {currentLocation.latitude.toFixed(6)}, 
              Lng: {currentLocation.longitude.toFixed(6)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Accuracy: ±{Math.round(currentLocation.accuracy)}m
            </div>
          </CardContent>
        </Card>)}

      {/* Next Activity */}
      {nextActivity && (<Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600"/>
              Next Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="font-medium">{nextActivity.title}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {nextActivity.time} • {nextActivity.locationName}
                </div>
              </div>
              
              <div className="flex gap-2">
                {nextActivity.latitude && nextActivity.longitude && (<Button variant="outline" size="sm" onClick={() => openMapsNavigation({
                    lat: parseFloat(nextActivity.latitude),
                    lng: parseFloat(nextActivity.longitude),
                    name: nextActivity.locationName
                })} className="flex items-center gap-2">
                    <Navigation className="w-4 h-4"/>
                    Navigate
                  </Button>)}
                
                <Button size="sm" onClick={() => handleCheckIn(nextActivity.id)} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4"/>
                  Check In
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>)}

      {/* Nearby Activities */}
      {nearbyActivities.length > 0 && (<Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-electric-600"/>
              Nearby Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nearbyActivities.slice(0, 3).map((activity, index) => {
                const distance = currentLocation ? calculateDistance(currentLocation.latitude, currentLocation.longitude, parseFloat(activity.latitude), parseFloat(activity.longitude)) : 0;
                const isCheckedIn = checkedInActivities.has(activity.id);
                return (<div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{activity.title}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {Math.round(distance * 1000)}m away
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCheckedIn ? (<Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1"/>
                          Visited
                        </Badge>) : (<Button size="sm" variant="outline" onClick={() => handleCheckIn(activity.id)}>
                          Check In
                        </Button>)}
                    </div>
                  </div>);
            })}
            </div>
          </CardContent>
        </Card>)}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={handlePhotoCapture} className="flex items-center gap-2 h-16">
              <Camera className="w-5 h-5"/>
              <div>
                <div className="font-medium">Take Photo</div>
                <div className="text-xs text-gray-500">Save to trip</div>
              </div>
            </Button>
            
            <Button variant="outline" onClick={() => {
            const phone = '911'; // This would be dynamic based on location
            window.open(`tel:${phone}`);
        }} className="flex items-center gap-2 h-16">
              <Phone className="w-5 h-5"/>
              <div>
                <div className="font-medium">Emergency</div>
                <div className="text-xs text-gray-500">Local contacts</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trip Photos */}
      {tripPhotos.length > 0 && (<Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5"/>
              Trip Photos ({tripPhotos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {tripPhotos.slice(-6).map((photo, index) => (<div key={index} className="aspect-square rounded-lg overflow-hidden">
                  <img src={photo} alt={`Trip photo ${index + 1}`} className="w-full h-full object-cover"/>
                </div>))}
            </div>
            {!isOnline && (<div className="mt-3 text-sm text-yellow-600 flex items-center gap-1">
                <Upload className="w-4 h-4"/>
                Photos will sync when you're back online
              </div>)}
          </CardContent>
        </Card>)}

      {/* Travel Mode Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Travel Mode</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                GPS tracking and notifications active
              </div>
            </div>
            <Switch checked={isTravelMode} onCheckedChange={setTravelMode}/>
          </div>
        </CardContent>
      </Card>
    </div>);
}
