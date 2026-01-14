/**
 * Saarthi-Net Data Ingestion Script
 * Load Migration Flows from CSV into PostGIS
 *
 * Expected CSV columns:
 * - origin_region
 * - destination_region
 * - migration_score
 * - year
 * - origin_lat
 * - origin_lng
 * - destination_lat
 * - destination_lng
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  createPool,
  logger,
  parseCSV,
  validateScore,
  validateLatitude,
  validateLongitude,
  validateYear,
  createStats,
  printStats,
} from './utils/db';

async function loadMigrationFlows(filePath: string): Promise<void> {
  logger.divider();
  logger.info('Starting Migration Flows Ingestion');
  logger.info(`Input file: ${filePath}`);
  logger.divider();

  // Validate file exists
  if (!fs.existsSync(filePath)) {
    logger.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const pool = createPool();
  const stats = createStats();

  try {
    // Read and parse CSV
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(content);
    stats.total = rows.length;

    logger.info(`Parsed ${rows.length} rows from CSV`);

    // Truncate table for clean re-runs
    logger.info('Truncating migration_flows table...');
    await pool.query('TRUNCATE TABLE migration_flows RESTART IDENTITY');
    logger.success('Table truncated');

    // Prepare insert statement
    const insertQuery = `
      INSERT INTO migration_flows (
        origin_region,
        destination_region,
        migration_score,
        year,
        geom
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        ST_SetSRID(
          ST_MakeLine(
            ST_MakePoint($5, $6),
            ST_MakePoint($7, $8)
          ),
          4326
        )
      )
    `;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Account for header + 0-index

      try {
        // Validate required fields
        if (!row.origin_region || !row.destination_region) {
          logger.warn(`Row ${rowNum}: Missing origin or destination region`);
          stats.skipped++;
          continue;
        }

        // Validate numeric fields
        const migrationScore = validateScore(row.migration_score);
        const year = validateYear(row.year);
        const originLat = validateLatitude(row.origin_lat);
        const originLng = validateLongitude(row.origin_lng);
        const destLat = validateLatitude(row.destination_lat);
        const destLng = validateLongitude(row.destination_lng);

        if (migrationScore === null) {
          logger.warn(`Row ${rowNum}: Invalid migration_score "${row.migration_score}"`);
          stats.skipped++;
          continue;
        }

        if (year === null) {
          logger.warn(`Row ${rowNum}: Invalid year "${row.year}"`);
          stats.skipped++;
          continue;
        }

        if (originLat === null || originLng === null) {
          logger.warn(`Row ${rowNum}: Invalid origin coordinates`);
          stats.skipped++;
          continue;
        }

        if (destLat === null || destLng === null) {
          logger.warn(`Row ${rowNum}: Invalid destination coordinates`);
          stats.skipped++;
          continue;
        }

        // Insert row
        await pool.query(insertQuery, [
          row.origin_region.trim(),
          row.destination_region.trim(),
          migrationScore,
          year,
          originLng, // ST_MakePoint takes (lng, lat)
          originLat,
          destLng,
          destLat,
        ]);

        stats.inserted++;
      } catch (error) {
        logger.error(`Row ${rowNum}: Insert failed`, error);
        stats.errors++;
      }
    }

    printStats('migration_flows', stats);

    // Verify inserted data
    const countResult = await pool.query('SELECT COUNT(*) FROM migration_flows');
    logger.info(`Total records in migration_flows table: ${countResult.rows[0].count}`);
  } catch (error) {
    logger.error('Fatal error during migration flows ingestion', error);
    process.exit(1);
  } finally {
    await pool.end();
    logger.info('Database connection closed');
  }
}

// Main execution
const inputFile = process.argv[2] || path.join(__dirname, '../data/migration_flows.csv');
loadMigrationFlows(inputFile);
