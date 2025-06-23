import { User, Mail, Phone, Calendar, MapPin, Info, Briefcase, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
const travelerInfoSchema = z.object({
    // Primary Traveler
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().min(10, "Phone number is required"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    // Travel Details
    tripPurpose: z.enum(["business", "leisure", "family", "medical", "other"], {
        required_error: "Please select a trip purpose",
    }),
    companyName: z.string().optional(),
    costCenter: z.string().optional(),
    specialRequests: z.string().optional(),
    // Emergency Contact
    emergencyContactName: z.string().min(1, "Emergency contact name is required"),
    emergencyContactPhone: z.string().min(10, "Emergency contact phone is required"),
    emergencyContactRelationship: z.string().min(1, "Relationship is required"),
});
type TravelerInfoFormValues = z.infer<typeof travelerInfoSchema>;
interface TravelerInfoFormProps {
    onSubmit: (data: TravelerInfoFormValues) => void;
    isSubmitting?: boolean;
    initialValues?: Partial<TravelerInfoFormValues>;
}
export function TravelerInfoForm({ onSubmit, isSubmitting = false, initialValues = {}, }: TravelerInfoFormProps) {
    const { register, handleSubmit, formState: { errors }, setValue, watch, } = useForm<TravelerInfoFormValues>({
        resolver: zodResolver(travelerInfoSchema),
        defaultValues: {
            tripPurpose: "leisure",
            ...initialValues,
        },
    });
    const tripPurpose = watch("tripPurpose");
    return (<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-6">
        {/* Primary Traveler Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <User className="h-5 w-5"/>
            <h3>Primary Traveler Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <div className="relative">
                <Input id="firstName" {...register("firstName")} placeholder="John" className={errors.firstName ? "border-red-500" : ""}/>
                {errors.firstName && (<div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <AlertCircle className="h-5 w-5 text-red-500"/>
                  </div>)}
              </div>
              {errors.firstName && (<p className="text-sm text-red-500">{errors.firstName.message}</p>)}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <div className="relative">
                <Input id="lastName" {...register("lastName")} placeholder="Doe" className={errors.lastName ? "border-red-500" : ""}/>
                {errors.lastName && (<div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <AlertCircle className="h-5 w-5 text-red-500"/>
                  </div>)}
              </div>
              {errors.lastName && (<p className="text-sm text-red-500">{errors.lastName.message}</p>)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-500"/>
                </div>
                <Input id="email" type="email" {...register("email")} placeholder="john.doe@example.com" className={`pl-10 ${errors.email ? "border-red-500" : ""}`}/>
                {errors.email && (<div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <AlertCircle className="h-5 w-5 text-red-500"/>
                  </div>)}
              </div>
              {errors.email && (<p className="text-sm text-red-500">{errors.email.message}</p>)}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-500"/>
                </div>
                <Input id="phone" type="tel" {...register("phone")} placeholder="(123) 456-7890" className={`pl-10 ${errors.phone ? "border-red-500" : ""}`}/>
                {errors.phone && (<div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <AlertCircle className="h-5 w-5 text-red-500"/>
                  </div>)}
              </div>
              {errors.phone && (<p className="text-sm text-red-500">{errors.phone.message}</p>)}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth *</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-500"/>
              </div>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} className={`pl-10 ${errors.dateOfBirth ? "border-red-500" : ""}`} max={new Date().toISOString().split('T')[0]}/>
              {errors.dateOfBirth && (<div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <AlertCircle className="h-5 w-5 text-red-500"/>
                </div>)}
            </div>
            {errors.dateOfBirth && (<p className="text-sm text-red-500">{errors.dateOfBirth.message}</p>)}
          </div>
        </div>

        {/* Trip Details Section */}
        <div className="space-y-4 pt-6">
          <div className="flex items-center gap-2 text-lg font-medium">
            <MapPin className="h-5 w-5"/>
            <h3>Trip Details</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tripPurpose">Purpose of Trip *</Label>
            <Select onValueChange={(value) => setValue("tripPurpose", value as any)} value={tripPurpose}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select trip purpose"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="leisure">Leisure</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.tripPurpose && (<p className="text-sm text-red-500">{errors.tripPurpose.message}</p>)}
          </div>

          {tripPurpose === "business" && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" {...register("companyName")} placeholder="Company name"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="costCenter">Cost Center (if applicable)</Label>
                <Input id="costCenter" {...register("costCenter")} placeholder="Cost center"/>
              </div>
            </div>)}

          <div className="space-y-2">
            <Label htmlFor="specialRequests">Special Requests</Label>
            <Textarea id="specialRequests" {...register("specialRequests")} placeholder="Any special requests or requirements?" rows={3}/>
            <p className="text-sm text-muted-foreground">
              We'll do our best to accommodate your requests.
            </p>
          </div>
        </div>

        {/* Emergency Contact Section */}
        <div className="space-y-4 pt-6">
          <div className="flex items-center gap-2 text-lg font-medium">
            <AlertCircle className="h-5 w-5"/>
            <h3>Emergency Contact</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">Name *</Label>
              <Input id="emergencyContactName" {...register("emergencyContactName")} placeholder="Emergency contact name" className={errors.emergencyContactName ? "border-red-500" : ""}/>
              {errors.emergencyContactName && (<p className="text-sm text-red-500">
                  {errors.emergencyContactName.message}
                </p>)}
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContactRelationship">Relationship *</Label>
              <Input id="emergencyContactRelationship" {...register("emergencyContactRelationship")} placeholder="Relationship (e.g., Spouse, Parent)" className={errors.emergencyContactRelationship ? "border-red-500" : ""}/>
              {errors.emergencyContactRelationship && (<p className="text-sm text-red-500">
                  {errors.emergencyContactRelationship.message}
                </p>)}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyContactPhone">Phone Number *</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-4 w-4 text-gray-500"/>
              </div>
              <Input id="emergencyContactPhone" type="tel" {...register("emergencyContactPhone")} placeholder="(123) 456-7890" className={`pl-10 ${errors.emergencyContactPhone ? "border-red-500" : ""}`}/>
              {errors.emergencyContactPhone && (<div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <AlertCircle className="h-5 w-5 text-red-500"/>
                </div>)}
            </div>
            {errors.emergencyContactPhone && (<p className="text-sm text-red-500">
                {errors.emergencyContactPhone.message}
              </p>)}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Traveler Information"}
        </Button>
      </div>
    </form>);
}
