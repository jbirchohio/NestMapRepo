import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Building2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { mapUseCaseToRoleType } from "@/lib/roleUtils";

// Enhanced B2B signup form validation schema
const signupSchema = z.object({
  email: z.string().email({ message: "Please enter a valid business email address" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  passwordConfirm: z.string().min(8, { message: "Password must be at least 8 characters" }),
  // Business information
  company: z.string().min(2, { message: "Company name is required" }),
  jobTitle: z.string().min(2, { message: "Job title is required" }),
  teamSize: z.string().min(1, { message: "Please select team size" }),
  useCase: z.string().min(1, { message: "Please select primary use case" }),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords do not match",
  path: ["passwordConfirm"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onSuccess?: () => void;
  onToggleForm?: () => void;
}

export default function SignupForm({ onSuccess, onToggleForm }: SignupFormProps) {
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      passwordConfirm: "",
      company: "",
      jobTitle: "",
      teamSize: "",
      useCase: "",
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      
      // Determine role type based on use case using utility function
      const roleType = mapUseCaseToRoleType(values.useCase);
      
      await signUp(values.email, values.password, {
        display_name: values.name,
        company: values.company,
        job_title: values.jobTitle,
        team_size: values.teamSize,
        use_case: values.useCase,
        role_type: roleType,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to sign up. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          Create Business Account
        </CardTitle>
        <CardDescription>
          Join thousands of professionals using NestMap for business travel planning
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
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
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your Name"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">Confirm Password</Label>
            <Input
              id="passwordConfirm"
              type="password"
              {...form.register("passwordConfirm")}
            />
            {form.formState.errors.passwordConfirm && (
              <p className="text-sm text-destructive">{form.formState.errors.passwordConfirm.message}</p>
            )}
          </div>

          {/* Business Information Section */}
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Business Information</h4>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Your Company"
                  {...form.register("company")}
                />
                {form.formState.errors.company && (
                  <p className="text-sm text-destructive">{form.formState.errors.company.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  type="text"
                  placeholder="e.g., Travel Manager, Operations Director"
                  {...form.register("jobTitle")}
                />
                {form.formState.errors.jobTitle && (
                  <p className="text-sm text-destructive">{form.formState.errors.jobTitle.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamSize">Team Size</Label>
                <Select onValueChange={(value) => form.setValue("teamSize", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-1000">201-1000 employees</SelectItem>
                    <SelectItem value="1000+">1000+ employees</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.teamSize && (
                  <p className="text-sm text-destructive">{form.formState.errors.teamSize.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="useCase">Primary Use Case</Label>
                <Select onValueChange={(value) => form.setValue("useCase", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="How will you use NestMap?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corporate-travel">Corporate Travel Management</SelectItem>
                    <SelectItem value="team-retreats">Team Retreats & Offsites</SelectItem>
                    <SelectItem value="conferences">Conference & Trade Show Planning</SelectItem>
                    <SelectItem value="sales-trips">Sales Team Travel</SelectItem>
                    <SelectItem value="client-services">Travel Agency & Client Services</SelectItem>
                    <SelectItem value="client-planning">Client Trip Planning & Proposals</SelectItem>
                    <SelectItem value="other">Other Business Use</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.useCase && (
                  <p className="text-sm text-destructive">{form.formState.errors.useCase.message}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Creating Business Account..." : "Start Your Business Account"}
          </Button>
          
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={onToggleForm}
            >
              Sign In
            </button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}