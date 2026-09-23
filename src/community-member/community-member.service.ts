import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CommunityMember, CommunityRole } from './entities/community-member.entity';
import { CreateCommunityMemberDto, CommunityMemberType } from './dto/create-community-member.dto';
import { UpdateCommunityMemberDto } from './dto/update-community-member.dto';
import { Community } from '../community/entities/community.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class CommunityMemberService {
  constructor(
    @InjectRepository(CommunityMember)
    private readonly communityMemberRepository: Repository<CommunityMember>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createCommunityMemberDto: CreateCommunityMemberDto): Promise<CommunityMember[]> {
    const { communityId, communityRole, userIds } = createCommunityMemberDto;
    const uniqueUserIds = [...new Set(userIds)];

    if (uniqueUserIds.length !== userIds.length) {
      throw new BadRequestException('userIds must not contain duplicates');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const community = await queryRunner.manager.findOne(Community, {
        where: { id: communityId },
      });

      if (!community) {
        throw new NotFoundException(`Community with ID ${communityId} not found`);
      }

      const users = await queryRunner.manager.find(User, {
        where: uniqueUserIds.map(id => ({ id, isDeleted: false })),
        relations: ['role'],
      });

      if (users.length !== uniqueUserIds.length) {
        throw new NotFoundException('One or more users were not found');
      }

      const expectedRole = communityRole === CommunityMemberType.TEACHER ? 'teacher' : 'student';
      const invalidRoleUser = users.find(user => user.role?.name.toLowerCase() !== expectedRole);

      if (invalidRoleUser) {
        throw new BadRequestException(
          `User ${invalidRoleUser.id} does not have the ${expectedRole} role`,
        );
      }

      const existingMembers = await queryRunner.manager.find(CommunityMember, {
        where: uniqueUserIds.map(userId => ({
          community: { id: communityId },
          user: { id: userId },
        })),
      });

      if (existingMembers.length > 0) {
        throw new ConflictException('One or more users are already members of this community');
      }

      const members = uniqueUserIds.map(userId =>
        queryRunner.manager.create(CommunityMember, {
          communityRole:
            communityRole === CommunityMemberType.TEACHER
              ? CommunityRole.TEACHER
              : CommunityRole.STUDENT,
          community,
          user: { id: userId },
        }),
      );

      const savedMembers = await queryRunner.manager.save(CommunityMember, members);
      await queryRunner.commitTransaction();
      return savedMembers;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return `This action returns all communityMember`;
  }

  findOne(id: number) {
    return `This action returns a #${id} communityMember`;
  }

  update(id: number, updateCommunityMemberDto: UpdateCommunityMemberDto) {
    return `This action updates a #${id} communityMember`;
  }

  async findByCommunity(communityId: string): Promise<CommunityMember[]> {
    return this.communityMemberRepository.find({
      where: { community: { id: communityId } },
      relations: ['user'],
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.communityMemberRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Community member with ID ${id} not found`);
    }
  }
}
