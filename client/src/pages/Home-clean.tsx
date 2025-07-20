import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/components/auth/AuthModal";
import { PrimaryButton } from "@/components/ui/primary-button";
import { AnimatedCard } from "@/components/ui/animated-card";
import { motion } from "framer-motion";
import { Plane, Brain, Users, BarChart3, CheckCircle, X } from "lucide-react";

export default function Home() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState<"login">("login");
  
  const { user } = useAuth();
  
  const handleSignInClick = () => {
    setAuthView("login");
    setIsAuthModalOpen(true);
  };
  
  const handleScheduleCall = () => {
    // In a real implementation, this would open a calendar booking system
    window.open('mailto:sales@nestmap.com?subject=Discovery Call Request', '_blank');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-electric-50/30 to-electric-100/50 dark:from-dark-900 dark:via-electric-900/10 dark:to-electric-800/20">
      
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultView={authView}
        onSuccess={() => {
          setIsAuthModalOpen(false);
        }}
      />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-electric-500/20 via-electric-600/10 to-electric-700/20 dark:from-electric-400/10 dark:via-electric-500/5 dark:to-electric-600/10"></div>
        <div className="relative">
          <div className="container mx-auto px-4 py-16 sm:py-24">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <div className="flex justify-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="h-20 w-20 bg-gradient-to-br from-electric-400 to-electric-600 rounded-2xl flex items-center justify-center shadow-lg shadow-electric-500/25"
                >
                  <Plane className="h-10 w-10 text-white" />
                </motion.div>
              </div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-electric-600 via-electric-500 to-electric-700 bg-clip-text text-transparent mb-6"
              >
                AI-powered corporate travel management. Predictable. Built for enterprise scale.
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-xl sm:text-2xl text-electric-700 dark:text-electric-300 mb-4 max-w-3xl mx-auto"
              >
                For organizations managing 50+ travelers or $500K+ travel spend annually.
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="text-lg text-electric-600/80 dark:text-electric-400/80 mb-12 max-w-2xl mx-auto"
              >
                Enterprise integrations, automation, compliance, and comprehensive reporting for corporate travel programs
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                {!user && (
                  <>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                      <PrimaryButton
                        onClick={handleScheduleCall}
                        className="text-lg px-8 py-4"
                      >
                        Schedule a Discovery Call
                      </PrimaryButton>
                      <Button
                        onClick={() => {
                          const compareSection = document.getElementById('compare');
                          compareSection?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        variant="outline"
                        className="text-lg px-8 py-4 border-electric-300 text-electric-700 hover:bg-electric-50 dark:border-electric-600 dark:text-electric-300 dark:hover:bg-electric-900/20"
                      >
                        See How We Compare →
                      </Button>
                    </div>
                    
                    {/* Sign In Button for existing customers */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.8 }}
                      className="mt-6 text-center"
                    >
                      <p className="text-sm text-electric-600/80 dark:text-electric-400/80 mb-2">
                        Existing customer?
                      </p>
                      <Button
                        onClick={handleSignInClick}
                        variant="ghost"
                        className="text-electric-600 hover:text-electric-700 hover:bg-electric-50 dark:text-electric-400 dark:hover:text-electric-300 dark:hover:bg-electric-900/20"
                      >
                        Sign In
                      </Button>
                    </motion.div>
                  </>
                )}
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
              >
                <AnimatedCard className="p-6 text-center bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-electric-200/50 dark:border-electric-700/50">
                  <Brain className="h-12 w-12 text-electric-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-electric-900 dark:text-electric-100 mb-2">Enterprise Automation</h3>
                  <p className="text-electric-600 dark:text-electric-400">AI-powered booking workflows with policy compliance and approval routing</p>
                </AnimatedCard>
                
                <AnimatedCard className="p-6 text-center bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-electric-200/50 dark:border-electric-700/50">
                  <Users className="h-12 w-12 text-electric-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-electric-900 dark:text-electric-100 mb-2">Scale & Integration</h3>
                  <p className="text-electric-600 dark:text-electric-400">Seamless ERP, HR, and expense system integrations for enterprise-grade deployment</p>
                </AnimatedCard>
                
                <AnimatedCard className="p-6 text-center bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-electric-200/50 dark:border-electric-700/50">
                  <BarChart3 className="h-12 w-12 text-electric-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-electric-900 dark:text-electric-100 mb-2">Advanced Analytics</h3>
                  <p className="text-electric-600 dark:text-electric-400">Comprehensive spend optimization and predictive travel intelligence</p>
                </AnimatedCard>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Qualification Section */}
      {!user && (
        <div className="bg-white/60 dark:bg-dark-800/60 backdrop-blur-sm py-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto text-center"
            >
              <h2 className="text-3xl font-bold text-electric-900 dark:text-electric-100 mb-8">
                Who We're Built For
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-4">Perfect Fit</h3>
                  <ul className="space-y-3 text-left">
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-green-700 dark:text-green-300">100+ employees or 50+ active travelers annually</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-green-700 dark:text-green-300">$500K+ corporate travel spend</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-green-700 dark:text-green-300">Enterprise integrations, automation, compliance, reporting needs</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-4">Not a Fit For</h3>
                  <ul className="space-y-3 text-left">
                    <li className="flex items-start">
                      <X className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-red-700 dark:text-red-300">Small businesses, fewer than 20 travelers</span>
                    </li>
                    <li className="flex items-start">
                      <X className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-red-700 dark:text-red-300">Booking-only tools with no automation or analytics needs</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Pricing Guidance Section */}
      {!user && (
        <div className="bg-electric-50/30 dark:bg-electric-900/10 py-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto text-center"
            >
              <h2 className="text-3xl font-bold text-electric-900 dark:text-electric-100 mb-8">
                Pricing Guidance
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-electric-200/50 dark:border-electric-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-electric-900 dark:text-electric-100 mb-2">100–250 employees</h3>
                  <p className="text-2xl font-bold text-electric-600 dark:text-electric-400 mb-2">Starting at $12K/year</p>
                </div>
                
                <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-electric-200/50 dark:border-electric-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-electric-900 dark:text-electric-100 mb-2">251–750 employees</h3>
                  <p className="text-2xl font-bold text-electric-600 dark:text-electric-400 mb-2">$24K/year</p>
                </div>
                
                <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-electric-200/50 dark:border-electric-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-electric-900 dark:text-electric-100 mb-2">751–2,000 employees</h3>
                  <p className="text-2xl font-bold text-electric-600 dark:text-electric-400 mb-2">$48K/year</p>
                </div>
              </div>
              
              <p className="text-lg text-electric-600 dark:text-electric-400 font-medium">
                No hidden fees, no per-transaction charges.
              </p>
            </motion.div>
          </div>
        </div>
      )}

      {/* Comparison Section */}
      {!user && (
        <div id="compare" className="mt-16 bg-white/60 dark:bg-dark-800/60 backdrop-blur-sm py-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-6xl mx-auto text-center"
            >
              <h2 className="text-3xl font-bold text-electric-900 dark:text-electric-100 mb-8">
                Why Enterprise Leaders Choose NestMap
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-electric-200/50 dark:border-electric-700/50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-electric-900 dark:text-electric-100 mb-4">Traditional TMCs</h3>
                  <ul className="space-y-2 text-left text-electric-600 dark:text-electric-400">
                    <li className="flex items-start">
                      <X className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>Manual processes, slow booking</span>
                    </li>
                    <li className="flex items-start">
                      <X className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>Limited automation capabilities</span>
                    </li>
                    <li className="flex items-start">
                      <X className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>Basic reporting and analytics</span>
                    </li>
                    <li className="flex items-start">
                      <X className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>High transaction fees</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-electric-200/50 dark:border-electric-700/50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-electric-900 dark:text-electric-100 mb-4">Consumer Tools</h3>
                  <ul className="space-y-2 text-left text-electric-600 dark:text-electric-400">
                    <li className="flex items-start">
                      <X className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>No enterprise integrations</span>
                    </li>
                    <li className="flex items-start">
                      <X className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>Lack of policy compliance</span>
                    </li>
                    <li className="flex items-start">
                      <X className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>No centralized management</span>
                    </li>
                    <li className="flex items-start">
                      <X className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>Limited expense tracking</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-br from-electric-500/10 to-electric-600/10 border-2 border-electric-500/30 rounded-xl p-6 relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-electric-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      NestMap Enterprise
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-electric-900 dark:text-electric-100 mb-4 mt-2">AI-Powered Platform</h3>
                  <ul className="space-y-2 text-left text-electric-700 dark:text-electric-300">
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>Intelligent automation & AI optimization</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>Enterprise-grade integrations</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>Advanced analytics & predictive insights</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>No transaction fees, transparent pricing</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Enterprise CTA Footer */}
      {!user && (
        <div className="mt-16 bg-gradient-to-r from-electric-600 to-electric-700 text-white py-16 rounded-xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Corporate Travel?</h2>
            <p className="text-xl text-electric-100 mb-8 max-w-2xl mx-auto">
              Schedule a Discovery Call → Tailored demo. No hard sell.
            </p>
            <PrimaryButton
              onClick={handleScheduleCall}
              className="bg-white text-electric-600 hover:bg-electric-50 text-lg px-8 py-4"
            >
              Schedule a Discovery Call
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
