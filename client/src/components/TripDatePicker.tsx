import { useState } from "react";
import { getTripDayPills } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const [page, setPage] = useState(0);
  const daysPerPage = 6;
  const totalPages = Math.ceil(tripDays.length / daysPerPage);
  const showPagination = tripDays.length > daysPerPage;

  return (
    <div className={className}>
      {label && (
        <Label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
          {label}
        </Label>
      )}
      {showPagination && (
        <div className="flex items-center justify-between mb-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-1"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Days {page * daysPerPage + 1}-{Math.min((page + 1) * daysPerPage, tripDays.length)} of {tripDays.length}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            className="p-1"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {tripDays
          .slice(page * daysPerPage, (page + 1) * daysPerPage)
          .map((day) => (
            <Button
              key={day.value}
              type="button"
              variant={selectedDate === day.value ? "default" : "outline"}
              size="sm"
              onClick={() => onDateSelect(day.value)}
              className="text-xs h-auto py-1.5 px-2 whitespace-nowrap"
            >
              {day.label}
            </Button>
          ))}
      </div>
    </div>
  );
}