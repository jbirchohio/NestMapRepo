export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context?: Record<string, any>;
}

export interface PasswordResetEmailOptions {
  name: string;
  resetUrl: string;
  expiryHours: number;
}

export interface PasswordResetConfirmationOptions {
  name: string;
}

export interface EmailService {
  sendEmail(options: EmailOptions): Promise<void>;
  sendPasswordResetEmail(
    email: string, 
    options: PasswordResetEmailOptions
  ): Promise<void>;
  sendPasswordResetConfirmationEmail(
    email: string, 
    options: PasswordResetConfirmationOptions
  ): Promise<void>;
}
