import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { Customers } from 'src/entities/customer.entity';
import { Plans } from 'src/entities/plans.entites';
import { SharedModule } from 'src/shared/shared.module';
import { MailModule } from 'src/mail/mail.module';
import { CustomerWalletHistory } from 'src/entities/customer_wallet_history.entity';
import { CustomerWallet } from 'src/entities/customer_wallet.entity';
import { Transactions } from 'src/entities/transactions.entity';
import { TopupOrders } from 'src/entities/topup-orders.entity';

@Module({
  imports:[
    TypeOrmModule.forFeature([EsimOrders, Customers, CustomerWalletHistory, CustomerWallet, Plans, Transactions,TopupOrders]),
    SharedModule,
    MailModule
  ],
  controllers: [AdminController],
  providers: [{
    provide: 'ADMIN-SERVICE',
    useClass: AdminService
  }]
})
export class AdminModule {}
