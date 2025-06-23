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
export interface PaymentReceiptEmailOptions {
    customerName: string;
    invoiceNumber: string;
    amountPaid: string;
    currency: string;
    paymentDate: string;
    paymentMethod: string;
    transactionId: string;
    invoiceLink?: string;
    notes?: string;
    companyName: string;
    companyLogo?: string;
}
export interface EmailService {
    sendEmail(options: EmailOptions): Promise<void>;
    sendPasswordResetEmail(email: string, options: PasswordResetEmailOptions): Promise<void>;
    sendPasswordResetConfirmationEmail(email: string, options: PasswordResetConfirmationOptions): Promise<void>;
    sendPaymentReceiptEmail(email: string, options: PaymentReceiptEmailOptions): Promise<void>;
}
