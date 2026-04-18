/**
 * TopShelf Service LLC - Database Connection Manager
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getConfig, type DatabaseConfig } from '@topshelf/config';
import * as schema from './schema/index.js';

// =============================================================================
// TYPES
// =============================================================================

export type Database = PostgresJsDatabase<typeof schema>;

export interface DatabaseConnection {
  db: Database;
  client: postgres.Sql;
  close: () => Promise<void>;
}

// =============================================================================
// CONNECTION MANAGER
// =============================================================================

let connection: DatabaseConnection | null = null;

/**
 * Create a database connection string from config
 */
function createConnectionString(config: DatabaseConfig): string {
  const { host, port, database, username, password, ssl } = config;
  const sslParam = ssl ? '?sslmode=require' : '';
  return `postgres://${username}:${password}@${host}:${port}/${database}${sslParam}`;
}

/**
 * Connect to the database
 */
export async function connectDatabase(
  configOverride?: Partial<DatabaseConfig>
): Promise<DatabaseConnection> {
  if (connection) {
    return connection;
  }

  const appConfig = getConfig();
  const dbConfig = { ...appConfig.database, ...configOverride };

  const connectionString = createConnectionString(dbConfig);

  const client = postgres(connectionString, {
    max: dbConfig.poolMax,
    idle_timeout: 20,
    connect_timeout: dbConfig.connectionTimeoutMs / 1000,
    prepare: false,
  });

  const db = drizzle(client, { schema });

  // Test connection
  try {
    await client`SELECT 1`;
  } catch (error) {
    await client.end();
    throw new Error(`Failed to connect to database: ${error}`);
  }

  connection = {
    db,
    client,
    close: async () => {
      await client.end();
      connection = null;
    },
  };

  return connection;
}

/**
 * Get the current database connection (throws if not connected)
 */
export function getDatabase(): Database {
  if (!connection) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return connection.db;
}

/**
 * Disconnect from the database
 */
export async function disconnectDatabase(): Promise<void> {
  if (connection) {
    await connection.close();
  }
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  error?: string;
}> {
  if (!connection) {
    return { healthy: false, latencyMs: 0, error: 'Not connected' };
  }

  const start = Date.now();
  try {
    await connection.client`SELECT 1`;
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// TRANSACTION HELPER
// =============================================================================

export type TransactionCallback<T> = (tx: Database) => Promise<T>;

/**
 * Execute a callback within a transaction
 */
export async function withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
  const db = getDatabase();

  // Drizzle ORM transaction
  return await db.transaction(async (tx) => {
    return await callback(tx as unknown as Database);
  });
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export * from './schema/index.js';
export { eq, and, or, desc, asc, sql, isNull, isNotNull, inArray, notInArray, gte, lte, gt, lt } from 'drizzle-orm';
