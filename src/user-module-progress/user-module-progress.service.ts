import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { UserModuleProgress } from './entities/user-module-progress.entity';
import { CreateUserModuleProgressDto } from './dto/create-user-module-progress.dto';
import { CompleteModuleDto } from './dto/complete-module.dto';
import { Module as CourseModuleEntity } from '../module/entities/module.entity';
import { Lesson } from '../lesson/entities/lesson.entity';
import { Quiz } from '../quiz/entities/quiz.entity';
import { UserProgress } from '../user-progress/entities/user-progress.entity';
import { UserQuizAttempt } from '../user-quiz-attempt/entities/user-quiz-attempt.entity';
import { CourseEnrollment } from '../course_enrollment/entities/course-enrollment.entity';

@Injectable()
export class UserModuleProgressService {
  constructor(
    @InjectRepository(UserModuleProgress)
    private readonly userModuleProgressRepository: Repository<UserModuleProgress>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDto: CreateUserModuleProgressDto): Promise<UserModuleProgress> {
    const progress = this.userModuleProgressRepository.create({
      isCompleted: createDto.isCompleted,
      user: { id: createDto.userId },
      module: { id: createDto.moduleId },
      courseEnrollment: { id: createDto.courseEnrollmentId },
    });
    return await this.userModuleProgressRepository.save(progress);
  }

  async complete(
    completeDto: CompleteModuleDto,
    userId: string,
  ): Promise<UserModuleProgress> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const [module, enrollment] = await Promise.all([
        queryRunner.manager.findOne(CourseModuleEntity, {
          where: { id: completeDto.moduleId },
          relations: ['lessons', 'quiz'],
        }),
        queryRunner.manager.findOne(CourseEnrollment, {
          where: { id: completeDto.courseEnrollmentId, user: { id: userId } },
          relations: [
            'user',
            'course',
            'course.courseModules',
            'course.courseModules.module',
          ],
        }),
      ]);

      if (!module) {
        throw new NotFoundException(
          `Module with ID ${completeDto.moduleId} not found`,
        );
      }

      if (!enrollment) {
        throw new NotFoundException(
          `Course enrollment with ID ${completeDto.courseEnrollmentId} not found for this user`,
        );
      }

      const courseModule = enrollment.course.courseModules.find(
        courseModule => courseModule.module.id === module.id,
      );
      if (!courseModule) {
        throw new BadRequestException(
          'The module does not belong to the enrolled course',
        );
      }

      const lessonIds = module.lessons.map(lesson => lesson.id);
      const completedLessonCount =
        lessonIds.length === 0
          ? 0
          : await queryRunner.manager.count(UserProgress, {
              where: {
                user: { id: userId },
                lesson: { id: In(lessonIds) },
                courseEnrollment: { id: enrollment.id },
                isCompleted: true,
              },
            });

      if (completedLessonCount !== lessonIds.length) {
        throw new BadRequestException(
          'Se requiere terminar todas las lecciones',
        );
      }

      if (module.quiz) {
        const latestAttempt = await queryRunner.manager.findOne(
          UserQuizAttempt,
          {
            where: {
              user: { id: userId },
              quiz: { id: module.quiz.id },
              courseEnrollment: { id: enrollment.id },
            },
            order: { attemptDate: 'DESC' },
          },
        );

        if (!latestAttempt?.aprobed) {
          throw new BadRequestException(
            'Se requiere terminar el examen',
          );
        }
      }

      let progress = await queryRunner.manager.findOne(UserModuleProgress, {
        where: {
          user: { id: userId },
          module: { id: module.id },
          courseEnrollment: { id: enrollment.id },
        },
      });

      if (progress) {
        progress.isCompleted = true;
      } else {
        progress = queryRunner.manager.create(UserModuleProgress, {
          isCompleted: true,
          user: { id: userId },
          module: { id: module.id },
          courseEnrollment: { id: enrollment.id },
        });
      }

      const savedProgress = await queryRunner.manager.save(
        UserModuleProgress,
        progress,
      );
      await queryRunner.commitTransaction();
      return savedProgress;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<UserModuleProgress[]> {
    return await this.userModuleProgressRepository.find({
      relations: ['user', 'module', 'courseEnrollment'],
    });
  }

  async findOne(id: string): Promise<UserModuleProgress> {
    const progress = await this.userModuleProgressRepository.findOne({
      where: { id },
      relations: ['user', 'module', 'courseEnrollment'],
    });

    if (!progress) {
      throw new NotFoundException(`User module progress with ID ${id} not found`);
    }

    return progress;
  }

  async update(id: string, updateDto: Partial<CreateUserModuleProgressDto>): Promise<UserModuleProgress> {
    const progress = await this.findOne(id);
    if (updateDto.courseEnrollmentId) {
      progress.courseEnrollment = {
        id: updateDto.courseEnrollmentId,
      } as CourseEnrollment;
    }
    if (updateDto.userId) {
      progress.user = { id: updateDto.userId } as any;
    }
    if (updateDto.moduleId) {
      progress.module = { id: updateDto.moduleId } as CourseModuleEntity;
    }
    Object.assign(progress, updateDto);
    return await this.userModuleProgressRepository.save(progress);
  }

  async remove(id: string): Promise<void> {
    const progress = await this.findOne(id);
    await this.userModuleProgressRepository.remove(progress);
  }
}