import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserAnswerService } from './user-answer.service';
import { CreateUserAnswerDto } from './dto/create-user-answer.dto';
import { UpdateUserAnswerDto } from './dto/update-user-answer.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('user-answers')
@Controller('user-answers')
export class UserAnswerController {
  constructor(private readonly userAnswerService: UserAnswerService) {}

  @Post()
  @ApiOperation({ summary: 'Create user answer' })
  @ApiResponse({ status: 201, description: 'The user answer has been successfully created.' })
  create(@Body() createUserAnswerDto: CreateUserAnswerDto) {
    return this.userAnswerService.create(createUserAnswerDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple user answers' })
  createMany(@Body() createUserAnswerDtos: CreateUserAnswerDto[]) {
    return this.userAnswerService.createMany(createUserAnswerDtos);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user answers' })
  findAll() {
    return this.userAnswerService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user answer by id' })
  findOne(@Param('id') id: string) {
    return this.userAnswerService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user answer' })
  update(@Param('id') id: string, @Body() updateUserAnswerDto: UpdateUserAnswerDto) {
    return this.userAnswerService.update(id, updateUserAnswerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user answer' })
  remove(@Param('id') id: string) {
    return this.userAnswerService.remove(id);
  }

  @Get('attempt/:attemptId')
  @ApiOperation({ summary: 'Get answers by attempt' })
  findByAttempt(@Param('attemptId') attemptId: string) {
    return this.userAnswerService.findByAttempt(attemptId);
  }

  @Get('attempt/:attemptId/score')
  @ApiOperation({ summary: 'Calculate score for an attempt' })
  calculateScore(@Param('attemptId') attemptId: string) {
    return this.userAnswerService.calculateScore(attemptId);
  }
}