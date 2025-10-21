import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAnswer } from './entities/user-answer.entity';
import { CreateUserAnswerDto } from './dto/create-user-answer.dto';
import { UpdateUserAnswerDto } from './dto/update-user-answer.dto';

@Injectable()
export class UserAnswerService {
  constructor(
    @InjectRepository(UserAnswer)
    private readonly userAnswerRepository: Repository<UserAnswer>,
  ) {}

  async create(createUserAnswerDto: CreateUserAnswerDto): Promise<UserAnswer> {
    const userAnswer = this.userAnswerRepository.create({
      attempt: { id: createUserAnswerDto.attemptId },
      question: { id: createUserAnswerDto.questionId },
      option: { id: createUserAnswerDto.optionId },
    });

    return await this.userAnswerRepository.save(userAnswer);
  }

  async createMany(answers: CreateUserAnswerDto[]): Promise<UserAnswer[]> {
    const userAnswers = answers.map(dto =>
      this.userAnswerRepository.create({
        attempt: { id: dto.attemptId },
        question: { id: dto.questionId },
        option: { id: dto.optionId },
      }),
    );

    return await this.userAnswerRepository.save(userAnswers);
  }

  async findAll(): Promise<UserAnswer[]> {
    return await this.userAnswerRepository.find({
      relations: ['attempt', 'question', 'option'],
    });
  }

  async findOne(id: string): Promise<UserAnswer> {
    const userAnswer = await this.userAnswerRepository.findOne({
      where: { id },
      relations: ['attempt', 'question', 'option'],
    });

    if (!userAnswer) {
      throw new NotFoundException(`User answer with ID ${id} not found`);
    }

    return userAnswer;
  }

  async update(id: string, updateUserAnswerDto: UpdateUserAnswerDto): Promise<UserAnswer> {
    const userAnswer = await this.findOne(id);

    if (updateUserAnswerDto.optionId) {
      userAnswer.option = { id: updateUserAnswerDto.optionId } as any;
    }

    return await this.userAnswerRepository.save(userAnswer);
  }

  async remove(id: string): Promise<void> {
    const userAnswer = await this.findOne(id);
    await this.userAnswerRepository.remove(userAnswer);
  }

  async findByAttempt(attemptId: string): Promise<UserAnswer[]> {
    return await this.userAnswerRepository.find({
      where: { attempt: { id: attemptId } },
      relations: ['attempt', 'question', 'option'],
    });
  }

  async calculateScore(attemptId: string): Promise<number> {
    const answers = await this.findByAttempt(attemptId);
    const correctAnswers = answers.filter(answer => answer.option.isCorrect);
    return (correctAnswers.length / answers.length) * 100;
  }
}