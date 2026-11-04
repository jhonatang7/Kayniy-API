import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { Embedding } from './entities/embedding.entity';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [TypeOrmModule.forFeature([Embedding]), AnalyticsModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
