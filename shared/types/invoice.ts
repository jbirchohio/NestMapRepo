// Shared invoice types for both client and server
export interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number; // In cents
    amount: number; // In cents
    metadata?: Record<string, any>;
}
export interface Invoice {
    id: string;
    number: string;
    proposalId: string | null;
    organization_id: string; // Using snake_case for backend consistency
    createdById: string | null;
    clientName: string;
    clientEmail: string;
    status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
    amountDue: number;
    amount: number;
    currency: string;
    dueDate: string | null;
    issueDate: string;
    items: InvoiceItem[];
    notes?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}
