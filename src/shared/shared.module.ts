import { Module } from '@nestjs/common';
import { ApiService } from './service/api.service';
import { ResponseService } from './service/response.service';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Logs } from 'src/entities/log.entity';
import { JwtService } from './service/jwt.service';
import { GeneralService } from './service/general.service';
import { Customers } from 'src/entities/customer.entity';
import { CustomerWallet } from 'src/entities/customer_wallet.entity';
import { CustomerWalletHistory } from 'src/entities/customer_wallet_history.entity';
import { StripeCreateTokenDto } from './dtos/stripeCreateToken.dto';

@Module({
  imports: [
    TypeOrmModule.forFeature([Logs, Customers,CustomerWallet,CustomerWalletHistory]),
    HttpModule
  ],
  providers: [
    {
    provide: 'API-SERVICE',
    useClass: ApiService
  },
  {
    provide: 'RESPONSE-SERVICE',
    useClass: ResponseService
  },
  {
    provide: 'JWT-SERVICE',
    useClass: JwtService
  },
  {
    provide: 'GENERAL-SERVICE',
    useClass: GeneralService
  },
],
  exports: [
    {
      provide: 'API-SERVICE',
      useClass: ApiService
    },
    {
      provide: 'RESPONSE-SERVICE',
      useClass: ResponseService
    },
    {
      provide: 'JWT-SERVICE',
      useClass: JwtService
    },
    {
      provide: 'GENERAL-SERVICE',
      useClass: GeneralService
    },
  ]
})
export class SharedModule {}
