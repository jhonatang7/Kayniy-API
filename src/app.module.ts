import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { LiveClassModule } from './live-class/live-class.module';
import { NotificationModule } from './notification/notification.module';
import { CourseModule } from './course/course.module';
import { ModuleModule } from './module/module.module';
import { LessonModule } from './lesson/lesson.module';
import { UserProgressModule } from './user-progress/user-progress.module';
import { UserModuleProgressModule } from './user-module-progress/user-module-progress.module';
import { QuizModule } from './quiz/quiz.module';
import { QuestionModule } from './question/question.module';
import { OptionModule } from './option/option.module';
import { UserAnswerModule } from './user-answer/user-answer.module';
import { UserQuizAttemptModule } from './user-quiz-attempt/user-quiz-attempt.module';
import { RoleModule } from './role/role.module';
import { PermissionModule } from './permission/permission.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.js,.ts}'],
        synchronize: true, // Set to false in production
      }),
      inject: [ConfigService],
    }),
    UserModule,
    LiveClassModule,
    NotificationModule,
    CourseModule,
    ModuleModule,
    LessonModule,
    UserProgressModule,
    UserModuleProgressModule,
    QuizModule,
    QuestionModule,
    OptionModule,
    UserAnswerModule,
    UserQuizAttemptModule,
    RoleModule,
    PermissionModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
