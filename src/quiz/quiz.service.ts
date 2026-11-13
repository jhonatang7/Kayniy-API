import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { Question } from '../question/entities/question.entity';
import { CourseEnrollment } from '../course_enrollment/entities/course-enrollment.entity';
import { UserQuizAttempt } from '../user-quiz-attempt/entities/user-quiz-attempt.entity';
import { UserAnswer } from '../user-answer/entities/user-answer.entity';
import { ReviewQuizDto } from './dto/review-quiz.dto';
import { QuestionType } from '../question/dto/create-question.dto';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createQuizDto: CreateQuizDto): Promise<Quiz> {
    const existingQuiz = await this.quizRepository.findOne({
      where: { module: { id: createQuizDto.moduleId } },
    });

    if (existingQuiz) {
      throw new ConflictException('A final exam already exists for this module');
    }

    const quiz = this.quizRepository.create({
      ...createQuizDto,
      module: { id: createQuizDto.moduleId },
    });

    return await this.quizRepository.save(quiz);
  }

  async review(reviewQuizDto: ReviewQuizDto): Promise<{ lessonId: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const [quiz, enrollment] = await Promise.all([
        queryRunner.manager.findOne(Quiz, {
          where: { id: reviewQuizDto.quizId },
          relations: ['module', 'questions', 'questions.options'],
        }),
        queryRunner.manager.findOne(CourseEnrollment, {
          where: { id: reviewQuizDto.courseEnrollmentId },
          relations: [
            'user',
            'course',
            'course.courseModules',
            'course.courseModules.module',
            'course.courseModules.module.lessons',
          ],
        }),
      ]);

      if (!quiz) {
        throw new NotFoundException(`Quiz with ID ${reviewQuizDto.quizId} not found`);
      }

      if (!enrollment) {
        throw new NotFoundException(
          `Course enrollment with ID ${reviewQuizDto.courseEnrollmentId} not found`,
        );
      }

      const courseModule = enrollment.course.courseModules.find(
        courseModule => courseModule.module.id === quiz.module.id,
      );
      if (!courseModule) {
        throw new BadRequestException(
          'The quiz does not belong to the enrolled course',
        );
      }

      const submittedQuestionIds = reviewQuizDto.questions.map(
        question => question.questionId,
      );
      if (
        new Set(submittedQuestionIds).size !== submittedQuestionIds.length
      ) {
        throw new BadRequestException(
          'A question cannot be submitted more than once',
        );
      }

      const questionsById = new Map(
        quiz.questions.map(question => [question.id, question]),
      );
      const selectedOptionsByQuestion = new Map(
        reviewQuizDto.questions.map(question => [
          question.questionId,
          new Set(question.answers),
        ]),
      );

      let score = 0;
      const answersToSave: UserAnswer[] = [];

      for (const submittedQuestion of reviewQuizDto.questions) {
        const question = questionsById.get(submittedQuestion.questionId);
        if (!question) {
          throw new BadRequestException(
            `Question ${submittedQuestion.questionId} does not belong to the quiz`,
          );
        }

        const optionsById = new Map(
          question.options.map(option => [option.id, option]),
        );
        const selectedOptionIds = selectedOptionsByQuestion.get(question.id)!;
        for (const optionId of selectedOptionIds) {
          if (!optionsById.has(optionId)) {
            throw new BadRequestException(
              `Option ${optionId} does not belong to question ${question.id}`,
            );
          }
        }

        const correctOptionIds = new Set(
          question.options
            .filter(option => option.isCorrect)
            .map(option => option.id),
        );
        const isCorrect =
          question.type === QuestionType.UNIQUE_SELECTION
            ? selectedOptionIds.size === 1 &&
              selectedOptionIds.size === correctOptionIds.size &&
              [...selectedOptionIds].every(optionId =>
                correctOptionIds.has(optionId),
              )
            : selectedOptionIds.size === correctOptionIds.size &&
              [...selectedOptionIds].every(optionId =>
                correctOptionIds.has(optionId),
              );

        if (isCorrect) {
          score += Number(question.points);
        }
      }

      const attempt = queryRunner.manager.create(UserQuizAttempt, {
        scoreGotten: score,
        aprobed: score >= Number(quiz.passingScore),
        user: { id: enrollment.user.id },
        quiz: { id: quiz.id },
        courseEnrollment: { id: enrollment.id },
      });
      const savedAttempt = await queryRunner.manager.save(UserQuizAttempt, attempt);

      for (const submittedQuestion of reviewQuizDto.questions) {
        for (const optionId of submittedQuestion.answers) {
          answersToSave.push(
            queryRunner.manager.create(UserAnswer, {
              attempt: { id: savedAttempt.id },
              question: { id: submittedQuestion.questionId },
              option: { id: optionId },
            }),
          );
        }
      }
      if (answersToSave.length > 0) {
        await queryRunner.manager.save(UserAnswer, answersToSave);
      }

      const courseModules = [...enrollment.course.courseModules].sort(
        (first, second) => first.order - second.order,
      );
      const currentModuleIndex = courseModules.findIndex(
        currentCourseModule => currentCourseModule.module.id === quiz.module.id,
      );
      if (currentModuleIndex < 0) {
        throw new BadRequestException(
          'The quiz module could not be found in the enrolled course',
        );
      }

      const nextModuleIndex =
        currentModuleIndex === courseModules.length - 1
          ? 0
          : currentModuleIndex + 1;
      const nextModule = courseModules[nextModuleIndex];
      const nextLesson = [...nextModule.module.lessons].sort(
        (first, second) => first.order - second.order,
      )[0];

      if (!nextLesson) {
        throw new BadRequestException(
          'The next course module does not have any lessons',
        );
      }

      await queryRunner.commitTransaction();
      return { lessonId: nextLesson.id };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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

  async getContentQuiz(id: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id },
      relations: ['questions', 'questions.options'],
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