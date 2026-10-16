import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { UpdateLessonOrderDto } from './dto/update-lesson-order.dto';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createLessonDto: CreateLessonDto, id: string): Promise<Lesson> {
    const lesson = this.lessonRepository.create({
      id: id,
      title: createLessonDto.title,
      description: createLessonDto.description,
      urlContent: createLessonDto.urlContent,
      duration: createLessonDto.duration,
      order: createLessonDto.order,
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

  async updateOrder(updateLessonOrderDto: UpdateLessonOrderDto): Promise<Lesson[]> {
    const { moduleId, lessons } = updateLessonOrderDto;
    const lessonIds = lessons.map(lesson => lesson.lessonId);
    const orderValues = lessons.map(lesson => lesson.order);

    if (new Set(lessonIds).size !== lessonIds.length) {
      throw new BadRequestException('lessonId values must not contain duplicates');
    }

    if (new Set(orderValues).size !== orderValues.length) {
      throw new BadRequestException('order values must not contain duplicates');
    }

    const expectedOrders = Array.from({ length: lessons.length }, (_, index) => index + 1);
    if (!expectedOrders.every(order => orderValues.includes(order))) {
      throw new BadRequestException('order values must be consecutive and start at 1');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const lessonsToUpdate = await queryRunner.manager.find(Lesson, {
        where: lessonIds.map(id => ({ id, module: { id: moduleId } })),
      });

      if (lessonsToUpdate.length !== lessonIds.length) {
        throw new NotFoundException('One or more lessons do not belong to the specified module');
      }

      const orderByLessonId = new Map(
        lessons.map(lesson => [lesson.lessonId, lesson.order]),
      );

      lessonsToUpdate.forEach(lesson => {
        lesson.order = orderByLessonId.get(lesson.id)!;
      });

      const updatedLessons = await queryRunner.manager.save(Lesson, lessonsToUpdate);
      await queryRunner.commitTransaction();

      return updatedLessons.sort((first, second) => first.order - second.order);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const lesson = await queryRunner.manager.findOne(Lesson, {
        where: { id },
        relations: ['module'],
      });

      if (!lesson) {
        throw new NotFoundException(`Lesson with ID ${id} not found`);
      }

      await queryRunner.manager.remove(Lesson, lesson);

      const remainingLessons = await queryRunner.manager.find(Lesson, {
        where: { module: { id: lesson.module.id } },
        order: { order: 'ASC' },
      });

      remainingLessons.forEach((remainingLesson, index) => {
        remainingLesson.order = index + 1;
      });

      if (remainingLessons.length > 0) {
        await queryRunner.manager.save(Lesson, remainingLessons);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findByModule(moduleId: string): Promise<Lesson[]> {
    return await this.lessonRepository.find({
      where: { module: { id: moduleId } },
      relations: ['module'],
      order: { order: 'ASC' },
    });
  }

  async findByType(type: string): Promise<Lesson[]> {
    return await this.lessonRepository.find({
      where: { type },
      relations: ['module', 'userProgress'],
    });
  }
}