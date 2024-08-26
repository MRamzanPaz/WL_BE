import { Module } from '@nestjs/common';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupons } from 'src/entities/coupon.entity';
import { SharedModule } from 'src/shared/shared.module';
import { CouponsDetails } from 'src/entities/couponsDetails.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Coupons, CouponsDetails]),
    SharedModule
  ],
  controllers: [CouponController],
  providers: [{
    provide: 'COUPON-SERVICE',
    useClass: CouponService
  }]
})
export class CouponModule {}
