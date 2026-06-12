// app/api/auth/admin-reset/route.ts  ← REPLACE existing file
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Use anon key — works without service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'drivo-admin-2026';

export async function POST(req: NextRequest) {
  try {
    const { userId, userType, newPassword, adminSecret } = await req.json();

    // Auth check
    if (!adminSecret || adminSecret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!userId || !userType || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const table = userType === 'owner' ? 'owners' : 'customers';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const { error } = await supabase
      .from(table)
      .update({ password: hashedPassword })
      .eq('id', userId);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message || 'Failed to reset password' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Admin reset error:', error);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}