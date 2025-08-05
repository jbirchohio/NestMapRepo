import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, Coffee, Utensils, MapPin } from "lucide-react";
import { motion } from "framer-motion";

interface QuickActivity {
  icon: any;
  title: string;
  time: string;
  emoji: string;
}

const quickActivities: QuickActivity[] = [
  { icon: Coffee, title: "Morning coffee", time: "9:00 AM", emoji: "☕" },
  { icon: Utensils, title: "Lunch", time: "12:30 PM", emoji: "🍽️" },
  { icon: Utensils, title: "Dinner", time: "7:00 PM", emoji: "🍷" },
];

export default function ActivityModalSimple({ onClose, onSave }: any) {
  const [step, setStep] = useState<"what" | "where">("what");
  const [activity, setActivity] = useState("");
  const [location, setLocation] = useState("");

  const handleQuickAdd = (quick: QuickActivity) => {
    // Instantly add with smart defaults
    onSave({
      title: quick.title,
      time: quick.time,
      locationName: "Find a place",
      date: new Date(),
    });
  };

  const handleCustomActivity = () => {
    if (step === "what" && activity) {
      setStep("where");
    } else if (step === "where" && location) {
      // Parse and add
      onSave({
        title: activity,
        locationName: location,
        time: "12:00", // Smart default based on activity type
        date: new Date(),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 pb-8"
      >
        {/* Quick actions - one tap */}
        {step === "what" && (
          <>
            <h2 className="text-xl font-semibold mb-4">Quick add</h2>
            <div className="space-y-2 mb-6">
              {quickActivities.map((quick) => (
                <button
                  key={quick.title}
                  onClick={() => handleQuickAdd(quick)}
                  className="w-full p-4 bg-gray-50 rounded-xl flex items-center gap-3 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-2xl">{quick.emoji}</span>
                  <div className="flex-1">
                    <div className="font-medium">{quick.title}</div>
                    <div className="text-sm text-gray-500">{quick.time}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or add custom</span>
              </div>
            </div>

            {/* Custom activity - natural language */}
            <div className="mt-6">
              <Input
                autoFocus
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                placeholder="Hike at Griffith Observatory..."
                onKeyPress={(e) => e.key === "Enter" && handleCustomActivity()}
                className="text-lg py-6"
              />
            </div>
          </>
        )}

        {/* Where step - only if needed */}
        {step === "where" && (
          <>
            <button onClick={() => setStep("what")} className="mb-4 text-sm text-gray-500">
              ← Back
            </button>
            <h2 className="text-xl font-semibold mb-4">Where for {activity}?</h2>
            <Input
              autoFocus
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Search or enter location..."
              onKeyPress={(e) => e.key === "Enter" && handleCustomActivity()}
              className="text-lg py-6"
            />
          </>
        )}

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleCustomActivity}
            disabled={!activity || (step === "where" && !location)}
            className="flex-1"
          >
            {step === "what" ? "Next" : "Add to trip"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}