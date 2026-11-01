import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProgress } from './entities/user-progress.entity';
import { CreateUserProgressDto } from './dto/create-user-progress.dto';
import { Lesson } from '../lesson/entities/lesson.entity';
import { User } from '../user/entities/user.entity';
import { CourseEnrollment } from '../course_enrollment/entities/course-enrollment.entity';

@Injectable()
export class UserProgressService {
  constructor(
    @InjectRepository(UserProgress)
    private readonly userProgressRepository: Repository<UserProgress>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
  ) {}

  async create(createDto: CreateUserProgressDto): Promise<UserProgress> {
    const existingProgress = await this.userProgressRepository.findOne({
      where: {
        user: { id: createDto.userId },
        lesson: { id: createDto.lessonId },
        courseEnrollment: { id: createDto.courseEnrollmentId },
      },
    });

    if (existingProgress) {
      throw new ConflictException(
        'The lesson progress already exists for this user and course enrollment',
      );
    }

    const progress = this.userProgressRepository.create({
      isCompleted: createDto.isCompleted,
      completedDate: createDto.completedDate,
      user: { id: createDto.userId },
      lesson: { id: createDto.lessonId },
      courseEnrollment: { id: createDto.courseEnrollmentId },
    });
    return await this.userProgressRepository.save(progress);
  }

  async registerLesson(
    lessonId: string,
    courseEnrollmentId: string,
    userId: string,
  ): Promise<UserProgress> {
    const [lesson, user, enrollment] = await Promise.all([
      this.lessonRepository.findOne({ where: { id: lessonId } }),
      this.userRepository.findOne({ where: { id: userId, isDeleted: false } }),
      this.enrollmentRepository.findOne({
        where: { id: courseEnrollmentId, user: { id: userId } },
      }),
    ]);

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!enrollment) {
      throw new NotFoundException(
        `Course enrollment with ID ${courseEnrollmentId} not found for this user`,
      );
    }

    const existingProgress = await this.userProgressRepository.findOne({
      where: {
        user: { id: userId },
        lesson: { id: lessonId },
        courseEnrollment: { id: courseEnrollmentId },
      },
    });

    if (existingProgress) {
      throw new ConflictException(
        'The lesson progress already exists for this user and course enrollment',
      );
    }

    const progress = this.userProgressRepository.create({
      user,
      lesson,
      courseEnrollment: enrollment,
      isCompleted: true,
      completedDate: new Date(),
    });

    return this.userProgressRepository.save(progress);
  }

  async findAll(): Promise<UserProgress[]> {
    return await this.userProgressRepository.find({
      relations: ['user', 'lesson', 'courseEnrollment'],
    });
  }

  async findOne(id: string): Promise<UserProgress> {
    const progress = await this.userProgressRepository.findOne({
      where: { id },
      relations: ['user', 'lesson', 'courseEnrollment'],
    });

    if (!progress) {
      throw new NotFoundException(`User progress with ID ${id} not found`);
    }

    return progress;
  }

  async update(id: string, updateDto: Partial<CreateUserProgressDto>): Promise<UserProgress> {
    const progress = await this.findOne(id);
    if (updateDto.courseEnrollmentId) {
      progress.courseEnrollment = {
        id: updateDto.courseEnrollmentId,
      } as CourseEnrollment;
    }
    if (updateDto.userId) {
      progress.user = { id: updateDto.userId } as User;
    }
    if (updateDto.lessonId) {
      progress.lesson = { id: updateDto.lessonId } as Lesson;
    }
    Object.assign(progress, updateDto);
    return await this.userProgressRepository.save(progress);
  }

  async remove(id: string): Promise<void> {
    const progress = await this.findOne(id);
    await this.userProgressRepository.remove(progress);
  }
}