export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number; // In cents
  amount: number; // In cents
  metadata?: Record<string, unknown>;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  number: string;
  proposalId: string | null;
  organizationId: string;
  clientName: string;
  clientEmail: string;
  status: InvoiceStatus;
  amountDue: number; // In cents
  amount: number; // In cents
  currency: string;
  description: string;
  items: InvoiceItem[];
  metadata?: Record<string, unknown>;
  notes?: string;
  createdById?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  viewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown; // Allow additional properties for flexibility
}
