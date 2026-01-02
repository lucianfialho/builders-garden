'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface IntegrationsStatus {
  googleAnalytics: {
    connected: boolean;
    propertyConfigured: boolean;
    propertyId: string | null;
  };
  stripe: {
    connected: boolean;
    stripeUserId: string | null;
  };
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Stripe API Key state
  const [stripeApiKey, setStripeApiKey] = useState('');
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [stripeError, setStripeError] = useState('');

  useEffect(() => {
    // Mostra mensagens de sucesso/erro da URL
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'google_analytics_connected') {
      setSuccessMessage('Google Analytics conectado com sucesso!');
    } else if (success === 'stripe_connected') {
      setSuccessMessage('Stripe conectado com sucesso!');
    }

    if (error === 'google_analytics_denied') {
      setErrorMessage('Autorização do Google Analytics foi negada.');
    } else if (error === 'google_analytics_failed') {
      setErrorMessage('Erro ao conectar Google Analytics. Tente novamente.');
    } else if (error === 'stripe_denied') {
      setErrorMessage('Autorização do Stripe foi negada.');
    } else if (error === 'stripe_failed') {
      setErrorMessage('Erro ao conectar Stripe. Tente novamente.');
    }

    // Limpa mensagens após 5 segundos
    if (success || error) {
      setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadStatus() {
      try {
        const response = await fetch('/api/integrations/status');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load integrations');
        }

        setStatus(data);
      } catch (err) {
        console.error('Error loading integrations:', err);
        setErrorMessage('Erro ao carregar integrações');
      } finally {
        setIsLoading(false);
      }
    }

    loadStatus();
  }, []);

  async function handleConnectStripe() {
    if (!stripeApiKey.trim()) {
      setStripeError('Por favor, cole sua API key do Stripe');
      return;
    }

    setIsConnectingStripe(true);
    setStripeError('');

    try {
      const response = await fetch('/api/integrations/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: stripeApiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao conectar Stripe');
      }

      // Sucesso - recarrega status
      setSuccessMessage('Stripe conectado com sucesso!');
      setStripeApiKey('');

      // Recarrega status
      const statusResponse = await fetch('/api/integrations/status');
      const statusData = await statusResponse.json();
      setStatus(statusData);
    } catch (err: any) {
      setStripeError(err.message);
    } finally {
      setIsConnectingStripe(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              ← Voltar
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Integrações
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Intro */}
        <div className="mb-8">
          <p className="text-gray-600 dark:text-gray-400">
            Conecte suas ferramentas para que seu jardim cresça automaticamente baseado nas suas métricas reais.
          </p>
        </div>

        <div className="space-y-6">
          {/* Google Analytics Card */}
          <Card title="Google Analytics">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Monitore sessões e tráfego do seu site para fazer seu jardim crescer.
                  </p>

                  {status?.googleAnalytics.connected ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          ✓ Conectado
                        </span>
                      </div>

                      {status.googleAnalytics.propertyConfigured ? (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Property ID: {status.googleAnalytics.propertyId}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          ⚠ Property não configurada
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-500">
                      Não conectado
                    </span>
                  )}
                </div>

                <div>
                  {status?.googleAnalytics.connected ? (
                    status.googleAnalytics.propertyConfigured ? (
                      <Button variant="secondary" disabled>
                        Conectado
                      </Button>
                    ) : (
                      <Link href="/settings/integrations/google-analytics/select-property">
                        <Button variant="primary">
                          Configurar Property
                        </Button>
                      </Link>
                    )
                  ) : (
                    <a href="/api/integrations/google-analytics/connect">
                      <Button variant="primary">
                        Conectar
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
                <strong>Permissões:</strong> Somente leitura de dados do Analytics (sessões e usuários ativos)
              </div>
            </div>
          </Card>

          {/* Stripe Card */}
          <Card title="Stripe">
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Acompanhe sua receita e pagamentos para crescimento automático do jardim.
              </p>

              {status?.stripe.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      ✓ Conectado
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Sua API key está ativa. O jardim está sincronizando sua receita automaticamente.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="stripeApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Restricted API Key
                    </label>
                    <input
                      id="stripeApiKey"
                      type="text"
                      value={stripeApiKey}
                      onChange={(e) => setStripeApiKey(e.target.value)}
                      placeholder="rk_live_..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 font-mono text-sm"
                      disabled={isConnectingStripe}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Cole sua Restricted API Key do Stripe (começa com rk_)
                    </p>
                  </div>

                  {stripeError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                      {stripeError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <a
                      href="https://dashboard.stripe.com/apikeys/create?name=Builder's%20Garden&permissions[]=rak_charge_read"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="secondary" className="w-full">
                        Criar API Key no Stripe
                      </Button>
                    </a>
                    <Button
                      variant="primary"
                      onClick={handleConnectStripe}
                      isLoading={isConnectingStripe}
                      className="flex-1"
                    >
                      Conectar
                    </Button>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Como criar sua API Key:
                    </p>
                    <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                      <li>Clique em "Criar API Key no Stripe" acima</li>
                      <li>No Stripe Dashboard, clique em "Create key"</li>
                      <li>Copie a key que aparece (rk_live_...)</li>
                      <li>Cole aqui e clique em "Conectar"</li>
                    </ol>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      ⚠ Não apague a key do Stripe ou não conseguiremos atualizar sua receita
                    </p>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
                <strong>Permissões:</strong> Somente leitura de dados de pagamentos (charges e revenue)
              </div>
            </div>
          </Card>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Como funciona o crescimento automático?
            </h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <p>
                Todo dia às <strong>01:00 UTC</strong>, o sistema sincroniza suas métricas do dia anterior:
              </p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Sessões do Google Analytics (quantidade de visitas)</li>
                <li>Receita do Stripe (total de pagamentos bem-sucedidos)</li>
              </ul>
              <p className="mt-3">
                <strong>Fórmula de crescimento:</strong>
              </p>
              <p className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                growth_points = (sessions × 1) + (revenue × 10)
              </p>
              <p className="mt-2">
                Esses pontos são distribuídos entre suas plantas, fazendo-as crescer automaticamente! 🌱
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
