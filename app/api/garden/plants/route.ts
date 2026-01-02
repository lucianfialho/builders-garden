import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { gardens, plants, currency } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { positionX, positionY } = body;

    // Validações
    if (positionX === undefined || positionY === undefined) {
      return NextResponse.json(
        { error: 'Position X and Y are required' },
        { status: 400 }
      );
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

    // Valida posição (dentro do grid)
    if (
      positionX < 0 ||
      positionX >= garden.gridSize ||
      positionY < 0 ||
      positionY >= garden.gridSize
    ) {
      return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
    }

    // Verifica se já existe planta nessa posição
    const [existingPlant] = await db
      .select()
      .from(plants)
      .where(
        and(
          eq(plants.gardenId, garden.id),
          eq(plants.positionX, positionX),
          eq(plants.positionY, positionY)
        )
      )
      .limit(1);

    if (existingPlant) {
      return NextResponse.json(
        { error: 'Position already occupied' },
        { status: 400 }
      );
    }

    // Verifica se usuário tem seeds
    const [userCurrency] = await db
      .select()
      .from(currency)
      .where(eq(currency.userId, session.userId))
      .limit(1);

    if (!userCurrency || userCurrency.seeds < 1) {
      return NextResponse.json(
        { error: 'Not enough seeds' },
        { status: 400 }
      );
    }

    // Deduz 1 seed
    await db
      .update(currency)
      .set({ seeds: userCurrency.seeds - 1 })
      .where(eq(currency.id, userCurrency.id));

    // Cria planta
    const [newPlant] = await db
      .insert(plants)
      .values({
        gardenId: garden.id,
        plantTypeId: 'default', // Por enquanto, apenas um tipo
        positionX,
        positionY,
        growthStage: 0, // Estágio seed
        growthPoints: 0,
        metadata: {},
      })
      .returning();

    return NextResponse.json({
      success: true,
      plant: {
        id: newPlant.id,
        positionX: newPlant.positionX,
        positionY: newPlant.positionY,
        growthStage: newPlant.growthStage,
        growthPoints: newPlant.growthPoints,
        plantTypeId: newPlant.plantTypeId,
      },
      remainingSeeds: userCurrency.seeds - 1,
    });
  } catch (error) {
    console.error('Error planting seed:', error);
    return NextResponse.json({ error: 'Failed to plant seed' }, { status: 500 });
  }
}
