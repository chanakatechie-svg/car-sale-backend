import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LOCAL_UPLOAD_ROOT } from './modules/uploads/storage/local.driver';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');
  // Allow the Next.js site (different origin) to load uploaded images.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({ origin: config.get<string[]>('corsOrigins'), credentials: true });
  app.useBodyParser('json', { limit: '2mb' });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // With STORAGE_DRIVER=local, uploaded images are served from here at /uploads/<file>.
  if (config.get('storage.driver') !== 's3') {
    app.useStaticAssets(LOCAL_UPLOAD_ROOT, { prefix: '/uploads/' });
  }

  if (config.get('nodeEnv') !== 'production') {
    const swagger = new DocumentBuilder()
      .setTitle('Car Sale API')
      .setDescription('Public website + admin panel API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));
  }

  app.enableShutdownHooks();

  const port = config.get<number>('port', 4000);
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}/api/v1`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

void bootstrap();
