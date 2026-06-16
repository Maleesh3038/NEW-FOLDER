'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { adminApproveBooking, adminDeclineBooking } from '@/lib/bookingService'

type Booking = {
  id: string
  status: 'pending' | 'admin_approved' | 'confirmed' | 'declined'
  start_date: string
  end_date: string
  total_price: number
  with_driver: boolean
  created_at: string
  customers: { name: string; phone: string }
  vehicles: { name: string; owners: { name: string; phone: string } }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:        { label: 'Pending',        color: 'bg-yellow-100 text-yellow-800' },
  admin_approved: { label: 'Admin Approved', color: 'bg-blue-100 text-blue-800' },
  confirmed:      { label: 'Confirmed',      color: 'bg-green-100 text-green-800' },
  declined:       { label: 'Declined',       color: 'bg-red-100 text-red-800' },
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState<string | null>(null)

  const fetchBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        id, status, start_date, end_date, total_price,
        with_driver, created_at,
        customers(name, phone),
        vehicles(name, owners(name, phone))
      `)
      .order('created_at', { ascending: false })

    if (data) setBookings(data as any)
    setLoading(false)
  }

  useEffect(() => {
    fetchBookings()

    // Real-time subscription
    const channel = supabase
      .channel('admin-bookings')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
      }, () => fetchBookings())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleApprove = async (id: string) => {
    setActing(id)
    try {
      await adminApproveBooking(id)
      await fetch('/api/bookings/notify-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id }),
      })
    } catch (e) {
      alert('Error approving booking')
    } finally {
      setActing(null)
    }
  }

  const handleDecline = async (id: string) => {
    const reason = prompt('Decline reason (optional):') ?? ''
    setActing(id)
    try {
      await adminDeclineBooking(id, reason)
      await fetch('/api/bookings/notify-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id, type: 'declined' }),
      })
    } catch (e) {
      alert('Error declining booking')
    } finally {
      setActing(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Bookings</h1>
        <span className="flex items-center gap-2 text-sm text-green-600">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>

      <div className="space-y-4">
        {bookings.length === 0 && (
          <p className="text-center text-gray-400 py-12">Bookings නැහැ</p>
        )}

        {bookings.map((b) => {
          const st = STATUS_LABELS[b.status]
          const isActing = acting === b.id

          return (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">

                {/* Left: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${st.color}`}>
                      {st.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(b.created_at).toLocaleString('en-GB')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs mb-0.5">Customer</p>
                      <p className="font-medium">{b.customers?.name}</p>
                      <p className="text-gray-500 text-xs">{b.customers?.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-0.5">Vehicle</p>
                      <p className="font-medium">{b.vehicles?.name}</p>
                      <p className="text-gray-500 text-xs">
                        {(b.vehicles as any)?.owners?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-0.5">Dates</p>
                      <p className="font-medium">{b.start_date}</p>
                      <p className="text-gray-500 text-xs">→ {b.end_date}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-0.5">Total</p>
                      <p className="font-medium text-green-700">
                        Rs. {b.total_price?.toLocaleString()}
                      </p>
                      {b.with_driver && (
                        <p className="text-xs text-blue-500">+ Driver</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: action buttons */}
                {b.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(b.id)}
                      disabled={!!isActing}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-xl font-medium disabled:opacity-50 transition"
                    >
                      {isActing ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleDecline(b.id)}
                      disabled={!!isActing}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm rounded-xl font-medium disabled:opacity-50 transition"
                    >
                      Decline
                    </button>
                  </div>
                )}

                {b.status === 'admin_approved' && (
                  <span className="text-xs text-blue-500 flex-shrink-0 self-center">
                    Partner action pending...
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}