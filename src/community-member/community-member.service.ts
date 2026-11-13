import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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

      const existingMembers = await queryRunner.manager.find(CommunityMember, {
        where: uniqueUserIds.map(userId => ({
          user: { id: userId },
        })),
        relations: ['user'],
      });
      const existingUserIds = new Set(
        existingMembers.map(member => member.user?.id).filter(Boolean),
      );
      const usersToAdd = users.filter(user => !existingUserIds.has(user.id));

      const expectedRole = communityRole === CommunityMemberType.TEACHER ? 'teacher' : 'student';
      const invalidRoleUser = usersToAdd.find(
        user => user.role?.name.toLowerCase() !== expectedRole,
      );

      if (invalidRoleUser) {
        throw new BadRequestException(
          `User ${invalidRoleUser.id} does not have the ${expectedRole} role`,
        );
      }

      if (usersToAdd.length === 0) {
        if (uniqueUserIds.length === 1) {
          throw new ConflictException(
            'Este usuario ya pertenece a una comunidad',
          );
        }

        await queryRunner.commitTransaction();
        return [];
      }

      const members = usersToAdd.map(user =>
        queryRunner.manager.create(CommunityMember, {
          communityRole:
            communityRole === CommunityMemberType.TEACHER
              ? CommunityRole.TEACHER
              : CommunityRole.STUDENT,
          community,
          user: { id: user.id },
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

  async assertMember(communityId: string, userId: string): Promise<CommunityMember> {
    const member = await this.communityMemberRepository.findOne({
      where: { community: { id: communityId }, user: { id: userId } },
      relations: ['community', 'user'],
    });

    if (!member) {
      throw new ForbiddenException(
        'The user is not an active member of this community',
      );
    }

    return member;
  }

  async remove(id: string): Promise<void> {
    const result = await this.communityMemberRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Community member with ID ${id} not found`);
    }
  }
}
