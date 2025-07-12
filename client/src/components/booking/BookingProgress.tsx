import { CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  label: string;
};

interface BookingProgressProps {
  currentStep: string;
  steps: Step[];
  className?: string;
}

export function BookingProgress({
  currentStep,
  steps,
  className,
}: BookingProgressProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2 z-0">
          <div
            className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
            style={{
              width: `${((currentIndex) / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>

        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          // const isUpcoming = index > currentIndex; // Not used but part of step logic

          return (
            <div
              key={step.id}
              className={cn(
                "relative z-10 flex flex-col items-center",
                "w-full"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors duration-200",
                  isCompleted || isActive
                    ? "border-blue-600 bg-white dark:bg-gray-900"
                    : "border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600",
                  isActive && "ring-4 ring-blue-100 dark:ring-blue-900/30"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                ) : isActive ? (
                  <div className="w-3 h-3 rounded-full bg-blue-600" />
                ) : (
                  <Circle className="h-3 w-3 text-gray-400" />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center transition-colors",
                  isActive || isCompleted
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
