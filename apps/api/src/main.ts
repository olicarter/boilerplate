import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RawBodyMiddleware } from './middleware/raw-body.middleware';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.enableCors({ origin: 'https://localhost:5173', credentials: true });
  
  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'ripple-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );
  
  const rawBodyMiddleware = new RawBodyMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) => rawBodyMiddleware.use(req, res, next));
  
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ripple API')
    .setDescription('Liquid democracy voting platform API')
    .setVersion('1.0')
    .addCookieAuth('connect.sid')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.API_PORT ?? 3001);
}

bootstrap();
