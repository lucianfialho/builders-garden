'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

interface SyncResult {
  metrics: {
    gaSessions: number;
    stripeRevenue: number;
    stripePayments: number;
  };
  rewards: {
    growthPointsEarned: number;
    seedsEarned: number;
    newSeeds: number;
  };
  garden: {
    plantsGrown: number;
    plantsUpgraded: number;
    newRank: number;
  };
}

export default function DailyCheckIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState('');

  async function handleSync() {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/metrics/sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao sincronizar métricas');
      }

      setResult(data);

      // Recarrega a página após 3 segundos para atualizar seeds e garden stats
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        🌟 Daily Check-In
      </h2>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Sincronize suas métricas de ontem e veja seu jardim crescer!
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4 space-y-3">
          <div className="text-green-900 dark:text-green-100">
            <p className="font-semibold mb-2">✅ Métricas Sincronizadas!</p>

            <div className="text-sm space-y-1">
              <p>
                📊 Sessões: <strong>{result.metrics.gaSessions}</strong>
              </p>
              <p>
                💰 Receita: <strong>${result.metrics.stripeRevenue.toFixed(2)}</strong>
              </p>
              <p>
                📈 Growth Points: <strong>+{result.rewards.growthPointsEarned}</strong>
              </p>
              <p>
                🌱 Seeds Ganhas: <strong>+{result.rewards.seedsEarned}</strong>
              </p>
              {result.garden.plantsUpgraded > 0 && (
                <p>
                  🎉 Plantas Evoluídas: <strong>{result.garden.plantsUpgraded}</strong>
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-green-700 dark:text-green-300">
            Recarregando página em 3 segundos...
          </p>
        </div>
      )}

      <Button
        variant="primary"
        onClick={handleSync}
        isLoading={isLoading}
        className="w-full"
      >
        {isLoading ? 'Sincronizando...' : 'Atualizar Jardim Agora'}
      </Button>

      <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
        💡 Dica: O sync automático roda todo dia às 01:00 UTC. Use este botão se quiser atualizar antes!
      </p>
    </div>
  );
}
