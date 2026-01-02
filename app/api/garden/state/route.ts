import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { gardens, plants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Busca jardim do usuário
    const [garden] = await db
      .select()
      .from(gardens)
      .where(eq(gardens.userId, session.userId))
      .limit(1);

    if (!garden) {
      return NextResponse.json({ error: 'Garden not found' }, { status: 404 });
    }

    // Busca todas as plantas do jardim
    const gardenPlants = await db
      .select()
      .from(plants)
      .where(eq(plants.gardenId, garden.id));

    return NextResponse.json({
      gridSize: garden.gridSize,
      totalGrowthPoints: garden.totalGrowthPoints,
      rank: garden.rank,
      isPublic: garden.isPublic,
      plants: gardenPlants.map(plant => ({
        id: plant.id,
        positionX: plant.positionX,
        positionY: plant.positionY,
        growthStage: plant.growthStage,
        growthPoints: plant.growthPoints,
        plantTypeId: plant.plantTypeId,
      })),
    });
  } catch (error) {
    console.error('Error fetching garden state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch garden state' },
      { status: 500 }
    );
  }
}
