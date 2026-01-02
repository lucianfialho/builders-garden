import { redirect } from 'next/navigation';
import { getSession, deleteSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { gardens, currency } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Card from '@/components/ui/Card';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Buscar dados do jardim e moedas do usuário
  const [garden] = await db
    .select()
    .from(gardens)
    .where(eq(gardens.userId, session.userId))
    .limit(1);

  const [userCurrency] = await db
    .select()
    .from(currency)
    .where(eq(currency.userId, session.userId))
    .limit(1);

  async function handleLogout() {
    'use server';
    await deleteSession();
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                🌱 Builder's Garden
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bem-vindo, {session.username}!
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Seeds</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {userCurrency?.seeds || 0}
                </p>
              </div>
              <form action={handleLogout}>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Jardim Card */}
          <Card title="Seu Jardim">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Nome</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {garden?.name || 'Jardim sem nome'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tamanho do Grid</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {garden?.gridSize || 10}×{garden?.gridSize || 10}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Growth Points</p>
                <p className="font-semibold text-green-600 dark:text-green-400">
                  {garden?.totalGrowthPoints || 0}
                </p>
              </div>
              <Link
                href="/garden"
                className="block w-full text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Ver Jardim
              </Link>
            </div>
          </Card>

          {/* Moedas Card */}
          <Card title="Moedas">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Seeds Disponíveis</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {userCurrency?.seeds || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Lifetime</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {userCurrency?.lifetimeSeeds || 0}
                </p>
              </div>
              <Link
                href="/shop"
                className="block w-full text-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Ir para Loja
              </Link>
            </div>
          </Card>

          {/* Próximos Passos Card */}
          <Card title="Próximos Passos">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Conta criada!
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Você ganhou 100 seeds de boas-vindas
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-400">○</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Conectar Google Analytics
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Vincule suas métricas para crescimento automático
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-400">○</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Conectar Stripe
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Acompanhe sua receita no jardim
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-400">○</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Plantar primeira seed
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Vá para seu jardim e comece a plantar!
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
            🎉 Como funciona o Builder's Garden?
          </h2>
          <div className="text-sm text-green-800 dark:text-green-200 space-y-2">
            <p>
              <strong>1. Conecte suas ferramentas:</strong> Google Analytics e Stripe (OAuth seguro)
            </p>
            <p>
              <strong>2. Plante seu jardim:</strong> Use suas seeds para plantar no grid 10×10
            </p>
            <p>
              <strong>3. Cresça automaticamente:</strong> Todo dia às 01:00 UTC, suas métricas são sincronizadas e seu jardim cresce!
            </p>
            <p className="text-xs mt-4">
              📊 Fórmula: <code className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded">growth = (sessions × 1) + (revenue × 10)</code>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
