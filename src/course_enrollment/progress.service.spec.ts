import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { Course } from '../course/entities/course.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { CourseEnrollmentService } from './course-enrollment.service';
import { Lesson } from '../lesson/entities/lesson.entity';
import { Module as CourseModuleEntity } from '../module/entities/module.entity';
import { User } from '../user/entities/user.entity';
import { UserProgress } from '../user-progress/entities/user-progress.entity';
import { UserProgressService } from '../user-progress/user-progress.service';
import { UserModuleProgress } from '../user-module-progress/entities/user-module-progress.entity';
import { UserModuleProgressService } from '../user-module-progress/user-module-progress.service';
import { UserQuizAttempt } from '../user-quiz-attempt/entities/user-quiz-attempt.entity';
import { UserQuizAttemptService } from '../user-quiz-attempt/user-quiz-attempt.service';
import { CreateUserQuizAttemptDto } from '../user-quiz-attempt/dto/create-user-quiz-attempt.dto';

describe('Progress services', () => {
  let enrollmentService: CourseEnrollmentService;
  let userProgressService: UserProgressService;
  let moduleProgressService: UserModuleProgressService;
  let attemptService: UserQuizAttemptService;
  let enrollmentRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
  };
  let userRepository: { findOne: jest.Mock };
  let courseRepository: { findOne: jest.Mock };
  let userProgressRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let lessonRepository: { findOne: jest.Mock };
  let moduleProgressRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let attemptRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: {
      findOne: jest.Mock;
      find: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
    };
  };
  let dataSource: { createQueryRunner: jest.Mock };

  const ids = {
    user: '11111111-1111-4111-8111-111111111111',
    course: '22222222-2222-4222-8222-222222222222',
    enrollment: '33333333-3333-4333-8333-333333333333',
    module: '44444444-4444-4444-8444-444444444444',
    lesson: '55555555-5555-4555-8555-555555555555',
    quiz: '66666666-6666-4666-8666-666666666666',
  };
  const user = { id: ids.user, isDeleted: false };
  const lesson = { id: ids.lesson, title: 'Lección 1' };
  const courseModule = {
    module: {
      id: ids.module,
      lessons: [lesson],
      quiz: { id: ids.quiz },
    },
    order: 1,
  };
  const course = {
    id: ids.course,
    name: 'Curso de prueba',
    courseModules: [courseModule],
  };
  const enrollment = {
    id: ids.enrollment,
    user,
    course,
    isCompleted: false,
    completedDate: null,
  };

  beforeEach(async () => {
    enrollmentRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };
    userRepository = { findOne: jest.fn() };
    courseRepository = { findOne: jest.fn() };
    userProgressRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    lessonRepository = { findOne: jest.fn() };
    moduleProgressRepository = {
      create: jest.fn((_entity, value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
      find: jest.fn().mockResolvedValue([]),
    };
    attemptRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        findOne: jest.fn(),
        find: jest.fn(),
        count: jest.fn(),
        create: jest.fn((_entity, value) => value),
        save: jest.fn(),
      },
    };
    dataSource = { createQueryRunner: jest.fn(() => queryRunner) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseEnrollmentService,
        UserProgressService,
        UserModuleProgressService,
        UserQuizAttemptService,
        { provide: getRepositoryToken(CourseEnrollment), useValue: enrollmentRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Course), useValue: courseRepository },
        { provide: getRepositoryToken(UserProgress), useValue: userProgressRepository },
        { provide: getRepositoryToken(Lesson), useValue: lessonRepository },
        {
          provide: getRepositoryToken(UserModuleProgress),
          useValue: moduleProgressRepository,
        },
        { provide: getRepositoryToken(UserQuizAttempt), useValue: attemptRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    enrollmentService = module.get<CourseEnrollmentService>(CourseEnrollmentService);
    userProgressService = module.get<UserProgressService>(UserProgressService);
    moduleProgressService = module.get<UserModuleProgressService>(
      UserModuleProgressService,
    );
    attemptService = module.get<UserQuizAttemptService>(UserQuizAttemptService);
  });

  describe('RF-45: Inscripción y visualización curricular en Mis Cursos', () => {
    it('registra la matrícula y permite recuperar el curso ordenado por módulos', async () => {
      userRepository.findOne.mockResolvedValue(user);
      courseRepository.findOne.mockResolvedValue(course);
      enrollmentRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(enrollment);
      enrollmentRepository.save.mockResolvedValue(enrollment);

      const created = await enrollmentService.create({
        userId: ids.user,
        courseId: ids.course,
      });

      expect(created).toEqual(enrollment);
      expect(enrollmentRepository.save).toHaveBeenCalled();

      enrollmentRepository.findOne.mockResolvedValue(enrollment);
      const content = await enrollmentService.findContent(ids.enrollment);

      expect(content.modules[0]).toMatchObject({
        id: ids.module,
        order: 1,
      });
    });

    it('rechaza un curso inexistente o una matrícula duplicada', async () => {
      userRepository.findOne.mockResolvedValue(user);
      courseRepository.findOne.mockResolvedValue(course);
      enrollmentRepository.findOne.mockResolvedValue(enrollment);

      await expect(
        enrollmentService.create({ userId: ids.user, courseId: ids.course }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(enrollmentRepository.save).not.toHaveBeenCalled();

      courseRepository.findOne.mockResolvedValue(null);
      enrollmentRepository.findOne.mockResolvedValue(null);
      await expect(
        enrollmentService.create({ userId: ids.user, courseId: ids.course }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('RF-46: Registro y control de consumo de lecciones pedagógicas', () => {
    it('marca la lección como completada y retorna el estado actualizado', async () => {
      lessonRepository.findOne.mockResolvedValue(lesson);
      userRepository.findOne.mockResolvedValue(user);
      enrollmentRepository.findOne.mockResolvedValue(enrollment);
      userProgressRepository.findOne.mockResolvedValue(null);
      userProgressRepository.save.mockImplementation(async (value) => value);

      const result = await userProgressService.registerLesson(
        ids.lesson,
        ids.enrollment,
        ids.user,
      );

      expect(result).toMatchObject({
        isCompleted: true,
        user,
        lesson,
        courseEnrollment: enrollment,
      });
      expect(userProgressRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isCompleted: true }),
      );
    });

    it('propaga el fallo de persistencia para permitir sincronización posterior', async () => {
      lessonRepository.findOne.mockResolvedValue(lesson);
      userRepository.findOne.mockResolvedValue(user);
      enrollmentRepository.findOne.mockResolvedValue(enrollment);
      userProgressRepository.findOne.mockResolvedValue(null);
      const saveError = new Error('Database unavailable');
      userProgressRepository.save.mockRejectedValue(saveError);

      await expect(
        userProgressService.registerLesson(ids.lesson, ids.enrollment, ids.user),
      ).rejects.toThrow(saveError);
    });
  });

  describe('RF-47: Ejecución reiterativa y evaluación objetiva de exámenes', () => {
    it('guarda el intento con puntaje y veredicto aprobado mediante aprobed', async () => {
      const passedAttempt = {
        id: 'attempt-1',
        scoreGotten: 90,
        aprobed: true,
        user: { id: ids.user },
        quiz: { id: ids.quiz },
        courseEnrollment: { id: ids.enrollment },
      };
      attemptRepository.save.mockResolvedValue(passedAttempt);

      const result = await attemptService.create({
        scoreGotten: 90,
        aprobed: true,
        userId: ids.user,
        quizId: ids.quiz,
        courseEnrollmentId: ids.enrollment,
      });

      expect(result).toEqual(passedAttempt);
      expect(result.aprobed).toBe(true);
      expect(attemptRepository.save).toHaveBeenCalled();
    });

    it('rechaza el envío si faltan respuestas obligatorias', async () => {
      const dto = Object.assign(new CreateUserQuizAttemptDto(), {
        userId: ids.user,
        quizId: 'not-a-uuid',
        courseEnrollmentId: ids.enrollment,
      });
      const errors = await validate(dto);

      expect(errors.some(error => error.property === 'quizId')).toBe(true);
      expect(attemptRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('RF-48: Control y validación secuencial de finalización académica', () => {
    it('certifica el módulo cuando todas las lecciones y el quiz están aprobados', async () => {
      queryRunner.manager.findOne
        .mockResolvedValueOnce({
          id: ids.module,
          lessons: [lesson],
          quiz: { id: ids.quiz },
        })
        .mockResolvedValueOnce({
          ...enrollment,
          course: { courseModules: [courseModule] },
        })
        .mockResolvedValueOnce({ aprobed: true })
        .mockResolvedValueOnce(null);
      queryRunner.manager.count.mockResolvedValue(1);
      queryRunner.manager.save.mockImplementation(
        async (_entity, value) => value,
      );

      const result = await moduleProgressService.complete(
        { moduleId: ids.module, courseEnrollmentId: ids.enrollment },
        ids.user,
      );

      expect(result.isCompleted).toBe(true);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('declara el curso culminado cuando todos sus módulos están completados', async () => {
      const completeEnrollment = {
        ...enrollment,
        course: { courseModules: [{ module: { id: ids.module } }] },
      };
      queryRunner.manager.findOne.mockResolvedValue(completeEnrollment);
      queryRunner.manager.find.mockResolvedValue([
        { module: { id: ids.module }, isCompleted: true },
      ]);
      queryRunner.manager.save.mockImplementation(
        async (_entity, value) => value,
      );

      const result = await enrollmentService.complete(ids.enrollment, ids.user);

      expect(result.isCompleted).toBe(true);
      expect(result.completedDate).toBeInstanceOf(Date);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('revierte la finalización si hay lecciones pendientes o el quiz no está aprobado', async () => {
      queryRunner.manager.findOne
        .mockResolvedValueOnce({
          id: ids.module,
          lessons: [lesson],
          quiz: { id: ids.quiz },
        })
        .mockResolvedValueOnce({
          ...enrollment,
          course: { courseModules: [courseModule] },
        });
      queryRunner.manager.count.mockResolvedValue(0);

      await expect(
        moduleProgressService.complete(
          { moduleId: ids.module, courseEnrollmentId: ids.enrollment },
          ids.user,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
    });
  });

  describe('Cobertura adicional de CourseEnrollmentService', () => {
    it('consulta matrículas, una matrícula individual, por usuario, por curso y verifica inscripción', async () => {
      enrollmentRepository.find.mockResolvedValue([enrollment]);
      enrollmentRepository.findOne
        .mockResolvedValueOnce(enrollment)
        .mockResolvedValueOnce(enrollment);

      await expect(enrollmentService.findAll()).resolves.toEqual([enrollment]);
      await expect(enrollmentService.findOne(ids.enrollment)).resolves.toEqual(
        enrollment,
      );
      await expect(enrollmentService.findByUser(ids.user)).resolves.toEqual([
        enrollment,
      ]);
      await expect(enrollmentService.findByCourse(ids.course)).resolves.toEqual([
        enrollment,
      ]);
      await expect(
        enrollmentService.isUserEnrolled(ids.user, ids.course),
      ).resolves.toBe(true);

      expect(enrollmentRepository.find).toHaveBeenCalledTimes(3);
      expect(enrollmentRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('rechaza una matrícula inexistente y devuelve falso cuando no existe', async () => {
      enrollmentRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(enrollmentService.findOne(ids.enrollment)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        enrollmentService.isUserEnrolled(ids.user, ids.course),
      ).resolves.toBe(false);
    });

    it('rechaza la matrícula cuando el usuario no existe', async () => {
      userRepository.findOne.mockResolvedValue(null);
      courseRepository.findOne.mockResolvedValue(course);
      enrollmentRepository.findOne.mockResolvedValue(null);

      await expect(
        enrollmentService.create({ userId: ids.user, courseId: ids.course }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(enrollmentRepository.save).not.toHaveBeenCalled();
    });

    it('revierte la finalización cuando falta completar un módulo del curso', async () => {
      queryRunner.manager.findOne.mockResolvedValue({
        ...enrollment,
        course: {
          ...course,
          courseModules: [
            { module: { id: ids.module }, order: 1 },
            {
              module: {
                id: '99999999-9999-4999-8999-999999999999',
              },
              order: 2,
            },
          ],
        },
      });
      queryRunner.manager.find.mockResolvedValue([
        { module: { id: ids.module } },
      ]);

      await expect(
        enrollmentService.complete(ids.enrollment, ids.user),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
    });

    it('calcula el progreso de cursos con lecciones, quizzes y cursos sin contenido', async () => {
      const secondLesson = {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        title: 'Lección 2',
        order: 2,
      };
      const courseWithContent = {
        ...course,
        courseModules: [
          {
            order: 2,
            module: {
              id: ids.module,
              lessons: [secondLesson, lesson],
              quiz: { id: ids.quiz },
            },
          },
        ],
      };
      const emptyCourse = {
        ...course,
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        courseModules: [],
      };
      const firstEnrollment = {
        ...enrollment,
        course: courseWithContent,
        enrollmentDate: new Date('2026-01-01'),
      };
      const secondEnrollment = {
        ...enrollment,
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        course: emptyCourse,
      };
      enrollmentRepository.find.mockResolvedValue([
        firstEnrollment,
        secondEnrollment,
      ]);
      userProgressRepository.find.mockResolvedValue([
        {
          courseEnrollment: { id: firstEnrollment.id },
          lesson: { id: lesson.id },
        },
      ]);
      attemptRepository.find.mockResolvedValue([
        {
          courseEnrollment: { id: firstEnrollment.id },
          quiz: { id: ids.quiz },
        },
      ]);

      const result = await enrollmentService.findMyCourses(ids.user);

      expect(result[0]).toMatchObject({
        totalLessons: 2,
        completedLessons: 1,
        totalExams: 1,
        completedExams: 1,
        totalProgress: 67,
        firstLessonId: secondLesson.id,
      });
      expect(result[1]).toMatchObject({
        totalProgress: 0,
        totalModules: 0,
        firstLessonId: null,
      });
    });

    it('ordena módulos al seleccionar la primera lección del curso', async () => {
      enrollmentRepository.find.mockResolvedValue([
        {
          ...enrollment,
          course: {
            ...course,
            courseModules: [
              {
                order: 2,
                module: {
                  id: ids.module,
                  lessons: [{ id: ids.lesson, order: 1 }],
                },
              },
              {
                order: 1,
                module: {
                  id: '99999999-9999-4999-8999-999999999999',
                  lessons: [
                    {
                      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                      order: 1,
                    },
                  ],
                },
              },
            ],
          },
        },
      ]);
      userProgressRepository.find.mockResolvedValue([]);
      attemptRepository.find.mockResolvedValue([]);

      const result = await enrollmentService.findMyCourses(ids.user);

      expect(result[0].firstLessonId).toBe(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      );
    });

    it('construye contenido ordenado y conserva el último estado de cada quiz', async () => {
      const contentEnrollment = {
        ...enrollment,
        course: {
          ...course,
          courseModules: [
            {
              order: 2,
              module: {
                id: ids.module,
                title: 'Módulo 1',
                description: 'Descripción',
                lessons: [
                  {
                    ...lesson,
                    type: 'VIDEO',
                    title: 'Lección ordenada',
                    order: 2,
                    duration: 10,
                    description: 'Contenido',
                  },
                  {
                    id: '99999999-9999-4999-8999-999999999999',
                    type: 'PDF',
                    title: 'Primera lección',
                    order: 1,
                    duration: 5,
                    description: null,
                  },
                ],
                quiz: {
                  id: ids.quiz,
                  name: 'Quiz',
                  description: 'Evaluación',
                },
              },
            },
            {
              order: 1,
              module: {
                id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
                title: 'Módulo previo',
                description: null,
                lessons: [],
              },
            },
          ],
        },
        enrollmentDate: new Date('2026-01-01'),
      };
      enrollmentRepository.findOne.mockResolvedValue(contentEnrollment);
      moduleProgressRepository.find.mockResolvedValue([
        { module: { id: ids.module }, isCompleted: true },
      ]);
      userProgressRepository.find.mockResolvedValue([
        { lesson: { id: ids.lesson }, isCompleted: true },
      ]);
      attemptRepository.find.mockResolvedValue([
        {
          quiz: { id: ids.quiz },
          aprobed: false,
          attemptDate: new Date('2026-01-01T10:00:00Z'),
        },
        {
          quiz: { id: ids.quiz },
          aprobed: true,
          attemptDate: new Date('2026-01-02T10:00:00Z'),
        },
      ]);

      const result = await enrollmentService.findContent(ids.enrollment);

      expect(result.modules[0].order).toBe(1);
      expect(result.modules[1]).toMatchObject({
        id: ids.module,
        isCompleted: true,
      });
      expect(result.modules[1].contents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: ids.quiz, status: 'PASSED' }),
        ]),
      );
    });

    it('expone estados FAILED y NOT_STARTED para quizzes sin aprobación o sin intentos', async () => {
      const modules = [
        {
          order: 1,
          module: {
            id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
            title: 'Módulo fallido',
            description: null,
            lessons: [],
            quiz: {
              id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
              name: 'Quiz fallido',
              description: null,
            },
          },
        },
        {
          order: 2,
          module: {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            title: 'Módulo nuevo',
            description: null,
            lessons: [],
            quiz: {
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              name: 'Quiz nuevo',
              description: null,
            },
          },
        },
      ];
      enrollmentRepository.findOne.mockResolvedValue({
        ...enrollment,
        course: { ...course, courseModules: modules },
      });
      moduleProgressRepository.find.mockResolvedValue([]);
      userProgressRepository.find.mockResolvedValue([]);
      attemptRepository.find.mockResolvedValue([
        {
          quiz: { id: modules[0].module.quiz.id },
          aprobed: false,
          attemptDate: new Date(),
        },
      ]);

      const result = await enrollmentService.findContent(ids.enrollment);
      const statuses = result.modules.flatMap(module =>
        module.contents.map(content => content.status),
      );

      expect(statuses).toEqual(['FAILED', 'NOT_STARTED']);
    });

    it('rechaza contenido para una matrícula inexistente y maneja cursos sin módulos', async () => {
      enrollmentRepository.findOne.mockResolvedValueOnce(null);
      await expect(
        enrollmentService.findContent(ids.enrollment),
      ).rejects.toBeInstanceOf(NotFoundException);

      queryRunner.manager.findOne.mockResolvedValue({
        ...enrollment,
        course: { ...course, courseModules: [] },
      });
      await expect(
        enrollmentService.complete(ids.enrollment, ids.user),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('completa una matrícula ya fechada sin reemplazar su fecha y revierte si no existe', async () => {
      const completedEnrollment = {
        ...enrollment,
        completedDate: new Date('2026-02-01'),
        course: {
          ...course,
          courseModules: [
            { module: { id: ids.module }, order: 2 },
            {
              module: {
                id: '99999999-9999-4999-8999-999999999999',
              },
              order: 1,
            },
          ],
        },
      };
      queryRunner.manager.findOne.mockResolvedValue(completedEnrollment);
      queryRunner.manager.find.mockResolvedValue([
        { module: { id: ids.module } },
        { module: { id: '99999999-9999-4999-8999-999999999999' } },
      ]);
      queryRunner.manager.save.mockImplementation(
        async (_entity, value) => value,
      );

      const result = await enrollmentService.complete(
        ids.enrollment,
        ids.user,
      );

      expect(result.completedDate).toEqual(completedEnrollment.completedDate);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();

      queryRunner.manager.findOne.mockResolvedValue(null);
      await expect(
        enrollmentService.complete(ids.enrollment, ids.user),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('actualiza la fecha explícita, completa automáticamente y limpia al desmarcar', async () => {
      enrollmentRepository.findOne.mockResolvedValue({ ...enrollment });
      enrollmentRepository.save.mockImplementation(async value => value);

      const explicitDate = '2026-03-01T12:00:00.000Z';
      const explicit = await enrollmentService.update(ids.enrollment, {
        completedDate: explicitDate,
      });
      expect(explicit.completedDate).toEqual(new Date(explicitDate));

      enrollmentRepository.findOne.mockResolvedValue({
        ...enrollment,
        completedDate: null,
      });
      const completed = await enrollmentService.update(ids.enrollment, {
        isCompleted: true,
      });
      expect(completed.completedDate).toBeInstanceOf(Date);

      enrollmentRepository.findOne.mockResolvedValue({
        ...enrollment,
        completedDate: new Date(),
      });
      const reopened = await enrollmentService.update(ids.enrollment, {
        isCompleted: false,
      });
      expect(reopened.completedDate).toBeNull();
    });

    it('elimina una matrícula existente y rechaza el identificador inexistente', async () => {
      enrollmentRepository.delete.mockResolvedValueOnce({ affected: 1 });
      await expect(enrollmentService.remove(ids.enrollment)).resolves.toBeUndefined();

      enrollmentRepository.delete.mockResolvedValueOnce({ affected: 0 });
      await expect(enrollmentService.remove(ids.enrollment)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
