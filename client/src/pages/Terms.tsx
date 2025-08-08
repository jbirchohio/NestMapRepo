import React from 'react';
import MainNavigationConsumer from '@/components/MainNavigationConsumer';
import FooterConsumer from '@/components/FooterConsumer';
import { ScrollText, Scale, AlertTriangle, Ban, CreditCard, Users, Globe, Mail } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <MainNavigationConsumer />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <ScrollText className="h-16 w-16 text-purple-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-600">Last updated: January 2025</p>
        </div>

        <div className="prose prose-lg max-w-none">
          {/* Agreement */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Agreement to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By using Remvana ("we," "our," or "us"), you agree to these Terms of Service. 
              If you don't agree, please don't use our services. We may update these terms, 
              and your continued use means you accept the changes.
            </p>
          </section>

          {/* Account Terms */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-6 w-6 text-purple-600" />
              Your Account
            </h2>
            
            <div className="space-y-4 text-gray-700">
              <p>When you create an account, you agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate, current information</li>
                <li>Keep your password secure and confidential</li>
                <li>Be responsible for all activity under your account</li>
                <li>Notify us immediately of unauthorized access</li>
                <li>Be at least 13 years old</li>
              </ul>
              
              <div className="bg-yellow-50 p-4 rounded-lg mt-4">
                <p className="font-semibold">One account per person - no sharing allowed!</p>
              </div>
            </div>
          </section>

          {/* Acceptable Use */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Scale className="h-6 w-6 text-purple-600" />
              Acceptable Use
            </h2>
            
            <div className="space-y-4 text-gray-700">
              <p>You may use Remvana to:</p>
              <ul className="list-disc pl-6 space-y-2 text-green-700">
                <li>Plan personal and business trips</li>
                <li>Share trips with friends and family</li>
                <li>Create and sell travel templates</li>
                <li>Purchase templates from other creators</li>
                <li>Book activities and accommodations</li>
              </ul>

              <p className="mt-6">You may NOT use Remvana to:</p>
              <ul className="list-disc pl-6 space-y-2 text-red-700">
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Share harmful, offensive, or illegal content</li>
                <li>Spam, harass, or harm other users</li>
                <li>Attempt to hack or disrupt our services</li>
                <li>Scrape data or use automated tools without permission</li>
                <li>Resell or redistribute purchased templates</li>
                <li>Create fake accounts or impersonate others</li>
              </ul>
            </div>
          </section>

          {/* Template Marketplace */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-purple-600" />
              Template Marketplace Terms
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">For Creators</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>You retain ownership of templates you create</li>
                  <li>You grant buyers a license to use (not resell) your templates</li>
                  <li>Remvana takes a 30% commission on sales</li>
                  <li>You receive 70% of each sale</li>
                  <li>Payouts are processed monthly (minimum $50)</li>
                  <li>You must have rights to all content in your templates</li>
                  <li>Templates must be original work</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">For Buyers</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Templates are for personal use only</li>
                  <li>No refunds after purchase (all sales final)</li>
                  <li>You can customize templates for your trips</li>
                  <li>Cannot resell or share purchased templates</li>
                  <li>Templates come "as is" without warranties</li>
                </ul>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Commission from Bookings:</strong> If you book activities through templates, 
                  creators may earn a small commission from our partners (at no extra cost to you).
                </p>
              </div>
            </div>
          </section>

          {/* Content & Privacy */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Content</h2>
            
            <div className="space-y-4 text-gray-700">
              <p>When you create content on Remvana:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You retain ownership of your trips and content</li>
                <li>You grant us a license to display and share content you make public</li>
                <li>You're responsible for your content's accuracy and legality</li>
                <li>We may remove content that violates these terms</li>
                <li>Shared trips can be viewed by anyone with the link</li>
              </ul>
            </div>
          </section>

          {/* Payment Terms */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Payments & Billing</h2>
            
            <div className="space-y-4 text-gray-700">
              <ul className="list-disc pl-6 space-y-2">
                <li>All payments are processed securely through Stripe</li>
                <li>Prices are in USD unless otherwise stated</li>
                <li>Template purchases are one-time payments</li>
                <li>We don't store your credit card information</li>
                <li>You're responsible for any applicable taxes</li>
                <li>Disputed charges may result in account suspension</li>
              </ul>
            </div>
          </section>

          {/* Disclaimers */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              Disclaimers & Limitations
            </h2>
            
            <div className="space-y-4 text-gray-700">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="font-semibold mb-2">Service Provided "As Is"</p>
                <p>
                  Remvana is provided without warranties of any kind. We don't guarantee that:
                </p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>The service will be uninterrupted or error-free</li>
                  <li>Templates will meet your specific needs</li>
                  <li>Activity bookings will always be available</li>
                  <li>Travel information is 100% accurate or current</li>
                </ul>
              </div>

              <div className="mt-4">
                <p className="font-semibold mb-2">Limitation of Liability</p>
                <p>
                  To the maximum extent permitted by law, Remvana won't be liable for any indirect, 
                  incidental, special, consequential, or punitive damages. Our total liability is 
                  limited to the amount you've paid us in the past 12 months.
                </p>
              </div>

              <div className="mt-4">
                <p className="font-semibold mb-2">Travel Disclaimer</p>
                <p>
                  We're a planning tool, not a travel agency. Always verify information independently. 
                  We're not responsible for issues with bookings, cancellations, or travel disruptions.
                </p>
              </div>
            </div>
          </section>

          {/* Termination */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Ban className="h-6 w-6 text-red-600" />
              Account Termination
            </h2>
            
            <div className="space-y-4 text-gray-700">
              <p>We may suspend or terminate your account if you:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate these terms</li>
                <li>Engage in fraudulent activity</li>
                <li>Harm other users or our platform</li>
                <li>Haven't logged in for 2+ years</li>
              </ul>
              
              <p className="mt-4">
                You can delete your account anytime. Upon termination:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your access ends immediately</li>
                <li>We may delete your data (except as required by law)</li>
                <li>No refunds for template purchases</li>
                <li>Outstanding creator earnings will be paid out</li>
              </ul>
            </div>
          </section>

          {/* Indemnification */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Indemnification</h2>
            <p className="text-gray-700">
              You agree to defend, indemnify, and hold Remvana harmless from any claims, 
              damages, or expenses arising from your use of our services, violation of these 
              terms, or infringement of any rights.
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="h-6 w-6 text-purple-600" />
              Governing Law & Disputes
            </h2>
            
            <div className="space-y-4 text-gray-700">
              <p>
                These terms are governed by the laws of California, USA. Any disputes will be 
                resolved through binding arbitration in San Francisco, California, except for 
                small claims court matters.
              </p>
              <p>
                You agree to bring any claims individually, not as part of a class action.
              </p>
            </div>
          </section>

          {/* Changes */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to Terms</h2>
            <p className="text-gray-700">
              We may update these terms anytime. We'll notify you of significant changes via 
              email or in-app notification. Continued use after changes means you accept the 
              new terms. If you don't agree, stop using Remvana and close your account.
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
                Questions about these terms? Let us know:
              </p>
              <div className="space-y-2 text-gray-700">
                <p><strong>Email:</strong> legal@remvana.com</p>
                <p><strong>Support:</strong> support@remvana.com</p>
                <p><strong>Address:</strong> Remvana, Inc.<br />
                123 Travel Lane<br />
                San Francisco, CA 94102</p>
              </div>
            </div>
          </section>

          {/* Entire Agreement */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Entire Agreement</h2>
            <p className="text-gray-700">
              These Terms of Service, along with our Privacy Policy, constitute the entire 
              agreement between you and Remvana. They supersede any prior agreements or understandings.
            </p>
          </section>

          {/* Acceptance */}
          <section className="text-center pt-8 border-t">
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-lg">
              <p className="text-lg font-semibold text-gray-900 mb-2">
                By using Remvana, you accept these terms.
              </p>
              <p className="text-sm text-gray-600">
                Thank you for choosing Remvana for your travel planning needs!
              </p>
            </div>
          </section>
        </div>
      </main>

      <FooterConsumer />
    </div>
  );
}