import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { SharedModule } from 'src/shared/shared.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { MailController } from './mail.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailSetting } from 'src/entities/mail-setting.entity';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([EmailSetting]),
    ConfigModule.forRoot(),
    MailerModule.forRootAsync({

      useFactory:async (config:ConfigService) => ({
        transport:{
          host: process.env.NODE_MAILER_HOST,
          port: 465,
          secure: true,
          auth: {
            user: process.env.NODE_MAILER_USER,
            pass: process.env.NODE_MAILER_PASS
          }
        },
        defaults: {
          from: `<${process.env.NODE_MAILER_FROM}>`
        },
        template: {
          dir: join(process.cwd(), 'view/mail'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true
          }
        }
      }),

      inject: [ConfigService]
    })
  ],
  providers: [MailService],
  exports: [MailService],
  controllers: [MailController]
})
export class MailModule {}
