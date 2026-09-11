'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function BookingSuccessPage() {
  const params = useSearchParams();
  const bookingId = params.get('booking_id');
  const sessionId = params.get('session_id');
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    const fetchBooking = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, vehicles(name, owners(shop_name))')
        .eq('id', bookingId)
        .single();
      if (data) setBooking(data);
      setLoading(false);
    };
    fetchBooking();
  }, [bookingId]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"/>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-8 py-10 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white">Payment Successful!</h1>
          <p className="text-emerald-100 text-sm mt-2">Your booking fee has been received</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* What happens next */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-black text-blue-700 uppercase tracking-wide">What happens next?</p>
            {[
              { icon: '📲', text: 'Admin & Partner have been notified of your booking' },
              { icon: '⏳', text: 'Partner will confirm within 30 minutes via WhatsApp' },
              { icon: '🎉', text: 'Once confirmed, partner contact & directions will be shared' },
              { icon: '💳', text: `Pay Rs. ${booking ? Math.round((booking.total || 0) * 0.90).toLocaleString() : '—'} at pickup` },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <p className="text-xs text-blue-700 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Booking summary */}
          {booking && (
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Booking Summary</p>
              {[
                ['Vehicle', booking.vehicle_name],
                ['Pickup', booking.pickup_date],
                ['Return', booking.return_date],
                ['Booking Fee Paid', `Rs. ${Math.round((booking.total || 0) * 0.10).toLocaleString()}`],
                ['Pay at Pickup', `Rs. ${Math.round((booking.total || 0) * 0.90).toLocaleString()}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-black text-slate-900">{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Partner details — only show after confirmed */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <p className="text-xs font-black text-amber-700">🔒 Partner contact details will be revealed once they confirm your booking</p>
          </div>

          <a href="/" className="block w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm uppercase tracking-wide transition text-center">
            🏠 Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}


