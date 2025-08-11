import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DiscussionController } from './discussion.controller';
import { DiscussionService } from './discussion.service';
import { DiscussionGateway } from './discussion.gateway';
import { DatabaseModule } from '../db/database.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret',
      signOptions: { expiresIn: '7d' },
    }),
    DatabaseModule,
  ],
  controllers: [DiscussionController],
  providers: [DiscussionService, DiscussionGateway],
})
export class DiscussionModule {}
