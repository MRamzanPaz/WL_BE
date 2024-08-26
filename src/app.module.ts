import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MorganModule } from 'nest-morgan/morgan.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MorganInterceptor } from 'nest-morgan';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { SharedModule } from './shared/shared.module';
import { PlansModule } from './plans/plans.module';
import { CouponModule } from './coupon/coupon.module';
import { CustomerModule } from './customer/customer.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';
import { DevicesModule } from './devices/devices.module';
import { SimActivationModule } from './sim_activation/sim_activation.module';
import { WebHooksModule } from './web-hooks/web-hooks.module';
import { ContactModule } from './contact/contact.module';
import { FaqModule } from './faq/faq.module';
import { SocketModule } from './socket/socket.module';
import { AdminModule } from './admin/admin.module';
import { CountryModule } from './country/country.module';
import { RefundModule } from './refund/refund.module';
import { ReportModule } from './report/report.module';
import { PurchaseEsimModule } from './purchase-esim/purchase-esim.module';
import { RechargeEsimModule } from './recharge-esim/recharge-esim.module';
import { RechargeCustomerWalletModule } from './recharge-customer-wallet/recharge-customer-wallet.module';
import entities from './entities';

@Module({
  imports: [
    ConfigModule.forRoot(
      {
        envFilePath: [join(process.cwd(), '.env')],
        isGlobal: true
      }
    ),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [...entities],
      synchronize: process.env.DATABASE_SYNC == 'on' ? true : false,
    }),
    MorganModule,
    SharedModule,
    PlansModule,
    CouponModule,
    CustomerModule,
    OrdersModule,
    PaymentsModule,
    MailModule,
    DevicesModule,
    SimActivationModule,
    WebHooksModule,
    ContactModule,
    FaqModule,
    SocketModule,
    AdminModule,
    CountryModule,
    RefundModule,
    ReportModule,
    PurchaseEsimModule,
    RechargeEsimModule,
    RechargeCustomerWalletModule
  ],
  controllers: [AppController],
  providers: [AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MorganInterceptor('combined'),
    },
    ],
})
export class AppModule { }
