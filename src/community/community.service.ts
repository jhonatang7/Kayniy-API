import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Community } from './entities/community.entity';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,
  ) {}

  async create(createCommunityDto: CreateCommunityDto): Promise<Community> {
    const community = this.communityRepository.create(createCommunityDto);
    return await this.communityRepository.save(community);
  }

  async findAll(): Promise<Community[]> {
    return await this.communityRepository.find({
      relations: ['professors', 'students', 'courses', 'modules', 'liveClasses'],
    });
  }

  async findOne(id: string): Promise<Community> {
    const community = await this.communityRepository.findOne({
      where: { id },
      relations: ['professors', 'students', 'courses', 'modules', 'liveClasses'],
    });

    if (!community) {
      throw new NotFoundException(`Community with ID ${id} not found`);
    }

    return community;
  }

  async update(id: string, updateCommunityDto: UpdateCommunityDto): Promise<Community> {
    const community = await this.findOne(id);
    Object.assign(community, updateCommunityDto);
    return await this.communityRepository.save(community);
  }

  async remove(id: string): Promise<void> {
    const community = await this.findOne(id);
    await this.communityRepository.remove(community);
  }

  async addProfessor(communityId: string, professorId: string): Promise<Community> {
    const community = await this.findOne(communityId);
    community.professors = [...(community.professors || []), { id: professorId }] as any;
    return await this.communityRepository.save(community);
  }

  async addStudent(communityId: string, studentId: string): Promise<Community> {
    const community = await this.findOne(communityId);
    community.students = [...(community.students || []), { id: studentId }] as any;
    return await this.communityRepository.save(community);
  }
}