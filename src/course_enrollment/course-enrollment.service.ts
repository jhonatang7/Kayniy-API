import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Course } from '../course/entities/course.entity';
import { User } from '../user/entities/user.entity';
import { UserProgress } from '../user-progress/entities/user-progress.entity';
import { UserQuizAttempt } from '../user-quiz-attempt/entities/user-quiz-attempt.entity';
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
    @InjectRepository(UserProgress)
    private readonly userProgressRepository: Repository<UserProgress>,
    @InjectRepository(UserQuizAttempt)
    private readonly userQuizAttemptRepository: Repository<UserQuizAttempt>,
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
            relations: ['lesson'],
          })
        : [],
      quizIds.length > 0
        ? this.userQuizAttemptRepository.find({
            where: {
              user: { id: userId },
              quiz: { id: In(quizIds) },
              aprobed: true,
            },
            relations: ['quiz'],
          })
        : [],
    ]);

    const completedLessonIds = new Set(
      completedProgress.map(progress => progress.lesson.id),
    );
    const completedQuizIds = new Set(
      completedAttempts.map(attempt => attempt.quiz.id),
    );

    return Promise.all(
      enrollments.map(async enrollment => {
        const modules = enrollment.course.courseModules;
        const courseLessonIds = modules.flatMap(courseModule =>
          courseModule.module.lessons.map(lesson => lesson.id),
        );
        const courseQuizIds = modules
          .map(courseModule => courseModule.module.quiz?.id)
          .filter((quizId): quizId is string => Boolean(quizId));
        const totalLessons = courseLessonIds.length;
        const totalExams = courseQuizIds.length;
        const completedLessons = courseLessonIds.filter(lessonId =>
          completedLessonIds.has(lessonId),
        ).length;
        const completedExams = courseQuizIds.filter(quizId =>
          completedQuizIds.has(quizId),
        ).length;
        const totalItems = totalLessons + totalExams;
        const completedItems = completedLessons + completedExams;
        const totalProgress =
          totalItems === 0
            ? 0
            : Math.round((completedItems / totalItems) * 100);

        return {
          id: enrollment.course.id,
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
        };
      }),
    );
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
