import { google } from 'googleapis';
import { db } from '@/lib/db/client';
import { integrations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

// Cliente OAuth2
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Gera URL de autorização OAuth para Google Analytics
 */
export function getAuthorizationUrl(state: string): string {
  const oauth2Client = getOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent', // Força refresh token
  });
}

/**
 * Troca o código de autorização por tokens de acesso
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);

  return {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token!,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000),
  };
}

/**
 * Atualiza o access token usando o refresh token
 */
async function refreshAccessToken(userId: string): Promise<string> {
  // Busca integração atual
  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.provider, 'google_analytics'),
        eq(integrations.isActive, true)
      )
    )
    .limit(1);

  if (!integration || !integration.refreshToken) {
    throw new Error('Google Analytics integration not found or missing refresh token');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: integration.refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  const newAccessToken = credentials.access_token!;
  const newExpiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  // Atualiza no banco
  await db
    .update(integrations)
    .set({
      accessToken: newAccessToken,
      expiresAt: newExpiresAt,
    })
    .where(eq(integrations.id, integration.id));

  return newAccessToken;
}

/**
 * Obtém access token válido (refresh se necessário)
 */
async function getValidAccessToken(userId: string): Promise<string> {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.provider, 'google_analytics'),
        eq(integrations.isActive, true)
      )
    )
    .limit(1);

  if (!integration) {
    throw new Error('Google Analytics integration not found');
  }

  // Se token ainda é válido (com margem de 5 minutos), retorna
  if (integration.expiresAt && integration.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return integration.accessToken;
  }

  // Se expirou, faz refresh
  return await refreshAccessToken(userId);
}

/**
 * Busca número de sessões do Google Analytics para uma data específica
 */
export async function fetchDailySessions(userId: string, date: Date): Promise<number> {
  try {
    const accessToken = await getValidAccessToken(userId);

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const analyticsData = google.analyticsdata('v1beta');

    // Busca a property ID do metadata da integração
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, 'google_analytics'),
          eq(integrations.isActive, true)
        )
      )
      .limit(1);

    if (!integration?.metadata || typeof integration.metadata !== 'object') {
      throw new Error('Google Analytics property ID not found in integration metadata');
    }

    const metadata = integration.metadata as { propertyId?: string };
    if (!metadata.propertyId) {
      throw new Error('Google Analytics property ID not configured');
    }

    // Formata data para YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];

    // Faz request para Google Analytics Data API
    const response = await analyticsData.properties.runReport({
      auth: oauth2Client,
      property: `properties/${metadata.propertyId}`,
      requestBody: {
        dateRanges: [
          {
            startDate: dateStr,
            endDate: dateStr,
          },
        ],
        metrics: [
          {
            name: 'sessions',
          },
        ],
      },
    });

    // Extrai número de sessões
    const sessions = response.data.rows?.[0]?.metricValues?.[0]?.value;
    return sessions ? parseInt(sessions, 10) : 0;
  } catch (error) {
    console.error('Error fetching Google Analytics data:', error);
    throw error;
  }
}

/**
 * Lista todas as properties disponíveis do usuário
 * Usado durante o setup para escolher qual property monitorar
 */
export async function listAnalyticsProperties(userId: string) {
  try {
    const accessToken = await getValidAccessToken(userId);

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const analyticsAdmin = google.analyticsadmin('v1beta');

    // Primeiro, lista todas as contas
    const accountsResponse = await analyticsAdmin.accounts.list({
      auth: oauth2Client,
    });

    const accounts = accountsResponse.data.accounts || [];

    if (accounts.length === 0) {
      return [];
    }

    // Para cada conta, lista as properties
    const allProperties = [];

    for (const account of accounts) {
      try {
        const propertiesResponse = await analyticsAdmin.properties.list({
          auth: oauth2Client,
          filter: `parent:${account.name}`,
        });

        const properties = propertiesResponse.data.properties || [];
        allProperties.push(...properties);
      } catch (error) {
        console.error(`Error listing properties for account ${account.name}:`, error);
        // Continua para próxima conta mesmo se uma falhar
      }
    }

    return allProperties.map(property => ({
      id: property.name?.split('/')[1] || '',
      displayName: property.displayName || '',
      websiteUrl: property.websiteUrl || '',
    }));
  } catch (error) {
    console.error('Error listing Analytics properties:', error);
    throw error;
  }
}
