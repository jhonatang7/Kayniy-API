import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { LiveClassService } from './live-class.service';
import { CreateLiveClassDto } from './dto/create-live-class.dto';
import { UpdateLiveClassDto } from './dto/update-live-class.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('live-classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('live-classes')
export class LiveClassController {
  constructor(private readonly liveClassService: LiveClassService) {}

  @Post()
  @ApiOperation({ summary: 'Create live class' })
  @ApiResponse({ status: 201, description: 'The live class has been successfully created.' })
  create(@Body() createLiveClassDto: CreateLiveClassDto) {
    return this.liveClassService.create(createLiveClassDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all live classes' })
  findAll() {
    return this.liveClassService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update live class' })
  update(@Param('id') id: string, @Body() updateLiveClassDto: UpdateLiveClassDto) {
    return this.liveClassService.update(id, updateLiveClassDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete live class' })
  remove(@Param('id') id: string) {
    return this.liveClassService.remove(id);
  }

  @Get('community/:communityId')
  @ApiOperation({ summary: 'Get live classes by community' })
  findByCommunity(@Param('communityId') communityId: string) {
    return this.liveClassService.findByCommunity(communityId);
  }

  @Get('community/:communityId/mobile')
  @ApiOperation({ summary: 'Get active community live classes for mobile' })
  findByCommunityForMobile(@Param('communityId') communityId: string) {
    return this.liveClassService.findByCommunityForMobile(communityId);
  }

  @Get('professor/:professorId')
  @ApiOperation({ summary: 'Get live classes by professor' })
  findByProfessor(@Param('professorId') professorId: string) {
    return this.liveClassService.findByProfessor(professorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get live class by id' })
  findOne(@Param('id') id: string) {
    return this.liveClassService.findOne(id);
  }
}