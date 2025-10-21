import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Option } from './entities/option.entity';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';

@Injectable()
export class OptionService {
  constructor(
    @InjectRepository(Option)
    private readonly optionRepository: Repository<Option>,
  ) {}

  async create(createOptionDto: CreateOptionDto): Promise<Option> {
    const option = this.optionRepository.create({
      ...createOptionDto,
      question: { id: createOptionDto.questionId },
    });

    return await this.optionRepository.save(option);
  }

  async createMany(options: CreateOptionDto[]): Promise<Option[]> {
    const optionEntities = options.map(dto =>
      this.optionRepository.create({
        ...dto,
        question: { id: dto.questionId },
      }),
    );

    return await this.optionRepository.save(optionEntities);
  }

  async findAll(): Promise<Option[]> {
    return await this.optionRepository.find({
      relations: ['question', 'userAnswers'],
    });
  }

  async findOne(id: string): Promise<Option> {
    const option = await this.optionRepository.findOne({
      where: { id },
      relations: ['question', 'userAnswers'],
    });

    if (!option) {
      throw new NotFoundException(`Option with ID ${id} not found`);
    }

    return option;
  }

  async update(id: string, updateOptionDto: UpdateOptionDto): Promise<Option> {
    const option = await this.findOne(id);

    if (updateOptionDto.questionId) {
      option.question = { id: updateOptionDto.questionId } as any;
    }

    Object.assign(option, updateOptionDto);
    return await this.optionRepository.save(option);
  }

  async remove(id: string): Promise<void> {
    const option = await this.findOne(id);
    await this.optionRepository.remove(option);
  }

  async findByQuestion(questionId: string): Promise<Option[]> {
    return await this.optionRepository.find({
      where: { question: { id: questionId } },
      relations: ['question'],
    });
  }

  async getCorrectOptions(questionId: string): Promise<Option[]> {
    return await this.optionRepository.find({
      where: { question: { id: questionId }, isCorrect: true },
    });
  }
}