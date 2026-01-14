import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Creates a PostgreSQL connection pool for scripts
 */
export function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

/**
 * Logger utility for consistent script output
 */
export const logger = {
  info: (message: string) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
  success: (message: string) => console.log(`[SUCCESS] ${new Date().toISOString()} - ✅ ${message}`),
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ❌ ${message}`);
    if (error) console.error(error);
  },
  warn: (message: string) => console.log(`[WARN] ${new Date().toISOString()} - ⚠️ ${message}`),
  divider: () => console.log('─'.repeat(60)),
};

/**
 * Validates that a value is a valid number within range
 */
export function validateScore(value: unknown, min = 0, max = 1): number | null {
  const num = parseFloat(String(value));
  if (isNaN(num) || num < min || num > max) {
    return null;
  }
  return num;
}

/**
 * Validates latitude value
 */
export function validateLatitude(value: unknown): number | null {
  const num = parseFloat(String(value));
  if (isNaN(num) || num < -90 || num > 90) {
    return null;
  }
  return num;
}

/**
 * Validates longitude value
 */
export function validateLongitude(value: unknown): number | null {
  const num = parseFloat(String(value));
  if (isNaN(num) || num < -180 || num > 180) {
    return null;
  }
  return num;
}

/**
 * Validates year value
 */
export function validateYear(value: unknown, minYear = 2000, maxYear = 2100): number | null {
  const num = parseInt(String(value), 10);
  if (isNaN(num) || num < minYear || num > maxYear) {
    return null;
  }
  return num;
}

/**
 * Parse CSV content into array of objects
 */
export function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) {
      logger.warn(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index].trim();
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.replace(/^["']|["']$/g, ''));
  return result;
}

/**
 * Summary statistics for ingestion
 */
export interface IngestionStats {
  total: number;
  inserted: number;
  skipped: number;
  errors: number;
}

export function createStats(): IngestionStats {
  return { total: 0, inserted: 0, skipped: 0, errors: 0 };
}

export function printStats(tableName: string, stats: IngestionStats): void {
  logger.divider();
  logger.info(`Ingestion Summary for ${tableName}:`);
  logger.info(`  Total records processed: ${stats.total}`);
  logger.success(`Inserted: ${stats.inserted}`);
  if (stats.skipped > 0) logger.warn(`Skipped: ${stats.skipped}`);
  if (stats.errors > 0) logger.error(`Errors: ${stats.errors}`);
  logger.divider();
}
