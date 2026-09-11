'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PartnerBookingPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [done, setDone] = useState<'confirmed' | 'declined' | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from('bookings')
      .select('*, customers(first_name, last_name, phone, email, nic, driving_license)')
      .eq('id', id)
      .single()
      .then(({ data }) => { if (data) setBooking(data); setLoading(false); });
  }, [id]);

  const handleConfirm = async () => {
    if (!confirm('Confirm this booking? Customer & admin will be notified immediately.')) return;
    setActing(true);
    try {
      await supabase.from('bookings').update({
        status: 'confirmed',
        partner_action_at: new Date().toISOString()
      }).eq('id', id);

      await fetch('/api/bookings/notify-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id, type: 'confirmed' }),
      });

      setDone('confirmed');
    } catch { alert('Error confirming booking'); }
    setActing(false);
  };

  const handleDecline = async () => {
    const reason = prompt('Decline reason (optional):') ?? '';
    setActing(true);
    try {
      await supabase.from('bookings').update({
        status: 'declined',
        decline_reason: reason,
        partner_action_at: new Date().toISOString()
      }).eq('id', id);

      await fetch('/api/bookings/notify-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id, type: 'declined' }),
      });

      setDone('declined');
    } catch { alert('Error declining booking'); }
    setActing(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"/>
    </div>
  );

  if (!booking) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400">Booking not found</p>
    </div>
  );

  const customer = booking.customers;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
        <div className={`px-6 py-6 text-center ${done === 'confirmed' ? 'bg-emerald-500' : done === 'declined' ? 'bg-red-500' : 'bg-slate-900'}`}>
          <div className="text-4xl mb-2">
            {done === 'confirmed' ? '✅' : done === 'declined' ? '❌' : '📋'}
          </div>
          <h1 className="text-xl font-black text-white">
            {done === 'confirmed' ? 'Booking Confirmed!' : done === 'declined' ? 'Booking Declined' : 'New Booking Request'}
          </h1>
          <p className="text-white/70 text-xs mt-1">Drivo LK · Booking #{id?.slice(0, 8)}</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {[
              ['Vehicle', booking.vehicle_name],
              ['Pickup Date', booking.pickup_date],
              ['Return Date', booking.return_date],
              ['Duration', `${booking.days} day${booking.days > 1 ? 's' : ''}`],
              ['Pickup Time', booking.pickup_time || '09:00'],
              ['Driver', booking.driver_option === 'with_driver' ? '✅ With Driver' : 'Self Drive'],
              ['Delivery', booking.delivery_type === 'delivery' ? `📍 ${booking.delivery_address || 'Delivery'}` : '🏢 Self Pickup'],
              ['Total', `Rs. ${Number(booking.total || 0).toLocaleString()}`],
              ['Your Payout (90%)', `Rs. ${Math.round(Number(booking.total || 0) * 0.90).toLocaleString()}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center px-4 py-2.5 text-xs">
                <span className="text-slate-400 font-semibold">{k}</span>
                <span className="font-black text-slate-900 text-right max-w-[55%]">{v}</span>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider mb-3">Customer Details</p>
            <div className="space-y-2">
              {[
                ['Name', `${customer?.first_name || ''} ${customer?.last_name || ''}`],
                ['Phone', customer?.phone || '—'],
                ['Email', customer?.email || '—'],
                ['NIC', customer?.nic || '—'],
                ['License', customer?.driving_license || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-blue-400">{k}</span>
                  <span className="font-black text-blue-900">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {!done && booking.status === 'admin_approved' && (
            <div className="space-y-2">
              <button onClick={handleConfirm} disabled={acting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm uppercase tracking-wide transition disabled:opacity-50">
                {acting ? 'Processing...' : '✅ Confirm Booking'}
              </button>
              <button onClick={handleDecline} disabled={acting}
                className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-black text-sm uppercase tracking-wide transition disabled:opacity-50">
                ❌ Decline
              </button>
            </div>
          )}

          {!done && booking.status === 'pending' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-amber-700 text-xs font-bold">⏳ Waiting for admin approval</p>
            </div>
          )}

          {done === 'confirmed' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <p className="text-emerald-700 font-black text-sm">Customer & admin notified! 🎉</p>
              <p className="text-emerald-600 text-xs mt-1">Customer will receive your contact details via WhatsApp</p>
            </div>
          )}

          {done === 'declined' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-red-700 font-black text-sm">Booking declined</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
