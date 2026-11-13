import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CommunityMemberService } from '../community-member/community-member.service';
import {
  CommunityMember,
  CommunityRole,
} from '../community-member/entities/community-member.entity';
import {
  CommunityMemberType,
  CreateCommunityMemberDto,
} from '../community-member/dto/create-community-member.dto';
import { User } from '../user/entities/user.entity';
import { Community } from './entities/community.entity';
import { CommunityService } from './community.service';

describe('CommunityService', () => {
  let communityService: CommunityService;
  let communityMemberService: CommunityMemberService;
  let communityRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    softDelete: jest.Mock;
  };
  let communityMemberRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
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
    };
  };
  let dataSource: { createQueryRunner: jest.Mock };

  const ids = {
    community: '11111111-1111-4111-8111-111111111111',
    teacher: '22222222-2222-4222-8222-222222222222',
    student: '33333333-3333-4333-8333-333333333333',
  };
  const community = {
    id: ids.community,
    name: 'Comunidad Académica',
    description: 'Área de aprendizaje',
    deletedAt: null,
    courses: [],
    modules: [],
    liveClasses: [],
  };
  const teacher = {
    id: ids.teacher,
    isDeleted: false,
    role: { name: 'teacher' },
  };
  const activeMembership = {
    id: '44444444-4444-4444-8444-444444444444',
    community,
    user: teacher,
    communityRole: CommunityRole.TEACHER,
  };

  beforeEach(async () => {
    communityRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
      find: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    communityMemberRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
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
      },
    };
    dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
        CommunityMemberService,
        {
          provide: getRepositoryToken(Community),
          useValue: communityRepository,
        },
        {
          provide: getRepositoryToken(CommunityMember),
          useValue: communityMemberRepository,
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    communityService = module.get<CommunityService>(CommunityService);
    communityMemberService = module.get<CommunityMemberService>(
      CommunityMemberService,
    );
  });

  describe('RF-41: Asignación y gestión de miembros de la comunidad', () => {
    it('asocia profesores o estudiantes y confirma la asignación', async () => {
      queryRunner.manager.findOne.mockResolvedValue(community);
      queryRunner.manager.find
        .mockResolvedValueOnce([teacher])
        .mockResolvedValueOnce([]);
      queryRunner.manager.save.mockResolvedValue([activeMembership]);

      const result = await communityMemberService.create({
        communityId: ids.community,
        communityRole: CommunityMemberType.TEACHER,
        userIds: [ids.teacher],
      });

      expect(result).toEqual([activeMembership]);
      expect(queryRunner.manager.create).toHaveBeenCalledWith(
        CommunityMember,
        expect.objectContaining({
          communityRole: CommunityRole.TEACHER,
          community,
          user: { id: ids.teacher },
        }),
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('rechaza un único usuario que ya pertenece a una comunidad', async () => {
      queryRunner.manager.findOne.mockResolvedValue(community);
      queryRunner.manager.find
        .mockResolvedValueOnce([{ ...teacher, isDeleted: false }])
        .mockResolvedValueOnce([activeMembership]);

      await expect(
        communityMemberService.create({
          communityId: ids.community,
          communityRole: CommunityMemberType.TEACHER,
          userIds: [ids.teacher],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('excluye solo los usuarios ya asignados y agrega los restantes', async () => {
      const newTeacher = {
        id: '55555555-5555-4555-8555-555555555555',
        isDeleted: false,
        role: { name: 'teacher' },
      };
      const savedMember = {
        communityRole: CommunityRole.TEACHER,
        community,
        user: { id: newTeacher.id },
      };
      queryRunner.manager.findOne.mockResolvedValue(community);
      queryRunner.manager.find
        .mockResolvedValueOnce([teacher, newTeacher])
        .mockResolvedValueOnce([activeMembership]);
      queryRunner.manager.save.mockResolvedValue([savedMember]);

      const result = await communityMemberService.create({
        communityId: ids.community,
        communityRole: CommunityMemberType.TEACHER,
        userIds: [ids.teacher, newTeacher.id],
      });

      expect(result).toEqual([savedMember]);
      expect(queryRunner.manager.create).toHaveBeenCalledTimes(1);
      expect(queryRunner.manager.create).toHaveBeenCalledWith(
        CommunityMember,
        expect.objectContaining({ user: { id: newTeacher.id } }),
      );
      expect(queryRunner.manager.save).toHaveBeenCalledWith(
        CommunityMember,
        expect.any(Array),
      );
    });
  });

  describe('RF-42: Restricción y validación de membresía para creación de contenidos', () => {
    it('permite a un docente activo operar dentro del ámbito de su comunidad', async () => {
      communityMemberRepository.findOne.mockResolvedValue(activeMembership);
      communityRepository.findOne.mockResolvedValue(community);

      const membership = await communityMemberService.assertMember(
        ids.community,
        ids.teacher,
      );
      const contentScope = await communityService.getOneCommunity(
        ids.community,
      );

      expect(membership.community.id).toBe(ids.community);
      expect(contentScope.id).toBe(ids.community);
    });

    it('bloquea la creación cuando el docente no tiene membresía activa', async () => {
      communityMemberRepository.findOne.mockResolvedValue(null);

      await expect(
        communityMemberService.assertMember(ids.community, ids.teacher),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(communityRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('RF-43: Colaboración docente y privacidad departamental de contenidos', () => {
    it('permite consultar la estructura compartida de la comunidad del docente', async () => {
      communityRepository.findOne.mockResolvedValue(community);
      communityMemberRepository.findOne.mockResolvedValue(activeMembership);

      const membership = await communityMemberService.assertMember(
        ids.community,
        ids.teacher,
      );
      const result = await communityService.getOneCommunity(
        membership.community.id,
      );

      expect(result).toEqual(community);
      expect(communityRepository.findOne).toHaveBeenCalledWith({
        where: { id: ids.community },
      });
    });

    it('deniega la lectura de contenidos de una comunidad no vinculada', async () => {
      communityMemberRepository.findOne.mockResolvedValue(null);

      await expect(
        communityMemberService.assertMember(
          '55555555-5555-4555-8555-555555555555',
          ids.teacher,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(communityRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('RF-44: Acceso exclusivo a sesiones en vivo y recursos formativos', () => {
    it('habilita la agenda para un estudiante con afiliación activa', async () => {
      const studentMembership = {
        ...activeMembership,
        user: { id: ids.student, isDeleted: false },
        communityRole: CommunityRole.STUDENT,
      };
      communityMemberRepository.findOne.mockResolvedValue(studentMembership);
      communityRepository.findOne.mockResolvedValue({
        ...community,
        liveClasses: [
          { id: 'live-1', transmitionLink: 'https://live.example' },
        ],
      });

      await expect(
        communityMemberService.assertMember(ids.community, ids.student),
      ).resolves.toEqual(studentMembership);
      await expect(
        communityService.getOneCommunity(ids.community),
      ).resolves.toMatchObject({
        liveClasses: expect.any(Array),
      });
    });

    it('rechaza la agenda cuando la afiliación del estudiante no existe', async () => {
      communityMemberRepository.findOne.mockResolvedValue(null);

      await expect(
        communityMemberService.assertMember(ids.community, ids.student),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(communityRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
