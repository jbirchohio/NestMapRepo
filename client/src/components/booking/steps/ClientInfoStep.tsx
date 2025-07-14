import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClientInfo } from '../types/booking';

interface ClientInfoStepProps {
  formData: ClientInfo;
  onChange: React.Dispatch<React.SetStateAction<ClientInfo>>;
  onSubmit: (e: React.FormEvent) => void;
}

export const ClientInfoStep: React.FC<ClientInfoStepProps> = ({ formData, onChange, onSubmit }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input name="origin" value={formData.origin} onChange={handleChange} placeholder="Origin" />
      <Input name="destination" value={formData.destination} onChange={handleChange} placeholder="Destination" />
      <Button type="submit">Next</Button>
    </form>
  );
};

export default ClientInfoStep;
