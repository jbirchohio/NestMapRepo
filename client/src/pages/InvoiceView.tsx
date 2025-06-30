import SharedItemType from '@shared/schema/types/SharedItemType';
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, DollarSign, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useEffect } from "react";
interface PaymentDetails {
    id: string;
    amount: number;
    currency: string;
    status: string;
    payment_method: string;
    created: number;
    receipt_url?: string;
}
export default function InvoiceView() {
    const { id: invoiceId } = useParams<{
        id: string;
    }>();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    // Check for payment success/failure in URL params
    const paymentStatus = searchParams.get('payment_status');
    const sessionId = searchParams.get('session_id');
    // Fetch invoice data
    const { data: invoice, isLoading, error, refetch } = useQuery({
        queryKey: ["/api/invoices", invoiceId],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/invoices/${invoiceId}`);
            if (!res.ok)
                throw new Error("Invoice not found");
            return res.json();
        },
        enabled: !!invoiceId
    });
    // Fetch payment details if we have a session ID
    const { data: paymentDetails } = useQuery({
        queryKey: ["/api/payments", sessionId],
        queryFn: async () => {
            if (!sessionId)
                return null;
            const res = await apiRequest("GET", `/api/payments/session/${sessionId}`);
            if (!res.ok)
                throw new Error("Payment details not found");
            return res.json() as Promise<PaymentDetails>;
        },
        enabled: !!sessionId,
        retry: 3,
        retryDelay: 1000
    });
    // Show payment status toast on mount if coming from payment
    useEffect(() => {
        if (paymentStatus === 'success') {
            toast({
                title: "Payment Successful!",
                description: "Thank you for your payment. Your invoice has been marked as paid.",
                variant: "default"
            });
            // Refresh invoice data to show updated status
            refetch();
        }
        else if (paymentStatus === 'canceled') {
            toast({
                title: "Payment Canceled",
                description: "Your payment was not completed. You can try again if you wish.",
                variant: "destructive"
            });
        }
    }, [paymentStatus, refetch, toast]);
    const payInvoice = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", `/api/invoices/${invoiceId}/pay`);
            if (!res.ok)
                throw new Error("Failed to initiate payment");
            return res.json() as Promise<{
                url: string;
            }>;
        },
        onSuccess: (data: {
            url: string;
        }) => {
            window.location.href = data.url;
        },
        onError: (err: Error) => {
            toast({
                title: "Payment Error",
                description: err.message || "Failed to initiate payment.",
                variant: "destructive"
            });
        }
    });
    if (isLoading) {
        return (<div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600"/>
        <span className="ml-2">Loading invoice...</span>
      </div>);
    }
    if (error || !invoice) {
        return (<div className="p-6 max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="text-red-600">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5"/>
              <CardTitle>Invoice Not Found</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">The requested invoice could not be found. It may have been deleted or you may not have permission to view it.</p>
            <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>);
    }
    const formatCurrency = (amount: number, currency: string = 'usd'): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase() || 'USD',
            minimumFractionDigits: 2,
        }).format(amount / 100);
    };
    return (<div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoice #{invoice.invoiceNumber || invoice.id}</h1>
          <p className="text-sm text-muted-foreground">
            Issued on {format(new Date(invoice.createdAt || new Date()), 'MMMM d, yyyy')}
          </p>
        </div>
        <Badge variant={invoice.status === 'paid' ? 'default' :
            invoice.status === 'sent' ? 'secondary' :
                invoice.status === 'overdue' ? 'destructive' : 'outline'} className="text-sm px-3 py-1 h-8">
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Client & Payment Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Bill To</h3>
                  <p className="mt-1">
                    {invoice.clientName}<br />
                    {invoice.clientEmail}
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-medium text-muted-foreground">Amount Due</h3>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatCurrency(invoice.amountDue, invoice.currency)}
                  </p>
                  {invoice.dueDate && (<p className="text-sm text-muted-foreground mt-1">
                      Due {format(new Date(invoice.dueDate), 'MMMM d, yyyy')}
                    </p>)}
                </div>
              </div>

              {paymentDetails && (<div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Payment Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Payment Method</p>
                      <p className="capitalize">
                        {paymentDetails.payment_method?.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Transaction ID</p>
                      <p className="font-mono text-sm">{paymentDetails.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payment Date</p>
                      <p>{format(new Date(paymentDetails.created * 1000), 'PPpp')}</p>
                    </div>
                    {paymentDetails.receipt_url && (<div>
                        <p className="text-muted-foreground">Receipt</p>
                        <a href={paymentDetails.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                          View Receipt
                        </a>
                      </div>)}
                  </div>
                </div>)}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-sm font-medium text-muted-foreground">
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems?.map((item: SharedItemType, index: number) => (<tr key={index} className="border-t">
                        <td className="p-3">
                          <p className="font-medium">{item.description}</p>
                          {item.quantity > 1 && (<p className="text-sm text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.rate, invoice.currency)}
                            </p>)}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatCurrency(item.total || item.rate * item.quantity, invoice.currency)}
                        </td>
                      </tr>))}
                    {invoice.taxRate > 0 && (<tr className="border-t">
                        <td className="p-3 text-right" colSpan={1}>
                          <p className="text-muted-foreground">Tax ({invoice.taxRate}%)</p>
                        </td>
                        <td className="p-3 text-right">
                          {formatCurrency(invoice.amountDue * (invoice.taxRate / 100), invoice.currency)}
                        </td>
                      </tr>)}
                    <tr className="bg-muted/50 font-semibold">
                      <td className="p-3 text-right" colSpan={1}>Total</td>
                      <td className="p-3 text-right">
                        {formatCurrency(invoice.amountDue, invoice.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2"/>
                Download PDF
              </Button>
              
              {invoice.status === 'sent' && (<Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg" onClick={() => payInvoice.mutate()} disabled={payInvoice.isPending}>
                  {payInvoice.isPending ? (<>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                      Processing...
                    </>) : (<>
                      <DollarSign className="w-4 h-4 mr-2"/>
                      Pay Invoice
                    </>)}
                </Button>)}

              {invoice.status === 'paid' && (<div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5"/>
                    <span className="font-medium">Payment Received</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Paid on {invoice.paidAt ? format(new Date(invoice.paidAt), 'PPpp') : 'Unknown date'}
                  </p>
                  {paymentDetails?.receipt_url && (<a href={paymentDetails.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-sm text-blue-600 hover:underline">
                      View Receipt
                    </a>)}
                </div>)}

              {invoice.status === 'overdue' && (<div className="p-4 rounded-lg bg-red-50 border border-red-100">
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="w-5 h-5"/>
                    <span className="font-medium">Payment Overdue</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    Please complete payment as soon as possible
                  </p>
                  <Button variant="destructive" className="w-full mt-2" onClick={() => payInvoice.mutate()} disabled={payInvoice.isPending}>
                    {payInvoice.isPending ? 'Processing...' : 'Pay Now'}
                  </Button>
                </div>)}

              {invoice.notes && (<div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Notes</h3>
                  <p className="text-sm">{invoice.notes}</p>
                </div>)}
            </CardContent>
          </Card>

          {/* Payment Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={invoice.status === 'paid' ? 'default' :
            invoice.status === 'sent' ? 'secondary' :
                'destructive'}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Issued</span>
                  <span className="text-sm">
                    {format(new Date(invoice.createdAt || new Date()), 'MMM d, yyyy')}
                  </span>
                </div>
                {invoice.dueDate && (<div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Due Date</span>
                    <span className="text-sm">
                      {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                    </span>
                  </div>)}
                {invoice.paidAt && (<div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Paid On</span>
                    <span className="text-sm">
                      {format(new Date(invoice.paidAt), 'MMM d, yyyy')}
                    </span>
                  </div>)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>);
}
