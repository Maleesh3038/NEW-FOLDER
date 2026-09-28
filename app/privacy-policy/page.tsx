import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Drivo LK",
  description:
    "Learn how Drivo LK collects, uses, and protects your personal information on Sri Lanka's vehicle rental marketplace.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <style>{`
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; color: #1a1a1a; }
        .container { max-width: 780px; margin: 0 auto; padding: 48px 24px 80px; }
        .back { display: inline-block; margin-bottom: 40px; font-size: 14px; color: #555; text-decoration: none; }
        .back:hover { color: #000; }
        h1 { font-size: 32px; font-weight: 700; margin: 0 0 8px; }
        .meta { font-size: 13px; color: #888; margin-bottom: 40px; }
        h2 { font-size: 18px; font-weight: 600; margin: 36px 0 12px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        p, li { font-size: 15px; line-height: 1.75; color: #333; }
        ul { padding-left: 20px; margin: 0 0 16px; }
        li { margin-bottom: 6px; }
        .highlight { background: #fafafa; border-left: 3px solid #1a1a1a; padding: 14px 18px; margin: 20px 0; border-radius: 2px; font-size: 14px; }
      `}</style>

      <div className="container">
        <a href="/" className="back">← Back to Home</a>

        <h1>Privacy Policy</h1>
        <p className="meta">Last updated: September 2026</p>

        <p>
          Drivo LK ("<strong>Drivo</strong>", "we", "us", or "our") operates the vehicle
          rental marketplace at <strong>thedrivo.com</strong>. This Privacy Policy
          explains what personal information we collect, why we collect it, how we use
          and protect it, and your rights regarding your data. By using our platform you
          consent to the practices described in this policy.
        </p>

        <h2>1. Information We Collect</h2>
        <p>We collect the following categories of personal information from users who
          register, list a vehicle, or make a booking on Drivo LK:</p>
        <ul>
          <li><strong>Full name</strong> — to identify you as an account holder and in booking records.</li>
          <li><strong>National Identity Card (NIC) or passport number</strong> — for identity verification as required by Sri Lankan law and for the safety of vehicle owners and renters.</li>
          <li><strong>Mobile phone number</strong> — for booking confirmations, support, and WhatsApp communications.</li>
          <li><strong>Email address</strong> — for account registration, transactional emails, and support correspondence.</li>
          <li><strong>Driving licence number and class</strong> — to verify that renters hold a valid licence before approving a booking.</li>
          <li><strong>Vehicle details (owners only)</strong> — registration number, make, model, year, and insurance information.</li>
          <li><strong>Payment information</strong> — we collect only the data needed to process transactions. Full card numbers are not stored on our servers; they are handled by our payment processor.</li>
        </ul>
        <p>
          We may also collect device and usage data automatically when you visit
          thedrivo.com, including IP address, browser type, pages visited, and referring
          URLs. This data is used in aggregate for analytics and platform improvement.
        </p>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li><strong>Booking processing</strong> — to create, confirm, and manage vehicle rental reservations between renters and owners.</li>
          <li><strong>Identity and licence verification</strong> — to confirm that all parties meet the eligibility requirements before a rental is approved.</li>
          <li><strong>Communications</strong> — to send booking confirmations, reminders, receipts, support responses, and important policy updates.</li>
          <li><strong>Platform safety</strong> — to detect fraud, resolve disputes, and enforce our Terms &amp; Conditions.</li>
          <li><strong>Legal compliance</strong> — to meet obligations under Sri Lankan law, including responding to valid legal requests from authorities.</li>
          <li><strong>Service improvement</strong> — to understand how users interact with the platform and to improve features and user experience.</li>
        </ul>

        <h2>3. We Do Not Sell Your Data</h2>
        <div className="highlight">
          Drivo LK does not sell, rent, or trade your personal information to third
          parties for marketing or any other commercial purpose. Your data is used
          solely to operate and improve the Drivo LK platform.
        </div>

        <h2>4. Data Storage &amp; Security</h2>
        <p>
          User data is stored securely using <strong>Supabase</strong>, a
          PostgreSQL-based cloud database platform that provides row-level security,
          encryption at rest, and encrypted data transmission (TLS/SSL). Access to
          personal data is restricted to authorised Drivo LK personnel and is
          protected by role-based access controls.
        </p>
        <p>
          While we take reasonable measures to protect your information, no method of
          transmission over the internet or electronic storage is completely secure.
          We encourage you to use strong, unique passwords and to contact us immediately
          if you suspect unauthorised access to your account.
        </p>

        <h2>5. Cookies</h2>
        <p>
          Drivo LK uses cookies and similar tracking technologies to maintain session
          state (keeping you logged in), remember your preferences, and collect
          aggregated analytics data. You can control cookie settings through your
          browser; however, disabling certain cookies may affect platform functionality.
          We do not use cookies to serve targeted advertising.
        </p>

        <h2>6. Third-Party Services</h2>
        <p>
          We share your data only with service providers necessary to operate the
          platform, including:
        </p>
        <ul>
          <li><strong>Supabase</strong> — database and authentication infrastructure.</li>
          <li><strong>Payment gateway providers</strong> — for secure processing of rental booking fees.</li>
        </ul>
        <p>
          These providers are contractually obligated to protect your data and may not
          use it for their own purposes beyond providing the service to us.
        </p>

        <h2>7. Data Retention</h2>
        <p>
          We retain your personal information for as long as your account is active or
          as needed to provide our services. Booking records and identity verification
          documents are retained for a minimum of two years for dispute resolution and
          legal compliance purposes. You may request deletion of your account and
          associated data at any time, subject to our legal retention obligations.
        </p>

        <h2>8. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access</strong> the personal information we hold about you.</li>
          <li><strong>Correct</strong> inaccurate or incomplete data.</li>
          <li><strong>Delete</strong> your account and personal data, subject to legal retention requirements.</li>
          <li><strong>Withdraw consent</strong> for non-essential communications at any time.</li>
          <li><strong>Object</strong> to the processing of your data in certain circumstances.</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a href="mailto:thedrivo.info@gmail.com">thedrivo.info@gmail.com</a>. We will
          respond within 14 business days.
        </p>

        <h2>9. Children's Privacy</h2>
        <p>
          Drivo LK is not directed at individuals under the age of 18. We do not
          knowingly collect personal information from minors. If you believe a minor
          has provided us with personal data, please contact us and we will take steps
          to remove that information.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we do, we will
          revise the "Last updated" date at the top of this page. For material changes
          we will notify registered users by email. Continued use of the platform after
          changes are posted constitutes your acceptance of the revised policy.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          For any privacy-related questions, concerns, or requests, please contact:
        </p>
        <ul>
          <li><strong>Email:</strong> <a href="mailto:thedrivo.info@gmail.com">thedrivo.info@gmail.com</a></li>
          <li><strong>Platform:</strong> thedrivo.com</li>
          <li><strong>Country:</strong> Sri Lanka</li>
        </ul>
      </div>
    </>
  );
}
