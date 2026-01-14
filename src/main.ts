import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // Apply global exception filter for consistent error responses
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Enable CORS for frontend integration
    app.enableCors();

    const port = process.env.PORT ?? 3000;
    await app.listen(port);

    logger.log(`🚀 Saarthi-Net server is running on port ${port}`);
    logger.log(`📍 Environment: ${process.env.NODE_ENV ?? 'development'}`);
  } catch (error) {
    logger.error('❌ Failed to start the application', error);
    process.exit(1);
  }
}

bootstrap();
