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
  organizationId: string;
  createdById: string | null;
  clientName: string;
  clientEmail: string;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  amountDue: number;
  amount: number;
  currency: string;
  description: string | null;
  items: InvoiceItem[];
  dueDate: Date | null;
  paidAt: Date | null;
  viewedAt: Date | null;
  sentAt: Date | null;
  cancelledAt: Date | null;
  refundedAt: Date | null;
  stripeInvoiceId: string | null;
  stripeCustomerId: string | null;
  paymentIntentId: string | null;
  paymentUrl: string | null;
  notes: string | null;
  metadata: {
    stripeEvent?: string;
    stripeEventId?: string;
    lastPaymentError?: string;
    [key: string]: any;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}
