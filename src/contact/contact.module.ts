import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from 'src/entities/contact.entity';
import { Affiliate } from 'src/entities/affiliate.entity';
import { Reseller } from 'src/entities/reseller.entity';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contact, Affiliate, Reseller]),
    MailModule,
    SharedModule
  ],
  controllers: [ContactController],
  providers: [{
    provide: 'CONTACT-SERVICE',
    useClass: ContactService
  }]
})
export class ContactModule { }
