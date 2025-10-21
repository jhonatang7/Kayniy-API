import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('questions')
@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @ApiOperation({ summary: 'Create question' })
  @ApiResponse({ status: 201, description: 'The question has been successfully created.' })
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionService.create(createQuestionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all questions' })
  findAll() {
    return this.questionService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get question by id' })
  findOne(@Param('id') id: string) {
    return this.questionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update question' })
  update(@Param('id') id: string, @Body() updateQuestionDto: UpdateQuestionDto) {
    return this.questionService.update(id, updateQuestionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete question' })
  remove(@Param('id') id: string) {
    return this.questionService.remove(id);
  }

  @Get('quiz/:quizId')
  @ApiOperation({ summary: 'Get questions by quiz' })
  findByQuiz(@Param('quizId') quizId: string) {
    return this.questionService.findByQuiz(quizId);
  }

  @Post('quiz/:quizId/reorder')
  @ApiOperation({ summary: 'Reorder questions in a quiz' })
  reorderQuestions(
    @Param('quizId') quizId: string,
    @Body() data: { questionIds: string[] },
  ) {
    return this.questionService.reorderQuestions(quizId, data.questionIds);
  }
}