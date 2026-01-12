import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) {}

  async create(createLessonDto: CreateLessonDto, id: string): Promise<Lesson> {
    const lesson = this.lessonRepository.create({
      id: id,
      title: createLessonDto.title,
      description: createLessonDto.description,
      urlContent: createLessonDto.urlContent,
      duration: createLessonDto.duration,
      type: createLessonDto.type,
      module: { id: createLessonDto.moduleId },
    });

    return await this.lessonRepository.save(lesson);
  }

  async findAll(): Promise<Lesson[]> {
    return await this.lessonRepository.find({
      relations: ['module', 'userProgress'],
    });
  }

  async findOne(id: string): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['module', 'userProgress'],
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    return lesson;
  }

  async update(id: string, updateLessonDto: UpdateLessonDto): Promise<Lesson> {
    const lesson = await this.findOne(id);

    if (updateLessonDto.moduleId) {
      lesson.module = { id: updateLessonDto.moduleId } as any;
    }

    Object.assign(lesson, updateLessonDto);
    return await this.lessonRepository.save(lesson);
  }

  async remove(id: string): Promise<void> {
    const lesson = await this.findOne(id);
    await this.lessonRepository.remove(lesson);
  }

  async findByModule(moduleId: string): Promise<Lesson[]> {
    return await this.lessonRepository.find({
      where: { module: { id: moduleId } },
      relations: ['module'],
    });
  }

  async findByType(type: string): Promise<Lesson[]> {
    return await this.lessonRepository.find({
      where: { type },
      relations: ['module', 'userProgress'],
    });
  }
}