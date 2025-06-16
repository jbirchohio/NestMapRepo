import React from 'react';

export interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange }) => (
  <input
    type="time"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="border rounded px-2 py-1"
  />
);

export default TimePicker;
