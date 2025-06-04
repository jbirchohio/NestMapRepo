import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plane, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as ReactCalendar } from '@/components/ui/calendar';

const flightSearchSchema = z.object({
  origin: z.string().min(1, 'Origin city is required'),
  destination: z.string().min(1, 'Destination city is required'),
  departureDate: z.string().min(1, 'Departure date is required'),
  returnDate: z.string().optional(),
  tripType: z.enum(['one-way', 'round-trip']),
  passengers: z.number().min(1).max(10),
});

type FlightSearchValues = z.infer<typeof flightSearchSchema>;

interface FlightSearchFormProps {
  onSearch: (data: FlightSearchValues) => void;
  isLoading?: boolean;
}

export function FlightSearchForm({ onSearch, isLoading }: FlightSearchFormProps) {
  const [departureCalendarOpen, setDepartureCalendarOpen] = useState(false);
  const [returnCalendarOpen, setReturnCalendarOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FlightSearchValues>({
    resolver: zodResolver(flightSearchSchema),
    defaultValues: {
      tripType: 'round-trip',
      passengers: 1
    }
  });

  const tripType = watch('tripType');
  const departureDate = watch('departureDate');
  const returnDate = watch('returnDate');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          Flight Search
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSearch)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="origin">Origin</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="origin"
                  placeholder="Departure city"
                  className="pl-10"
                  {...register('origin')}
                />
              </div>
              {errors.origin && (
                <p className="text-sm text-red-500 mt-1">{errors.origin.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="destination">Destination</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="destination"
                  placeholder="Arrival city"
                  className="pl-10"
                  {...register('destination')}
                />
              </div>
              {errors.destination && (
                <p className="text-sm text-red-500 mt-1">{errors.destination.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="round-trip"
                {...register('tripType')}
                className="mr-2"
              />
              Round Trip
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="one-way"
                {...register('tripType')}
                className="mr-2"
              />
              One Way
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Departure Date</Label>
              <Popover open={departureCalendarOpen} onOpenChange={setDepartureCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {departureDate ? format(new Date(departureDate), 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <ReactCalendar
                    mode="single"
                    selected={departureDate ? new Date(departureDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setValue('departureDate', format(date, 'yyyy-MM-dd'));
                        setDepartureCalendarOpen(false);
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.departureDate && (
                <p className="text-sm text-red-500 mt-1">{errors.departureDate.message}</p>
              )}
            </div>

            {tripType === 'round-trip' && (
              <div>
                <Label>Return Date</Label>
                <Popover open={returnCalendarOpen} onOpenChange={setReturnCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {returnDate ? format(new Date(returnDate), 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <ReactCalendar
                      mode="single"
                      selected={returnDate ? new Date(returnDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setValue('returnDate', format(date, 'yyyy-MM-dd'));
                          setReturnCalendarOpen(false);
                        }
                      }}
                      disabled={(date) => {
                        const departure = departureDate ? new Date(departureDate) : new Date();
                        return date < departure;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div>
              <Label htmlFor="passengers">Passengers</Label>
              <Input
                id="passengers"
                type="number"
                min="1"
                max="10"
                {...register('passengers', { valueAsNumber: true })}
              />
              {errors.passengers && (
                <p className="text-sm text-red-500 mt-1">{errors.passengers.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search Flights'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}