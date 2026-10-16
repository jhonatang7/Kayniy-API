import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseModule } from './entities/course-module.entity';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';

@Injectable()
export class CourseModuleService {
  constructor(
    @InjectRepository(CourseModule)
    private readonly courseModuleRepository: Repository<CourseModule>,
  ) {}

  async create(createCourseModuleDto: CreateCourseModuleDto): Promise<CourseModule> {
    const existing = await this.courseModuleRepository.findOne({
      where: {
        course: { id: createCourseModuleDto.courseId },
        module: { id: createCourseModuleDto.moduleId },
      },
    });

    if (existing) {
      throw new ConflictException('The module is already assigned to this course');
    }

    const courseModule = this.courseModuleRepository.create({
      course: { id: createCourseModuleDto.courseId },
      module: { id: createCourseModuleDto.moduleId },
      order: createCourseModuleDto.order,
    });

    return await this.courseModuleRepository.save(courseModule);
  }

  async findAll(): Promise<CourseModule[]> {
    return await this.courseModuleRepository.find({
      relations: ['course', 'module'],
      order: { order: 'ASC' },
    });
  }

  async findByCourse(courseId: string): Promise<CourseModule[]> {
    return await this.courseModuleRepository.find({
      where: { course: { id: courseId } },
      relations: ['course', 'module'],
      order: { order: 'ASC' },
    });
  }

  async findOne(id: string): Promise<CourseModule> {
    const courseModule = await this.courseModuleRepository.findOne({
      where: { id },
      relations: ['course', 'module'],
    });

    if (!courseModule) {
      throw new NotFoundException(`Course-module relation with ID ${id} not found`);
    }

    return courseModule;
  }

  async update(id: string, updateCourseModuleDto: UpdateCourseModuleDto): Promise<CourseModule> {
    const courseModule = await this.findOne(id);

    if (updateCourseModuleDto.order !== undefined) {
      courseModule.order = updateCourseModuleDto.order;
    }

    return await this.courseModuleRepository.save(courseModule);
  }

  async remove(id: string): Promise<void> {
    const courseModule = await this.findOne(id);
    await this.courseModuleRepository.remove(courseModule);
  }
}