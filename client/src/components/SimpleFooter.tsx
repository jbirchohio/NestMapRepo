import React from 'react';
import { Link } from 'wouter';

export default function SimpleFooter() {
  return (
    <footer className="bg-gradient-to-r from-purple-50 to-pink-50 border-t border-purple-100">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Remvana</span>
            <span className="ml-2 text-sm text-gray-600">© 2024. Travel made simple.</span>
          </div>
          
          <div className="flex space-x-6">
            <Link href="/help">
              <a className="text-sm text-gray-600 hover:text-purple-600 transition-colors">Help</a>
            </Link>
            <a href="mailto:support@remvana.app" className="text-sm text-gray-600 hover:text-purple-600 transition-colors">
              Contact
            </a>
            <a href="#" className="text-sm text-gray-600 hover:text-purple-600 transition-colors">
              Privacy
            </a>
            <a href="#" className="text-sm text-gray-600 hover:text-purple-600 transition-colors">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}