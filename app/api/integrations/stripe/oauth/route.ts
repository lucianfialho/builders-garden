import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { exchangeCodeForToken } from '@/lib/integrations/stripe';
import { db } from '@/lib/db/client';
import { integrations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Usuário cancelou ou houve erro
    if (error) {
      const settingsUrl = new URL('/settings/integrations', request.url);
      settingsUrl.searchParams.set('error', 'stripe_denied');
      return NextResponse.redirect(settingsUrl);
    }

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    // Valida state (CSRF protection)
    const storedState = request.cookies.get('stripe_oauth_state')?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 });
    }

    // Troca código por access token
    const { accessToken, stripeUserId } = await exchangeCodeForToken(code);

    // Salva ou atualiza integração
    const [existingIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, session.userId),
          eq(integrations.provider, 'stripe')
        )
      )
      .limit(1);

    if (existingIntegration) {
      // Atualiza integração existente
      await db
        .update(integrations)
        .set({
          accessToken,
          refreshToken: null, // Stripe não usa refresh token
          expiresAt: null, // Token não expira (até que seja revogado)
          isActive: true,
          metadata: { stripeUserId },
        })
        .where(eq(integrations.id, existingIntegration.id));
    } else {
      // Cria nova integração
      await db.insert(integrations).values({
        userId: session.userId,
        provider: 'stripe',
        accessToken,
        refreshToken: null,
        expiresAt: null,
        scope: 'read_only',
        isActive: true,
        metadata: { stripeUserId },
      });
    }

    // Redireciona de volta para configurações com sucesso
    const settingsUrl = new URL('/settings/integrations', request.url);
    settingsUrl.searchParams.set('success', 'stripe_connected');

    const response = NextResponse.redirect(settingsUrl);

    // Remove o cookie de state
    response.cookies.delete('stripe_oauth_state');

    return response;
  } catch (error) {
    console.error('Error handling Stripe OAuth callback:', error);

    const settingsUrl = new URL('/settings/integrations', request.url);
    settingsUrl.searchParams.set('error', 'stripe_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
