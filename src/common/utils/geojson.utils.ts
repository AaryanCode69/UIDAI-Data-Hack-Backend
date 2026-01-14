import { Logger } from '@nestjs/common';
import { GeoJSONGeometry, GeoJSONFeature } from '../types/geojson.types';

const logger = new Logger('GeoJSONUtils');

/**
 * Safely parses a GeoJSON string from PostGIS ST_AsGeoJSON output
 * Returns null if parsing fails or geometry is invalid
 */
export function safeParseGeometry(
  geojsonString: string | null | undefined,
): GeoJSONGeometry | null {
  if (!geojsonString) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(geojsonString);

    // Validate basic GeoJSON structure
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const geojson = parsed as Record<string, unknown>;
    if (!geojson.type || !geojson.coordinates) {
      logger.warn('Invalid GeoJSON: missing type or coordinates');
      return null;
    }

    return parsed as GeoJSONGeometry;
  } catch {
    logger.warn(
      `Failed to parse GeoJSON: ${geojsonString.substring(0, 100)}...`,
    );
    return null;
  }
}

/**
 * Creates a GeoJSON Feature with defensive null handling
 * Skips features with invalid geometry
 */
export function createFeature<T extends Record<string, unknown>>(
  geometry: GeoJSONGeometry | null,
  properties: T,
): GeoJSONFeature<T> | null {
  if (!geometry) {
    return null;
  }

  return {
    type: 'Feature',
    geometry,
    properties: properties ?? ({} as T),
  };
}

/**
 * Creates an empty GeoJSON FeatureCollection
 * Used as fallback when no data or errors occur
 */
export function emptyFeatureCollection<T = Record<string, unknown>>(): {
  type: 'FeatureCollection';
  features: GeoJSONFeature<T>[];
} {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

/**
 * Safely converts a date to ISO string
 * Returns current timestamp if date is invalid
 */
export function safeISOString(date: Date | string | null | undefined): string {
  if (!date) {
    return new Date().toISOString();
  }

  try {
    if (date instanceof Date) {
      return date.toISOString();
    }
    return new Date(date).toISOString();
  } catch {
    return new Date().toISOString();
  }
}
