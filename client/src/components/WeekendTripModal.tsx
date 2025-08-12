import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/JWTAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import useMapbox from "@/hooks/useMapbox";
import { Calendar, MapPin, Sunset, X, ChevronRight, Sparkles } from "lucide-react";
import { format, addDays, differenceInDays, nextFriday, nextSaturday, nextSunday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { analytics } from '@/lib/analytics';

interface WeekendTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (trip: any) => void;
}

const tripSchema = z.object({
  title: z.string().min(1, "Give your weekend a name!"),
  city: z.string().min(1, "Where are you escaping to?"),
  startDate: z.date(),
  endDate: z.date(),
  cityLatitude: z.string().optional(),
  cityLongitude: z.string().optional(),
});

type TripFormValues = z.infer<typeof tripSchema>;

// Weekend-specific examples
const weekendExamples = [
  { emoji: "🍷", text: "Napa wine tasting" },
  { emoji: "🎰", text: "Vegas weekend" },
  { emoji: "🏖️", text: "Miami beach break" },
  { emoji: "⛷️", text: "Ski weekend in Aspen" },
  { emoji: "🎵", text: "Nashville music tour" },
  { emoji: "🌃", text: "NYC quick escape" },
  { emoji: "🎨", text: "Austin art scene" },
  { emoji: "☕", text: "Portland coffee crawl" },
];

// Popular weekend destinations
const popularWeekendSpots = [
  { name: "Las Vegas", emoji: "🎰" },
  { name: "Miami", emoji: "🏖️" },
  { name: "Nashville", emoji: "🎵" },
  { name: "Austin", emoji: "🌮" },
  { name: "New York", emoji: "🗽" },
  { name: "Chicago", emoji: "🏙️" },
];

export default function WeekendTripModal({
  isOpen,
  onClose,
  onTripCreated,
}: WeekendTripModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { geocodeLocation } = useMapbox();

  const [isLoading, setIsLoading] = useState(false);
  const [currentExample, setCurrentExample] = useState(0);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWeekend, setSelectedWeekend] = useState<'this' | 'next'>('next');
  const [useAI, setUseAI] = useState(false);

  // Rotate examples
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentExample((prev) => (prev + 1) % weekendExamples.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Calculate default weekend dates
  const getWeekendDates = (which: 'this' | 'next') => {
    const today = new Date();
    let friday: Date;
    let sunday: Date;

    if (which === 'this') {
      // This weekend (upcoming Friday-Sunday)
      friday = nextFriday(today);
      sunday = nextSunday(today);
    } else {
      // Next weekend
      const nextWeek = addDays(today, 7);
      friday = nextFriday(nextWeek);
      sunday = nextSunday(nextWeek);
    }

    return { startDate: friday, endDate: sunday };
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      title: "",
      city: "",
      ...getWeekendDates('next'),
    },
  });

  const watchedCity = watch("city");
  const watchedStartDate = watch("startDate");
  const watchedEndDate = watch("endDate");

  // Search for locations as user types
  useEffect(() => {
    if (searchQuery.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    const searchLocations = async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&limit=5`
        );
        const data = await response.json();
        setLocationSuggestions(data.features || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Error searching locations:", error);
      }
    };

    const debounce = setTimeout(searchLocations, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleLocationSelect = (location: any) => {
    setValue("city", location.place_name);
    setValue("cityLatitude", location.center[1].toString());
    setValue("cityLongitude", location.center[0].toString());
    setSearchQuery(location.place_name);
    setShowSuggestions(false);
  };

  const handleWeekendChange = (which: 'this' | 'next') => {
    setSelectedWeekend(which);
    const dates = getWeekendDates(which);
    setValue("startDate", dates.startDate);
    setValue("endDate", dates.endDate);
  };

  const onSubmit = async (data: TripFormValues) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to create a trip",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Track trip creation
      if (analytics) {
        analytics.trackTripCreated(3, data.city);
      }

      // If no coordinates, try to get them
      let latitude = data.cityLatitude;
      let longitude = data.cityLongitude;

      if (!latitude || !longitude) {
        const coords = await geocodeLocation(data.city);
        if (coords) {
          latitude = coords.latitude.toString();
          longitude = coords.longitude.toString();
        }
      }

      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          title: data.title || `Weekend in ${data.city}`,
          destination: data.city,
          start_date: format(data.startDate, "yyyy-MM-dd"),
          end_date: format(data.endDate, "yyyy-MM-dd"),
          city_latitude: latitude,
          city_longitude: longitude,
          trip_type: 'weekend',
          use_ai_generation: useAI,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create trip");
      }

      const trip = await response.json();

      // If AI generation requested, generate activities
      if (useAI) {
        try {
          const aiResponse = await fetch("/api/ai/generate-weekend", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              trip_id: trip.id,
              destination: data.city,
              duration: 3,
            }),
          });

          if (aiResponse.ok) {
            toast({
              title: "✨ AI is planning your weekend!",
              description: "Activities are being generated...",
            });
          }
        } catch (error) {
          console.error("AI generation failed:", error);
        }
      }

      toast({
        title: "Weekend escape created! 🌅",
        description: `Your ${data.city} weekend is ready to plan`,
      });

      onTripCreated(trip);
      reset();
      onClose();
    } catch (error) {
      console.error("Error creating trip:", error);
      toast({
        title: "Error",
        description: "Failed to create trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              <Sunset className="h-8 w-8" />
              <h2 className="text-2xl font-bold">Weekend Escape</h2>
            </div>
            
            <p className="text-amber-50">
              Perfect 2-3 day getaway • No PTO needed
            </p>

            {/* Rotating examples */}
            <motion.div
              key={currentExample}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-3 text-sm text-amber-100"
            >
              <span className="mr-2">{weekendExamples[currentExample].emoji}</span>
              <span className="italic">e.g., {weekendExamples[currentExample].text}</span>
            </motion.div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {/* Weekend Selection */}
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={selectedWeekend === 'this' ? 'default' : 'outline'}
                onClick={() => handleWeekendChange('this')}
                className="flex-1"
              >
                This Weekend
                <span className="ml-2 text-xs opacity-75">
                  {format(getWeekendDates('this').startDate, 'MMM d')}
                </span>
              </Button>
              <Button
                type="button"
                variant={selectedWeekend === 'next' ? 'default' : 'outline'}
                onClick={() => handleWeekendChange('next')}
                className="flex-1"
              >
                Next Weekend
                <span className="ml-2 text-xs opacity-75">
                  {format(getWeekendDates('next').startDate, 'MMM d')}
                </span>
              </Button>
            </div>

            {/* Popular Destinations */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Popular weekend spots
              </label>
              <div className="grid grid-cols-3 gap-2">
                {popularWeekendSpots.map((spot) => (
                  <Button
                    key={spot.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setValue("city", spot.name);
                      setSearchQuery(spot.name);
                    }}
                    className="text-xs"
                  >
                    <span className="mr-1">{spot.emoji}</span>
                    {spot.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Destination Input */}
            <div className="relative">
              <label className="text-sm font-medium text-gray-700">
                <MapPin className="inline h-4 w-4 mr-1" />
                Where to?
              </label>
              <Input
                {...register("city")}
                placeholder="Enter destination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1"
              />
              {errors.city && (
                <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>
              )}

              {/* Location suggestions */}
              {showSuggestions && locationSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {locationSuggestions.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => handleLocationSelect(location)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm"
                    >
                      {location.place_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Trip Name */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Trip name (optional)
              </label>
              <Input
                {...register("title")}
                placeholder={`Weekend in ${watchedCity || '...'}`}
                className="mt-1"
              />
            </div>

            {/* AI Generation Option */}
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <input
                type="checkbox"
                id="useAI"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="rounded text-purple-600"
              />
              <label htmlFor="useAI" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-sm">AI-generate activities</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Let AI plan the perfect weekend itinerary
                </p>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isLoading ? (
                  "Creating..."
                ) : (
                  <>
                    Create Weekend
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}