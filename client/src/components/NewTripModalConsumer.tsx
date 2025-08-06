import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/JWTAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import useMapbox from "@/hooks/useMapbox";
import { Calendar, MapPin, Sparkles, X, ChevronRight } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import PremiumUpgrade from "./PremiumUpgrade";

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (trip: any) => void;
}

const tripSchema = z.object({
  title: z.string().min(1, "Give your trip a name!"),
  city: z.string().min(1, "Where are you going?"),
  startDate: z.date(),
  endDate: z.date(),
  cityLatitude: z.string().optional(),
  cityLongitude: z.string().optional(),
});

type TripFormValues = z.infer<typeof tripSchema>;

// Inspiring examples that rotate
const inspiringExamples = [
  { emoji: "🏝️", text: "Bali surf trip" },
  { emoji: "🗼", text: "Paris weekend" },
  { emoji: "🏔️", text: "Swiss Alps adventure" },
  { emoji: "🌊", text: "Greek island hopping" },
  { emoji: "🏛️", text: "Rome city break" },
  { emoji: "🌺", text: "Hawaii honeymoon" },
  { emoji: "🎿", text: "Colorado ski trip" },
  { emoji: "🏖️", text: "Mexico beach escape" },
];

export default function NewTripModalConsumer({
  isOpen,
  onClose,
  onTripCreated,
}: NewTripModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { geocodeLocation } = useMapbox();
  
  const [isLoading, setIsLoading] = useState(false);
  const [currentExample, setCurrentExample] = useState(0);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  
  // Rotate examples
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentExample((prev) => (prev + 1) % inspiringExamples.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Check if user can create trip when modal opens
  useEffect(() => {
    const checkTripLimit = async () => {
      if (isOpen && user) {
        try {
          const response = await fetch('/api/subscription/can-use/create_trip', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          const data = await response.json();
          if (!data.canUse) {
            setShowUpgrade(true);
          }
        } catch (error) {
          console.error('Failed to check trip limit:', error);
        }
      }
    };
    checkTripLimit();
  }, [isOpen, user]);

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
      startDate: addDays(new Date(), 7),
      endDate: addDays(new Date(), 10),
    },
  });

  const watchedCity = watch("city");
  const watchedStartDate = watch("startDate");
  const watchedEndDate = watch("endDate");

  // Calculate trip duration
  const tripDuration = differenceInDays(watchedEndDate, watchedStartDate) + 1;

  // Search for locations as user types
  useEffect(() => {
    if (searchQuery.length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      try {
        // Fetch suggestions directly from Mapbox API
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&limit=5`
        );
        
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          setLocationSuggestions(data.features);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error("Geocoding error:", error);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  // Handle location selection
  const selectLocation = async (suggestion: any) => {
    setValue("city", suggestion.place_name);
    if (suggestion.center) {
      setValue("cityLongitude", suggestion.center[0].toString());
      setValue("cityLatitude", suggestion.center[1].toString());
    }
    
    // Generate a simple trip title
    const locationName = suggestion.text || suggestion.place_name.split(",")[0];
    setValue("title", `${locationName} Trip`);
    
    setShowSuggestions(false);
    setSearchQuery("");
  };

  const onSubmit = async (data: TripFormValues) => {
    setIsLoading(true);
    
    try {
      // Check trip limit before submission
      const checkResponse = await fetch('/api/subscription/can-use/create_trip', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const canCreate = await checkResponse.json();
      if (!canCreate.canUse) {
        setShowUpgrade(true);
        setIsLoading(false);
        return;
      }

      // Track trip creation for usage limits
      await fetch('/api/subscription/track-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          feature: 'trip_created',
          count: 1
        })
      });
      // If no coordinates yet, try to geocode the city
      if (!data.cityLatitude || !data.cityLongitude) {
        try {
          const result = await geocodeLocation(data.city, true);
          if (result) {
            data.cityLatitude = result.latitude.toString();
            data.cityLongitude = result.longitude.toString();
          }
        } catch (error) {
          console.error("Geocoding error:", error);
        }
      }

      const tripData = {
        ...data,
        userId: user?.id,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
      };

      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(tripData),
      });

      if (!response.ok) {
        throw new Error("Failed to create trip");
      }

      const newTrip = await response.json();
      
      toast({
        title: "Trip created! ✈️",
        description: "Let's start planning your adventure!",
      });

      onTripCreated(newTrip);
      reset();
      onClose();
    } catch (error) {
      console.error("Error creating trip:", error);
      toast({
        title: "Error",
        description: "Could not create trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Show upgrade modal if limit reached
  if (showUpgrade) {
    return (
      <PremiumUpgrade 
        feature="create_trip" 
        onClose={() => {
          setShowUpgrade(false);
          onClose();
        }}
      />
    );
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        >
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-6 pb-8">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-3xl font-bold text-white mb-2">
                Where to next?
              </h2>
              <p className="text-white/90 text-lg">
                Start planning your perfect trip
              </p>
            </motion.div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 -mt-4 space-y-5">
            {/* Destination Input */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className={`relative bg-slate-50 dark:bg-slate-800 rounded-xl transition-all duration-200 ${
                focusedField === 'city' ? 'ring-2 ring-purple-500 ring-offset-2' : ''
              }`}>
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  {...register("city")}
                  placeholder="Search any destination..."
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setValue("city", e.target.value);
                  }}
                  onFocus={() => setFocusedField('city')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full bg-transparent pl-12 pr-4 py-4 text-lg outline-none placeholder:text-slate-400"
                  autoFocus
                />
                
                {/* Animated example */}
                {!watchedCity && (
                  <motion.div
                    key={currentExample}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none"
                  >
                    <span className="mr-2">{inspiringExamples[currentExample].emoji}</span>
                    {inspiringExamples[currentExample].text}
                  </motion.div>
                )}
              </div>
              
              {/* Location suggestions */}
              <AnimatePresence>
                {showSuggestions && locationSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden"
                  >
                    {locationSuggestions.map((suggestion, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
                        onClick={() => selectLocation(suggestion)}
                      >
                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {suggestion.text}
                          </div>
                          <div className="text-sm text-slate-500">
                            {suggestion.place_name}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {errors.city && (
                <p className="text-sm text-red-500 mt-2">{errors.city.message}</p>
              )}
            </motion.div>

            {/* Date Selection */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className={`bg-slate-50 dark:bg-slate-800 rounded-xl p-4 transition-all duration-200 ${
                focusedField === 'startDate' ? 'ring-2 ring-purple-500 ring-offset-2' : ''
              }`}>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">
                  Start date
                </label>
                <input
                  type="date"
                  {...register("startDate", { valueAsDate: true })}
                  onFocus={() => setFocusedField('startDate')}
                  onBlur={() => setFocusedField(null)}
                  min={format(new Date(), "yyyy-MM-dd")}
                  defaultValue={format(addDays(new Date(), 7), "yyyy-MM-dd")}
                  className="w-full bg-transparent outline-none text-slate-900 dark:text-white"
                />
              </div>
              
              <div className={`bg-slate-50 dark:bg-slate-800 rounded-xl p-4 transition-all duration-200 ${
                focusedField === 'endDate' ? 'ring-2 ring-purple-500 ring-offset-2' : ''
              }`}>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">
                  End date
                </label>
                <input
                  type="date"
                  {...register("endDate", { valueAsDate: true })}
                  onFocus={() => setFocusedField('endDate')}
                  onBlur={() => setFocusedField(null)}
                  min={format(watchedStartDate || new Date(), "yyyy-MM-dd")}
                  defaultValue={format(addDays(new Date(), 10), "yyyy-MM-dd")}
                  className="w-full bg-transparent outline-none text-slate-900 dark:text-white"
                />
              </div>
            </motion.div>

            {/* Trip duration badge */}
            <AnimatePresence>
              {watchedCity && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center justify-center"
                >
                  <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-full text-sm font-medium">
                    <Calendar className="w-4 h-4" />
                    {tripDuration} {tripDuration === 1 ? 'day' : 'days'} in {watchedCity.split(',')[0]}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Trip Name (optional) */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className={`bg-slate-50 dark:bg-slate-800 rounded-xl p-4 transition-all duration-200 ${
                focusedField === 'title' ? 'ring-2 ring-purple-500 ring-offset-2' : ''
              }`}>
                <input
                  {...register("title")}
                  placeholder="Trip name (optional)"
                  onFocus={() => setFocusedField('title')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full bg-transparent outline-none placeholder:text-slate-400"
                />
              </div>
            </motion.div>

            {/* Hidden fields */}
            <input type="hidden" {...register("cityLatitude")} />
            <input type="hidden" {...register("cityLongitude")} />

            {/* Action buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-3 pt-2"
            >
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !watchedCity}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                    Creating...
                  </span>
                ) : (
                  <>
                    Create Trip
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}