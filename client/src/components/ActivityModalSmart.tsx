import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Coffee, Utensils, ShoppingBag, Camera, Loader2, MapPin, Star, ShoppingCart, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import useTrip from "@/hooks/useTrip";
import BookableActivity from "@/components/BookableActivity";
// Removed InAppBooking import

interface QuickOption {
  emoji: string;
  text: string;
  search: string;
  time: string;
}

interface SuggestedPlace {
  name: string;
  address: string;
  rating?: number;
  priceLevel?: string;
  distance?: string;
  latitude: number;
  longitude: number;
}

const quickOptions: QuickOption[] = [
  { emoji: "☕", text: "Coffee", search: "coffee shop cafe", time: "9:00 AM" },
  { emoji: "🥐", text: "Breakfast", search: "breakfast brunch", time: "8:00 AM" },
  { emoji: "🍕", text: "Lunch", search: "lunch restaurant", time: "12:00 PM" },
  { emoji: "🍽️", text: "Dinner", search: "dinner restaurant", time: "7:00 PM" },
  { emoji: "🍹", text: "Drinks", search: "bar cocktails", time: "8:00 PM" },
  { emoji: "🏛️", text: "Culture", search: "museum gallery", time: "2:00 PM" },
  { emoji: "🛍️", text: "Shopping", search: "shopping mall stores", time: "3:00 PM" },
  { emoji: "🎭", text: "Fun", search: "entertainment activities", time: "7:30 PM" },
];

export default function ActivityModalSmart({ onClose, onSave, date, tripId, activity }: any) {
  const [selectedCategory, setSelectedCategory] = useState<QuickOption | null>(null);
  const [suggestedPlaces, setSuggestedPlaces] = useState<SuggestedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [customSearch, setCustomSearch] = useState("");
  const { trip } = useTrip(tripId);
  const [selectedPlace, setSelectedPlace] = useState<SuggestedPlace | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookableItems, setBookableItems] = useState<any[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  
  // Edit mode state
  const isEditMode = !!activity;
  const [editFormData, setEditFormData] = useState(() => ({
    title: activity?.title || '',
    time: activity?.time || '',
    locationName: activity?.locationName || '',
    notes: activity?.notes || ''
  }));
  
  // Update form data when activity changes
  useEffect(() => {
    if (activity) {
      setEditFormData({
        title: activity.title || '',
        time: activity.time || '',
        locationName: activity.locationName || '',
        notes: activity.notes || ''
      });
    }
  }, [activity]);

  // Search for places when category is selected
  useEffect(() => {
    if (selectedCategory || customSearch) {
      searchNearbyPlaces();
    }
  }, [selectedCategory]);

  const searchNearbyPlaces = async () => {
    setLoading(true);
    try {
      const searchQuery = customSearch || selectedCategory?.search || "";
      const cityContext = trip?.city || "current location";
      
      // Call AI to find places
      const response = await fetch("/api/ai/find-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          searchQuery: searchQuery,
          cityContext: cityContext,
          limit: 6
        })
      });
      
      if (!response.ok) throw new Error("Search failed");
      
      const data = await response.json();
      
      if (data.locations && Array.isArray(data.locations)) {
        // Enrich with coordinates using Mapbox
        const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
        
        const enrichedPlaces = await Promise.all(
          data.locations.map(async (loc: any) => {
            try {
              const fullAddress = `${loc.address || loc.name}, ${loc.city || cityContext}`;
              const mapboxResponse = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${mapboxToken}&limit=1`
              );
              
              if (mapboxResponse.ok) {
                const mapboxData = await mapboxResponse.json();
                if (mapboxData.features?.[0]?.center) {
                  return {
                    ...loc,
                    latitude: mapboxData.features[0].center[1],
                    longitude: mapboxData.features[0].center[0]
                  };
                }
              }
              return loc;
            } catch {
              return loc;
            }
          })
        );
        
        setSuggestedPlaces(enrichedPlaces);
      }
    } catch (error) {
      console.error("Error searching places:", error);
      // Fallback suggestions
      setSuggestedPlaces([
        { name: "Find on map", address: "Search nearby", latitude: 0, longitude: 0 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceSelect = (place: SuggestedPlace) => {
    setSelectedPlace(place);
  };

  const handleSave = () => {
    if (!selectedPlace) return;
    
    const activityTime = customSearch ? "12:00" : 
      convertTo24Hour(selectedCategory?.time || "12:00 PM");
    
    onSave({
      title: customSearch || selectedCategory?.text || "Activity",
      locationName: selectedPlace.name,
      latitude: selectedPlace.latitude.toString(),
      longitude: selectedPlace.longitude.toString(),
      time: activityTime,
      date: date || new Date(),
      notes: selectedPlace.address || ""
    });
  };

  const convertTo24Hour = (time12: string): string => {
    const [time, period] = time12.split(' ');
    let [hours, minutes] = time.split(':');
    let hour = parseInt(hours);
    
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    
    return `${hour.toString().padStart(2, '0')}:${minutes || '00'}`;
  };

  const handleCustomSearch = () => {
    if (customSearch.trim()) {
      searchNearbyPlaces();
    }
  };

  const getAiSuggestions = async () => {
    setShowAiSuggestions(true);
    setLoading(true);
    try {
      const response = await fetch("/api/ai/suggest-activities", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ 
          city: trip?.city || "current location",
          interests: ["popular attractions", "local favorites"],
          duration: 1
        })
      });
      
      if (!response.ok) throw new Error("Failed to get suggestions");
      
      const data = await response.json();
      
      if (data.activities && Array.isArray(data.activities)) {
        // Convert AI suggestions to quick options format
        const aiOptions = data.activities.slice(0, 8).map((activity: any, idx: number) => ({
          emoji: ["🏛️", "🎨", "🌳", "🎭", "🏰", "🎡", "🌊", "🏔️"][idx] || "📍",
          text: activity.title,
          search: activity.title,
          time: activity.best_time || "10:00 AM"
        }));
        
        // Replace quick options temporarily
        quickOptions.splice(0, quickOptions.length, ...aiOptions);
        setShowAiSuggestions(false);
      }
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
    } finally {
      setLoading(false);
      setShowAiSuggestions(false);
    }
  };

  // Handle edit form submission
  const handleEditSubmit = () => {
    // Validate required fields
    if (!editFormData.title.trim()) {
      alert('Please enter an activity title');
      return;
    }
    if (!editFormData.time) {
      alert('Please enter a time');
      return;
    }
    if (!editFormData.locationName.trim()) {
      alert('Please enter a location');
      return;
    }
    
    const updatedActivity = {
      ...editFormData,
      date: date || new Date(activity.date),
      tripId
    };
    onSave(updatedActivity);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg animate-slide-up max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold">{isEditMode ? 'Edit Activity' : 'What\'s next?'}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Edit Mode Form */}
          {isEditMode ? (
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Activity name"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Time</label>
                <input
                  type="time"
                  value={editFormData.time}
                  onChange={(e) => setEditFormData({...editFormData, time: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Location</label>
                <input
                  type="text"
                  value={editFormData.locationName}
                  onChange={(e) => setEditFormData({...editFormData, locationName: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Where is this activity?"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Notes (optional)</label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Any additional details..."
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleEditSubmit}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                >
                  Save Changes
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Choose activity type */}
              {!selectedCategory && !customSearch && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Pick something to do
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={getAiSuggestions}
                  disabled={loading}
                  className="text-xs"
                >
                  {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="w-3 h-3 mr-1" />
                  )}
                  AI Suggestions
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                {quickOptions.map((option) => (
                  <button
                    key={option.text}
                    onClick={() => setSelectedCategory(option)}
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors"
                  >
                    <div className="text-2xl mb-1">{option.emoji}</div>
                    <div className="font-medium text-sm">{option.text}</div>
                    <div className="text-xs text-gray-500">{option.time}</div>
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={customSearch}
                  onChange={(e) => setCustomSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCustomSearch()}
                  placeholder="Or search for anything..."
                  className="w-full p-4 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleCustomSearch}
                  disabled={!customSearch.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                >
                  →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Choose place */}
          {(selectedCategory || customSearch) && (
            <div className="p-4">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setCustomSearch("");
                  setSuggestedPlaces([]);
                  setSelectedPlace(null);
                }}
                className="text-sm text-blue-600 mb-4"
              >
                ← Change activity
              </button>

              <p className="text-sm text-gray-600 mb-4">
                {customSearch ? `Places for "${customSearch}"` : `Best ${selectedCategory?.text.toLowerCase()} spots near you`}
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestedPlaces.map((place, index) => (
                    <button
                      key={index}
                      onClick={() => handlePlaceSelect(place)}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        selectedPlace?.name === place.name 
                          ? 'bg-blue-50 border-2 border-blue-500' 
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{place.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {place.address}
                          </div>
                          {place.rating && (
                            <div className="flex items-center gap-2 mt-1 text-sm">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span>{place.rating}</span>
                              {place.priceLevel && <span className="text-gray-400">• {place.priceLevel}</span>}
                              {place.distance && <span className="text-gray-400">• {place.distance}</span>}
                            </div>
                          )}
                        </div>
                        {selectedPlace?.name === place.name && (
                          <div className="text-blue-500 text-xl">✓</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Show Viator activities if place is selected */}
              {selectedPlace && selectedPlace.latitude && selectedPlace.longitude && (
                <BookableActivity
                  activityTitle={customSearch || selectedCategory?.text || ""}
                  latitude={selectedPlace.latitude.toString()}
                  longitude={selectedPlace.longitude.toString()}
                />
              )}
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer - only show for new activities */}
        {!isEditMode && selectedPlace && (
          <div className="p-4 border-t bg-gray-50 flex-shrink-0">
            <Button
              onClick={handleSave}
              className="w-full"
              size="lg"
            >
              Add to trip
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}