import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { Plans } from 'src/entities/plans.entites';
import { Customers } from 'src/entities/customer.entity';
import { Coupons } from 'src/entities/coupon.entity';
import { Transactions } from 'src/entities/transactions.entity';
import { CouponsDetails } from 'src/entities/couponsDetails.entity';
import { MailModule } from 'src/mail/mail.module';
import { Devices } from 'src/entities/devices.entity';
import { TopupOrders } from 'src/entities/topup-orders.entity';
import { MobileMoneyTransactions } from 'src/entities/mobile_money_transactions.entity';
import { plans_Counties } from 'src/entities/plans_countries.entity';
import { SocketModule } from 'src/socket/socket.module';
import { PaymentCacheFW } from 'src/entities/paymentCache.entity';
import { Countries } from 'src/entities/country.entity';
import { PawapayTransactions } from 'src/entities/pawapayTransactions.entity';
import { AccountingReport } from 'src/entities/accounting_report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EsimOrders, Plans, Customers, Coupons, Transactions, CouponsDetails, Devices, TopupOrders, MobileMoneyTransactions, plans_Counties, PaymentCacheFW, Countries, PawapayTransactions, AccountingReport]),
    SharedModule,
    MailModule,
    SocketModule
  ],
  controllers: [OrdersController],
  providers: [{
    provide: 'ORDERS-SERVICE',
    useClass: OrdersService
  }],
  exports: [
    {
      provide: 'ORDERS-SERVICE',
      useClass: OrdersService
    }
  ]
})
export class OrdersModule { }
