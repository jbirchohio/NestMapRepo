import { useLocation } from 'wouter';
import SignupForm from '@/components/auth/SignupForm';
import { useWhiteLabel } from '@/contexts/WhiteLabelContext';

export default function Signup() {
  const [, setLocation] = useLocation();
  const { config } = useWhiteLabel();
  
  const handleSignupSuccess = () => {
    setLocation('/dashboard');
  };
  
  const handleToggleToLogin = () => {
    setLocation('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800 py-4 px-3 sm:px-4 overflow-y-auto">
      <div className="w-full max-w-sm sm:max-w-md mx-auto">
        <div className="text-center mb-3 sm:mb-4 pt-2">
          <h1 className="text-lg sm:text-xl font-bold text-navy-800 dark:text-navy-100">
            Join {config.companyName}
          </h1>
          <p className="text-xs sm:text-sm text-navy-600 dark:text-navy-300 mt-1">
            Create your business travel account
          </p>
        </div>
        
        <SignupForm 
          onSuccess={handleSignupSuccess}
          onToggleForm={handleToggleToLogin}
        />
      </div>
    </div>
  );
}