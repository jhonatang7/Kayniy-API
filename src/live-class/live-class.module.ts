import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveClassService } from './live-class.service';
import { LiveClassController } from './live-class.controller';
import { LiveClass } from './entities/live-class.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LiveClass])],
  controllers: [LiveClassController],
  providers: [LiveClassService],
  exports: [LiveClassService],
})
export class LiveClassModule {}