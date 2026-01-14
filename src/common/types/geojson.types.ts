/**
 * GeoJSON type definitions for API responses
 */

export interface GeoJSONGeometry {
  type: string;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

export interface GeoJSONFeature<T = Record<string, unknown>> {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: T;
}

export interface GeoJSONFeatureCollection<T = Record<string, unknown>> {
  type: 'FeatureCollection';
  features: GeoJSONFeature<T>[];
}

/**
 * Migration flow properties
 */
export interface MigrationFlowProperties {
  id: string;
  origin_region: string;
  destination_region: string;
  migration_score: number;
  year: number;
  created_at: string;
}

/**
 * Growth zone properties
 */
export interface GrowthZoneProperties {
  id: string;
  region_name: string;
  growth_score: number;
  classification: 'rural' | 'peri-urban' | 'urban';
  created_at: string;
}

/**
 * Digital risk properties
 */
export interface DigitalRiskProperties {
  id: string;
  region_name: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  factors: Record<string, number>;
  created_at: string;
}
