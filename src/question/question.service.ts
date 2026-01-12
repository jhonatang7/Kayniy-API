import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Question } from './entities/question.entity';
import { Option } from '../option/entities/option.entity';
import { CreateQuestionDto, QuestionType } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createQuestionDto: CreateQuestionDto): Promise<Question> {
    // Validar que las opciones sean correctas según el tipo de pregunta
    this.validateOptions(createQuestionDto.type, createQuestionDto.options);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validar que los puntos no excedan 100
      await this.validateTotalPoints(createQuestionDto.quizId, createQuestionDto.points, null, queryRunner);

      // Calcular el order automáticamente
      const existingQuestions = await queryRunner.manager.find(Question, {
        where: { quiz: { id: createQuestionDto.quizId } },
      });
      const newOrder = existingQuestions.length + 1;

      // Crear la pregunta
      const question = queryRunner.manager.create(Question, {
        title: createQuestionDto.title,
        description: createQuestionDto.description,
        type: createQuestionDto.type,
        order: newOrder,
        points: createQuestionDto.points,
        quiz: { id: createQuestionDto.quizId },
      });

      const savedQuestion = await queryRunner.manager.save(question);

      // Crear las opciones
      const options = createQuestionDto.options.map(optionDto =>
        queryRunner.manager.create(Option, {
          content: optionDto.content,
          isCorrect: optionDto.isCorrect,
          question: savedQuestion,
        }),
      );

      await queryRunner.manager.save(options);

      await queryRunner.commitTransaction();

      // Retornar la pregunta con sus opciones
      return await this.findOne(savedQuestion.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private validateOptions(type: QuestionType, options: { content: string; isCorrect: boolean }[]): void {
    const correctOptions = options.filter(opt => opt.isCorrect);

    if (type === QuestionType.UNIQUE_SELECTION) {
      if (correctOptions.length !== 1) {
        throw new BadRequestException(
          'UNIQUE_SELECTION questions must have exactly one correct option',
        );
      }
    } else if (type === QuestionType.MULTIPLE_SELECTION) {
      if (correctOptions.length < 1) {
        throw new BadRequestException(
          'MULTIPLE_SELECTION questions must have at least one correct option',
        );
      }
    }
  }

  private async validateTotalPoints(
    quizId: string,
    newPoints: number,
    excludeQuestionId: string | null,
    queryRunner: any,
  ): Promise<void> {
    // Obtener todas las preguntas del quiz (excluyendo la pregunta actual si es un update)
    const existingQuestions = await queryRunner.manager.find(Question, {
      where: { quiz: { id: quizId } },
    });

    // Calcular la suma total de puntos
    let totalPoints = newPoints;
    for (const q of existingQuestions) {
      // Si estamos actualizando, excluir la pregunta actual del cálculo
      if (excludeQuestionId && q.id === excludeQuestionId) {
        continue;
      }
      totalPoints += Number(q.points);
    }

    // Validar que no exceda 100 puntos
    if (totalPoints > 100) {
      throw new HttpException(
        {
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          message: `Total points would exceed 100. Current total: ${totalPoints - newPoints}, attempting to add: ${newPoints}, resulting total: ${totalPoints}`,
          error: 'Points limit exceeded',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
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

    // Si se actualizan las opciones, validar
    if (updateQuestionDto.options) {
      const type = updateQuestionDto.type || question.type;
      this.validateOptions(type as QuestionType, updateQuestionDto.options);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Si se actualizan los puntos, validar que no excedan 100
      if (updateQuestionDto.points !== undefined) {
        await this.validateTotalPoints(
          question.quiz.id,
          updateQuestionDto.points,
          question.id,
          queryRunner,
        );
      }

      // Actualizar los campos de la pregunta
      Object.assign(question, {
        title: updateQuestionDto.title ?? question.title,
        description: updateQuestionDto.description ?? question.description,
        type: updateQuestionDto.type ?? question.type,
        points: updateQuestionDto.points ?? question.points,
      });

      if (updateQuestionDto.quizId) {
        question.quiz = { id: updateQuestionDto.quizId } as any;
      }

      const savedQuestion = await queryRunner.manager.save(question);

      // Si se proporcionan opciones
      if (updateQuestionDto.options) {
        const existingOptions = await queryRunner.manager.find(Option, {
          where: { question: { id: savedQuestion.id } },
        });
        console.log('Existing Options:', updateQuestionDto.options);
        const optionsToUpdate = updateQuestionDto.options.filter(opt => opt.id);
        const optionsToCreate = updateQuestionDto.options.filter(opt => !opt.id);
        const optionIdsToKeep = optionsToUpdate.map(opt => opt.id);
        const optionsToDelete = existingOptions.filter(opt => !optionIdsToKeep.includes(opt.id));

        // Eliminar opciones que ya no están en la lista
        if (optionsToDelete.length > 0) {
          await queryRunner.manager.remove(optionsToDelete);
        }

        // Actualizar opciones existentes
        for (const optionDto of optionsToUpdate) {
          await queryRunner.manager.update(
            Option,
            { id: optionDto.id },
            {
              content: optionDto.content,
              isCorrect: optionDto.isCorrect,
            },
          );
        }

        // Crear nuevas opciones
        if (optionsToCreate.length > 0) {
          const newOptions = optionsToCreate.map(optionDto =>
            queryRunner.manager.create(Option, {
              content: optionDto.content,
              isCorrect: optionDto.isCorrect,
              question: savedQuestion,
            }),
          );
          await queryRunner.manager.save(newOptions);
        }
      }

      await queryRunner.commitTransaction();

      // Retornar la pregunta actualizada con sus opciones
      return await this.findOne(savedQuestion.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<void> {
    const question = await this.findOne(id);
    const quizId = question.quiz.id;
    const deletedOrder = question.order;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Las opciones se eliminarán automáticamente por CASCADE
      await queryRunner.manager.remove(question);

      // Reordenar las preguntas restantes que tienen order mayor al eliminado
      const questionsToReorder = await queryRunner.manager.find(Question, {
        where: { quiz: { id: quizId } },
        order: { order: 'ASC' },
      });

      // Actualizar el order de las preguntas que vienen después
      for (const q of questionsToReorder) {
        if (q.order > deletedOrder) {
          q.order = q.order - 1;
          await queryRunner.manager.save(q);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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