import Stripe from 'stripe';
import { db } from '@/lib/db/client';
import { integrations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Gera URL de autorização OAuth para Stripe Connect
 */
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.STRIPE_CLIENT_ID!,
    scope: 'read_only',
    redirect_uri: process.env.STRIPE_REDIRECT_URI!,
    state,
  });

  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

/**
 * Troca o código de autorização por access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  stripeUserId: string;
}> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
  });

  const response = await stripe.oauth.token({
    grant_type: 'authorization_code',
    code,
  });

  return {
    accessToken: response.access_token,
    stripeUserId: response.stripe_user_id,
  };
}

/**
 * Obtém access token do banco
 */
async function getAccessToken(userId: string): Promise<string> {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.provider, 'stripe'),
        eq(integrations.isActive, true)
      )
    )
    .limit(1);

  if (!integration) {
    throw new Error('Stripe integration not found');
  }

  return integration.accessToken;
}

/**
 * Busca receita total do Stripe para uma data específica
 */
export async function fetchDailyRevenue(userId: string, date: Date): Promise<number> {
  try {
    const accessToken = await getAccessToken(userId);

    const stripe = new Stripe(accessToken, {
      apiVersion: '2024-12-18.acacia',
    });

    // Define range da data (00:00 - 23:59 UTC)
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
    const endTimestamp = Math.floor(endOfDay.getTime() / 1000);

    // Busca todos os charges (pagamentos) do dia
    const charges = await stripe.charges.list({
      created: {
        gte: startTimestamp,
        lte: endTimestamp,
      },
      limit: 100, // Pode precisar paginação para contas grandes
    });

    // Soma apenas charges bem-sucedidos
    const totalRevenue = charges.data
      .filter(charge => charge.status === 'succeeded')
      .reduce((sum, charge) => sum + charge.amount, 0);

    // Converte de centavos para dólares
    return totalRevenue / 100;
  } catch (error) {
    console.error('Error fetching Stripe revenue:', error);
    throw error;
  }
}

/**
 * Busca número total de pagamentos (transactions) do dia
 */
export async function fetchDailyPayments(userId: string, date: Date): Promise<number> {
  try {
    const accessToken = await getAccessToken(userId);

    const stripe = new Stripe(accessToken, {
      apiVersion: '2024-12-18.acacia',
    });

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
    const endTimestamp = Math.floor(endOfDay.getTime() / 1000);

    const charges = await stripe.charges.list({
      created: {
        gte: startTimestamp,
        lte: endTimestamp,
      },
      limit: 100,
    });

    // Conta apenas charges bem-sucedidos
    return charges.data.filter(charge => charge.status === 'succeeded').length;
  } catch (error) {
    console.error('Error fetching Stripe payments:', error);
    throw error;
  }
}

/**
 * Desconecta a conta Stripe (revoga acesso)
 */
export async function disconnectStripe(userId: string): Promise<void> {
  const accessToken = await getAccessToken(userId);

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
  });

  // Busca o stripe_user_id do metadata
  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.provider, 'stripe'),
        eq(integrations.isActive, true)
      )
    )
    .limit(1);

  if (integration?.metadata && typeof integration.metadata === 'object') {
    const metadata = integration.metadata as { stripeUserId?: string };
    if (metadata.stripeUserId) {
      await stripe.oauth.deauthorize({
        client_id: process.env.STRIPE_CLIENT_ID!,
        stripe_user_id: metadata.stripeUserId,
      });
    }
  }

  // Marca como inativa no banco
  await db
    .update(integrations)
    .set({ isActive: false })
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.provider, 'stripe')
      )
    );
}
