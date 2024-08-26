import { Body, Controller, Inject, Post, Request, Req, Response } from '@nestjs/common';
import { WebHooksService } from './web-hooks.service';
import { Request as request, Response as response } from 'express';
import { FlutterwavesVerificationDto } from './web-hooks.dto';

@Controller('web-hooks')
export class WebHooksController {

    constructor(
        @Inject('WEBHOOK-SERVICE') private _webhook: WebHooksService
    ){}

    @Post('flutterwaves')
    flutterwavePaymentVerfication(@Body() body: FlutterwavesVerificationDto, @Request() req: request){
        // return this._webhook.flutterwavePaymentVerfication(body, req)
        return this._webhook.flutterwavePaymentV2(body, req);
    }

    @Post('flutterwaves/multipleOrders')
    fultterwavePaymentVerificationMultipleOrder(@Body() body: FlutterwavesVerificationDto, @Request() req: request){

        return this._webhook.fultterwavePaymentVerificationMultipleOrder(body, req)

    }

    @Post('pawapay')
    pawapayPaymentVerfication(@Body() body: any, @Request() req: request){
        // return this._webhook.pawapayPaymentVerfication(body, req);
        return this._webhook.pawaPayPaymentV2(body, req)
    }

    @Post('pawapay/refund')
    pawapayRefundVerfication(@Body() body: any, @Request() req: request){
        return this._webhook.pawapayRefundVerfication(body, req)
    }

    @Post('pesaPal')
    pesaPayPaymentVerification(@Body() body: any, @Request() req: request){
        console.log("===============================PESA-PAL==========================================");
        console.log(body);
        console.log("===============================PESA-PAL==========================================");
        // return this._webhook.pesaPayPaymentVerification(body, req);
        return this._webhook.pesaPalPaymentV2(body, req);
    }

    @Post('stripe')
    stripeWebhook(@Body() body: any, @Request() req: request){
        console.log(JSON.stringify(body));
        return 'ok'
    }

    // @Post('dpo-payment')
    dpoWebhook(@Body() body: any, @Req() req: request){
        return this._webhook.dpoWebhook(body, req);
    }

    @Post('confirmation')
    safaricomConfirmation(@Body() body: any, @Request() req: request){
        console.log("=============================== Safaricom MPESA Confirmation ==========================================");
        console.log(body);
        console.log("=============================== Safaricom MPESA Confirmation ==========================================");
        return this._webhook.safaricomConfirmation(body, req);
    }

    @Post('validation')
    safaricomValidation(@Body() body: any, @Request() req: request){
        console.log("=============================== Safaricom MPESA validation ==========================================");
        console.log(body);
        console.log("=============================== Safaricom MPESA validation ==========================================");
        return this._webhook.safaricomValidation(body, req);
    }

    @Post('paystack')
    payStackWebhook(@Body() body: any, @Request() req: request, @Response() res: response){
        console.log("=============================== PAY-STACK-WEBHOOK ==========================================");
        console.log(body);
        console.log("=============================== PAY-STACK-WEBHOOK ==========================================");
        this._webhook.payStackWebhook(body, req);
        res.sendStatus(200);
    }


}
