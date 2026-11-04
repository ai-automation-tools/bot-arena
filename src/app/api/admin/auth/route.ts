import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  // No password configured means no admin login, never a built-in default.
  if (!adminPassword) {
    return NextResponse.json(
      { success: false, error: 'ADMIN_PASSWORD env var not configured' },
      { status: 503 }
    );
  }

  const { password } = await request.json();

  if (password === adminPassword) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { success: false, error: 'ACCESS DENIED: Invalid Credentials' },
    { status: 401 }
  );
}
