// app/api/auth/hash-password/route.ts  ← NEW file
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });
    const hash = await bcrypt.hash(password, 12);
    return NextResponse.json({ hash });
  } catch {
    return NextResponse.json({ error: 'Hash failed' }, { status: 500 });
  }
}