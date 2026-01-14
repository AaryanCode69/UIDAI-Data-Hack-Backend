import { Controller, Get, UseGuards } from '@nestjs/common';
import { GrowthService } from './growth.service';
import { AuthGuard } from '../auth/auth.guard';
import { GeoJSONFeatureCollection, GrowthZoneProperties } from '../common/types/geojson.types';

@Controller('growth-zones')
@UseGuards(AuthGuard)
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  /**
   * GET /growth-zones
   * Returns all growth zones as GeoJSON FeatureCollection (Polygons)
   */
  @Get()
  async getGrowthZones(): Promise<GeoJSONFeatureCollection<GrowthZoneProperties>> {
    return this.growthService.getGrowthZones();
  }
}
