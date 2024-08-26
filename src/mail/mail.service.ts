import { MailerService } from '@nestjs-modules/mailer';
import { Inject, Injectable, HttpStatus } from '@nestjs/common';
import { join, resolve } from 'path';
import { SetupEmailDto } from './email.dto';
import { Request } from 'express';
import { ResponseService } from 'src/shared/service/response.service';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailSetting } from 'src/entities/mail-setting.entity';
import { IsNull, Repository } from 'typeorm';

@Injectable()
export class MailService {

    constructor(
        @InjectRepository(EmailSetting) private readonly _emailSettingRepo: Repository<EmailSetting>,
        private mailerService: MailerService,
        @Inject('RESPONSE-SERVICE') private _res: ResponseService
    ) { }


    async getEmailSetup(req: Request) {

        try {

            const setupDetails = await this._emailSettingRepo.findOne({
                where: {
                    id: 1,
                    deleted_at: IsNull()
                },
                select: {
                    logo_link: true,
                    id: true,
                    android_vedio_link: true,
                    iOS_vedio_link: true
                }
            })

            return this._res.generateResponse(HttpStatus.OK, "success!", setupDetails, req)

        } catch (error) {
            return this._res.generateError(error, req)
        }

    }

    async setupEmailAttribute(body: SetupEmailDto, req: Request) {
        try {

            const { id, logo_link, android_vedio_link, iOS_vedio_link } = body;

            if (id == 0) {

                const payload = {
                    logo_link,
                    android_vedio_link,
                    iOS_vedio_link
                }

                const email_setup = this._emailSettingRepo.create(payload)
                await this._emailSettingRepo.save(email_setup);

                return this._res.generateResponse(HttpStatus.OK, "Email setup successfully!", [], req)

            } else {

                const payload = {
                    logo_link,
                    android_vedio_link,
                    iOS_vedio_link
                }

                await this._emailSettingRepo.createQueryBuilder('CustomerWallet')
                    .update()
                    .set({
                        ...payload
                    })
                    .where("id = :id", { id: id })
                    .execute();

                return this._res.generateResponse(HttpStatus.OK, "Email updated successfully!", [], req)

            }


        } catch (error) {
            this._res.generateError(error, req)
        }
    }

    async sendOrderEmail(emailData: any) {

        let email_details = await this._emailSettingRepo.findOne({
            where: {
                id: 1,
                deleted_at: IsNull()
            }
        })

        if (!email_details.android_vedio_link) {
            email_details = {
                ...email_details,
                android_vedio_link: '',
                iOS_vedio_link: ''
            }
        }

        await this.mailerService.sendMail({
            to: emailData.to,
            subject: "Order Email",
            // cc: process.env.NODE_MAILER_CC,
            bcc: process.env.NODE_MAILER_BCC,
            template: join(process.cwd(), process.env.NODE_MAILER_ORDER_EMAIL), 
            context: {
                email_details: email_details,
                customer_name: emailData.customer_name,
                order_id: emailData.order_id,
                order_date: emailData.order_date,
                iccid: emailData.iccid,
                apn: emailData.apn,
                dataRoaming: emailData.dataRoaming,
                paymentType: emailData.paymentType,
                email: emailData.email,
                packageData: emailData.packageData,
                packageValidity: emailData.packageValidity,
                planName: emailData.planName,
                payment: emailData.payment,
                showOrderPrice: email_details.showOrderPrice,
                os: emailData.os,
                device: emailData.device,
                iosAddress: emailData.iosAddress,
                iosURL: emailData.iosURL,
                qrCodeString: emailData.qrCodeString,
                qr_url: emailData.qr_url,
                affiliateUrl: emailData.affiliteUrl ? emailData.affiliteUrl : "",
                affiliate_dashboard_url: emailData.affiliate_dashboard_url ? emailData.affiliate_dashboard_url : ""
            }
        })
    }

    async sendCustomerEmail(emailData: any) {
        let email_details = await this._emailSettingRepo.findOne({
            where: {
                id: 1,
                deleted_at: IsNull()
            }
        })

        if (!email_details.android_vedio_link) {
            email_details = {
                ...email_details,
                android_vedio_link: '',
                iOS_vedio_link: ''
            }
        }
        await this.mailerService.sendMail({
            to: emailData.to,
            subject: "Customer Details",
            // cc: process.env.NODE_MAILER_CC,
            bcc: process.env.NODE_MAILER_BCC,
            template: join(process.cwd(), process.env.NODE_MAILER_ACCOUNTDETAILS_EMAIL),
            context: {
                email_details: email_details,
                customer_name: emailData.customer_name,
                customer_email: emailData.customer_email,
                customer_pass: emailData.customer_pass,
                customer_dashboard_url: email_details.wl_customer_dashbaord
            }
        })

    }

    async sendCustomerContactEmail(emailData: any) {
        let email_details = await this._emailSettingRepo.findOne({
            where: {
                id: 1,
                deleted_at: IsNull()
            }
        })

        if (!email_details.android_vedio_link) {
            email_details = {
                ...email_details,
                android_vedio_link: '',
                iOS_vedio_link: ''
            }
        }
        await this.mailerService.sendMail({
            to: process.env.CONTACTFORM_EMAIL,
            subject: emailData.subject,
            bcc: process.env.NODE_MAILER_BCC,
            template: join(process.cwd(), 'dist/view/mail/contactDetails.hbs'),
            context: {
                email_details: email_details,
                customer_name: emailData.customer_name,
                customer_email: emailData.customer_email,
                concerning: emailData.concerning,
                message: emailData.message
            }
        })
    }

    async sendCustomerAffiliateEmail(emailData: any) {
        let email_details = await this._emailSettingRepo.findOne({
            where: {
                id: 1,
                deleted_at: IsNull()
            }
        })

        if (!email_details.android_vedio_link) {
            email_details = {
                ...email_details,
                android_vedio_link: '',
                iOS_vedio_link: ''
            }
        }
        await this.mailerService.sendMail({
            to: emailData.to,
            subject: "Your Affiliate Link",
            bcc: process.env.NODE_MAILER_BCC,
            template: join(process.cwd(), 'dist/view/mail/affiliateDetails.hbs'),
            context: {
                email_details: email_details,
                customer_name: emailData.customer_name,
                customer_email: emailData.customer_email,
                affiliate_url: emailData.affiliate_url,
                affiliate_dashboard_url: emailData.affiliate_dashboard_url ? emailData.affiliate_dashboard_url : ""
            }
        })
    }

    async sendOtpCode(emailData: any) {

        const { to, code } = emailData;

        await this.mailerService.sendMail({
            to: to,
            subject: "Recovery Password",
            bcc: process.env.NODE_MAILER_BCC,
            template: join(process.cwd(), 'dist/view/mail/forgot_pass'),
            context: {
                code: code
            }
        })

    }

    async sendOtpCodeForVerification(emailData: any) {

        const { to, code } = emailData;

        await this.mailerService.sendMail({
            to: to,
            subject: "Email Verification",
            bcc: process.env.NODE_MAILER_BCC,
            template: join(process.cwd(), 'dist/view/mail/email_verification'),
            context: {
                code: code
            }
        })

    }

    async sentRechargeEmail(emailData:any){

        let email_details = await this._emailSettingRepo.findOne({
            where: {
                id: 1,
                deleted_at: IsNull()
            }
        })

        if (!email_details.logo_link) {
            email_details = {
                ...email_details,
                logo_link: 'https://www.roambuddy.world/assets/logo.png',
            }
        }

        await this.mailerService.sendMail({
            to: emailData.to,
            subject: "Recharge Notification",
            bcc: process.env.NODE_MAILER_BCC,
            template: join(process.cwd(), 'dist/view/mail/recharge'),
            context: {
                customer_name: emailData.customer_name,
                order_no: emailData.order_no,
                iccid: emailData.iccid,
                plan_name: emailData.plan_name,
                data: emailData.data,
                validity: emailData.validity,
                price: emailData.price,
                logo_link: email_details.logo_link,
                wl_name: email_details.wl_name
            }
        })



    }

}
