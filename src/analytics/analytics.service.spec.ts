import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityMember } from '../community-member/entities/community-member.entity';
import { Community } from '../community/entities/community.entity';
import { CourseEnrollment } from '../course_enrollment/entities/course-enrollment.entity';
import { Course } from '../course/entities/course.entity';
import { UserModuleProgress } from '../user-module-progress/entities/user-module-progress.entity';
import { UserProgress } from '../user-progress/entities/user-progress.entity';
import { UserQuizAttempt } from '../user-quiz-attempt/entities/user-quiz-attempt.entity';
import { AnalyticsService } from './analytics.service';

type QueryBuilderMock = {
  innerJoin: jest.Mock;
  leftJoin: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  groupBy: jest.Mock;
  addGroupBy: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  getCount: jest.Mock;
  getRawOne: jest.Mock;
  getRawMany: jest.Mock;
};

const createQueryBuilder = (): QueryBuilderMock => {
  const builder = {
    innerJoin: jest.fn(),
    leftJoin: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    select: jest.fn(),
    addSelect: jest.fn(),
    groupBy: jest.fn(),
    addGroupBy: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    getCount: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  } as QueryBuilderMock;

  Object.values(builder).forEach(method => {
    if (method !== builder.getCount && method !== builder.getRawOne && method !== builder.getRawMany) {
      method.mockReturnValue(builder);
    }
  });
  return builder;
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let enrollmentRepository: {
    createQueryBuilder: jest.Mock;
  };
  let progressRepository: {
    createQueryBuilder: jest.Mock;
  };
  let attemptRepository: {
    createQueryBuilder: jest.Mock;
  };
  let courseRepository: {
    createQueryBuilder: jest.Mock;
    find: jest.Mock;
  };
  let communityRepository: { find: jest.Mock };
  let communityMemberRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    enrollmentRepository = { createQueryBuilder: jest.fn() };
    progressRepository = { createQueryBuilder: jest.fn() };
    attemptRepository = { createQueryBuilder: jest.fn() };
    courseRepository = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };
    communityRepository = { find: jest.fn() };
    communityMemberRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(CourseEnrollment), useValue: enrollmentRepository },
        { provide: getRepositoryToken(UserProgress), useValue: progressRepository },
        { provide: getRepositoryToken(UserQuizAttempt), useValue: attemptRepository },
        { provide: getRepositoryToken(Course), useValue: courseRepository },
        { provide: getRepositoryToken(Community), useValue: communityRepository },
        { provide: getRepositoryToken(CommunityMember), useValue: communityMemberRepository },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  describe('RF-49: Panel administrativo y analítica global de la plataforma', () => {
    it('consolida inscripciones, actividad y deserción para el panel administrativo', async () => {
      const totalQuery = createQueryBuilder();
      const activityQuery = createQueryBuilder();
      const completedQuery = createQueryBuilder();
      totalQuery.getCount.mockResolvedValue(10);
      activityQuery.getRawOne.mockResolvedValue({ count: '6' });
      completedQuery.getCount.mockResolvedValue(4);
      enrollmentRepository.createQueryBuilder
        .mockReturnValueOnce(totalQuery)
        .mockReturnValueOnce(activityQuery)
        .mockReturnValueOnce(completedQuery);

      const result = await service.getFunnel('admin', {});

      expect(result).toEqual({
        totalEnrollments: 10,
        stages: [
          { stage: 'enrolled', count: 10, rate: 100 },
          { stage: 'moduleActivity', count: 6, rate: 60 },
          { stage: 'completed', count: 4, rate: 40 },
        ],
        dropoutRate: 60,
      });
    });

    it('aplica filtros de curso, comunidad y rango de fechas a la consulta', async () => {
      const builders = [createQueryBuilder(), createQueryBuilder(), createQueryBuilder()];
      builders[0].getCount.mockResolvedValue(2);
      builders[1].getRawOne.mockResolvedValue({ count: '1' });
      builders[2].getCount.mockResolvedValue(1);
      enrollmentRepository.createQueryBuilder
        .mockReturnValueOnce(builders[0])
        .mockReturnValueOnce(builders[1])
        .mockReturnValueOnce(builders[2]);

      await service.getFunnel('superadmin', {
        courseId: '11111111-1111-4111-8111-111111111111',
        communityId: '22222222-2222-4222-8222-222222222222',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      for (const builder of builders) {
        expect(builder.andWhere).toHaveBeenCalledWith(
          'course.id = :courseId',
          expect.any(Object),
        );
        expect(builder.andWhere).toHaveBeenCalledWith(
          'community.id = :communityId',
          expect.any(Object),
        );
        expect(builder.andWhere).toHaveBeenCalledWith(
          'enrollment.enrollmentDate >= :startDate',
          { startDate: '2026-01-01' },
        );
        expect(builder.andWhere).toHaveBeenCalledWith(
          'enrollment.enrollmentDate <= :endDate',
          { endDate: '2026-01-31' },
        );
      }
    });

    it('maneja una pérdida de conexión con un error controlado en lugar de ocultarlo', async () => {
      const failedQuery = createQueryBuilder();
      failedQuery.getCount.mockRejectedValue(new Error('Analytics database unavailable'));
      enrollmentRepository.createQueryBuilder.mockReturnValue(failedQuery);

      await expect(service.getFunnel('admin', {})).rejects.toThrow(
        'Analytics database unavailable',
      );
    });
  });

  describe('RF-50: Panel de rendimiento formativo y métricas para profesores', () => {
    it('calcula cuellos de botella de evaluaciones para un curso de la comunidad docente', async () => {
      const queryBuilder = createQueryBuilder();
      queryBuilder.getRawMany.mockResolvedValue([
        {
          quizId: 'quiz-1',
          quiz: 'Evaluación final',
          averageScore: '62.5',
          failedAttempts: '3',
          totalAttempts: '5',
        },
      ]);
      attemptRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      communityMemberRepository.findOne.mockResolvedValue({
        communityRole: 'teacher',
      });

      const result = await service.getProfessorBottlenecks(
        'teacher-1',
        'teacher',
        'community-1',
        {},
      );

      expect(result).toEqual([
        {
          quizId: 'quiz-1',
          quiz: 'Evaluación final',
          averageScore: 62.5,
          failedAttempts: 3,
          totalAttempts: 5,
          failedRate: 60,
        },
      ]);
    });

    it('retorna una estructura vacía cuando el curso recién publicado no tiene métricas', async () => {
      const queryBuilder = createQueryBuilder();
      queryBuilder.getRawMany.mockResolvedValue([]);
      attemptRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      communityMemberRepository.findOne.mockResolvedValue({
        communityRole: 'teacher',
      });

      await expect(
        service.getProfessorBottlenecks(
          'teacher-1',
          'teacher',
          'community-1',
          {},
        ),
      ).resolves.toEqual([]);
      expect(communityMemberRepository.findOne).toHaveBeenCalled();
    });
  });
});
