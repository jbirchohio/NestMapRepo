import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookingFormData } from '../types';

interface ClientInfoStepProps {
  formData: BookingFormData;
  onChange: (data: Partial<BookingFormData>) => void;
  onSubmit: (data: BookingFormData) => void;
}

export const ClientInfoStep: React.FC<ClientInfoStepProps> = ({
  formData,
  onChange,
  onSubmit,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name in formData) {
      onChange({ [name]: value } as Partial<BookingFormData>);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="origin" className="block text-sm font-medium mb-1">
            Origin
          </label>
          <Input
            id="origin"
            name="origin"
            value={formData.origin}
            onChange={handleChange}
            placeholder="City or Airport"
            required
          />
        </div>

        <div>
          <label htmlFor="destination" className="block text-sm font-medium mb-1">
            Destination
          </label>
          <Input
            id="destination"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            placeholder="City or Airport"
            required
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">Next: Select Flights</Button>
      </div>
    </form>
  );
};

export default ClientInfoStep;
