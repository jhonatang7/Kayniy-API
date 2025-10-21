import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    const course = this.courseRepository.create({
      name: createCourseDto.name,
      description: createCourseDto.description,
      level: createCourseDto.level,
      isDeleted: createCourseDto.isDeleted || false,
      user: { id: createCourseDto.userId },
      community: { id: createCourseDto.communityId },
    });

    return await this.courseRepository.save(course);
  }

  async findAll(): Promise<Course[]> {
    return await this.courseRepository.find({
      where: { isDeleted: false },
      relations: ['user', 'community', 'modules'],
    });
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['user', 'community', 'modules'],
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.findOne(id);

    if (updateCourseDto.userId) {
      course.user = { id: updateCourseDto.userId } as any;
    }

    if (updateCourseDto.communityId) {
      course.community = { id: updateCourseDto.communityId } as any;
    }

    Object.assign(course, updateCourseDto);
    return await this.courseRepository.save(course);
  }

  async remove(id: string): Promise<void> {
    const course = await this.findOne(id);
    course.isDeleted = true;
    await this.courseRepository.save(course);
  }

  async findByCommunity(communityId: string): Promise<Course[]> {
    return await this.courseRepository.find({
      where: { community: { id: communityId }, isDeleted: false },
      relations: ['user', 'community', 'modules'],
    });
  }

  async findByUser(userId: string): Promise<Course[]> {
    return await this.courseRepository.find({
      where: { user: { id: userId }, isDeleted: false },
      relations: ['user', 'community', 'modules'],
    });
  }
}