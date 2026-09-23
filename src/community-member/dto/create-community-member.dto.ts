import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsUUID, ArrayMinSize } from 'class-validator';

export enum CommunityMemberType {
	TEACHER = 'TEACHER',
	STUDENT = 'STUDENT',
}

export class CreateCommunityMemberDto {
	@ApiProperty({ enum: CommunityMemberType, description: 'Type of community member' })
	@IsEnum(CommunityMemberType)
	communityRole: CommunityMemberType;

	@ApiProperty({ description: 'Community ID' })
	@IsNotEmpty()
	@IsUUID()
	communityId: string;

	@ApiProperty({ description: 'User IDs to add to the community', type: [String] })
	@IsArray()
	@ArrayMinSize(1)
	@IsUUID('4', { each: true })
	userIds: string[];
}
