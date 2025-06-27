import SharedProposalType from '@/types/SharedProposalType';
import SharedPType from '@/types/SharedPType';
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Plus, Download, Send, DollarSign, Calendar, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Type definitions
interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  total: number;
}



interface Proposal {
  id: number;
  clientName: string;
  clientEmail: string;
  status: string;
  updatedAt: string;
  proposalData?: {
    estimatedCost?: number;
  };
}

interface Invoice {
  id: number;
  proposalId?: number;
  clientName: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    rate: number;
    total: number;
  }>;
  taxRate?: number;
  notes?: string;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
const invoiceSchema = z.object({
    proposalId: z.number().optional(),
    clientName: z.string().min(1, "Client name is required"),
    clientEmail: z.string().email("Valid email required"),
    dueDate: z.string().min(1, "Due date is required"),
    lineItems: z.array(z.object({
        id: z.string().optional(),
        description: z.string().min(1, "Description is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        rate: z.number().min(0, "Rate must be positive"),
        total: z.number()
    })).min(1, "At least one line item is required"),
    taxRate: z.number().min(0).max(100).optional(),
    notes: z.string().optional()
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

function InvoiceCenter() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
    const { toast } = useToast();
    
    // Fetch invoices with proper typing
    const { data: invoicesResponse, isLoading } = useQuery<ApiResponse<Invoice[]>>({
        queryKey: ["/api/invoices"],
    });
    
    // Extract invoices data or default to empty array
    const invoices = invoicesResponse?.data || [];
    
    // Fetch proposals with proper typing
    const { data: proposalsResponse } = useQuery<ApiResponse<Proposal[]>>({
        queryKey: ["/api/proposals"],
    });
    
    // Extract proposals data or default to empty array
    const proposals = proposalsResponse?.data || [];
    const createInvoice = useMutation({
        mutationFn: (data: InvoiceFormData) => apiRequest("POST", "/api/invoices", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
            setIsCreateDialogOpen(false);
            setSelectedProposal(null);
            toast({
                title: "Invoice Created",
                description: "Your invoice has been generated successfully.",
            });
        },
    });
    const sendInvoice = useMutation({
        mutationFn: (id: number) => apiRequest("POST", `/api/invoices/${id}/send`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
            toast({
                title: "Invoice Sent",
                description: "The invoice has been sent to the client.",
            });
        },
    });
    const markPaid = useMutation({
        mutationFn: (id: number) => apiRequest("POST", `/api/invoices/${id}/mark-paid`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
            toast({
                title: "Payment Recorded",
                description: "The invoice has been marked as paid.",
            });
        },
    });
    const form = useForm<InvoiceFormData>({
        resolver: zodResolver(invoiceSchema),
        defaultValues: {
            lineItems: [{ description: "", quantity: 1, rate: 0, total: 0 }],
            taxRate: 0
        }
    });
    const [searchParams] = useSearchParams();
    useEffect(() => {
        const proposalId = searchParams.get('proposalId');
        if (proposalId && proposals) {
            const proposal = proposals.find((p: SharedPType) => String(p.id) === proposalId);
            if (proposal) {
                convertProposalToInvoice(proposal);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, proposals]);
    const convertProposalToInvoice = (proposal: SharedProposalType) => {
        setSelectedProposal(proposal);
        // Pre-populate form with proposal data
        const lineItems = [
            {
                description: `Travel arrangements for ${proposal.clientName}`,
                quantity: 1,
                rate: proposal.proposalData?.estimatedCost || 0,
                total: proposal.proposalData?.estimatedCost || 0
            }
        ];
        form.reset({
            proposalId: proposal.id,
            clientName: proposal.clientName,
            clientEmail: proposal.clientEmail,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
            lineItems,
            taxRate: 0
        });
        setIsCreateDialogOpen(true);
    };
    const onSubmit = (data: InvoiceFormData) => {
        createInvoice.mutate(data);
    };
    if (isLoading) {
        return (<div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 gap-6">
            {[...Array(6)].map((_, i) => (<div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>))}
          </div>
        </div>
      </div>);
    }
    const stats = {
        totalInvoices: invoices.length,
        totalRevenue: invoices.reduce((sum, inv) => sum + (inv.amount / 100), 0),
        paidInvoices: invoices.filter(inv => inv.status === 'paid').length,
        pendingInvoices: invoices.filter(inv => inv.status === 'sent').length
    };
    return (<div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invoice Center</h1>
          <p className="text-gray-600 dark:text-gray-300">Convert proposals to invoices and track payments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2"/>
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>
                {selectedProposal
            ? `Converting proposal for ${selectedProposal.clientName} to invoice`
            : "Create a new invoice from scratch"}
              </DialogDescription>
            </DialogHeader>
            <InvoiceForm form={form} onSubmit={onSubmit} isLoading={createInvoice.isPending} proposals={proposals}/>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paidInvoices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingInvoices}</div>
          </CardContent>
        </Card>
      </div>

      {/* Convertible Proposals */}
      {proposals.some(p => p.status === 'signed' && !invoices.some(inv => inv.proposalId === p.id)) && (<Card>
          <CardHeader>
            <CardTitle>Ready to Convert</CardTitle>
            <CardDescription>Signed proposals that can be converted to invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {proposals
                .filter(p => p.status === 'signed' && !invoices.some(inv => inv.proposalId === p.id))
                .map(proposal => (<div key={proposal.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{proposal.clientName}</h4>
                      <p className="text-sm text-gray-500">
                        Signed {new Date(proposal.updatedAt).toLocaleDateString()} • 
                        ${proposal.proposalData?.estimatedCost?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                    <Button onClick={() => convertProposalToInvoice(proposal)} className="bg-green-600 hover:bg-green-700">
                      Convert to Invoice
                    </Button>
                  </div>))}
            </div>
          </CardContent>
        </Card>)}

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>Manage your invoices and track payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices.map(invoice => (<div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{invoice.clientName}</h4>
                    <Badge variant={invoice.status === 'paid' ? 'default' :
                invoice.status === 'sent' ? 'secondary' :
                    invoice.status === 'overdue' ? 'destructive' : 'outline'}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span>#{invoice.invoiceNumber}</span>
                    <span>${(invoice.amount / 100).toLocaleString()}</span>
                    <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1"/>
                    PDF
                  </Button>
                  {invoice.status === 'draft' && (<Button variant="outline" size="sm" onClick={() => sendInvoice.mutate(invoice.id)} disabled={sendInvoice.isPending}>
                      <Send className="w-4 h-4 mr-1"/>
                      Send
                    </Button>)}
                  {invoice.status === 'sent' && (<Button variant="outline" size="sm" onClick={() => markPaid.mutate(invoice.id)} disabled={markPaid.isPending}>
                      <CheckCircle className="w-4 h-4 mr-1"/>
                      Mark Paid
                    </Button>)}
                </div>
              </div>))}
            
            {invoices.length === 0 && (<div className="text-center py-8 text-gray-500">
                No invoices yet. Convert a signed proposal to get started.
              </div>)}
          </div>
        </CardContent>
      </Card>
    </div>);
}
import { UseFormReturn } from 'react-hook-form';

interface InvoiceFormProps {
    form: UseFormReturn<InvoiceFormData>;
    onSubmit: (data: InvoiceFormData) => void;
    isLoading: boolean;
    proposals: Proposal[];
}



const InvoiceForm: React.FC<InvoiceFormProps> = (props) => {
    const { form, onSubmit, isLoading, proposals } = props;
    const { register, control, watch, setValue, getValues } = form;
    const lineItems = watch("lineItems") || [];
    
    // Ensure we always have at least one line item
    useEffect(() => {
        if (!lineItems || lineItems.length === 0) {
            setValue("lineItems", [{ description: "", quantity: 1, rate: 0, total: 0 }]);
        }
    }, [lineItems, setValue]);
    
    const addLineItem = () => {
        const currentItems = getValues("lineItems") || [];
        const newItem: LineItem = { 
            id: Date.now().toString(),
            description: "", 
            quantity: 1, 
            rate: 0, 
            total: 0 
        };
        setValue("lineItems", [...currentItems, newItem]);
    };
    
    const removeLineItem = (index: number) => {
        const currentItems = [...(getValues("lineItems") || [])];
        if (currentItems.length > 1) {
            currentItems.splice(index, 1);
            setValue("lineItems", currentItems, { shouldValidate: true });
        }
    };
    
    const updateLineItemTotal = (index: number, field: keyof LineItem, value: string | number) => {
        const currentItems = [...(getValues("lineItems") || [])];
        if (currentItems[index]) {
            const updatedItem: LineItem = {
                ...currentItems[index],
                [field]: value,
                quantity: field === 'quantity' ? Number(value) : currentItems[index].quantity,
                rate: field === 'rate' ? Number(value) : currentItems[index].rate,
                total: (field === 'quantity' ? Number(value) : currentItems[index].quantity) * 
                       (field === 'rate' ? Number(value) : currentItems[index].rate)
            };
            currentItems[index] = updatedItem;
            setValue("lineItems", currentItems, { shouldValidate: true });
        }
    };
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Form fields will go here */}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Saving..." : "Save Invoice"}
                    </Button>
                </div>
            </form>
        </Form>
    );
};

// Helper function to update line item total
const updateLineItemTotal = (
  items: LineItem[], 
  index: number, 
  field: keyof LineItem, 
  value: string | number
): LineItem[] => {
  const updatedItems = [...items];
  if (updatedItems[index]) {
    const updatedItem = {
      ...updatedItems[index],
      [field]: value,
      quantity: field === 'quantity' ? Number(value) : updatedItems[index].quantity,
      rate: field === 'rate' ? Number(value) : updatedItems[index].rate,
    };
    
    updatedItem.total = updatedItem.quantity * updatedItem.rate;
    updatedItems[index] = updatedItem;
  }
  return updatedItems;
};

export { InvoiceCenter as default };
