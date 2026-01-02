'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AnalyticsProperty {
  id: string;
  displayName: string;
  websiteUrl: string;
}

export default function SelectPropertyPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<AnalyticsProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProperties() {
      try {
        const response = await fetch('/api/integrations/google-analytics/properties');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load properties');
        }

        setProperties(data.properties);

        // Auto-seleciona se só tiver uma property
        if (data.properties.length === 1) {
          setSelectedPropertyId(data.properties[0].id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadProperties();
  }, []);

  async function handleSave() {
    if (!selectedPropertyId) {
      setError('Por favor, selecione uma property');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/integrations/google-analytics/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: selectedPropertyId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save property');
      }

      // Redireciona para configurações
      router.push('/settings/integrations?success=google_analytics_connected');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Selecione sua Property do Google Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Escolha qual property você deseja monitorar no Builder's Garden
          </p>
        </div>

        <Card>
          {properties.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Nenhuma property encontrada na sua conta do Google Analytics.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Certifique-se de ter pelo menos uma property GA4 configurada.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {properties.map((property) => (
                <label
                  key={property.id}
                  className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedPropertyId === property.id
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="property"
                    value={property.id}
                    checked={selectedPropertyId === property.id}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {property.displayName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Property ID: {property.id}
                      </p>
                    </div>
                    {selectedPropertyId === property.id && (
                      <span className="text-green-600 dark:text-green-400 text-xl">
                        ✓
                      </span>
                    )}
                  </div>
                </label>
              ))}

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => router.push('/settings/integrations')}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  isLoading={isSaving}
                  className="flex-1"
                >
                  Salvar e Continuar
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
