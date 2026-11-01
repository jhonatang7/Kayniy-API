import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Course } from '../course/entities/course.entity';
import { User } from '../user/entities/user.entity';
import { UserModuleProgress } from '../user-module-progress/entities/user-module-progress.entity';
import { UserProgress } from '../user-progress/entities/user-progress.entity';
import { UserQuizAttempt } from '../user-quiz-attempt/entities/user-quiz-attempt.entity';
import { DataSource } from 'typeorm';
import { CreateCourseEnrollmentDto } from './dto/create-course-enrollment.dto';
import { UpdateCourseEnrollmentDto } from './dto/update-course-enrollment.dto';
import { CourseEnrollment } from './entities/course-enrollment.entity';

@Injectable()
export class CourseEnrollmentService {
  constructor(
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(UserModuleProgress)
    private readonly userModuleProgressRepository: Repository<UserModuleProgress>,
    @InjectRepository(UserProgress)
    private readonly userProgressRepository: Repository<UserProgress>,
    @InjectRepository(UserQuizAttempt)
    private readonly userQuizAttemptRepository: Repository<UserQuizAttempt>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDto: CreateCourseEnrollmentDto,
  ): Promise<CourseEnrollment> {
    const [user, course, existingEnrollment] = await Promise.all([
      this.userRepository.findOne({
        where: { id: createDto.userId, isDeleted: false },
      }),
      this.courseRepository.findOne({
        where: { id: createDto.courseId, isDeleted: false },
      }),
      this.enrollmentRepository.findOne({
        where: {
          user: { id: createDto.userId },
          course: { id: createDto.courseId },
        },
      }),
    ]);

    if (!user) {
      throw new NotFoundException(`User with ID ${createDto.userId} not found`);
    }

    if (!course) {
      throw new NotFoundException(
        `Course with ID ${createDto.courseId} not found`,
      );
    }

    if (existingEnrollment) {
      throw new ConflictException('User is already enrolled in this course');
    }

    const enrollment = this.enrollmentRepository.create({
      user,
      course,
      isCompleted: false,
      completedDate: null,
    });

    return this.enrollmentRepository.save(enrollment);
  }

  async complete(
    courseEnrollmentId: string,
    userId: string,
  ): Promise<CourseEnrollment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const enrollment = await queryRunner.manager.findOne(CourseEnrollment, {
        where: {
          id: courseEnrollmentId,
          user: { id: userId },
        },
        relations: [
          'course',
          'course.courseModules',
          'course.courseModules.module',
        ],
      });

      if (!enrollment) {
        throw new NotFoundException(
          `Course enrollment with ID ${courseEnrollmentId} not found for this user`,
        );
      }

      const moduleIds = enrollment.course.courseModules.map(
        courseModule => courseModule.module.id,
      );
      if (moduleIds.length === 0) {
        throw new BadRequestException(
          'The course does not have any modules to complete',
        );
      }

      const moduleProgress = await queryRunner.manager.find(
        UserModuleProgress,
        {
          where: {
            user: { id: userId },
            module: { id: In(moduleIds) },
            courseEnrollment: { id: enrollment.id },
            isCompleted: true,
          },
          relations: ['module'],
        },
      );
      const completedModuleIds = new Set(
        moduleProgress.map(progress => progress.module.id),
      );
      const allModulesCompleted = moduleIds.every(moduleId =>
        completedModuleIds.has(moduleId),
      );

      if (!allModulesCompleted) {
        throw new BadRequestException(
          'Se requiere completar todos los modulos del curso',
        );
      }

      enrollment.isCompleted = true;
      enrollment.completedDate = enrollment.completedDate ?? new Date();
      const savedEnrollment = await queryRunner.manager.save(
        CourseEnrollment,
        enrollment,
      );

      await queryRunner.commitTransaction();
      return savedEnrollment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  findAll(): Promise<CourseEnrollment[]> {
    return this.enrollmentRepository.find({
      relations: ['user', 'course'],
    });
  }

  async findOne(id: string): Promise<CourseEnrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: ['user', 'course'],
    });

    if (!enrollment) {
      throw new NotFoundException(`Course enrollment with ID ${id} not found`);
    }

    return enrollment;
  }

  findByUser(userId: string): Promise<CourseEnrollment[]> {
    return this.enrollmentRepository.find({
      where: { user: { id: userId } },
      relations: ['course'],
    });
  }

  findByCourse(courseId: string): Promise<CourseEnrollment[]> {
    return this.enrollmentRepository.find({
      where: { course: { id: courseId } },
      relations: ['user'],
    });
  }

  async isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        user: { id: userId },
        course: { id: courseId },
      },
    });

    return Boolean(enrollment);
  }

  async findMyCourses(userId: string) {
    const enrollments = await this.enrollmentRepository.find({
      where: { user: { id: userId } },
      relations: [
        'course',
        'course.community',
        'course.courseModules',
        'course.courseModules.module',
        'course.courseModules.module.lessons',
        'course.courseModules.module.quiz',
      ],
    });

    const lessonIds = enrollments.flatMap(enrollment =>
      enrollment.course.courseModules.flatMap(courseModule =>
        courseModule.module.lessons.map(lesson => lesson.id),
      ),
    );
    const quizIds = enrollments.flatMap(enrollment =>
      enrollment.course.courseModules
        .map(courseModule => courseModule.module.quiz?.id)
        .filter((quizId): quizId is string => Boolean(quizId)),
    );

    const [completedProgress, completedAttempts] = await Promise.all([
      lessonIds.length > 0
        ? this.userProgressRepository.find({
            where: {
              user: { id: userId },
              lesson: { id: In(lessonIds) },
              isCompleted: true,
            },
            relations: ['lesson', 'courseEnrollment'],
          })
        : [],
      quizIds.length > 0
        ? this.userQuizAttemptRepository.find({
            where: {
              user: { id: userId },
              quiz: { id: In(quizIds) },
              aprobed: true,
            },
            relations: ['quiz', 'courseEnrollment'],
          })
        : [],
    ]);

    const completedLessonKeys = new Set(
      completedProgress.map(
        progress => `${progress.courseEnrollment.id}:${progress.lesson.id}`,
      ),
    );
    const completedQuizKeys = new Set(
      completedAttempts.map(
        attempt => `${attempt.courseEnrollment.id}:${attempt.quiz.id}`,
      ),
    );

    return Promise.all(
      enrollments.map(async enrollment => {
        const modules = enrollment.course.courseModules;
        const firstModule = [...modules].sort(
          (first, second) => first.order - second.order,
        )[0];
        const firstLessonId = firstModule
          ? [...firstModule.module.lessons].sort(
              (first, second) => first.order - second.order,
            )[0]?.id ?? null
          : null;
        const courseLessonIds = modules.flatMap(courseModule =>
          courseModule.module.lessons.map(lesson => lesson.id),
        );
        const courseQuizIds = modules
          .map(courseModule => courseModule.module.quiz?.id)
          .filter((quizId): quizId is string => Boolean(quizId));
        const totalLessons = courseLessonIds.length;
        const totalExams = courseQuizIds.length;
        const completedLessons = courseLessonIds.filter(lessonId =>
          completedLessonKeys.has(`${enrollment.id}:${lessonId}`),
        ).length;
        const completedExams = courseQuizIds.filter(quizId =>
          completedQuizKeys.has(`${enrollment.id}:${quizId}`),
        ).length;
        const totalItems = totalLessons + totalExams;
        const completedItems = completedLessons + completedExams;
        const totalProgress =
          totalItems === 0
            ? 0
            : Math.round((completedItems / totalItems) * 100);

        return {
          id: enrollment.course.id,
          enrollment_course_id: enrollment.id,
          name: enrollment.course.name,
          description: enrollment.course.description,
          level: enrollment.course.level,
          communityName: enrollment.course.community?.name ?? null,
          enrollmentDate: enrollment.enrollmentDate,
          isCompleted: enrollment.isCompleted,
          totalProgress,
          totalModules: modules.length,
          totalLessons,
          completedLessons,
          totalExams,
          completedExams,
          firstLessonId,
        };
      }),
    );
  }

  async findContent(id: string) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: [
        'user',
        'course',
        'course.courseModules',
        'course.courseModules.module',
        'course.courseModules.module.lessons',
        'course.courseModules.module.quiz',
      ],
    });

    if (!enrollment) {
      throw new NotFoundException(`Course enrollment with ID ${id} not found`);
    }

    const courseModules = [...enrollment.course.courseModules].sort(
      (first, second) => first.order - second.order,
    );
    const moduleIds = courseModules.map(courseModule => courseModule.module.id);
    const lessonIds = courseModules.flatMap(courseModule =>
      courseModule.module.lessons.map(lesson => lesson.id),
    );
    const quizIds = courseModules
      .map(courseModule => courseModule.module.quiz?.id)
      .filter((quizId): quizId is string => Boolean(quizId));

    const [moduleProgress, lessonProgress, quizAttempts] = await Promise.all([
      moduleIds.length > 0
        ? this.userModuleProgressRepository.find({
          where: {
            user: { id: enrollment.user.id },
            module: { id: In(moduleIds) },
            courseEnrollment: { id },
          },
          relations: ['module'],
        })
        : [],
      lessonIds.length > 0
        ? this.userProgressRepository.find({
          where: {
            user: { id: enrollment.user.id },
            lesson: { id: In(lessonIds) },
            courseEnrollment: { id },
          },
          relations: ['lesson'],
        })
        : [],
      quizIds.length > 0
        ? this.userQuizAttemptRepository.find({
          where: {
            user: { id: enrollment.user.id },
            quiz: { id: In(quizIds) },
            courseEnrollment: { id },
          },
          relations: ['quiz'],
          order: { attemptDate: 'DESC' },
        })
        : [],
    ]);

    const completedModules = new Set(
      moduleProgress
        .filter(progress => progress.isCompleted)
        .map(progress => progress.module.id),
    );
    const completedLessons = new Set(
      lessonProgress
        .filter(progress => progress.isCompleted)
        .map(progress => progress.lesson.id),
    );
    const latestAttemptByQuiz = new Map<string, UserQuizAttempt>();
    for (const attempt of quizAttempts) {
      const latestAttempt = latestAttemptByQuiz.get(attempt.quiz.id);
      if (
        !latestAttempt ||
        attempt.attemptDate.getTime() > latestAttempt.attemptDate.getTime()
      ) {
        latestAttemptByQuiz.set(attempt.quiz.id, attempt);
      }
    }

    return {
      enrollment: {
        id: enrollment.id,
        isCompleted: enrollment.isCompleted,
        enrollmentDate: enrollment.enrollmentDate,
        completedDate: enrollment.completedDate,
      },
      course: {
        id: enrollment.course.id,
        name: enrollment.course.name,
        description: enrollment.course.description,
        level: enrollment.course.level,
      },
      modules: courseModules.map(courseModule => {
        const module = courseModule.module;
        const lessons = [...module.lessons].sort(
          (first, second) => first.order - second.order,
        );
        const contents: Array<{
          id: string;
          type: string;
          title: string;
          duration: number | null;
          description: string | null;
          isCompleted: boolean;
          status?: string;
        }> = lessons.map(lesson => ({
          id: lesson.id,
          type: lesson.type,
          title: lesson.title,
          duration: lesson.duration,
          description: lesson.description,
          isCompleted: completedLessons.has(lesson.id),
        }));

        if (module.quiz) {
          const latestAttempt = latestAttemptByQuiz.get(module.quiz.id);
          const status = latestAttempt?.aprobed
            ? 'PASSED'
            : latestAttempt
              ? 'FAILED'
              : 'NOT_STARTED';

          contents.push({
            id: module.quiz.id,
            type: 'QUIZ',
            title: module.quiz.name,
            duration: null,
            description: module.quiz.description,
            isCompleted: status === 'PASSED',
            status,
          });
        }

        return {
          id: module.id,
          title: module.title,
          description: module.description,
          order: courseModule.order,
          isCompleted: completedModules.has(module.id),
          contents,
        };
      }),
    };
  }

  async update(
    id: string,
    updateDto: UpdateCourseEnrollmentDto,
  ): Promise<CourseEnrollment> {
    const enrollment = await this.findOne(id);

    enrollment.isCompleted = updateDto.isCompleted ?? enrollment.isCompleted;
    if (updateDto.completedDate !== undefined) {
      enrollment.completedDate = new Date(updateDto.completedDate);
    } else if (updateDto.isCompleted === true && !enrollment.completedDate) {
      enrollment.completedDate = new Date();
    } else if (updateDto.isCompleted === false) {
      enrollment.completedDate = null;
    }

    return this.enrollmentRepository.save(enrollment);
  }

  async remove(id: string): Promise<void> {
    const result = await this.enrollmentRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Course enrollment with ID ${id} not found`);
    }
  }
}
