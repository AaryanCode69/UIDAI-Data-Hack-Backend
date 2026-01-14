import { Controller, Get, UseGuards } from '@nestjs/common';
import { DigitalRiskService } from './digital-risk.service';
import { AuthGuard } from '../auth/auth.guard';
import { GeoJSONFeatureCollection, DigitalRiskProperties } from '../common/types/geojson.types';

@Controller('digital-risk')
@UseGuards(AuthGuard)
export class DigitalRiskController {
  constructor(private readonly digitalRiskService: DigitalRiskService) {}

  /**
   * GET /digital-risk
   * Returns all digital risk zones as GeoJSON FeatureCollection (Polygons)
   */
  @Get()
  async getDigitalRiskZones(): Promise<GeoJSONFeatureCollection<DigitalRiskProperties>> {
    return this.digitalRiskService.getDigitalRiskZones();
  }
}
