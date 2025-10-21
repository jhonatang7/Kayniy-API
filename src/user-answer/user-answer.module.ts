import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAnswerService } from './user-answer.service';
import { UserAnswerController } from './user-answer.controller';
import { UserAnswer } from './entities/user-answer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserAnswer])],
  controllers: [UserAnswerController],
  providers: [UserAnswerService],
  exports: [UserAnswerService],
})
export class UserAnswerModule {}