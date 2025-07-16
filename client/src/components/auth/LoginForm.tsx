
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertCircle } from 'lucide-react';

// Import UI components with proper type annotations and .js extensions for Node16/NodeNext
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Label } from '../../components/ui/label.js';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../../components/ui/card.js';
import { Alert, AlertDescription } from '../../components/ui/alert.js';

// Local imports with explicit .js extensions for Node16/NodeNext module resolution
import { useAuth } from '../../hooks/useAuth';

// Type definitions for the form
type LoginFormValues = {
  email: string;
  password: string;
};



// Extend Window interface to include React type definitions
declare global {
  namespace JSX {
    interface IntrinsicElements {
      form: React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>;
      div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
      p: React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
      span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
    }
  }
}

// Login form validation schema
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" })
});

interface LoginFormProps {
  onSuccess?: () => void;
  onToggleForm?: () => void;
}

export default function LoginForm({ onSuccess, onToggleForm }: LoginFormProps) {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  const { register, formState: { errors } } = form;


  const onSubmit = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      
      // Sign in the user using the useAuth hook's signIn function
      await signIn(values.email, values.password, {
        callbackUrl: '/dashboard',
      });
      
      // If sign in is successful, the rest will be handled by the auth flow
      
      // If we have an onSuccess callback, call it
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: Error | unknown) {
      const err = error as Error;
      console.error('Login error:', err);
      setErrorMessage(err?.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access your trips
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-sm font-medium"
                onClick={() => {/* Implement forgot password later */}}
              >
                Forgot password?
              </Button>
            </div>
            <Input
              id="password"
              type="password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
          
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto font-medium"
              onClick={onToggleForm}
            >
              Sign Up
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
