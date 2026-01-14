/**
 * Saarthi-Net Data Ingestion Script
 * Load Growth Zones from GeoJSON into PostGIS
 *
 * Expected GeoJSON structure:
 * {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "properties": {
 *         "region_name": "...",
 *         "growth_score": 0.75,
 *         "classification": "peri-urban"
 *       },
 *       "geometry": {
 *         "type": "Polygon",
 *         "coordinates": [[[lng, lat], ...]]
 *       }
 *     }
 *   ]
 * }
 */

import * as fs from 'fs';
import * as path from 'path';
import { createPool, logger, validateScore, createStats, printStats } from './utils/db';

interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    region_name?: string;
    growth_score?: number | string;
    classification?: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

const VALID_CLASSIFICATIONS = ['rural', 'peri-urban', 'urban'];

async function loadGrowthZones(filePath: string): Promise<void> {
  logger.divider();
  logger.info('Starting Growth Zones Ingestion');
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
    // Read and parse GeoJSON
    const content = fs.readFileSync(filePath, 'utf-8');
    let geojson: GeoJSONCollection;

    try {
      geojson = JSON.parse(content) as GeoJSONCollection;
    } catch {
      logger.error('Failed to parse GeoJSON file');
      process.exit(1);
    }

    if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
      logger.error('Invalid GeoJSON: Expected FeatureCollection');
      process.exit(1);
    }

    stats.total = geojson.features.length;
    logger.info(`Parsed ${geojson.features.length} features from GeoJSON`);

    // Truncate table for clean re-runs
    logger.info('Truncating growth_zones table...');
    await pool.query('TRUNCATE TABLE growth_zones RESTART IDENTITY');
    logger.success('Table truncated');

    // Prepare insert statement
    const insertQuery = `
      INSERT INTO growth_zones (
        region_name,
        growth_score,
        classification,
        geom
      ) VALUES (
        $1,
        $2,
        $3,
        ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)
      )
    `;

    // Process each feature
    for (let i = 0; i < geojson.features.length; i++) {
      const feature = geojson.features[i];
      const featureNum = i + 1;

      try {
        const props = feature.properties || {};

        // Validate region_name
        if (!props.region_name) {
          logger.warn(`Feature ${featureNum}: Missing region_name`);
          stats.skipped++;
          continue;
        }

        // Validate growth_score
        const growthScore = validateScore(props.growth_score);
        if (growthScore === null) {
          logger.warn(`Feature ${featureNum}: Invalid growth_score "${props.growth_score}"`);
          stats.skipped++;
          continue;
        }

        // Validate classification
        const classification = props.classification?.toLowerCase();
        if (!classification || !VALID_CLASSIFICATIONS.includes(classification)) {
          logger.warn(
            `Feature ${featureNum}: Invalid classification "${props.classification}" (must be: ${VALID_CLASSIFICATIONS.join(', ')})`,
          );
          stats.skipped++;
          continue;
        }

        // Validate geometry
        if (!feature.geometry || feature.geometry.type !== 'Polygon') {
          logger.warn(`Feature ${featureNum}: Invalid geometry type (expected Polygon)`);
          stats.skipped++;
          continue;
        }

        // Insert row
        await pool.query(insertQuery, [
          props.region_name.trim(),
          growthScore,
          classification,
          JSON.stringify(feature.geometry),
        ]);

        stats.inserted++;
      } catch (error) {
        logger.error(`Feature ${featureNum}: Insert failed`, error);
        stats.errors++;
      }
    }

    printStats('growth_zones', stats);

    // Verify inserted data
    const countResult = await pool.query('SELECT COUNT(*) FROM growth_zones');
    logger.info(`Total records in growth_zones table: ${countResult.rows[0].count}`);

    // Show classification breakdown
    const breakdownResult = await pool.query(`
      SELECT classification, COUNT(*) as count 
      FROM growth_zones 
      GROUP BY classification 
      ORDER BY classification
    `);
    logger.info('Classification breakdown:');
    breakdownResult.rows.forEach((row: { classification: string; count: string }) => {
      logger.info(`  ${row.classification}: ${row.count}`);
    });
  } catch (error) {
    logger.error('Fatal error during growth zones ingestion', error);
    process.exit(1);
  } finally {
    await pool.end();
    logger.info('Database connection closed');
  }
}

// Main execution
const inputFile = process.argv[2] || path.join(__dirname, '../data/growth_zones.geojson');
loadGrowthZones(inputFile);
