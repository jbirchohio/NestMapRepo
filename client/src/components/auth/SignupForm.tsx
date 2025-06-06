import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/JWTAuthContext";
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
      
      await signUp(values.email, values.password, values.name);
      
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
    <Card className="w-full">
      <CardHeader className="text-center space-y-2 pb-4">
        <CardTitle className="text-lg flex items-center justify-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Create Business Account
        </CardTitle>
        <CardDescription className="text-sm">
          Join professionals using our travel platform
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 px-6">
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
          <div className="pt-4 border-t">
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
                    <SelectValue placeholder="How will you use this platform?" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted">Corporate Travel</div>
                    <SelectItem value="corporate-travel-management">Corporate Travel Management</SelectItem>
                    <SelectItem value="employee-business-trips">Employee Business Trips</SelectItem>
                    <SelectItem value="team-retreats-offsite">Team Retreats & Offsites</SelectItem>
                    <SelectItem value="conference-event-attendance">Conference & Event Attendance</SelectItem>
                    <SelectItem value="sales-client-meetings">Sales & Client Meetings</SelectItem>
                    <SelectItem value="training-workshops">Training & Workshops</SelectItem>
                    <SelectItem value="site-visits-inspections">Site Visits & Inspections</SelectItem>
                    <SelectItem value="company-relocations">Company Relocations</SelectItem>
                    <SelectItem value="executive-travel">Executive Travel</SelectItem>
                    
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted mt-2">Travel Agency Services</div>
                    <SelectItem value="travel-agency-operations">Travel Agency Operations</SelectItem>
                    <SelectItem value="client-trip-planning">Client Trip Planning & Booking</SelectItem>
                    <SelectItem value="destination-management">Destination Management Services</SelectItem>
                    <SelectItem value="group-travel-coordination">Group Travel Coordination</SelectItem>
                    <SelectItem value="luxury-travel-services">Luxury Travel Services</SelectItem>
                    <SelectItem value="corporate-client-services">Corporate Client Services</SelectItem>
                    <SelectItem value="event-travel-planning">Event & Conference Travel</SelectItem>
                    <SelectItem value="leisure-travel-booking">Leisure Travel Booking</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.useCase && (
                  <p className="text-sm text-destructive">{form.formState.errors.useCase.message}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4 px-6">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
          
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto font-medium"
              onClick={onToggleForm}
            >
              Sign In
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}