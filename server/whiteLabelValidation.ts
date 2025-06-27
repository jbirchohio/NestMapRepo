import { z } from 'zod';
/**
 * WhiteLabel organization settings validation schema
 * Ensures consistency between frontend requirements and backend validation
 */
export const whiteLabelSettingsSchema = z.object({
    name: z.string().min(1, "Organization name is required").max(100, "Name must be less than 100 characters").optional(),
    // Color validation - must be valid hex codes
    primaryColor: z.string()
        .regex(/^#[0-9A-Fa-f]{6}$/, "Primary color must be a valid hex code (e.g., #123ABC)")
        .optional(),
    secondaryColor: z.string()
        .regex(/^#[0-9A-Fa-f]{6}$/, "Secondary color must be a valid hex code (e.g., #123ABC)")
        .optional(),
    accentColor: z.string()
        .regex(/^#[0-9A-Fa-f]{6}$/, "Accent color must be a valid hex code (e.g., #123ABC)")
        .optional(),
    // Email validation
    supportEmail: z.string()
        .email("Support email must be a valid email address")
        .optional(),
    // URL validation for external links
    helpUrl: z.string()
        .url("Help URL must be a valid URL")
        .optional(),
    privacyUrl: z.string()
        .url("Privacy URL must be a valid URL")
        .optional(),
    termsUrl: z.string()
        .url("Terms URL must be a valid URL")
        .optional(),
    // Logo URL validation
    logoUrl: z.string()
        .url("Logo URL must be a valid URL")
        .optional(),
    // Favicon URL validation  
    faviconUrl: z.string()
        .url("Favicon URL must be a valid URL")
        .optional(),
    // Optional domain for white-label hosting
    domain: z.string()
        .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, "Domain must be a valid domain name")
        .optional(),
    // Tagline/description
    tagline: z.string()
        .max(200, "Tagline must be less than 200 characters")
        .optional(),
    // Contact information
    contactPhone: z.string()
        .regex(/^[\+]?[1-9][\d]{0,15}$/, "Contact phone must be a valid phone number")
        .optional(),
    // Address fields
    address: z.string()
        .max(500, "Address must be less than 500 characters")
        .optional(),
    // Social media links
    socialLinks: z.object({
        twitter: z.string().url("Twitter URL must be valid").optional(),
        facebook: z.string().url("Facebook URL must be valid").optional(),
        linkedin: z.string().url("LinkedIn URL must be valid").optional(),
        instagram: z.string().url("Instagram URL must be valid").optional(),
    }).optional(),
    // Custom CSS for advanced theming
    customCss: z.string()
        .max(10000, "Custom CSS must be less than 10,000 characters")
        .optional(),
    // Feature toggles
    features: z.object({
        enableBooking: z.boolean().optional(),
        enableAnalytics: z.boolean().optional(),
        enableExports: z.boolean().optional(),
        enableCollaboration: z.boolean().optional(),
    }).optional(),
});
/**
 * Type representing the validated white label settings
 * Inferred from the whiteLabelSettingsSchema
 */
export type WhiteLabelSettings = z.infer<typeof whiteLabelSettingsSchema>;
/**
 * Validation function with detailed error handling
 */
export function validateWhiteLabelSettings(data: unknown): {
    success: true;
    data: WhiteLabelSettings;
} | {
    success: false;
    errors: string[];
} {
    try {
        const validated = whiteLabelSettingsSchema.parse(data);
        return { success: true, data: validated };
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            const errors = error.errors.map(err => {
                const field = err.path.join('.');
                return `${field}: ${err.message}`;
            });
            return { success: false, errors };
        }
        return { success: false, errors: ['Invalid data format'] };
    }
}
/**
 * Partial validation for update operations
 */
export const partialWhiteLabelSettingsSchema = whiteLabelSettingsSchema.partial();
