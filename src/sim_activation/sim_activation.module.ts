import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { SimActivationController } from './sim_activation.controller';
import { SimActivationService } from './sim_activation.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivatedESims } from 'src/entities/activatedEsim.entity';
import { SharedModule } from 'src/shared/shared.module';
import { Customers } from 'src/entities/customer.entity';
import { CustomerWallet } from 'src/entities/customer_wallet.entity';
import { MailModule } from 'src/mail/mail.module';
import { CustomerMiddleware } from 'src/shared/middlewares/customer.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActivatedESims, Customers, CustomerWallet]),
    SharedModule,
    MailModule
  ],
  controllers: [SimActivationController],
  providers: [
    {
      provide: 'ACTIVATION-SERVICE',
      useClass: SimActivationService
    }
  ]
})
export class SimActivationModule implements NestModule {

  configure(consumer: MiddlewareConsumer) {
      consumer.apply(CustomerMiddleware).forRoutes(
        {
          path:'customer/recharge/packages/:iccid',
          method: RequestMethod.GET
        }
      )
  }

}
