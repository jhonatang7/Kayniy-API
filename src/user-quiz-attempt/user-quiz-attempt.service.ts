import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserQuizAttempt } from './entities/user-quiz-attempt.entity';
import { CreateUserQuizAttemptDto } from './dto/create-user-quiz-attempt.dto';
import { UpdateUserQuizAttemptDto } from './dto/update-user-quiz-attempt.dto';

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
    });

    return await this.userQuizAttemptRepository.save(userQuizAttempt);
  }

  async findAll(): Promise<UserQuizAttempt[]> {
    return await this.userQuizAttemptRepository.find({
      relations: ['user', 'quiz', 'answers'],
      order: { attemptDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<UserQuizAttempt> {
    const attempt = await this.userQuizAttemptRepository.findOne({
      where: { id },
      relations: ['user', 'quiz', 'answers'],
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
      relations: ['quiz', 'answers'],
      order: { attemptDate: 'DESC' },
    });
  }

  async findByQuiz(quizId: string): Promise<UserQuizAttempt[]> {
    return await this.userQuizAttemptRepository.find({
      where: { quiz: { id: quizId } },
      relations: ['user', 'answers'],
      order: { attemptDate: 'DESC' },
    });
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