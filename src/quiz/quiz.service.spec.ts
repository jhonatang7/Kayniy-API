import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { Option } from '../option/entities/option.entity';
import { OptionService } from '../option/option.service';
import { CreateOptionDto } from '../option/dto/create-option.dto';
import {
  CreateQuestionDto,
  QuestionType,
} from '../question/dto/create-question.dto';
import { UpdateQuestionDto } from '../question/dto/update-question.dto';
import { Question } from '../question/entities/question.entity';
import { QuestionService } from '../question/question.service';
import { CourseEnrollment } from '../course_enrollment/entities/course-enrollment.entity';
import { UserQuizAttempt } from '../user-quiz-attempt/entities/user-quiz-attempt.entity';
import { UserAnswer } from '../user-answer/entities/user-answer.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { Quiz } from './entities/quiz.entity';
import { QuizService } from './quiz.service';

describe('QuizService', () => {
  let quizService: QuizService;
  let questionService: QuestionService;
  let optionService: OptionService;
  let quizRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let questionRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let optionRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: {
      find: jest.Mock;
      findOne: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
      remove: jest.Mock;
      update: jest.Mock;
    };
  };
  let dataSource: { createQueryRunner: jest.Mock };

  const ids = {
    quiz: '11111111-1111-4111-8111-111111111111',
    question: '22222222-2222-4222-8222-222222222222',
    optionA: '33333333-3333-4333-8333-333333333333',
    optionB: '44444444-4444-4444-8444-444444444444',
  };
  const quiz = {
    id: ids.quiz,
    name: 'Evaluación final',
    description: 'Evaluación del módulo',
    passingScore: 70,
    module: { id: '55555555-5555-4555-8555-555555555555' },
  };
  const question = {
    id: ids.question,
    title: '¿Qué es TypeScript?',
    description: 'Pregunta conceptual',
    type: QuestionType.UNIQUE_SELECTION,
    points: 10,
    order: 1,
    quiz: { id: ids.quiz },
    options: [
      { id: ids.optionA, content: 'Un lenguaje', isCorrect: true },
      { id: ids.optionB, content: 'Una base de datos', isCorrect: false },
    ],
  };
  const enrollment = {
    id: '66666666-6666-4666-8666-666666666666',
    user: { id: '77777777-7777-4777-8777-777777777777' },
    course: {
      courseModules: [
        {
          order: 1,
          module: {
            id: quiz.module.id,
            lessons: [],
          },
        },
        {
          order: 2,
          module: {
            id: '88888888-8888-4888-8888-888888888888',
            lessons: [
              {
                id: '99999999-9999-4999-8999-999999999999',
                order: 1,
              },
            ],
          },
        },
      ],
    },
  };

  beforeEach(async () => {
    quizRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    questionRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    optionRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn((_entity, value) => value),
        save: jest.fn(),
        remove: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        QuestionService,
        OptionService,
        { provide: getRepositoryToken(Quiz), useValue: quizRepository },
        { provide: getRepositoryToken(Question), useValue: questionRepository },
        { provide: getRepositoryToken(Option), useValue: optionRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    quizService = module.get<QuizService>(QuizService);
    questionService = module.get<QuestionService>(QuestionService);
    optionService = module.get<OptionService>(OptionService);
  });

  describe('RF-31: Registro y configuración inicial del Quiz evaluativo', () => {
    it('valida, almacena y vincula el quiz al módulo', async () => {
      quizRepository.findOne.mockResolvedValue(null);
      quizRepository.save.mockResolvedValue(quiz);

      const result = await quizService.create({
        name: quiz.name,
        description: quiz.description,
        passingScore: 70,
        moduleId: quiz.module.id,
      });

      expect(result).toEqual(quiz);
      expect(quizRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ module: { id: quiz.module.id } }),
      );
      expect(quizRepository.save).toHaveBeenCalled();
    });

    it('rechaza un puntaje negativo, no numérico o campos obligatorios ausentes', async () => {
      const dto = Object.assign(new CreateQuizDto(), {
        name: '',
        passingScore: -1,
        moduleId: 'module-invalido',
      });
      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['name', 'passingScore', 'moduleId']),
      );
      expect(quizRepository.save).not.toHaveBeenCalled();
      expect(
        new BadRequestException('Datos del quiz inválidos'),
      ).toBeInstanceOf(BadRequestException);
    });
  });

  describe('RF-32: Actualización de parámetros generales del Quiz', () => {
    it('persiste la edición de datos generales y puntaje mínimo', async () => {
      quizRepository.findOne.mockResolvedValue({ ...quiz });
      quizRepository.save.mockImplementation(async (value) => value);

      const result = await quizService.update(ids.quiz, {
        name: 'Evaluación actualizada',
        passingScore: 80,
      });

      expect(result).toMatchObject({
        name: 'Evaluación actualizada',
        passingScore: 80,
      });
      expect(quizRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Evaluación actualizada',
          passingScore: 80,
        }),
      );
    });

      describe('Revisión transaccional del Quiz', () => {
        const reviewDto = {
          quizId: ids.quiz,
          courseEnrollmentId: enrollment.id,
          questions: [{ questionId: ids.question, answers: [ids.optionA] }],
        };

        const prepareReview = (
          quizValue: object | null = { ...quiz, questions: [question] },
          enrollmentValue: object | null = enrollment,
        ) => {
          queryRunner.manager.findOne
            .mockResolvedValueOnce(quizValue)
            .mockResolvedValueOnce(enrollmentValue);
        };

        it('califica una respuesta única, guarda el intento y retorna la primera lección del siguiente módulo', async () => {
          prepareReview();
          queryRunner.manager.create.mockImplementation((_entity, value) => ({
            ...value,
            id: 'attempt-1',
          }));
          queryRunner.manager.save
            .mockResolvedValueOnce({ id: 'attempt-1' })
            .mockResolvedValueOnce([]);

          const result = await quizService.review(reviewDto);

          expect(result).toEqual({ lessonId: '99999999-9999-4999-8999-999999999999' });
          expect(queryRunner.manager.create).toHaveBeenCalledWith(
            UserQuizAttempt,
            expect.objectContaining({
              scoreGotten: 10,
              aprobed: false,
              user: { id: enrollment.user.id },
            }),
          );
          expect(queryRunner.manager.create).toHaveBeenCalledWith(
            UserAnswer,
            expect.objectContaining({
              question: { id: ids.question },
              option: { id: ids.optionA },
            }),
          );
          expect(queryRunner.manager.save).toHaveBeenCalledWith(
            UserAnswer,
            expect.any(Array),
          );
          expect(queryRunner.commitTransaction).toHaveBeenCalled();
        });

        it('califica correctamente una pregunta de selección múltiple y aprueba el intento', async () => {
          const multipleQuestion = {
            ...question,
            type: QuestionType.MULTIPLE_SELECTION,
            points: 20,
            options: [
              { id: ids.optionA, content: 'A', isCorrect: true },
              { id: ids.optionB, content: 'B', isCorrect: true },
            ],
          };
          prepareReview(
            { ...quiz, passingScore: 20, questions: [multipleQuestion] },
            enrollment,
          );
          queryRunner.manager.create.mockImplementation((_entity, value) => ({
            ...value,
            id: 'attempt-2',
          }));
          queryRunner.manager.save
            .mockResolvedValueOnce({ id: 'attempt-2' })
            .mockResolvedValueOnce([]);

          const result = await quizService.review({
            ...reviewDto,
            questions: [
              {
                questionId: ids.question,
                answers: [ids.optionA, ids.optionB],
              },
            ],
          });

          expect(result.lessonId).toBe('99999999-9999-4999-8999-999999999999');
          expect(queryRunner.manager.create).toHaveBeenCalledWith(
            UserQuizAttempt,
            expect.objectContaining({ scoreGotten: 20, aprobed: true }),
          );
        });

        it('rechaza la revisión si el quiz no existe', async () => {
          prepareReview(null, enrollment);

          await expect(quizService.review(reviewDto)).rejects.toBeInstanceOf(
            NotFoundException,
          );
          expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
          expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
        });

        it('rechaza la revisión si la matrícula no existe', async () => {
          prepareReview({ ...quiz, questions: [question] }, null);

          await expect(quizService.review(reviewDto)).rejects.toBeInstanceOf(
            NotFoundException,
          );
          expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
        });

        it('rechaza un quiz que no pertenece al curso matriculado', async () => {
          prepareReview(
            { ...quiz, questions: [question] },
            {
              ...enrollment,
              course: { courseModules: [] },
            },
          );

          await expect(quizService.review(reviewDto)).rejects.toThrow();
          expect(queryRunner.manager.save).not.toHaveBeenCalled();
        });

        it('rechaza el envío duplicado de una misma pregunta', async () => {
          prepareReview();

          await expect(
            quizService.review({
              ...reviewDto,
              questions: [
                { questionId: ids.question, answers: [ids.optionA] },
                { questionId: ids.question, answers: [] },
              ],
            }),
          ).rejects.toBeInstanceOf(BadRequestException);
          expect(queryRunner.manager.create).not.toHaveBeenCalled();
        });

        it('rechaza una pregunta que no pertenece al quiz', async () => {
          prepareReview();

          await expect(
            quizService.review({
              ...reviewDto,
              questions: [
                {
                  questionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                  answers: [ids.optionA],
                },
              ],
            }),
          ).rejects.toBeInstanceOf(BadRequestException);
          expect(queryRunner.manager.save).not.toHaveBeenCalled();
        });

        it('rechaza una opción que no pertenece a la pregunta', async () => {
          prepareReview();

          await expect(
            quizService.review({
              ...reviewDto,
              questions: [
                {
                  questionId: ids.question,
                  answers: ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
                },
              ],
            }),
          ).rejects.toBeInstanceOf(BadRequestException);
          expect(queryRunner.manager.save).not.toHaveBeenCalled();
        });

        it('revierte si el siguiente módulo no tiene lecciones', async () => {
          prepareReview(
            { ...quiz, questions: [question] },
            {
              ...enrollment,
              course: {
                courseModules: [
                  {
                    order: 1,
                    module: { id: quiz.module.id, lessons: [] },
                  },
                ],
              },
            },
          );
          queryRunner.manager.create.mockImplementation((_entity, value) => ({
            ...value,
            id: 'attempt-3',
          }));
          queryRunner.manager.save.mockResolvedValue({ id: 'attempt-3' });

          await expect(quizService.review(reviewDto)).rejects.toThrow();
          expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
          expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
        });

        it('reinicia la secuencia al primer módulo cuando el quiz pertenece al último módulo', async () => {
          const lastModuleEnrollment = {
            ...enrollment,
            course: {
              courseModules: [
                {
                  order: 2,
                  module: {
                    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                    lessons: [
                      { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', order: 2 },
                      { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', order: 1 },
                    ],
                  },
                },
                {
                  order: 1,
                  module: {
                    id: quiz.module.id,
                    lessons: [],
                  },
                },
              ],
            },
          };
          prepareReview({ ...quiz, questions: [question] }, lastModuleEnrollment);
          queryRunner.manager.create.mockImplementation((_entity, value) => ({
            ...value,
            id: 'attempt-4',
          }));
          queryRunner.manager.save.mockResolvedValue({ id: 'attempt-4' });

          const result = await quizService.review(reviewDto);

          expect(result).toEqual({ lessonId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' });
          expect(queryRunner.commitTransaction).toHaveBeenCalled();
        });

        it('revierte si el módulo del quiz desaparece antes de calcular el siguiente módulo', async () => {
          let moduleReads = 0;
          const inconsistentQuiz = { ...quiz, questions: [question] };
          Object.defineProperty(inconsistentQuiz, 'module', {
            get: () => {
              moduleReads++;
              return {
                id:
                  moduleReads === 1
                    ? quiz.module.id
                    : 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
              };
            },
          });
          prepareReview(inconsistentQuiz, enrollment);

          await expect(quizService.review(reviewDto)).rejects.toThrow();
          expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
        });

        it('retorna todos los quizzes con sus relaciones', async () => {
          quizRepository.find.mockResolvedValue([quiz]);

          const result = await quizService.findAll();

          expect(result).toEqual([quiz]);
          expect(quizRepository.find).toHaveBeenCalledWith({
            relations: ['module', 'questions', 'attempts'],
          });
        });
      });

    it('rechaza un puntaje inválido y evita persistir la información original', async () => {
      const dto = Object.assign(new UpdateQuizDto(), {
        name: '',
        passingScore: -5,
      });
      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['passingScore']),
      );
      expect(quizRepository.save).not.toHaveBeenCalled();
      expect(
        new BadRequestException('Datos del quiz inválidos'),
      ).toBeInstanceOf(BadRequestException);
    });
  });

  describe('RF-33: Incorporación de preguntas estructuradas al Quiz', () => {
    it('almacena la pregunta con orden secuencial automático y sus opciones', async () => {
      queryRunner.manager.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      queryRunner.manager.create.mockImplementation((_entity, value) => ({
        ...value,
        id: ids.question,
      }));
      queryRunner.manager.save
        .mockResolvedValueOnce({ ...question })
        .mockResolvedValueOnce(question.options);
      questionRepository.findOne.mockResolvedValue(question);

      const result = await questionService.create({
        title: question.title,
        description: question.description,
        type: QuestionType.UNIQUE_SELECTION,
        points: 10,
        quizId: ids.quiz,
        options: [
          { content: 'Un lenguaje', isCorrect: true },
          { content: 'Una base de datos', isCorrect: false },
        ],
      });

      expect(result).toEqual(question);
      expect(queryRunner.manager.create).toHaveBeenCalledWith(
        Question,
        expect.objectContaining({ order: 1, points: 10 }),
      );
      expect(queryRunner.manager.save).toHaveBeenCalledTimes(2);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('restringe preguntas con puntaje no positivo o datos requeridos ausentes', async () => {
      const dto = Object.assign(new CreateQuestionDto(), {
        title: '',
        type: QuestionType.UNIQUE_SELECTION,
        points: 0,
        quizId: 'quiz-invalido',
        options: [],
      });
      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['title', 'points', 'quizId', 'options']),
      );
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
      expect(
        new BadRequestException('Datos de pregunta inválidos'),
      ).toBeInstanceOf(BadRequestException);
    });
  });

  describe('RF-34: Edición y actualización de preguntas del Quiz', () => {
    it('actualiza el reactivo preservando su posición secuencial', async () => {
      questionRepository.findOne
        .mockResolvedValueOnce({ ...question })
        .mockResolvedValueOnce({ ...question, title: 'Pregunta editada' });
      queryRunner.manager.find.mockResolvedValue([]);
      queryRunner.manager.save.mockImplementation(async (value) => value);

      const result = await questionService.update(ids.question, {
        title: 'Pregunta editada',
        points: 15,
      });

      expect(result.title).toBe('Pregunta editada');
      expect(queryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Pregunta editada', order: 1 }),
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('rechaza una inconsistencia entre tipo de pregunta y respuestas antes de guardar', async () => {
      questionRepository.findOne.mockResolvedValue(question);

      await expect(
        questionService.update(ids.question, {
          type: QuestionType.UNIQUE_SELECTION,
          options: [
            { content: 'A', isCorrect: true },
            { content: 'B', isCorrect: true },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
    });
  });

  describe('RF-35: Eliminación de preguntas y ajuste de ponderación', () => {
    it('elimina la pregunta y reajusta el orden de las restantes', async () => {
      questionRepository.findOne.mockResolvedValue(question);
      const remaining = [
        { id: 'question-2', order: 2, quiz: { id: ids.quiz } },
      ];
      queryRunner.manager.find.mockResolvedValue(remaining);

      await questionService.remove(ids.question);

      expect(queryRunner.manager.remove).toHaveBeenCalledWith(question);
      expect(remaining[0].order).toBe(1);
      expect(queryRunner.manager.save).toHaveBeenCalledWith(remaining[0]);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('revierte y propaga el error si falla la desvinculación', async () => {
      const removeError = new Error('Error interno al eliminar pregunta');
      questionRepository.findOne.mockResolvedValue(question);
      queryRunner.manager.remove.mockRejectedValue(removeError);

      await expect(questionService.remove(ids.question)).rejects.toThrow(
        removeError,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('RF-36: Configuración de opciones de respuesta y claves válidas', () => {
    it('registra al menos dos opciones y la clave correcta', async () => {
      const options: CreateOptionDto[] = [
        { content: 'Correcta', isCorrect: true },
        { content: 'Incorrecta', isCorrect: false },
      ];
      optionRepository.save.mockResolvedValue(options);

      const result = await optionService.createMany(options);

      expect(result).toEqual(options);
      expect(optionRepository.create).toHaveBeenCalledTimes(2);
      expect(optionRepository.save).toHaveBeenCalledWith(options);
    });

    it('bloquea menos de dos opciones o ninguna alternativa correcta', async () => {
      const invalidOptions = [
        Object.assign(new CreateOptionDto(), {
          content: 'Única opción',
          isCorrect: false,
        }),
      ];
      const errors = await validate(invalidOptions[0]);

      expect(errors).toEqual([]);
      expect(invalidOptions.length).toBeLessThan(2);
      expect(invalidOptions.some((option) => option.isCorrect)).toBe(false);
      await expect(
        optionService.createMany(invalidOptions),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(optionRepository.save).not.toHaveBeenCalled();
    });
  });
});
