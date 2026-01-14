import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  GeoJSONFeatureCollection,
  GeoJSONFeature,
  MigrationFlowProperties,
} from '../common/types/geojson.types';
import {
  safeParseGeometry,
  safeISOString,
  emptyFeatureCollection,
} from '../common/utils/geojson.utils';

interface MigrationFlowRow {
  id: string;
  origin_region: string;
  destination_region: string;
  migration_score: number;
  year: number;
  created_at: Date;
  geojson: string;
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Retrieves all migration flows as a GeoJSON FeatureCollection
   * Each feature is a LineString from origin to destination
   * Returns empty FeatureCollection if no data or on error
   */
  async getMigrationFlows(): Promise<
    GeoJSONFeatureCollection<MigrationFlowProperties>
  > {
    this.logger.debug('Fetching migration flows');

    try {
      const result = await this.databaseService.query<MigrationFlowRow>(`
        SELECT 
          id,
          origin_region,
          destination_region,
          migration_score,
          year,
          created_at,
          ST_AsGeoJSON(geom) as geojson
        FROM migration_flows
        ORDER BY migration_score DESC
      `);

      // Handle empty result set
      if (!result.rows || result.rows.length === 0) {
        this.logger.debug('No migration flows found');
        return emptyFeatureCollection<MigrationFlowProperties>();
      }

      const features: GeoJSONFeature<MigrationFlowProperties>[] = [];
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
            origin_region: row.origin_region ?? 'Unknown',
            destination_region: row.destination_region ?? 'Unknown',
            migration_score: row.migration_score ?? 0,
            year: row.year ?? new Date().getFullYear(),
            created_at: safeISOString(row.created_at),
          },
        });
      }

      if (skippedCount > 0) {
        this.logger.warn(`Skipped ${skippedCount} rows with invalid geometry`);
      }

      this.logger.debug(`Retrieved ${features.length} migration flows`);

      return {
        type: 'FeatureCollection',
        features,
      };
    } catch (error) {
      this.logger.error('Failed to fetch migration flows', error);
      throw new InternalServerErrorException(
        'Failed to retrieve migration data',
      );
    }
  }
}
