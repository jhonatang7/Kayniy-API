import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModuleProgressService } from './user-module-progress.service';
import { UserModuleProgressController } from './user-module-progress.controller';
import { UserModuleProgress } from './entities/user-module-progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserModuleProgress])],
  controllers: [UserModuleProgressController],
  providers: [UserModuleProgressService],
  exports: [UserModuleProgressService],
})
export class UserModuleProgressModule {}