import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // Check owner or customer
    let userType = '';
    let userName = '';

    const { data: owner } = await supabase
      .from('owners')
      .select('id, email, shop_name')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (owner) {
      userType = 'owner';
      userName = owner.shop_name || 'Partner';
    } else {
      const { data: customer } = await supabase
        .from('customers')
        .select('id, email, first_name')
        .eq('email', email.toLowerCase().trim())
        .single();
      if (customer) {
        userType = 'customer';
        userName = customer.first_name || 'Customer';
      }
    }

    if (!userType) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing unused OTPs for this email
    await supabase
      .from('password_reset_otps')
      .delete()
      .eq('email', email.toLowerCase().trim())
      .eq('used', false);

    // Save new OTP
    await supabase.from('password_reset_otps').insert({
      email: email.toLowerCase().trim(),
      user_type: userType,
      otp,
      expires_at: expires_at.toISOString(),
    });

    // Send email via Resend
    await resend.emails.send({
      from: 'Drivo LK <onboarding@resend.dev>',
      to: email,
      subject: `${otp} — Your Drivo Password Reset Code`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
          <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <div style="background:#111;padding:28px 32px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;background:#111;border-radius:10px;border:2px solid #333;display:inline-block;"></div>
                <span style="color:#fff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">drivo</span>
                <span style="background:#333;color:#fff;font-size:9px;font-weight:900;padding:2px 6px;border-radius:4px;text-transform:uppercase;">LK</span>
              </div>
            </div>

            <!-- Body -->
            <div style="padding:32px;">
              <p style="color:#64748b;font-size:14px;margin:0 0 8px;">Hi ${userName},</p>
              <h2 style="color:#0f172a;font-size:20px;font-weight:900;margin:0 0 20px;">Your Password Reset Code</h2>
              
              <!-- OTP Box -->
              <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin:20px 0;">
                <p style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">One-Time Password</p>
                <div style="font-size:40px;font-weight:900;letter-spacing:12px;color:#0f172a;font-family:monospace;">${otp}</div>
                <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">Valid for <strong>10 minutes</strong></p>
              </div>

              <p style="color:#64748b;font-size:13px;line-height:1.6;">Enter this code on the Drivo password reset page to set your new password.</p>
              
              <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:16px 0;">
                <p style="color:#92400e;font-size:12px;font-weight:600;margin:0;">⚠️ If you didn't request this, ignore this email. Your password will not change.</p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="color:#94a3b8;font-size:11px;margin:0;">© 2026 Drivo LK · <a href="https://thedrivo.com" style="color:#64748b;">thedrivo.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}