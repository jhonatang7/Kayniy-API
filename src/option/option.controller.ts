import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OptionService } from './option.service';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('options')
@Controller('options')
export class OptionController {
  constructor(private readonly optionService: OptionService) {}

  @Post()
  @ApiOperation({ summary: 'Create option' })
  @ApiResponse({ status: 201, description: 'The option has been successfully created.' })
  create(@Body() createOptionDto: CreateOptionDto) {
    return this.optionService.create(createOptionDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple options' })
  createMany(@Body() createOptionDtos: CreateOptionDto[]) {
    return this.optionService.createMany(createOptionDtos);
  }

  @Get()
  @ApiOperation({ summary: 'Get all options' })
  findAll() {
    return this.optionService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get option by id' })
  findOne(@Param('id') id: string) {
    return this.optionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update option' })
  update(@Param('id') id: string, @Body() updateOptionDto: UpdateOptionDto) {
    return this.optionService.update(id, updateOptionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete option' })
  remove(@Param('id') id: string) {
    return this.optionService.remove(id);
  }

  @Get('question/:questionId')
  @ApiOperation({ summary: 'Get options by question' })
  findByQuestion(@Param('questionId') questionId: string) {
    return this.optionService.findByQuestion(questionId);
  }

  @Get('question/:questionId/correct')
  @ApiOperation({ summary: 'Get correct options for a question' })
  getCorrectOptions(@Param('questionId') questionId: string) {
    return this.optionService.getCorrectOptions(questionId);
  }
}