import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { ClientInfo, clientInfoSchema } from '../types/booking';
export const useBookingForm = () => {
    const { toast } = useToast();
    const [formData, setFormData] = useState<Partial<ClientInfo>>({
        tripType: 'round-trip',
        passengers: 1,
        cabin: 'economy',
        primaryTraveler: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            dateOfBirth: '',
        },
        additionalTravelers: [],
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const validateForm = useCallback((): boolean => {
        try {
            clientInfoSchema.parse(formData);
            setErrors({});
            return true;
        }
        catch (error: unknown) {
            const newErrors: Record<string, string> = {};
            // Type guard for Zod validation error
            const zodError = error as {
                issues: Array<{
                    path: string[];
                    message: string;
                }>;
            };
            if (zodError.issues) {
                zodError.issues.forEach((issue) => {
                    const path = issue.path.join('.');
                    newErrors[path] = issue.message;
                });
            }
            setErrors(newErrors);
            // Scroll to the first error
            const firstError = document.querySelector('[data-error]');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return false;
        }
    }, [formData]);
    const handleChange = useCallback((field: string, value: string | number | boolean | Date) => {
        setFormData(prev => {
            // Handle nested fields (e.g., primaryTraveler.firstName)
            if (field.includes('.')) {
                const [parent, child] = field.split('.');
                return {
                    ...prev,
                    [parent]: {
                        ...(prev[parent as keyof typeof prev] as object || {}),
                        [child]: value
                    }
                };
            }
            // Handle array fields (e.g., additionalTravelers[0].firstName)
            if (field.includes('[') && field.includes(']')) {
                const [parent, indexStr, child] = field.split(/\[|\]|\./).filter(Boolean);
                const index = parseInt(indexStr, 10);
                const array = [...(prev[parent as keyof typeof prev] as any[])];
                array[index] = { ...array[index], [child]: value };
                return { ...prev, [parent]: array };
            }
            // Handle regular fields
            return { ...prev, [field]: value };
        });
        // Clear error when field is updated
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    }, [errors]);
    const handleSubmit = useCallback(async (onSuccess: (data: ClientInfo) => void) => {
        setIsSubmitting(true);
        try {
            if (!validateForm()) {
                return false;
            }
            // Type assertion is safe here because validateForm() passed
            const validatedData = formData as ClientInfo;
            onSuccess(validatedData);
            return true;
        }
        catch (error) {
            console.error('Form submission error:', error);
            toast({
                title: 'Error',
                description: 'Failed to process the form. Please try again.',
                variant: 'destructive',
            });
            return false;
        }
        finally {
            setIsSubmitting(false);
        }
    }, [formData, toast, validateForm]);
    const addTraveler = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            additionalTravelers: [
                ...(prev.additionalTravelers || []),
                { firstName: '', lastName: '', dateOfBirth: '' }
            ]
        }));
    }, []);
    const removeTraveler = useCallback((index: number) => {
        setFormData(prev => ({
            ...prev,
            additionalTravelers: (prev.additionalTravelers || []).filter((_, i) => i !== index)
        }));
    }, []);
    return {
        formData,
        errors,
        isSubmitting,
        handleChange,
        handleSubmit,
        addTraveler,
        removeTraveler,
        setFormData,
    };
};
