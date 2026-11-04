import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'embeddings' })
@Index('UQ_embeddings_source_id', ['sourceId'], { unique: true })
export class Embedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'embedding', type: 'vector', length: 768 })
  embedding: number[];

  @Column({ name: 'source_id', type: 'varchar', length: 255 })
  sourceId: string;
}
