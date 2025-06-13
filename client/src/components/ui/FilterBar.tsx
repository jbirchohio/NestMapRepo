import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FilterBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
}

/**
 * Reusable filter/search bar for tables and lists.
 * Usage:
 *   <FilterBar value={query} onChange={setQuery} placeholder="Search trips..." />
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  value,
  onChange,
  placeholder = 'Filter...',
  onClear,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 w-full max-w-md ${className}`}>
      <Input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
        aria-label={placeholder}
      />
      {value && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Clear filter"
          onClick={() => {
            onChange('');
            onClear && onClear();
          }}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

export default FilterBar;
