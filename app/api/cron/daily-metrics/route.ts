import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { integrations, metrics, users } from '@/lib/db/schema';
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

/**
 * Cron Job que roda diariamente às 01:00 UTC
 * Sincroniza métricas de todos os usuários e aplica crescimento
 *
 * Protegido por CRON_SECRET (apenas Vercel Cron pode chamar)
 */
export async function GET(request: NextRequest) {
  try {
    // Valida CRON_SECRET (proteção)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CRON] Daily metrics sync started');

    // Data de ontem (00:00-23:59 UTC)
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    // Busca todos os usuários com integrações ativas
    const activeIntegrations = await db
      .select({
        userId: integrations.userId,
        provider: integrations.provider,
      })
      .from(integrations)
      .where(eq(integrations.isActive, true));

    // Agrupa por userId
    const usersWithIntegrations = new Map<string, Set<string>>();

    activeIntegrations.forEach(integration => {
      if (!usersWithIntegrations.has(integration.userId)) {
        usersWithIntegrations.set(integration.userId, new Set());
      }
      usersWithIntegrations.get(integration.userId)!.add(integration.provider);
    });

    let processed = 0;
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    // Processa cada usuário
    for (const [userId, providers] of usersWithIntegrations) {
      processed++;

      try {
        const hasGA = providers.has('google_analytics');
        const hasStripe = providers.has('stripe');

        let gaSessions = 0;
        let gaUsers = 0;
        let stripeRevenue = 0;
        let stripePayments = 0;

        // Busca métricas do Google Analytics
        if (hasGA) {
          try {
            gaSessions = await fetchDailySessions(userId, yesterday);
            gaUsers = gaSessions;
          } catch (error: any) {
            console.error(`[CRON] GA error for user ${userId}:`, error.message);
            // Continua mesmo se GA falhar
          }
        }

        // Busca métricas do Stripe
        if (hasStripe) {
          try {
            stripeRevenue = await fetchDailyRevenue(userId, yesterday);
            stripePayments = await fetchDailyPayments(userId, yesterday);
          } catch (error: any) {
            console.error(`[CRON] Stripe error for user ${userId}:`, error.message);
            // Continua mesmo se Stripe falhar
          }
        }

        // Calcula pontos e seeds
        const growthPointsEarned = calculateGrowthPoints(gaSessions, stripeRevenue);
        const seedsEarned = calculateSeedsEarned(gaSessions, stripeRevenue);

        // Salva snapshot de métricas
        await db.insert(metrics).values({
          userId,
          date: yesterday,
          gaSessions,
          gaUsers,
          stripeRevenue,
          stripePayments,
          growthPointsEarned,
          seedsEarned,
        });

        // Aplica crescimento ao jardim
        if (growthPointsEarned > 0) {
          await applyGrowthToGarden(userId, growthPointsEarned);
        }

        // Credita seeds
        if (seedsEarned > 0) {
          await addSeeds(userId, seedsEarned);
        }

        // Atualiza rank
        await updateGardenRank(userId);

        successful++;
        console.log(`[CRON] User ${userId}: ${growthPointsEarned} points, ${seedsEarned} seeds`);
      } catch (error: any) {
        failed++;
        const errorMsg = `User ${userId}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`[CRON] Error processing user ${userId}:`, error);
      }
    }

    console.log('[CRON] Daily metrics sync completed');

    return NextResponse.json({
      success: true,
      processed,
      successful,
      failed,
      errors: errors.slice(0, 10), // Retorna apenas primeiros 10 erros
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[CRON] Critical error:', error);
    return NextResponse.json(
      { error: error.message || 'Critical error during cron execution' },
      { status: 500 }
    );
  }
}
