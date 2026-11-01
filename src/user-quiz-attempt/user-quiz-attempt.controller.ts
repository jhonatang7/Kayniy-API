import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserQuizAttemptService } from './user-quiz-attempt.service';
import { CreateUserQuizAttemptDto } from './dto/create-user-quiz-attempt.dto';
import { UpdateUserQuizAttemptDto } from './dto/update-user-quiz-attempt.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetLatestQuizAttemptDto } from './dto/get-latest-quiz-attempt.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('user-quiz-attempts')
@Controller('user-quiz-attempts')
export class UserQuizAttemptController {
  constructor(private readonly userQuizAttemptService: UserQuizAttemptService) {}

  @Post()
  @ApiOperation({ summary: 'Create quiz attempt' })
  @ApiResponse({ status: 201, description: 'The quiz attempt has been successfully created.' })
  create(@Body() createUserQuizAttemptDto: CreateUserQuizAttemptDto) {
    return this.userQuizAttemptService.create(createUserQuizAttemptDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all quiz attempts' })
  findAll() {
    return this.userQuizAttemptService.findAll();
  }

  @Get('latest')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the latest quiz attempt for an enrollment' })
  getLatest(
    @Query() query: GetLatestQuizAttemptDto,
    @Req() request: Request,
  ) {
    return this.userQuizAttemptService.getLatest(
      query.quizId,
      query.courseEnrollmentId,
      request.user['id'],
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quiz attempt by id' })
  findOne(@Param('id') id: string) {
    return this.userQuizAttemptService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update quiz attempt' })
  update(@Param('id') id: string, @Body() updateUserQuizAttemptDto: UpdateUserQuizAttemptDto) {
    return this.userQuizAttemptService.update(id, updateUserQuizAttemptDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete quiz attempt' })
  remove(@Param('id') id: string) {
    return this.userQuizAttemptService.remove(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get attempts by user' })
  findByUser(@Param('userId') userId: string) {
    return this.userQuizAttemptService.findByUser(userId);
  }

  @Get('quiz/:quizId')
  @ApiOperation({ summary: 'Get attempts by quiz' })
  findByQuiz(@Param('quizId') quizId: string) {
    return this.userQuizAttemptService.findByQuiz(quizId);
  }

  @Get('user/:userId/quiz/:quizId/statistics')
  @ApiOperation({ summary: 'Get user quiz statistics' })
  getUserQuizStatistics(
    @Param('userId') userId: string,
    @Param('quizId') quizId: string,
  ) {
    return this.userQuizAttemptService.getUserQuizStatistics(userId, quizId);
  }
}