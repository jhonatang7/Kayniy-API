import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { ReviewQuizDto } from './dto/review-quiz.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('quizzes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  @ApiOperation({ summary: 'Create quiz' })
  @ApiResponse({ status: 201, description: 'The quiz has been successfully created.' })
  create(@Body() createQuizDto: CreateQuizDto) {
    return this.quizService.create(createQuizDto);
  }

  @Post('review')
  @ApiOperation({ summary: 'Review and save a quiz attempt' })
  review(@Body() reviewQuizDto: ReviewQuizDto) {
    return this.quizService.review(reviewQuizDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all quizzes' })
  findAll() {
    return this.quizService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quiz by id' })
  findOne(@Param('id') id: string) {
    return this.quizService.findOne(id);
  }

  @Get(':id/content')
  @ApiOperation({ summary: 'Get Content of quiz by id' })
  getContentQuiz(@Param('id') id: string) {
    return this.quizService.getContentQuiz(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update quiz' })
  update(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.quizService.update(id, updateQuizDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete quiz' })
  remove(@Param('id') id: string) {
    return this.quizService.remove(id);
  }

  @Get('find-by-module/:moduleId')
  @ApiOperation({ summary: 'Get quiz by module' })
  findByModule(@Param('moduleId') moduleId: string) {
    return this.quizService.findByModule(moduleId);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get quiz statistics' })
  getQuizStatistics(@Param('id') id: string) {
    return this.quizService.getQuizStatistics(id);
  }
}