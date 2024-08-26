import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RechargeCustomerWalletController } from './recharge-customer-wallet.controller';
import { RechargeCustomerWalletService } from './recharge-customer-wallet.service';
import { CustomerMiddleware } from 'src/shared/middlewares/customer.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { Customers } from 'src/entities/customer.entity';
import { CustomerWallet } from 'src/entities/customer_wallet.entity';
import { CustomerWalletHistory } from 'src/entities/customer_wallet_history.entity';
import { MobileMoneyTransactions } from 'src/entities/mobile_money_transactions.entity';
import { Transactions } from 'src/entities/transactions.entity';
import { SocketModule } from 'src/socket/socket.module';

@Module({
  imports:[
    TypeOrmModule.forFeature([Customers, CustomerWallet, CustomerWalletHistory, MobileMoneyTransactions, Transactions]),
    SharedModule,
    SocketModule
  ],
  controllers: [RechargeCustomerWalletController],
  providers: [{
    provide: 'WALLET-SERVICE',
    useClass: RechargeCustomerWalletService
  }],
  exports: [
    {
      provide: 'WALLET-SERVICE',
      useClass: RechargeCustomerWalletService
    }
  ]
})
export class RechargeCustomerWalletModule implements NestModule {

  configure(consumer: MiddlewareConsumer) {
      consumer
        .apply(CustomerMiddleware)
        .forRoutes(RechargeCustomerWalletController)
      
  }
  
}
