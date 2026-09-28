import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Return & Refund Policy | Drivo LK",
  description:
    "Cancellation and refund policy for vehicle bookings on Drivo LK — Sri Lanka's vehicle rental marketplace.",
};

export default function ReturnPolicyPage() {
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
        .table-wrap { overflow-x: auto; margin: 16px 0 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th { background: #f5f5f5; text-align: left; padding: 10px 14px; font-weight: 600; border: 1px solid #e0e0e0; }
        td { padding: 10px 14px; border: 1px solid #e0e0e0; color: #333; }
        .highlight { background: #fafafa; border-left: 3px solid #1a1a1a; padding: 14px 18px; margin: 20px 0; border-radius: 2px; font-size: 14px; }
      `}</style>

      <div className="container">
        <a href="/" className="back">← Back to Home</a>

        <h1>Return &amp; Refund Policy</h1>
        <p className="meta">Last updated: September 2026</p>

        <p>
          This Return &amp; Refund Policy governs all vehicle rental bookings made through
          the Drivo LK platform (<strong>thedrivo.com</strong>). By completing a booking
          you agree to the terms described below. All amounts are stated in Sri Lankan
          Rupees (LKR).
        </p>

        <h2>1. Booking Fee</h2>
        <p>
          When you confirm a vehicle rental on Drivo LK, a non-refundable booking fee
          equal to <strong>10% of the total rental value</strong> is charged to secure
          your reservation. This fee covers platform verification, owner coordination,
          and payment processing costs.
        </p>
        <div className="highlight">
          Example: For a rental priced at LKR 20,000, the booking fee is LKR 2,000.
          The remaining LKR 18,000 is paid directly to the vehicle owner at the start
          of the rental period.
        </div>

        <h2>2. Cancellation &amp; Refund Schedule</h2>
        <p>
          Refunds on the booking fee are determined by how much notice is given before
          the scheduled rental start time:
        </p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Notice Period</th>
                <th>Refund on Booking Fee</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>More than 48 hours before rental start</td>
                <td>Full refund (100%)</td>
              </tr>
              <tr>
                <td>24 – 48 hours before rental start</td>
                <td>Partial refund (50%)</td>
              </tr>
              <tr>
                <td>Less than 24 hours before rental start</td>
                <td>No refund</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Any direct payment made to the vehicle owner (the balance rental amount)
          is subject to the owner's own cancellation terms, which are displayed on
          the vehicle listing page before booking.
        </p>

        <h2>3. How to Request a Refund</h2>
        <p>To initiate a cancellation and refund request, contact us through either of
          the following channels:</p>
        <ul>
          <li>
            <strong>Email:</strong>{" "}
            <a href="mailto:thedrivo.info@gmail.com">thedrivo.info@gmail.com</a> —
            include your booking reference number, full name, and reason for cancellation.
          </li>
          <li>
            <strong>WhatsApp:</strong> Send a message to our support number (available
            on the Contact page) with your booking reference.
          </li>
        </ul>
        <p>
          Cancellation requests must be submitted before the scheduled rental start
          time. Requests received after the rental has commenced will not be eligible
          for a refund.
        </p>

        <h2>4. Refund Processing Time</h2>
        <p>
          Approved refunds are processed within <strong>5 – 7 business days</strong>{" "}
          from the date the cancellation is confirmed by Drivo LK. The refund will be
          returned to the original payment method used at the time of booking.
          Processing times may vary depending on your bank or payment provider.
        </p>

        <h2>5. Non-Refundable Situations</h2>
        <ul>
          <li>Cancellations made with less than 24 hours' notice.</li>
          <li>No-show at the agreed pick-up location.</li>
          <li>Rental shortened by the renter after the vehicle has been collected.</li>
          <li>Bookings cancelled due to violation of our Terms &amp; Conditions.</li>
        </ul>

        <h2>6. Vehicle Owner Cancellations</h2>
        <p>
          If a vehicle owner cancels a confirmed booking, the renter will receive a
          full refund of the booking fee within 5 – 7 business days, regardless of
          notice period. Drivo LK will also make reasonable efforts to find an
          alternative vehicle.
        </p>

        <h2>7. Disputes</h2>
        <p>
          If you believe your refund has been incorrectly calculated or you have not
          received your refund within the stated timeframe, please contact us at{" "}
          <a href="mailto:thedrivo.info@gmail.com">thedrivo.info@gmail.com</a>. We
          aim to resolve all disputes within 7 business days.
        </p>

        <h2>8. Changes to This Policy</h2>
        <p>
          Drivo LK reserves the right to update this policy at any time. Changes will
          be posted on this page with an updated revision date. Continued use of the
          platform after changes constitutes acceptance of the revised policy.
        </p>

        <p style={{ marginTop: 40, fontSize: 13, color: "#888" }}>
          For all refund and cancellation enquiries:{" "}
          <a href="mailto:thedrivo.info@gmail.com">thedrivo.info@gmail.com</a>
        </p>
      </div>
    </>
  );
}
