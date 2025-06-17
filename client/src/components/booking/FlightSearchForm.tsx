import React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface FlightSearchData {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  tripType: 'one-way' | 'round-trip';
  passengers: number;
  cabin: 'economy' | 'premium-economy' | 'business' | 'first';
}

interface FlightSearchFormProps {
  formData: FlightSearchData;
  setFormData: React.Dispatch<React.SetStateAction<FlightSearchData>>;
  onSubmit: (e: React.FormEvent) => void;
  isSearching: boolean;
}

export function FlightSearchForm({
  formData,
  setFormData,
  onSubmit,
  isSearching,
}: FlightSearchFormProps) {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'passengers' ? Number(value) : value
    }));
  };

  const handleTripTypeChange = (type: 'one-way' | 'round-trip') => {
    setFormData((prev) => ({ ...prev, tripType: type }));
  };

  const handleDateChange = (
    key: 'departureDate' | 'returnDate',
    date: Date | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: date ? date.toISOString().slice(0, 10) : ''
    }));
  };
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex space-x-2 mb-4">
        <button
          type="button"
          className={`px-4 py-2 rounded-md ${
            formData.tripType === 'round-trip'
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
          onClick={() => handleTripTypeChange('round-trip')}
        >
          Round Trip
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-md ${
            formData.tripType === 'one-way'
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
          onClick={() => handleTripTypeChange('one-way')}
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
            value={formData.origin}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="destination">To</Label>
          <Input
            id="destination"
            name="destination"
            placeholder="City or airport"
            value={formData.destination}
            onChange={handleInputChange}
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
                {formData.departureDate ? (
                  format(new Date(formData.departureDate), 'PPP')
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.departureDate ? new Date(formData.departureDate) : undefined}
                onSelect={(date) => handleDateChange('departureDate', date || undefined)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {formData.tripType === 'round-trip' && (
          <div className="space-y-2">
            <Label>Return Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  disabled={!formData.departureDate}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.returnDate ? (
                    format(new Date(formData.returnDate), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.returnDate ? new Date(formData.returnDate) : undefined}
                  onSelect={(date) => handleDateChange('returnDate', date || undefined)}
                  initialFocus
                  disabled={(date) =>
                    date < (formData.departureDate ? new Date(formData.departureDate) : new Date()) ||
                    date < new Date()
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
            value={formData.passengers}
            onChange={handleInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cabin">Cabin Class</Label>
          <select
            id="cabin"
            name="cabin"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            value={formData.cabin}
            onChange={handleInputChange}
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
