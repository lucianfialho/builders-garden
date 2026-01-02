'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Importa PhaserGame dinamicamente (client-side only)
const PhaserGame = dynamic(() => import('@/components/game/PhaserGame'), {
  ssr: false,
  loading: () => <LoadingSpinner size="lg" />,
});

interface Plant {
  id: string;
  positionX: number;
  positionY: number;
  growthStage: number;
  growthPoints: number;
  plantTypeId: string;
}

interface GardenData {
  gridSize: number;
  totalGrowthPoints: number;
  plants: Plant[];
}

export default function GardenPage() {
  const router = useRouter();
  const [gardenData, setGardenData] = useState<GardenData | null>(null);
  const [seeds, setSeeds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadGardenData();
    loadSeeds();
  }, []);

  async function loadGardenData() {
    try {
      const response = await fetch('/api/garden/state');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load garden');
      }

      setGardenData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSeeds() {
    try {
      const response = await fetch('/api/currency/balance');
      const data = await response.json();

      if (response.ok) {
        setSeeds(data.seeds);
      }
    } catch (err) {
      console.error('Error loading seeds:', err);
    }
  }

  const handlePlant = useCallback(async (x: number, y: number) => {
    try {
      const response = await fetch('/api/garden/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionX: x, positionY: y }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Erro ao plantar');
        return;
      }

      // Atualiza seeds
      setSeeds(data.remainingSeeds);

      // Atualiza garden data
      setGardenData(prev => {
        if (!prev) return prev;

        return {
          ...prev,
          plants: [...prev.plants, data.plant],
        };
      });

      // Toast de sucesso
      alert(`Plantado! Seeds restantes: ${data.remainingSeeds}`);
    } catch (err: any) {
      alert('Erro ao plantar: ' + err.message);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="text-green-600 dark:text-green-400 hover:underline"
          >
            Voltar para Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!gardenData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                ← Voltar
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                🌱 Seu Jardim
              </h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Seeds</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {seeds}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Growth Points</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {gardenData.totalGrowthPoints}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instruções */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Como plantar:</strong> Clique em uma célula vazia do grid para plantar uma seed (custa 1 seed).
            Suas plantas vão crescer automaticamente quando suas métricas forem sincronizadas!
          </p>
        </div>

        {/* Game Canvas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <PhaserGame gardenData={gardenData} onPlant={handlePlant} />
        </div>

        {/* Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Grid Size</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {gardenData.gridSize}×{gardenData.gridSize}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Plantas</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {gardenData.plants.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Espaços Livres</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {gardenData.gridSize * gardenData.gridSize - gardenData.plants.length}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
