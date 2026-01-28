import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers - disable CSP for API server (frontend handles its own CSP)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS
  const configuredOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  app.enableCors({
    origin: configuredOrigins.length ? configuredOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Validation
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

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Calo Security Assessment API')
    .setDescription(
      'API for the Black-Box Security Posture Assessment Platform. ' +
        'This API supports low-volume, non-disruptive collection of public security evidence.',
    )
    .setVersion('1.0')
    .addTag('organizations', 'Organization management')
    .addTag('assessments', 'Security assessments')
    .addTag('assets', 'Asset discovery and management')
    .addTag('observations', 'Security observations')
    .addTag('evidence', 'Evidence collection and management')
    .addTag('risks', 'Risk ranking and management')
    .addTag('actions', 'Action plan items')
    .addTag('audit-controls', 'Audit control definitions')
    .addTag('tool-runs', 'Security tool execution')
    .addTag('reports', 'Report generation')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
