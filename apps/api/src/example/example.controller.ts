// Example NestJS REST controller — standard GET/POST/PATCH/DELETE for one resource.
//
// import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
// import { ExampleService } from './example.service';
//
// @Controller('items')
// export class ExampleController {
//   constructor(private readonly exampleService: ExampleService) {}
//
//   @Get()
//   findAll() {
//     return this.exampleService.findAll();
//   }
//
//   @Post()
//   create(@Body() body: { name: string; id?: string }) {
//     return this.exampleService.create(body);
//   }
//
//   @Patch(':id')
//   update(@Param('id') id: string, @Body() body: { name?: string }) {
//     return this.exampleService.update(id, body);
//   }
//
//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.exampleService.delete(id);
//   }
// }
