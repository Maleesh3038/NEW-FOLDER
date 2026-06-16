const INSTANCE = process.env.ULTRAMSG_INSTANCE!
const TOKEN    = process.env.ULTRAMSG_TOKEN!
const BASE_URL = `https://api.ultramsg.com/instance${INSTANCE}`

async function sendWhatsApp(phone: string, message: string) {
  const res = await fetch(`${BASE_URL}/messages/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      token:  TOKEN,
      to:     `+${phone}`,
      body:   message,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('UltraMsg send failed:', err)
    throw new Error('WhatsApp send failed')
  }

  return res.json()
}

// ── Message 1: Admin notify
export async function notifyAdminNewBooking(booking: {
  id: string
  customerName: string
  vehicleName: string
  startDate: string
  endDate: string
  totalPrice: number
  withDriver: boolean
}) {
  const msg = `🚗 *නව Booking එකක්!*

👤 Customer: ${booking.customerName}
🚙 Vehicle: ${booking.vehicleName}
📅 ${booking.startDate} → ${booking.endDate}
💰 Rs. ${booking.totalPrice.toLocaleString()}
🧑‍✈️ Driver: ${booking.withDriver ? 'ඔව්' : 'නැහැ'}

🔗 https://thedrivo.com/admin
ID: ${booking.id}`

  await sendWhatsApp(process.env.DRIVO_ADMIN_WHATSAPP!, msg)
}

// ── Message 2: Partner notify
export async function notifyPartnerBookingApproved(
  partnerPhone: string,
  booking: {
    id: string
    customerName: string
    vehicleName: string
    startDate: string
    endDate: string
    totalPrice: number
    withDriver: boolean
    deliveryAddress?: string
  }
) {
  const msg = `✅ *Booking Approval — Action Required*

Drivo ඔබේ vehicle booking approve කළා.

🚙 Vehicle: ${booking.vehicleName}
👤 Customer: ${booking.customerName}
📅 ${booking.startDate} → ${booking.endDate}
💰 Rs. ${booking.totalPrice.toLocaleString()}
🧑‍✈️ Driver: ${booking.withDriver ? 'ඔව්' : 'නැහැ'}
${booking.deliveryAddress ? `📍 Delivery: ${booking.deliveryAddress}` : ''}

*Confirm හෝ Decline:*
🔗 https://thedrivo.com/partner/bookings/${booking.id}`

  await sendWhatsApp(partnerPhone, msg)
}

// ── Message 3: Customer confirmed
export async function notifyCustomerBookingConfirmed(
  customerPhone: string,
  booking: {
    vehicleName: string
    startDate: string
    endDate: string
    partnerName: string
    partnerPhone: string
  }
) {
  const msg = `🎉 *Booking Confirmed!*

ඔබේ booking confirm කළා!

🚙 ${booking.vehicleName}
📅 ${booking.startDate} → ${booking.endDate}
👤 Partner: ${booking.partnerName}
📞 ${booking.partnerPhone}

ස්තූතියි Drivo LK! 🌐 thedrivo.com`

  await sendWhatsApp(customerPhone, msg)
}

// ── Message 4: Customer declined
export async function notifyCustomerBookingDeclined(
  customerPhone: string,
  booking: {
    vehicleName: string
    startDate: string
    endDate: string
  }
) {
  const msg = `😔 *Booking Update*

අවාසනාවකට ඔබේ booking decline කළා.

🚙 ${booking.vehicleName}
📅 ${booking.startDate} → ${booking.endDate}

වෙනත් vehicle select කරන්න:
🌐 thedrivo.com`

  await sendWhatsApp(customerPhone, msg)
}