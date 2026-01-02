import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAuthorizationUrl } from '@/lib/integrations/stripe';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Gera state para validação CSRF
    const state = randomBytes(32).toString('hex');

    // Armazena state em cookie temporário
    const response = NextResponse.redirect(getAuthorizationUrl(state));

    response.cookies.set('stripe_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutos
    });

    return response;
  } catch (error) {
    console.error('Error initiating Stripe OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Stripe connection' },
      { status: 500 }
    );
  }
}
