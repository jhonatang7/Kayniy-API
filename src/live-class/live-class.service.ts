import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveClass } from './entities/live-class.entity';
import { CreateLiveClassDto } from './dto/create-live-class.dto';
import { UpdateLiveClassDto } from './dto/update-live-class.dto';

@Injectable()
export class LiveClassService {
  constructor(
    @InjectRepository(LiveClass)
    private readonly liveClassRepository: Repository<LiveClass>,
  ) {}

  async create(createLiveClassDto: CreateLiveClassDto): Promise<LiveClass> {
    if (createLiveClassDto.expiresAt <= createLiveClassDto.startedDate) {
      throw new BadRequestException(
        'The expiration date must be after the start date',
      );
    }

    const liveClass = this.liveClassRepository.create({
      title: createLiveClassDto.title,
      description: createLiveClassDto.description,
      startedDate: createLiveClassDto.startedDate,
      duration: createLiveClassDto.duration,
      expiresAt: createLiveClassDto.expiresAt,
      transmitionLink: createLiveClassDto.transmitionLink,
      isDeleted: false,
      community: { id: createLiveClassDto.communityId },
      professor: { id: createLiveClassDto.professorId },
    });

    return await this.liveClassRepository.save(liveClass);
  }

  async findAll(): Promise<LiveClass[]> {
    return await this.liveClassRepository.find({
      where: { isDeleted: false },
      relations: ['community', 'professor'],
    });
  }

  async findOne(id: string): Promise<LiveClass> {
    const liveClass = await this.liveClassRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['community', 'professor'],
    });

    if (!liveClass) {
      throw new NotFoundException(`Live class with ID ${id} not found`);
    }

    return liveClass;
  }

  async update(id: string, updateLiveClassDto: UpdateLiveClassDto): Promise<LiveClass> {
    const liveClass = await this.findOne(id);

    if (updateLiveClassDto.communityId) {
      liveClass.community = { id: updateLiveClassDto.communityId } as any;
    }

    if (updateLiveClassDto.professorId) {
      liveClass.professor = { id: updateLiveClassDto.professorId } as any;
    }

    Object.assign(liveClass, {
      ...updateLiveClassDto,
      community: liveClass.community,
      professor: liveClass.professor,
    });

    return await this.liveClassRepository.save(liveClass);
  }

  async remove(id: string): Promise<void> {
    const liveClass = await this.findOne(id);
    liveClass.isDeleted = true;
    await this.liveClassRepository.save(liveClass);
  }

  async findByCommunity(communityId: string): Promise<LiveClass[]> {
    return await this.liveClassRepository.find({
      where: { community: { id: communityId }, isDeleted: false },
      relations: ['community', 'professor'],
    });
  }

  async findByCommunityForMobile(communityId: string) {
    const now = new Date();
    const liveClasses = await this.liveClassRepository
      .createQueryBuilder('liveClass')
      .innerJoin('liveClass.community', 'community')
      .where('community.id = :communityId', { communityId })
      .andWhere('community.deletedAt IS NULL')
      .andWhere('liveClass.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('liveClass.expiresAt > :now', { now })
      .orderBy('liveClass.startedDate', 'ASC')
      .getMany();

    return liveClasses.map(liveClass => ({
      id: liveClass.id,
      title: liveClass.title,
      description: liveClass.description,
      duration: this.formatDuration(liveClass.duration),
      timeLife: this.formatTimeLife(liveClass.startedDate, liveClass.expiresAt),
      status: now >= liveClass.startedDate ? 'IN_LIVE' : 'SOON',
      transmitionLink: liveClass.transmitionLink,
    }));
  }

  async findOneForMobile(id: string) {
    const liveClass = await this.liveClassRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['community', 'professor'],
    });

    if (!liveClass || liveClass.expiresAt <= new Date()) {
      throw new NotFoundException(`Live class with ID ${id} is not available`);
    }

    return {
      id: liveClass.id,
      title: liveClass.title,
      description: liveClass.description,
      duration: this.formatDuration(liveClass.duration),
      timeLife: this.formatTimeLife(liveClass.startedDate, liveClass.expiresAt),
      status: new Date() >= liveClass.startedDate ? 'IN_LIVE' : 'SOON',
      transmitionLink: liveClass.transmitionLink,
    };
  }

  async findByProfessor(professorId: string): Promise<LiveClass[]> {
    return await this.liveClassRepository.find({
      where: { professor: { id: professorId }, isDeleted: false },
      relations: ['community', 'professor'],
    });
  }

  private formatDuration(durationInMinutes: number): string {
    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;
    const parts: string[] = [];

    if (hours > 0) {
      parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
    }

    if (minutes > 0) {
      parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
    }

    return parts.join(' ') || '0 minutos';
  }

  private formatTimeLife(startedDate: Date, expiresAt: Date): string {
    const start = this.formatDateTime(startedDate);
    const end = this.formatDateTime(expiresAt);
    const sameDay = startedDate.toDateString() === expiresAt.toDateString();

    return sameDay
      ? `${start.date} a las ${start.time} hasta las ${end.time}`
      : `${start.date} a las ${start.time} hasta el ${end.date} a las ${end.time}`;
  }

  private formatDateTime(date: Date): { date: string; time: string } {
    const dateParts = new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
    }).formatToParts(date);
    const day = dateParts.find(part => part.type === 'day')?.value ?? '';
    const month = dateParts.find(part => part.type === 'month')?.value ?? '';
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    const timeParts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(date);
    const hour = timeParts.find(part => part.type === 'hour')?.value ?? '';
    const minute = timeParts.find(part => part.type === 'minute')?.value ?? '';
    const period = timeParts.find(part => part.type === 'dayPeriod')?.value ?? '';
    const time = `${hour}${minute === '00' ? '' : `:${minute}`}${period}`;

    return {
      date: `${day} de ${capitalizedMonth}`,
      time,
    };
  }
}