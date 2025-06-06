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
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-navy-800 dark:text-navy-100">
            Join {config.companyName}
          </h1>
          <p className="text-sm sm:text-base text-navy-600 dark:text-navy-300 mt-1 sm:mt-2">
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