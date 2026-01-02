import Stripe from 'stripe';
import { db } from '@/lib/db/client';
import { integrations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Gera URL do Stripe Dashboard para criar API key com permissões pré-configuradas
 */
export function getCreateApiKeyUrl(): string {
  const params = new URLSearchParams({
    name: "Builder's Garden",
    'permissions[]': 'rak_charge_read',
  });

  return `https://dashboard.stripe.com/apikeys/create?${params.toString()}`;
}

/**
 * Valida se uma API key do Stripe é válida e tem as permissões corretas
 */
export async function validateApiKey(apiKey: string): Promise<{
  valid: boolean;
  accountId?: string;
  error?: string;
}> {
  try {
    // Verifica se começa com rk_ (restricted key)
    if (!apiKey.startsWith('rk_')) {
      return {
        valid: false,
        error: 'Apenas Restricted API Keys são permitidas. A key deve começar com "rk_"',
      };
    }

    const stripe = new Stripe(apiKey, {
      apiVersion: '2024-12-18.acacia',
    });

    // Valida tentando listar charges (que é o que vamos usar de verdade)
    // Isso funciona com rak_charge_read permission
    const charges = await stripe.charges.list({ limit: 1 });

    // Se conseguiu listar, a key é válida
    // Extrai o account ID do header da resposta (se disponível)
    const accountId = charges.data[0]?.on_behalf_of || undefined;

    return {
      valid: true,
      accountId,
    };
  } catch (error: any) {
    console.error('Error validating Stripe API key:', error);

    if (error.code === 'api_key_expired') {
      return {
        valid: false,
        error: 'API key expirada. Crie uma nova no Stripe Dashboard.',
      };
    }

    if (error.statusCode === 401) {
      return {
        valid: false,
        error: 'API key inválida. Verifique se copiou corretamente.',
      };
    }

    if (error.statusCode === 403) {
      return {
        valid: false,
        error: 'API key não tem as permissões corretas. Certifique-se de criar com "Charges (read)".',
      };
    }

    return {
      valid: false,
      error: 'Erro ao validar API key. Tente novamente.',
    };
  }
}

/**
 * Obtém access token (API key) do banco
 */
async function getApiKey(userId: string): Promise<string> {
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
    const apiKey = await getApiKey(userId);

    const stripe = new Stripe(apiKey, {
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
    const apiKey = await getApiKey(userId);

    const stripe = new Stripe(apiKey, {
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
 * Desconecta a integração Stripe (marca como inativa)
 */
export async function disconnectStripe(userId: string): Promise<void> {
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
