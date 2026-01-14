/**
 * Saarthi-Net Data Ingestion Script
 * Load Digital Risk from GeoJSON into PostGIS
 *
 * Expected GeoJSON structure:
 * {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "properties": {
 *         "region_name": "...",
 *         "risk_score": 0.8,
 *         "risk_level": "high",
 *         "factors": { "internet_coverage": 0.3, ... }
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

interface RiskFactors {
  [key: string]: number | string;
}

interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    region_name?: string;
    risk_score?: number | string;
    risk_level?: string;
    factors?: RiskFactors;
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

const VALID_RISK_LEVELS = ['low', 'medium', 'high'];

async function loadDigitalRisk(filePath: string): Promise<void> {
  logger.divider();
  logger.info('Starting Digital Risk Ingestion');
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
    logger.info('Truncating digital_risk table...');
    await pool.query('TRUNCATE TABLE digital_risk RESTART IDENTITY');
    logger.success('Table truncated');

    // Prepare insert statement
    const insertQuery = `
      INSERT INTO digital_risk (
        region_name,
        risk_score,
        risk_level,
        factors,
        geom
      ) VALUES (
        $1,
        $2,
        $3,
        $4::jsonb,
        ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)
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

        // Validate risk_score
        const riskScore = validateScore(props.risk_score);
        if (riskScore === null) {
          logger.warn(`Feature ${featureNum}: Invalid risk_score "${props.risk_score}"`);
          stats.skipped++;
          continue;
        }

        // Validate risk_level
        const riskLevel = props.risk_level?.toLowerCase();
        if (!riskLevel || !VALID_RISK_LEVELS.includes(riskLevel)) {
          logger.warn(
            `Feature ${featureNum}: Invalid risk_level "${props.risk_level}" (must be: ${VALID_RISK_LEVELS.join(', ')})`,
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

        // Prepare factors (default to empty object if not provided)
        const factors = props.factors && typeof props.factors === 'object' ? props.factors : {};

        // Insert row
        await pool.query(insertQuery, [
          props.region_name.trim(),
          riskScore,
          riskLevel,
          JSON.stringify(factors),
          JSON.stringify(feature.geometry),
        ]);

        stats.inserted++;
      } catch (error) {
        logger.error(`Feature ${featureNum}: Insert failed`, error);
        stats.errors++;
      }
    }

    printStats('digital_risk', stats);

    // Verify inserted data
    const countResult = await pool.query('SELECT COUNT(*) FROM digital_risk');
    logger.info(`Total records in digital_risk table: ${countResult.rows[0].count}`);

    // Show risk level breakdown
    const breakdownResult = await pool.query(`
      SELECT risk_level, COUNT(*) as count 
      FROM digital_risk 
      GROUP BY risk_level 
      ORDER BY risk_level
    `);
    logger.info('Risk level breakdown:');
    breakdownResult.rows.forEach((row: { risk_level: string; count: string }) => {
      logger.info(`  ${row.risk_level}: ${row.count}`);
    });
  } catch (error) {
    logger.error('Fatal error during digital risk ingestion', error);
    process.exit(1);
  } finally {
    await pool.end();
    logger.info('Database connection closed');
  }
}

// Main execution
const inputFile = process.argv[2] || path.join(__dirname, '../data/digital_risk.geojson');
loadDigitalRisk(inputFile);
