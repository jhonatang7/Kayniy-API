import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { Lesson } from '../lesson/entities/lesson.entity';
import { LessonService } from '../lesson/lesson.service';
import { CreateLessonDto, LessonType } from '../lesson/dto/create-lesson.dto';
import { UpdateLessonOrderDto } from '../lesson/dto/update-lesson-order.dto';
import { CreateQuizDto } from '../quiz/dto/create-quiz.dto';
import { Quiz } from '../quiz/entities/quiz.entity';
import { QuizService } from '../quiz/quiz.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { Module } from './entities/module.entity';
import { ModuleService } from './module.service';
import { ModuleState } from './types/state.enum';

describe('ModuleService', () => {
  let moduleService: ModuleService;
  let lessonService: LessonService;
  let quizService: QuizService;
  let moduleRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };
  let lessonRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let quizRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
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
      save: jest.Mock;
      remove: jest.Mock;
    };
  };
  let dataSource: { createQueryRunner: jest.Mock };

  const ids = {
    module: '11111111-1111-4111-8111-111111111111',
    community: '22222222-2222-4222-8222-222222222222',
    lessonA: '33333333-3333-4333-8333-333333333333',
    lessonB: '44444444-4444-4444-8444-444444444444',
  };
  const moduleEntity = {
    id: ids.module,
    title: 'Módulo inicial',
    description: 'Contenido base',
    state: ModuleState.NOT_VERIFIED,
    community: { id: ids.community },
  };

  beforeEach(async () => {
    moduleRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    lessonRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    quizRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
      findOne: jest.fn(),
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
        save: jest.fn(),
        remove: jest.fn().mockResolvedValue(undefined),
      },
    };
    dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        ModuleService,
        LessonService,
        QuizService,
        { provide: getRepositoryToken(Module), useValue: moduleRepository },
        { provide: getRepositoryToken(Lesson), useValue: lessonRepository },
        { provide: getRepositoryToken(Quiz), useValue: quizRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    moduleService = testingModule.get<ModuleService>(ModuleService);
    lessonService = testingModule.get<LessonService>(LessonService);
    quizService = testingModule.get<QuizService>(QuizService);
  });

  describe('RF-18: Creación de módulos en comunidad', () => {
    it('crea el módulo con estado deshabilitado y lo vincula a la comunidad', async () => {
      moduleRepository.save.mockResolvedValue(moduleEntity);

      const result = await moduleService.create({
        title: 'Módulo inicial',
        description: 'Contenido base',
        communityId: ids.community,
      });

      expect(result).toEqual(moduleEntity);
      expect(moduleRepository.create).toHaveBeenCalledWith({
        title: 'Módulo inicial',
        description: 'Contenido base',
        community: { id: ids.community },
        state: ModuleState.NOT_VERIFIED,
      });
      expect(moduleRepository.save).toHaveBeenCalled();
    });

    it('bloquea la creación cuando faltan datos o la comunidad no es válida', async () => {
      const dto = Object.assign(new CreateModuleDto(), {
        title: '',
        description: 'Descripción',
        communityId: 'community-invalida',
      });
      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['title', 'communityId']),
      );
      expect(moduleRepository.save).not.toHaveBeenCalled();
      expect(new BadRequestException('Datos inválidos')).toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('RF-19: Publicación y control de estado del módulo', () => {
    it('actualiza el estado del módulo a habilitado', async () => {
      moduleRepository.findOne.mockResolvedValue({ ...moduleEntity });
      moduleRepository.save.mockImplementation(async (value) => value);

      const result = await moduleService.update(ids.module, {
        state: ModuleState.VERIFIED,
      });

      expect(result.state).toBe(ModuleState.VERIFIED);
      expect(moduleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ state: ModuleState.VERIFIED }),
      );
    });

    it('no retorna módulos deshabilitados para consumo dentro de un curso', async () => {
      moduleRepository.find.mockResolvedValue([]);

      const result = await moduleService.findByCommunity(ids.community);

      expect(result).toEqual([]);
      expect(moduleRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            community: { id: ids.community },
            state: ModuleState.VERIFIED,
          },
        }),
      );
    });
  });

  describe('RF-20: Incorporación y almacenamiento de lecciones', () => {
    it('almacena una lección con su material y la vincula al módulo', async () => {
      const lesson = {
        id: ids.lessonA,
        title: 'Primera lección',
        module: { id: ids.module },
        order: 1,
        type: LessonType.VIDEO,
      };
      lessonRepository.save.mockResolvedValue(lesson);

      const result = await lessonService.create(
        {
          title: 'Primera lección',
          description: 'Introducción',
          urlContent: 'https://content.example/lesson',
          duration: 15,
          order: 1,
          type: LessonType.VIDEO,
          moduleId: ids.module,
        },
        ids.lessonA,
      );

      expect(result).toEqual(lesson);
      expect(lessonRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: ids.lessonA,
          module: { id: ids.module },
          urlContent: 'https://content.example/lesson',
        }),
      );
    });

    it('rechaza una lección sin campos obligatorios o con formato inválido', async () => {
      const dto = Object.assign(new CreateLessonDto(), {
        title: '',
        order: 0,
        type: 'INVALID',
        moduleId: 'module-invalido',
      });
      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['title', 'order', 'type', 'moduleId']),
      );
      expect(lessonRepository.save).not.toHaveBeenCalled();
      expect(
        new BadRequestException('Datos de lección inválidos'),
      ).toBeInstanceOf(BadRequestException);
    });
  });

  describe('RF-21: Reorganización secuencial de lecciones', () => {
    it('actualiza los índices y retorna la nueva secuencia', async () => {
      const lessons = [
        { id: ids.lessonA, module: { id: ids.module }, order: 1 },
        { id: ids.lessonB, module: { id: ids.module }, order: 2 },
      ];
      queryRunner.manager.find.mockResolvedValue(lessons);
      queryRunner.manager.save.mockImplementation(
        async (_entity, values) => values,
      );

      const result = await lessonService.updateOrder({
        moduleId: ids.module,
        lessons: [
          { lessonId: ids.lessonB, order: 1 },
          { lessonId: ids.lessonA, order: 2 },
        ],
      });

      expect(result.map((lesson) => [lesson.id, lesson.order])).toEqual([
        [ids.lessonB, 1],
        [ids.lessonA, 2],
      ]);
      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('revierte la transacción y propaga el error si falla el guardado del orden', async () => {
      const saveError = new Error('No se pudo guardar la jerarquía');
      queryRunner.manager.find.mockResolvedValue([
        { id: ids.lessonA, module: { id: ids.module }, order: 1 },
      ]);
      queryRunner.manager.save.mockRejectedValue(saveError);

      await expect(
        lessonService.updateOrder({
          moduleId: ids.module,
          lessons: [{ lessonId: ids.lessonA, order: 1 }],
        }),
      ).rejects.toThrow(saveError);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('RF-22: Configuración de examen final del módulo', () => {
    it('almacena un único examen final vinculado al módulo', async () => {
      quizRepository.findOne.mockResolvedValue(null);
      const quiz = {
        id: 'quiz-1',
        name: 'Examen final',
        module: { id: ids.module },
        passingScore: 70,
      };
      quizRepository.save.mockResolvedValue(quiz);

      const result = await quizService.create({
        name: quiz.name,
        description: 'Evaluación final',
        passingScore: quiz.passingScore,
        moduleId: ids.module,
      });

      expect(result).toEqual(quiz);
      expect(quizRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ module: { id: ids.module } }),
      );
    });

    it('lanza ConflictException cuando el módulo ya tiene un examen final', async () => {
      quizRepository.findOne.mockResolvedValue({
        id: 'existing-quiz',
        module: { id: ids.module },
      });

      await expect(
        quizService.create({
          name: 'Segundo examen',
          passingScore: 70,
          moduleId: ids.module,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(quizRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('RF-23: Actualización de datos y contenidos del módulo', () => {
    it('actualiza los datos del módulo y confirma la persistencia', async () => {
      moduleRepository.findOne.mockResolvedValue({ ...moduleEntity });
      moduleRepository.save.mockImplementation(async (value) => value);

      const result = await moduleService.update(ids.module, {
        title: 'Módulo actualizado',
        description: 'Nueva descripción',
        state: ModuleState.VERIFIED,
      });

      expect(result).toMatchObject({
        title: 'Módulo actualizado',
        description: 'Nueva descripción',
        state: ModuleState.VERIFIED,
      });
      expect(moduleRepository.save).toHaveBeenCalled();
    });

    it('bloquea la persistencia cuando los datos editados son inválidos', async () => {
      const dto = Object.assign(new UpdateModuleDto(), {
        title: '',
        communityId: 'invalid-community',
        state: 'INVALID_STATE',
      });
      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['communityId', 'state']),
      );
      expect(moduleRepository.save).not.toHaveBeenCalled();
      expect(
        new BadRequestException('Datos del módulo inválidos'),
      ).toBeInstanceOf(BadRequestException);
    });
  });

  describe('RF-24: Eliminación de módulos de la comunidad', () => {
    it('elimina el módulo y sus lecciones asociadas mediante la eliminación del módulo', async () => {
      moduleRepository.findOne.mockResolvedValue(moduleEntity);

      await expect(moduleService.remove(ids.module)).resolves.toBeUndefined();

      expect(moduleRepository.remove).toHaveBeenCalledWith(moduleEntity);
    });

    it('propaga el error cuando falla la eliminación del módulo', async () => {
      const deleteError = new Error('No se pudo eliminar el módulo');
      moduleRepository.findOne.mockResolvedValue(moduleEntity);
      moduleRepository.remove.mockRejectedValue(deleteError);

      await expect(moduleService.remove(ids.module)).rejects.toThrow(
        deleteError,
      );
    });
  });
});
