import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const InvoiceFailure: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const error = params.get('error');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <XCircle className="text-red-500 w-16 h-16 mb-4" />
      <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
      <p className="mb-4 text-gray-700">
        We were unable to process your payment{error ? `: ${error}` : ''}. Please try again or contact support if the issue persists.
      </p>
      <Link to="/dashboard" className="btn btn-primary">
        Return to Dashboard
      </Link>
    </div>
  );
};

export default InvoiceFailure;
