import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth/AuthContext';
import OnboardingWizard from '@/components/OnboardingWizard';
import { motion } from 'framer-motion';

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { roleType, user, loading } = useAuth();

  const handleOnboardingComplete = () => {
    // Redirect to unified dashboard
    setLocation('/dashboard');
  };

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-electric-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-navy-600 dark:text-navy-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to home if not authenticated
  if (!user) {
    setLocation('/');
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <OnboardingWizard onComplete={handleOnboardingComplete} />
    </motion.div>
  );
}
