import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { exchangeCodeForTokens, listAnalyticsProperties } from '@/lib/integrations/google-analytics';
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

    // Usuário cancelou a autorização
    if (error) {
      const settingsUrl = new URL('/settings/integrations', request.url);
      settingsUrl.searchParams.set('error', 'google_analytics_denied');
      return NextResponse.redirect(settingsUrl);
    }

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    // Valida state (CSRF protection)
    const storedState = request.cookies.get('ga_oauth_state')?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 });
    }

    // Troca código por tokens
    const { accessToken, refreshToken, expiresAt } = await exchangeCodeForTokens(code);

    // Salva tokens temporariamente para buscar properties
    // (vamos substituir logo depois com o propertyId escolhido)
    const [existingIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, session.userId),
          eq(integrations.provider, 'google_analytics')
        )
      )
      .limit(1);

    if (existingIntegration) {
      // Atualiza integração existente
      await db
        .update(integrations)
        .set({
          accessToken,
          refreshToken,
          expiresAt,
          isActive: true,
          metadata: {}, // Limpa metadata anterior, será preenchido depois
        })
        .where(eq(integrations.id, existingIntegration.id));
    } else {
      // Cria nova integração
      await db.insert(integrations).values({
        userId: session.userId,
        provider: 'google_analytics',
        accessToken,
        refreshToken,
        expiresAt,
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        isActive: true,
        metadata: {},
      });
    }

    // Redireciona para página de seleção de property
    const propertySelectionUrl = new URL('/settings/integrations/google-analytics/select-property', request.url);

    const response = NextResponse.redirect(propertySelectionUrl);

    // Remove o cookie de state
    response.cookies.delete('ga_oauth_state');

    return response;
  } catch (error) {
    console.error('Error handling Google Analytics OAuth callback:', error);

    const settingsUrl = new URL('/settings/integrations', request.url);
    settingsUrl.searchParams.set('error', 'google_analytics_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
