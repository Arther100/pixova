import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Pixova — Photography Marketplace & Studio Management platform by ZYARTH.ai.",
};

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: April 11, 2026</p>

      <section className="mt-10 space-y-8 text-[15px] leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">1. Introduction</h2>
          <p className="mt-2">
            Welcome to Pixova (<a href="https://pixova.in" className="text-brand-600 underline">pixova.in</a>), a photography marketplace and studio management platform operated by <strong>ZYARTH.ai</strong>, based in Chennai, India. By accessing or using Pixova, you agree to be bound by these Terms of Service.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">2. Eligibility</h2>
          <p className="mt-2">
            You must be at least 18 years old to create a photographer account on Pixova. Clients interacting via booking portals or galleries must be at least 13 years old.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">3. Accounts</h2>
          <p className="mt-2">
            Photographer accounts are created via mobile number verification. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">4. Services</h2>
          <p className="mt-2">Pixova provides photographers with tools to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Manage bookings and client details</li>
            <li>Create and share photo galleries</li>
            <li>Generate agreements and invoices</li>
            <li>Collect payments via integrated payment links</li>
            <li>Send notifications via WhatsApp (through AiSensy / WhatsApp Business API)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">5. Subscriptions &amp; Payments</h2>
          <p className="mt-2">
            Pixova offers subscription plans with a free trial period. Payments are processed through <strong>Razorpay</strong>. Subscription fees are non-refundable unless otherwise required by applicable law. We reserve the right to change pricing with reasonable notice.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">6. Photo Storage</h2>
          <p className="mt-2">
            Photos uploaded by photographers are stored on <strong>Cloudflare R2</strong>. Storage quotas are determined by your subscription plan. We do not claim ownership of any photos you upload.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">7. Acceptable Use</h2>
          <p className="mt-2">You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Upload illegal, harmful, or infringing content</li>
            <li>Attempt to access other users&apos; accounts or data</li>
            <li>Use the platform for spam, phishing, or fraudulent activities</li>
            <li>Reverse-engineer, scrape, or interfere with the platform&apos;s operation</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">8. Intellectual Property</h2>
          <p className="mt-2">
            The Pixova name, logo, and platform design are the property of ZYARTH.ai. Photographers retain full ownership of the photos they upload. By using the platform, you grant Pixova a limited license to display and deliver your content as part of the services.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">9. Limitation of Liability</h2>
          <p className="mt-2">
            Pixova is provided &ldquo;as is&rdquo; without warranties of any kind. To the maximum extent permitted by law, ZYARTH.ai shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">10. Termination</h2>
          <p className="mt-2">
            We may suspend or terminate your account if you violate these terms. You may delete your account at any time by contacting us. Upon termination, your data will be deleted in accordance with our <Link href="/privacy" className="text-brand-600 underline">Privacy Policy</Link>.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">11. Governing Law</h2>
          <p className="mt-2">
            These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu, India.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">12. Changes to These Terms</h2>
          <p className="mt-2">
            We may update these terms from time to time. Continued use of Pixova after changes constitutes acceptance of the revised terms.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">13. Contact</h2>
          <p className="mt-2">
            For questions about these terms, contact us at{" "}
            <a href="mailto:hello@pixova.in" className="text-brand-600 underline">hello@pixova.in</a>.
          </p>
          <p className="mt-1">ZYARTH.ai, Chennai, India</p>
        </div>
      </section>

      <footer className="mt-16 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
        <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        <span className="mx-2">·</span>
        <span>© {new Date().getFullYear()} Pixova by ZYARTH.ai</span>
      </footer>
    </main>
  );
}
