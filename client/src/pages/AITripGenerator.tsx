import { motion } from "framer-motion";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Brain, Sparkles } from "lucide-react";
import AITripGenerator from '@/components/AITripGenerator';

export default function AITripGeneratorPage() {
  return (
    <div className="min-h-screen bg-soft-100 dark:bg-navy-900">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden bg-gradient-to-br from-electric-500 via-electric-600 to-electric-700 text-white"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        <div className="relative container mx-auto px-6 py-16">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-white/80" />
                  <span className="text-white/90 text-sm font-medium">AI-Powered Planning</span>
                </div>
              </div>

              <h1 className="text-5xl font-bold mb-4 tracking-tight text-white">
                AI Trip Generator
              </h1>
              <p className="text-xl text-white/90 mb-6 max-w-2xl">
                Create personalized travel itineraries with AI-powered recommendations based on your preferences and budget
              </p>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-white/80">Smart recommendations</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span className="text-white/80">Real-time pricing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full" />
                  <span className="text-white/80">Instant itineraries</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        <AnimatedCard variant="soft" className="p-6">
          <AITripGenerator />
        </AnimatedCard>
      </div>
    </div>
  );
}