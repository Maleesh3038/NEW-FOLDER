import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Drivo LK",
  description:
    "Terms and Conditions governing the use of Drivo LK, Sri Lanka's vehicle rental marketplace connecting renters and vehicle owners.",
};

export default function TermsPage() {
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

        <h1>Terms &amp; Conditions</h1>
        <p className="meta">Last updated: September 2026</p>

        <p>
          Please read these Terms &amp; Conditions ("Terms") carefully before using
          the Drivo LK platform at <strong>thedrivo.com</strong> ("Platform"), operated
          by Drivo LK ("Drivo", "we", "us", or "our"). By accessing or using the
          Platform, you agree to be bound by these Terms. If you do not agree, you must
          not use the Platform.
        </p>

        <h2>1. About the Platform</h2>
        <div className="highlight">
          Drivo LK is an online marketplace that connects individuals who wish to rent
          vehicles ("Renters") with individuals or businesses that own vehicles available
          for rent ("Owners"). Drivo LK is not a vehicle rental company. We facilitate
          the booking and payment process but are not a party to the rental agreement
          between Renters and Owners.
        </div>
        <p>
          Drivo LK does not own, operate, or insure any of the vehicles listed on the
          Platform. The rental contract is formed directly between the Renter and the
          Owner. Drivo LK's role is limited to providing the technology platform and
          related support services.
        </p>

        <h2>2. Eligibility</h2>
        <ul>
          <li>You must be at least <strong>18 years of age</strong> to register an account or make a booking on Drivo LK.</li>
          <li>You must provide accurate, current, and complete information during registration and booking.</li>
          <li>By using the Platform you confirm that you have the legal capacity to enter into binding contracts under the laws of Sri Lanka.</li>
          <li>Drivo LK reserves the right to refuse access or terminate accounts that do not meet eligibility requirements.</li>
        </ul>

        <h2>3. Driving Licence Requirement</h2>
        <p>
          All Renters must hold a <strong>valid Sri Lankan driving licence</strong> (or
          a valid international driving permit recognised in Sri Lanka) that covers the
          category of vehicle being rented. A copy of the licence must be uploaded
          during the booking process. Drivo LK will verify the licence before confirming
          the booking. Providing a false, expired, or invalid licence is grounds for
          immediate account termination and may be reported to the relevant authorities.
        </p>

        <h2>4. Renter Responsibilities</h2>
        <p>As a Renter you agree to:</p>
        <ul>
          <li>Take good care of the vehicle during the entire rental period and return it in the same condition as received, subject to normal wear and tear.</li>
          <li>Comply with all Sri Lankan road traffic laws and regulations.</li>
          <li>Not sub-let, lend, or permit any other person to drive the vehicle unless expressly agreed in writing with the Owner.</li>
          <li>Not use the vehicle for any illegal purpose, off-road activities, racing, or towing unless the listing expressly permits such use.</li>
          <li>Report any accident, damage, or theft to the Owner and to Drivo LK immediately.</li>
          <li>Bear full financial responsibility for any damage, fines, or loss arising during the rental period that is not covered by the Owner's insurance.</li>
          <li>Return the vehicle at the agreed time and location. Late returns may be subject to additional charges at the Owner's discretion.</li>
        </ul>

        <h2>5. Owner Responsibilities</h2>
        <p>As an Owner you agree to:</p>
        <ul>
          <li>Ensure the vehicle is in a roadworthy condition, clean, and fit for rental before each booking.</li>
          <li>Hold valid motor vehicle insurance for the vehicle at all times during the listing period.</li>
          <li>Provide accurate descriptions, photographs, and pricing information in your listing.</li>
          <li>Honour all confirmed bookings. Unjustified cancellations may result in account suspension.</li>
          <li>Handle any damage claims directly with the Renter in the first instance, with Drivo LK available to assist in dispute resolution.</li>
          <li>Comply with all applicable laws and regulations relating to the rental of private vehicles in Sri Lanka.</li>
        </ul>

        <h2>6. Platform Fee</h2>
        <p>
          Drivo LK charges a <strong>10% platform fee</strong> on the total rental
          value for each completed booking. This fee is deducted from the booking amount
          collected by Drivo LK and covers platform maintenance, payment processing,
          customer support, and verification services. The remaining 90% of the rental
          value is paid to the Owner. Pricing displayed on the Platform is inclusive of
          all Drivo LK fees.
        </p>

        <h2>7. Payments</h2>
        <p>
          All payments are processed securely through Drivo LK's integrated payment
          gateway. By making a payment you authorise Drivo LK to collect the booking
          fee and disburse the rental amount to the Owner. All transactions are
          conducted in Sri Lankan Rupees (LKR) unless otherwise stated. Drivo LK does
          not store full card details on its servers.
        </p>

        <h2>8. Cancellations &amp; Refunds</h2>
        <p>
          Cancellations and refunds are governed by our{" "}
          <a href="/return-policy">Return &amp; Refund Policy</a>, which forms part of
          these Terms.
        </p>

        <h2>9. Dispute Resolution</h2>
        <p>
          In the event of a dispute between a Renter and an Owner, both parties agree
          to first attempt to resolve the matter directly. If a resolution cannot be
          reached within 48 hours, either party may escalate the dispute to Drivo LK
          by emailing{" "}
          <a href="mailto:thedrivo.info@gmail.com">thedrivo.info@gmail.com</a>.
        </p>
        <p>
          <strong>Drivo LK's decision in all disputes is final.</strong> We will
          review the evidence provided by both parties and issue a determination within
          7 business days. Drivo LK may, at its sole discretion, withhold or redirect
          payments pending the resolution of a dispute.
        </p>

        <h2>10. Prohibited Conduct</h2>
        <p>Users must not:</p>
        <ul>
          <li>Create fake listings, fraudulent bookings, or impersonate another person.</li>
          <li>Use the Platform for any unlawful purpose.</li>
          <li>Interfere with or disrupt the technical operation of the Platform.</li>
          <li>Post false, misleading, or defamatory reviews or content.</li>
          <li>Attempt to circumvent the Platform's payment system by arranging off-platform payments after initial contact is made through Drivo LK.</li>
        </ul>
        <p>
          Violation of these prohibitions may result in immediate suspension, account
          termination, and, where appropriate, referral to law enforcement authorities.
        </p>

        <h2>11. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by applicable law, Drivo LK shall not be
          liable for any indirect, incidental, special, consequential, or punitive
          damages arising from the use of the Platform or any rental transaction,
          including but not limited to vehicle damage, personal injury, theft, or loss
          of property. Drivo LK's total liability for any claim arising from use of
          the Platform shall not exceed the platform fee collected in respect of the
          relevant booking.
        </p>

        <h2>12. Intellectual Property</h2>
        <p>
          All content on the Platform, including the Drivo LK name, logo, design, and
          software, is the intellectual property of Drivo LK or its licensors. You may
          not reproduce, distribute, or create derivative works from Platform content
          without our prior written consent.
        </p>

        <h2>13. Governing Law</h2>
        <p>
          These Terms are governed by and construed in accordance with the laws of the
          <strong> Democratic Socialist Republic of Sri Lanka</strong>. Any disputes
          arising under these Terms that cannot be resolved through Drivo LK's dispute
          process shall be subject to the exclusive jurisdiction of the courts of
          Sri Lanka.
        </p>

        <h2>14. Changes to These Terms</h2>
        <p>
          Drivo LK reserves the right to modify these Terms at any time. Updated Terms
          will be posted on this page with a revised date. Continued use of the Platform
          after changes are posted constitutes acceptance of the revised Terms. We
          recommend reviewing this page periodically.
        </p>

        <h2>15. Contact Us</h2>
        <p>
          For any questions regarding these Terms &amp; Conditions, please contact:
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
