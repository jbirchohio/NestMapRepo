import { getTripDayPills } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface TripDatePickerProps {
  startDate: Date;
  endDate: Date;
  selectedDate: string; // YYYY-MM-DD format
  onDateSelect: (date: string) => void;
  label?: string;
  className?: string;
}

export default function TripDatePicker({
  startDate,
  endDate,
  selectedDate,
  onDateSelect,
  label = "Date",
  className = ""
}: TripDatePickerProps) {
  const tripDays = getTripDayPills(startDate, endDate);

  return (
    <div className={className}>
      {label && (
        <Label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
          {label}
        </Label>
      )}
      <div className="grid grid-cols-2 gap-2">
        {tripDays.map((day) => (
          <Button
            key={day.value}
            type="button"
            variant={selectedDate === day.value ? "default" : "outline"}
            size="sm"
            onClick={() => onDateSelect(day.value)}
            className="text-xs h-auto py-2 px-3 whitespace-nowrap"
          >
            {day.label}
          </Button>
        ))}
      </div>
    </div>
  );
}