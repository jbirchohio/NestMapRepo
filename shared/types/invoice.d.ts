export interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    metadata?: Record<string, any>;
}
export interface Invoice {
    id: string;
    number: string;
    proposalId: string | null;
    organization_id: string;
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
//# sourceMappingURL=invoice.d.ts.map