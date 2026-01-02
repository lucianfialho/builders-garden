import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { currency } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const [userCurrency] = await db
      .select()
      .from(currency)
      .where(eq(currency.userId, session.userId))
      .limit(1);

    if (!userCurrency) {
      return NextResponse.json({ error: 'Currency not found' }, { status: 404 });
    }

    return NextResponse.json({
      seeds: userCurrency.seeds,
      lifetimeSeeds: userCurrency.lifetimeSeeds,
    });
  } catch (error) {
    console.error('Error fetching currency balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
