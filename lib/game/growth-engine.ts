import { db } from '@/lib/db/client';
import { plants, gardens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Pontos necessários para avançar cada estágio
const GROWTH_THRESHOLDS = {
  0: 100,   // Seed → Sprout = 100 pontos
  1: 200,   // Sprout → Young = 200 pontos
  2: 400,   // Young → Mature = 400 pontos
  3: 800,   // Mature → Full Grown = 800 pontos
  4: 0,     // Full Grown (máximo)
};

/**
 * Calcula pontos de crescimento baseado nas métricas do dia
 *
 * Fórmula: (sessões × 1) + (receita × 10)
 *
 * Exemplos:
 * - 100 sessions + $500 = 100 + 5000 = 5,100 pontos
 * - 1000 sessions + $10,000 = 1000 + 100,000 = 101,000 pontos
 */
export function calculateGrowthPoints(
  gaSessions: number,
  stripeRevenue: number
): number {
  const sessionPoints = gaSessions * 1;
  const revenuePoints = stripeRevenue * 10;

  return sessionPoints + revenuePoints;
}

/**
 * Calcula seeds ganhas baseado em milestones
 *
 * Milestones:
 * - 100 sessions = +50 seeds
 * - 500 sessions = +200 seeds
 * - 1000 sessions = +500 seeds
 * - $1,000 revenue = +500 seeds
 * - $5,000 revenue = +2000 seeds
 * - $10,000 revenue = +5000 seeds
 */
export function calculateSeedsEarned(
  gaSessions: number,
  stripeRevenue: number
): number {
  let seeds = 0;

  // Milestones de sessões
  if (gaSessions >= 1000) {
    seeds += 500;
  } else if (gaSessions >= 500) {
    seeds += 200;
  } else if (gaSessions >= 100) {
    seeds += 50;
  }

  // Milestones de receita
  if (stripeRevenue >= 10000) {
    seeds += 5000;
  } else if (stripeRevenue >= 5000) {
    seeds += 2000;
  } else if (stripeRevenue >= 1000) {
    seeds += 500;
  }

  return seeds;
}

/**
 * Aplica pontos de crescimento ao jardim do usuário
 * Distribui os pontos igualmente entre todas as plantas
 */
export async function applyGrowthToGarden(
  userId: string,
  growthPoints: number
): Promise<{
  plantsGrown: number;
  plantsUpgraded: number;
}> {
  // Busca jardim do usuário
  const [garden] = await db
    .select()
    .from(gardens)
    .where(eq(gardens.userId, userId))
    .limit(1);

  if (!garden) {
    throw new Error('Garden not found');
  }

  // Busca todas as plantas do jardim
  const gardenPlants = await db
    .select()
    .from(plants)
    .where(eq(plants.gardenId, garden.id));

  if (gardenPlants.length === 0) {
    console.log(`No plants to grow in garden ${garden.id}`);
    return { plantsGrown: 0, plantsUpgraded: 0 };
  }

  // Distribui pontos igualmente entre as plantas
  const pointsPerPlant = Math.floor(growthPoints / gardenPlants.length);

  let plantsGrown = 0;
  let plantsUpgraded = 0;

  for (const plant of gardenPlants) {
    // Pula plantas que já estão no estágio máximo
    if (plant.growthStage >= 4) {
      continue;
    }

    const newPoints = plant.growthPoints + pointsPerPlant;
    const currentStage = plant.growthStage;
    let newStage = currentStage;

    // Verifica se passou do threshold para próximo estágio
    const threshold = GROWTH_THRESHOLDS[currentStage as keyof typeof GROWTH_THRESHOLDS];

    if (newPoints >= threshold && threshold > 0) {
      newStage = currentStage + 1;
      plantsUpgraded++;
    }

    // Atualiza planta
    await db
      .update(plants)
      .set({
        growthPoints: newPoints,
        growthStage: newStage,
      })
      .where(eq(plants.id, plant.id));

    plantsGrown++;
  }

  // Atualiza total de growth points do jardim
  await db
    .update(gardens)
    .set({
      totalGrowthPoints: garden.totalGrowthPoints + growthPoints,
    })
    .where(eq(gardens.id, garden.id));

  return { plantsGrown, plantsUpgraded };
}

/**
 * Calcula o rank do jardim baseado em totalGrowthPoints
 * Pode ser usado para leaderboard
 */
export async function updateGardenRank(userId: string): Promise<number> {
  const [garden] = await db
    .select()
    .from(gardens)
    .where(eq(gardens.userId, userId))
    .limit(1);

  if (!garden) {
    throw new Error('Garden not found');
  }

  // Conta quantos jardins têm mais pontos
  const higherGardens = await db
    .select()
    .from(gardens)
    .where(eq(gardens.isPublic, true));

  const rank = higherGardens.filter(
    g => g.totalGrowthPoints > garden.totalGrowthPoints
  ).length + 1;

  // Atualiza rank
  await db
    .update(gardens)
    .set({ rank })
    .where(eq(gardens.id, garden.id));

  return rank;
}
