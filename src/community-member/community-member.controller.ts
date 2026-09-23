import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CommunityMemberService } from './community-member.service';
import { CreateCommunityMemberDto } from './dto/create-community-member.dto';
import { UpdateCommunityMemberDto } from './dto/update-community-member.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('community-members')
@Controller('community-member')
export class CommunityMemberController {
  constructor(private readonly communityMemberService: CommunityMemberService) {}

  @Post()
  @ApiOperation({ summary: 'Add one or more users to a community' })
  @ApiResponse({ status: 201, description: 'Community members successfully created.' })
  @ApiResponse({ status: 409, description: 'One or more users are already members.' })
  create(@Body() createCommunityMemberDto: CreateCommunityMemberDto) {
    return this.communityMemberService.create(createCommunityMemberDto);
  }

  @Get()
  findAll() {
    return this.communityMemberService.findAll();
  }

  @Get('community/:communityId')
  @ApiOperation({ summary: 'Get community members by community id' })
  @ApiResponse({ status: 200, description: 'Community members successfully retrieved.' })
  findByCommunity(@Param('communityId') communityId: string) {
    return this.communityMemberService.findByCommunity(communityId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.communityMemberService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCommunityMemberDto: UpdateCommunityMemberDto) {
    return this.communityMemberService.update(+id, updateCommunityMemberDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a member from a community' })
  @ApiResponse({ status: 204, description: 'Community member permanently deleted.' })
  @ApiResponse({ status: 404, description: 'Community member not found.' })
  remove(@Param('id') id: string) {
    return this.communityMemberService.remove(id);
  }
}
