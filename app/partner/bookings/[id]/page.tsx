'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { partnerConfirmBooking, partnerDeclineBooking } from '@/lib/bookingService'

type Booking = {
  id: string
  status: string
  start_date: string
  end_date: string
  total_price: number
  with_driver: boolean
  delivery_address?: string
  decline_reason?: string
  customers: { name: string; phone: string }
  vehicles: { name: string }
}

export default function PartnerBookingPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [booking, setBooking]   = useState<Booking | null>(null)
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState(false)
  const [declined, setDeclined] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('bookings')
        .select(`
          id, status, start_date, end_date, total_price,
          with_driver, delivery_address, decline_reason,
          customers(name, phone),
          vehicles(name)
        `)
        .eq('id', id)
        .single()

      if (data) setBooking(data as any)
      setLoading(false)
    }
    fetch()
  }, [id])

  const handleConfirm = async () => {
    if (!confirm('Booking confirm කරන්නද?')) return
    setActing(true)
    try {
      await partnerConfirmBooking(id)
      await fetch('/api/bookings/notify-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id, type: 'confirmed' }),
      })
      setBooking(prev => prev ? { ...prev, status: 'confirmed' } : prev)
    } catch {
      alert('Error confirming booking')
    } finally {
      setActing(false)
    }
  }

  const handleDecline = async () => {
    const reason = prompt('Decline reason:')
    if (reason === null) return
    setActing(true)
    try {
      await partnerDeclineBooking(id, reason)
      await fetch('/api/bookings/notify-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id, type: 'declined' }),
      })
      setBooking(prev => prev ? { ...prev, status: 'declined' } : prev)
      setDeclined(true)
    } catch {
      alert('Error declining booking')
    } finally {
      setActing(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  )

  if (!booking) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-400">Booking හොයාගන්න බැරි වුණා</p>
    </div>
  )

  const isActionable = booking.status === 'admin_approved'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full max-w-md p-6">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">
            {booking.status === 'confirmed' ? '✅' :
             booking.status === 'declined'  ? '❌' : '🚗'}
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            {booking.status === 'confirmed' ? 'Booking Confirmed!' :
             booking.status === 'declined'  ? 'Booking Declined'  :
             'Booking Confirmation'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">Booking #{id.slice(0, 8)}</p>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-6">
          <Row label="Vehicle"   value={booking.vehicles?.name} />
          <Row label="Customer"  value={booking.customers?.name} />
          <Row label="Phone"     value={booking.customers?.phone} />
          <Row label="From"      value={booking.start_date} />
          <Row label="To"        value={booking.end_date} />
          <Row label="Total"     value={`Rs. ${booking.total_price?.toLocaleString()}`} highlight />
          {booking.with_driver && (
            <Row label="Driver" value="ඔව් — Driver included" />
          )}
          {booking.delivery_address && (
            <Row label="Delivery" value={booking.delivery_address} />
          )}
        </div>

        {/* Action buttons */}
        {isActionable && (
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={acting}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-medium text-sm disabled:opacity-50 transition"
            >
              {acting ? 'Processing...' : 'Confirm Booking'}
            </button>
            <button
              onClick={handleDecline}
              disabled={acting}
              className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-medium text-sm disabled:opacity-50 transition"
            >
              Decline
            </button>
          </div>
        )}

        {booking.status === 'confirmed' && (
          <div className="bg-green-50 rounded-2xl p-4 text-center text-green-700 text-sm font-medium">
            Customer ට WhatsApp message යැව්වා ✅
          </div>
        )}

        {booking.status === 'declined' && (
          <div className="bg-red-50 rounded-2xl p-4 text-center text-red-600 text-sm font-medium">
            Booking declined කළා
          </div>
        )}
      </div>
    </div>
  )
}

function Row({
  label, value, highlight
}: {
  label: string; value?: string; highlight?: boolean
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-green-700' : 'text-gray-800'}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}