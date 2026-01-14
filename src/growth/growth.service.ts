import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  GeoJSONFeatureCollection,
  GeoJSONFeature,
  GrowthZoneProperties,
} from '../common/types/geojson.types';
import {
  safeParseGeometry,
  safeISOString,
  emptyFeatureCollection,
} from '../common/utils/geojson.utils';

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
   * Returns empty FeatureCollection if no data or on error
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

      // Handle empty result set
      if (!result.rows || result.rows.length === 0) {
        this.logger.debug('No growth zones found');
        return emptyFeatureCollection<GrowthZoneProperties>();
      }

      const features: GeoJSONFeature<GrowthZoneProperties>[] = [];
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
            growth_score: row.growth_score ?? 0,
            classification: row.classification ?? 'rural',
            created_at: safeISOString(row.created_at),
          },
        });
      }

      if (skippedCount > 0) {
        this.logger.warn(`Skipped ${skippedCount} rows with invalid geometry`);
      }

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
