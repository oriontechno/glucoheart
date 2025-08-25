import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { DatabaseModule } from '../db/database.module';
import { TokenBlacklistService } from 'src/auth/token-blacklist.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ArticlesController],
  providers: [ArticlesService, TokenBlacklistService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
