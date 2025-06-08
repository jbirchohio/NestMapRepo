import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface FlightSearchFormProps {
  tripType: 'one-way' | 'round-trip';
  dateRange: { from: Date | undefined; to: Date | undefined };
  onTripTypeChange: (type: 'one-way' | 'round-trip') => void;
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSearching: boolean;
}

export function FlightSearchForm({
  tripType,
  dateRange,
  onTripTypeChange,
  onDateRangeChange,
  onSubmit,
  isSearching,
}: FlightSearchFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex space-x-2 mb-4">
        <button
          type="button"
          className={`px-4 py-2 rounded-md ${
            tripType === 'round-trip' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
          onClick={() => onTripTypeChange('round-trip')}
        >
          Round Trip
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-md ${
            tripType === 'one-way' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
          onClick={() => onTripTypeChange('one-way')}
        >
          One Way
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="origin">From</Label>
          <Input
            id="origin"
            name="origin"
            placeholder="City or airport"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="destination">To</Label>
          <Input
            id="destination"
            name="destination"
            placeholder="City or airport"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Departure Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  format(dateRange.from, 'PPP')
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateRange?.from}
                onSelect={(date) => onDateRangeChange({ ...dateRange, from: date || undefined })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {tripType === 'round-trip' && (
          <div className="space-y-2">
            <Label>Return Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  disabled={!dateRange.from}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.to ? (
                    format(dateRange.to, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateRange?.to}
                  onSelect={(date) => onDateRangeChange({ ...dateRange, to: date || undefined })}
                  initialFocus
                  disabled={(date) =>
                    date < (dateRange?.from || new Date()) || date < new Date()
                  }
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="passengers">Passengers</Label>
          <Input
            id="passengers"
            name="passengers"
            type="number"
            min="1"
            max="10"
            defaultValue={1}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cabin">Cabin Class</Label>
          <select
            id="cabin"
            name="cabin"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            defaultValue="economy"
          >
            <option value="economy">Economy</option>
            <option value="premium">Premium Economy</option>
            <option value="business">Business</option>
            <option value="first">First Class</option>
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          id="directFlights"
          name="directFlights"
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <Label htmlFor="directFlights">Direct flights only</Label>
      </div>

      <Button type="submit" className="w-full" disabled={isSearching}>
        {isSearching ? 'Searching...' : 'Search Flights'}
      </Button>
    </form>
  );
}
