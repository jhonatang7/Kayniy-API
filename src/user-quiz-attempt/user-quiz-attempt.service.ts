import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserQuizAttempt } from './entities/user-quiz-attempt.entity';
import { CreateUserQuizAttemptDto } from './dto/create-user-quiz-attempt.dto';
import { UpdateUserQuizAttemptDto } from './dto/update-user-quiz-attempt.dto';
import { CourseEnrollment } from '../course_enrollment/entities/course-enrollment.entity';

@Injectable()
export class UserQuizAttemptService {
  constructor(
    @InjectRepository(UserQuizAttempt)
    private readonly userQuizAttemptRepository: Repository<UserQuizAttempt>,
  ) {}

  async create(createUserQuizAttemptDto: CreateUserQuizAttemptDto): Promise<UserQuizAttempt> {
    const userQuizAttempt = this.userQuizAttemptRepository.create({
      ...createUserQuizAttemptDto,
      user: { id: createUserQuizAttemptDto.userId },
      quiz: { id: createUserQuizAttemptDto.quizId },
      courseEnrollment: { id: createUserQuizAttemptDto.courseEnrollmentId },
    });

    return await this.userQuizAttemptRepository.save(userQuizAttempt);
  }

  async findAll(): Promise<UserQuizAttempt[]> {
    return await this.userQuizAttemptRepository.find({
      relations: ['user', 'quiz', 'answers', 'courseEnrollment'],
      order: { attemptDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<UserQuizAttempt> {
    const attempt = await this.userQuizAttemptRepository.findOne({
      where: { id },
      relations: ['user', 'quiz', 'answers', 'courseEnrollment'],
    });

    if (!attempt) {
      throw new NotFoundException(`Quiz attempt with ID ${id} not found`);
    }

    return attempt;
  }

  async update(id: string, updateUserQuizAttemptDto: UpdateUserQuizAttemptDto): Promise<UserQuizAttempt> {
    const attempt = await this.findOne(id);

    if (updateUserQuizAttemptDto.userId) {
      attempt.user = { id: updateUserQuizAttemptDto.userId } as any;
    }

    if (updateUserQuizAttemptDto.quizId) {
      attempt.quiz = { id: updateUserQuizAttemptDto.quizId } as any;
    }
    if (updateUserQuizAttemptDto.courseEnrollmentId) {
      attempt.courseEnrollment = {
        id: updateUserQuizAttemptDto.courseEnrollmentId,
      } as CourseEnrollment;
    }

    Object.assign(attempt, updateUserQuizAttemptDto);
    return await this.userQuizAttemptRepository.save(attempt);
  }

  async remove(id: string): Promise<void> {
    const attempt = await this.findOne(id);
    await this.userQuizAttemptRepository.remove(attempt);
  }

  async findByUser(userId: string): Promise<UserQuizAttempt[]> {
    return await this.userQuizAttemptRepository.find({
      where: { user: { id: userId } },
      relations: ['quiz', 'answers', 'courseEnrollment'],
      order: { attemptDate: 'DESC' },
    });
  }

  async findByQuiz(quizId: string): Promise<UserQuizAttempt[]> {
    return await this.userQuizAttemptRepository.find({
      where: { quiz: { id: quizId } },
      relations: ['user', 'answers', 'courseEnrollment'],
      order: { attemptDate: 'DESC' },
    });
  }

  async getLatest(
    quizId: string,
    courseEnrollmentId: string,
    userId: string,
  ): Promise<{
    id: string;
    scoreGotten: number;
    aprobed: boolean;
    attemptDate: Date;
  } | null> {
    const attempt = await this.userQuizAttemptRepository.findOne({
      where: {
        user: { id: userId },
        quiz: { id: quizId },
        courseEnrollment: { id: courseEnrollmentId },
      },
      order: { attemptDate: 'DESC' },
    });

    if (!attempt) {
      return null;
    }

    return {
      id: attempt.id,
      scoreGotten: Number(attempt.scoreGotten),
      aprobed: attempt.aprobed,
      attemptDate: attempt.attemptDate,
    };
  }

  async getUserQuizStatistics(userId: string, quizId: string): Promise<any> {
    const attempts = await this.userQuizAttemptRepository.find({
      where: { user: { id: userId }, quiz: { id: quizId } },
      order: { attemptDate: 'DESC' },
    });

    return {
      totalAttempts: attempts.length,
      bestScore: Math.max(...attempts.map(a => Number(a.scoreGotten))),
      lastAttemptScore: attempts[0]?.scoreGotten || 0,
      passed: attempts.some(a => a.aprobed),
    };
  }
}