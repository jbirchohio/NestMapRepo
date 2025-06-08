import { Calendar as CalendarIcon, MapPin, Users, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface HotelSearchFormProps {
  dateRange: { from: Date | undefined; to: Date | undefined };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  onSearch: (data: { destination: string; guests: number; rooms: number }) => void;
  isSearching: boolean;
}

export function HotelSearchForm({
  dateRange,
  onDateRangeChange,
  onSearch,
  isSearching,
}: HotelSearchFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchData = {
      destination: formData.get('destination') as string,
      guests: parseInt(formData.get('guests') as string) || 2,
      rooms: parseInt(formData.get('rooms') as string) || 1,
    };
    onSearch(searchData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="destination" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Destination
        </Label>
        <div className="relative">
          <Input
            id="destination"
            name="destination"
            placeholder="City, hotel, or landmark"
            required
            className="pl-10"
          />
          <Home className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Check-in / Check-out
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                    </>
                  ) : (
                    format(dateRange.from, 'MMM d, yyyy')
                  )
                ) : (
                  <span>Select dates</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => onDateRangeChange(range || { from: undefined, to: undefined })}
                numberOfMonths={2}
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="guests" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Guests
            </Label>
            <select
              id="guests"
              name="guests"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              defaultValue="2"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'guest' : 'guests'}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rooms">Rooms</Label>
            <select
              id="rooms"
              name="rooms"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              defaultValue="1"
            >
              {[1, 2, 3, 4, 5].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'room' : 'rooms'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" className="w-full" disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search Hotels'}
        </Button>
      </div>
    </form>
  );
}
