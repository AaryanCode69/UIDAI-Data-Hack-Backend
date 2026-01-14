import { Controller, Get, UseGuards } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { AuthGuard } from '../auth/auth.guard';
import { GeoJSONFeatureCollection, MigrationFlowProperties } from '../common/types/geojson.types';

@Controller('migration')
@UseGuards(AuthGuard)
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  /**
   * GET /migration
   * Returns all migration flows as GeoJSON FeatureCollection (LineStrings)
   */
  @Get()
  async getMigrationFlows(): Promise<GeoJSONFeatureCollection<MigrationFlowProperties>> {
    return this.migrationService.getMigrationFlows();
  }
}
