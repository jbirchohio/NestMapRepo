import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MapPin, Clock, Calendar, X } from "lucide-react";

interface ParsedActivity {
  what: string;
  where?: string;
  when?: string;
  date?: string;
}

export default function ActivityModalNatural({ tripId, date, onClose, onSave }: any) {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedActivity | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Example prompts that cycle
  const examples = [
    "Coffee at Blue Bottle at 9am",
    "Lunch in Chinatown",
    "Sunset at Golden Gate Bridge",
    "Dinner at that pizza place on 5th",
    "Morning run in Central Park",
    "Museum visit tomorrow afternoon"
  ];
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setExampleIndex((prev) => (prev + 1) % examples.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const parseNaturalLanguage = async (text: string) => {
    setIsProcessing(true);
    
    // Simulate AI parsing (in production, this would call your AI endpoint)
    setTimeout(() => {
      // Simple parsing logic for demo
      const timeMatch = text.match(/at (\d{1,2}(?::\d{2})?(?:am|pm)?)/i);
      const words = text.toLowerCase().split(' ');
      
      // Extract location (words after "at" or "in")
      let where = "";
      const locationPrepositions = ['at', 'in', 'to'];
      locationPrepositions.forEach(prep => {
        const idx = words.indexOf(prep);
        if (idx !== -1 && idx < words.length - 1) {
          // Take everything after the preposition except time
          const afterPrep = words.slice(idx + 1).join(' ');
          if (!afterPrep.match(/\d{1,2}(?::\d{2})?(?:am|pm)?/)) {
            where = afterPrep;
          }
        }
      });

      // Extract activity (everything before location/time)
      let what = text;
      if (where) {
        const whereIndex = text.toLowerCase().indexOf(where);
        what = text.substring(0, whereIndex).replace(/at|in|to/gi, '').trim();
      }
      if (timeMatch) {
        what = what.replace(timeMatch[0], '').trim();
      }

      setParsed({
        what: what || text,
        where: where || "Find location",
        when: timeMatch ? timeMatch[1] : "Flexible time",
        date: "Today"
      });
      setIsProcessing(false);
    }, 800);
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    parseNaturalLanguage(input);
  };

  const confirmActivity = () => {
    if (!parsed) return;
    
    // Convert to activity format
    onSave({
      title: parsed.what,
      locationName: parsed.where,
      time: convertToTime(parsed.when || "12:00"),
      date: new Date(), // Would parse parsed.date in production
      notes: `Added: "${input}"`
    });
  };

  const convertToTime = (timeStr: string): string => {
    // Simple conversion - in production would be more robust
    if (timeStr.includes("am") || timeStr.includes("pm")) {
      return timeStr.replace(/am|pm/i, '');
    }
    return timeStr === "Flexible time" ? "12:00" : timeStr;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Add to your day</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Natural language input */}
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={examples[exampleIndex]}
              className="w-full p-4 pr-12 text-lg bg-gray-50 dark:bg-gray-800 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              rows={2}
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isProcessing}
              className="absolute right-2 bottom-2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-2">
            Just describe what you want to do, naturally
          </p>
        </div>

        {/* Parsed result */}
        <AnimatePresence>
          {parsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Got it! Here's what I understood:</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">Activity</div>
                      <div className="font-medium">{parsed.what}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                      <MapPin className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">Location</div>
                      <div className="font-medium">{parsed.where}</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                        <Clock className="w-4 h-4 text-purple-500" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Time</div>
                        <div className="font-medium">{parsed.when}</div>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                        <Calendar className="w-4 h-4 text-orange-500" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Date</div>
                        <div className="font-medium">{parsed.date}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setParsed(null);
                      inputRef.current?.focus();
                    }}
                    className="flex-1"
                  >
                    Try again
                  </Button>
                  <Button onClick={confirmActivity} className="flex-1">
                    Add to trip
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick suggestions */}
        {!parsed && (
          <div className="p-6 pt-4 border-t">
            <div className="flex gap-2 flex-wrap">
              {["Coffee", "Lunch", "Museum", "Beach", "Shopping"].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}