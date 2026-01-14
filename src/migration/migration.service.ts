import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  GeoJSONFeatureCollection,
  GeoJSONFeature,
  GeoJSONGeometry,
  MigrationFlowProperties,
} from '../common/types/geojson.types';

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

      const features: GeoJSONFeature<MigrationFlowProperties>[] =
        result.rows.map((row) => ({
          type: 'Feature',
          geometry: JSON.parse(row.geojson) as GeoJSONGeometry,
          properties: {
            id: row.id,
            origin_region: row.origin_region,
            destination_region: row.destination_region,
            migration_score: row.migration_score,
            year: row.year,
            created_at: row.created_at.toISOString(),
          },
        }));

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
