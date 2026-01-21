/**
 * Supabase Migration Runner
 * Tracks migration files and provides instructions for manual execution
 * 
 * Note: Supabase JS client doesn't support DDL statements directly.
 * Run migrations via Supabase Dashboard → SQL Editor or Supabase CLI
 */

// Load environment variables from .env file
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file from project root
config({ path: resolve(process.cwd(), '.env.local') });
// Fallback to .env if .env.local doesn't exist
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  config({ path: resolve(process.cwd(), '.env') });
}

import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role key for migrations (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Get migrations directory path
function getMigrationsDir(): string {
  // Try different possible paths
  const possiblePaths = [
    join(process.cwd(), 'supabase', 'migrations'),
    join(process.cwd(), 'supabase/migrations'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error('Migrations directory not found. Tried: ' + possiblePaths.join(', '));
}

/**
 * Check if schema_migrations table exists
 */
async function checkMigrationsTable(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('schema_migrations')
      .select('version')
      .limit(1);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('schema_migrations')
      .select('version')
      .order('version');

    if (error && error.code !== '42P01') {
      // Table doesn't exist yet, return empty array
      return [];
    }

    return data?.map((m) => m.version) || [];
  } catch {
    return [];
  }
}

/**
 * Mark migration as executed
 */
async function recordMigration(version: string, name: string) {
  try {
    await supabase.from('schema_migrations').insert({
      version,
      name,
      executed_at: new Date().toISOString(),
    });
  } catch (error: unknown) {
    // If table doesn't exist, we'll create it in the migration
    console.warn('Could not record migration (table may not exist yet):', error);
  }
}

/**
 * Display migration SQL for manual execution
 */
async function displayMigration(filePath: string, version: string, name: string) {
  const sql = await readFile(filePath, 'utf-8');
  
  console.log(`\n📄 Migration: ${name} (${version})`);
  console.log('─'.repeat(60));
  console.log(sql);
  console.log('─'.repeat(60));
}

/**
 * Get migration files from directory
 */
async function getMigrationFiles(): Promise<Array<{ version: string; name: string; path: string }>> {
  const migrationsDir = getMigrationsDir();
  const files = await readdir(migrationsDir);

  return files
    .filter((file) => file.endsWith('.sql'))
    .map((file) => {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        throw new Error(`Invalid migration filename: ${file}. Expected format: 001_name.sql`);
      }
      return {
        version: match[1],
        name: match[2],
        path: join(migrationsDir, file),
      };
    })
    .sort((a, b) => a.version.localeCompare(b.version));
}

/**
 * Main migration function
 * Lists pending migrations and provides instructions
 */
async function runMigrations() {
  console.log('🚀 Supabase Migration Checker\n');
  console.log('Note: Supabase JS client cannot execute DDL statements.');
  console.log('Please run migrations manually via Supabase Dashboard → SQL Editor\n');

  try {
    // Check if migrations table exists
    const tableExists = await checkMigrationsTable();
    if (!tableExists) {
      console.log('⚠️  schema_migrations table does not exist yet.');
      console.log('   It will be created by the first migration.\n');
    }

    // Get migration files
    const migrationFiles = await getMigrationFiles();
    console.log(`Found ${migrationFiles.length} migration file(s)\n`);

    if (migrationFiles.length === 0) {
      console.log('No migrations found.');
      return;
    }

    // Get executed migrations
    const executed = tableExists ? await getExecutedMigrations() : [];

    // Show pending migrations
    const pending = migrationFiles.filter((m) => !executed.includes(m.version));

    if (pending.length === 0) {
      console.log('✅ All migrations have been executed.\n');
      return;
    }

    console.log(`📋 Pending migrations (${pending.length}):\n`);

    for (const migration of pending) {
      console.log(`   ${migration.version}: ${migration.name}`);
    }

    console.log('\n📝 To execute migrations:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Copy and paste the SQL from each migration file');
    console.log('   3. Run them in order (001, 002, etc.)');
    console.log('   4. After running, record them with: npm run migrate:record\n');

    // Optionally display SQL
    const args = process.argv.slice(2);
    if (args.includes('--show') || args.includes('-s')) {
      console.log('\n📄 Migration SQL files:\n');
      for (const migration of pending) {
        await displayMigration(migration.path, migration.version, migration.name);
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

/**
 * Record a migration as executed (after manual execution)
 */
async function recordMigrationManually(version: string, name: string) {
  const tableExists = await checkMigrationsTable();
  
  if (!tableExists) {
    console.error('❌ schema_migrations table does not exist.');
    console.error('   Please run the first migration first.');
    process.exit(1);
  }

  try {
    await recordMigration(version, name);
    console.log(`✅ Recorded migration ${version}: ${name}`);
  } catch (error) {
    console.error('❌ Failed to record migration:', error);
    process.exit(1);
  }
}

// Run if executed directly
const isMainModule = require.main === module || 
  (typeof process !== 'undefined' && process.argv[1]?.endsWith('migrate.ts'));

if (isMainModule) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'record' && args[1] && args[2]) {
    recordMigrationManually(args[1], args[2]).catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
  } else {
    runMigrations().catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
  }
}

export { runMigrations, recordMigrationManually };
