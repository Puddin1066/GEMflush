import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';

/**
 * GET /api/user
 * Returns the authenticated user's data
 * Authentication is handled by getUser() which checks session cookie
 */
export async function GET() {
  try {
    const user = await getUser();
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
