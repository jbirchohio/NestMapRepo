import { Building, MapPin, Star, Bed, Users, Wifi, Utensils, ParkingCircle, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Hotel {
  id: string;
  name: string;
  address: string;
  starRating: number;
  price: {
    amount: number;
    currency: string;
    per: string;
  };
  amenities: string[];
  images: string[];
  rating: {
    score: number;
    reviews: number;
  };
  cancellation: string;
}

interface HotelResultsProps {
  hotels: Hotel[];
  selectedHotel: Hotel | null;
  onSelectHotel: (hotel: Hotel) => void;
  isSearching: boolean;
  onSearch: (query: string) => void;
}

const amenityIcons: Record<string, JSX.Element> = {
  wifi: <Wifi className="h-4 w-4" />,
  restaurant: <Utensils className="h-4 w-4" />,
  parking: <ParkingCircle className="h-4 w-4" />,
  gym: <Dumbbell className="h-4 w-4" />,
  breakfast: <Utensils className="h-4 w-4" />,
};

export function HotelResults({
  hotels,
  selectedHotel,
  onSelectHotel,
  isSearching,
  onSearch,
}: HotelResultsProps) {
  if (isSearching) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium">No hotels found</h3>
        <p className="text-muted-foreground mb-4">Try adjusting your search criteria</p>
        <Button onClick={() => onSearch('')}>Reset Search</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          {hotels.length} {hotels.length === 1 ? 'Hotel' : 'Hotels'} Found
        </h3>
        <div className="text-sm text-muted-foreground">
          Sorted by: <span className="font-medium">Recommended</span>
        </div>
      </div>

      <div className="space-y-4">
        {hotels.map((hotel) => (
          <Card
            key={hotel.id}
            className={`overflow-hidden transition-all ${
              selectedHotel?.id === hotel.id
                ? 'ring-2 ring-blue-500'
                : 'hover:shadow-md'
            }`}
          >
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
                {/* Hotel Image */}
                <div className="relative h-48 md:h-full">
                  <img
                    src={hotel.images[0] || '/placeholder-hotel.jpg'}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < hotel.starRating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hotel Details */}
                <div className="p-6">
                  <div className="flex flex-col h-full">
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-semibold">{hotel.name}</h3>
                          <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <MapPin className="h-4 w-4 mr-1" />
                            {hotel.address}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            ${hotel.price.amount}
                            <span className="text-sm font-normal text-muted-foreground">
                              {' '}
                              / {hotel.price.per.toLowerCase()}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {hotel.cancellation}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center">
                        <div className="flex items-center bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded-md text-sm">
                          <span className="font-semibold">{hotel.rating.score}</span>
                          <span className="mx-1">/</span>
                          <span>10</span>
                        </div>
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({hotel.rating.reviews} reviews)
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {hotel.amenities.slice(0, 4).map((amenity) => (
                          <Badge
                            key={amenity}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {amenityIcons[amenity.toLowerCase()] || (
                              <Building className="h-3 w-3" />
                            )}
                            <span className="text-xs">{amenity}</span>
                          </Badge>
                        ))}
                        {hotel.amenities.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{hotel.amenities.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <Button
                        onClick={() => onSelectHotel(hotel)}
                        variant={selectedHotel?.id === hotel.id ? 'default' : 'outline'}
                      >
                        {selectedHotel?.id === hotel.id ? 'Selected' : 'Select Hotel'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
