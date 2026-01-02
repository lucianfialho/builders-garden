import { pgTable, uuid, varchar, timestamp, integer, boolean, jsonb, decimal, index, uniqueIndex } from 'drizzle-orm/pg-core';

// ========== USERS ==========
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  usernameIdx: uniqueIndex('users_username_idx').on(table.username),
}));

// ========== GARDENS ==========
export const gardens = pgTable('gardens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  gridSize: integer('grid_size').default(10).notNull(), // 10x10 grid inicial
  isPublic: boolean('is_public').default(true).notNull(),
  totalGrowthPoints: integer('total_growth_points').default(0).notNull(),
  rank: integer('rank'), // Posição no leaderboard
  lastCheckIn: timestamp('last_check_in'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('gardens_user_idx').on(table.userId),
  rankIdx: index('gardens_rank_idx').on(table.rank),
}));

// ========== PLANTS ==========
export const plants = pgTable('plants', {
  id: uuid('id').primaryKey().defaultRandom(),
  gardenId: uuid('garden_id').references(() => gardens.id, { onDelete: 'cascade' }).notNull(),
  plantTypeId: varchar('plant_type_id', { length: 50 }).notNull(), // 'tomato', 'carrot', 'flower', etc
  positionX: integer('position_x').notNull(),
  positionY: integer('position_y').notNull(),
  growthStage: integer('growth_stage').default(0).notNull(), // 0-4 stages
  growthPoints: integer('growth_points').default(0).notNull(),
  metadata: jsonb('metadata'), // Cores, variações, etc
  plantedAt: timestamp('planted_at').defaultNow().notNull(),
  lastGrownAt: timestamp('last_grown_at'),
}, (table) => ({
  gardenIdx: index('plants_garden_idx').on(table.gardenId),
  positionIdx: uniqueIndex('plants_position_idx').on(table.gardenId, table.positionX, table.positionY),
}));

// ========== METRICS ==========
export const metrics = pgTable('metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: timestamp('date').notNull(), // Data do snapshot (00:00 UTC)
  gaSessions: integer('ga_sessions').default(0),
  gaUsers: integer('ga_users').default(0),
  stripeRevenue: decimal('stripe_revenue', { precision: 10, scale: 2 }).default('0'),
  stripePayments: integer('stripe_payments').default(0),
  growthPointsEarned: integer('growth_points_earned').default(0),
  seedsEarned: integer('seeds_earned').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userDateIdx: uniqueIndex('metrics_user_date_idx').on(table.userId, table.date),
  dateIdx: index('metrics_date_idx').on(table.date),
}));

// ========== INTEGRATIONS ==========
export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // 'google_analytics', 'stripe'
  accessToken: varchar('access_token', { length: 500 }).notNull(),
  refreshToken: varchar('refresh_token', { length: 500 }),
  expiresAt: timestamp('expires_at'),
  scope: varchar('scope', { length: 500 }),
  metadata: jsonb('metadata'), // Property ID, Account ID, etc
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userProviderIdx: uniqueIndex('integrations_user_provider_idx').on(table.userId, table.provider),
}));

// ========== CURRENCY ==========
export const currency = pgTable('currency', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  seeds: integer('seeds').default(0).notNull(),
  lifetimeSeeds: integer('lifetime_seeds').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: uniqueIndex('currency_user_idx').on(table.userId),
}));

// ========== SHOP ITEMS ==========
export const shopItems = pgTable('shop_items', {
  id: varchar('id', { length: 50 }).primaryKey(), // 'grid_expansion_1', 'speed_boost_1'
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  category: varchar('category', { length: 50 }).notNull(), // 'expansion', 'speed', 'plant', 'decoration'
  price: integer('price').notNull(), // Preço em seeds
  effect: jsonb('effect').notNull(), // { type: 'grid_size', value: 5 }
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0),
});

// ========== PURCHASES ==========
export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  shopItemId: varchar('shop_item_id', { length: 50 }).references(() => shopItems.id).notNull(),
  price: integer('price').notNull(),
  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('purchases_user_idx').on(table.userId),
  userItemIdx: index('purchases_user_item_idx').on(table.userId, table.shopItemId),
}));

// ========== VISITS ==========
export const visits = pgTable('visits', {
  id: uuid('id').primaryKey().defaultRandom(),
  visitorId: uuid('visitor_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  gardenId: uuid('garden_id').references(() => gardens.id, { onDelete: 'cascade' }).notNull(),
  visitedAt: timestamp('visited_at').defaultNow().notNull(),
}, (table) => ({
  visitorIdx: index('visits_visitor_idx').on(table.visitorId),
  gardenIdx: index('visits_garden_idx').on(table.gardenId),
}));
