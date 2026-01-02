import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { validateApiKey } from '@/lib/integrations/stripe';
import { db } from '@/lib/db/client';
import { integrations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Remove espaços em branco
    const cleanApiKey = apiKey.trim();

    // Valida API key
    const validation = await validateApiKey(cleanApiKey);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

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
          accessToken: cleanApiKey,
          refreshToken: null,
          expiresAt: null,
          isActive: true,
          metadata: { accountId: validation.accountId },
        })
        .where(eq(integrations.id, existingIntegration.id));
    } else {
      // Cria nova integração
      await db.insert(integrations).values({
        userId: session.userId,
        provider: 'stripe',
        accessToken: cleanApiKey,
        refreshToken: null,
        expiresAt: null,
        scope: 'read_only',
        isActive: true,
        metadata: { accountId: validation.accountId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error connecting Stripe:', error);
    return NextResponse.json(
      { error: 'Failed to connect Stripe' },
      { status: 500 }
    );
  }
}
