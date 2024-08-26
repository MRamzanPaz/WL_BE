import { Module } from '@nestjs/common';
import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FAQ } from 'src/entities/faq.entity';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FAQ]),
    SharedModule
  ],
  controllers: [FaqController],
  providers: [{
    provide: 'FAQ-SERVICE',
    useClass: FaqService
  }]
})
export class FaqModule {}
