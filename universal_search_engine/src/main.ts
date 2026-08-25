import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { CustomLogger } from './common/logger/logger.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ApiVersionInterceptor } from './common/interceptors/api-version.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(CustomLogger);
  app.useLogger(logger);

  // Enable security headers and response compression
  app.use(helmet());
  app.use(compression());

  // Global API Prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['api/docs'],
  });

  // Enable CORS
  app.enableCors();

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  // Global Interceptors
  app.useGlobalInterceptors(new ApiVersionInterceptor());

  // Swagger OpenAPI Documentation Configuration
  const config = new DocumentBuilder()
    .setTitle('Universal Open Knowledge Search Engine API')
    .setDescription(
      'Aggregated open-access search engine across 30+ sources covering books, papers, datasets, patents, open-source repos, government publications, and documentation.',
    )
    .setVersion('1.0.0')
    .addApiKey(
      { type: 'apiKey', name: 'x-api-key', in: 'header' },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Server running on port ${port}`, 'Bootstrap');
  logger.log(`Swagger UI documentation available at http://localhost:${port}/api/docs`, 'Bootstrap');
  logger.log(`Health check available at http://localhost:${port}/api/v1/health`, 'Bootstrap');
}

bootstrap();
