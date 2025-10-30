import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: [
      'http://localhost:4001',   // ejemplo: tu frontend local
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // necesario si usas cookies o Authorization headers
  });

  app.setGlobalPrefix('api');
  
  const config = new DocumentBuilder()
    .setTitle('Kayniy')
    .setDescription('Kayniy API description')
    .setVersion('1.0')
    .addTag('kayniyAPI')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  await app.listen(3000);
}
bootstrap();
