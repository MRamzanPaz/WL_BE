import { Module } from '@nestjs/common';
import { SocketService } from './socket.service';
import { SocketGateway } from './socket.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { Plans } from 'src/entities/plans.entites';
import { Customers } from 'src/entities/customer.entity';
import { Coupons } from 'src/entities/coupon.entity';
import { Transactions } from 'src/entities/transactions.entity';
import { CouponsDetails } from 'src/entities/couponsDetails.entity';
import { Devices } from 'src/entities/devices.entity';
import { TopupOrders } from 'src/entities/topup-orders.entity';
import { MobileMoneyTransactions } from 'src/entities/mobile_money_transactions.entity';
import { plans_Counties } from 'src/entities/plans_countries.entity';

@Module({
  imports: [
    // TypeOrmModule.forFeature([EsimOrders, Plans, Customers, Coupons, Transactions, CouponsDetails, Devices, TopupOrders, MobileMoneyTransactions, plans_Counties]),

  ],
  providers: [SocketService, SocketGateway],
  exports: [SocketGateway]
})
export class SocketModule {}
