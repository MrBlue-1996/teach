import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageDir, '../..');
const envPath = path.join(repoRoot, '.env');
const migrationsDir = path.join(packageDir, 'drizzle');
const journalPath = path.join(migrationsDir, 'meta', '_journal.json');

loadDotenv({ path: envPath });

function readMigrations() {
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));

  return journal.entries.map((entry) => {
    const filename = path.join(migrationsDir, `${entry.tag}.sql`);
    const query = fs.readFileSync(filename, 'utf8');

    return {
      idx: entry.idx,
      tag: entry.tag,
      when: entry.when,
      breakpoints: entry.breakpoints,
      hash: crypto.createHash('sha256').update(query).digest('hex'),
    };
  });
}

async function queryExists(client, sqlText) {
  const rows = await client.unsafe(sqlText);
  return rows.length > 0;
}

async function hasBaselineArtifacts(client, tag) {
  switch (tag) {
    case '0000_rainy_abomination':
      return queryExists(
        client,
        "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'users' limit 1"
      );
    case '0001_public_smiling_tiger':
      return queryExists(
        client,
        "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'password_reset_tokens' limit 1"
      );
    case '0002_chunky_dragon_man':
      return queryExists(
        client,
        "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'email_verification_tokens' limit 1"
      );
    case '0003_quiet_manager_mesh': {
      const hasManagerColumn = await queryExists(
        client,
        "select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = 'manager_id' limit 1"
      );
      const enumRows = await client.unsafe(
        "select enumlabel from pg_enum join pg_type on pg_enum.enumtypid = pg_type.oid where pg_type.typname = 'user_role' and enumlabel in ('staff', 'manager')"
      );
      const enumLabels = new Set(enumRows.map((row) => row.enumlabel));
      return hasManagerColumn && enumLabels.has('staff') && enumLabels.has('manager');
    }
    default:
      return false;
  }
}

async function ensureMigrationTable(client) {
  await client.unsafe('create schema if not exists drizzle');
  await client.unsafe(`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `);
}

async function main() {
  const client = postgres({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: false,
    prepare: false,
    max: 1,
  });

  try {
    await ensureMigrationTable(client);

    const migrations = readMigrations();
    const existingRows = await client.unsafe(
      'select hash, created_at from drizzle.__drizzle_migrations order by created_at asc'
    );
    const recorded = new Set(
      existingRows.map((row) => `${row.hash}:${Number(row.created_at)}`)
    );

    let insertedCount = 0;

    for (const migration of migrations) {
      const recordKey = `${migration.hash}:${migration.when}`;
      if (recorded.has(recordKey)) {
        continue;
      }

      const applied = await hasBaselineArtifacts(client, migration.tag);
      if (!applied) {
        continue;
      }

      await client.unsafe(
        `insert into drizzle.__drizzle_migrations ("hash", "created_at") values ('${migration.hash}', ${migration.when})`
      );
      recorded.add(recordKey);
      insertedCount += 1;
      console.log(`Baselined migration ${migration.tag}`);
    }

    if (insertedCount === 0) {
      console.log('Migration baseline already in sync');
    }
  } finally {
    await client.end({ timeout: 1 });
  }
}

await main();
