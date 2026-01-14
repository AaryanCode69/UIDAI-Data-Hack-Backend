import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  GeoJSONFeatureCollection,
  GeoJSONFeature,
  DigitalRiskProperties,
} from '../common/types/geojson.types';
import {
  safeParseGeometry,
  safeISOString,
  emptyFeatureCollection,
} from '../common/utils/geojson.utils';

interface DigitalRiskRow {
  id: string;
  region_name: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  factors: Record<string, number>;
  created_at: Date;
  geojson: string;
}

@Injectable()
export class DigitalRiskService {
  private readonly logger = new Logger(DigitalRiskService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Retrieves all digital risk regions as a GeoJSON FeatureCollection
   * Each feature is a Polygon representing a risk-assessed region
   * Returns empty FeatureCollection if no data or on error
   */
  async getDigitalRiskZones(): Promise<
    GeoJSONFeatureCollection<DigitalRiskProperties>
  > {
    this.logger.debug('Fetching digital risk zones');

    try {
      const result = await this.databaseService.query<DigitalRiskRow>(`
        SELECT 
          id,
          region_name,
          risk_score,
          risk_level,
          factors,
          created_at,
          ST_AsGeoJSON(geom) as geojson
        FROM digital_risk
        ORDER BY risk_score DESC
      `);

      // Handle empty result set
      if (!result.rows || result.rows.length === 0) {
        this.logger.debug('No digital risk zones found');
        return emptyFeatureCollection<DigitalRiskProperties>();
      }

      const features: GeoJSONFeature<DigitalRiskProperties>[] = [];
      let skippedCount = 0;

      for (const row of result.rows) {
        // Safely parse geometry - skip rows with invalid geometry
        const geometry = safeParseGeometry(row.geojson);
        if (!geometry) {
          skippedCount++;
          this.logger.warn(`Skipping row ${row.id}: invalid geometry`);
          continue;
        }

        features.push({
          type: 'Feature',
          geometry,
          properties: {
            id: row.id ?? '',
            region_name: row.region_name ?? 'Unknown',
            risk_score: row.risk_score ?? 0,
            risk_level: row.risk_level ?? 'low',
            factors: row.factors ?? {},
            created_at: safeISOString(row.created_at),
          },
        });
      }

      if (skippedCount > 0) {
        this.logger.warn(`Skipped ${skippedCount} rows with invalid geometry`);
      }

      this.logger.debug(`Retrieved ${features.length} digital risk zones`);

      return {
        type: 'FeatureCollection',
        features,
      };
    } catch (error) {
      this.logger.error('Failed to fetch digital risk zones', error);
      throw new InternalServerErrorException(
        'Failed to retrieve digital risk data',
      );
    }
  }
}
