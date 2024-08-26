import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { TopupOrders } from 'src/entities/topup-orders.entity';
import { PawapayTransactions } from 'src/entities/pawapayTransactions.entity';
import { Coupons } from 'src/entities/coupon.entity';
import { AccountingReport } from 'src/entities/accounting_report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EsimOrders, TopupOrders, PawapayTransactions, Coupons, AccountingReport]),
    SharedModule
  ],
  controllers: [ReportController],
  providers: [
    ReportService,
    {
      provide: 'REPORT-SERVICE',
      useClass: ReportService
    }
  ],
  exports: [
    {
      provide: 'REPORT-SERVICE',
      useClass: ReportService
    }
  ]
})
export class ReportModule { }
