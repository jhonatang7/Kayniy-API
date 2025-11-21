import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
  ) {}

  async create(createQuizDto: CreateQuizDto): Promise<Quiz> {
    const quiz = this.quizRepository.create({
      ...createQuizDto,
      module: { id: createQuizDto.moduleId },
    });

    return await this.quizRepository.save(quiz);
  }

  async findAll(): Promise<Quiz[]> {
    return await this.quizRepository.find({
      relations: ['module', 'questions', 'attempts'],
    });
  }

  async findOne(id: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id },
      relations: ['module', 'questions', 'attempts'],
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    return quiz;
  }

  async update(id: string, updateQuizDto: UpdateQuizDto): Promise<Quiz> {
    const quiz = await this.findOne(id);

    if (updateQuizDto.moduleId) {
      quiz.module = { id: updateQuizDto.moduleId } as any;
    }

    Object.assign(quiz, updateQuizDto);
    return await this.quizRepository.save(quiz);
  }

  async remove(id: string): Promise<void> {
    const quiz = await this.findOne(id);
    await this.quizRepository.remove(quiz);
  }

  async findByModule(moduleId: string): Promise<Quiz | null> {
    return await this.quizRepository.findOne({
      where: { module: { id: moduleId } },
      relations: ['module', 'questions', 'attempts'],
    });
  }

  async getQuizStatistics(id: string): Promise<any> {
    const quiz = await this.findOne(id);
    const attempts = quiz.attempts || [];

    return {
      totalAttempts: attempts.length,
      averageScore: attempts.reduce((acc, curr) => acc + Number(curr.scoreGotten), 0) / attempts.length || 0,
      passRate: (attempts.filter(a => a.aprobed).length / attempts.length) * 100 || 0,
    };
  }
}