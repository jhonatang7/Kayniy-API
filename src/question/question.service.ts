import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from './entities/question.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
  ) {}

  async create(createQuestionDto: CreateQuestionDto): Promise<Question> {
    const question = this.questionRepository.create({
      ...createQuestionDto,
      quiz: { id: createQuestionDto.quizId },
    });

    return await this.questionRepository.save(question);
  }

  async findAll(): Promise<Question[]> {
    return await this.questionRepository.find({
      relations: ['quiz', 'options', 'userAnswers'],
      order: { order: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id },
      relations: ['quiz', 'options', 'userAnswers'],
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return question;
  }

  async update(id: string, updateQuestionDto: UpdateQuestionDto): Promise<Question> {
    const question = await this.findOne(id);

    if (updateQuestionDto.quizId) {
      question.quiz = { id: updateQuestionDto.quizId } as any;
    }

    Object.assign(question, updateQuestionDto);
    return await this.questionRepository.save(question);
  }

  async remove(id: string): Promise<void> {
    const question = await this.findOne(id);
    await this.questionRepository.remove(question);
  }

  async findByQuiz(quizId: string): Promise<Question[]> {
    return await this.questionRepository.find({
      where: { quiz: { id: quizId } },
      relations: ['quiz', 'options', 'userAnswers'],
      order: { order: 'ASC' },
    });
  }

  async reorderQuestions(quizId: string, questionIds: string[]): Promise<Question[]> {
    const questions = await this.findByQuiz(quizId);
    const updates = questionIds.map((id, index) => {
      const question = questions.find(q => q.id === id);
      if (question) {
        question.order = index + 1;
        return this.questionRepository.save(question);
      }
    });

    return await Promise.all(updates);
  }
}