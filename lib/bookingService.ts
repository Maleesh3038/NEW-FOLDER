import { supabase } from './supabase'

export type BookingStatus = 'pending' | 'admin_approved' | 'confirmed' | 'declined'

// Admin: pending → admin_approved
export async function adminApproveBooking(bookingId: string) {
  const { error } = await supabase.rpc('update_booking_status', {
    booking_id: bookingId,
    new_status: 'admin_approved',
  })
  if (error) throw error
}

// Admin: pending → declined
export async function adminDeclineBooking(bookingId: string, reason: string) {
  const { error } = await supabase.rpc('update_booking_status', {
    booking_id: bookingId,
    new_status: 'declined',
    reason,
  })
  if (error) throw error
}

// Partner: admin_approved → confirmed
export async function partnerConfirmBooking(bookingId: string) {
  const { error } = await supabase.rpc('update_booking_status', {
    booking_id: bookingId,
    new_status: 'confirmed',
  })
  if (error) throw error
}

// Partner: admin_approved → declined
export async function partnerDeclineBooking(bookingId: string, reason: string) {
  const { error } = await supabase.rpc('update_booking_status', {
    booking_id: bookingId,
    new_status: 'declined',
    reason,
  })
  if (error) throw error
}

// Realtime subscription — admin dashboard
export function subscribeBookings(callback: (booking: any) => void) {
  return supabase
    .channel('bookings-realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bookings',
    }, (payload) => callback(payload.new))
    .subscribe()
}