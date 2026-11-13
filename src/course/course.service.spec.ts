import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { CourseModuleService } from '../course-module/course-module.service';
import { CourseModule } from '../course-module/entities/course-module.entity';
import { Community } from '../community/entities/community.entity';
import { Module as ModuleEntity } from '../module/entities/module.entity';
import { User } from '../user/entities/user.entity';
import { CourseLevel, CreateCourseDto } from './dto/create-course.dto';
import { ReorderCourseModulesDto } from './dto/reorder-course-modules.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Course } from './entities/course.entity';
import { CourseService } from './course.service';

describe('CourseService', () => {
  let courseService: CourseService;
  let courseModuleService: CourseModuleService;
  let courseRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let courseModuleRepository: {
    findOne: jest.Mock;
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
      findOne: jest.Mock;
      find: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
      remove: jest.Mock;
    };
  };
  let dataSource: { createQueryRunner: jest.Mock };

  const ids = {
    course: '11111111-1111-4111-8111-111111111111',
    community: '22222222-2222-4222-8222-222222222222',
    user: '33333333-3333-4333-8333-333333333333',
    moduleA: '44444444-4444-4444-8444-444444444444',
    moduleB: '55555555-5555-4555-8555-555555555555',
  };
  const user = { id: ids.user, isDeleted: false };
  const community = { id: ids.community, deletedAt: null };
  const modules = [
    { id: ids.moduleA, title: 'Introducción' },
    { id: ids.moduleB, title: 'Práctica' },
  ];
  const course = {
    id: ids.course,
    name: 'Curso de TypeScript',
    description: 'Fundamentos',
    level: CourseLevel.BASIC,
    isDeleted: false,
    user,
    community,
    courseModules: [],
  };

  beforeEach(async () => {
    courseRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    courseModuleRepository = {
      findOne: jest.fn(),
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
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn((_entity, value) => value),
        save: jest.fn(),
        remove: jest.fn().mockResolvedValue(undefined),
      },
    };
    dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        CourseModuleService,
        { provide: getRepositoryToken(Course), useValue: courseRepository },
        {
          provide: getRepositoryToken(CourseModule),
          useValue: courseModuleRepository,
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    courseService = module.get<CourseService>(CourseService);
    courseModuleService = module.get<CourseModuleService>(CourseModuleService);
  });

  describe('RF-13: Creación de cursos en comunidad', () => {
    it('valida y registra un curso vinculado a la comunidad', async () => {
      queryRunner.manager.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(community);
      queryRunner.manager.find.mockResolvedValue(modules);
      queryRunner.manager.save
        .mockResolvedValueOnce({ ...course })
        .mockResolvedValueOnce([
          { course, module: modules[0], order: 0 },
          { course, module: modules[1], order: 1 },
        ]);
      const dto: CreateCourseDto = {
        name: course.name,
        description: course.description,
        level: CourseLevel.BASIC,
        userId: ids.user,
        communityId: ids.community,
        modules: [
          { moduleId: ids.moduleA, order: 0 },
          { moduleId: ids.moduleB, order: 1 },
        ],
      };

      const result = await courseService.create(dto);

      expect(result).toMatchObject({
        name: dto.name,
        level: dto.level,
        user,
        community,
      });
      expect(result.courseModules).toHaveLength(2);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('deniega la creación cuando el usuario no puede acceder a la comunidad', async () => {
      queryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(
        courseService.create({
          name: 'Curso',
          description: 'Descripción',
          level: CourseLevel.BASIC,
          userId: ids.user,
          communityId: ids.community,
          modules: [{ moduleId: ids.moduleA, order: 0 }],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('bloquea el guardado cuando faltan campos o la dificultad es inválida', async () => {
      const dto = Object.assign(new CreateCourseDto(), {
        name: '',
        level: 'InvalidLevel',
        userId: ids.user,
        communityId: ids.community,
        modules: [],
      });

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['name', 'level', 'modules']),
      );
      expect(
        new BadRequestException('Datos del curso inválidos'),
      ).toBeInstanceOf(BadRequestException);
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
    });
  });

  describe('RF-14: Asignación y reutilización de módulos en cursos', () => {
    it('asocia módulos nuevos o reutilizados a la estructura del curso', async () => {
      courseModuleRepository.findOne.mockResolvedValue(null);
      const assigned = {
        course: { id: ids.course },
        module: { id: ids.moduleA },
        order: 0,
      };
      courseModuleRepository.save.mockResolvedValue(assigned);

      const result = await courseModuleService.create({
        courseId: ids.course,
        moduleId: ids.moduleA,
        order: 0,
      });

      expect(result).toEqual(assigned);
      expect(courseModuleRepository.create).toHaveBeenCalledWith(assigned);
      expect(courseModuleRepository.save).toHaveBeenCalledWith(assigned);
    });

    it('lanza ConflictException y evita duplicar un módulo ya asignado', async () => {
      courseModuleRepository.findOne.mockResolvedValue({
        id: 'course-module-1',
        course: { id: ids.course },
        module: { id: ids.moduleA },
      });

      await expect(
        courseModuleService.create({
          courseId: ids.course,
          moduleId: ids.moduleA,
          order: 0,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(courseModuleRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('RF-15: Ordenamiento secuencial de módulos en el curso', () => {
    it('reorganiza, persiste y retorna los módulos en orden secuencial', async () => {
      const assignedModules = [
        { id: 'relation-a', module: { id: ids.moduleA }, order: 0 },
        { id: 'relation-b', module: { id: ids.moduleB }, order: 1 },
      ];
      queryRunner.manager.findOne.mockResolvedValue(course);
      queryRunner.manager.find.mockResolvedValue(assignedModules);
      queryRunner.manager.save.mockImplementation(
        async (_entity, values) => values,
      );

      const result = await courseService.reorderModules({
        courseId: ids.course,
        modules: [
          { moduleId: ids.moduleB, order: 0 },
          { moduleId: ids.moduleA, order: 1 },
        ],
      });

      expect(result.map((item) => [item.module.id, item.order])).toEqual([
        [ids.moduleB, 0],
        [ids.moduleA, 1],
      ]);
      expect(queryRunner.manager.save).toHaveBeenCalledWith(
        CourseModule,
        assignedModules,
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('revierte la transacción y propaga una excepción controlada si falla el guardado', async () => {
      const saveError = new Error('Error de conexión');
      queryRunner.manager.findOne.mockResolvedValue(course);
      queryRunner.manager.find.mockResolvedValue([
        { id: 'relation-a', module: { id: ids.moduleA }, order: 0 },
      ]);
      queryRunner.manager.save.mockRejectedValue(saveError);

      await expect(
        courseService.reorderModules({
          courseId: ids.course,
          modules: [{ moduleId: ids.moduleA, order: 1 }],
        }),
      ).rejects.toThrow(saveError);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('RF-16: Actualización de información del curso', () => {
    it('valida, persiste los cambios y retorna el curso actualizado', async () => {
      const existingCourse = { ...course };
      courseRepository.findOne.mockResolvedValue(existingCourse);
      courseRepository.save.mockImplementation(async (value) => value);
      const update = {
        name: 'Curso avanzado',
        description: 'Contenido actualizado',
        level: CourseLevel.HARD,
      };

      const result = await courseService.update(ids.course, update);

      expect(result).toMatchObject(update);
      expect(courseRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(update),
      );
    });

    it('detecta campos vacíos o niveles incorrectos antes del guardado', async () => {
      const dto = Object.assign(new UpdateCourseDto(), {
        name: '',
        level: 'Unknown',
      });
      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['level']),
      );
      expect(courseRepository.save).not.toHaveBeenCalled();
      expect(
        new BadRequestException('Datos del curso inválidos'),
      ).toBeInstanceOf(BadRequestException);
    });
  });

  describe('RF-17: Eliminación de cursos de la comunidad', () => {
    it('elimina el curso y sus asociaciones sin eliminar los módulos reutilizables', async () => {
      const assignedModules = [
        { id: 'relation-a', course: { id: ids.course }, module: modules[0] },
      ];
      queryRunner.manager.findOne.mockResolvedValue(course);
      queryRunner.manager.find.mockResolvedValue(assignedModules);

      await expect(courseService.remove(ids.course)).resolves.toBeUndefined();

      expect(queryRunner.manager.remove).toHaveBeenNthCalledWith(
        1,
        CourseModule,
        assignedModules,
      );
      expect(queryRunner.manager.remove).toHaveBeenNthCalledWith(
        2,
        Course,
        course,
      );
      expect(queryRunner.manager.remove).not.toHaveBeenCalledWith(
        ModuleEntity,
        expect.anything(),
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('anula la operación si falta el ID y mantiene el curso sin alteraciones', async () => {
      queryRunner.manager.findOne.mockResolvedValue(null);

      await expect(courseService.remove('')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(queryRunner.manager.remove).not.toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
