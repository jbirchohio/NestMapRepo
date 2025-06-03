import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import OnboardingWizard from '@/components/OnboardingWizard';
import { motion } from 'framer-motion';

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { roleType } = useAuth();

  const handleOnboardingComplete = () => {
    // Redirect to appropriate dashboard based on role
    if (roleType === 'agency') {
      setLocation('/dashboard/agency');
    } else {
      setLocation('/dashboard/corporate');
    }
  };

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