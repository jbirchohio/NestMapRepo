import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

const InvoiceSuccess: React.FC = () => {
  const location = useLocation();
  // Optionally, you can extract invoice/payment info from the query params
  // const params = new URLSearchParams(location.search);
  // const invoiceId = params.get('invoice');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <CheckCircle2 className="text-green-500 w-16 h-16 mb-4" />
      <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
      <p className="mb-4 text-gray-700">
        Thank you for your payment. Your invoice has been marked as paid. You will receive a confirmation email shortly.
      </p>
      <Link to="/dashboard" className="btn btn-primary">
        Return to Dashboard
      </Link>
    </div>
  );
};

export default InvoiceSuccess;
