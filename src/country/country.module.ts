import { Module } from '@nestjs/common';
import { CountryController } from './country.controller';
import { CountryService } from './country.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Countries } from 'src/entities/country.entity';
import { SharedModule } from 'src/shared/shared.module';
import { States } from 'src/entities/states.entity';
import { Cities } from 'src/entities/cities.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Countries, States, Cities]),
    SharedModule
  ],
  controllers: [CountryController],
  providers: [{
    provide: 'COUNTRY-SERVICE',
    useClass: CountryService
  }]
})
export class CountryModule {}
