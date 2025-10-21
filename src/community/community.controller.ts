import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('communities')
@Controller('communities')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Post()
  @ApiOperation({ summary: 'Create community' })
  @ApiResponse({ status: 201, description: 'The community has been successfully created.' })
  create(@Body() createCommunityDto: CreateCommunityDto) {
    return this.communityService.create(createCommunityDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all communities' })
  findAll() {
    return this.communityService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get community by id' })
  findOne(@Param('id') id: string) {
    return this.communityService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update community' })
  update(@Param('id') id: string, @Body() updateCommunityDto: UpdateCommunityDto) {
    return this.communityService.update(id, updateCommunityDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete community' })
  remove(@Param('id') id: string) {
    return this.communityService.remove(id);
  }

  @Post(':id/professors/:professorId')
  @ApiOperation({ summary: 'Add professor to community' })
  addProfessor(@Param('id') id: string, @Param('professorId') professorId: string) {
    return this.communityService.addProfessor(id, professorId);
  }

  @Post(':id/students/:studentId')
  @ApiOperation({ summary: 'Add student to community' })
  addStudent(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.communityService.addStudent(id, studentId);
  }
}