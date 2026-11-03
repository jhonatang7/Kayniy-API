import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ADMIN_ANALYTICS_EXAMPLE,
  PROFESSOR_ACTIVITY_EXAMPLE,
  PROFESSOR_BOTTLENECKS_EXAMPLE,
  PROFESSOR_STUDENT_RISK_EXAMPLE,
} from './analytics.examples';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('admin/funnel')
  @ApiOperation({ summary: 'Embudo global de conversión' })
  @ApiResponse({ status: 200, schema: { example: ADMIN_ANALYTICS_EXAMPLE.funnel } })
  getFunnel(@Req() request: Request, @Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getFunnel(request.user['role']?.name, query);
  }

  @Get('admin/cohorts')
  @ApiOperation({ summary: 'Análisis global de cohortes' })
  @ApiResponse({ status: 200, schema: { example: ADMIN_ANALYTICS_EXAMPLE.cohorts } })
  getCohorts(@Req() request: Request, @Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getCohorts(request.user['role']?.name, query);
  }

  @Get('admin/treemap')
  @ApiOperation({ summary: 'Distribución global de inscripciones' })
  @ApiResponse({ status: 200, schema: { example: ADMIN_ANALYTICS_EXAMPLE.enrollmentTreemap } })
  getTreemap(@Req() request: Request, @Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTreemap(request.user['role']?.name, query);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Obtener todos los cursos para analítica' })
  @ApiResponse({ status: 200, description: 'Lista de cursos sin relaciones adicionales.' })
  getCourses(@Req() request: Request) {
    return this.analyticsService.getCourses(request.user['role']?.name);
  }

  @Get('communities')
  @ApiOperation({ summary: 'Obtener todas las comunidades para analítica' })
  @ApiResponse({ status: 200, description: 'Lista de comunidades sin relaciones adicionales.' })
  getCommunities(@Req() request: Request) {
    return this.analyticsService.getCommunities(request.user['role']?.name);
  }

  @Get('professor/:communityId/bottlenecks')
  @ApiOperation({ summary: 'Cuellos de botella de quizzes por comunidad' })
  @ApiResponse({ status: 200, schema: { example: PROFESSOR_BOTTLENECKS_EXAMPLE } })
  getProfessorBottlenecks(
    @Param('communityId') communityId: string,
    @Req() request: Request,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getProfessorBottlenecks(
      request.user['id'],
      request.user['role']?.name,
      communityId,
      query,
    );
  }

  @Get('professor/:communityId/student-risk')
  @ApiOperation({ summary: 'Estudiantes en riesgo por comunidad' })
  @ApiResponse({ status: 200, schema: { example: PROFESSOR_STUDENT_RISK_EXAMPLE } })
  getProfessorStudentRisk(
    @Param('communityId') communityId: string,
    @Req() request: Request,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getProfessorStudentRisk(
      request.user['id'],
      request.user['role']?.name,
      communityId,
      query,
    );
  }

  @Get('professor/:communityId/activity')
  @ApiOperation({ summary: 'Frecuencia de conexión por comunidad' })
  @ApiResponse({ status: 200, schema: { example: PROFESSOR_ACTIVITY_EXAMPLE } })
  getProfessorActivity(
    @Param('communityId') communityId: string,
    @Req() request: Request,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getProfessorActivity(
      request.user['id'],
      request.user['role']?.name,
      communityId,
      query,
    );
  }

  @Get('professor/:communityId/courses')
  @ApiOperation({ summary: 'Cursos disponibles de una comunidad para analítica' })
  getCoursesByCommunity(
    @Param('communityId') communityId: string,
    @Req() request: Request,
  ) {
    return this.analyticsService.getCoursesByCommunity(
      request.user['id'],
      request.user['role']?.name,
      communityId,
    );
  }
}
