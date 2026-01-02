import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { listAnalyticsProperties } from '@/lib/integrations/google-analytics';
import { db } from '@/lib/db/client';
import { integrations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// Lista todas as properties disponíveis
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verifica se a integração existe
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, session.userId),
          eq(integrations.provider, 'google_analytics'),
          eq(integrations.isActive, true)
        )
      )
      .limit(1);

    if (!integration) {
      return NextResponse.json(
        { error: 'Google Analytics not connected' },
        { status: 404 }
      );
    }

    const properties = await listAnalyticsProperties(session.userId);

    return NextResponse.json({ properties });
  } catch (error) {
    console.error('Error listing Google Analytics properties:', error);
    return NextResponse.json(
      { error: 'Failed to list properties' },
      { status: 500 }
    );
  }
}

// Salva a property escolhida
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { propertyId } = body;

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }

    // Atualiza metadata com o propertyId escolhido
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, session.userId),
          eq(integrations.provider, 'google_analytics'),
          eq(integrations.isActive, true)
        )
      )
      .limit(1);

    if (!integration) {
      return NextResponse.json(
        { error: 'Google Analytics not connected' },
        { status: 404 }
      );
    }

    await db
      .update(integrations)
      .set({
        metadata: { propertyId },
      })
      .where(eq(integrations.id, integration.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving Google Analytics property:', error);
    return NextResponse.json(
      { error: 'Failed to save property' },
      { status: 500 }
    );
  }
}
