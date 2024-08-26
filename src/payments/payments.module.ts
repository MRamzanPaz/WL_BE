import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { Transactions } from 'src/entities/transactions.entity';
import { Customers } from 'src/entities/customer.entity';
import { CustomerWallet } from 'src/entities/customer_wallet.entity';
import { CustomerWalletHistory } from 'src/entities/customer_wallet_history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EsimOrders, Transactions, Customers, CustomerWallet, CustomerWalletHistory]),
    SharedModule
  ],
  controllers: [PaymentsController],
  providers: [{
    provide: 'PAYMENTS-SERVICE',
    useClass: PaymentsService
  }]
})
export class PaymentsModule {}
