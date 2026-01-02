import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { integrations, metrics } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { fetchDailySessions } from '@/lib/integrations/google-analytics';
import { fetchDailyRevenue, fetchDailyPayments } from '@/lib/integrations/stripe';
import {
  calculateGrowthPoints,
  calculateSeedsEarned,
  applyGrowthToGarden,
  updateGardenRank,
} from '@/lib/game/growth-engine';
import { addSeeds } from '@/lib/game/currency-system';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verifica se tem integrações ativas
    const userIntegrations = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, session.userId),
          eq(integrations.isActive, true)
        )
      );

    const hasGA = userIntegrations.some(i => i.provider === 'google_analytics');
    const hasStripe = userIntegrations.some(i => i.provider === 'stripe');

    if (!hasGA && !hasStripe) {
      return NextResponse.json(
        { error: 'Nenhuma integração ativa. Conecte Google Analytics ou Stripe primeiro.' },
        { status: 400 }
      );
    }

    // Data de ontem (00:00 UTC)
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    let gaSessions = 0;
    let gaUsers = 0;
    let stripeRevenue = 0;
    let stripePayments = 0;

    // Busca métricas do Google Analytics
    if (hasGA) {
      try {
        gaSessions = await fetchDailySessions(session.userId, yesterday);
        gaUsers = gaSessions; // Por enquanto, usa sessions como proxy
      } catch (error) {
        console.error('Error fetching GA metrics:', error);
        // Continua mesmo se GA falhar
      }
    }

    // Busca métricas do Stripe
    if (hasStripe) {
      try {
        stripeRevenue = await fetchDailyRevenue(session.userId, yesterday);
        stripePayments = await fetchDailyPayments(session.userId, yesterday);
      } catch (error) {
        console.error('Error fetching Stripe metrics:', error);
        // Continua mesmo se Stripe falhar
      }
    }

    // Calcula pontos e seeds
    const growthPointsEarned = calculateGrowthPoints(gaSessions, stripeRevenue);
    const seedsEarned = calculateSeedsEarned(gaSessions, stripeRevenue);

    // Salva snapshot de métricas (ou atualiza se já existir)
    await db
      .insert(metrics)
      .values({
        userId: session.userId,
        date: yesterday,
        gaSessions,
        gaUsers,
        stripeRevenue,
        stripePayments,
        growthPointsEarned,
        seedsEarned,
      })
      .onConflictDoUpdate({
        target: [metrics.userId, metrics.date],
        set: {
          gaSessions,
          gaUsers,
          stripeRevenue,
          stripePayments,
          growthPointsEarned,
          seedsEarned,
        },
      });

    // Aplica crescimento ao jardim
    const { plantsGrown, plantsUpgraded } = await applyGrowthToGarden(
      session.userId,
      growthPointsEarned
    );

    // Credita seeds
    let newSeeds = 0;
    if (seedsEarned > 0) {
      newSeeds = await addSeeds(session.userId, seedsEarned);
    }

    // Atualiza rank
    const newRank = await updateGardenRank(session.userId);

    return NextResponse.json({
      success: true,
      metrics: {
        gaSessions,
        stripeRevenue,
        stripePayments,
      },
      rewards: {
        growthPointsEarned,
        seedsEarned,
        newSeeds,
      },
      garden: {
        plantsGrown,
        plantsUpgraded,
        newRank,
      },
    });
  } catch (error: any) {
    console.error('Error syncing metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync metrics' },
      { status: 500 }
    );
  }
}
