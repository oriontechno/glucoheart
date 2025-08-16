// discussion.module.ts - Gunakan ConfigService
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config'; 
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DiscussionController } from './discussion.controller';
import { DiscussionService } from './discussion.service';
import { DiscussionGateway } from './discussion.gateway';
import { DatabaseModule } from '../db/database.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    JwtModule.registerAsync({  // ✅ Ganti ke registerAsync
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'), 
        signOptions: { 
          expiresIn: configService.get('JWT_EXPIRATION', '1d')
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
  ],
  controllers: [DiscussionController],
  providers: [DiscussionService, DiscussionGateway],
})
export class DiscussionModule {}