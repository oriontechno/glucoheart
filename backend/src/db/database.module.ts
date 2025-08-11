import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createDrizzleConnection } from './index';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return createDrizzleConnection({
          host: configService.get('DB_HOST') || 'localhost',
          port: parseInt(configService.get('DB_PORT') || '5432'),
          user: configService.get('DB_USER') || 'postgres',
          password: configService.get('DB_PASSWORD') || '123',
          database: configService.get('DB_NAME') || 'glucoheart',
          ssl: false,
        });
      },
    },
  ],
  exports: ['DATABASE_CONNECTION'],
})
export class DatabaseModule {}
