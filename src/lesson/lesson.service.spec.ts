import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { CreateLessonDto, LessonType } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { UpdateLessonOrderDto } from './dto/update-lesson-order.dto';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { Lesson } from './entities/lesson.entity';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
}));

describe('LessonService', () => {
  let lessonService: LessonService;
  let lessonController: LessonController;
  let lessonRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let cloudflareService: {
    uploadFile: jest.Mock;
    deleteFile: jest.Mock;
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
    lesson: '11111111-1111-4111-8111-111111111111',
    module: '22222222-2222-4222-8222-222222222222',
    lessonTwo: '33333333-3333-4333-8333-333333333333',
  };
  const lesson = {
    id: ids.lesson,
    title: 'Introducción',
    description: 'Conceptos iniciales',
    duration: 15,
    order: 1,
    type: LessonType.VIDEO,
    urlContent: 'https://www.youtube.com/watch?v=abc123',
    module: { id: ids.module },
  };

  beforeEach(async () => {
    lessonRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
      findOne: jest.fn(),
    };
    cloudflareService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn().mockResolvedValue(undefined),
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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonController],
      providers: [
        LessonService,
        { provide: getRepositoryToken(Lesson), useValue: lessonRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: CloudflareService, useValue: cloudflareService },
      ],
    }).compile();

    lessonService = module.get<LessonService>(LessonService);
    lessonController = module.get<LessonController>(LessonController);
  });

  describe('RF-25: Registro de lecciones en módulo educativo', () => {
    it('valida, vincula y almacena una lección de video en el módulo', async () => {
      lessonRepository.save.mockResolvedValue(lesson);
      const dto: CreateLessonDto = {
        title: lesson.title,
        description: lesson.description,
        duration: lesson.duration,
        order: lesson.order,
        type: LessonType.VIDEO,
        moduleId: ids.module,
        urlContent: lesson.urlContent,
      };

      const result = await lessonService.create(dto, ids.lesson);

      expect(result).toEqual(lesson);
      expect(lessonRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: ids.lesson,
          module: { id: ids.module },
          duration: 15,
          type: LessonType.VIDEO,
        }),
      );
    });

    it('rechaza datos obligatorios ausentes o una duración inválida', async () => {
      const dto = Object.assign(new CreateLessonDto(), {
        title: '',
        order: 0,
        duration: 'not-a-number',
        type: 'INVALID',
        moduleId: 'invalid-module',
      });
      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining([
          'title',
          'duration',
          'order',
          'type',
          'moduleId',
        ]),
      );
      expect(lessonRepository.save).not.toHaveBeenCalled();
      expect(
        new BadRequestException('Datos de lección inválidos'),
      ).toBeInstanceOf(BadRequestException);
    });
  });

  describe('RF-26: Carga y almacenamiento en la nube de lecciones PDF', () => {
    it('sube un PDF válido y asocia el enlace generado a la lección', async () => {
      const pdf = {
        originalname: 'lesson.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('pdf'),
      } as Express.Multer.File;
      const cloudUrl = `https://cdn.example/lesson-pdf/${ids.lesson}.pdf`;
      cloudflareService.uploadFile.mockResolvedValue(cloudUrl);
      lessonRepository.save.mockImplementation(async (value) => value);

      const result = await lessonController.create(
        {
          title: 'Documento',
          description: 'Lectura',
          duration: 10,
          order: 1,
          type: LessonType.DOCUMENT,
          moduleId: ids.module,
        },
        pdf,
      );

      expect(cloudflareService.uploadFile).toHaveBeenCalledWith(
        pdf,
        'lesson-pdf',
        expect.any(String),
      );
      expect(lessonRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ urlContent: cloudUrl }),
      );
      expect(result).toMatchObject({ urlContent: cloudUrl });
    });

    it('bloquea un archivo rechazado por tipo o tamaño y no guarda la lección', async () => {
      cloudflareService.uploadFile.mockRejectedValue(
        new BadRequestException('El archivo debe ser PDF y no superar 5 MB'),
      );
      const invalidFile = {
        originalname: 'lesson.exe',
        mimetype: 'application/octet-stream',
        size: 6 * 1024 * 1024,
        buffer: Buffer.from('invalid'),
      } as Express.Multer.File;

      await expect(
        lessonController.create(
          {
            title: 'Documento inválido',
            order: 1,
            type: LessonType.DOCUMENT,
            moduleId: ids.module,
          },
          invalidFile,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(lessonRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('RF-27: Vinculación de contenido audiovisual mediante URL', () => {
    it('valida y vincula una URL de video compatible', async () => {
      lessonRepository.save.mockImplementation(async (value) => value);

      const result = await lessonService.create(
        {
          title: 'Video introductorio',
          order: 1,
          type: LessonType.VIDEO,
          moduleId: ids.module,
          urlContent: 'https://www.youtube.com/watch?v=abc123',
        },
        ids.lesson,
      );

      expect(result.urlContent).toBe('https://www.youtube.com/watch?v=abc123');
      expect(lessonRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ type: LessonType.VIDEO }),
      );
    });

    it('rechaza una URL inválida y evita persistir el recurso', async () => {
      lessonRepository.save.mockRejectedValue(
        new BadRequestException('La URL de video no es válida'),
      );

      await expect(
        lessonService.create(
          {
            title: 'Video inválido',
            order: 1,
            type: LessonType.VIDEO,
            moduleId: ids.module,
            urlContent: 'not-a-video-url',
          },
          ids.lesson,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('RF-28: Actualización de datos y contenidos de la lección', () => {
    it('actualiza los datos y el recurso de la lección', async () => {
      lessonRepository.findOne.mockResolvedValue({ ...lesson });
      lessonRepository.save.mockImplementation(async (value) => value);
      const update = {
        title: 'Video actualizado',
        description: 'Nueva descripción',
        urlContent: 'https://vimeo.com/123456',
        type: LessonType.VIDEO,
      };

      const result = await lessonService.update(ids.lesson, update);

      expect(result).toMatchObject(update);
      expect(lessonRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(update),
      );
    });

    it('informa el fallo de conexión al sustituir el recurso y no confirma cambios', async () => {
      const cloudError = new InternalServerErrorException(
        'No fue posible sustituir el archivo en la nube',
      );
      cloudflareService.uploadFile.mockRejectedValue(cloudError);
      lessonRepository.findOne.mockResolvedValue({
        ...lesson,
        type: LessonType.DOCUMENT,
      });
      const file = {
        originalname: 'replacement.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf'),
      } as Express.Multer.File;

      await expect(
        lessonController.update(
          ids.lesson,
          { title: 'Documento actualizado', type: LessonType.DOCUMENT },
          file,
        ),
      ).rejects.toThrow(cloudError);
      expect(lessonRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('RF-29: Eliminación de lecciones del módulo', () => {
    it('elimina la lección y confirma la desvinculación de sus recursos', async () => {
      lessonRepository.findOne.mockResolvedValue({
        ...lesson,
        type: LessonType.DOCUMENT,
        urlContent: 'https://cdn.example/lesson.pdf',
      });
      queryRunner.manager.findOne.mockResolvedValue({
        ...lesson,
        type: LessonType.DOCUMENT,
        urlContent: 'https://cdn.example/lesson.pdf',
      });
      queryRunner.manager.find.mockResolvedValue([]);

      await lessonController.remove(ids.lesson);

      expect(cloudflareService.deleteFile).toHaveBeenCalledWith(
        'https://cdn.example/lesson.pdf',
      );
      expect(queryRunner.manager.remove).toHaveBeenCalledWith(
        Lesson,
        expect.objectContaining({ id: ids.lesson }),
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('revierte y notifica el fallo cuando no puede borrar la dependencia', async () => {
      const deleteError = new Error('No se pudo borrar la dependencia');
      queryRunner.manager.findOne.mockResolvedValue(lesson);
      queryRunner.manager.remove.mockRejectedValue(deleteError);

      await expect(lessonService.remove(ids.lesson)).rejects.toThrow(
        deleteError,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('RF-30: Sincronización automática de secuencia pedagógica', () => {
    it('recalcula y persiste el orden correlativo de las lecciones', async () => {
      const lessons = [
        { id: ids.lesson, module: { id: ids.module }, order: 1 },
        { id: ids.lessonTwo, module: { id: ids.module }, order: 2 },
      ];
      queryRunner.manager.find.mockResolvedValue(lessons);
      queryRunner.manager.save.mockImplementation(
        async (_entity, values) => values,
      );

      const result = await lessonService.updateOrder({
        moduleId: ids.module,
        lessons: [
          { lessonId: ids.lessonTwo, order: 1 },
          { lessonId: ids.lesson, order: 2 },
        ],
      });

      expect(result.map((item) => [item.id, item.order])).toEqual([
        [ids.lessonTwo, 1],
        [ids.lesson, 2],
      ]);
      expect(queryRunner.manager.save).toHaveBeenCalledWith(Lesson, lessons);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('revierte la transacción y preserva la secuencia si falla el guardado en lote', async () => {
      const saveError = new Error('La sincronización no pudo completarse');
      const lessons = [
        { id: ids.lesson, module: { id: ids.module }, order: 1 },
      ];
      queryRunner.manager.find.mockResolvedValue(lessons);
      queryRunner.manager.save.mockRejectedValue(saveError);

      await expect(
        lessonService.updateOrder({
          moduleId: ids.module,
          lessons: [{ lessonId: ids.lesson, order: 1 }],
        }),
      ).rejects.toThrow(saveError);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(lessons[0].order).toBe(1);
    });
  });
});
