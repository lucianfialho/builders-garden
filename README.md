# 🌱 Builder's Garden

Jogo 2D farming para empreendedores onde seu jardim cresce automaticamente baseado nas métricas reais do seu negócio.

Conecte **Google Analytics** e **Stripe** - quanto mais sessões e receita, mais seu jardim floresce! É gamificação pura do "build in public".

## 🎮 Como Funciona

1. **Crie sua conta** e conecte Google Analytics + Stripe (OAuth seguro)
2. **Plante seu jardim** - grid inicial 10×10 com plantas pixel art
3. **Cresça automaticamente** - todo dia às 01:00 UTC, um cron job busca suas métricas e faz seu jardim crescer
4. **Compre upgrades** - gaste "seeds" (moeda virtual) para expandir terreno, multiplicadores de crescimento, novas plantas
5. **Compete no leaderboard** - jardins são públicos (mas métricas reais ficam privadas!)

### Fórmula de Crescimento

```typescript
growthPoints = (sessions × 1) + (revenue × 10)
```

Milestones de seeds (moeda virtual):
- 100 sessions = 50 seeds
- 500 sessions = 200 seeds
- $1k revenue = 500 seeds
- $5k revenue = 2000 seeds

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript
- **Game Engine**: Phaser.js 3.90
- **Database**: Neon PostgreSQL (serverless)
- **ORM**: Drizzle ORM
- **Auth**: JWT-based (Jose)
- **Integrações**: Google Analytics Data API v1 + Stripe API
- **Styling**: Tailwind CSS v4
- **Hosting**: Vercel
- **Cron**: Vercel Cron (sync diário automático)

## 🚀 Setup Local

### 1. Clone o repositório

```bash
git clone https://github.com/lucianfialho/builders-garden.git
cd builders-garden
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o banco de dados

1. Criar database no Neon: https://console.neon.tech
2. Copiar connection string

### 4. Configure variáveis de ambiente

Crie `.env.local` na raiz:

```bash
# Database (colar connection string do Neon)
DATABASE_URL="postgresql://..."

# Auth (gerar com: openssl rand -base64 32)
NEON_AUTH_SECRET="seu-secret-aqui"
NEON_AUTH_ISSUER="http://localhost:3000"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5. Rode as migrations

```bash
npm run db:generate  # Gera migrations SQL
npm run db:migrate   # Aplica no banco
```

### 6. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## 📁 Estrutura do Projeto

```
builders-garden/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Login/Signup (a criar)
│   ├── (protected)/       # Dashboard, Garden, Shop (a criar)
│   └── api/               # API routes (a criar)
├── components/
│   ├── ui/                # Button, Card, Modal, LoadingSpinner ✅
│   ├── game/              # PhaserGame + scenes (a criar)
│   └── ...                # Outros componentes (a criar)
├── lib/
│   ├── db/                # Schema + Client (Drizzle + Neon) ✅
│   ├── auth/              # JWT session management ✅
│   ├── integrations/      # GA + Stripe APIs (a criar)
│   └── game/              # Growth engine (a criar)
├── public/assets/sprites/ # Pixel art (tiles, plantas, UI)
└── middleware.ts          # Proteção de rotas ✅
```

## 🗃️ Database Schema

9 tabelas principais:

1. **users** - Autenticação (email, passwordHash, username)
2. **gardens** - Estado do jardim (gridSize, totalGrowthPoints, rank)
3. **plants** - Plantas individuais (posição, estágio, pontos)
4. **metrics** - Snapshots diários (GA sessions, Stripe revenue)
5. **integrations** - OAuth tokens (GA, Stripe - criptografados)
6. **currency** - Moeda virtual (seeds)
7. **shopItems** - Catálogo de upgrades
8. **purchases** - Histórico de compras
9. **visits** - Visitas aos jardins

## 🎯 Roadmap

### ✅ FASE 1: Fundação (Concluída)
- [x] Setup inicial (dependências, estrutura)
- [x] Schema do banco (9 tabelas)
- [x] Sistema de autenticação JWT
- [x] Middleware de proteção
- [x] Componentes UI básicos

### 🚧 FASE 2: OAuth (Em andamento)
- [ ] Integração Google Analytics
- [ ] Integração Stripe
- [ ] Dashboard de métricas

### 📋 FASE 3: Game Engine
- [ ] Setup Phaser.js
- [ ] Renderizar jardim 2D
- [ ] Sistema de plantio
- [ ] Assets pixel art

### 📋 FASE 4: Crescimento Automático
- [ ] Growth engine (fórmula de pontos)
- [ ] Sistema de moedas (seeds)
- [ ] Cron job diário (Vercel Cron)

### 📋 FASE 5: Loja
- [ ] Catálogo de upgrades
- [ ] Sistema de compras
- [ ] Aplicar efeitos (expansão, multiplicadores)

### 📋 FASE 6: Social
- [ ] Leaderboard
- [ ] Jardins públicos
- [ ] Sistema de visitas

### 📋 FASE 7: Polish
- [ ] Landing page
- [ ] UX improvements
- [ ] Mobile responsiveness
- [ ] SEO

## 🤝 Contribuindo

PRs são bem-vindos! Para mudanças grandes, abra uma issue primeiro para discutir o que você gostaria de mudar.

## 📄 Licença

MIT

## 🎨 Assets

Pixel art sprites serão baixados do Freepik Premium e organizados em `/public/assets/sprites/`.

Buscar por:
- "pixel art grass tile"
- "pixel art plant growth stages"
- "pixel art coin icon"

---

**Build in Public, gamificado! 🚀🌱**
