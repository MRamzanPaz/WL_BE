import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plans } from 'src/entities/plans.entites';
import { plans_Counties } from 'src/entities/plans_countries.entity';
import { SharedModule } from 'src/shared/shared.module';
import { Countries } from 'src/entities/country.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plans, plans_Counties, Countries]),
    SharedModule
  ],
  controllers: [
    PlansController
  ],
  providers: [
    {
    provide: 'PLANS-SERVICE',
    useClass: PlansService
  }
]
})
export class PlansModule {}
