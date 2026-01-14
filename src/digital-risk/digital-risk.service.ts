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
  GeoJSONGeometry,
} from '../common/types/geojson.types';

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

      const features: GeoJSONFeature<DigitalRiskProperties>[] = result.rows.map(
        (row) => ({
          type: 'Feature',
          geometry: JSON.parse(row.geojson) as GeoJSONGeometry,
          properties: {
            id: row.id,
            region_name: row.region_name,
            risk_score: row.risk_score,
            risk_level: row.risk_level,
            factors: row.factors,
            created_at: row.created_at.toISOString(),
          },
        }),
      );

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
