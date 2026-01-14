import { Module } from '@nestjs/common';
import { DigitalRiskController } from './digital-risk.controller';
import { DigitalRiskService } from './digital-risk.service';

@Module({
  controllers: [DigitalRiskController],
  providers: [DigitalRiskService],
})
export class DigitalRiskModule {}
