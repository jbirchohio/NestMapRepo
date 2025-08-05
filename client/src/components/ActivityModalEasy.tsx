import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface QuickOption {
  emoji: string;
  text: string;
  time: string;
}

const quickOptions: QuickOption[] = [
  { emoji: "☕", text: "Get coffee", time: "9:00 AM" },
  { emoji: "🥐", text: "Eat breakfast", time: "8:00 AM" },
  { emoji: "🍕", text: "Grab lunch", time: "12:00 PM" },
  { emoji: "🍽️", text: "Have dinner", time: "7:00 PM" },
  { emoji: "🍦", text: "Get dessert", time: "8:00 PM" },
  { emoji: "🏖️", text: "Beach time", time: "2:00 PM" },
  { emoji: "🛍️", text: "Go shopping", time: "3:00 PM" },
  { emoji: "🎬", text: "See a movie", time: "7:30 PM" },
];

export default function ActivityModalEasy({ onClose, onSave, date }: any) {
  const [step, setStep] = useState<"what" | "where">("what");
  const [selectedActivity, setSelectedActivity] = useState<QuickOption | null>(null);
  const [customActivity, setCustomActivity] = useState("");
  const [location, setLocation] = useState("");

  // Quick add with one tap
  const handleQuickAdd = (option: QuickOption) => {
    onSave({
      title: option.text,
      time: convertTo24Hour(option.time),
      locationName: "Find a spot nearby",
      date: date || new Date(),
    });
  };

  // Convert 12-hour to 24-hour time
  const convertTo24Hour = (time12: string): string => {
    const [time, period] = time12.split(' ');
    let [hours, minutes] = time.split(':');
    let hour = parseInt(hours);
    
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    
    return `${hour.toString().padStart(2, '0')}:${minutes || '00'}`;
  };

  // Handle custom activity
  const startCustom = () => {
    setStep("what");
  };

  const handleNext = () => {
    if (customActivity.trim()) {
      setStep("where");
    }
  };

  const handleSave = () => {
    if (customActivity && location) {
      onSave({
        title: customActivity,
        locationName: location,
        time: "12:00", // Default noon
        date: date || new Date(),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-white rounded-t-3xl w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Add something fun</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 pb-8 max-h-[70vh] overflow-y-auto">
          {step === "what" && !customActivity && (
            <>
              {/* Quick picks */}
              <p className="text-sm text-gray-600 mb-4">
                Tap one or make your own
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                {quickOptions.map((option) => (
                  <button
                    key={option.text}
                    onClick={() => handleQuickAdd(option)}
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors"
                  >
                    <div className="text-2xl mb-1">{option.emoji}</div>
                    <div className="font-medium text-sm">{option.text}</div>
                    <div className="text-xs text-gray-500">{option.time}</div>
                  </button>
                ))}
              </div>

              {/* Custom option */}
              <button
                onClick={startCustom}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 transition-colors"
              >
                <div className="text-gray-600">
                  + Add your own thing
                </div>
              </button>
            </>
          )}

          {/* Custom activity input */}
          {step === "what" && customActivity !== "" && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                What do you want to do?
              </p>
              
              <input
                type="text"
                value={customActivity}
                onChange={(e) => setCustomActivity(e.target.value)}
                placeholder="Type here..."
                className="w-full p-4 text-lg border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setCustomActivity("")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!customActivity.trim()}
                  className="flex-1"
                >
                  Next
                </Button>
              </div>
            </>
          )}

          {/* Location input */}
          {step === "where" && (
            <>
              <button
                onClick={() => setStep("what")}
                className="text-sm text-blue-600 mb-4"
              >
                ← Go back
              </button>

              <p className="text-sm text-gray-600 mb-4">
                Where will you {customActivity.toLowerCase()}?
              </p>
              
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Name or address..."
                className="w-full p-4 text-lg border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />

              {/* Quick location suggestions */}
              <div className="mt-4 space-y-2">
                {["Near my hotel", "Downtown", "By the beach", "Don't know yet"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setLocation(suggestion)}
                    className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <Button
                onClick={handleSave}
                disabled={!location.trim()}
                className="w-full mt-6"
                size="lg"
              >
                Add to my day
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}