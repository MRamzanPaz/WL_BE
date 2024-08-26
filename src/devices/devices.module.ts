import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Devices } from 'src/entities/devices.entity';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([Devices])
  ],
  controllers: [DevicesController],
  providers: [{
    provide: 'DEVICE-SERVICE',
    useClass: DevicesService
  }]
})
export class DevicesModule {}
