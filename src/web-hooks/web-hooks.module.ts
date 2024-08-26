import { Module } from '@nestjs/common';
import { WebHooksController } from './web-hooks.controller';
import { WebHooksService } from './web-hooks.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MobileMoneyTransactions } from 'src/entities/mobile_money_transactions.entity';
import { SharedModule } from 'src/shared/shared.module';
import { SocketModule } from 'src/socket/socket.module';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { OrdersModule } from 'src/orders/orders.module';
import { TopupOrders } from 'src/entities/topup-orders.entity';
import { CustomerModule } from 'src/customer/customer.module';
import { Transactions } from 'src/entities/transactions.entity';
import { Plans } from 'src/entities/plans.entites';
import { RefundActivities } from 'src/entities/refundActivities.entity';
import { PawaPayRefunds } from 'src/entities/pawaPayRefunds.entity';
import { PurchaseEsimModule } from 'src/purchase-esim/purchase-esim.module';
import { RechargeEsimModule } from 'src/recharge-esim/recharge-esim.module';
import { RechargeCustomerWalletModule } from 'src/recharge-customer-wallet/recharge-customer-wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MobileMoneyTransactions, EsimOrders, TopupOrders, Transactions, Plans, RefundActivities, PawaPayRefunds]),
    SharedModule,
    SocketModule,
    OrdersModule,
    CustomerModule,
    PurchaseEsimModule,
    RechargeEsimModule,
    RechargeCustomerWalletModule
  ],
  controllers: [WebHooksController],
  providers: [{
    provide: 'WEBHOOK-SERVICE',
    useClass: WebHooksService
  }]
})
export class WebHooksModule {}
