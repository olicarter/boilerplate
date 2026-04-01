import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import your feature modules and entities here — see src/example/ for the pattern.
// import { ExampleModule } from './example/example.module';
// import { Example } from './example/example.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ??
        'postgresql://postgres:password@localhost:5432/app',
      entities: [
        // Register entities here, e.g.:
        // Example,
      ],
      synchronize: false,
    }),
    // Register feature modules here, e.g.:
    // ExampleModule,
  ],
})
export class AppModule {}
