import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customers } from 'src/entities/customer.entity';
import { SharedModule } from 'src/shared/shared.module';
import { CustomerWallet } from 'src/entities/customer_wallet.entity';
import { CustomerWalletHistory } from 'src/entities/customer_wallet_history.entity';
import { CustomerMiddleware } from 'src/shared/middlewares/customer.middleware';
import { Plans } from 'src/entities/plans.entites';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { TopupOrders } from 'src/entities/topup-orders.entity';
import { ActivatedESims } from 'src/entities/activatedEsim.entity';
import { MailModule } from 'src/mail/mail.module';
import { Transactions } from 'src/entities/transactions.entity';
import { MobileMoneyTransactions } from 'src/entities/mobile_money_transactions.entity';
import { SocketModule } from 'src/socket/socket.module';
import { plans_Counties } from 'src/entities/plans_countries.entity';
import { Coupons } from 'src/entities/coupon.entity';
import { CouponsDetails } from 'src/entities/couponsDetails.entity';
import { PaymentCacheFW } from 'src/entities/paymentCache.entity';
import { Countries } from 'src/entities/country.entity';
import { CustomerVerification } from 'src/entities/customer_verification';
import { PawapayTransactions } from 'src/entities/pawapayTransactions.entity';
import { AccountingReport } from 'src/entities/accounting_report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customers, CustomerVerification, CustomerWallet, CustomerWalletHistory, Plans, EsimOrders, TopupOrders, ActivatedESims, Transactions, MobileMoneyTransactions, plans_Counties, Coupons, CouponsDetails, PaymentCacheFW, plans_Counties, Countries, PawapayTransactions, AccountingReport]),
    SharedModule,
    MailModule,
    SocketModule
  ],
  controllers: [CustomerController],
  providers: [{
    provide: 'CUSTOMER-SERVICE',
    useClass: CustomerService
  }],
  exports: [{
    provide: 'CUSTOMER-SERVICE',
    useClass: CustomerService
  }]
})
export class CustomerModule implements NestModule {

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CustomerMiddleware).forRoutes(
      {
        path: 'customer/topup/card',
        method: RequestMethod.POST
      },
      {
        path: 'customer/topup/flutter-wave',
        method: RequestMethod.POST
      },
      {
        path: 'customer/topup/mobile-money/pesa-pal',
        method: RequestMethod.POST
      },
      {
        path: 'customer/recharge/packages/:iccid',
        method: RequestMethod.GET
      },
      {
        path: 'customer/recharge/eSim',
        method: RequestMethod.POST
      },
      {
        path: 'customer/recharge/eSim/orderStatus',
        method: RequestMethod.GET
      },
      {
        path: 'customer/recharge/eSim/list',
        method: RequestMethod.GET
      },
      {
        path: 'customer/recharge/payment/status/:order_id',
        method: RequestMethod.GET
      },
      {
        path: 'customer/recharge/payment/status/:order_id',
        method: RequestMethod.GET
      },
      {
        path: 'customer/eSim/list/all',
        method: RequestMethod.GET
      },
      {
        path: 'customer/eSim/details/:iccid',
        method: RequestMethod.GET
      },
      {
        path: 'customer/recharge/eSim/fwCard',
        method: RequestMethod.POST
      },
      {
        path: 'customer/recharge/eSim/fwCard/authorize',
        method: RequestMethod.POST
      },
      {
        path: 'customer/recharge/eSim/fwCard/validate',
        method: RequestMethod.POST
      },
    )
  }

}
