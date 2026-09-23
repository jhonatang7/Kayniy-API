import { Module } from '@nestjs/common';
import { CommunityMemberService } from './community-member.service';
import { CommunityMemberController } from './community-member.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityMember } from './entities/community-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommunityMember])],
  controllers: [CommunityMemberController],
  providers: [CommunityMemberService],
})
export class CommunityMemberModule {}
