import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityMember, CommunityRole } from '../community-member/entities/community-member.entity';
import { CourseEnrollment } from '../course_enrollment/entities/course-enrollment.entity';
import { Course } from '../course/entities/course.entity';
import { Community } from '../community/entities/community.entity';
import { UserModuleProgress } from '../user-module-progress/entities/user-module-progress.entity';
import { UserProgress } from '../user-progress/entities/user-progress.entity';
import { UserQuizAttempt } from '../user-quiz-attempt/entities/user-quiz-attempt.entity';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import {
  CohortAnalytics,
  FunnelAnalytics,
  FunnelMetric,
  ProfessorActivityAnalytics,
  ProfessorBottlenecksAnalytics,
  ProfessorStudentRiskAnalytics,
  TreemapAnalytics,
} from './analytics.types';

const numberValue = (value: string | number | null): number =>
  value === null || value === undefined ? 0 : Number(value);

const percentage = (value: number, total: number): number =>
  total === 0 ? 0 : Number(((value / total) * 100).toFixed(2));

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
    @InjectRepository(UserProgress)
    private readonly progressRepository: Repository<UserProgress>,
    @InjectRepository(UserQuizAttempt)
    private readonly attemptRepository: Repository<UserQuizAttempt>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,
    @InjectRepository(CommunityMember)
    private readonly communityMemberRepository: Repository<CommunityMember>,
  ) {}

  private assertAdmin(roleName: string) {
    const role = roleName?.toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      throw new ForbiddenException('Solo un administrador puede consultar esta analítica');
    }
  }

  private applyEnrollmentFilters(
    queryBuilder: ReturnType<Repository<CourseEnrollment>['createQueryBuilder']>,
    query: AnalyticsQueryDto,
  ) {
    if (query.courseId) {
      queryBuilder.andWhere('course.id = :courseId', {
        courseId: query.courseId,
      });
    }
    if (query.communityId) {
      queryBuilder.andWhere('community.id = :communityId', {
        communityId: query.communityId,
      });
    }
    if (query.startDate) {
      queryBuilder.andWhere('enrollment.enrollmentDate >= :startDate', {
        startDate: query.startDate,
      });
    }
    if (query.endDate) {
      queryBuilder.andWhere('enrollment.enrollmentDate <= :endDate', {
        endDate: query.endDate,
      });
    }
  }

  async getFunnel(
    roleName: string,
    query: AnalyticsQueryDto,
  ): Promise<FunnelAnalytics> {
    this.assertAdmin(roleName);

    const totalQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.course', 'course')
      .leftJoin('course.community', 'community');
    this.applyEnrollmentFilters(totalQuery, query);

    const activityQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.course', 'course')
      .leftJoin('course.community', 'community')
      .innerJoin(
        UserModuleProgress,
        'moduleProgress',
        'moduleProgress.courseEnrollmentId = enrollment.id',
      )
      .select('COUNT(DISTINCT enrollment.id)', 'count');
    this.applyEnrollmentFilters(activityQuery, query);

    const completedQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.course', 'course')
      .leftJoin('course.community', 'community')
      .where('enrollment.isCompleted = :isCompleted', {
        isCompleted: true,
      });
    this.applyEnrollmentFilters(completedQuery, query);

    const [total, withActivity, completed] = await Promise.all([
      totalQuery.getCount(),
      activityQuery.getRawOne<{ count: string }>(),
      completedQuery.getCount(),
    ]);

    const totalEnrollments = numberValue(total);
    const activeEnrollments = numberValue(withActivity?.count);
    const completedEnrollments = numberValue(completed);
    const stages: FunnelMetric[] = [
      { stage: 'enrolled', count: totalEnrollments, rate: 100 },
      {
        stage: 'moduleActivity',
        count: activeEnrollments,
        rate: percentage(activeEnrollments, totalEnrollments),
      },
      {
        stage: 'completed',
        count: completedEnrollments,
        rate: percentage(completedEnrollments, totalEnrollments),
      },
    ];

    return {
      totalEnrollments,
      stages,
      dropoutRate: Number(
        (100 - percentage(completedEnrollments, totalEnrollments)).toFixed(2),
      ),
    };
  }

  async getCohorts(
    roleName: string,
    query: AnalyticsQueryDto,
  ): Promise<CohortAnalytics> {
    this.assertAdmin(roleName);

    const cohortsQuery = this.progressRepository
        .createQueryBuilder('progress')
        .innerJoin('progress.user', 'user')
        .innerJoin('progress.courseEnrollment', 'enrollment')
        .innerJoin('enrollment.course', 'course')
        .leftJoin('course.community', 'community')
        .where('progress.isCompleted = :isCompleted', { isCompleted: true })
        .andWhere('progress.completedDate IS NOT NULL')
        .select(`TO_CHAR(DATE_TRUNC('month', "user"."registerDate"), 'YYYY-MM')`, 'registrationMonth')
        .addSelect(`TO_CHAR(DATE_TRUNC('month', progress.completed_date), 'YYYY-MM')`, 'completionMonth')
        .addSelect('COUNT(progress.id)', 'completedLessons')
        .groupBy(`DATE_TRUNC('month', "user"."registerDate")`)
        .addGroupBy(`DATE_TRUNC('month', progress.completed_date)`)
        .orderBy(`DATE_TRUNC('month', "user"."registerDate")`, 'ASC')
        .addOrderBy(`DATE_TRUNC('month', progress.completed_date)`, 'ASC')
    if (query.courseId) {
      cohortsQuery.andWhere('course.id = :courseId', { courseId: query.courseId });
    }
    if (query.communityId) {
      cohortsQuery.andWhere('community.id = :communityId', {
        communityId: query.communityId,
      });
    }
    if (query.startDate) {
      cohortsQuery.andWhere('progress.completed_date >= :startDate', {
        startDate: query.startDate,
      });
    }
    if (query.endDate) {
      cohortsQuery.andWhere('progress.completed_date <= :endDate', {
        endDate: query.endDate,
      });
    }

    const cohorts = await cohortsQuery.getRawMany();
    return cohorts.map(cohort => ({
      registrationMonth: cohort.registrationMonth,
      completionMonth: cohort.completionMonth,
      completedLessons: numberValue(cohort.completedLessons),
    }));
  }

  async getTreemap(
    roleName: string,
    query: AnalyticsQueryDto,
  ): Promise<TreemapAnalytics> {
    this.assertAdmin(roleName);

    const treemapQuery = this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .innerJoin('enrollment.course', 'course')
        .leftJoin('course.community', 'community')
        .select('community.id', 'communityId')
        .addSelect('community.name', 'community')
        .addSelect('course.name', 'course')
        .addSelect('course.level', 'level')
        .addSelect('COUNT(enrollment.id)', 'enrollments')
        .groupBy('community.id')
        .addGroupBy('community.name')
        .addGroupBy('course.name')
        .addGroupBy('course.level')
        .orderBy('COUNT(enrollment.id)', 'DESC');
    this.applyEnrollmentFilters(treemapQuery, query);

    const treemap = await treemapQuery.getRawMany();
    return treemap.map(item => ({
      communityId: item.communityId,
      community: item.community ?? 'Sin comunidad',
      course: item.course,
      level: item.level,
      enrollments: numberValue(item.enrollments),
    }));
  }

  async getCourses(roleName: string): Promise<Course[]> {
    this.assertAdmin(roleName);
    return this.courseRepository.find();
  }

  async getCommunities(roleName: string): Promise<Community[]> {
    this.assertAdmin(roleName);
    return this.communityRepository.find();
  }

  private async assertCommunityAccess(
    userId: string,
    roleName: string,
    communityId: string,
  ) {
    const role = roleName?.toLowerCase();
    if (role === 'admin' || role === 'superadmin') {
      return;
    }
    if (role !== 'teacher') {
      throw new ForbiddenException('Solo docentes y administradores pueden consultar esta analítica');
    }
    const membership = await this.communityMemberRepository.findOne({
      where: {
        user: { id: userId },
        community: { id: communityId },
        communityRole: CommunityRole.TEACHER,
      },
    });
    if (!membership) {
      throw new ForbiddenException('El docente no pertenece a esta comunidad');
    }
  }

  private async getCommunityCourseIds(communityId: string, courseId?: string) {
    const courseIds = await this.courseRepository
      .createQueryBuilder('course')
      .innerJoin('course.community', 'community')
      .where('community.id = :communityId', { communityId })
      .andWhere(courseId ? 'course.id = :courseId' : '1 = 1', { courseId })
      .select('course.id', 'courseId')
      .getRawMany<{ courseId: string }>();
    if (courseIds.length === 0) {
      throw new NotFoundException('No hay cursos en esta comunidad');
    }
    return courseIds.map(course => course.courseId);
  }

  async getProfessorBottlenecks(
    userId: string,
    roleName: string,
    communityId: string,
    query: AnalyticsQueryDto,
  ): Promise<ProfessorBottlenecksAnalytics> {
    await this.assertCommunityAccess(userId, roleName, communityId);
    const queryBuilder = this.attemptRepository
      .createQueryBuilder('attempt')
      .innerJoin('attempt.quiz', 'quiz')
      .innerJoin('attempt.courseEnrollment', 'enrollment')
      .innerJoin('enrollment.course', 'course')
      .innerJoin('course.community', 'community')
      .where('community.id = :communityId', { communityId })
        .select('quiz.id', 'quizId')
        .addSelect('quiz.name', 'quiz')
        .addSelect('AVG(attempt.scoreGotten)', 'averageScore')
        .addSelect('COUNT(attempt.id)', 'totalAttempts')
        .addSelect('COUNT(attempt.id) FILTER (WHERE attempt.aprobed = false)', 'failedAttempts')
        .groupBy('quiz.id')
        .addGroupBy('quiz.name')
        .orderBy('AVG(attempt.scoreGotten)', 'ASC');
    if (query.courseId) queryBuilder.andWhere('course.id = :courseId', { courseId: query.courseId });
    if (query.startDate) queryBuilder.andWhere('attempt.attemptDate >= :startDate', { startDate: query.startDate });
    if (query.endDate) queryBuilder.andWhere('attempt.attemptDate <= :endDate', { endDate: query.endDate });
    const bottlenecks = await queryBuilder.getRawMany();
    return bottlenecks.map(item => {
      const totalAttempts = numberValue(item.totalAttempts);
      const failedAttempts = numberValue(item.failedAttempts);
      return {
        quizId: item.quizId,
        quiz: item.quiz,
        averageScore: Number(numberValue(item.averageScore).toFixed(2)),
        failedAttempts,
        totalAttempts,
        failedRate: percentage(failedAttempts, totalAttempts),
      };
    });
  }

  async getProfessorStudentRisk(
    userId: string,
    roleName: string,
    communityId: string,
    query: AnalyticsQueryDto,
  ): Promise<ProfessorStudentRiskAnalytics> {
    await this.assertCommunityAccess(userId, roleName, communityId);
    const ids = await this.getCommunityCourseIds(communityId, query.courseId);
    return this.getStudentRisk(ids, communityId, query);
  }

  async getProfessorActivity(
    userId: string,
    roleName: string,
    communityId: string,
    query: AnalyticsQueryDto,
  ): Promise<ProfessorActivityAnalytics> {
    await this.assertCommunityAccess(userId, roleName, communityId);
    const queryBuilder = this.progressRepository
        .createQueryBuilder('progress')
        .innerJoin('progress.courseEnrollment', 'enrollment')
        .innerJoin('enrollment.course', 'course')
        .innerJoin('course.community', 'community')
        .where('community.id = :communityId', { communityId })
        .andWhere('progress.isCompleted = :isCompleted', { isCompleted: true })
        .andWhere('progress.completedDate IS NOT NULL')
        .select('EXTRACT(ISODOW FROM progress.completed_date)', 'weekday')
        .addSelect('EXTRACT(HOUR FROM progress.completed_date)', 'hour')
        .addSelect('COUNT(progress.id)', 'completedLessons')
        .groupBy('EXTRACT(ISODOW FROM progress.completed_date)')
        .addGroupBy('EXTRACT(HOUR FROM progress.completed_date)')
        .orderBy('EXTRACT(ISODOW FROM progress.completed_date)', 'ASC')
        .addOrderBy('EXTRACT(HOUR FROM progress.completed_date)', 'ASC');
    if (query.courseId) queryBuilder.andWhere('course.id = :courseId', { courseId: query.courseId });
    if (query.startDate) queryBuilder.andWhere('progress.completed_date >= :startDate', { startDate: query.startDate });
    if (query.endDate) queryBuilder.andWhere('progress.completed_date <= :endDate', { endDate: query.endDate });
    const activity = await queryBuilder.getRawMany();
    return activity.map(item => ({
        weekday: numberValue(item.weekday),
        hour: numberValue(item.hour),
        completedLessons: numberValue(item.completedLessons),
      }));
  }

  async getCoursesByCommunity(
    userId: string,
    roleName: string,
    communityId: string,
  ): Promise<Course[]> {
    await this.assertCommunityAccess(userId, roleName, communityId);
    return this.courseRepository.find({
      where: { community: { id: communityId }, isDeleted: false },
    });
  }

  private async getStudentRisk(
    courseIds: string[],
    communityId: string,
    query: AnalyticsQueryDto,
  ) {
    const rows = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.user', 'user')
      .innerJoin('enrollment.course', 'course')
      .innerJoin('course.community', 'community')
      .leftJoin(UserProgress, 'progress', 'progress.courseEnrollmentId = enrollment.id AND progress.isCompleted = true')
      .leftJoin(UserQuizAttempt, 'attempt', 'attempt.courseEnrollmentId = enrollment.id')
      .leftJoin('course.courseModules', 'courseModule')
      .leftJoin('courseModule.module', 'module')
      .leftJoin('module.lessons', 'lesson')
      .select('user.id', 'studentId')
      .addSelect(`CONCAT(user.firstName, ' ', user.lastName)`, 'student')
      .addSelect('COUNT(DISTINCT progress.id)', 'completedLessons')
      .addSelect('COUNT(DISTINCT lesson.id)', 'totalLessons')
      .addSelect('AVG(attempt.scoreGotten)', 'averageScore')
      .where('community.id = :communityId', { communityId })
      .andWhere('course.id IN (:...courseIds)', { courseIds })
      .andWhere(query.startDate ? 'enrollment.enrollmentDate >= :startDate' : '1 = 1', { startDate: query.startDate })
      .andWhere(query.endDate ? 'enrollment.enrollmentDate <= :endDate' : '1 = 1', { endDate: query.endDate })
      .groupBy('user.id')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .getRawMany();

    return rows.map(row => ({
      studentId: row.studentId,
      student: row.student,
      courseProgress: percentage(numberValue(row.completedLessons), numberValue(row.totalLessons)),
      averageScore: Number(numberValue(row.averageScore).toFixed(2)),
    }));
  }
}
