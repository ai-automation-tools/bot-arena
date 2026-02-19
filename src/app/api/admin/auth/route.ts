import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    // Fallback to legacy hardcoded value if env var not set (dev convenience)
    if (password === 'admin_override') {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { success: false, error: 'ADMIN_PASSWORD env var not configured' },
      { status: 401 }
    );
  }

  if (password === adminPassword) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { success: false, error: 'ACCESS DENIED: Invalid Credentials' },
    { status: 401 }
  );
}
