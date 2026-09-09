'use client';
import { useSearchParams } from 'next/navigation';

export default function BookingCancelPage() {
  const params = useSearchParams();
  const bookingId = params.get('booking_id');

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden text-center">
        <div className="bg-slate-900 px-8 py-10">
          <div className="text-5xl mb-3">😔</div>
          <h1 className="text-xl font-black text-white">Payment Cancelled</h1>
          <p className="text-slate-400 text-sm mt-2">Your booking was not completed</p>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-slate-500">No payment was taken. You can try again or choose a different vehicle.</p>
          <a href="/" className="block w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm uppercase tracking-wide transition text-center">
            🏠 Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
