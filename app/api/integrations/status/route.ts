import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { integrations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Busca todas as integrações ativas do usuário
    const userIntegrations = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, session.userId),
          eq(integrations.isActive, true)
        )
      );

    // Organiza por provider
    const status = {
      googleAnalytics: {
        connected: false,
        propertyConfigured: false,
        propertyId: null as string | null,
      },
      stripe: {
        connected: false,
        stripeUserId: null as string | null,
      },
    };

    userIntegrations.forEach((integration) => {
      if (integration.provider === 'google_analytics') {
        status.googleAnalytics.connected = true;

        if (integration.metadata && typeof integration.metadata === 'object') {
          const metadata = integration.metadata as { propertyId?: string };
          if (metadata.propertyId) {
            status.googleAnalytics.propertyConfigured = true;
            status.googleAnalytics.propertyId = metadata.propertyId;
          }
        }
      }

      if (integration.provider === 'stripe') {
        status.stripe.connected = true;

        if (integration.metadata && typeof integration.metadata === 'object') {
          const metadata = integration.metadata as { stripeUserId?: string };
          if (metadata.stripeUserId) {
            status.stripe.stripeUserId = metadata.stripeUserId;
          }
        }
      }
    });

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching integrations status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations status' },
      { status: 500 }
    );
  }
}
