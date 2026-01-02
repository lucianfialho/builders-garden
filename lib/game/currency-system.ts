import { db } from '@/lib/db/client';
import { currency } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Adiciona seeds à conta do usuário
 */
export async function addSeeds(userId: string, amount: number): Promise<number> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const [userCurrency] = await db
    .select()
    .from(currency)
    .where(eq(currency.userId, userId))
    .limit(1);

  if (!userCurrency) {
    throw new Error('Currency record not found');
  }

  const newSeeds = userCurrency.seeds + amount;
  const newLifetimeSeeds = userCurrency.lifetimeSeeds + amount;

  await db
    .update(currency)
    .set({
      seeds: newSeeds,
      lifetimeSeeds: newLifetimeSeeds,
    })
    .where(eq(currency.id, userCurrency.id));

  return newSeeds;
}

/**
 * Remove seeds da conta do usuário (para compras)
 */
export async function spendSeeds(userId: string, amount: number): Promise<number> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const [userCurrency] = await db
    .select()
    .from(currency)
    .where(eq(currency.userId, userId))
    .limit(1);

  if (!userCurrency) {
    throw new Error('Currency record not found');
  }

  if (userCurrency.seeds < amount) {
    throw new Error('Insufficient seeds');
  }

  const newSeeds = userCurrency.seeds - amount;

  await db
    .update(currency)
    .set({ seeds: newSeeds })
    .where(eq(currency.id, userCurrency.id));

  return newSeeds;
}

/**
 * Obtém saldo atual de seeds
 */
export async function getSeeds(userId: string): Promise<{
  seeds: number;
  lifetimeSeeds: number;
}> {
  const [userCurrency] = await db
    .select()
    .from(currency)
    .where(eq(currency.userId, userId))
    .limit(1);

  if (!userCurrency) {
    throw new Error('Currency record not found');
  }

  return {
    seeds: userCurrency.seeds,
    lifetimeSeeds: userCurrency.lifetimeSeeds,
  };
}
