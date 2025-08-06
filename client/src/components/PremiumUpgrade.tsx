import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { 
  Sparkles, 
  Lock, 
  CheckCircle, 
  X,
  Zap,
  MapPin,
  Brain,
  TrendingUp
} from 'lucide-react';

interface SubscriptionStatus {
  isPro: boolean;
  tier: string;
  status: string;
  usage: {
    aiSuggestions: number;
    trips: number;
  };
  limits: {
    aiSuggestionsPerMonth: number;
    trips: number;
  };
}

interface PremiumUpgradeProps {
  feature?: string;
  onClose?: () => void;
  compact?: boolean;
}

export default function PremiumUpgrade({ feature, onClose, compact = false }: PremiumUpgradeProps) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await apiRequest('GET', '/api/subscription/status');
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const { checkoutUrl } = await apiRequest('POST', '/api/subscription/create-checkout', { 
        interval: billingInterval 
      });
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Failed to create checkout:', error);
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Already Pro
  if (status?.isPro) {
    if (compact) return null;
    
    return (
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="font-medium text-gray-900">You're a Pro subscriber!</p>
        </div>
      </div>
    );
  }

  // Compact version for inline prompts
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-full">
              <Lock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {feature === 'ai_suggestion' && `AI limit reached (${status?.usage.aiSuggestions}/${status?.limits.aiSuggestionsPerMonth})`}
                {feature === 'create_trip' && `Trip limit reached (${status?.usage.trips}/${status?.limits.trips})`}
                {!feature && 'Unlock unlimited access'}
              </p>
              <p className="text-sm text-gray-600">
                Upgrade to Pro for $8/month
              </p>
            </div>
          </div>
          <Button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
          >
            {upgrading ? 'Loading...' : 'Upgrade'}
          </Button>
        </div>
      </motion.div>
    );
  }

  // Full modal version
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center">
              <div className="inline-flex p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full mb-4">
                <Sparkles className="h-8 w-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Go Pro</h2>
              <p className="text-gray-600 mb-6">Unlimited trips, unlimited AI assistance</p>
            </div>

            {/* Current Usage */}
            {status && !status.isPro && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium mb-3 text-sm">Current Usage (Free)</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>AI Suggestions</span>
                      <span className="font-medium">{status.usage.aiSuggestions} / {status.limits.aiSuggestionsPerMonth}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((status.usage.aiSuggestions / status.limits.aiSuggestionsPerMonth) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Trips</span>
                      <span className="font-medium">{status.usage.trips} / {status.limits.trips}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((status.usage.trips / status.limits.trips) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <span className={billingInterval === 'monthly' ? 'font-medium' : 'text-gray-500'}>
                Monthly
              </span>
              <button
                onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'yearly' : 'monthly')}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-purple-600"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    billingInterval === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={billingInterval === 'yearly' ? 'font-medium' : 'text-gray-500'}>
                Yearly
                <span className="text-green-600 text-sm ml-1">(Save 25%)</span>
              </span>
            </div>

            {/* Price */}
            <div className="text-center mb-6">
              <div className="text-4xl font-bold">
                {billingInterval === 'monthly' ? '$8' : '$60'}
              </div>
              <div className="text-gray-600">
                per {billingInterval === 'monthly' ? 'month' : 'year'}
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">Unlimited trips</span>
                  <p className="text-sm text-gray-600">Plan as many adventures as you want</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">Unlimited AI assistance</span>
                  <p className="text-sm text-gray-600">Get personalized suggestions anytime</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">Ad-free experience</span>
                  <p className="text-sm text-gray-600">Focus on planning without distractions</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">Priority support</span>
                  <p className="text-sm text-gray-600">Get help when you need it</p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3"
            >
              {upgrading ? 'Loading...' : `Upgrade to Pro - $${billingInterval === 'monthly' ? '8/mo' : '60/yr'}`}
            </Button>

            <p className="text-xs text-center text-gray-500 mt-4">
              Cancel anytime. No hidden fees.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}