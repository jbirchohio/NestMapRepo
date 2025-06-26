import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
          <AlertCircle className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          404 - Page Not Found
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link to="/">
            <Button>
              Go back home
            </Button>
          </Link>
        </div>
        <div className="text-sm">
          <p className="text-gray-500">
            Need help?{' '}
            <Link to="/help" className="text-blue-600 hover:text-blue-500">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
