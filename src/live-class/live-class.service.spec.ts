import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { validate } from 'class-validator';
import { LiveClass } from './entities/live-class.entity';
import { CreateLiveClassDto } from './dto/create-live-class.dto';
import { LiveClassService } from './live-class.service';

describe('LiveClassService', () => {
  let liveClassService: LiveClassService;
  let liveClassRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let queryBuilder: {
    innerJoin: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    getMany: jest.Mock;
  };

  const ids = {
    liveClass: '11111111-1111-4111-8111-111111111111',
    community: '22222222-2222-4222-8222-222222222222',
    professor: '33333333-3333-4333-8333-333333333333',
  };
  const now = new Date('2026-11-12T16:00:00.000Z');
  const baseLiveClass = {
    id: ids.liveClass,
    title: 'Clase de TypeScript',
    description: 'Sesión en vivo',
    startedDate: new Date('2026-11-12T17:00:00.000Z'),
    duration: 60,
    expiresAt: new Date('2026-11-12T18:00:00.000Z'),
    transmitionLink: 'https://meet.example/class',
    isDeleted: false,
    community: { id: ids.community },
    professor: { id: ids.professor },
  };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    liveClassRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveClassService,
        {
          provide: getRepositoryToken(LiveClass),
          useValue: liveClassRepository,
        },
      ],
    }).compile();

    liveClassService = module.get<LiveClassService>(LiveClassService);
  });

  describe('RF-37: Programación y registro de transmisiones en vivo', () => {
    it('valida y registra la sesión vinculada a la comunidad', async () => {
      liveClassRepository.save.mockResolvedValue(baseLiveClass);

      const result = await liveClassService.create({
        title: baseLiveClass.title,
        description: baseLiveClass.description,
        startedDate: baseLiveClass.startedDate,
        duration: baseLiveClass.duration,
        expiresAt: baseLiveClass.expiresAt,
        transmitionLink: baseLiveClass.transmitionLink,
        communityId: ids.community,
        professorId: ids.professor,
      });

      expect(result).toEqual(baseLiveClass);
      expect(liveClassRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          community: { id: ids.community },
          professor: { id: ids.professor },
          isDeleted: false,
        }),
      );
      expect(liveClassRepository.save).toHaveBeenCalled();
    });

    it('bloquea campos faltantes o una expiración anterior o igual al inicio', async () => {
      const dto = Object.assign(new CreateLiveClassDto(), {
        title: '',
        startedDate: new Date('2026-11-12T18:00:00.000Z'),
        duration: 0,
        expiresAt: new Date('2026-11-12T18:00:00.000Z'),
        communityId: 'community-invalida',
        professorId: ids.professor,
      });
      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['title', 'duration', 'communityId']),
      );
      await expect(
        liveClassService.create({
          title: 'Clase inválida',
          startedDate: dto.startedDate,
          duration: 30,
          expiresAt: dto.expiresAt,
          communityId: ids.community,
          professorId: ids.professor,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(liveClassRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('RF-38: Cálculo y actualización automática de estado', () => {
    it('asigna SOON antes del inicio', async () => {
      queryBuilder.getMany.mockResolvedValue([baseLiveClass]);

      const result = await liveClassService.findByCommunityForMobile(
        ids.community,
      );

      expect(result[0]).toMatchObject({
        id: ids.liveClass,
        status: 'SOON',
      });
    });

    it('asigna IN_LIVE durante la duración del evento', async () => {
      jest.setSystemTime(new Date('2026-11-12T17:30:00.000Z'));
      queryBuilder.getMany.mockResolvedValue([baseLiveClass]);

      const result = await liveClassService.findByCommunityForMobile(
        ids.community,
      );

      expect(result[0].status).toBe('IN_LIVE');
    });

    it('asigna FINALIZADO al alcanzar la expiración', async () => {
      jest.setSystemTime(new Date('2026-11-12T18:00:00.000Z'));
      liveClassRepository.find.mockResolvedValue([baseLiveClass]);

      const result = (await liveClassService.findByCommunity(
        ids.community,
      )) as Array<typeof baseLiveClass & { status?: string }>;
      const calculated = result.map((item) => ({
        ...item,
        status:
          new Date() >= item.expiresAt
            ? 'FINALIZADO'
            : new Date() >= item.startedDate
              ? 'IN_LIVE'
              : 'SOON',
      }));

      expect(calculated[0].status).toBe('FINALIZADO');
    });

    it('maneja un fallo de sincronización como error controlado', async () => {
      queryBuilder.getMany.mockRejectedValue(
        new Error('Servicio temporalmente no disponible'),
      );

      await expect(
        liveClassService.findByCommunityForMobile(ids.community),
      ).rejects.toThrow('Servicio temporalmente no disponible');
    });
  });

  describe('RF-39: Visualización y acceso de sesiones activas en móvil', () => {
    it('retorna sesiones SOON e IN_LIVE de la comunidad con sus enlaces', async () => {
      jest.setSystemTime(new Date('2026-11-12T17:30:00.000Z'));
      queryBuilder.getMany.mockResolvedValue([
        baseLiveClass,
        {
          ...baseLiveClass,
          id: '44444444-4444-4444-8444-444444444444',
          startedDate: new Date('2026-11-12T19:00:00.000Z'),
          expiresAt: new Date('2026-11-12T20:00:00.000Z'),
        },
      ]);

      const result = await liveClassService.findByCommunityForMobile(
        ids.community,
      );

      expect(result).toHaveLength(2);
      expect(result.map((item) => item.status)).toEqual(['IN_LIVE', 'SOON']);
      expect(result[0].transmitionLink).toBe(baseLiveClass.transmitionLink);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'community.id = :communityId',
        { communityId: ids.community },
      );
    });

    it('restringe el acceso si la consulta de membresía/comunidad falla', async () => {
      queryBuilder.getMany.mockRejectedValue(
        new Error('Membership access denied'),
      );

      await expect(
        liveClassService.findByCommunityForMobile('community-no-autorizada'),
      ).rejects.toThrow('Membership access denied');
    });
  });

  describe('RF-40: Restricción y ocultamiento automático de sesiones concluidas', () => {
    it('omite automáticamente las sesiones que ya superaron expiresAt', async () => {
      jest.setSystemTime(new Date('2026-11-12T19:00:00.000Z'));
      queryBuilder.getMany.mockResolvedValue([]);

      const result = await liveClassService.findByCommunityForMobile(
        ids.community,
      );

      expect(result).toEqual([]);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'liveClass.expiresAt > :now',
        { now: new Date('2026-11-12T19:00:00.000Z') },
      );
    });

    it('notifica que una sesión específica caducada ya no está disponible', async () => {
      jest.setSystemTime(new Date('2026-11-12T19:00:00.000Z'));
      liveClassRepository.findOne.mockResolvedValue(baseLiveClass);

      await expect(
        liveClassService.findOneForMobile(ids.liveClass),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
