import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const uploadsDir = join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  app.enableCors({
    origin: function (origin, callback) {
      // Izinkan request tanpa origin
      if (!origin) return callback(null, true);
      
      // Izinkan Localhost
      if (origin.includes('localhost')) return callback(null, true);

      // Izinkan semua subdomain vercel (.vercel.app)
      if (origin.endsWith('.vercel.app')) return callback(null, true);

      // Block sisanya
      callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();