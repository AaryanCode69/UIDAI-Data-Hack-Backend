import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MigrationModule } from './migration/migration.module';
import { GrowthModule } from './growth/growth.module';
import { DigitalRiskModule } from './digital-risk/digital-risk.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    MigrationModule,
    GrowthModule,
    DigitalRiskModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
