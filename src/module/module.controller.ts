import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ModuleService } from './module.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('modules')
@Controller('modules')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Post()
  @ApiOperation({ summary: 'Create module' })
  @ApiResponse({ status: 201, description: 'The module has been successfully created.' })
  create(@Body() createModuleDto: CreateModuleDto) {
    return this.moduleService.create(createModuleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all modules' })
  findAll() {
    return this.moduleService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get module by id' })
  findOne(@Param('id') id: string) {
    return this.moduleService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update module' })
  update(@Param('id') id: string, @Body() updateModuleDto: UpdateModuleDto) {
    return this.moduleService.update(id, updateModuleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete module' })
  remove(@Param('id') id: string) {
    return this.moduleService.remove(id);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get modules by course' })
  findByCourse(@Param('courseId') courseId: string) {
    return this.moduleService.findByCourse(courseId);
  }

  @Get('community/:communityId')
  @ApiOperation({ summary: 'Get modules by community' })
  findByCommunity(@Param('communityId') communityId: string) {
    return this.moduleService.findByCommunity(communityId);
  }
}