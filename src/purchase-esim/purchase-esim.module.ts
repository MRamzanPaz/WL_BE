import { Module } from '@nestjs/common';
import { PurchaseEsimController } from './purchase-esim.controller';
import { PurchaseEsimService } from './purchase-esim.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { Customers } from 'src/entities/customer.entity';
import { Plans } from 'src/entities/plans.entites';
import { Coupons } from 'src/entities/coupon.entity';
import { CouponsDetails } from 'src/entities/couponsDetails.entity';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { Transactions } from 'src/entities/transactions.entity';
import { MobileMoneyTransactions } from 'src/entities/mobile_money_transactions.entity';
import { PawapayTransactions } from 'src/entities/pawapayTransactions.entity';
import { AccountingReport } from 'src/entities/accounting_report.entity';
import { MailModule } from 'src/mail/mail.module';
import { SocketModule } from 'src/socket/socket.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports:[
    TypeOrmModule.forFeature([Customers, Plans, Coupons, CouponsDetails, EsimOrders, Transactions, MobileMoneyTransactions, PawapayTransactions, AccountingReport]),
    SharedModule,
    MailModule,
    SocketModule,
    HttpModule
  ],
  controllers: [PurchaseEsimController],
  providers: [
    {
      provide: 'PURCHASE-ESIM-SERIVE',
      useClass: PurchaseEsimService
    }
  ],
  exports: [
    {
      provide: 'PURCHASE-ESIM-SERIVE',
      useClass: PurchaseEsimService
    }
  ]
})
export class PurchaseEsimModule {}
