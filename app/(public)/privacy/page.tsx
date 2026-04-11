import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Pixova — how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: April 11, 2026</p>

      <section className="mt-10 space-y-8 text-[15px] leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">1. Who We Are</h2>
          <p className="mt-2">
            Pixova (<a href="https://pixova.in" className="text-brand-600 underline">pixova.in</a>) is a photography marketplace and studio management platform operated by <strong>ZYARTH.ai</strong>, based in Chennai, India.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">2. What Data We Collect</h2>
          <p className="mt-2">We collect the following information when you use Pixova:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Name</strong> — to identify your account and display on bookings &amp; agreements</li>
            <li><strong>Mobile number</strong> — for OTP-based login and WhatsApp notifications</li>
            <li><strong>Email address</strong> — for account communication and payment receipts</li>
            <li><strong>Photos</strong> — uploaded by photographers for gallery delivery to clients</li>
            <li><strong>Booking &amp; client details</strong> — event dates, locations, package details, and client contact information entered by photographers</li>
            <li><strong>Payment information</strong> — transaction records processed through Razorpay</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">3. How We Use Your Data</h2>
          <p className="mt-2">Your data is used for:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Booking management — scheduling, tracking, and delivering photography services</li>
            <li>Notifications — sending booking confirmations, reminders, and gallery delivery links</li>
            <li>Agreement generation — creating service agreements between photographers and clients</li>
            <li>Payment processing — facilitating payments between clients and photographers</li>
            <li>Platform improvement — understanding usage patterns to improve the product</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">4. WhatsApp Communications</h2>
          <p className="mt-2">
            Pixova sends transactional messages via <strong>WhatsApp Business API</strong> (powered by AiSensy). These include booking confirmations, reminders, gallery links, and payment notifications. Messages are sent only for actions initiated on the platform. We do not use your number for marketing without consent.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">5. Photo Storage</h2>
          <p className="mt-2">
            Photos uploaded by photographers are stored securely on <strong>Cloudflare R2</strong> object storage. Photos are accessible only through authenticated or time-limited signed URLs. We do not access, modify, or use your photos for any purpose other than delivering them to your intended recipients.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">6. Payment Processing</h2>
          <p className="mt-2">
            Payments are processed by <strong>Razorpay</strong>, a PCI-DSS compliant payment gateway. Pixova does not store your credit/debit card details. All payment data is handled directly by Razorpay in accordance with their{" "}
            <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">privacy policy</a>.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">7. Data Sharing</h2>
          <p className="mt-2">
            We do not sell your personal data. We share data only with the following third-party services necessary to operate the platform:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Supabase</strong> — database and authentication</li>
            <li><strong>Cloudflare R2</strong> — photo storage</li>
            <li><strong>Razorpay</strong> — payment processing</li>
            <li><strong>AiSensy</strong> — WhatsApp messaging</li>
            <li><strong>Vercel</strong> — application hosting</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">8. Data Retention</h2>
          <p className="mt-2">
            We retain your data for as long as your account is active. Photos are stored according to your subscription plan limits. When you delete your account, your personal data and photos will be permanently removed within 30 days.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">9. Data Deletion</h2>
          <p className="mt-2">
            You can request deletion of your account and all associated data by emailing us at{" "}
            <a href="mailto:hello@pixova.in" className="text-brand-600 underline">hello@pixova.in</a>.
            We will process your request within 30 days.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">10. Security</h2>
          <p className="mt-2">
            We use industry-standard security measures including HTTPS encryption, JWT-based authentication, and secure cookie handling. While we strive to protect your data, no method of transmission over the internet is 100% secure.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">11. Changes to This Policy</h2>
          <p className="mt-2">
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Continued use of Pixova after changes constitutes acceptance.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">12. Contact</h2>
          <p className="mt-2">
            For privacy-related questions or data deletion requests, contact us at:
          </p>
          <p className="mt-2">
            <a href="mailto:hello@pixova.in" className="text-brand-600 underline">hello@pixova.in</a>
          </p>
          <p className="mt-1">ZYARTH.ai, Chennai, India</p>
        </div>
      </section>

      <footer className="mt-16 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
        <Link href="/terms" className="hover:underline">Terms of Service</Link>
        <span className="mx-2">·</span>
        <span>© {new Date().getFullYear()} Pixova by ZYARTH.ai</span>
      </footer>
    </main>
  );
}
