import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RechargeEsimController } from './recharge-esim.controller';
import { RechargeEsimService } from './recharge-esim.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { CustomerMiddleware } from 'src/shared/middlewares/customer.middleware';
import { Customers } from 'src/entities/customer.entity';
import { Plans } from 'src/entities/plans.entites';
import { Coupons } from 'src/entities/coupon.entity';
import { CouponsDetails } from 'src/entities/couponsDetails.entity';
import { TopupOrders } from 'src/entities/topup-orders.entity';
import { Transactions } from 'src/entities/transactions.entity';
import { MobileMoneyTransactions } from 'src/entities/mobile_money_transactions.entity';
import { PawapayTransactions } from 'src/entities/pawapayTransactions.entity';
import { AccountingReport } from 'src/entities/accounting_report.entity';
import { MailModule } from 'src/mail/mail.module';
import { SocketModule } from 'src/socket/socket.module';

@Module({
  imports:[
    TypeOrmModule.forFeature([Customers, Plans, Coupons, CouponsDetails, TopupOrders, Transactions, MobileMoneyTransactions, PawapayTransactions, AccountingReport]),
    SharedModule,
    MailModule,
    SocketModule
  ],
  controllers: [RechargeEsimController],
  providers: [
    {
      provide: 'RECHARGE-SERVICE',
      useClass: RechargeEsimService
    }
  ],
  exports: [
    {
      provide: 'RECHARGE-SERVICE',
      useClass: RechargeEsimService
    }
  ]
})
export class RechargeEsimModule implements NestModule {

  configure(consumer: MiddlewareConsumer) {
      consumer
        .apply(CustomerMiddleware)
        .forRoutes(RechargeEsimController)
      
  }
  
}
