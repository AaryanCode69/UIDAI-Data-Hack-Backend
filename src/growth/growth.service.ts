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
  GrowthZoneProperties,
} from '../common/types/geojson.types';

interface GrowthZoneRow {
  id: string;
  region_name: string;
  growth_score: number;
  classification: 'rural' | 'peri-urban' | 'urban';
  created_at: Date;
  geojson: string;
}

@Injectable()
export class GrowthService {
  private readonly logger = new Logger(GrowthService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Retrieves all growth zones as a GeoJSON FeatureCollection
   * Each feature is a Polygon representing a classified region
   */
  async getGrowthZones(): Promise<
    GeoJSONFeatureCollection<GrowthZoneProperties>
  > {
    this.logger.debug('Fetching growth zones');

    try {
      const result = await this.databaseService.query<GrowthZoneRow>(`
        SELECT 
          id,
          region_name,
          growth_score,
          classification,
          created_at,
          ST_AsGeoJSON(geom) as geojson
        FROM growth_zones
        ORDER BY growth_score DESC
      `);

      const features: GeoJSONFeature<GrowthZoneProperties>[] = result.rows.map(
        (row) => ({
          type: 'Feature',
          geometry: JSON.parse(row.geojson) as GeoJSONGeometry,
          properties: {
            id: row.id,
            region_name: row.region_name,
            growth_score: row.growth_score,
            classification: row.classification,
            created_at: row.created_at.toISOString(),
          },
        }),
      );

      this.logger.debug(`Retrieved ${features.length} growth zones`);

      return {
        type: 'FeatureCollection',
        features,
      };
    } catch (error) {
      this.logger.error('Failed to fetch growth zones', error);
      throw new InternalServerErrorException(
        'Failed to retrieve growth zone data',
      );
    }
  }
}
