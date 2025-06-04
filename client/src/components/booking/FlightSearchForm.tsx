import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Plane, MapPin, Users, Plus, X } from 'lucide-react';
import { format } from 'date-fns';

interface FlightSearchFormProps {
  formData: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    tripType: "one-way" | "round-trip";
    passengers: number;
    primaryTraveler: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: string;
    };
    additionalTravelers: Array<{
      firstName: string;
      lastName: string;
      dateOfBirth: string;
    }>;
    cabin: "economy" | "premium-economy" | "business" | "first";
    budget?: number;
    department: string;
    projectCode: string;
    costCenter: string;
  };
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function FlightSearchForm({ formData, setFormData, onSubmit }: FlightSearchFormProps) {
  const [departureCalendarOpen, setDepartureCalendarOpen] = useState(false);
  const [returnCalendarOpen, setReturnCalendarOpen] = useState(false);

  const addTraveler = () => {
    setFormData({
      ...formData,
      additionalTravelers: [
        ...formData.additionalTravelers,
        { firstName: '', lastName: '', dateOfBirth: '' }
      ],
      passengers: formData.passengers + 1
    });
  };

  const removeTraveler = (index: number) => {
    const updatedTravelers = formData.additionalTravelers.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      additionalTravelers: updatedTravelers,
      passengers: formData.passengers - 1
    });
  };

  const updateTraveler = (index: number, field: string, value: string) => {
    const updatedTravelers = [...formData.additionalTravelers];
    updatedTravelers[index] = { ...updatedTravelers[index], [field]: value };
    setFormData({
      ...formData,
      additionalTravelers: updatedTravelers
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Travel Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="origin">From</Label>
          <Input 
            id="origin"
            placeholder="Departure city or airport"
            value={formData.origin}
            onChange={(e) => setFormData({...formData, origin: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="destination">To</Label>
          <Input 
            id="destination"
            placeholder="Destination city or airport"
            value={formData.destination}
            onChange={(e) => setFormData({...formData, destination: e.target.value})}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Trip Type</Label>
          <Select value={formData.tripType} onValueChange={(value: "one-way" | "round-trip") => setFormData({...formData, tripType: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one-way">One Way</SelectItem>
              <SelectItem value="round-trip">Round Trip</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Departure Date</Label>
          <Popover open={departureCalendarOpen} onOpenChange={setDepartureCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.departureDate ? format(new Date(formData.departureDate), 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.departureDate ? new Date(formData.departureDate) : undefined}
                onSelect={(date) => {
                  if (date) {
                    setFormData({...formData, departureDate: date.toISOString().split('T')[0]});
                    setDepartureCalendarOpen(false);
                  }
                }}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {formData.tripType === 'round-trip' && (
          <div className="space-y-2">
            <Label>Return Date</Label>
            <Popover open={returnCalendarOpen} onOpenChange={setReturnCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.returnDate ? format(new Date(formData.returnDate), 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.returnDate ? new Date(formData.returnDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setFormData({...formData, returnDate: date.toISOString().split('T')[0]});
                      setReturnCalendarOpen(false);
                    }
                  }}
                  disabled={(date) => date < new Date(formData.departureDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Primary Traveler */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Primary Traveler</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input 
              id="firstName"
              value={formData.primaryTraveler.firstName}
              onChange={(e) => setFormData({
                ...formData, 
                primaryTraveler: {...formData.primaryTraveler, firstName: e.target.value}
              })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input 
              id="lastName"
              value={formData.primaryTraveler.lastName}
              onChange={(e) => setFormData({
                ...formData, 
                primaryTraveler: {...formData.primaryTraveler, lastName: e.target.value}
              })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              type="email"
              value={formData.primaryTraveler.email}
              onChange={(e) => setFormData({
                ...formData, 
                primaryTraveler: {...formData.primaryTraveler, email: e.target.value}
              })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input 
              id="phone"
              value={formData.primaryTraveler.phone}
              onChange={(e) => setFormData({
                ...formData, 
                primaryTraveler: {...formData.primaryTraveler, phone: e.target.value}
              })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input 
              id="dateOfBirth"
              type="date"
              value={formData.primaryTraveler.dateOfBirth}
              onChange={(e) => setFormData({
                ...formData, 
                primaryTraveler: {...formData.primaryTraveler, dateOfBirth: e.target.value}
              })}
              required
            />
          </div>
        </div>
      </div>

      {/* Additional Travelers */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Additional Travelers</h3>
          <Button type="button" variant="outline" onClick={addTraveler}>
            <Plus className="w-4 h-4 mr-2" />
            Add Traveler
          </Button>
        </div>
        
        {formData.additionalTravelers.map((traveler, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Traveler {index + 2}</h4>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeTraveler(index)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input 
                  value={traveler.firstName}
                  onChange={(e) => updateTraveler(index, 'firstName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input 
                  value={traveler.lastName}
                  onChange={(e) => updateTraveler(index, 'lastName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input 
                  type="date"
                  value={traveler.dateOfBirth}
                  onChange={(e) => updateTraveler(index, 'dateOfBirth', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cabin Class</Label>
          <Select value={formData.cabin} onValueChange={(value: any) => setFormData({...formData, cabin: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="economy">Economy</SelectItem>
              <SelectItem value="premium-economy">Premium Economy</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="first">First Class</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="budget">Budget (Optional)</Label>
          <Input 
            id="budget"
            type="number"
            placeholder="Maximum budget"
            value={formData.budget || ''}
            onChange={(e) => setFormData({...formData, budget: e.target.value ? parseInt(e.target.value) : undefined})}
          />
        </div>
      </div>

      {/* Corporate Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input 
            id="department"
            value={formData.department}
            onChange={(e) => setFormData({...formData, department: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectCode">Project Code</Label>
          <Input 
            id="projectCode"
            value={formData.projectCode}
            onChange={(e) => setFormData({...formData, projectCode: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="costCenter">Cost Center</Label>
          <Input 
            id="costCenter"
            value={formData.costCenter}
            onChange={(e) => setFormData({...formData, costCenter: e.target.value})}
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full">
        <Plane className="w-4 h-4 mr-2" />
        Search Flights
      </Button>
    </form>
  );
}