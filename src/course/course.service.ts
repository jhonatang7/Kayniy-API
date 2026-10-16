import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ReorderCourseModulesDto } from './dto/reorder-course-modules.dto';
import { User } from '../user/entities/user.entity';
import { Community } from '../community/entities/community.entity';
import { Module as ModuleEntity } from '../module/entities/module.entity';
import { CourseModule } from '../course-module/entities/course-module.entity';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: createCourseDto.userId },
      });
      if (!user || user.isDeleted) {
        throw new NotFoundException(`User with ID ${createCourseDto.userId} not found`);
      }

      const community = await queryRunner.manager.findOne(Community, {
        where: { id: createCourseDto.communityId },
      });
      if (!community || community.deletedAt) {
        throw new NotFoundException(`Community with ID ${createCourseDto.communityId} not found`);
      }

      const moduleIds = createCourseDto.modules.map(module => module.moduleId);
      const orderValues = createCourseDto.modules.map(module => module.order);
      if (new Set(moduleIds).size !== moduleIds.length) {
        throw new BadRequestException('A module cannot be assigned more than once to the same course');
      }
      if (new Set(orderValues).size !== orderValues.length) {
        throw new BadRequestException('Each module must have a different order value');
      }

      const modules = await queryRunner.manager.find(ModuleEntity, {
        where: { id: In(moduleIds) },
      });
      if (modules.length !== moduleIds.length) {
        const foundModuleIds = new Set(modules.map(module => module.id));
        const missingModuleId = moduleIds.find(moduleId => !foundModuleIds.has(moduleId));
        throw new NotFoundException(`Module with ID ${missingModuleId} not found`);
      }

      const course = queryRunner.manager.create(Course, {
        name: createCourseDto.name,
        description: createCourseDto.description,
        level: createCourseDto.level,
        isDeleted: false,
        user,
        community,
      });
      const savedCourse = await queryRunner.manager.save(Course, course);

      const moduleById = new Map(modules.map(module => [module.id, module]));
      const courseModules = createCourseDto.modules.map(module =>
        queryRunner.manager.create(CourseModule, {
          course: savedCourse,
          module: moduleById.get(module.moduleId)!,
          order: module.order,
        }),
      );
      savedCourse.courseModules = await queryRunner.manager.save(CourseModule, courseModules);

      await queryRunner.commitTransaction();
      return savedCourse;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Course[]> {
    return await this.courseRepository.find({
      where: { isDeleted: false },
      relations: [
        'user',
        'community',
        'courseModules',
        'courseModules.module',
        'courseModules.module.lessons',
      ],
    });
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id, isDeleted: false },
      relations: [
        'user',
        'community',
        'courseModules',
        'courseModules.module',
        'courseModules.module.lessons',
      ],
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.findOne(id);

    Object.assign(course, updateCourseDto);
    return await this.courseRepository.save(course);
  }

  async reorderModules(reorderCourseModulesDto: ReorderCourseModulesDto): Promise<CourseModule[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { courseId, modules } = reorderCourseModulesDto;
      const course = await queryRunner.manager.findOne(Course, {
        where: { id: courseId, isDeleted: false },
      });

      if (!course) {
        throw new NotFoundException(`Course with ID ${courseId} not found`);
      }

      const moduleIds = modules.map(module => module.moduleId);
      const orderValues = modules.map(module => module.order);

      if (new Set(moduleIds).size !== moduleIds.length) {
        throw new BadRequestException('A module cannot be included more than once');
      }

      if (new Set(orderValues).size !== orderValues.length) {
        throw new BadRequestException('Each module must have a different order value');
      }

      const courseModules = await queryRunner.manager.find(CourseModule, {
        where: { course: { id: courseId } },
        relations: ['module'],
      });

      if (courseModules.length !== modules.length) {
        throw new BadRequestException(
          'The reorder list must include every module assigned to the course',
        );
      }

      const courseModuleByModuleId = new Map(
        courseModules.map(courseModule => [courseModule.module?.id, courseModule]),
      );

      for (const module of modules) {
        const courseModule = courseModuleByModuleId.get(module.moduleId);

        if (!courseModule) {
          throw new NotFoundException(
            `Module with ID ${module.moduleId} is not assigned to course ${courseId}`,
          );
        }

        courseModule.order = module.order;
      }

      const updatedCourseModules = await queryRunner.manager.save(CourseModule, courseModules);
      await queryRunner.commitTransaction();

      return updatedCourseModules.sort((first, second) => first.order - second.order);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const course = await queryRunner.manager.findOne(Course, {
        where: { id, isDeleted: false },
      });

      if (!course) {
        throw new NotFoundException(`Course with ID ${id} not found`);
      }

      const courseModules = await queryRunner.manager.find(CourseModule, {
        where: { course: { id } },
      });

      if (courseModules.length > 0) {
        await queryRunner.manager.remove(CourseModule, courseModules);
      }

      await queryRunner.manager.remove(Course, course);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findByCommunity(communityId: string): Promise<Course[]> {
    return await this.courseRepository.find({
      where: { community: { id: communityId }, isDeleted: false },
      relations: [
        'user',
        'community',
        'courseModules',
        'courseModules.module',
        'courseModules.module.lessons',
      ],
    });
  }

  async findByUser(userId: string): Promise<Course[]> {
    return await this.courseRepository.find({
      where: { user: { id: userId }, isDeleted: false },
      relations: [
        'user',
        'community',
        'courseModules',
        'courseModules.module',
        'courseModules.module.lessons',
      ],
    });
  }
}