import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Expose folder "uploads" agar gambar bisa diakses
  const uploadsDir = join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Konfigurasi CORS yang Benar
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Pastikan port sesuai
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();