import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, userType, newPassword } = await req.json();

    if (!userId || !userType || !newPassword) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Admin reset error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}