import React from 'react';
import { MainNavigationConsumer } from '@/components/MainNavigationConsumer';
import { FooterConsumer } from '@/components/FooterConsumer';
import { Shield, Lock, Eye, UserCheck, Globe, Database, Mail, AlertCircle } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <MainNavigationConsumer />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Shield className="h-16 w-16 text-purple-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600">Last updated: January 2025</p>
        </div>

        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <p className="text-gray-700 leading-relaxed">
              At Remvana, we take your privacy seriously. This policy explains what information we collect, 
              how we use it, and your rights regarding your personal data.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="h-6 w-6 text-purple-600" />
              Information We Collect
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Account Information</h3>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>Email address and username</li>
                  <li>Display name (optional)</li>
                  <li>Profile picture (optional)</li>
                  <li>Password (encrypted)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Trip Data</h3>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>Trip destinations and dates</li>
                  <li>Activities and bookings</li>
                  <li>Notes and to-do lists</li>
                  <li>Shared trip collaborators</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Usage Information</h3>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>Pages you visit</li>
                  <li>Features you use</li>
                  <li>Time spent on the platform</li>
                  <li>Device and browser information</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Payment Information</h3>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>Processed securely through Stripe</li>
                  <li>We never store credit card numbers</li>
                  <li>Transaction history for purchases</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="h-6 w-6 text-purple-600" />
              How We Use Your Information
            </h2>
            
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>To provide and improve our trip planning services</li>
              <li>To enable trip sharing and collaboration features</li>
              <li>To process template marketplace transactions</li>
              <li>To send important account and service updates</li>
              <li>To personalize your experience with relevant destinations</li>
              <li>To prevent fraud and ensure platform security</li>
              <li>To respond to your support requests</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="h-6 w-6 text-purple-600" />
              When We Share Your Information
            </h2>
            
            <div className="space-y-4 text-gray-700">
              <p>We only share your information in these situations:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>With your consent:</strong> When you share trips or collaborate with others</li>
                <li><strong>Service providers:</strong> Companies that help us operate (like Stripe for payments)</li>
                <li><strong>Legal requirements:</strong> If required by law or to protect rights and safety</li>
                <li><strong>Business transfers:</strong> In the event of a merger or acquisition</li>
              </ul>
              <p className="mt-4">
                <strong>We never sell your personal information to third parties.</strong>
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-purple-600" />
              Your Rights & Choices
            </h2>
            
            <div className="space-y-4 text-gray-700">
              <p>You have control over your information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Update:</strong> Correct inaccurate information</li>
                <li><strong>Delete:</strong> Request deletion of your account and data</li>
                <li><strong>Export:</strong> Download your trips and data</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing emails</li>
                <li><strong>Privacy settings:</strong> Control who can see your trips</li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="h-6 w-6 text-purple-600" />
              Data Security
            </h2>
            
            <div className="space-y-4 text-gray-700">
              <p>We protect your information with:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Industry-standard encryption (SSL/TLS)</li>
                <li>Secure password hashing</li>
                <li>Regular security audits</li>
                <li>Limited employee access</li>
                <li>Secure cloud infrastructure</li>
              </ul>
            </div>
          </section>

          {/* Cookies */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies & Tracking</h2>
            
            <div className="space-y-4 text-gray-700">
              <p>We use cookies to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Keep you logged in</li>
                <li>Remember your preferences</li>
                <li>Understand how you use Remvana</li>
                <li>Improve our services</li>
              </ul>
              <p className="mt-4">
                You can control cookies through your browser settings, but some features may not work properly without them.
              </p>
            </div>
          </section>

          {/* Children's Privacy */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
            <p className="text-gray-700">
              Remvana is not intended for children under 13. We don't knowingly collect information 
              from children under 13. If you believe we have, please contact us immediately.
            </p>
          </section>

          {/* International Data */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">International Data Transfers</h2>
            <p className="text-gray-700">
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place to protect your data in accordance with this policy.
            </p>
          </section>

          {/* Changes to Policy */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-purple-600" />
              Changes to This Policy
            </h2>
            <p className="text-gray-700">
              We may update this policy from time to time. We'll notify you of significant changes 
              via email or a prominent notice on our platform. Continued use after changes means 
              you accept the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="h-6 w-6 text-purple-600" />
              Contact Us
            </h2>
            <div className="bg-purple-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-4">
                Questions about our privacy practices? We're here to help:
              </p>
              <div className="space-y-2 text-gray-700">
                <p><strong>Email:</strong> privacy@remvana.com</p>
                <p><strong>Support:</strong> support@remvana.com</p>
                <p><strong>Address:</strong> Remvana, Inc.<br />
                123 Travel Lane<br />
                San Francisco, CA 94102</p>
              </div>
            </div>
          </section>

          {/* Effective Date */}
          <section className="text-center pt-8 border-t">
            <p className="text-sm text-gray-600">
              This privacy policy is effective as of January 1, 2025
            </p>
          </section>
        </div>
      </main>

      <FooterConsumer />
    </div>
  );
}