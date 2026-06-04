// app/api/auth/login/route.ts
// Replace loginOwner/loginCustomer supabase calls with this API route
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, password, userType } = await req.json();

    if (!email || !password || !userType) {
      return NextResponse.json({ error: 'Email, password and userType required' }, { status: 400 });
    }

    const table = userType === 'owner' ? 'owners' : 'customers';

    const { data: user, error } = await supabase
      .from(table)
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // If password column exists and has a hash — bcrypt compare
    if (user.password) {
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
    } else {
      // Legacy: no password set yet — allow login and save hashed password
      const hashed = await bcrypt.hash(password, 12);
      await supabase.from(table).update({ password: hashed }).eq('id', user.id);
    }

    return NextResponse.json({ success: true, data: user });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}