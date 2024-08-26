import { Module } from '@nestjs/common';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefundActivities } from 'src/entities/refundActivities.entity';
import { SharedModule } from 'src/shared/shared.module';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { PawaPayRefunds } from 'src/entities/pawaPayRefunds.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefundActivities, EsimOrders, PawaPayRefunds]),
    SharedModule
  ],
  controllers: [RefundController],
  providers: [{
    provide: 'REFUND-SERVICE',
    useClass: RefundService
  }]
})
export class RefundModule {}
