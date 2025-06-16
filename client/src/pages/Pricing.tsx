
import { motion } from 'framer-motion';
import { Check, Crown, Zap, Building2, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const pricingTiers = [
  {
    name: 'Basic',
    price: '$29',
    period: '/month',
    description: 'Perfect for small teams getting started',
    icon: Zap,
    color: 'from-blue-500 to-blue-600',
    features: [
      'Trip planning & management',
      'Team dashboard',
      '1 admin user',
      'Basic reporting',
      'Email support'
    ],
    recommended: false
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/month',
    description: 'Everything in Basic plus professional features',
    icon: Crown,
    color: 'from-electric-500 to-electric-600',
    features: [
      'Everything in Basic',
      'White label branding',
      'Client proposals',
      'Up to 5 users',
      'Advanced analytics',
      'Priority support'
    ],
    recommended: true
  },
  {
    name: 'Business',
    price: '$199',
    period: '/month',
    description: 'Everything in Pro plus enterprise features',
    icon: Building2,
    color: 'from-emerald-500 to-emerald-600',
    features: [
      'Everything in Pro',
      'Custom domain',
      'Advanced analytics dashboard',
      'Up to 10+ users',
      'API access',
      'Dedicated account manager'
    ],
    recommended: false
  },
  {
    name: 'Enterprise',
    price: '$499',
    period: '+/month',
    description: 'Everything in Business plus enterprise-grade features',
    icon: Shield,
    color: 'from-orange-500 to-orange-600',
    features: [
      'Everything in Business',
      'SSO integration',
      'Full API access',
      'Concierge onboarding',
      'SLA guarantees',
      'Custom integrations',
      'Unlimited users'
    ],
    recommended: false
  }
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-electric-600 to-blue-600 bg-clip-text text-transparent mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Tier inheritance pricing means you get everything from lower tiers included in your plan.
            Start with Basic and upgrade anytime to unlock more features.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {pricingTiers.map((tier, index) => {
            const IconComponent = tier.icon;
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {tier.recommended && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-electric-500 to-blue-500 text-white border-0 px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <Card className={`h-full relative overflow-hidden ${
                  tier.recommended 
                    ? 'border-electric-200 shadow-xl ring-2 ring-electric-100 dark:border-electric-700 dark:ring-electric-800' 
                    : 'border-slate-200 dark:border-slate-700'
                }`}>
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tier.color}`} />
                  
                  <CardHeader className="text-center pb-4">
                    <div className={`w-12 h-12 mx-auto rounded-lg bg-gradient-to-r ${tier.color} flex items-center justify-center mb-4`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                      {tier.description}
                    </CardDescription>
                    <div className="flex items-baseline justify-center mt-4">
                      <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                        {tier.price}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 ml-1">
                        {tier.period}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {tier.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className={`text-sm ${
                            featureIndex === 0 && index > 0 
                              ? 'font-semibold text-slate-700 dark:text-slate-300' 
                              : 'text-slate-600 dark:text-slate-400'
                          }`}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      className={`w-full mt-6 ${
                        tier.recommended
                          ? 'bg-gradient-to-r from-electric-500 to-blue-500 hover:from-electric-600 hover:to-blue-600'
                          : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200'
                      }`}
                    >
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <Card className="max-w-4xl mx-auto bg-gradient-to-r from-electric-50 to-blue-50 dark:from-electric-900/20 dark:to-blue-900/20 border-electric-200 dark:border-electric-700">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100">
                Tier Inheritance Benefits
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Each plan includes everything from the plans below it. This means when you upgrade to Pro, 
                you get all Basic features plus Pro features. Upgrade to Business and get Basic + Pro + Business features.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mb-3">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-semibold mb-2">Start Simple</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Begin with Basic features and upgrade as you grow
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-lg bg-gradient-to-r from-electric-500 to-electric-600 flex items-center justify-center mb-3">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-semibold mb-2">Keep Everything</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Never lose features when you upgrade plans
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center mb-3">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-semibold mb-2">Scale Seamlessly</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Predictable pricing as your team grows
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
