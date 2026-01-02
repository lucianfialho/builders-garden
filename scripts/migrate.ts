import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not found in .env.local');
}

async function main() {
  console.log('🔄 Running migrations...');

  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder: './lib/db/migrations' });

  console.log('✅ Migrations completed!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});
